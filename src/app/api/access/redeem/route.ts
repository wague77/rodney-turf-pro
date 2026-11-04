import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { setAccessSession } from "@/lib/access";

const redeemSchema = z.object({
  code: z.string().trim().min(3).max(64),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code: rawCode } = redeemSchema.parse(body);
    const code = rawCode.toUpperCase();

    const [row] = await query("SELECT * FROM access_codes WHERE code = $1", [code]);

    if (!row || !row.active || (row.expires_at && new Date(row.expires_at) <= new Date())) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await query("UPDATE access_codes SET uses = uses + 1, last_used_at = now() WHERE id = $1", [row.id]);

    await setAccessSession({ codeId: row.id, admin: false });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur de validation" }, { status: 400 });
  }
}
