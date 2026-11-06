import "server-only";
import { randomUUID } from "node:crypto";
import type { Row, Transaction } from "@libsql/client";
import { readDatabase, writeDatabase } from "@/lib/db";
import { ApiError } from "./errors";
import { normalize, payloadHash, validateBook } from "./validation";
import type { Aggregate, Book, BookInput, BookPatch, Catalogue, Category, InventorySummary } from "./types";

const bookSelection = `SELECT b.id, b.title, b.author, b.category_id, c.name AS category,
  b.price_cents, b.stock, b.version, b.created_at, b.updated_at
  FROM books b JOIN categories c ON c.id = b.category_id`;
const spanish = new Intl.Collator("es", { sensitivity: "base" });

function toBook(row: Row): Book {
  return {
    id: String(row.id),
    title: String(row.title),
    author: String(row.author),
    category_id: String(row.category_id),
    category: String(row.category),
    price_cents: row.price_cents === null ? null : String(row.price_cents),
    stock: Number(row.stock),
    version: String(row.version),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function bookById(tx: Transaction, id: string): Promise<Book | undefined> {
  const result = await tx.execute({ sql: `${bookSelection} WHERE b.id = ?`, args: [id] });
  return result.rows[0] ? toBook(result.rows[0]) : undefined;
}

export async function getCatalogue(q = "", category: string | null = null): Promise<Catalogue> {
  return readDatabase(async (tx) => {
    const result = await tx.execute(`${bookSelection} ORDER BY b.created_at ASC, b.id ASC`);
    const all = result.rows.map(toBook);
    const categoryCheck = category
      ? await tx.execute({ sql: "SELECT id FROM categories WHERE id = ?", args: [category] })
      : null;
    const known = categoryCheck === null || categoryCheck.rows.length > 0;
    const query = normalize(q);
    const books = all.filter((book) =>
      known && (!category || book.category_id === category) &&
      (!query || normalize(book.title).includes(query) || normalize(book.author).includes(query)),
    );
    return {
      books,
      total: String(books.length),
      inventory_total: String(all.length),
      filters: { q, category },
      category_known: known,
    };
  });
}

export async function getCategories(): Promise<{ categories: Category[] }> {
  return readDatabase(async (tx) => {
    const result = await tx.execute("SELECT id, name FROM categories");
    const categories = result.rows.map((row) => ({ id: String(row.id), name: String(row.name) }));
    categories.sort((a, b) => spanish.compare(a.name, b.name) || a.id.localeCompare(b.id));
    return { categories };
  });
}

function emptyAggregate(): Aggregate {
  return { titles: "0", units: "0", known_value_cents: "0", pending_price_titles: "0" };
}

function addBook(aggregate: Aggregate, book: Book): void {
  aggregate.titles = (BigInt(aggregate.titles) + BigInt(1)).toString();
  aggregate.units = (BigInt(aggregate.units) + BigInt(book.stock)).toString();
  if (book.price_cents === null) {
    aggregate.pending_price_titles = (BigInt(aggregate.pending_price_titles) + BigInt(1)).toString();
  } else {
    aggregate.known_value_cents = (
      BigInt(aggregate.known_value_cents) + BigInt(book.price_cents) * BigInt(book.stock)
    ).toString();
  }
}

export async function getSummary(): Promise<InventorySummary> {
  return readDatabase(async (tx) => {
    // One snapshot, no SQLite SUM/product coercion or floating-point money.
    const result = await tx.execute(bookSelection);
    const totals = emptyAggregate();
    const groups = new Map<string, InventorySummary["categories"][number]>();
    for (const row of result.rows) {
      const book = toBook(row);
      addBook(totals, book);
      const group = groups.get(book.category_id) ?? {
        ...emptyAggregate(), category_id: book.category_id, category: book.category,
      };
      addBook(group, book);
      groups.set(book.category_id, group);
    }
    const categories = Array.from(groups.values()).sort((a, b) =>
      spanish.compare(a.category, b.category) || a.category_id.localeCompare(b.category_id),
    );
    return { totals, categories, updated_at: new Date().toISOString() };
  });
}

export interface MutationResult {
  status: number;
  /** Persisted verbatim and replayed without reconstructing a newer book. */
  json: string;
}

export async function saveBook(
  method: "POST" | "PATCH",
  id: string | undefined,
  key: string,
  input: BookInput | BookPatch,
): Promise<MutationResult> {
  const resource = method === "POST" ? "/api/libros" : `/api/libros/${id}`;
  const hash = payloadHash(input);
  return writeDatabase(async (tx) => {
    const previous = await tx.execute({
      sql: "SELECT method, resource, payload_hash, response_status, response_json FROM operations WHERE key = ?",
      args: [key],
    });
    const operation = previous.rows[0];
    if (operation) {
      if (operation.method !== method || operation.resource !== resource || operation.payload_hash !== hash) {
        throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "La clave de este envío ya se utilizó con otros datos. Recupera el envío original o inicia uno nuevo explícitamente.");
      }
      return { status: Number(operation.response_status), json: String(operation.response_json) };
    }

    const fields = validateBook(input);
    let current: Book | undefined;
    if (method === "PATCH") {
      current = await bookById(tx, id!);
      if (!current) throw new ApiError(404, "BOOK_NOT_FOUND", "Este libro ya no está disponible. Actualiza la lista y conserva tu borrador.");
      if (current.version !== (input as BookPatch).version) {
        throw new ApiError(409, "VERSION_CONFLICT", "Este libro cambió. Compara tus datos con los actuales antes de guardar.", { current });
      }
      if (BigInt(current.version) >= BigInt("9223372036854775807")) {
        throw new ApiError(503, "DATABASE_UNAVAILABLE", "No se puede incrementar la versión de este libro. Conserva tu borrador.");
      }
    }

    const categoryKey = normalize(fields.category);
    await tx.execute({
      sql: "INSERT INTO categories (id, name, normalized_key) VALUES (?, ?, ?) ON CONFLICT(normalized_key) DO NOTHING",
      args: [randomUUID(), fields.category, categoryKey],
    });
    const categoryResult = await tx.execute({
      sql: "SELECT id FROM categories WHERE normalized_key = ?",
      args: [categoryKey],
    });
    const categoryId = String(categoryResult.rows[0].id);
    const bookId = current?.id ?? randomUUID();
    const now = new Date().toISOString();
    if (current) {
      const updated = await tx.execute({
        sql: `UPDATE books SET title = ?, author = ?, category_id = ?, price_cents = ?,
              stock = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?`,
        args: [fields.title, fields.author, categoryId, fields.price_cents, fields.stock, now, bookId, BigInt(current.version)],
      });
      if (updated.rowsAffected !== 1) {
        const actual = await bookById(tx, bookId);
        if (!actual) throw new ApiError(404, "BOOK_NOT_FOUND", "El libro no está disponible. Conserva tu borrador y actualiza la lista.");
        throw new ApiError(409, "VERSION_CONFLICT", "Este libro cambió. Compara los valores actuales.", { current: actual });
      }
    } else {
      await tx.execute({
        sql: `INSERT INTO books (id, title, author, category_id, price_cents, stock, version, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [bookId, fields.title, fields.author, categoryId, fields.price_cents, fields.stock, now, now],
      });
    }
    const book = await bookById(tx, bookId);
    if (!book) throw new ApiError(500, "INTERNAL_ERROR", "No se pudo confirmar el libro. Recupera el mismo envío.");
    const status = current ? 200 : 201;
    const json = JSON.stringify({ book });
    await tx.execute({
      sql: `INSERT INTO operations (key, method, resource, payload_hash, response_status, response_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [key, method, resource, hash, status, json, now],
    });
    return { status, json };
  });
}
