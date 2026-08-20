import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { ConfirmButton } from "@/components/confirm-button";
import { AddGroupForm, AddItemForm } from "./forms";
import { deleteGroup, deleteItem } from "./actions";

export const metadata: Metadata = { title: "Options — Nwslo" };

function resume(groupe: {
  is_required: boolean;
  max_select: number;
}): string {
  const obligation = groupe.is_required ? "obligatoire" : "facultatif";
  const combien =
    groupe.max_select === 1
      ? "1 choix"
      : `jusqu'a ${groupe.max_select} choix`;
  return `${obligation} · ${combien}`;
}

export default async function OptionsPage({
  params,
}: PageProps<"/dashboard/produits/[id]/options">) {
  const { id } = await params;
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const { data: produits } = await supabase
    .from("products")
    .select("id, name, price")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .limit(1);

  const produit = produits?.[0];
  if (!produit) notFound();

  const { data: groupes } = await supabase
    .from("option_groups")
    .select("id, name, is_required, max_select, position")
    .eq("product_id", produit.id)
    .order("position", { ascending: true });

  const ids = (groupes ?? []).map((g) => g.id);
  const { data: choix } = ids.length
    ? await supabase
        .from("option_items")
        .select("id, group_id, name, price_delta, position")
        .in("group_id", ids)
        .order("position", { ascending: true })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/produits"
          className="text-sm text-ardoise-clair hover:text-terracotta-fonce"
        >
          ← Produits
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-charbon">
          Options de « {produit.name} »
        </h1>
        <p className="mt-1 text-sm text-ardoise-clair">
          Prix de base {Number(produit.price).toFixed(2)} DH. Les
          supplements s&apos;y ajoutent.
        </p>
      </div>

      <section className="rounded-xl border border-bord bg-white p-5">
        <h2 className="mb-3 font-medium text-charbon">Nouveau groupe</h2>
        <p className="mb-3 text-sm text-ardoise-clair">
          Un groupe rassemble des choix du meme genre : une taille, des
          supplements, une sauce.
        </p>
        <AddGroupForm productId={produit.id} />
      </section>

      {(groupes ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-bord bg-white p-8 text-center">
          <p className="text-sm text-ardoise-clair">
            Ce produit n&apos;a aucune option. C&apos;est tres bien pour une
            canette ; ajoutez-en si le client doit choisir quelque chose.
          </p>
        </div>
      ) : (
        (groupes ?? []).map((groupe) => {
          const siens = (choix ?? []).filter((c) => c.group_id === groupe.id);

          return (
            <section
              key={groupe.id}
              className="rounded-xl border border-bord bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bord px-5 py-3">
                <div>
                  <h2 className="font-medium text-charbon">{groupe.name}</h2>
                  <p className="text-xs text-ardoise-clair">{resume(groupe)}</p>
                </div>
                <form action={deleteGroup}>
                  <input type="hidden" name="id" value={groupe.id} />
                  <input type="hidden" name="product_id" value={produit.id} />
                  <ConfirmButton
                    question={`Supprimer le groupe « ${groupe.name} » et ses ${siens.length} choix ?`}
                    className="rounded-lg border border-bord px-2.5 py-1.5 text-sm text-red-600 transition hover:border-red-200 hover:bg-red-50"
                  >
                    Supprimer le groupe
                  </ConfirmButton>
                </form>
              </div>

              {siens.length > 0 ? (
                <ul className="divide-y divide-bord">
                  {siens.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 px-5 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-charbon">
                        {c.name}
                      </span>
                      <span className="text-sm text-ardoise">
                        {Number(c.price_delta) === 0
                          ? "inclus"
                          : `+${Number(c.price_delta).toFixed(2)} DH`}
                      </span>
                      <form action={deleteItem}>
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="hidden"
                          name="product_id"
                          value={produit.id}
                        />
                        <button
                          type="submit"
                          aria-label={`Supprimer ${c.name}`}
                          className="rounded-lg border border-bord px-2 py-1 text-sm text-ardoise-clair transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="border-t border-bord px-5 py-3">
                <AddItemForm productId={produit.id} groupId={groupe.id} />
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
