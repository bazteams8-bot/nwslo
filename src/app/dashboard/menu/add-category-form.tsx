"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type MenuState } from "./actions";
import { ErrorBox, SubmitButton } from "@/components/form";

const INITIAL: MenuState = { error: null };

export function AddCategoryForm() {
  const [state, formAction] = useActionState(createCategory, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const enCours = useRef(false);

  // Vide le champ apres un ajout reussi, pour pouvoir enchainer.
  useEffect(() => {
    if (enCours.current && !state.error) formRef.current?.reset();
    enCours.current = false;
  }, [state]);

  return (
    <form
      ref={formRef}
      action={(data) => {
        enCours.current = true;
        formAction(data);
      }}
      className="space-y-3"
    >
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="Sandwichs, Boissons, Tacos..."
          maxLength={60}
          required
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
        <div className="shrink-0">
          <SubmitButton>Ajouter</SubmitButton>
        </div>
      </div>
      <ErrorBox message={state.error} />
    </form>
  );
}
