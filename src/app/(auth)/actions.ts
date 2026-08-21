"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * `notice` porte les messages de succes, `error` les echecs : une
 * inscription en attente de confirmation n'est pas une erreur et ne
 * doit pas s'afficher comme telle.
 */
export type AuthState = { error: string | null; notice: string | null };

const VIDE: AuthState = { error: null, notice: null };

/** Messages Supabase (en anglais) traduits pour l'utilisateur. */
function messageLisible(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "E-mail ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Un compte existe deja avec cet e-mail.";
  if (m.includes("password should be at least"))
    return "Le mot de passe est trop court.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Cette adresse e-mail n'est pas valide.";
  if (m.includes("email not confirmed"))
    return "Cet e-mail n'a pas encore ete confirme.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Trop de tentatives. Reessayez dans quelques minutes.";
  return "Une erreur est survenue. Reessayez.";
}

/** Refuse une destination pointant hors du site (redirection ouverte). */
function destinationSure(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ...VIDE, error: "Remplissez l'e-mail et le mot de passe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ...VIDE, error: messageLisible(error.message) };

  // `redirect` fonctionne en levant une exception : il doit rester
  // hors de tout try/catch, sinon la redirection serait avalee.
  redirect(destinationSure(formData.get("next")));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const plan = String(formData.get("plan") ?? "").trim();

  if (!email || !password) {
    return { ...VIDE, error: "Remplissez l'e-mail et le mot de passe." };
  }
  if (password.length < 8) {
    return {
      ...VIDE,
      error: "Le mot de passe doit faire au moins 8 caracteres.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { ...VIDE, error: messageLisible(error.message) };

  // Sans session, c'est que la confirmation par e-mail est activee
  // cote Supabase : le compte existe mais n'est pas encore utilisable.
  if (!data.session) {
    return {
      ...VIDE,
      notice: `Compte cree. Ouvrez le lien envoye a ${email} pour activer votre compte, puis connectez-vous.`,
    };
  }

  // La formule choisie sur la page d'accueil suit jusqu'a la creation
  // de la boutique, pour ne pas la redemander a l'ecran suivant.
  redirect(
    plan
      ? `/dashboard/nouveau-magasin?plan=${encodeURIComponent(plan)}`
      : "/dashboard",
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
