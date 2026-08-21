import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { SettingsForm } from "./settings-form";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Reglages — Nwslo" };

export default async function ReglagesPage() {
  const { shop } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-charbon">Reglages</h1>
      <p className="mt-1 mb-6 text-sm text-ardoise">
        Votre page de commande :{" "}
        <Link
          href={`/${shop.slug}`}
          className="font-medium text-terracotta hover:underline"
        >
          /{shop.slug}
        </Link>
      </p>

      <SettingsForm
        shop={{
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          description: shop.description,
          address: shop.address,
          whatsapp_phone: shop.whatsapp_phone,
          delivery_fee: Number(shop.delivery_fee),
          min_order: Number(shop.min_order),
          is_open: shop.is_open,
          logo_url: shop.logo_url,
          cover_url: shop.cover_url,
        }}
      />

      <section className="mt-6 rounded-2xl border border-bord bg-white p-5">
        <h2 className="mb-1 font-medium text-charbon">Mot de passe</h2>
        <p className="mb-4 text-sm text-ardoise">
          Changez-le si quelqu&apos;un d&apos;autre a connu le mot de passe
          qui vous a ete remis.
        </p>
        <PasswordForm />
      </section>
    </div>
  );
}
