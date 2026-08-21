"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Le lien de commande, en clair et en QR.
 *
 * Le QR est genere sur le serveur et arrive en data URL : rien a
 * charger, et l'image peut etre enregistree telle quelle pour aller a
 * l'impression.
 */
export function QrCard({
  lien,
  qr,
  nomFichier,
}: {
  lien: string;
  qr: string;
  nomFichier: string;
}) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers refuse (page non securisee, permission) : le
      // lien reste selectionnable a la main juste au-dessus.
    }
  }

  return (
    <div className="rounded-xl border border-bord bg-white p-5">
      <h2 className="font-medium text-charbon">Votre lien de commande</h2>
      <p className="mt-1 text-sm text-ardoise">
        Partagez le lien sur WhatsApp, ou imprimez le QR code et posez-le
        sur le comptoir.
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-5">
        <div className="rounded-xl border border-bord bg-white p-2">
          <Image
            src={qr}
            alt={`QR code vers ${lien}`}
            width={160}
            height={160}
            unoptimized
            className="h-40 w-40"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="break-all rounded-lg bg-creme-fonce px-3 py-2 font-mono text-sm text-charbon">
            {lien}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copier}
              className="rounded-lg border border-bord px-3 py-2 text-sm font-medium text-charbon transition hover:bg-creme-fonce"
            >
              {copie ? "Lien copie" : "Copier le lien"}
            </button>

            <a
              href={qr}
              download={nomFichier}
              className="rounded-lg border border-bord px-3 py-2 text-sm font-medium text-charbon transition hover:bg-creme-fonce"
            >
              Telecharger le QR
            </a>

            <a
              href={lien}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-bord px-3 py-2 text-sm font-medium text-terracotta transition hover:bg-terracotta-pale"
            >
              Ouvrir
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
