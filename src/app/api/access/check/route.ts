import { NextResponse } from "next/server";
import { hasValidAccess } from "@/lib/access";

export async function GET() {
  const result = await hasValidAccess();
  return NextResponse.json(result);
}
