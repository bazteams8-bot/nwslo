"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";
import { ErrorBox, Field, NoticeBox, SubmitButton } from "@/components/form";

const INITIAL: AuthState = { error: null, notice: null };

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, INITIAL);

  // Compte cree mais en attente de confirmation : le formulaire n'a
  // plus rien a faire ici, il ne ferait que pousser a le renvoyer.
  if (state.notice) {
    return (
      <div className="space-y-4">
        <NoticeBox message={state.notice} />
        <Link
          href="/login"
          className="block w-full rounded-lg bg-terracotta px-4 py-2.5 text-center font-medium text-white transition hover:bg-terracotta-fonce"
        >
          Aller a la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="vous@exemple.com"
        required
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="8 caracteres minimum."
        required
      />

      <ErrorBox message={state.error} />
      <SubmitButton>Creer mon compte</SubmitButton>
    </form>
  );
}
