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

export function lienWhatsapp(numero: string, message: string): string {
  return `https://wa.me/${numeroInternational(numero)}?text=${encodeURIComponent(
    message,
  )}`;
}

/**
 * Message court pour joindre le snack apres coup.
 *
 * La commande lui est deja parvenue, en direct et avec une alerte :
 * recopier tout le detail n'apporterait rien, il suffit de dire de
 * laquelle on parle.
 */
export function messageContact(
  numeroCommande: string,
  client: string,
): string {
  return `Bonjour, c'est ${client}. Je vous ecris au sujet de ma commande #${numeroCommande}.`;
}
