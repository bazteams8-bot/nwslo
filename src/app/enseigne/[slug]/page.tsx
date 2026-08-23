import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { formaterDh } from "@/lib/cart";

type Succursale = {
  branch_id: string;
  branch_label: string | null;
  branch_slug: string;
  address: string | null;
  city: string | null;
  delivery_fee: number;
  is_open: boolean;
};

type Enseigne = {
  business_name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  succursales: Succursale[];
};

// Les types de la base ne sont pas generes pour les fonctions RPC : on
// decrit ici ce que renvoie enseigne_publique(), en miroir de la
// migration 0012.
type Ligne = {
  business_id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  branch_id: string;
  branch_label: string | null;
  branch_slug: string;
  address: string | null;
  city: string | null;
  delivery_fee: number | string;
  is_open: boolean;
};

async function chargerEnseigne(slug: string): Promise<Enseigne | null> {
  const supabase = await createClient();

  // Une seule fonction publique renvoie l'identite de l'enseigne et la
  // liste de ses succursales actives : voir la migration 0012.
  const { data } = await supabase.rpc("enseigne_publique", { p_slug: slug });
  const lignes = (data ?? []) as Ligne[];
  if (lignes.length === 0) return null;

  const premiere = lignes[0];

  return {
    business_name: premiere.business_name,
    description: premiere.description,
    logo_url: premiere.logo_url,
    cover_url: premiere.cover_url,
    succursales: lignes.map((s) => ({
      branch_id: s.branch_id,
      branch_label: s.branch_label,
      branch_slug: s.branch_slug,
      address: s.address,
      city: s.city,
      delivery_fee: Number(s.delivery_fee),
      is_open: s.is_open,
    })),
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/enseigne/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const enseigne = await chargerEnseigne(slug);
  if (!enseigne) return { title: "Enseigne introuvable — Nwslo" };

  return {
    title: `${enseigne.business_name} — choisir une succursale`,
    description:
      enseigne.description ??
      `${enseigne.succursales.length} succursales sur Nwslo.`,
  };
}

export default async function EnseignePage({
  params,
}: PageProps<"/enseigne/[slug]">) {
  const { slug } = await params;
  const enseigne = await chargerEnseigne(slug);
  if (!enseigne) notFound();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-creme">
      <header className="border-b border-bord bg-creme">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="relative h-28 w-full bg-terracotta sm:h-40">
        {enseigne.cover_url ? (
          <Image
            src={enseigne.cover_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
      </div>

      <main className="relative z-10 mx-auto -mt-7 w-full max-w-2xl flex-1 px-4 pb-10">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-creme bg-creme">
          {enseigne.logo_url ? (
            <Image
              src={enseigne.logo_url}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-semibold text-terracotta">
              {enseigne.business_name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-semibold text-charbon">
          {enseigne.business_name}
        </h1>
        {enseigne.description ? (
          <p className="mt-1 text-ardoise">{enseigne.description}</p>
        ) : null}

        <p className="mt-6 text-sm font-medium text-ardoise">
          Choisissez votre succursale
        </p>

        <ul className="mt-3 space-y-3">
          {enseigne.succursales.map((s) => (
            <li key={s.branch_id}>
              <Link
                href={`/${s.branch_slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-bord bg-white p-4 transition hover:border-terracotta"
              >
                <div className="min-w-0">
                  <p className="font-medium text-charbon">
                    {s.branch_label ?? s.city ?? s.branch_slug}
                  </p>
                  {s.address ? (
                    <p className="mt-0.5 text-sm text-ardoise">{s.address}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        s.is_open
                          ? "bg-vert-doux text-vert-fonce"
                          : "bg-creme-fonce text-ardoise"
                      }`}
                    >
                      {s.is_open ? "ouvert" : "ferme"}
                    </span>
                    <span className="rounded-full bg-creme-fonce px-2 py-0.5 text-ardoise">
                      {s.delivery_fee > 0
                        ? `livraison ${formaterDh(s.delivery_fee)}`
                        : "livraison gratuite"}
                    </span>
                    {s.city ? (
                      <span className="rounded-full bg-creme-fonce px-2 py-0.5 text-ardoise">
                        {s.city}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span aria-hidden className="shrink-0 text-ardoise-clair">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
