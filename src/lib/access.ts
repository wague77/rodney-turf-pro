import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { query } from "./db";

export type AccessSession = { codeId?: string; admin?: boolean };

const COOKIE_NAME = "ncv-access";

export function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

function secret() {
  const s = process.env["SESSION_SECRET"];
  if (!s) throw new Error("SESSION_SECRET manquant");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export async function getAccessSession(): Promise<AccessSession> {
  const cookieStore = await cookies();
  const val = cookieStore.get(COOKIE_NAME)?.value;
  if (!val) return {};
  try {
    const [payload, sig] = val.split(".");
    if (!payload || !sig || !safeEqual(sig, sign(payload))) return {};
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return {};
  }
}

export async function setAccessSession(session: AccessSession) {
  const cookieStore = await cookies();
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const val = `${payload}.${sign(payload)}`;
  cookieStore.set(COOKIE_NAME, val, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAccessSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function hasValidAccess(): Promise<{ ok: boolean; admin: boolean }> {
  const s = await getAccessSession();
  if (s.admin) return { ok: true, admin: true };
  if (!s.codeId) return { ok: false, admin: false };
  try {
    const [data] = await query<{ active: boolean; expires_at: string | null }>(
      "SELECT active, expires_at FROM access_codes WHERE id = $1",
      [s.codeId],
    );
    const ok = !!data && data.active && (!data.expires_at || new Date(data.expires_at) > new Date());
    if (!ok) await clearAccessSession();
    return { ok, admin: false };
  } catch {
    return { ok: false, admin: false };
  }
}

export async function requireAccess() {
  const r = await hasValidAccess();
  if (!r.ok) throw new Error("Accès refusé");
}

export async function requireAdmin() {
  const s = await getAccessSession();
  if (!s.admin) throw new Error("Admin requis");
}
