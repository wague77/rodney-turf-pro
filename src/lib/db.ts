import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool; __pgReady?: Promise<void> };

function pool() {
  if (!globalForPg.__pgPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant");
    globalForPg.__pgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return globalForPg.__pgPool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  uses integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
)`;

/** Exécute une requête SQL, en créant la table access_codes au premier appel. */
export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!globalForPg.__pgReady) {
    globalForPg.__pgReady = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        globalForPg.__pgReady = undefined;
        throw e;
      });
  }
  await globalForPg.__pgReady;
  const res = await pool().query(text, params as any[]);
  return res.rows as T[];
}
