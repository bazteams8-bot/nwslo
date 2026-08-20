"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formaterDh } from "@/lib/cart";
import { updateStatus, type Statut } from "./actions";

export type Commande = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  delivery_type: "delivery" | "pickup";
  note: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: Statut;
  created_at: string;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    line_total: number;
    note: string | null;
    options: {
      id: string;
      group_name: string;
      option_name: string;
      price_delta: number;
    }[];
  }[];
};

const LIBELLE: Record<Statut, string> = {
  new: "Nouvelle",
  preparing: "En preparation",
  ready: "Prete",
  delivered: "Livree",
  cancelled: "Annulee",
};

const COULEUR: Record<Statut, string> = {
  new: "bg-emerald-100 text-emerald-800",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-sky-100 text-sky-800",
  delivered: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

/** L'etape suivante proposee en un clic, pour ne pas faire chercher. */
const SUIVANT: Partial<Record<Statut, Statut>> = {
  new: "preparing",
  preparing: "ready",
  ready: "delivered",
};

function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Bip de notification, synthetise a la volee.
 *
 * Les navigateurs refusent de jouer un son avant la moindre
 * interaction : l'AudioContext n'est cree qu'au clic du gerant sur
 * « Activer le son ».
 */
function useBip() {
  const contexte = useRef<AudioContext | null>(null);

  const activer = useCallback(async () => {
    if (!contexte.current) {
      contexte.current = new AudioContext();
    }
    await contexte.current.resume();
  }, []);

  const jouer = useCallback(() => {
    const ctx = contexte.current;
    if (!ctx) return;

    // Deux notes courtes : audible dans un snack, sans etre agressif.
    [0, 0.18].forEach((decalage, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = index === 0 ? 880 : 1174;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + decalage);
      gain.gain.exponentialRampToValueAtTime(
        0.25,
        ctx.currentTime + decalage + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + decalage + 0.16,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + decalage);
      osc.stop(ctx.currentTime + decalage + 0.18);
    });
  }, []);

  return { activer, jouer, pret: () => contexte.current !== null };
}

export function CommandesClient({
  shopId,
  commandes,
}: {
  shopId: string;
  commandes: Commande[];
}) {
  const router = useRouter();
  const { activer, jouer } = useBip();
  const [sonActif, setSonActif] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(
    commandes.find((c) => c.status === "new")?.id ?? null,
  );

  const sonActifRef = useRef(sonActif);
  sonActifRef.current = sonActif;

  useEffect(() => {
    const supabase = createClient();

    const canal = supabase
      .channel(`commandes-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          if (sonActifRef.current) jouer();
          // Le rendu serveur est refait : la nouvelle commande arrive
          // avec ses lignes et ses options, que l'evenement ne porte pas.
          router.refresh();
        },
      )
      .subscribe((statut) => setConnecte(statut === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(canal);
    };
  }, [shopId, router, jouer]);

  const nouvelles = commandes.filter((c) => c.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Commandes</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${
                connecte ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            {connecte ? "En direct" : "Connexion..."}
            {nouvelles > 0 ? ` · ${nouvelles} nouvelle${nouvelles > 1 ? "s" : ""}` : ""}
          </p>
        </div>

        {!sonActif ? (
          <button
            type="button"
            onClick={async () => {
              await activer();
              jouer();
              setSonActif(true);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            🔔 Activer le son
          </button>
        ) : (
          <span className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            🔔 Son actif
          </span>
        )}
      </div>

      {!sonActif ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          Activez le son pour etre prevenu des nouvelles commandes sans
          regarder l&apos;ecran. Le navigateur exige un clic avant de
          pouvoir jouer un son.
        </p>
      ) : null}

      {commandes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Aucune commande pour l&apos;instant. Cette page se mettra a jour
            toute seule.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {commandes.map((commande) => {
            const deplie = ouverte === commande.id;
            const suivant = SUIVANT[commande.status];

            return (
              <li
                key={commande.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOuverte(deplie ? null : commande.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-start transition hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-900">
                    #{commande.order_number}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${COULEUR[commande.status]}`}
                  >
                    {LIBELLE[commande.status]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {commande.customer_name} ·{" "}
                    {commande.delivery_type === "delivery"
                      ? "livraison"
                      : "a emporter"}
                  </span>
                  <span className="text-sm text-slate-500">
                    {heure(commande.created_at)}
                  </span>
                  <span className="font-medium text-slate-900">
                    {formaterDh(commande.total)}
                  </span>
                  <span aria-hidden className="text-slate-400">
                    {deplie ? "▲" : "▼"}
                  </span>
                </button>

                {deplie ? (
                  <div className="border-t border-slate-200 px-5 py-4">
                    <ul className="mb-4 space-y-2">
                      {commande.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">
                              {item.quantity}x {item.product_name}
                            </p>
                            {item.options.length > 0 ? (
                              <p className="text-sm text-slate-500">
                                {item.options
                                  .map((o) => o.option_name)
                                  .join(" · ")}
                              </p>
                            ) : null}
                            {item.note ? (
                              <p className="text-sm text-amber-700">
                                Note : {item.note}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-slate-900">
                            {formaterDh(item.line_total)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <dl className="mb-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <dt>Sous-total</dt>
                        <dd>{formaterDh(commande.subtotal)}</dd>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <dt>Livraison</dt>
                        <dd>{formaterDh(commande.delivery_fee)}</dd>
                      </div>
                      <div className="flex justify-between font-semibold text-slate-900">
                        <dt>Total</dt>
                        <dd>{formaterDh(commande.total)}</dd>
                      </div>
                    </dl>

                    <div className="mb-4 space-y-1 text-sm text-slate-600">
                      <p>
                        <a
                          href={`tel:${commande.customer_phone}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {commande.customer_phone}
                        </a>
                      </p>
                      {commande.customer_address ? (
                        <p>{commande.customer_address}</p>
                      ) : null}
                      {commande.note ? (
                        <p className="text-amber-700">
                          Note : {commande.note}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {suivant ? (
                        <form action={updateStatus}>
                          <input type="hidden" name="id" value={commande.id} />
                          <input type="hidden" name="status" value={suivant} />
                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                          >
                            Marquer « {LIBELLE[suivant]} »
                          </button>
                        </form>
                      ) : null}

                      {commande.status !== "cancelled" &&
                      commande.status !== "delivered" ? (
                        <form action={updateStatus}>
                          <input type="hidden" name="id" value={commande.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="cancelled"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-red-600 transition hover:border-red-200 hover:bg-red-50"
                          >
                            Annuler
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
