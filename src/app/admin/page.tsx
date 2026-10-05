"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

type AccessCode = {
  id: string;
  code: string;
  label: string | null;
  active: boolean;
  expires_at: string | null;
  uses: number;
  last_used_at: string | null;
  created_at: string;
};

export default function AdminPage() {
  const q = useQuery({
    queryKey: ["access-check"],
    queryFn: async () => {
      const res = await fetch("/api/access/check");
      return res.json();
    },
  });

  if (q.isLoading) return <div className="min-h-screen bg-background" />;
  return q.data?.admin ? <Panel /> : <Login onOk={() => q.refetch()} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [error, setError] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");

    try {
      const res = await fetch("/api/access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) onOk();
      else setError(true);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-border bg-card p-8 space-y-4 shadow-gold">
        <BrandLogo priority className="mx-auto h-auto w-full max-w-[260px]" />
        <h1 className="font-display text-3xl text-gold text-center">ESPACE ADMIN</h1>
        <input
          name="password"
          type="password"
          required
          autoFocus
          placeholder="Mot de passe admin"
          className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-destructive text-sm text-center">Mot de passe incorrect.</p>}
        <button className="w-full rounded-md bg-gold py-3 font-display text-lg text-primary-foreground cursor-pointer">
          CONNEXION
        </button>
      </form>
    </div>
  );
}

function Panel() {
  const qc = useQueryClient();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(30);
  const [last, setLast] = useState<string | null>(null);

  const codes = useQuery<AccessCode[]>({
    queryKey: ["codes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/codes");
      if (!res.ok) throw new Error("Erreur de chargement");
      return res.json();
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["codes"] });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, days }),
      });
      const row = await res.json();
      if (res.ok && row.code) {
        setLast(row.code);
        setLabel("");
        refresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function onToggle(id: string, active: boolean) {
    try {
      await fetch("/api/admin/codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce code ?")) return;
    try {
      await fetch("/api/admin/codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function onLogout() {
    await fetch("/api/access/logout", { method: "POST" });
    qc.clear();
    router.push("/acces");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandLogo priority className="h-16 w-auto max-w-[230px]" />
            <h1 className="font-display text-3xl text-gold">CODES D'ACCÈS</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
              Ouvrir le logiciel
            </Link>
            <button onClick={onLogout} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary cursor-pointer">
              Déconnexion
            </button>
          </div>
        </div>

        <form onSubmit={onCreate} className="rounded-xl border border-border bg-card p-5 flex flex-wrap gap-3 items-end shadow-gold">
          <label className="flex-1 min-w-48 text-sm">
            Client / note
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex : Jean Dupont"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            />
          </label>
          <label className="text-sm">
            Durée
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-foreground"
            >
              <option value={1}>1 jour</option>
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
              <option value={365}>1 an</option>
              <option value={0}>Illimité</option>
            </select>
          </label>
          <button className="rounded-md bg-gold px-6 py-2 font-display text-primary-foreground cursor-pointer">
            GÉNÉRER UN CODE
          </button>
          {last && (
            <div className="w-full flex items-center gap-3 rounded-md bg-muted px-4 py-3">
              <span className="text-sm text-muted-foreground">Nouveau code :</span>
              <code className="font-mono text-lg text-gold tracking-widest">{last}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(last)}
                className="ml-auto text-sm underline cursor-pointer"
              >
                Copier
              </button>
            </div>
          )}
        </form>

        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="p-3">Code</th>
                <th>Client</th>
                <th>Expire</th>
                <th>Utilisations</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {codes.data?.map((c) => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3 font-mono tracking-wider">{c.code}</td>
                    <td>{c.label ?? "—"}</td>
                    <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString("fr-FR") : "Illimité"}</td>
                    <td>{c.uses}</td>
                    <td>
                      {expired ? (
                        <span className="text-destructive font-semibold">Expiré</span>
                      ) : c.active ? (
                        <span className="text-success font-semibold">Actif</span>
                      ) : (
                        <span className="text-muted-foreground">Désactivé</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-3 whitespace-nowrap">
                      <button onClick={() => onToggle(c.id, !c.active)} className="underline cursor-pointer">
                        {c.active ? "Désactiver" : "Activer"}
                      </button>
                      <button onClick={() => onDelete(c.id)} className="text-destructive underline cursor-pointer">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
              {codes.data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Aucun code pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
