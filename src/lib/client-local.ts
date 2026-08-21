/**
 * Ce que le navigateur du client retient de lui.
 *
 * Rien de tout cela n'est relu depuis le serveur : taper le numero de
 * quelqu'un d'autre ne doit jamais afficher son nom et son adresse. Le
 * pre-remplissage vient donc de l'appareil, et de nulle part ailleurs.
 */

const CLE_PROFIL = "nwslo-client";
const CLE_APPAREIL = "nwslo-appareil";

export type ProfilClient = {
  nom: string;
  telephone: string;
  adresse: string;
};

export function lireProfil(): ProfilClient | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = window.localStorage.getItem(CLE_PROFIL);
    return brut ? (JSON.parse(brut) as ProfilClient) : null;
  } catch {
    return null;
  }
}

export function ecrireProfil(profil: ProfilClient): void {
  try {
    window.localStorage.setItem(CLE_PROFIL, JSON.stringify(profil));
  } catch {
    // Stockage refuse : le client retapera ses informations, sans plus.
  }
}

export function oublierProfil(): void {
  try {
    window.localStorage.removeItem(CLE_PROFIL);
  } catch {
    // Rien a faire de plus.
  }
}

/**
 * Identifiant d'appareil, cree une fois et conserve.
 *
 * Il ne prouve rien — un navigateur vide en produit un neuf. Il sert a
 * plafonner les commandes d'un meme appareil et a suivre un habitue
 * qui reviendrait sous un autre numero. C'est un ralentisseur, pas une
 * serrure.
 */
export function identifiantAppareil(): string {
  if (typeof window === "undefined") return "";

  try {
    const existant = window.localStorage.getItem(CLE_APPAREIL);
    if (existant) return existant;

    const nouveau = crypto.randomUUID();
    window.localStorage.setItem(CLE_APPAREIL, nouveau);
    return nouveau;
  } catch {
    return "";
  }
}
