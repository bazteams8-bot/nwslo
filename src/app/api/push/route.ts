import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envoie l'alerte au gerant quand une commande est enregistree.
 *
 * Appelee par la base elle-meme (declencheur `orders_push`, migration
 * 0014), pas par un navigateur. Le seul appelant legitime connait
 * `PUSH_SECRET`.
 *
 * Cette route ne repond jamais par une erreur a la base : pg_net
 * n'ecoute pas la reponse, et une commande deja enregistree ne doit
 * pas etre rejouee parce que l'alerte a echoue.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_SECRET;
  const cle = process.env.VAPID_PRIVATE_KEY;
  const clePublique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!secret || !cle || !clePublique) {
    console.error("push: configuration VAPID incomplete");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (request.headers.get("x-nwslo-secret") !== secret) {
    // Pas de detail : inutile d'apprendre a qui cherche ce qui manque.
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let orderId: string | undefined;
  try {
    orderId = (await request.json())?.order_id;
  } catch {
    orderId = undefined;
  }
  if (!orderId) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("commande_pour_alerte", {
    p_order_id: orderId,
  });

  const commande = Array.isArray(data) ? data[0] : data;
  if (error || !commande) {
    console.error("push: commande introuvable", orderId, error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const { data: appareils } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("shop_id", commande.shop_id);

  if (!appareils?.length) return NextResponse.json({ ok: true, envoyes: 0 });

  webpush.setVapidDetails("mailto:contact@nwslo.com", clePublique, cle);

  const articles = Number(commande.articles);
  const charge = JSON.stringify({
    titre: `Commande #${commande.order_number}`,
    corps: `${commande.customer} · ${articles} article${
      articles > 1 ? "s" : ""
    } · ${Number(commande.total).toFixed(2)} DH`,
    // Une commande = une alerte, meme si le declencheur repart deux
    // fois : la seconde remplace la premiere au lieu de s'empiler.
    tag: `commande-${orderId}`,
    url: "/dashboard/commandes",
  });

  const resultats = await Promise.allSettled(
    appareils.map((a) =>
      webpush.sendNotification(
        {
          endpoint: a.endpoint,
          keys: { p256dh: a.p256dh, auth: a.auth },
        },
        charge,
        // Le telephone etait peut-etre hors ligne. Une demi-heure plus
        // tard, la commande est faite ou perdue : l'alerte ne sert
        // plus a rien et vaut mieux qu'elle expire.
        { TTL: 1800, urgency: "high" },
      ),
    ),
  );

  // 404 / 410 : l'appareil a desinstalle ou reinitialise le
  // navigateur. L'adresse ne reviendra jamais, on la retire pour ne
  // pas la reessayer a chaque commande.
  const perimes = resultats.flatMap((r, i) =>
    r.status === "rejected" &&
    (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)
      ? [appareils[i].id]
      : [],
  );

  if (perimes.length) {
    await admin.from("push_subscriptions").delete().in("id", perimes);
  }

  const envoyes = resultats.filter((r) => r.status === "fulfilled").length;

  for (const r of resultats) {
    if (r.status === "rejected" && !perimes.length) {
      console.error("push: envoi refuse", r.reason?.statusCode, r.reason?.body);
    }
  }

  return NextResponse.json({ ok: true, envoyes, retires: perimes.length });
}
