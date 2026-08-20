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

/** Sol, Si, Mi : un arpege majeur, qui sonne comme un carillon. */
const NOTES = [784, 988, 1319];

/** Une note : montee quasi instantanee, longue decroissance. */
function sonner(
  ctx: AudioContext,
  frequence: number,
  depart: number,
  duree: number,
  volume: number,
  forme: OscillatorType,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = forme;
  osc.frequency.value = frequence;

  // La rampe part et revient a 0.0001, jamais a 0 : une rampe
  // exponentielle ne peut pas atteindre zero. Passer par une valeur
  // nulle produirait un claquement.
  gain.gain.setValueAtTime(0.0001, depart);
  gain.gain.exponentialRampToValueAtTime(volume, depart + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, depart + duree);

  osc.connect(gain).connect(ctx.destination);
  osc.start(depart);
  osc.stop(depart + duree + 0.02);
}

function arpege(ctx: AudioContext, depart: number) {
  NOTES.forEach((frequence, index) => {
    const t = depart + index * 0.13;
    sonner(ctx, frequence, t, 0.5, 0.22, "triangle");
    // Une octave au-dessus, discrete : c'est cet harmonique qui donne
    // le timbre de cloche plutot que celui d'un bip d'appareil.
    sonner(ctx, frequence * 2, t, 0.32, 0.06, "sine");
  });
}

/**
 * Carillon de notification, synthetise a la volee.
 *
 * Les navigateurs refusent de jouer un son avant la moindre
 * interaction : l'AudioContext n'est cree qu'au clic du gerant sur
 * « Activer le son ».
 */
function useCarillon() {
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

    // Joue deux fois : dans le bruit d'un snack, une seule volee passe
    // facilement inapercue.
    arpege(ctx, ctx.currentTime);
    arpege(ctx, ctx.currentTime + 0.85);
  }, []);

  return { activer, jouer };
}

export function CommandesClient({
  shopId,
  commandes,
}: {
  shopId: string;
  commandes: Commande[];
}) {
  const router = useRouter();
  const { activer, jouer } = useCarillon();
  const [sonActif, setSonActif] = useState(false);
  // On garde le statut brut du canal : « connecte / pas connecte »
  // cachait la difference entre une connexion en cours et une erreur.
  const [etat, setEtat] = useState<string>("CONNECTING");
  const [ouverte, setOuverte] = useState<string | null>(
    commandes.find((c) => c.status === "new")?.id ?? null,
  );

  const sonActifRef = useRef(sonActif);
  sonActifRef.current = sonActif;

  useEffect(() => {
    const supabase = createClient();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let annule = false;

    (async () => {
      // Le socket Realtime doit porter le jeton de l'utilisateur.
      // Sans lui il se connecte en anonyme : RLS ne laisse alors passer
      // aucune commande, et l'abonnement reste muet tout en se
      // declarant « connecte ». C'est silencieux, donc trompeur.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (annule) return;

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      canal = supabase
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
            // On se contente de rafraichir : l'evenement ne porte ni
            // les lignes ni les options. Le bip est declenche plus bas,
            // en comparant les listes, pour sonner aussi quand c'est le
            // filet de securite qui a ramene la commande.
            router.refresh();
          },
        )
        .subscribe((statut) => setEtat(statut));
    })();

    return () => {
      annule = true;
      if (canal) supabase.removeChannel(canal);
    };
  }, [shopId, router, jouer]);

  // Filet de securite : si le temps reel ne s'etablit pas, on va
  // chercher les commandes nous-memes. Un snack ne peut pas rater une
  // commande parce qu'un websocket a echoue.
  useEffect(() => {
    if (etat === "SUBSCRIBED") return;
    const minuteur = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(minuteur);
  }, [etat, router]);

  // Le bip suit la liste affichee, pas l'evenement : il sonne donc
  // aussi bien pour le temps reel que pour le filet de securite, et
  // une seule fois si les deux arrivent ensemble.
  const dejaVues = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(commandes.map((c) => c.id));

    if (dejaVues.current === null) {
      dejaVues.current = ids; // premier affichage : rien de « nouveau »
      return;
    }

    const arrivees = commandes.filter((c) => !dejaVues.current!.has(c.id));
    dejaVues.current = ids;

    if (arrivees.length > 0) {
      if (sonActifRef.current) jouer();
      setOuverte(arrivees[0].id);
    }
  }, [commandes, jouer]);

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
                etat === "SUBSCRIBED"
                  ? "bg-emerald-500"
                  : etat === "CONNECTING"
                    ? "bg-slate-300"
                    : "bg-red-500"
              }`}
            />
            {etat === "SUBSCRIBED"
              ? "En direct"
              : etat === "CONNECTING"
                ? "Connexion..."
                : `Temps reel indisponible (${etat})`}
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
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
              🔔 Son actif
            </span>
            <button
              type="button"
              onClick={jouer}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Tester
            </button>
          </div>
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
