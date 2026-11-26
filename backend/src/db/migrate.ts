import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getPool, closePool } from "./pool.js";

const pool = getPool();
try {
  const sql = await readFile(new URL("./001_initial.sql", import.meta.url), "utf8");
  await pool.query("BEGIN");
  await pool.query(sql);
  await pool.query(
    "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
    ["001_initial.sql"]
  );
  await pool.query("COMMIT");
  console.log("Migración aplicada: 001_initial.sql");
} catch (error) {
  await pool.query("ROLLBACK").catch(() => undefined);
  console.error("No se pudo aplicar la migración.", error);
  process.exitCode = 1;
} finally {
  await closePool();
}
