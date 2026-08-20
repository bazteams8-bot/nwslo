import { formaterDh, type LignePanier } from "@/lib/cart";

/**
 * Met le numero au format attendu par wa.me : indicatif pays, sans
 * « + » ni espaces.
 *
 * Un numero marocain est saisi « 0708791519 » ; le zero initial est
 * une convention locale que l'international remplace par 212.
 */
export function numeroInternational(numero: string): string {
  const compact = numero.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact.slice(1);
  if (compact.startsWith("0")) return `212${compact.slice(1)}`;
  return compact;
}

export function messageCommande({
  numeroCommande,
  nomBoutique,
  lignes,
  sousTotal,
  fraisLivraison,
  total,
  client,
  telephone,
  adresse,
  livraison,
  note,
}: {
  numeroCommande: string;
  nomBoutique: string;
  lignes: LignePanier[];
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  client: string;
  telephone: string;
  adresse: string | null;
  livraison: boolean;
  note: string | null;
}): string {
  const articles = lignes.map((l) => {
    const options =
      l.choix.length > 0
        ? `\n   ${l.choix.map((c) => c.name).join(" · ")}`
        : "";
    return `• ${l.quantite}x ${l.name}${options}\n   ${formaterDh(
      (l.prixBase + l.choix.reduce((t, c) => t + c.priceDelta, 0)) * l.quantite,
    )}`;
  });

  const lignesMessage = [
    `Bonjour ${nomBoutique}, nouvelle commande *#${numeroCommande}*`,
    "",
    ...articles,
    "",
    `Sous-total : ${formaterDh(sousTotal)}`,
    livraison ? `Livraison : ${formaterDh(fraisLivraison)}` : "A emporter",
    `*Total : ${formaterDh(total)}*`,
    "",
    `Nom : ${client}`,
    `Tel : ${telephone}`,
  ];

  if (livraison && adresse) lignesMessage.push(`Adresse : ${adresse}`);
  if (note) lignesMessage.push(`Note : ${note}`);

  return lignesMessage.join("\n");
}

export function lienWhatsapp(numero: string, message: string): string {
  return `https://wa.me/${numeroInternational(numero)}?text=${encodeURIComponent(
    message,
  )}`;
}
