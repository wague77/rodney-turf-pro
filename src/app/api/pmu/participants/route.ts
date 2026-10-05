import { NextResponse } from "next/server";
import { fetchParticipants } from "@/lib/pmu";
import { requireAccess } from "@/lib/access";

export async function GET(req: Request) {
  try {
    await requireAccess();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const rStr = searchParams.get("r");
    const cStr = searchParams.get("c");

    if (!date || !/^\d{8}$/.test(date) || !rStr || !cStr) {
      return NextResponse.json({ participants: [], error: "Paramètres manquants ou invalides" }, { status: 400 });
    }

    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);
    if (isNaN(r) || isNaN(c)) {
      return NextResponse.json({ participants: [], error: "Réunion et course doivent être des nombres" }, { status: 400 });
    }

    const result = await fetchParticipants(date, r, c);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ participants: [], error: e?.message || "Accès non autorisé" }, { status: 401 });
  }
}
