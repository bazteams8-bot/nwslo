"use client";

import { useActionState } from "react";
import { createShopForClient, type AdminState } from "./actions";
import { ErrorBox, Field, SubmitButton } from "@/components/form";

const INITIAL: AdminState = { error: null, identifiants: null };

export function NewShopForm() {
  const [state, formAction] = useActionState(createShopForClient, INITIAL);

  // Les identifiants ne s'affichent qu'ici, une seule fois : le mot de
  // passe n'est stocke nulle part en clair et ne peut pas etre relu.
  if (state.identifiants) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-vert-doux bg-vert-doux p-4">
          <p className="font-medium text-vert-fonce">Snack cree</p>
          <p className="mt-1 text-sm text-vert-fonce">
            Notez ces identifiants maintenant : le mot de passe ne
            reapparaitra pas.
          </p>
        </div>

        <dl className="space-y-2 rounded-xl border border-bord bg-white p-4 font-mono text-sm">
          <div>
            <dt className="text-xs text-ardoise-clair">E-mail</dt>
            <dd className="text-charbon">{state.identifiants.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-ardoise-clair">Mot de passe</dt>
            <dd className="text-charbon">{state.identifiants.motDePasse}</dd>
          </div>
          <div>
            <dt className="text-xs text-ardoise-clair">Page de commande</dt>
            <dd className="text-terracotta">{state.identifiants.lien}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-lg border border-bord px-4 py-2.5 font-medium text-charbon transition hover:bg-creme-fonce"
        >
          Creer un autre snack
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="E-mail du gerant"
        name="email"
        type="email"
        placeholder="gerant@exemple.com"
        hint="Servira a se connecter. Le compte est cree deja confirme."
        required
      />
      <Field label="Nom du snack" name="name" placeholder="Snack Al Amal" required />
      <Field
        label="Numero WhatsApp"
        name="whatsapp"
        type="tel"
        placeholder="0612345678"
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Livraison (DH)"
          name="delivery_fee"
          type="number"
          min={0}
          step="0.5"
          defaultValue="0"
        />
        <Field
          label="Abonnement jusqu'au"
          name="subscription_until"
          type="date"
        />
      </div>

      <ErrorBox message={state.error} />
      <SubmitButton>Creer le snack</SubmitButton>
    </form>
  );
}
