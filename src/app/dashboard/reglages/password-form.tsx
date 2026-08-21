"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type ReglagesState } from "./actions";
import { ErrorBox, Field, NoticeBox, SubmitButton } from "@/components/form";

const INITIAL: ReglagesState = { error: null, notice: null };

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // Vider les champs apres un changement reussi : les laisser remplis
  // afficherait le nouveau mot de passe a qui passe derriere.
  useEffect(() => {
    if (state.notice) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field
        label="Mot de passe actuel"
        name="current_password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Field
        label="Nouveau mot de passe"
        name="new_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="8 caracteres minimum."
        required
      />
      <Field
        label="Confirmez le nouveau mot de passe"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />

      <ErrorBox message={state.error} />
      <NoticeBox message={state.notice} />
      <SubmitButton>Changer le mot de passe</SubmitButton>
    </form>
  );
}
