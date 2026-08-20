import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion — Nwslo" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Accedez au tableau de bord de votre snack.
      </p>

      <LoginForm next={typeof next === "string" ? next : undefined} />

      <p className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link
          href="/signup"
          className="font-medium text-emerald-700 hover:underline"
        >
          Creer un compte
        </Link>
      </p>
    </>
  );
}
