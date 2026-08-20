"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "../actions";
import { ErrorBox, Field, SubmitButton } from "@/components/form";

const INITIAL: AuthState = { error: null, notice: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signIn, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

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
        autoComplete="current-password"
        required
      />

      <ErrorBox message={state.error} />
      <SubmitButton>Se connecter</SubmitButton>
    </form>
  );
}
