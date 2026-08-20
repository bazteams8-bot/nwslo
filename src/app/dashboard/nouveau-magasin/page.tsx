import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { ShopForm } from "./shop-form";

export const metadata: Metadata = { title: "Creer mon snack — Nwslo" };

export default async function NewShopPage() {
  const { shop } = await getMyShop();

  // Deja configure : rien a faire ici.
  if (shop) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-charbon">
        Configurons votre snack
      </h1>
      <p className="mt-1 mb-6 text-sm text-ardoise-clair">
        Quelques informations et votre page de commande sera prete. Tout
        reste modifiable ensuite.
      </p>

      <div className="rounded-2xl border border-bord bg-white p-6">
        <ShopForm />
      </div>
    </div>
  );
}
