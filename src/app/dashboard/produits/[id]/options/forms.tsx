"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGroup, createItem, type OptionState } from "./actions";
import { ErrorBox, SubmitButton } from "@/components/form";

const INITIAL: OptionState = { error: null };

const CHAMP =
  "min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

/** Vide le formulaire apres un ajout reussi, pour enchainer les saisies. */
function useResetApresSucces(state: OptionState) {
  const formRef = useRef<HTMLFormElement>(null);
  const envoye = useRef(false);

  useEffect(() => {
    if (envoye.current && !state.error) formRef.current?.reset();
    envoye.current = false;
  }, [state]);

  return {
    formRef,
    marquer: () => {
      envoye.current = true;
    },
  };
}

export function AddGroupForm({ productId }: { productId: string }) {
  const [state, formAction] = useActionState(createGroup, INITIAL);
  const { formRef, marquer } = useResetApresSucces(state);

  return (
    <form
      ref={formRef}
      action={(d) => {
        marquer();
        formAction(d);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="product_id" value={productId} />

      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="Taille, Supplements..."
          maxLength={60}
          required
          className={`${CHAMP} flex-1`}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Choix max
          <input
            name="max_select"
            type="number"
            min={1}
            defaultValue={1}
            className={`${CHAMP} w-20`}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          name="is_required"
          type="checkbox"
          className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        Le client doit obligatoirement choisir
      </label>

      <ErrorBox message={state.error} />
      <SubmitButton>Ajouter le groupe</SubmitButton>
    </form>
  );
}

export function AddItemForm({
  productId,
  groupId,
}: {
  productId: string;
  groupId: string;
}) {
  const [state, formAction] = useActionState(createItem, INITIAL);
  const { formRef, marquer } = useResetApresSucces(state);

  return (
    <form
      ref={formRef}
      action={(d) => {
        marquer();
        formAction(d);
      }}
      className="space-y-2"
    >
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="group_id" value={groupId} />

      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="Grand, Fromage..."
          maxLength={60}
          required
          className={`${CHAMP} flex-1`}
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          +
          <input
            name="price_delta"
            type="number"
            step="0.5"
            defaultValue={0}
            className={`${CHAMP} w-24`}
          />
          DH
        </label>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Ajouter
        </button>
      </div>

      <ErrorBox message={state.error} />
    </form>
  );
}
