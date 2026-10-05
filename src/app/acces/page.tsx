"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

export default function AccesPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const code = String(new FormData(e.currentTarget).get("code") ?? "");

    try {
      const res = await fetch("/api/access/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-gold space-y-5">
        <div className="text-center">
          <BrandLogo priority className="mx-auto h-auto w-full max-w-[280px]" />
          <p className="text-muted-foreground mt-2">Entrez votre code d'accès</p>
        </div>
        <input
          name="code"
          required
          autoFocus
          placeholder="RDY-XXXX-XXXX-XXXX"
          className="w-full rounded-md border border-input bg-background px-4 py-3 text-center text-lg tracking-widest uppercase text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-destructive text-sm text-center">Code invalide, expiré ou désactivé.</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-gold py-3 font-display text-lg text-primary-foreground disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Vérification…" : "ENTRER"}
        </button>
        <a
          href="https://shop.com/products/10893115392339/abonnement-vip-coaching-turf-logiciel-mensuels?fromShop=true"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm font-bold uppercase tracking-wide text-gold hover:underline"
        >
          Pas encore de code ? S'abonner ici
        </a>
        <a href="/admin" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          Espace admin
        </a>
      </form>
    </div>
  );
}
