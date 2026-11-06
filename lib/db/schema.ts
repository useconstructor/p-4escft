import "server-only";
import { randomUUID } from "node:crypto";
import type { Transaction } from "@libsql/client";
import { normalize } from "../server/validation";

const schema = [
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    normalized_key TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
    author TEXT NOT NULL CHECK (length(author) BETWEEN 1 AND 120),
    category_id TEXT NOT NULL REFERENCES categories(id),
    price_cents TEXT CHECK (
      price_cents IS NULL OR (
        typeof(price_cents) = 'text' AND
        length(price_cents) > 0 AND
        price_cents NOT GLOB '*[^0-9]*' AND
        (price_cents = '0' OR substr(price_cents, 1, 1) BETWEEN '1' AND '9')
      )
    ),
    stock INTEGER NOT NULL CHECK (typeof(stock) = 'integer' AND stock BETWEEN 0 AND 2147483647),
    version INTEGER NOT NULL CHECK (typeof(version) = 'integer' AND version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS books_category_id ON books(category_id)`,
  `CREATE TABLE IF NOT EXISTS seed_markers (
    key TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    key TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS operations (
    key TEXT PRIMARY KEY NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('POST', 'PATCH')),
    resource TEXT NOT NULL,
    payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
    response_status INTEGER NOT NULL CHECK (response_status IN (200, 201)),
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

/** Eight requested fictional records; demo prices are expressed in cents. */
const seed = [
  ["El faro de papel", "Mara Veloria", "Novela", 6, "1850"],
  ["Jardines del viento quieto", "Elio Naverán", "Poesía", 4, "1425"],
  ["Atlas de pequeñas nubes", "Nira Solvén", "Infantil", 8, "1675"],
  ["La ciudad bajo el reloj", "Darío Brumel", "Novela", 5, "2100"],
  ["Cartas al bosque azul", "Lúa Meravia", "Cuentos", 3, "1350"],
  ["Manual de asombros mínimos", "Teo Alvoria", "Ensayo", 7, "1920"],
  ["El viaje de la cometa verde", "Alma Cendoria", "Infantil", 0, "1575"],
  ["Mapas para días lentos", "Ivo Sendar", "Ensayo", 2, "2240"],
] as const;

async function repairMissingSeedPrices(transaction: Transaction, seededAt: string): Promise<void> {
  const migration = "fictional-seed-prices-v1";
  const applied = await transaction.execute({
    sql: "SELECT key FROM schema_migrations WHERE key = ?", args: [migration],
  });
  if (applied.rows.length) return;
  const now = new Date().toISOString();
  for (const [title, author, category, stock, price] of seed) {
    // The original seed had random IDs. Its timestamp, original fields and
    // untouched version identify it without treating a later matching title
    // as a seed or overwriting any confirmed user edit.
    await transaction.execute({
      sql: `UPDATE books SET price_cents = ?, version = version + 1, updated_at = ?
            WHERE title = ? AND author = ? AND stock = ? AND price_cents IS NULL
              AND version = 1 AND created_at = ? AND updated_at = ?
              AND category_id IN (SELECT id FROM categories WHERE normalized_key = ?)`,
      args: [price, now, title, author, stock, seededAt, seededAt, normalize(category)],
    });
  }
  await transaction.execute({
    sql: "INSERT INTO schema_migrations (key, created_at) VALUES (?, ?)",
    args: [migration, now],
  });
}

export async function initializeSchema(transaction: Transaction): Promise<void> {
  await transaction.batch(schema);
  const marker = "libreria-brisa-eight-fictional-books-v1";
  const existing = await transaction.execute({
    sql: "SELECT key, created_at FROM seed_markers WHERE key = ?",
    args: [marker],
  });
  if (existing.rows.length) {
    await repairMissingSeedPrices(transaction, String(existing.rows[0].created_at));
    return;
  }

  const now = new Date().toISOString();
  const categories = new Map<string, string>();
  for (const [title, author, category, stock, price] of seed) {
    let categoryId = categories.get(category);
    if (!categoryId) {
      await transaction.execute({
        sql: "INSERT INTO categories (id, name, normalized_key) VALUES (?, ?, ?) ON CONFLICT(normalized_key) DO NOTHING",
        args: [randomUUID(), category, normalize(category)],
      });
      const result = await transaction.execute({
        sql: "SELECT id FROM categories WHERE normalized_key = ?",
        args: [normalize(category)],
      });
      categoryId = String(result.rows[0].id);
      categories.set(category, categoryId);
    }
    await transaction.execute({
      sql: `INSERT INTO books (id, title, author, category_id, price_cents, stock, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [randomUUID(), title, author, categoryId, price, stock, now, now],
    });
  }
  await transaction.execute({
    sql: "INSERT INTO seed_markers (key, created_at) VALUES (?, ?)",
    args: [marker, now],
  });
  await repairMissingSeedPrices(transaction, now);
}
