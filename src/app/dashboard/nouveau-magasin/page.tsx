import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { PLANS, type Plan } from "@/lib/plans";
import { ShopForm } from "./shop-form";

export const metadata: Metadata = { title: "Creer mon snack — Nwslo" };

export default async function NewShopPage({
  searchParams,
}: PageProps<"/dashboard/nouveau-magasin">) {
  const { shop } = await getMyShop();

  // Deja configure : rien a faire ici.
  if (shop) redirect("/dashboard");

  const { plan } = await searchParams;
  const choisie =
    typeof plan === "string" && plan in PLANS ? (plan as Plan) : "essentiel";

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-charbon">
        Configurons votre snack
      </h1>
      <p className="mt-1 mb-6 text-sm text-ardoise">
        Quelques informations et votre page de commande sera prete. Tout reste
        modifiable ensuite.
      </p>

      <p className="mb-6 rounded-lg border border-terracotta bg-terracotta-pale px-3 py-2.5 text-sm text-terracotta-fonce">
        Formule <strong>{PLANS[choisie].nom}</strong> — {PLANS[choisie].prix} DH
        par mois,{" "}
        {PLANS[choisie].plafond
          ? `jusqu'a ${PLANS[choisie].plafond} commandes`
          : "commandes illimitees"}
        .
      </p>

      <div className="rounded-2xl border border-bord bg-white p-6">
        <ShopForm plan={choisie} />
      </div>
    </div>
  );
}
