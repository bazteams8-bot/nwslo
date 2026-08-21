"use client";

import { useActionState } from "react";
import { createShop, type ShopState } from "./actions";
import { ErrorBox, Field, SubmitButton } from "@/components/form";

const INITIAL: ShopState = { error: null };

export function ShopForm({ plan }: { plan: string }) {
  const [state, formAction] = useActionState(createShop, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="plan" value={plan} />
      <Field
        label="Nom du snack"
        name="name"
        placeholder="Snack Al Atlas"
        hint="Il apparaitra en haut de votre page de commande."
        required
      />
      <Field
        label="Numero WhatsApp"
        name="whatsapp"
        type="tel"
        placeholder="0612345678"
        hint="C'est la que vous recevrez les commandes."
        required
      />
      <Field
        label="Prix de la livraison (DH)"
        name="delivery_fee"
        type="number"
        min={0}
        step="0.5"
        defaultValue="0"
        hint="Mettez 0 si vous ne livrez pas."
      />
      <Field
        label="Adresse (optionnel)"
        name="address"
        placeholder="Rue Hassan II, Casablanca"
      />

      <ErrorBox message={state.error} />
      <SubmitButton>Creer mon snack</SubmitButton>
    </form>
  );
}
