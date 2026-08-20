import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  // Garde reelle : le proxy ne fait qu'une verification optimiste.
  const { user } = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-emerald-700"
          >
            Nwslo
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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
