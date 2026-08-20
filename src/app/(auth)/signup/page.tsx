import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Creer un compte — Nwslo" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Creer un compte</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Pour les gerants de snack qui veulent recevoir leurs commandes.
      </p>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-slate-600">
        Vous avez deja un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-700 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </>
  );
}
