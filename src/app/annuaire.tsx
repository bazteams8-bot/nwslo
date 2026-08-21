"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export type Snack = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  delivery_fee: number;
  is_open: boolean;
};

/** Sans accents et en minuscules, pour que « Karama » trouve « Kârama ». */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function Annuaire({ snacks }: { snacks: Snack[] }) {
  const [recherche, setRecherche] = useState("");

  const resultats = useMemo(() => {
    const q = normaliser(recherche.trim());
    if (!q) return snacks;

    return snacks.filter((s) =>
      normaliser(`${s.name} ${s.description ?? ""} ${s.address ?? ""}`).includes(q),
    );
  }, [snacks, recherche]);

  return (
    <>
      <div className="mx-auto mb-8 max-w-md">
        <label className="sr-only" htmlFor="recherche">
          Rechercher un snack
        </label>
        <input
          id="recherche"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un snack, un quartier..."
          className="w-full rounded-xl border border-bord bg-white px-4 py-3 text-charbon outline-none transition placeholder:text-ardoise-clair focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        />
      </div>

      {resultats.length === 0 ? (
        <p className="py-12 text-center text-ardoise">
          {snacks.length === 0
            ? "Aucun snack n'est encore en ligne."
            : `Aucun snack ne correspond a « ${recherche} ».`}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resultats.map((snack) => (
            <li key={snack.id}>
              <Link
                href={`/${snack.slug}`}
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
                    {snack.address ? (
                      <span className="rounded-full bg-creme-fonce px-2 py-0.5 text-ardoise">
                        {snack.address}
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
