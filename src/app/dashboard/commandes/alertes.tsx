"use client";

import { useEffect, useState } from "react";
import { enregistrerAppareil, oublierAppareil } from "./push-actions";

/**
 * La cle publique VAPID se transmet en binaire, pas en base64url.
 *
 * Le tampon est alloue explicitement : `subscribe` attend un
 * `BufferSource`, et un `Uint8Array` cree sans tampon nomme ne s'y
 * conforme pas au typage.
 */
function versBinaire(base64: string): ArrayBuffer {
  const complet = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const brut = atob(complet.replace(/-/g, "+").replace(/_/g, "/"));

  const tampon = new ArrayBuffer(brut.length);
  const vue = new Uint8Array(tampon);
  for (let i = 0; i < brut.length; i++) vue[i] = brut.charCodeAt(i);

  return tampon;
}

type Etat = "chargement" | "impossible" | "ios-a-installer" | "inactif" | "actif";

/**
 * Active les alertes qui survivent a la fermeture du navigateur.
 *
 * L'alerte sonore et la notification deja presentes sur cette page
 * sont dessinees par la page : elles meurent avec l'onglet. Celle-ci
 * passe par le service worker, que le systeme reveille meme telephone
 * verrouille.
 */
export function Alertes() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    // Sur iPhone, le push n'existe que pour une application ajoutee a
    // l'ecran d'accueil : dans un onglet Safari, `serviceWorker` est
    // la mais `PushManager` ne fait rien. Il faut donc le dire au
    // gerant plutot que de lui montrer un bouton sans effet.
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window);
    const installee = window.matchMedia("(display-mode: standalone)").matches;

    if (iOS && !installee) return setEtat("ios-a-installer");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return setEtat("impossible");
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((r) => r.pushManager.getSubscription())
      .then((sub) => setEtat(sub ? "actif" : "inactif"))
      .catch(() => setEtat("impossible"));
  }, []);

  async function activer() {
    setOccupe(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setEtat("impossible");

      const registration = await navigator.serviceWorker.ready;
      const abonnement = await registration.pushManager.subscribe({
        // Impose d'afficher une notification a chaque push. C'est ce
        // que nous faisons, et c'est la condition pour que les
        // navigateurs acceptent l'abonnement.
        userVisibleOnly: true,
        applicationServerKey: versBinaire(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      const { ok } = await enregistrerAppareil(
        JSON.parse(JSON.stringify(abonnement)),
      );

      // Un abonnement que le serveur n'a pas retenu ne sonnera jamais.
      // Mieux vaut le defaire que laisser croire qu'il veille.
      if (!ok) {
        await abonnement.unsubscribe();
        return setEtat("impossible");
      }

      setEtat("actif");
    } catch {
      setEtat("impossible");
    } finally {
      setOccupe(false);
    }
  }

  async function desactiver() {
    setOccupe(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const abonnement = await registration.pushManager.getSubscription();
      if (abonnement) {
        await oublierAppareil(abonnement.endpoint);
        await abonnement.unsubscribe();
      }
      setEtat("inactif");
    } finally {
      setOccupe(false);
    }
  }

  if (etat === "chargement") return null;

  if (etat === "ios-a-installer") {
    return (
      <Encadre ton="info">
        <span className="font-medium">
          Recevez vos commandes meme application fermee
        </span>{" "}
        — sur iPhone, touchez{" "}
        <span aria-hidden>⎋</span> Partager, puis « Sur l&apos;ecran
        d&apos;accueil ». Ouvrez Nwslo depuis cette icone et revenez ici
        pour activer les alertes.
      </Encadre>
    );
  }

  if (etat === "impossible") {
    return (
      <Encadre ton="alerte">
        <span className="font-medium">Alertes indisponibles</span> — ce
        navigateur les refuse ou la permission a ete bloquee. Gardez cette
        page ouverte pour ne pas manquer de commande.
      </Encadre>
    );
  }

  if (etat === "actif") {
    return (
      <Encadre ton="ok">
        <span className="font-medium">Alertes actives</span> — vous serez
        prevenu meme navigateur ferme.{" "}
        <button
          type="button"
          onClick={desactiver}
          disabled={occupe}
          className="underline underline-offset-2 disabled:opacity-50"
        >
          Desactiver
        </button>
      </Encadre>
    );
  }

  return (
    <Encadre ton="info">
      <span className="font-medium">
        Vous ne serez pas prevenu si vous fermez cette page
      </span>{" "}
      —{" "}
      <button
        type="button"
        onClick={activer}
        disabled={occupe}
        className="rounded-lg bg-terracotta px-3 py-1.5 font-medium text-white transition hover:bg-terracotta-fonce disabled:opacity-50"
      >
        {occupe ? "Activation..." : "Activer les alertes"}
      </button>
    </Encadre>
  );
}

function Encadre({
  ton,
  children,
}: {
  ton: "ok" | "info" | "alerte";
  children: React.ReactNode;
}) {
  const couleurs = {
    ok: "border-vert-doux bg-vert-doux text-vert-fonce",
    info: "border-bord bg-white text-charbon",
    alerte: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;

  return (
    <p
      role="status"
      className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm ${couleurs[ton]}`}
    >
      {children}
    </p>
  );
}
