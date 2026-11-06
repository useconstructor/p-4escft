export type Category = { id: string; name: string };
export type Book = {
  id: string; title: string; author: string; category_id: string; category: string;
  price_cents: string | null; stock: number; version: string; created_at: string; updated_at: string;
};
export type BookList = { books: Book[]; total: string; inventory_total: string; filters: { q: string; category: string | null }; category_known: boolean };
export type Aggregate = { titles: string; units: string; known_value_cents: string; pending_price_titles: string };
export type Summary = { totals: Aggregate; categories: (Aggregate & { category_id: string; category: string })[]; updated_at: string };
export const fields = ["title", "author", "category", "price", "stock"] as const;
export type Field = typeof fields[number];
export type Draft = Record<Field, string>;
export type FieldErrors = Partial<Record<Field, string>>;
export type ApiErrorBody = { error: { code: string; message: string; fieldErrors?: FieldErrors; current?: Book } };
export class ApiError extends Error {
  constructor(public status: number, public details: ApiErrorBody["error"]) { super(details.message); }
}
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 30_000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout.signal]) : timeout.signal;
  try {
    const response = await fetch(url, { ...init, signal, cache: "no-store" });
    let body;
    try { body = await response.json(); } catch { throw new Error("No se recibió una respuesta legible. Reintenta la consulta."); }
    if (!response.ok) throw new ApiError(response.status, body?.error ?? { code: "UNKNOWN", message: "No se pudo completar la solicitud." });
    return body as T;
  } catch (error) {
    if (timeout.signal.aborted && !init?.signal?.aborted) {
      throw new Error("La consulta tardó demasiado y no recibimos confirmación. Puedes reintentar.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export function integer(value: string | number) { return BigInt(value).toLocaleString("es-ES"); }
export function money(cents: string) {
  const digits = cents.padStart(3, "0");
  return `${BigInt(digits.slice(0, -2)).toLocaleString("es-ES")},${digits.slice(-2)}`;
}
export function toDraft(book?: Book | null): Draft {
  return book ? { title: book.title, author: book.author, category: book.category, price: book.price_cents === null ? "" : money(book.price_cents).replaceAll(".", ""), stock: String(book.stock) } : { title: "", author: "", category: "", price: "", stock: "" };
}
export function sameDraft(a: Draft, b: Draft) { return fields.every(field => a[field] === b[field]); }
export const labels: Record<Field, string> = { title: "Título", author: "Autor", category: "Categoría", price: "Precio", stock: "Stock" };
export function validate(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};
  for (const [field, limit] of [["title",160],["author",120],["category",60]] as const) {
    const length = [...draft[field].trim()].length;
    if (!length || length > limit) errors[field] = `${labels[field]}: escribe entre 1 y ${limit} caracteres.`;
  }
  if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(draft.price.trim())) errors.price = "Introduce un precio no negativo con hasta dos decimales.";
  if (!/^[0-9]+$/.test(draft.stock.trim()) || BigInt(draft.stock.trim() || "0") > BigInt("2147483647")) errors.stock = "Introduce un stock entero de 0 a 2147483647.";
  return errors;
}
export function track(action: string) {
  (window as Window & { constructorTrack?: (event: string) => void }).constructorTrack?.(action);
}
