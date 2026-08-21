import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Annuaire, type Snack } from "./annuaire";

export const metadata: Metadata = {
  title: "Nwslo — commander dans les snacks pres de chez vous",
  description:
    "Parcourez les snacks en ligne, choisissez vos plats et commandez en quelques minutes.",
};

// Un snack qui vient d'ouvrir doit apparaitre tout de suite.
export const revalidate = 60;

export default async function Accueil() {
  const supabase = await createClient();

  // RLS ne laisse passer que les boutiques actives : une boutique
  // suspendue disparait de l'annuaire sans traitement particulier ici.
  const { data } = await supabase
    .from("shops")
    .select(
      "id, name, slug, description, logo_url, cover_url, address, delivery_fee, is_open",
    )
    .eq("is_active", true)
    .order("is_open", { ascending: false })
    .order("created_at", { ascending: false });

  const snacks: Snack[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    logo_url: s.logo_url,
    cover_url: s.cover_url,
    address: s.address,
    delivery_fee: Number(s.delivery_fee),
    is_open: s.is_open,
  }));

  return (
    <div className="flex min-h-full flex-1 flex-col bg-creme">
      {/*
        Aucun lien vers /pro : la page d'offre se partage de la main a
        la main avec les snacks demarches. Cette page-ci s'adresse aux
        clients, qui n'ont rien a y faire.
      */}
      <header className="border-b border-bord bg-creme">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-terracotta-fonce"
          >
            Nwslo
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-charbon sm:text-4xl">
            Commandez dans votre snack
          </h1>
          <p className="mt-2 text-ardoise">
            Choisissez, commandez, et le snack vous prepare tout.
          </p>
        </div>

        <Annuaire snacks={snacks} />
      </main>

      <footer className="border-t border-bord py-6 text-center text-sm text-ardoise-clair">
        Nwslo — commandes en ligne pour les snacks au Maroc
      </footer>
    </div>
  );
}
