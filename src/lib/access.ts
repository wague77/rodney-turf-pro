import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase";

export type AccessSession = { codeId?: string; admin?: boolean };

const COOKIE_NAME = "ncv-access";

export function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export async function getAccessSession(): Promise<AccessSession> {
  const cookieStore = await cookies();
  const val = cookieStore.get(COOKIE_NAME)?.value;
  if (!val) return {};
  try {
    const data = JSON.parse(Buffer.from(val, "base64").toString("utf-8"));
    return data;
  } catch {
    return {};
  }
}

export async function setAccessSession(session: AccessSession) {
  const cookieStore = await cookies();
  const val = Buffer.from(JSON.stringify(session)).toString("base64");
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
    const { data } = await supabaseAdmin
      .from("access_codes")
      .select("active, expires_at")
      .eq("id", s.codeId)
      .maybeSingle();
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
  return supabaseAdmin;
}
