export type Course = {
  num: number;
  libelle: string;
  distance: number;
  discipline: string;
  heure: number;
  partants: number;
};

export type Reunion = {
  num: number;
  hippodrome: string;
  courses: Course[];
};

export type Participant = {
  num: number;
  nom: string;
  age: number;
  sexe: string;
  statut: string;
  driver: string;
  entraineur: string;
  musique: string;
  courses: number;
  victoires: number;
  places: number;
  gains: number;
  cote: number | null;
  coteRef: number | null;
  corde: number | null;
  poids: number | null;
  casaque: string | null;
  arrivee: number | null;
  pere: string;
};

const BASE = "https://online.turfinfo.api.pmu.fr/rest/client/1/programme";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9",
  Referer: "https://www.pmu.fr/",
  Origin: "https://www.pmu.fr",
};

export async function fetchProgramme(date: string): Promise<{ reunions: Reunion[]; error?: string }> {
  try {
    const res = await fetch(`${BASE}/${date}`, { headers: HEADERS, next: { revalidate: 60 } });
    if (!res.ok) return { reunions: [], error: `Programme indisponible (${res.status})` };
    const json = (await res.json()) as any;
    const reunions: Reunion[] = (json?.programme?.reunions ?? []).map((r: any) => ({
      num: r.numOfficiel,
      hippodrome: r.hippodrome?.libelleCourt ?? "",
      courses: (r.courses ?? []).map((c: any) => ({
        num: c.numOrdre,
        libelle: c.libelle,
        distance: c.distance,
        discipline: c.discipline,
        heure: c.heureDepart,
        partants: c.nombreDeclaresPartants,
      })),
    }));
    return { reunions };
  } catch (err: any) {
    return { reunions: [], error: err?.message || "Erreur de connexion PMU" };
  }
}

export async function fetchParticipants(
  date: string,
  r: number,
  c: number
): Promise<{ participants: Participant[]; error?: string }> {
  try {
    const res = await fetch(`${BASE}/${date}/R${r}/C${c}/participants`, {
      headers: HEADERS,
      next: { revalidate: 30 },
    });
    if (!res.ok) return { participants: [], error: `Course indisponible (${res.status})` };
    const json = (await res.json()) as any;
    const participants: Participant[] = (json?.participants ?? []).map((p: any) => ({
      num: p.numPmu,
      nom: p.nom,
      age: p.age,
      sexe: p.sexe,
      statut: p.statut,
      driver: p.driver ?? "",
      entraineur: p.entraineur ?? "",
      musique: p.musique ?? "",
      courses: p.nombreCourses ?? 0,
      victoires: p.nombreVictoires ?? 0,
      places: p.nombrePlaces ?? 0,
      gains: (p.gainsParticipant?.gainsCarriere ?? 0) / 100,
      cote: p.dernierRapportDirect?.rapport ?? null,
      coteRef: p.dernierRapportReference?.rapport ?? null,
      corde: p.placeCorde ?? null,
      poids: p.handicapPoids ? p.handicapPoids / 10 : null,
      casaque: p.urlCasaque ?? null,
      arrivee: p.ordreArrivee ?? null,
      pere: p.nomPere ?? "",
    }));
    return { participants };
  } catch (err: any) {
    return { participants: [], error: err?.message || "Erreur de connexion PMU" };
  }
}
