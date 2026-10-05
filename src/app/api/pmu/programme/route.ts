import { NextResponse } from "next/server";
import { fetchProgramme } from "@/lib/pmu";
import { requireAccess } from "@/lib/access";

export async function GET(req: Request) {
  try {
    await requireAccess();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date || !/^\d{8}$/.test(date)) {
      return NextResponse.json({ reunions: [], error: "Format de date invalide (AAAAMMJJ requise)" }, { status: 400 });
    }

    const result = await fetchProgramme(date);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ reunions: [], error: e?.message || "Accès non autorisé" }, { status: 401 });
  }
}
