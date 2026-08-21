"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { envoyerCouverture, envoyerLogo } from "@/lib/images";
import { ErrorBox, Field, NoticeBox } from "@/components/form";
import { saveShop } from "./actions";

type Boutique = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  whatsapp_phone: string;
  delivery_fee: number;
  min_order: number;
  is_open: boolean;
  logo_url: string | null;
  cover_url: string | null;
};

export function SettingsForm({ shop }: { shop: Boutique }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [avis, setAvis] = useState<string | null>(null);
  const [etape, setEtape] = useState<"repos" | "images" | "enregistrement">(
    "repos",
  );
  const [apercuLogo, setApercuLogo] = useState(shop.logo_url);
  const [apercuCouverture, setApercuCouverture] = useState(shop.cover_url);

  const logoRef = useRef<HTMLInputElement>(null);
  const couvertureRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const occupe = etape !== "repos";

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setAvis(null);

    const donnees = new FormData(e.currentTarget);
    const logo = logoRef.current?.files?.[0];
    const couverture = couvertureRef.current?.files?.[0];

    if (logo || couverture) {
      setEtape("images");
      try {
        if (logo) donnees.set("logo_url", await envoyerLogo(shop.id, logo));
        if (couverture) {
          donnees.set("cover_url", await envoyerCouverture(shop.id, couverture));
        }
      } catch {
        setEtape("repos");
        setErreur("L'envoi d'une image a echoue. Reessayez.");
        return;
      }
    }

    setEtape("enregistrement");
    startTransition(async () => {
      const resultat = await saveShop({ error: null, notice: null }, donnees);
      setEtape("repos");
      setErreur(resultat.error);
      setAvis(resultat.notice);
      if (resultat.notice) {
        // Les fichiers choisis sont deja envoyes ; les garder ferait
        // re-televerser les memes images au prochain enregistrement.
        if (logoRef.current) logoRef.current.value = "";
        if (couvertureRef.current) couvertureRef.current.value = "";
      }
    });
  }

  return (
    <form onSubmit={envoyer} className="space-y-6">
      <section className="rounded-2xl border border-bord bg-white p-5">
        <h2 className="mb-1 font-medium text-charbon">Identite</h2>
        <p className="mb-4 text-sm text-ardoise">
          Ce que vos clients voient en haut de votre page.
        </p>

        <div className="mb-4">
          <span className="mb-1.5 block text-sm font-medium text-charbon">
            Photo de couverture
          </span>
          <div className="relative mb-2 h-28 overflow-hidden rounded-xl bg-terracotta">
            {apercuCouverture ? (
              <Image
                src={apercuCouverture}
                alt=""
                fill
                unoptimized
                sizes="32rem"
                className="object-cover"
              />
            ) : null}
          </div>
          <input
            ref={couvertureRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) =>
              setApercuCouverture(
                e.target.files?.[0]
                  ? URL.createObjectURL(e.target.files[0])
                  : shop.cover_url,
              )
            }
            className="block w-full text-sm text-ardoise file:me-3 file:rounded-lg file:border-0 file:bg-creme-fonce file:px-3 file:py-2 file:text-sm file:font-medium file:text-charbon hover:file:bg-bord"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-charbon">
            Logo
          </span>
          <div className="mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-bord bg-creme-fonce">
            {apercuLogo ? (
              <Image
                src={apercuLogo}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-terracotta">
                {shop.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) =>
              setApercuLogo(
                e.target.files?.[0]
                  ? URL.createObjectURL(e.target.files[0])
                  : shop.logo_url,
              )
            }
            className="block w-full text-sm text-ardoise file:me-3 file:rounded-lg file:border-0 file:bg-creme-fonce file:px-3 file:py-2 file:text-sm file:font-medium file:text-charbon hover:file:bg-bord"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-bord bg-white p-5">
        <h2 className="font-medium text-charbon">Informations</h2>

        <Field
          label="Nom du snack"
          name="name"
          defaultValue={shop.name}
          maxLength={80}
          required
        />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charbon">
            Description (optionnel)
          </span>
          <textarea
            name="description"
            defaultValue={shop.description ?? ""}
            rows={2}
            placeholder="Tacos, sandwichs et jus frais"
            className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 text-charbon outline-none transition placeholder:text-ardoise-clair focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
          />
        </label>

        <Field
          label="Numero WhatsApp"
          name="whatsapp"
          type="tel"
          defaultValue={shop.whatsapp_phone}
          required
        />

        <Field
          label="Ville"
          name="city"
          defaultValue={shop.city ?? ""}
          placeholder="Casablanca"
          hint="Sert aux clients pour vous trouver sur la page d'accueil."
        />

        <Field
          label="Adresse (optionnel)"
          name="address"
          defaultValue={shop.address ?? ""}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-bord bg-white p-5">
        <h2 className="font-medium text-charbon">Commandes</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Livraison (DH)"
            name="delivery_fee"
            type="number"
            min={0}
            step="0.5"
            defaultValue={String(shop.delivery_fee)}
          />
          <Field
            label="Minimum de commande (DH)"
            name="min_order"
            type="number"
            min={0}
            step="0.5"
            defaultValue={String(shop.min_order)}
            hint="0 = pas de minimum."
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-bord p-3">
          <input
            type="checkbox"
            name="is_open"
            defaultChecked={shop.is_open}
            className="mt-0.5 size-4 accent-[var(--terracotta)]"
          />
          <span>
            <span className="block font-medium text-charbon">
              Accepter les commandes
            </span>
            <span className="block text-sm text-ardoise">
              Decochez pour fermer le snack. La carte reste visible, mais
              personne ne peut commander.
            </span>
          </span>
        </label>
      </section>

      <ErrorBox message={erreur} />
      <NoticeBox message={avis} />

      <button
        type="submit"
        disabled={occupe}
        className="w-full rounded-lg bg-terracotta px-4 py-3 font-medium text-white transition hover:bg-terracotta-fonce disabled:cursor-not-allowed disabled:opacity-60"
      >
        {etape === "images"
          ? "Envoi des images..."
          : etape === "enregistrement"
            ? "Enregistrement..."
            : "Enregistrer"}
      </button>
    </form>
  );
}
