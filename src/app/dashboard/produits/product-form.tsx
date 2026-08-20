"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { envoyerPhoto } from "@/lib/images";
import { ErrorBox, Field } from "@/components/form";
import { saveProduct } from "./actions";

type Categorie = { id: string; name: string };

type Produit = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
};

export function ProductForm({
  shopId,
  categories,
  produit,
}: {
  shopId: string;
  categories: Categorie[];
  produit?: Produit;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [etape, setEtape] = useState<"repos" | "photo" | "enregistrement">(
    "repos",
  );
  const [apercu, setApercu] = useState<string | null>(
    produit?.image_url ?? null,
  );
  const fichierRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const occupe = etape !== "repos";

  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    setApercu(fichier ? URL.createObjectURL(fichier) : produit?.image_url ?? null);
  }

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);

    const donnees = new FormData(e.currentTarget);
    const fichier = fichierRef.current?.files?.[0];

    // La photo part avant le formulaire : le produit n'est enregistre
    // qu'une fois l'URL connue, donc jamais avec une image a moitie
    // envoyee.
    if (fichier) {
      setEtape("photo");
      try {
        donnees.set("image_url", await envoyerPhoto(shopId, fichier));
      } catch {
        setEtape("repos");
        setErreur("L'envoi de la photo a echoue. Reessayez.");
        return;
      }
    }

    setEtape("enregistrement");
    startTransition(async () => {
      const resultat = await saveProduct(donnees);
      if (resultat?.error) {
        setEtape("repos");
        setErreur(resultat.error);
      }
    });
  }

  return (
    <form onSubmit={envoyer} className="space-y-4">
      {produit ? <input type="hidden" name="id" value={produit.id} /> : null}

      <Field
        label="Nom du produit"
        name="name"
        defaultValue={produit?.name}
        placeholder="Tacos poulet"
        maxLength={80}
        required
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charbon">
          Description (optionnel)
        </span>
        <textarea
          name="description"
          defaultValue={produit?.description ?? ""}
          rows={2}
          placeholder="Poulet marine, frites, sauce fromagere"
          className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 text-charbon outline-none transition placeholder:text-ardoise-clair focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        />
      </label>

      <Field
        label="Prix (DH)"
        name="price"
        type="number"
        min={0}
        step="0.5"
        defaultValue={produit ? String(produit.price) : ""}
        required
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charbon">
          Categorie
        </span>
        <select
          name="category_id"
          defaultValue={produit?.category_id ?? ""}
          className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 text-charbon outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        >
          <option value="">Sans categorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-charbon">
          Photo (optionnel)
        </span>

        {apercu ? (
          <div className="mb-2 overflow-hidden rounded-lg border border-bord">
            <Image
              src={apercu}
              alt=""
              width={320}
              height={200}
              unoptimized
              className="h-40 w-full object-cover"
            />
          </div>
        ) : null}

        {/*
          Volontairement sans `name` : le fichier est lu via la ref.
          Nomme, il entrerait dans le FormData envoye a l'action
          serveur — soit la photo d'origine de plusieurs Mo, alors
          qu'elle est deja partie vers le stockage en version reduite.
          Next.js plafonne le corps d'une action serveur a 1 Mo.
        */}
        <input
          ref={fichierRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={choisirPhoto}
          className="block w-full text-sm text-ardoise file:me-3 file:rounded-lg file:border-0 file:bg-creme-fonce file:px-3 file:py-2 file:text-sm file:font-medium file:text-charbon hover:file:bg-bord"
        />
        <span className="mt-1.5 block text-xs text-ardoise-clair">
          La photo est reduite automatiquement avant l&apos;envoi.
        </span>
      </div>

      <ErrorBox message={erreur} />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={occupe}
          className="flex-1 rounded-lg bg-terracotta px-4 py-2.5 font-medium text-white transition hover:bg-terracotta-fonce disabled:cursor-not-allowed disabled:opacity-60"
        >
          {etape === "photo"
            ? "Envoi de la photo..."
            : etape === "enregistrement"
              ? "Enregistrement..."
              : produit
                ? "Enregistrer"
                : "Ajouter le produit"}
        </button>
        <Link
          href="/dashboard/produits"
          className="rounded-lg border border-bord px-4 py-2.5 font-medium text-charbon transition hover:bg-creme-fonce"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
