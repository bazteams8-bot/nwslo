import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-bord">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-terracotta-fonce">
            Nwslo
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-charbon hover:text-terracotta-fonce"
          >
            Connexion
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-charbon sm:text-5xl">
          Vos commandes, directement sur WhatsApp
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ardoise">
          Creez la page de commande de votre snack en quelques minutes. Vos
          clients choisissent, vous recevez la commande.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-terracotta px-5 py-3 font-medium text-white transition hover:bg-terracotta-fonce"
          >
            Creer mon snack
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-bord px-5 py-3 font-medium text-charbon transition hover:bg-creme-fonce"
          >
            J&apos;ai deja un compte
          </Link>
        </div>
      </main>

      <footer className="border-t border-bord py-6 text-center text-sm text-ardoise-clair">
        Nwslo — commandes en ligne pour les snacks au Maroc
      </footer>
    </div>
  );
}
