import { PLANS } from "@/lib/plans";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-bord">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-terracotta-fonce">
            Nwslo
          </span>
          <div className="flex items-center gap-5 text-sm font-medium">
            <a href="#tarifs" className="text-charbon hover:text-terracotta-fonce">
              Tarifs
            </a>
            <Link href="/login" className="text-charbon hover:text-terracotta-fonce">
              Connexion
            </Link>
          </div>
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

      <section id="tarifs" className="border-t border-bord bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-semibold text-charbon">
            Un prix, pas de commission
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ardoise">
            Les plateformes de livraison prennent 25 a 30 % sur chaque
            commande. Ici vous payez un abonnement, et vous gardez le reste.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {Object.entries(PLANS).map(([cle, plan]) => {
              const enAvant = cle === "pro";

              return (
                <div
                  key={cle}
                  className={`rounded-2xl border bg-creme p-6 ${
                    enAvant ? "border-2 border-terracotta" : "border-bord"
                  }`}
                >
                  {enAvant ? (
                    <span className="mb-3 inline-block rounded-full bg-terracotta-pale px-3 py-1 text-xs font-medium text-terracotta-fonce">
                      Le plus choisi
                    </span>
                  ) : null}

                  <h3 className="text-lg font-semibold text-charbon">
                    {plan.nom}
                  </h3>

                  <p className="mt-2">
                    <span className="text-3xl font-semibold text-charbon">
                      {plan.prix}
                    </span>
                    <span className="text-ardoise"> DH / mois</span>
                  </p>

                  <p className="mt-1 text-sm text-ardoise">
                    {plan.plafond
                      ? `jusqu'a ${plan.plafond} commandes par mois`
                      : "commandes illimitees"}
                  </p>

                  <ul className="mt-5 space-y-2 text-sm text-ardoise">
                    {[
                      "Page de commande a votre nom",
                      "Menu avec photos et options",
                      "Commandes sur WhatsApp",
                      "QR code a imprimer",
                      "Aucune commission",
                    ].map((ligne) => (
                      <li key={ligne} className="flex gap-2">
                        <span aria-hidden className="text-terracotta">
                          ✓
                        </span>
                        {ligne}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-bord bg-creme p-6 text-center">
            <p className="font-medium text-charbon">
              Le premier mois est gratuit
            </p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-ardoise">
              Essayez sans payer. Au bout d&apos;un mois, on regarde ensemble
              combien de commandes vous avez recues et on choisit la formule
              qui vous convient. Installation du menu et des photos comprise.
            </p>
            <p className="mt-3 text-sm text-ardoise">
              12 mois payes d&apos;avance : 2 mois offerts.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-block rounded-lg bg-terracotta px-5 py-3 font-medium text-white transition hover:bg-terracotta-fonce"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-bord py-6 text-center text-sm text-ardoise-clair">
        Nwslo — commandes en ligne pour les snacks au Maroc
      </footer>
    </div>
  );
}
