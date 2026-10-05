import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { setAccessSession } from "@/lib/access";

const redeemSchema = z.object({
  code: z.string().trim().min(3).max(64),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code: rawCode } = redeemSchema.parse(body);
    const code = rawCode.toUpperCase();

    const { data: row } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!row || !row.active || (row.expires_at && new Date(row.expires_at) <= new Date())) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await supabaseAdmin
      .from("access_codes")
      .update({ uses: row.uses + 1, last_used_at: new Date().toISOString() })
      .eq("id", row.id);

    await setAccessSession({ codeId: row.id, admin: false });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur de validation" }, { status: 400 });
  }
}
