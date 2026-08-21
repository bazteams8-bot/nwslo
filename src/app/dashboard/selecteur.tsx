"use client";

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
  shops: { id: string; name: string }[];
  courante: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (shops.length < 2) return null;

  return (
    <form ref={formRef} action={selectShop}>
      <label className="sr-only" htmlFor="shop_id">
        Snack affiche
      </label>
      <select
        id="shop_id"
        name="shop_id"
        defaultValue={courante}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-bord bg-white px-3 py-1.5 text-sm font-medium text-charbon outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
      >
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </form>
  );
}
