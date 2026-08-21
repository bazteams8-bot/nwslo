"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { selectShop } from "./selection";

/**
 * Bascule entre les snacks d'un meme gerant.
 *
 * N'apparait qu'a partir de deux : afficher une liste d'un seul element
 * laisserait croire qu'il en manque.
 */
export function SelecteurBoutique({
  shops,
  courante,
}: {
  shops: { id: string; name: string; slug: string }[];
  courante: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const chemin = usePathname();

  if (shops.length < 2) return null;

  // Deux succursales portent souvent le meme nom. Sans l'adresse, la
  // liste afficherait deux lignes identiques et le gerant ne saurait
  // pas laquelle il ouvre.
  const noms = new Map<string, number>();
  for (const s of shops) noms.set(s.name, (noms.get(s.name) ?? 0) + 1);

  return (
    <form ref={formRef} action={selectShop}>
      {/* On revient sur la page en cours : changer de snack depuis les
          commandes ne doit pas ramener a l'accueil. */}
      <input type="hidden" name="chemin" value={chemin} />

      <label className="sr-only" htmlFor="shop_id">
        Snack affiche
      </label>
      <select
        id="shop_id"
        name="shop_id"
        key={courante}
        defaultValue={courante}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-bord bg-white px-3 py-1.5 text-sm font-medium text-charbon outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
      >
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {(noms.get(s.name) ?? 0) > 1 ? `${s.name} — /${s.slug}` : s.name}
          </option>
        ))}
      </select>
    </form>
  );
}
