import "server-only";
import { createClient, type Client, type Transaction } from "@libsql/client";
import { ApiError } from "../server/errors";
import { initializeSchema } from "./schema";

let client: Client | undefined;
let initialized: Promise<void> | undefined;

function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new ApiError(503, "DATABASE_UNAVAILABLE", "El inventario no está disponible en este momento. Vuelve a intentarlo.");
  }
  client = createClient({ url, authToken, intMode: "bigint" });
  return client;
}

function isBusy(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return /^(SQLITE_BUSY|SQLITE_LOCKED)(_|$)/.test(code);
}

/**
 * A write transaction holds the writer lock before any operation lookup, so
 * two fresh submissions cannot both observe an absent idempotency key.
 * Only known lock failures retry; uncertain commits surface for explicit recovery.
 */
async function transact<T>(mode: "read" | "write", action: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let tx: Transaction | undefined;
    try {
      tx = await getClient().transaction(mode);
      if (mode === "write") {
        const foreignKeys = await tx.execute("PRAGMA foreign_keys");
        if (String(foreignKeys.rows[0]?.foreign_keys) !== "1") {
          throw new ApiError(503, "DATABASE_UNAVAILABLE", "No se ha podido verificar la integridad del inventario. Reintenta más tarde.");
        }
      }
      const result = await action(tx);
      await tx.commit();
      return result;
    } catch (error) {
      if (tx && !tx.closed) {
        try { await tx.rollback(); } catch { /* Preserve the original failure. */ }
      }
      if (isBusy(error) && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 60 * 2 ** attempt));
        continue;
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, "DATABASE_UNAVAILABLE", "No se ha podido completar la consulta al inventario. Reintenta; si estabas guardando, recupera el mismo envío para confirmar su resultado.");
    } finally {
      tx?.close();
    }
  }
}

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = transact("write", initializeSchema).catch((error: unknown) => {
      initialized = undefined;
      throw error;
    });
  }
  await initialized;
}

export async function readDatabase<T>(action: (tx: Transaction) => Promise<T>): Promise<T> {
  await ensureInitialized();
  return transact("read", action);
}

export async function writeDatabase<T>(action: (tx: Transaction) => Promise<T>): Promise<T> {
  await ensureInitialized();
  return transact("write", action);
}
