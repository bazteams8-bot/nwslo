import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  // Garde reelle : le proxy ne fait qu'une verification optimiste.
  const { user } = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-creme">
      <header className="border-b border-bord bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-lg font-bold tracking-tight text-terracotta-fonce"
            >
              Nwslo
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="font-medium text-ardoise transition hover:text-terracotta-fonce"
              >
                Accueil
              </Link>
              <Link
                href="/dashboard/commandes"
                className="font-medium text-ardoise transition hover:text-terracotta-fonce"
              >
                Commandes
              </Link>
              <Link
                href="/dashboard/produits"
                className="font-medium text-ardoise transition hover:text-terracotta-fonce"
              >
                Produits
              </Link>
              <Link
                href="/dashboard/menu"
                className="font-medium text-ardoise transition hover:text-terracotta-fonce"
              >
                Categories
              </Link>
              <Link
                href="/dashboard/carte"
                className="font-medium text-ardoise transition hover:text-terracotta-fonce"
              >
                Carte
              </Link>
              <Link
                href="/dashboard/statistiques"
                className="font-medium text-ardoise transition hover:text-terracotta-fonce"
              >
                Statistiques
              </Link>
              <Link
                href="/dashboard/reglages"
                className="font-medium text-ardoise transition hover:text-terracotta-fonce"
              >
                Reglages
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ardoise-clair sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-bord px-3 py-1.5 text-sm font-medium text-charbon transition hover:bg-creme-fonce"
              >
                Deconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
