"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import {
  ecrirePanier,
  formaterDh,
  lirePanier,
  prixUnitaire,
  sousTotal,
  totalLigne,
  type LignePanier,
} from "@/lib/cart";
import { lienWhatsapp, messageContact } from "@/lib/whatsapp";
import {
  ecrireProfil,
  identifiantAppareil,
  lireProfil,
  type ProfilClient,
} from "@/lib/client-local";

type Boutique = {
  id: string;
  name: string;
  slug: string;
  whatsapp_phone: string;
  delivery_fee: number;
  min_order: number;
  is_open: boolean;
};

type Confirmation = { numero: string; total: number; lien: string };

/** Les erreurs de la fonction SQL sont des codes ; on les traduit ici. */
function messageLisible(code: string): string {
  switch (code) {
    case "SNACK_FERME":
      return "Ce snack vient de fermer. Reessayez plus tard.";
    case "PANIER_VIDE":
      return "Votre panier est vide.";
    case "PRODUIT_INDISPONIBLE":
      return "Un produit de votre panier n'est plus disponible.";
    case "OPTION_INVALIDE":
    case "OPTION_OBLIGATOIRE_MANQUANTE":
    case "TROP_D_OPTIONS":
      return "Les options d'un produit ont change. Revenez au menu et refaites votre choix.";
    case "COMMANDE_MINIMUM":
      return "Le montant minimum de commande n'est pas atteint.";
    case "TELEPHONE_INVALIDE":
      return "Numero de telephone invalide. Exemple : 0612345678.";
    case "NOM_INVALIDE":
      return "Indiquez votre nom.";
    case "ADRESSE_REQUISE":
      return "Indiquez une adresse de livraison.";
    case "QUANTITE_INVALIDE":
      return "Quantite invalide.";
    case "CLIENT_BLOQUE":
      return "Ce snack ne prend plus de commandes de ce numero. Contactez-le directement.";
    case "TROP_DE_COMMANDES_EN_COURS":
      return "Vous avez deja trois commandes en cours chez ce snack. Attendez qu'elles soient servies.";
    case "TROP_DE_COMMANDES":
      return "Trop de commandes depuis cet appareil. Reessayez dans une heure.";
    default:
      return "La commande n'a pas pu etre enregistree. Reessayez.";
  }
}

/**
 * Meme bandeau que sur la page menu, present sur tout l'achat : le
 * client ne doit jamais perdre de vue qu'il commande via Nwslo, du
 * premier clic jusqu'a la confirmation.
 */
function BarreNwslo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 bg-charbon px-4 py-2 text-xs text-creme-fonce transition hover:text-creme"
    >
      <Logo taille={16} avecNom={false} />
      Vous commandez sur Nwslo
    </Link>
  );
}

