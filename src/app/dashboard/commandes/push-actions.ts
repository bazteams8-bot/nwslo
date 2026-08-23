"use server";

import { getMyShop } from "@/lib/auth";

/** Ce que le navigateur nous donne pour joindre cet appareil. */
export type Abonnement = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Retient cet appareil comme destinataire des alertes de la boutique
 * en cours.
 *
 * Enregistre avec la session du gerant, jamais avec la cle de service :
 * c'est le RLS qui garantit qu'on ne peut pas s'abonner aux commandes
 * d'un snack qui ne nous appartient pas.
 *
 * `endpoint` est unique : un gerant qui reactive les alertes, ou qui
 * change de boutique sur le meme telephone, met a jour la ligne au
 * lieu d'en creer une seconde qui ferait sonner deux fois.
 */
export async function enregistrerAppareil(
  abonnement: Abonnement,
): Promise<{ ok: boolean }> {
  const { supabase, shop } = await getMyShop();
  if (!shop) return { ok: false };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      shop_id: shop.id,
      endpoint: abonnement.endpoint,
      p256dh: abonnement.keys.p256dh,
      auth: abonnement.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("push: enregistrement refuse", error);
    return { ok: false };
  }

  return { ok: true };
}

/** Cet appareil ne veut plus etre prevenu. */
export async function oublierAppareil(endpoint: string): Promise<void> {
  const { supabase } = await getMyShop();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
