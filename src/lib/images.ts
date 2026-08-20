import { createClient } from "@/lib/supabase/client";

const BUCKET = "product-images";
const TAILLE_MAX = 900; // px sur le plus grand cote
const QUALITE = 0.82;

/**
 * Reduit et convertit une photo en WebP, dans le navigateur.
 *
 * Une photo prise au telephone pese 4 a 5 Mo. Telle quelle, elle ferait
 * attendre le client qui consulte le menu en 3G — et depasserait la
 * limite de 2 Mo du bucket. Apres passage ici : environ 80 Ko.
 */
export async function reduireEnWebp(fichier: File): Promise<File> {
  const bitmap = await createImageBitmap(fichier);

  const facteur = Math.min(
    1,
    TAILLE_MAX / Math.max(bitmap.width, bitmap.height),
  );
  const largeur = Math.round(bitmap.width * facteur);
  const hauteur = Math.round(bitmap.height * facteur);

  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resoudre) =>
    canvas.toBlob(resoudre, "image/webp", QUALITE),
  );
  if (!blob) throw new Error("Conversion impossible");

  return new File([blob], "photo.webp", { type: "image/webp" });
}

/**
 * Envoie la photo dans le dossier de la boutique et renvoie son URL
 * publique. Le dossier porte l'id du snack : c'est lui que la politique
 * de stockage verifie.
 */
export async function envoyerPhoto(
  shopId: string,
  fichier: File,
): Promise<string> {
  const supabase = createClient();
  const optimisee = await reduireEnWebp(fichier);

  const chemin = `${shopId}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(chemin, optimisee, { contentType: "image/webp" });

  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
}

/** Retrouve le chemin de stockage a partir d'une URL publique. */
export function cheminDepuisUrl(url: string): string | null {
  const marqueur = `/${BUCKET}/`;
  const i = url.indexOf(marqueur);
  return i === -1 ? null : url.slice(i + marqueur.length);
}
