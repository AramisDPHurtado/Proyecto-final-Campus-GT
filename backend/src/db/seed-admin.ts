import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPool } from "./pool.js";

async function seedAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 12) {
    throw new Error("Definí ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD (12 caracteres o más) en el entorno.");
  }
  const pool = getPool();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'admin') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'admin'",
      [randomUUID(), name, email, passwordHash]
    );
    console.log("Administrador listo para iniciar sesión.");
  } finally {
    await pool.end();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error("No se pudo preparar el usuario administrador.", error instanceof Error ? error.message : "Error inesperado.");
  process.exitCode = 1;
});
