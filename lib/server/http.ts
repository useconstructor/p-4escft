import "server-only";
import { ApiError } from "./errors";
import { UUID_PATTERN, validateEnvelope, validateQuery } from "./validation";
import type { BookInput, BookPatch } from "./types";

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers });
}

export function savedResponse(result: { json: string; status: number }): Response {
  return new Response(result.json, { status: result.status, headers });
}

export async function handleRequest(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse(error.toJSON(), error.status);
    return jsonResponse({
      error: { code: "INTERNAL_ERROR", message: "No se pudo completar la solicitud. Reintenta; si estabas guardando, recupera el mismo envío para confirmar su resultado." },
    }, 500);
  }
}

function configuredOrigin(raw: string | undefined, preview = false): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(preview && !raw.includes("://") ? `https://${raw}` : raw);
    if (!["http:", "https:"].includes(url.protocol) || (preview && url.protocol !== "https:") ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const trusted = [
    configuredOrigin(process.env.APP_ORIGIN),
    configuredOrigin(process.env.VERCEL_URL, true),
  ].filter((value): value is string => Boolean(value));
  if (!origin || !trusted.includes(origin)) {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "Este origen no está autorizado para guardar cambios. Abre la aplicación desde su dirección configurada.");
  }
}

export async function mutationInput(
  request: Request,
  patch: boolean,
): Promise<{ key: string; input: BookInput | BookPatch }> {
  assertTrustedOrigin(request);
  validateQuery(new URL(request.url), []);
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(400, "INVALID_REQUEST", "El envío debe usar el formato JSON.");
  }
  const key = request.headers.get("idempotency-key");
  if (!key || !UUID_PATTERN.test(key)) {
    throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Falta una clave válida para identificar y recuperar este envío.");
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    throw new ApiError(400, "INVALID_REQUEST", "No se ha podido leer el JSON del envío. Conserva tus campos y vuelve a intentarlo.");
  }
  return { key, input: validateEnvelope(body, patch) };
}
