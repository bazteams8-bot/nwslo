"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
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
  logo_url: string | null;
  cover_url: string | null;
  delivery_fee: number;
  min_order: number;
  is_open: boolean;
  address: string | null;
};

const SANS_CATEGORIE = "Autres";
const TOUT = "Tout";

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
  const [filtre, setFiltre] = useState<string>(TOUT);

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

  // Le filtre reduit la carte a une seule categorie. Il porte un nom
  // et non un index : si le gerant reordonne ses categories pendant
  // qu'un client regarde, la selection suit le nom, pas la position.
  const affiches = groupes.filter((g) => filtre === TOUT || g.titre === filtre);

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
        .map((l) => (l.cle === cle ? { ...l, quantite: l.quantite + delta } : l))
        .filter((l) => l.quantite > 0),
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-creme pb-28">
      {/* --- Couverture et identite ------------------------------- */}
      <div className="relative h-32 w-full bg-terracotta sm:h-44">
        {shop.cover_url ? (
          <Image
            src={shop.cover_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
      </div>

      {/*
        `relative z-10` : la couverture est en `relative` pour porter
        l'image, ce qui la peint au-dessus de ce qui suit. Sans cela le
        logo, remonte par la marge negative, passe derriere elle.
      */}
      <header className="relative z-10 mx-auto -mt-7 w-full max-w-2xl px-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-creme bg-creme">
          {shop.logo_url ? (
            <Image
              src={shop.logo_url}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-semibold text-terracotta">
              {shop.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-semibold text-charbon">
          {shop.name}
        </h1>
        {shop.description ? (
          <p className="mt-1 text-ardoise">{shop.description}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 ${
              shop.is_open
                ? "bg-vert-doux text-vert-fonce"
                : "bg-creme-fonce text-ardoise"
            }`}
          >
            {shop.is_open ? "ouvert" : "ferme"}
          </span>
          <span className="rounded-full bg-creme-fonce px-2.5 py-1 text-ardoise">
            {shop.delivery_fee > 0
              ? `livraison ${formaterDh(shop.delivery_fee)}`
              : "livraison gratuite"}
          </span>
          {shop.address ? (
            <span className="rounded-full bg-creme-fonce px-2.5 py-1 text-ardoise">
              {shop.address}
            </span>
          ) : null}
        </div>

        {!shop.is_open ? (
          <p
            role="status"
            className="mt-3 rounded-xl border border-bord bg-creme-fonce px-3 py-2.5 text-sm text-ardoise"
          >
            Ce snack est ferme pour le moment. La carte reste consultable.
          </p>
        ) : null}
      </header>

      {/* --- Categories ------------------------------------------- */}
      {groupes.length > 1 ? (
        <nav className="sticky top-0 z-30 mt-4 border-b border-bord bg-creme/95 backdrop-blur">
          <div className="defilement-discret mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-3">
            {[TOUT, ...groupes.map((g) => g.titre)].map((titre) => {
              const actif = filtre === titre;
              return (
                <button
                  key={titre}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => setFiltre(titre)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
                    actif
                      ? "bg-charbon text-creme"
                      : "border border-bord text-ardoise hover:border-terracotta hover:text-terracotta"
                  }`}
                >
                  {titre}
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}

      {/* --- Carte ------------------------------------------------- */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {groupes.length === 0 ? (
          <p className="py-16 text-center text-ardoise">
            La carte de ce snack est encore vide.
          </p>
        ) : (
          <div className="space-y-8">
            {affiches.map((groupe) => (
              <section key={groupe.titre}>
                <h2 className="mb-3 text-lg font-semibold text-charbon">
                  {groupe.titre}
                </h2>

                <ul className="grid gap-3 sm:grid-cols-2">
                  {groupe.produits.map((produit) => {
                    const commandable = produit.is_available && shop.is_open;

                    return (
                      <li key={produit.id}>
                        <button
                          type="button"
                          disabled={!commandable}
                          onClick={() => setOuvert(produit)}
                          className={`w-full overflow-hidden rounded-2xl border border-bord bg-white text-start transition ${
                            commandable
                              ? "hover:border-terracotta"
                              : "opacity-55"
                          }`}
                        >
                          <div className="relative h-36 w-full bg-creme-fonce">
                            {produit.image_url ? (
                              <Image
                                src={produit.image_url}
                                alt=""
                                fill
                                sizes="(min-width: 640px) 20rem, 100vw"
                                className="object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="p-3.5">
                            <p className="flex items-center gap-2 font-medium text-charbon">
                              {produit.name}
                              {!produit.is_available ? (
                                <span className="rounded-full bg-creme-fonce px-2 py-0.5 text-xs font-normal text-ardoise">
                                  epuise
                                </span>
                              ) : null}
                            </p>

                            {produit.description ? (
                              <p className="mt-1 line-clamp-2 text-sm text-ardoise">
                                {produit.description}
                              </p>
                            ) : null}

                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-lg font-medium text-charbon">
                                {formaterDh(produit.price)}
                              </span>
                              {commandable ? (
                                <span
                                  aria-hidden
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-terracotta text-lg leading-none text-white"
                                >
                                  +
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      {/*
        Chaque snack a sa propre identite sur cette page — logo, nom,
        couleurs des produits — et c'est voulu. Ce lien discret est le
        seul rappel que la commande passe par Nwslo : assez visible
        pour que le client retienne le nom d'une commande a l'autre,
        assez discret pour ne jamais concurrencer la marque du snack.
      */}
      <footer className="border-t border-bord px-4 py-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ardoise-clair transition hover:text-terracotta-fonce"
        >
          Propulse par <Logo taille={16} avecNom={false} /> Nwslo
        </Link>
      </footer>

      {/* --- Panier ------------------------------------------------ */}
      {articles > 0 && shop.is_open ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bord bg-creme p-3">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl bg-charbon p-2">
            <button
              type="button"
              onClick={() => setPanierVisible(true)}
              className="rounded-xl px-4 py-2.5 text-sm text-creme-fonce transition hover:bg-white/10"
            >
              {articles} article{articles > 1 ? "s" : ""}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${shop.slug}/commande`)}
              className="flex-1 rounded-xl bg-terracotta px-4 py-2.5 font-medium text-white transition hover:bg-terracotta-fonce"
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-charbon/40 sm:items-center"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-creme sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-bord px-5 py-3">
          <h2 className="font-semibold text-charbon">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="rounded-full px-2.5 py-1 text-ardoise transition hover:bg-creme-fonce"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {bas ? <div className="border-t border-bord p-4">{bas}</div> : null}
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

      if (groupe.max_select === 1) {
        return { ...actuelle, [groupe.id]: dejaLa[0] === itemId ? [] : [itemId] };
      }

      if (dejaLa.includes(itemId)) {
        return { ...actuelle, [groupe.id]: dejaLa.filter((i) => i !== itemId) };
      }
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

  const unitaire = produit.price + choix.reduce((t, c) => t + c.priceDelta, 0);

  return (
    <Modal
      titre={produit.name}
      onFermer={onFermer}
      bas={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-bord bg-white">
            <button
              type="button"
              onClick={() => setQuantite((q) => Math.max(1, q - 1))}
              aria-label="Diminuer"
              className="px-3 py-2.5 text-ardoise transition hover:text-charbon"
            >
              −
            </button>
            <span className="w-8 text-center font-medium text-charbon">
              {quantite}
            </span>
            <button
              type="button"
              onClick={() => setQuantite((q) => q + 1)}
              aria-label="Augmenter"
              className="px-3 py-2.5 text-ardoise transition hover:text-charbon"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={!complet}
            onClick={() => onAjouter(produit, choix, quantite)}
            className="flex-1 rounded-xl bg-terracotta px-4 py-3 font-medium text-white transition hover:bg-terracotta-fonce disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ajouter · {formaterDh(unitaire * quantite)}
          </button>
        </div>
      }
    >
      {produit.image_url ? (
        <div className="relative mb-4 h-44 overflow-hidden rounded-2xl bg-creme-fonce">
          <Image
            src={produit.image_url}
            alt=""
            fill
            sizes="28rem"
            className="object-cover"
          />
        </div>
      ) : null}

      {produit.description ? (
        <p className="mb-4 text-ardoise">{produit.description}</p>
      ) : null}

      <div className="space-y-5">
        {produit.option_groups.map((groupe) => {
          const choisis = selection[groupe.id] ?? [];
          const plein = choisis.length >= groupe.max_select;

          return (
            <fieldset key={groupe.id}>
              <legend className="mb-2 font-medium text-charbon">
                {groupe.name}
                <span className="ms-2 text-xs font-normal text-ardoise-clair">
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
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                        actif
                          ? "border-terracotta bg-terracotta-pale"
                          : "border-bord bg-white"
                      } ${bloque ? "opacity-50" : "cursor-pointer"}`}
                    >
                      <input
                        type={groupe.max_select === 1 ? "radio" : "checkbox"}
                        name={groupe.id}
                        checked={actif}
                        disabled={bloque}
                        onChange={() => basculer(groupe, item.id)}
                        className="size-4 accent-[var(--terracotta)]"
                      />
                      <span className="flex-1 text-charbon">{item.name}</span>
                      <span className="text-sm text-ardoise">
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
          <div className="flex justify-between text-ardoise">
            <dt>Sous-total</dt>
            <dd>{formaterDh(total)}</dd>
          </div>
          <div className="flex justify-between text-ardoise">
            <dt>Livraison</dt>
            <dd>{formaterDh(fraisLivraison)}</dd>
          </div>
          <div className="flex justify-between border-t border-bord pt-1 text-base font-semibold text-charbon">
            <dt>Total</dt>
            <dd>{formaterDh(total + fraisLivraison)}</dd>
          </div>
        </dl>
      }
    >
      {lignes.length === 0 ? (
        <p className="py-8 text-center text-ardoise">Votre panier est vide.</p>
      ) : (
        <ul className="divide-y divide-bord">
          {lignes.map((ligne) => (
            <li key={ligne.cle} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-charbon">{ligne.name}</p>
                  {ligne.choix.length > 0 ? (
                    <p className="text-sm text-ardoise">
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
              </div>

              <div className="mt-2 flex w-fit items-center gap-1 rounded-xl border border-bord bg-white">
                <button
                  type="button"
                  onClick={() => onChangerQuantite(ligne.cle, -1)}
                  aria-label={`Retirer un ${ligne.name}`}
                  className="px-3 py-1.5 text-ardoise transition hover:text-charbon"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium text-charbon">
                  {ligne.quantite}
                </span>
                <button
                  type="button"
                  onClick={() => onChangerQuantite(ligne.cle, 1)}
                  aria-label={`Ajouter un ${ligne.name}`}
                  className="px-3 py-1.5 text-ardoise transition hover:text-charbon"
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
