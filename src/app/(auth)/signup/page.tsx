import Link from "next/link";
import type { Metadata } from "next";
import { PLANS, type Plan } from "@/lib/plans";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Creer un compte — Nwslo" };

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const { plan } = await searchParams;

  // La formule vient d'un lien : on ne garde que ce qu'on reconnait.
  const choisie =
    typeof plan === "string" && plan in PLANS ? (plan as Plan) : null;

  return (
    <>
      <h1 className="text-xl font-semibold text-charbon">Creer un compte</h1>
      <p className="mt-1 mb-6 text-sm text-ardoise">
        Pour les gerants de snack qui veulent recevoir leurs commandes.
      </p>

      {choisie ? (
        <p className="mb-6 rounded-lg border border-terracotta bg-terracotta-pale px-3 py-2.5 text-sm text-terracotta-fonce">
          Formule <strong>{PLANS[choisie].nom}</strong> —{" "}
          {PLANS[choisie].prix} DH par mois.{" "}
          <Link href="/#tarifs" className="underline">
            changer
          </Link>
        </p>
      ) : null}

      <SignupForm plan={choisie} />

      <p className="mt-6 text-center text-sm text-ardoise">
        Vous avez deja un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-terracotta-fonce hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </>
  );
}
