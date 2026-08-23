"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export type Snack = {
  id: string;
  kind: "shop" | "business";
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  city: string | null;
  delivery_fee: number;
  is_open: boolean;
  est_nouveau: boolean;
  succursales: number;
};

const TOUTES = "Toutes les villes";

/** Sans accents et en minuscules, pour que « Sale » trouve « Salé ». */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function Annuaire({ snacks }: { snacks: Snack[] }) {
  const [recherche, setRecherche] = useState("");
  const [ville, setVille] = useState(TOUTES);

  // Une ville n'apparait que si un snack s'y trouve : pas de filtre qui
  // ne donne rien.
  const villes = useMemo(() => {
    const vues = new Map<string, string>();
    for (const s of snacks) {
      const v = s.city?.trim();
      if (v) vues.set(normaliser(v), v);
    }
    return [...vues.values()].sort((a, b) => a.localeCompare(b, "fr"));
  }, [snacks]);

  const resultats = useMemo(() => {
    const q = normaliser(recherche.trim());

    return snacks.filter((s) => {
      if (ville !== TOUTES && normaliser(s.city ?? "") !== normaliser(ville)) {
        return false;
      }
      if (!q) return true;
      return normaliser(
        `${s.name} ${s.description ?? ""} ${s.address ?? ""} ${s.city ?? ""}`,
      ).includes(q);
    });
  }, [snacks, recherche, ville]);

  return (
    <>
      <div className="mx-auto mb-6 max-w-md">
        <label className="sr-only" htmlFor="recherche">
          Rechercher un snack
        </label>
        <input
          id="recherche"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un snack, un plat..."
          className="w-full rounded-xl border border-bord bg-white px-4 py-3 text-charbon outline-none transition placeholder:text-ardoise-clair focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        />
      </div>

      {villes.length > 0 ? (
        <div className="defilement-discret mb-8 flex gap-2 overflow-x-auto pb-1">
          {[TOUTES, ...villes].map((v) => {
            const actif = ville === v;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={actif}
                onClick={() => setVille(v)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
                  actif
                    ? "bg-charbon text-creme"
                    : "border border-bord bg-white text-ardoise hover:border-terracotta hover:text-terracotta"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      ) : null}

      {resultats.length === 0 ? (
        <p className="py-12 text-center text-ardoise">
          {snacks.length === 0
            ? "Aucun snack n'est encore en ligne."
            : "Aucun snack ne correspond a votre recherche."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resultats.map((snack) => (
            <li key={snack.id}>
              <Link
                // Une enseigne a plusieurs succursales renvoie vers le
                // choix de succursale, pas directement vers un menu :
                // il n'existe pas de « menu de l'enseigne » unique.
                href={
                  snack.kind === "business"
                    ? `/enseigne/${snack.slug}`
                    : `/${snack.slug}`
                }
                className="block overflow-hidden rounded-2xl border border-bord bg-white transition hover:border-terracotta"
              >
                <div className="relative h-28 w-full bg-terracotta">
                  {snack.cover_url ? (
                    <Image
                      src={snack.cover_url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : null}

                  {snack.est_nouveau ? (
                    <span className="absolute end-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-medium text-terracotta-fonce">
                      nouveau
                    </span>
                  ) : null}
                </div>

                <div className="p-4">
                  <div className="-mt-10 mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-creme-fonce">
                    {snack.logo_url ? (
                      <Image
                        src={snack.logo_url}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-semibold text-terracotta">
                        {snack.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-charbon">{snack.name}</p>

                  {snack.description ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-ardoise">
                      {snack.description}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        snack.is_open
                          ? "bg-vert-doux text-vert-fonce"
                          : "bg-creme-fonce text-ardoise"
                      }`}
                    >
                      {snack.is_open ? "ouvert" : "ferme"}
                    </span>
                    <span className="rounded-full bg-creme-fonce px-2 py-0.5 text-ardoise">
                      {snack.delivery_fee > 0
                        ? `livraison ${snack.delivery_fee.toFixed(2)} DH`
                        : "livraison gratuite"}
                    </span>
                    {snack.city ? (
                      <span className="rounded-full bg-creme-fonce px-2 py-0.5 text-ardoise">
                        {snack.city}
                      </span>
                    ) : null}
                    {snack.succursales > 1 ? (
                      <span className="rounded-full bg-creme-fonce px-2 py-0.5 text-ardoise">
                        {snack.succursales} succursales
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
