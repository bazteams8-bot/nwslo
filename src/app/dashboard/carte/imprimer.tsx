"use client";

export function BoutonImprimer() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-terracotta px-4 py-2.5 font-medium text-white transition hover:bg-terracotta-fonce"
    >
      Imprimer
    </button>
  );
}
