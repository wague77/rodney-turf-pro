import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type AccessSession = { codeId?: string; admin?: boolean };

export const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "ncv-access",
  maxAge: 60 * 60 * 24 * 30,
  cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
});

export const getAccessSession = () => useSession<AccessSession>(sessionConfig());

export function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Vérifie que le code de la session est toujours valide. */
export async function hasValidAccess(): Promise<{ ok: boolean; admin: boolean }> {
  const s = await getAccessSession();
  if (s.data.admin) return { ok: true, admin: true };
  if (!s.data.codeId) return { ok: false, admin: false };
  const db = await admin();
  const { data } = await db.from("access_codes").select("active, expires_at").eq("id", s.data.codeId).maybeSingle();
  const ok = !!data && data.active && (!data.expires_at || new Date(data.expires_at) > new Date());
  if (!ok) await s.clear();
  return { ok, admin: false };
}

export async function requireAccess() {
  const r = await hasValidAccess();
  if (!r.ok) throw new Error("Accès refusé");
}

export async function requireAdmin() {
  const s = await getAccessSession();
  if (!s.data.admin) throw new Error("Admin requis");
  return admin();
}

export { admin as getDb };
