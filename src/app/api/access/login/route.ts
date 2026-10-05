import { NextResponse } from "next/server";
import { z } from "zod";
import { safeEqual, setAccessSession } from "@/lib/access";

const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = loginSchema.parse(body);
    const expected = process.env["ADMIN_PASSWORD"];

    if (!expected || !safeEqual(password, expected)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    await setAccessSession({ admin: true });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Identifiants invalides" }, { status: 400 });
  }
}
