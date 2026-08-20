import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CommandeClient } from "./commande-client";

export const metadata: Metadata = { title: "Commander — Nwslo" };

export default async function CommandePage({
  params,
}: PageProps<"/[slug]/commande">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("shops")
    .select("id, name, slug, whatsapp_phone, delivery_fee, min_order, is_open")
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1);

  const boutique = data?.[0];
  if (!boutique) notFound();

  return (
    <CommandeClient
      shop={{
        id: boutique.id,
        name: boutique.name,
        slug: boutique.slug,
        whatsapp_phone: boutique.whatsapp_phone,
        delivery_fee: Number(boutique.delivery_fee),
        min_order: Number(boutique.min_order),
        is_open: boutique.is_open,
      }}
    />
  );
}
