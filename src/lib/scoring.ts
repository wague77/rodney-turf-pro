import type { Participant } from "./pmu";

export type Weights = {
  forme: number;
  reussite: number;
  cote: number;
  gains: number;
  tendance: number;
  regularite: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  forme: 30,
  reussite: 20,
  cote: 25,
  gains: 10,
  tendance: 10,
  regularite: 5,
};

export const CRITERES: { key: keyof Weights; label: string }[] = [
  { key: "forme", label: "Forme récente (musique)" },
  { key: "reussite", label: "Taux de réussite" },
  { key: "cote", label: "Cote / marché" },
  { key: "gains", label: "Gains par course" },
  { key: "tendance", label: "Tendance de la cote" },
  { key: "regularite", label: "Régularité" },
];

/** Parse "0p8p240p4p1p" into positions (0 = non placé → 10, letters D/A/T/R → 12). */
export function parseMusique(m: string): number[] {
  const out: number[] = [];
  const clean = m.replace(/\(\d+\)/g, "");
  for (let i = 0; i < clean.length && out.length < 8; i++) {
    const ch = clean[i] ?? "";
    if (/\d/.test(ch)) out.push(ch === "0" ? 10 : Number(ch));
    else if (/[DATR]/i.test(ch) && i + 1 < clean.length && /[a-z]/.test(clean[i + 1] ?? "")) out.push(12);
  }
  return out;
}

export type Scored = Participant & {
  score: number;
  sub: Record<keyof Weights, number>;
  forme: number[];
  probaIA: number;
  value: number;
  rang: number;
  tag: "Base" | "Chance" | "Outsider" | "Tocard";
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function scoreRace(list: Participant[], w: Weights): Scored[] {
  const partants = list.filter((p) => p.statut !== "NON_PARTANT");
  const maxGpc = Math.max(1, ...partants.map((p) => p.gains / Math.max(1, p.courses)));
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;

  const scored = partants.map((p) => {
    const forme = parseMusique(p.musique);
    const fw = forme.map((pos, i) => (Math.max(0, 11 - pos) / 10) * (1 / (i + 1)));
    const fn = forme.reduce((a, _, i) => a + 1 / (i + 1), 0) || 1;
    const sForme = forme.length ? clamp((fw.reduce((a, b) => a + b, 0) / fn) * 100) : 40;
    const sReussite = p.courses ? clamp(((p.victoires * 2 + p.places) / (p.courses * 2)) * 130) : 30;
    const sCote = p.cote ? clamp(100 - Math.log(p.cote) * 28) : 40;
    const sGains = clamp(((p.gains / Math.max(1, p.courses)) / maxGpc) * 100);
    const sTend = p.cote && p.coteRef ? clamp(50 + ((p.coteRef - p.cote) / p.coteRef) * 150) : 50;
    const mean = forme.length ? forme.reduce((a, b) => a + b, 0) / forme.length : 8;
    const sd = forme.length ? Math.sqrt(forme.reduce((a, b) => a + (b - mean) ** 2, 0) / forme.length) : 4;
    const sReg = clamp(100 - sd * 20);
    const sub = { forme: sForme, reussite: sReussite, cote: sCote, gains: sGains, tendance: sTend, regularite: sReg };
    const score = (Object.keys(sub) as (keyof Weights)[]).reduce((a, k) => a + sub[k] * w[k], 0) / total;
    return { ...p, score: Math.round(score), sub, forme } as Scored;
  });

  const exps = scored.map((s) => Math.exp(s.score / 12));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  scored.forEach((s, i) => {
    s.probaIA = (exps[i] ?? 0) / sum;
    const market = s.cote ? 1 / s.cote : 0;
    s.value = market ? s.probaIA / market : 0;
  });
  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => {
    s.rang = i + 1;
    s.tag = i < 2 ? "Base" : i < 5 ? "Chance" : s.value > 1.2 || i < 8 ? "Outsider" : "Tocard";
  });
  return scored;
}
