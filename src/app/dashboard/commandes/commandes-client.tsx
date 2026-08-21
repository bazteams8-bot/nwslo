"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formaterDh } from "@/lib/cart";
import { toggleCustomerBlock, updateStatus, type Statut } from "./actions";

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
  client: {
    id: string;
    commandes: number;
    absences: number;
    bloque: boolean;
  } | null;
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
  no_show: "Non recuperee",
  cancelled: "Annulee",
};

const COULEUR: Record<Statut, string> = {
  new: "bg-terracotta-pale text-terracotta-fonce",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-sky-100 text-sky-800",
  delivered: "bg-creme-fonce text-ardoise",
  no_show: "bg-amber-100 text-amber-800",
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

/**
 * Notifications du systeme.
 *
 * Le carillon ne s'entend que si la page est ouverte. Une notification
 * arrive meme navigateur reduit, ce qui est l'etat normal d'un snack en
 * plein service.
 */
function useNotifications() {
  const autorise = useRef(false);

  const demander = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Doit partir d'un clic : les navigateurs refusent la demande
    // autrement, et la refusent definitivement si on insiste.
    const reponse = await Notification.requestPermission();
    autorise.current = reponse === "granted";
  }, []);

  const notifier = useCallback((titre: string, corps: string, cle: string) => {
    if (!autorise.current) return;

    try {
      // Le tag evite d'empiler deux notifications pour une meme
      // commande si la liste est rafraichie deux fois.
      const notif = new Notification(titre, { body: corps, tag: cle });
      notif.onclick = () => window.focus();
    } catch {
      // Permission revoquee entre-temps : le carillon reste.
    }
  }, []);

  return { demander, notifier };
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
  const { demander, notifier } = useNotifications();
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

      const premiere = arrivees[0];
      notifier(
        arrivees.length === 1
          ? `Commande #${premiere.order_number}`
          : `${arrivees.length} nouvelles commandes`,
        arrivees.length === 1
          ? `${premiere.customer_name} · ${formaterDh(premiere.total)}`
          : "Ouvrez le tableau de bord pour les voir.",
        premiere.id,
      );
    }
  }, [commandes, jouer, notifier]);

  // Le titre de l'onglet compte les commandes a traiter : visible dans
  // la barre d'onglets sans que la page soit au premier plan.
  useEffect(() => {
    const enAttente = commandes.filter((c) => c.status === "new").length;
    document.title = enAttente
      ? `(${enAttente}) Commandes — Nwslo`
      : "Commandes — Nwslo";
  }, [commandes]);

  const nouvelles = commandes.filter((c) => c.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-charbon">Commandes</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ardoise-clair">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${
                etat === "SUBSCRIBED"
                  ? "bg-terracotta"
                  : etat === "CONNECTING"
                    ? "bg-ardoise-clair"
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
              // Les deux dans le meme clic : le son et les
              // notifications exigent chacun un geste de l'utilisateur.
              await activer();
              await demander();
              jouer();
              setSonActif(true);
            }}
            className="rounded-lg border border-bord px-4 py-2.5 text-sm font-medium text-charbon transition hover:bg-creme-fonce"
          >
            🔔 Activer les alertes
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-terracotta-pale px-4 py-2.5 text-sm font-medium text-terracotta-fonce">
              🔔 Alertes actives
            </span>
            <button
              type="button"
              onClick={jouer}
              className="rounded-lg border border-bord px-3 py-2.5 text-sm text-ardoise transition hover:bg-creme-fonce"
            >
              Tester
            </button>
          </div>
        )}
      </div>

      {!sonActif ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          Activez les alertes pour etre prevenu sans regarder
          l&apos;ecran : une sonnerie, et une notification qui arrive
          meme si le navigateur est reduit. Le navigateur exige un clic
          pour les autoriser.
        </p>
      ) : null}

      {commandes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bord bg-white p-10 text-center">
          <p className="text-sm text-ardoise-clair">
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
                className="overflow-hidden rounded-xl border border-bord bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOuverte(deplie ? null : commande.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-start transition hover:bg-creme"
                >
                  <span className="font-semibold text-charbon">
                    #{commande.order_number}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${COULEUR[commande.status]}`}
                  >
                    {LIBELLE[commande.status]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ardoise">
                    {commande.customer_name} ·{" "}
                    {commande.delivery_type === "delivery"
                      ? "livraison"
                      : "a emporter"}
                  </span>
                  <span className="text-sm text-ardoise-clair">
                    {heure(commande.created_at)}
                  </span>
                  <span className="font-medium text-charbon">
                    {formaterDh(commande.total)}
                  </span>
                  <span aria-hidden className="text-ardoise-clair">
                    {deplie ? "▲" : "▼"}
                  </span>
                </button>

                {deplie ? (
                  <div className="border-t border-bord px-5 py-4">
                    <ul className="mb-4 space-y-2">
                      {commande.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-charbon">
                              {item.quantity}x {item.product_name}
                            </p>
                            {item.options.length > 0 ? (
                              <p className="text-sm text-ardoise-clair">
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
                          <span className="shrink-0 text-charbon">
                            {formaterDh(item.line_total)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <dl className="mb-4 space-y-1 border-t border-bord pt-3 text-sm">
                      <div className="flex justify-between text-ardoise">
                        <dt>Sous-total</dt>
                        <dd>{formaterDh(commande.subtotal)}</dd>
                      </div>
                      <div className="flex justify-between text-ardoise">
                        <dt>Livraison</dt>
                        <dd>{formaterDh(commande.delivery_fee)}</dd>
                      </div>
                      <div className="flex justify-between font-semibold text-charbon">
                        <dt>Total</dt>
                        <dd>{formaterDh(commande.total)}</dd>
                      </div>
                    </dl>

                    <div className="mb-4 space-y-1 text-sm text-ardoise">
                      <p>
                        <a
                          href={`tel:${commande.customer_phone}`}
                          className="font-medium text-terracotta-fonce hover:underline"
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

                      {commande.client ? (
                        <p
                          className={
                            commande.client.absences > 0
                              ? "text-red-700"
                              : "text-ardoise-clair"
                          }
                        >
                          {commande.client.commandes === 1
                            ? "Premiere commande"
                            : `${commande.client.commandes}e commande`}
                          {commande.client.absences > 0
                            ? ` · ${commande.client.absences} non recuperee${
                                commande.client.absences > 1 ? "s" : ""
                              }`
                            : ""}
                          {commande.client.bloque ? " · numero bloque" : ""}
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
                            className="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-fonce"
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
                            className="rounded-lg border border-bord px-4 py-2 text-sm text-red-600 transition hover:border-red-200 hover:bg-red-50"
                          >
                            Annuler
                          </button>
                        </form>
                      ) : null}

                      {commande.status !== "cancelled" &&
                      commande.status !== "no_show" ? (
                        <form action={updateStatus}>
                          <input type="hidden" name="id" value={commande.id} />
                          <input type="hidden" name="status" value="no_show" />
                          <button
                            type="submit"
                            className="rounded-lg border border-bord px-4 py-2 text-sm text-amber-800 transition hover:border-amber-200 hover:bg-amber-50"
                          >
                            Non recuperee
                          </button>
                        </form>
                      ) : null}

                      {commande.client ? (
                        <form action={toggleCustomerBlock}>
                          <input
                            type="hidden"
                            name="customer_id"
                            value={commande.client.id}
                          />
                          <input
                            type="hidden"
                            name="blocked"
                            value={String(commande.client.bloque)}
                          />
                          <button
                            type="submit"
                            onClick={(e) => {
                              if (
                                !commande.client!.bloque &&
                                !window.confirm(
                                  `Bloquer ${commande.customer_phone} ? Ce numero et cet appareil ne pourront plus commander chez vous.`,
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                            className={`rounded-lg border border-bord px-4 py-2 text-sm transition ${
                              commande.client.bloque
                                ? "text-vert-fonce hover:bg-vert-doux"
                                : "text-red-600 hover:border-red-200 hover:bg-red-50"
                            }`}
                          >
                            {commande.client.bloque
                              ? "Debloquer"
                              : "Bloquer ce numero"}
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
