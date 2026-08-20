import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteProduct, toggleAvailability } from "./actions";

export const metadata: Metadata = { title: "Produits — Nwslo" };

const SANS_CATEGORIE = "Autres";

export default async function ProduitsPage() {
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const [{ data: produits }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, description, price, image_url, is_available, category_id")
      .eq("shop_id", shop.id)
      .order("position", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, position")
      .eq("shop_id", shop.id)
      .order("position", { ascending: true }),
  ]);

  const liste = produits ?? [];

  // Les produits sans categorie forment un groupe a part, place en
  // dernier — ils restent visibles au lieu de disparaitre.
  const groupes = [
    ...(categories ?? []).map((c) => ({
      titre: c.name,
      produits: liste.filter((p) => p.category_id === c.id),
    })),
    { titre: SANS_CATEGORIE, produits: liste.filter((p) => !p.category_id) },
  ].filter((g) => g.produits.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Produits</h1>
          <p className="mt-1 text-sm text-slate-500">
            {liste.length === 0
              ? "Votre carte est encore vide."
              : `${liste.length} produit${liste.length > 1 ? "s" : ""} sur votre carte.`}
          </p>
        </div>
        <Link
          href="/dashboard/produits/nouveau"
          className="rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700"
        >
          Ajouter un produit
        </Link>
      </div>

      {groupes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Ajoutez votre premier produit pour construire votre carte.
          </p>
        </div>
      ) : (
        groupes.map((groupe) => (
          <section
            key={groupe.titre}
            className="rounded-xl border border-slate-200 bg-white"
          >
            <h2 className="border-b border-slate-200 px-5 py-3 font-medium text-slate-900">
              {groupe.titre}
            </h2>
            <ul className="divide-y divide-slate-200">
              {groupe.produits.map((produit) => (
                <li
                  key={produit.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-3"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {produit.image_url ? (
                      <Image
                        src={produit.image_url}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {produit.name}
                      {!produit.is_available ? (
                        <span className="ms-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
                          epuise
                        </span>
                      ) : null}
                    </p>
                    {produit.description ? (
                      <p className="truncate text-sm text-slate-500">
                        {produit.description}
                      </p>
                    ) : null}
                  </div>

                  <span className="font-medium text-slate-900">
                    {Number(produit.price).toFixed(2)} DH
                  </span>

                  <div className="flex items-center gap-1">
                    <form action={toggleAvailability}>
                      <input type="hidden" name="id" value={produit.id} />
                      <input
                        type="hidden"
                        name="available"
                        value={String(produit.is_available)}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                      >
                        {produit.is_available ? "Marquer epuise" : "Remettre"}
                      </button>
                    </form>

                    <Link
                      href={`/dashboard/produits/${produit.id}`}
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                    >
                      Modifier
                    </Link>

                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={produit.id} />
                      <ConfirmButton
                        question={`Supprimer « ${produit.name} » ? Les commandes deja passees gardent leur trace.`}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-red-600 transition hover:border-red-200 hover:bg-red-50"
                      >
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
