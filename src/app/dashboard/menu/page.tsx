import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { ConfirmButton } from "@/components/confirm-button";
import { AddCategoryForm } from "./add-category-form";
import { deleteCategory, moveCategory, renameCategory } from "./actions";

export const metadata: Metadata = { title: "Menu — Nwslo" };

const BOUTON_ICONE =
  "rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30";

export default async function MenuPage() {
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, position")
    .eq("shop_id", shop.id)
    .order("position", { ascending: true });

  const liste = categories ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Menu</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organisez votre carte en categories, puis ajoutez-y vos produits.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-medium text-slate-900">
          Nouvelle categorie
        </h2>
        <AddCategoryForm />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 font-medium text-slate-900">
          Vos categories{liste.length > 0 ? ` (${liste.length})` : ""}
        </h2>

        {liste.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Aucune categorie pour l&apos;instant. Commencez par en creer une
            ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {liste.map((categorie, index) => (
              <li
                key={categorie.id}
                className="flex flex-wrap items-center gap-2 px-5 py-3"
              >
                <form
                  action={renameCategory}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <input type="hidden" name="id" value={categorie.id} />
                  <input
                    name="name"
                    defaultValue={categorie.name}
                    maxLength={60}
                    required
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-slate-900 outline-none transition hover:border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Enregistrer
                  </button>
                </form>

                <div className="flex items-center gap-1">
                  <form action={moveCategory}>
                    <input type="hidden" name="id" value={categorie.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label={`Monter ${categorie.name}`}
                      className={BOUTON_ICONE}
                    >
                      ↑
                    </button>
                  </form>

                  <form action={moveCategory}>
                    <input type="hidden" name="id" value={categorie.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === liste.length - 1}
                      aria-label={`Descendre ${categorie.name}`}
                      className={BOUTON_ICONE}
                    >
                      ↓
                    </button>
                  </form>

                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={categorie.id} />
                    <ConfirmButton
                      question={`Supprimer la categorie « ${categorie.name} » ? Les produits qu'elle contient seront conserves, mais sans categorie.`}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-red-600 transition hover:border-red-200 hover:bg-red-50"
                    >
                      Supprimer
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
