"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  cleLigne,
  ecrirePanier,
  formaterDh,
  lirePanier,
  nombreArticles,
  prixUnitaire,
  selectionValide,
  sousTotal,
  totalLigne,
  type ChoixPanier,
  type LignePanier,
  type OptionGroup,
  type Product,
} from "@/lib/cart";

type Boutique = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  delivery_fee: number;
  min_order: number;
  is_open: boolean;
  address: string | null;
};

const SANS_CATEGORIE = "Autres";

export function MenuClient({
  shop,
  categories,
  produits,
}: {
  shop: Boutique;
  categories: { id: string; name: string }[];
  produits: Product[];
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<LignePanier[]>([]);
  const [pret, setPret] = useState(false);
  const [ouvert, setOuvert] = useState<Product | null>(null);
  const [panierVisible, setPanierVisible] = useState(false);

  // Le panier est relu au montage : un client qui revient sur l'onglet
  // retrouve sa selection.
  useEffect(() => {
    setLignes(lirePanier(shop.id));
    setPret(true);
  }, [shop.id]);

  useEffect(() => {
    if (pret) ecrirePanier(shop.id, lignes);
  }, [pret, shop.id, lignes]);

  const groupes = useMemo(() => {
    const parCategorie = categories.map((c) => ({
      titre: c.name,
      produits: produits.filter((p) => p.category_id === c.id),
    }));
    return [
      ...parCategorie,
      { titre: SANS_CATEGORIE, produits: produits.filter((p) => !p.category_id) },
    ].filter((g) => g.produits.length > 0);
  }, [categories, produits]);

  const total = sousTotal(lignes);
  const articles = nombreArticles(lignes);

  function ajouter(produit: Product, choix: ChoixPanier[], quantite: number) {
    const cle = cleLigne(produit.id, choix);

    setLignes((actuelles) => {
      const existante = actuelles.find((l) => l.cle === cle);
      if (existante) {
        return actuelles.map((l) =>
          l.cle === cle ? { ...l, quantite: l.quantite + quantite } : l,
        );
      }
      return [
        ...actuelles,
        {
          cle,
          productId: produit.id,
          name: produit.name,
          prixBase: produit.price,
          choix,
          quantite,
        },
      ];
    });

    setOuvert(null);
  }

  function changerQuantite(cle: string, delta: number) {
    setLignes((actuelles) =>
      actuelles
        .map((l) =>
          l.cle === cle ? { ...l, quantite: l.quantite + delta } : l,
        )
        .filter((l) => l.quantite > 0),
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50 pb-24">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">{shop.name}</h1>
          {shop.description ? (
            <p className="mt-1 text-slate-600">{shop.description}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-500">
            {shop.delivery_fee > 0
              ? `Livraison ${formaterDh(shop.delivery_fee)}`
              : "Livraison gratuite"}
            {shop.address ? ` · ${shop.address}` : ""}
          </p>

          {!shop.is_open ? (
            <p
              role="status"
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              Ce snack est ferme pour le moment. Vous pouvez consulter la
              carte, mais pas commander.
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {groupes.length === 0 ? (
          <p className="py-16 text-center text-slate-500">
            La carte de ce snack est encore vide.
          </p>
        ) : (
          <div className="space-y-8">
            {groupes.map((groupe) => (
              <section key={groupe.titre}>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {groupe.titre}
                </h2>
                <ul className="space-y-3">
                  {groupe.produits.map((produit) => (
                    <li key={produit.id}>
                      <button
                        type="button"
                        disabled={!produit.is_available || !shop.is_open}
                        onClick={() => setOuvert(produit)}
                        className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-start transition enabled:hover:border-emerald-300 enabled:hover:shadow-sm disabled:opacity-55"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {produit.image_url ? (
                            <Image
                              src={produit.image_url}
                              alt=""
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">
                            {produit.name}
                            {!produit.is_available ? (
                              <span className="ms-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
                                epuise
                              </span>
                            ) : null}
                          </p>
                          {produit.description ? (
                            <p className="line-clamp-2 text-sm text-slate-500">
                              {produit.description}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-medium text-slate-900">
                          {formaterDh(produit.price)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      {articles > 0 && shop.is_open ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <button
              type="button"
              onClick={() => setPanierVisible(true)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Panier ({articles})
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${shop.slug}/commande`)}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700"
            >
              Commander · {formaterDh(total)}
            </button>
          </div>
        </div>
      ) : null}

      {ouvert ? (
        <ProduitModal
          produit={ouvert}
          onFermer={() => setOuvert(null)}
          onAjouter={ajouter}
        />
      ) : null}

      {panierVisible ? (
        <PanierModal
          lignes={lignes}
          fraisLivraison={shop.delivery_fee}
          onFermer={() => setPanierVisible(false)}
          onChangerQuantite={changerQuantite}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------

function Modal({
  titre,
  onFermer,
  children,
  bas,
}: {
  titre: string;
  onFermer: () => void;
  children: React.ReactNode;
  bas?: React.ReactNode;
}) {
  // Echap ferme la fenetre : sur mobile le bouton suffit, mais au
  // clavier c'est le reflexe attendu.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl bg-white sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-900">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {bas ? (
          <div className="border-t border-slate-200 p-4">{bas}</div>
        ) : null}
      </div>
    </div>
  );
}

function ProduitModal({
  produit,
  onFermer,
  onAjouter,
}: {
  produit: Product;
  onFermer: () => void;
  onAjouter: (p: Product, choix: ChoixPanier[], quantite: number) => void;
}) {
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [quantite, setQuantite] = useState(1);

  function basculer(groupe: OptionGroup, itemId: string) {
    setSelection((actuelle) => {
      const dejaLa = actuelle[groupe.id] ?? [];

      // Un seul choix possible : le nouveau remplace l'ancien, comme un
      // bouton radio.
      if (groupe.max_select === 1) {
        return { ...actuelle, [groupe.id]: dejaLa[0] === itemId ? [] : [itemId] };
      }

      if (dejaLa.includes(itemId)) {
        return {
          ...actuelle,
          [groupe.id]: dejaLa.filter((i) => i !== itemId),
        };
      }
      // Au-dela du maximum, on ignore le clic plutot que de remplacer
      // un choix que le client vient de faire.
      if (dejaLa.length >= groupe.max_select) return actuelle;

      return { ...actuelle, [groupe.id]: [...dejaLa, itemId] };
    });
  }

  const choix: ChoixPanier[] = produit.option_groups.flatMap((g) =>
    (selection[g.id] ?? []).flatMap((itemId) => {
      const item = g.option_items.find((i) => i.id === itemId);
      return item
        ? [
            {
              groupName: g.name,
              itemId: item.id,
              name: item.name,
              priceDelta: item.price_delta,
            },
          ]
        : [];
    }),
  );

  const complet = produit.option_groups.every((g) =>
    selectionValide(g, selection[g.id] ?? []),
  );

  const unitaire =
    produit.price + choix.reduce((t, c) => t + c.priceDelta, 0);

  return (
    <Modal
      titre={produit.name}
      onFermer={onFermer}
      bas={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setQuantite((q) => Math.max(1, q - 1))}
              aria-label="Diminuer"
              className="px-3 py-2 text-slate-600 transition hover:bg-slate-100"
            >
              −
            </button>
            <span className="w-8 text-center font-medium">{quantite}</span>
            <button
              type="button"
              onClick={() => setQuantite((q) => q + 1)}
              aria-label="Augmenter"
              className="px-3 py-2 text-slate-600 transition hover:bg-slate-100"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={!complet}
            onClick={() => onAjouter(produit, choix, quantite)}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ajouter · {formaterDh(unitaire * quantite)}
          </button>
        </div>
      }
    >
      {produit.image_url ? (
        <div className="mb-4 overflow-hidden rounded-xl">
          <Image
            src={produit.image_url}
            alt=""
            width={480}
            height={240}
            className="h-44 w-full object-cover"
          />
        </div>
      ) : null}

      {produit.description ? (
        <p className="mb-4 text-slate-600">{produit.description}</p>
      ) : null}

      <div className="space-y-5">
        {produit.option_groups.map((groupe) => {
          const choisis = selection[groupe.id] ?? [];
          const plein = choisis.length >= groupe.max_select;

          return (
            <fieldset key={groupe.id}>
              <legend className="mb-2 font-medium text-slate-900">
                {groupe.name}
                <span className="ms-2 text-xs font-normal text-slate-500">
                  {groupe.is_required ? "obligatoire" : "facultatif"}
                  {groupe.max_select > 1 ? ` · max ${groupe.max_select}` : ""}
                </span>
              </legend>

              <div className="space-y-1.5">
                {groupe.option_items.map((item) => {
                  const actif = choisis.includes(item.id);
                  const bloque = plein && !actif && groupe.max_select > 1;

                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                        actif
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200"
                      } ${bloque ? "opacity-50" : "cursor-pointer"}`}
                    >
                      <input
                        type={groupe.max_select === 1 ? "radio" : "checkbox"}
                        name={groupe.id}
                        checked={actif}
                        disabled={bloque}
                        onChange={() => basculer(groupe, item.id)}
                        className="size-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="flex-1 text-slate-900">{item.name}</span>
                      <span className="text-sm text-slate-600">
                        {item.price_delta === 0
                          ? "inclus"
                          : `+${formaterDh(item.price_delta)}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </Modal>
  );
}

function PanierModal({
  lignes,
  fraisLivraison,
  onFermer,
  onChangerQuantite,
}: {
  lignes: LignePanier[];
  fraisLivraison: number;
  onFermer: () => void;
  onChangerQuantite: (cle: string, delta: number) => void;
}) {
  const total = sousTotal(lignes);

  return (
    <Modal
      titre="Votre panier"
      onFermer={onFermer}
      bas={
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Sous-total</dt>
            <dd>{formaterDh(total)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Livraison</dt>
            <dd>{formaterDh(fraisLivraison)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900">
            <dt>Total</dt>
            <dd>{formaterDh(total + fraisLivraison)}</dd>
          </div>
        </dl>
      }
    >
      {lignes.length === 0 ? (
        <p className="py-8 text-center text-slate-500">Votre panier est vide.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {lignes.map((ligne) => (
            <li key={ligne.cle} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{ligne.name}</p>
                  {ligne.choix.length > 0 ? (
                    <p className="text-sm text-slate-500">
                      {ligne.choix.map((c) => c.name).join(" · ")}
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-500">
                    {formaterDh(prixUnitaire(ligne))} l&apos;unite
                  </p>
                </div>
                <span className="shrink-0 font-medium text-slate-900">
                  {formaterDh(totalLigne(ligne))}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-1 rounded-lg border border-slate-300 w-fit">
                <button
                  type="button"
                  onClick={() => onChangerQuantite(ligne.cle, -1)}
                  aria-label={`Retirer un ${ligne.name}`}
                  className="px-3 py-1.5 text-slate-600 transition hover:bg-slate-100"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium">
                  {ligne.quantite}
                </span>
                <button
                  type="button"
                  onClick={() => onChangerQuantite(ligne.cle, 1)}
                  aria-label={`Ajouter un ${ligne.name}`}
                  className="px-3 py-1.5 text-slate-600 transition hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
