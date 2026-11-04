import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { query } from "@/lib/db";

const genCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `RDY-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
};

export async function GET() {
  try {
    await requireAdmin();
    const data = await query("SELECT * FROM access_codes ORDER BY created_at DESC");
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Accès refusé" }, { status: 403 });
  }
}

const createSchema = z.object({
  label: z.string().max(100).optional(),
  days: z.number().int().min(0).max(3650),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { label, days } = createSchema.parse(body);

    const expires_at = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const [row] = await query(
      "INSERT INTO access_codes (code, label, expires_at) VALUES ($1, $2, $3) RETURNING *",
      [genCode(), label || null, expires_at],
    );

    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur de création" }, { status: 400 });
  }
}

const toggleSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, active } = toggleSchema.parse(body);

    await query("UPDATE access_codes SET active = $1 WHERE id = $2", [active, id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur de mise à jour" }, { status: 400 });
  }
}

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id } = deleteSchema.parse(body);

    await query("DELETE FROM access_codes WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur de suppression" }, { status: 400 });
  }
}
