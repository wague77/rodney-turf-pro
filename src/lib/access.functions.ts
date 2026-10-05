import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAccessSession, getDb, hasValidAccess, requireAdmin, safeEqual } from "./access.server";

export const checkAccess = createServerFn({ method: "GET" }).handler(async () => hasValidAccess());

export const redeemCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().trim().min(3).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const db = await getDb();
    const code = data.code.toUpperCase();
    const { data: row } = await db.from("access_codes").select("*").eq("code", code).maybeSingle();
    if (!row || !row.active || (row.expires_at && new Date(row.expires_at) <= new Date()))
      return { ok: false as const };
    await db.from("access_codes").update({ uses: row.uses + 1, last_used_at: new Date().toISOString() }).eq("id", row.id);
    const s = await getAccessSession();
    await s.update({ codeId: row.id, admin: false });
    return { ok: true as const };
  });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected || !safeEqual(data.password, expected)) return { ok: false as const };
    const s = await getAccessSession();
    await s.update({ admin: true });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const s = await getAccessSession();
  await s.clear();
  return { ok: true };
});

export type AccessCode = {
  id: string; code: string; label: string | null; active: boolean;
  expires_at: string | null; uses: number; last_used_at: string | null; created_at: string;
};

export const listCodes = createServerFn({ method: "GET" }).handler(async (): Promise<AccessCode[]> => {
  const db = await requireAdmin();
  const { data, error } = await db.from("access_codes").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as AccessCode[];
});

const genCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `RDY-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
};

export const createCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ label: z.string().max(100).optional(), days: z.number().int().min(0).max(3650) }).parse(d))
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const expires_at = data.days > 0 ? new Date(Date.now() + data.days * 86400000).toISOString() : null;
    const { data: row, error } = await db.from("access_codes")
      .insert({ code: genCode(), label: data.label || null, expires_at }).select().single();
    if (error) throw new Error(error.message);
    return row as AccessCode;
  });

export const toggleCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    await db.from("access_codes").update({ active: data.active }).eq("id", data.id);
    return { ok: true };
  });

export const deleteCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    await db.from("access_codes").delete().eq("id", data.id);
    return { ok: true };
  });