export function CommandeClient({ shop }: { shop: Boutique }) {
  const [lignes, setLignes] = useState<LignePanier[]>([]);
  const [pret, setPret] = useState(false);
  const [livraison, setLivraison] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirme, setConfirme] = useState<Confirmation | null>(null);
  const [profil, setProfil] = useState<ProfilClient | null>(null);

  useEffect(() => {
    setLignes(lirePanier(shop.id));
    setProfil(lireProfil());
    setPret(true);
  }, [shop.id]);

  const total = sousTotal(lignes);
  const frais = livraison ? shop.delivery_fee : 0;

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const donnees = new FormData(e.currentTarget);
    const nom = String(donnees.get("name") ?? "").trim();
    const telephone = String(donnees.get("phone") ?? "").replace(/[\s.-]/g, "");
    const adresse = String(donnees.get("address") ?? "").trim();
    const note = String(donnees.get("note") ?? "").trim();

    const supabase = createClient();

    // On n'envoie que le contenu du panier : aucun prix ne part d'ici,
    // la fonction SQL les relit tous dans la base.
    const { data, error } = await supabase.rpc("create_order", {
      p_shop_id: shop.id,
      p_customer_name: nom,
      p_customer_phone: telephone,
      p_customer_address: livraison ? adresse : null,
      p_delivery_type: livraison ? "delivery" : "pickup",
      p_note: note || null,
      p_items: lignes.map((l) => ({
        product_id: l.productId,
        quantity: l.quantite,
        option_item_ids: l.choix.map((c) => c.itemId),
      })),
      // Sert a plafonner les commandes d'un meme appareil. Un
      // navigateur vide en produit un neuf : c'est un ralentisseur,
      // pas une preuve d'identite.
      p_device_id: identifiantAppareil() || null,
    });

    if (error) {
      setEnvoi(false);
      setErreur(messageLisible(error.message));
      return;
    }

    const resultat = Array.isArray(data) ? data[0] : data;

    // Le snack a deja la commande, en direct et avec une alerte : le
    // message WhatsApp ne sert plus a la transmettre, seulement a lui
    // parler. D'ou un mot court plutot que tout le detail recopie.
    const message = messageContact(resultat.order_number, nom);

    // Le panier n'a plus lieu d'etre.
    ecrirePanier(shop.id, []);
    setLignes([]);

    // Retenu sur cet appareil seulement, pour que la prochaine commande
    // se resume a valider.
    ecrireProfil({ nom, telephone, adresse });

    setConfirme({
      numero: resultat.order_number,
      total: Number(resultat.order_total),
      lien: lienWhatsapp(shop.whatsapp_phone, message),
    });
  }

  if (confirme) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <BarreNwslo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 text-center">
        <p className="text-5xl">✅</p>
        <h1 className="mt-4 text-2xl font-bold text-charbon">
          Commande #{confirme.numero} confirmee
        </h1>

        {/* La commande est arrivee chez le snack : plus rien n'est
            demande au client. WhatsApp n'est la que s'il veut parler. */}
        <p className="mt-2 text-ardoise">
          {shop.name} l&apos;a recue et commence a preparer.
        </p>

        <div className="mt-6 rounded-2xl border border-bord bg-white p-5">
          <p className="text-sm text-ardoise">
            {livraison ? "A payer a la livraison" : "A payer sur place"}
          </p>
          <p className="mt-1 text-3xl font-bold text-charbon">
            {formaterDh(confirme.total)}
          </p>
        </div>

        <a
          href={confirme.lien}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 rounded-lg border border-bord bg-white px-5 py-3 font-medium text-charbon transition hover:bg-creme-fonce"
        >
          Contacter le snack sur WhatsApp
        </a>

        <Link
          href={`/${shop.slug}`}
          className="mt-4 text-sm text-ardoise-clair hover:text-terracotta-fonce"
        >
          Retour au menu
        </Link>
        </div>
      </div>
    );
  }

  // Le panier et le profil viennent du navigateur, donc apres le
  // premier rendu. On attend : `defaultValue` ne se relit pas, et un
  // formulaire affiche trop tot resterait vide.
  if (!pret) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <BarreNwslo />
        <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-12">
          <p className="text-ardoise">Un instant...</p>
        </div>
      </div>
    );
  }

  if (lignes.length === 0) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <BarreNwslo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-charbon">
            Votre panier est vide
          </h1>
          <Link
            href={`/${shop.slug}`}
            className="mt-4 rounded-lg bg-terracotta px-5 py-3 font-medium text-white transition hover:bg-terracotta-fonce"
          >
            Voir le menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <BarreNwslo />
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link
        href={`/${shop.slug}`}
        className="text-sm text-ardoise-clair hover:text-terracotta-fonce"
      >
        ← Menu
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-charbon">
        Votre commande
      </h1>

      <section className="mb-6 rounded-xl border border-bord bg-white p-4">
        <ul className="divide-y divide-bord">
          {lignes.map((ligne) => (
            <li key={ligne.cle} className="flex justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium text-charbon">
                  {ligne.quantite}x {ligne.name}
                </p>
                {ligne.choix.length > 0 ? (
                  <p className="text-sm text-ardoise-clair">
                    {ligne.choix.map((c) => c.name).join(" · ")}
                  </p>
                ) : null}
                <p className="text-sm text-ardoise-clair">
                  {formaterDh(prixUnitaire(ligne))} l&apos;unite
                </p>
              </div>
              <span className="shrink-0 font-medium text-charbon">
                {formaterDh(totalLigne(ligne))}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1 border-t border-bord pt-3 text-sm">
          <div className="flex justify-between text-ardoise">
            <dt>Sous-total</dt>
            <dd>{formaterDh(total)}</dd>
          </div>
          <div className="flex justify-between text-ardoise">
            <dt>{livraison ? "Livraison" : "A emporter"}</dt>
            <dd>{formaterDh(frais)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold text-charbon">
            <dt>Total</dt>
            <dd>{formaterDh(total + frais)}</dd>
          </div>
        </dl>
      </section>

      <form onSubmit={envoyer} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { valeur: true, libelle: "Livraison" },
            { valeur: false, libelle: "A emporter" },
          ].map((choix) => (
            <button
              key={choix.libelle}
              type="button"
              onClick={() => setLivraison(choix.valeur)}
              className={`rounded-lg border px-4 py-2.5 font-medium transition ${
                livraison === choix.valeur
                  ? "border-terracotta bg-terracotta-pale text-terracotta-fonce"
                  : "border-bord text-ardoise hover:bg-creme-fonce"
              }`}
            >
              {choix.libelle}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charbon">
            Votre nom
          </span>
          <input
            name="name"
            defaultValue={profil?.nom ?? ""}
            required
            minLength={2}
            maxLength={80}
            className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charbon">
            Telephone
          </span>
          <input
            name="phone"
            defaultValue={profil?.telephone ?? ""}
            type="tel"
            required
            placeholder="0612345678"
            className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
          />
        </label>

        {livraison ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-charbon">
              Adresse de livraison
            </span>
            <textarea
              name="address"
              defaultValue={profil?.adresse ?? ""}
              required
              rows={2}
              placeholder="Rue, quartier, etage..."
              className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charbon">
            Note pour le snack (optionnel)
          </span>
          <textarea
            name="note"
            rows={2}
            placeholder="Sans oignons, sonner au 2e..."
            className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
          />
        </label>

        {erreur ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {erreur}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={envoi || !shop.is_open}
          className="w-full rounded-lg bg-terracotta px-4 py-3.5 font-medium text-white transition hover:bg-terracotta-fonce disabled:cursor-not-allowed disabled:opacity-60"
        >
          {envoi
            ? "Enregistrement..."
            : `Commander · ${formaterDh(total + frais)}`}
        </button>

        <p className="text-center text-xs text-ardoise-clair">
          Votre commande sera enregistree, puis WhatsApp s&apos;ouvrira avec
          le message pret a envoyer.
        </p>
      </form>
      </div>
    </div>
  );
}
