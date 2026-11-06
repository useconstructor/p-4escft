import { createHash } from "node:crypto";
import { ApiError } from "./errors";
import type { BookInput, BookPatch, FieldErrors } from "./types";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inputKeys = ["title", "author", "category", "price", "stock"] as const;

export function normalize(value: string): string {
  return value.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/gu, " ");
}

/** Validate the envelope before looking up an idempotent result. */
export function validateEnvelope(value: unknown, patch: boolean): BookInput | BookPatch {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Envía un objeto JSON con los campos del libro.");
  }
  const allowed: readonly string[] = patch ? [...inputKeys, "version"] : inputKeys;
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new ApiError(400, "INVALID_REQUEST", "El envío contiene propiedades no permitidas.");
  }
  const record = value as Record<string, unknown>;
  const fieldErrors: FieldErrors = {};
  for (const key of inputKeys) {
    if (typeof record[key] !== "string") fieldErrors[key] = "Este campo debe enviarse como texto.";
  }
  // JavaScript's `$` also matches before a final newline. A version is an
  // exact wire identifier, so reject surrounding whitespace before comparing it.
  if (patch && (typeof record.version !== "string" ||
    record.version !== record.version.trim() || !/^[1-9][0-9]*$/.test(record.version))) {
    fieldErrors.version = "Envía la versión previamente confirmada del libro.";
  }
  if (Object.keys(fieldErrors).length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Revisa los campos indicados.", { fieldErrors });
  }
  return value as BookInput | BookPatch;
}

export interface ValidatedBook {
  title: string;
  author: string;
  category: string;
  price_cents: string;
  stock: number;
}

export function validateBook(input: BookInput): ValidatedBook {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  const author = input.author.trim();
  const category = input.category.trim();
  for (const [key, value, maximum, label] of [
    ["title", title, 160, "El título"],
    ["author", author, 120, "El autor"],
    ["category", category, 60, "La categoría"],
  ] as const) {
    const length = Array.from(value).length;
    if (length < 1 || length > maximum) errors[key] = `${label} debe tener entre 1 y ${maximum} caracteres.`;
  }
  const price = input.price.trim();
  const stock = input.stock.trim();
  if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(price)) {
    errors.price = "Introduce un precio no negativo con hasta dos decimales; puedes usar coma o punto.";
  }
  if (!/^[0-9]+$/.test(stock) || BigInt(stock || "0") > BigInt("2147483647")) {
    errors.stock = "Introduce un stock entero entre 0 y 2147483647.";
  }
  if (Object.keys(errors).length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Revisa los campos indicados antes de guardar.", { fieldErrors: errors });
  }
  const [whole, fractional = ""] = price.split(/[.,]/);
  const cents = `${whole}${fractional.padEnd(2, "0")}`.replace(/^0+(?=[0-9])/, "");
  return { title, author, category, price_cents: cents, stock: Number(BigInt(stock)) };
}

/** Order is canonical, but raw submitted strings (including spaces) are retained. */
export function payloadHash(input: BookInput | BookPatch): string {
  const sorted = Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right)),
  );
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

export function validateQuery(url: URL, allowed: readonly string[]): void {
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) {
      throw new ApiError(400, "INVALID_REQUEST", "La consulta contiene parámetros repetidos o no permitidos.");
    }
  }
}
