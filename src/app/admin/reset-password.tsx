"use client";

import { useActionState } from "react";
import { resetClientPassword, type ResetState } from "./actions";

const INITIAL: ResetState = { error: null, motDePasse: null };

/**
 * Redonne un mot de passe au gerant. Le nouveau s'affiche une seule
 * fois, comme a la creation : il n'est stocke en clair nulle part.
 */
export function ResetPassword({ shopId }: { shopId: string }) {
  const [state, formAction] = useActionState(resetClientPassword, INITIAL);

  if (state.motDePasse) {
    return (
      <p className="rounded-lg border border-vert-doux bg-vert-doux px-3 py-2 text-sm text-vert-fonce">
        Nouveau mot de passe :{" "}
        <strong className="font-mono">{state.motDePasse}</strong> — notez-le,
        il ne reapparaitra pas.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={shopId} />
      <button
        type="submit"
        onClick={(e) => {
          if (
            !window.confirm(
              "Donner un nouveau mot de passe a ce gerant ? L'ancien cessera de fonctionner immediatement.",
            )
          ) {
            e.preventDefault();
          }
        }}
        className="rounded-lg border border-bord px-3 py-1.5 text-sm font-medium text-charbon transition hover:bg-creme-fonce"
      >
        Nouveau mot de passe
      </button>
      {state.error ? (
        <span className="text-sm text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
