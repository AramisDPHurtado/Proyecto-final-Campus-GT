import "dotenv/config";
import { getPool } from "../db/pool.js";
import { MemoryStore } from "./memory-store.js";
import { PostgresStore } from "./postgres-store.js";
import type { Store } from "../domain/types.js";

export function createStore(): Store {
  if (process.env.DATABASE_URL) return new PostgresStore(getPool());
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL es obligatorio en producción.");
  }
  return new MemoryStore();
}
