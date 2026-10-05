"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { CRITERES, DEFAULT_WEIGHTS, scoreRace, type Scored, type Weights } from "@/lib/scoring";
import type { Reunion, Participant } from "@/lib/pmu";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const toPmu = (iso: string) => iso.split("-").reverse().join("");

type Tab = "analyse" | "pronostics" | "criteres" | "stats";

const TAG_STYLE: Record<Scored["tag"], string> = {
  Base: "bg-gold text-primary-foreground",
  Chance: "bg-success text-primary-foreground",
  Outsider: "bg-chart-4 text-foreground",
  Tocard: "bg-muted text-muted-foreground",
};

const TOP_FIVE_STYLE = [
  "border-l-chart-1 bg-chart-1/12",
  "border-l-chart-2 bg-chart-2/12",
  "border-l-chart-4 bg-chart-4/12",
  "border-l-chart-5 bg-chart-5/12",
  "border-l-accent bg-accent/12",
] as const;

const ARRIVAL_STYLE = [
  "bg-chart-1 text-primary-foreground",
  "bg-chart-2 text-primary-foreground",
  "bg-chart-4 text-primary-foreground",
  "bg-chart-5 text-primary-foreground",
  "bg-accent text-accent-foreground",
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(todayStr());
  const [rc, setRc] = useState<{ r: number; c: number }>({ r: 1, c: 1 });
  const [tab, setTab] = useState<Tab>("analyse");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [minScore, setMinScore] = useState(0);

  const pmuDate = toPmu(date);

  // Check user access session
  const accessQuery = useQuery({
    queryKey: ["access-check"],
    queryFn: async () => {
      const res = await fetch("/api/access/check");
      return res.json();
    },
  });

  useEffect(() => {
    if (accessQuery.data && !accessQuery.data.ok) {
      router.push("/acces");
    }
  }, [accessQuery.data, router]);

  const prog = useQuery<{ reunions: Reunion[]; error?: string }>({
    queryKey: ["prog", pmuDate],
    queryFn: async () => {
      const res = await fetch(`/api/pmu/programme?date=${pmuDate}`);
      return res.json();
    },
    enabled: !!accessQuery.data?.ok,
  });

  const part = useQuery<{ participants: Participant[]; error?: string }>({
    queryKey: ["part", pmuDate, rc.r, rc.c],
    queryFn: async () => {
      const res = await fetch(`/api/pmu/participants?date=${pmuDate}&r=${rc.r}&c=${rc.c}`);
      return res.json();
    },
    enabled: !!accessQuery.data?.ok,
  });

  const scored = useMemo(() => scoreRace(part.data?.participants ?? [], weights), [part.data, weights]);
  const visible = scored.filter((s) => s.score >= minScore);
  const reunion = prog.data?.reunions.find((r) => r.num === rc.r);
  const course = reunion?.courses.find((c) => c.num === rc.c);
  const nonPartants = (part.data?.participants ?? []).filter((p) => p.statut === "NON_PARTANT");
  const arrival = [...(part.data?.participants ?? [])]
    .filter((p) => p.arrivee !== null && p.arrivee > 0)
    .sort((a, b) => (a.arrivee ?? 99) - (b.arrivee ?? 99));

  const handleLogout = async () => {
    await fetch("/api/access/logout", { method: "POST" });
    queryClient.clear();
    router.push("/acces");
    router.refresh();
  };

  const exportCsv = () => {
    const head = ["Rang", "N°", "Cheval", "Driver", "Cote", "Score", "ProbaIA%", "Value", "Statut", "Musique"];
    const rows = scored.map((s) => [
      s.rang,
      s.num,
      s.nom,
      s.driver,
      s.cote ?? "",
      s.score,
      (s.probaIA * 100).toFixed(1),
      s.value.toFixed(2),
      s.tag,
      s.musique,
    ]);
    const csv = [head, ...rows].map((r) => r.join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = `ncv-turf-${pmuDate}-R${rc.r}C${rc.c}.csv`;
    a.click();
  };

  if (accessQuery.isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4">
          <BrandLogo priority className="h-16 w-auto max-w-[240px] sm:max-w-[300px]" />
          <span className="rounded bg-accent px-2 py-0.5 text-sm font-bold uppercase text-accent-foreground">IA v2</span>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setRc({ r: 1, c: 1 });
              }}
              className="rounded border border-input bg-card px-3 py-2 text-lg text-foreground"
            />
            <button
              onClick={exportCsv}
              disabled={!scored.length}
              className="bg-gold rounded px-4 py-2 font-bold uppercase text-primary-foreground shadow-gold disabled:opacity-40 cursor-pointer"
            >
              Export CSV
            </button>
            <button
              onClick={handleLogout}
              title="Fermer votre session"
              className="rounded border border-gold/60 px-4 py-2 font-bold uppercase text-gold hover:bg-gold hover:text-primary-foreground transition-colors cursor-pointer"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          {prog.isLoading && <p className="text-muted-foreground">Chargement du programme…</p>}
          {prog.data?.error && <p className="text-destructive">{prog.data.error}</p>}
          {prog.data?.reunions.map((r) => (
            <div key={r.num} className="rounded-lg border border-border bg-card p-3">
              <p className="font-display text-primary text-lg">
                R{r.num} · {r.hippodrome}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.courses.map((c) => {
                  const active = rc.r === r.num && rc.c === c.num;
                  return (
                    <button
                      key={c.num}
                      onClick={() => setRc({ r: r.num, c: c.num })}
                      title={c.libelle}
                      className={`rounded px-2 py-1 text-sm font-semibold cursor-pointer ${
                        active ? "bg-gold text-primary-foreground" : "bg-secondary hover:bg-muted"
                      }`}
                    >
                      C{c.num}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <main className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4 shadow-gold">
            <p className="text-sm uppercase text-muted-foreground">
              R{rc.r}C{rc.c} · {reunion?.hippodrome}
            </p>
            <h2 className="font-display text-2xl">{course?.libelle ?? "Course"}</h2>
            <p className="text-muted-foreground">
              {course &&
                `${course.discipline} · ${course.distance} m · ${new Date(course.heure).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} · ${course.partants} partants`}
              {nonPartants.length > 0 && (
                <span className="text-destructive"> · NP : {nonPartants.map((n) => n.num).join(", ")}</span>
              )}
            </p>
            {arrival.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <span className="font-bold uppercase text-success">Arrivée officielle</span>
                {arrival.map((horse) => (
                  <span
                    key={horse.num}
                    title={`${horse.arrivee}${horse.arrivee === 1 ? "er" : "e"} · ${horse.nom}`}
                    className={`flex h-8 min-w-8 items-center justify-center rounded px-2 font-display text-lg ${
                      horse.arrivee && horse.arrivee <= 5
                        ? ARRIVAL_STYLE[horse.arrivee - 1]
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {horse.num}
                  </span>
                ))}
              </div>
            )}
          </section>

          <nav className="flex flex-wrap gap-2">
            {(
              [
                ["analyse", "Analyse"],
                ["pronostics", "Pronostics"],
                ["criteres", "Critères & Filtres"],
                ["stats", "Statistiques"],
              ] as [Tab, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded px-4 py-2 text-lg font-bold uppercase cursor-pointer ${
                  tab === k ? "bg-gold text-primary-foreground" : "bg-secondary hover:bg-muted"
                }`}
              >
                {l}
              </button>
            ))}
          </nav>

          {part.isLoading && <p className="text-muted-foreground">Import des partants…</p>}
          {part.data?.error && <p className="text-destructive">{part.data.error}</p>}

          {tab === "analyse" && scored.length > 0 && <AnalyseTable rows={visible} />}
          {tab === "pronostics" && scored.length > 0 && <Pronostics rows={scored} />}
          {tab === "criteres" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-display text-primary text-xl">Pondération des critères</h3>
                {CRITERES.map((c) => (
                  <label key={c.key} className="mt-3 block">
                    <span className="flex justify-between">
                      <span>{c.label}</span>
                      <b className="text-primary">{weights[c.key]}</b>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={weights[c.key]}
                      className="w-full accent-primary"
                      onChange={(e) => setWeights({ ...weights, [c.key]: Number(e.target.value) })}
                    />
                  </label>
                ))}
                <button
                  onClick={() => setWeights(DEFAULT_WEIGHTS)}
                  className="mt-4 rounded bg-secondary px-3 py-1 cursor-pointer hover:bg-muted"
                >
                  Réinitialiser
                </button>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-display text-primary text-xl">Filtres</h3>
                <label className="mt-3 block">
                  <span className="flex justify-between">
                    <span>Score minimum</span>
                    <b className="text-primary">{minScore}</b>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>
                <p className="mt-3 text-muted-foreground">{visible.length} / {scored.length} chevaux affichés dans l'analyse.</p>
              </div>
            </div>
          )}
          {tab === "stats" && scored.length > 0 && <Stats rows={scored} />}
        </main>
      </div>
    </div>
  );
}

function FormeDots({ f }: { f: number[] }) {
  return (
    <div className="flex gap-0.5">
      {f.slice(0, 6).map((p, i) => (
        <span
          key={i}
          className={`flex h-5 w-5 items-center justify-center rounded-sm text-xs font-bold ${
            p === 1
              ? "bg-gold text-primary-foreground"
              : p <= 3
              ? "bg-success text-primary-foreground"
              : p <= 5
              ? "bg-chart-5 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {p >= 10 ? (p === 12 ? "D" : "0") : p}
        </span>
      ))}
    </div>
  );
}

function AnalyseTable({ rows }: { rows: Scored[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-base">
        <thead className="bg-secondary text-sm uppercase text-muted-foreground">
          <tr>
            {[
              "#",
              "N°",
              "Cheval",
              "Driver / Entr.",
              "Forme",
              "Cote",
              "Tend.",
              "V/P/C",
              "Proba IA",
              "Value",
              "Score",
              "Arrivée",
              "Statut",
            ].map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const trend = s.cote && s.coteRef ? s.cote - s.coteRef : 0;
            return (
              <tr
                key={s.num}
                className={`border-t border-l-4 border-border hover:bg-muted/50 ${
                  s.rang <= 5 ? TOP_FIVE_STYLE[s.rang - 1] : "border-l-transparent"
                }`}
              >
                <td className="px-3 py-2 font-display text-primary">{s.rang}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {s.casaque && <img src={s.casaque} alt="" className="h-6 w-6" loading="lazy" />}
                    <b>{s.num}</b>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <b>{s.nom}</b>
                  <div className="text-xs text-muted-foreground">
                    {s.sexe[0]}
                    {s.age} · {s.pere}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm">
                  {s.driver}
                  <div className="text-xs text-muted-foreground">{s.entraineur}</div>
                </td>
                <td className="px-3 py-2">
                  <FormeDots f={s.forme} />
                </td>
                <td className="px-3 py-2 font-bold">{s.cote ?? "—"}</td>
                <td
                  className={`px-3 py-2 font-bold ${
                    trend < 0 ? "text-success" : trend > 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {trend < 0 ? "▼" : trend > 0 ? "▲" : "="}
                </td>
                <td className="px-3 py-2 text-sm">
                  {s.victoires}/{s.places}/{s.courses}
                </td>
                <td className="px-3 py-2">{(s.probaIA * 100).toFixed(1)}%</td>
                <td
                  className={`px-3 py-2 font-bold ${s.value > 1.2 ? "text-success" : "text-muted-foreground"}`}
                >
                  {s.value ? s.value.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded bg-muted">
                      <div className="bg-gold h-2 rounded" style={{ width: `${s.score}%` }} />
                    </div>
                    <b className="text-primary">{s.score}</b>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {s.arrivee ? (
                    <span
                      className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1 font-bold ${
                        s.arrivee <= 5 ? ARRIVAL_STYLE[s.arrivee - 1] : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.arrivee === 1 ? "1er" : `${s.arrivee}e`}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${TAG_STYLE[s.tag]}`}>
                    {s.tag}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pronostics({ rows }: { rows: Scored[] }) {
  const n = rows.map((r) => r.num);
  const bases = rows.filter((r) => r.tag === "Base");
  const outsiders = [...rows]
    .filter((r) => r.rang > 3)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const bets = [
    { name: "Simple Gagnant", sel: n.slice(0, 1), cls: "bg-gold text-primary-foreground" },
    { name: "Simple Placé", sel: n.slice(1, 2), cls: "bg-secondary" },
    { name: "Couplé", sel: n.slice(0, 2), cls: "bg-chart-5 text-primary-foreground" },
    { name: "Tiercé", sel: n.slice(0, 3), cls: "bg-chart-4" },
    { name: "Quarté+", sel: n.slice(0, 4), cls: "bg-success text-primary-foreground" },
    { name: "Quinté+", sel: n.slice(0, 5), cls: "bg-accent text-accent-foreground" },
    { name: "Multi en 6", sel: n.slice(0, 6), cls: "bg-secondary" },
    { name: "2 sur 4", sel: n.slice(0, 4), cls: "bg-secondary" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Bases solides">
          {bases.map((b) => (
            <Horse key={b.num} s={b} />
          ))}
        </Card>
        <Card title="Outsiders à value">
          {outsiders.map((b) => (
            <Horse key={b.num} s={b} />
          ))}
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {bets.map((b) => (
          <div key={b.name} className="overflow-hidden rounded-lg border border-border bg-card">
            <p className={`px-3 py-1 font-display text-lg uppercase ${b.cls}`}>{b.name}</p>
            <p className="px-3 py-3 font-display text-3xl tracking-wider">{b.sel.join(" - ")}</p>
          </div>
        ))}
      </div>
      <Card title="Champ réduit Quinté+ (2 bases + 6 associés)">
        <p className="font-display text-2xl">
          <span className="text-primary">{n.slice(0, 2).join(" - ")}</span> / {n.slice(2, 8).join(" - ")}
        </p>
        <p className="text-muted-foreground">Combinaisons : {comb(6, 3)} en champ réduit.</p>
      </Card>
    </div>
  );
}

const comb = (n: number, k: number): number => (k === 0 ? 1 : (n * comb(n - 1, k - 1)) / k);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-display text-primary mb-2 text-xl">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Horse({ s }: { s: Scored }) {
  return (
    <div className="flex items-center gap-3 rounded bg-secondary px-3 py-2">
      <span className="font-display text-gold text-2xl">{s.num}</span>
      <b className="flex-1">{s.nom}</b>
      <span className="text-muted-foreground">cote {s.cote ?? "—"}</span>
      <b className="text-primary">{s.score}</b>
    </div>
  );
}

function Stats({ rows }: { rows: Scored[] }) {
  const max = Math.max(...rows.map((r) => r.score), 1);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Scores & performances">
        <div className="flex h-56 items-end gap-1">
          {rows.map((r) => (
            <div key={r.num} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs">{r.score}</span>
              <div className="bg-gold w-full rounded-t" style={{ height: `${(r.score / max) * 180}px` }} />
              <span className="text-xs text-muted-foreground">{r.num}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Probabilité IA vs marché">
        {rows.slice(0, 8).map((r) => (
          <div key={r.num} className="text-sm">
            <div className="flex justify-between">
              <span>
                {r.num} · {r.nom}
              </span>
              <span>
                {(r.probaIA * 100).toFixed(0)}% / {r.cote ? (100 / r.cote).toFixed(0) : "—"}%
              </span>
            </div>
            <div className="relative h-2 rounded bg-muted">
              <div className="bg-success absolute h-2 rounded" style={{ width: `${r.probaIA * 100}%` }} />
              <div
                className="absolute h-2 rounded border-r-2 border-primary"
                style={{ width: `${r.cote ? 100 / r.cote : 0}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Barre verte = IA · trait doré = marché</p>
      </Card>
      <Card title="Détail des critères (top 5)">
        {rows.slice(0, 5).map((r) => (
          <div key={r.num}>
            <b>
              {r.num} · {r.nom}
            </b>
            <div className="mt-1 grid grid-cols-6 gap-1">
              {CRITERES.map((c) => (
                <div key={c.key} title={c.label} className="rounded bg-muted text-center text-xs">
                  <div className="bg-gold rounded" style={{ height: 4, width: `${r.sub[c.key]}%` }} />
                  {Math.round(r.sub[c.key])}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
