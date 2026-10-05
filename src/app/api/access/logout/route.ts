import { NextResponse } from "next/server";
import { clearAccessSession } from "@/lib/access";

export async function POST() {
  await clearAccessSession();
  return NextResponse.json({ ok: true });
}
