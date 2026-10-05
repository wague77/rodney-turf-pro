import type { Metadata } from "next";
import { Anton, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rodney Turf Pro — Logiciel hippique d'analyse IA",
  description: "Analyse des courses PMU, scores IA, pronostics, bases, outsiders et combinaisons Quinté+.",
  openGraph: {
    title: "Rodney Turf Pro — Logiciel hippique d'analyse IA",
    description: "Import des courses PMU, critères pondérables, pronostics et export CSV.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${anton.variable} ${barlowCondensed.variable} dark`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
