import Link from "next/link";
import type { Metadata } from "next";
import { PLANS } from "@/lib/plans";

const TITRE = "Nwslo pour les snacks — vos commandes sans commission";
const DESCRIPTION =
  "Une page de commande a votre nom, un QR code sur le comptoir, et les commandes sur WhatsApp. Installation comprise.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: "/pro" },
  openGraph: {
    type: "website",
    locale: "fr_MA",
    siteName: "Nwslo",
    url: "/pro",
    title: TITRE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary", title: TITRE, description: DESCRIPTION },
};

const ETAPES = [
  {
    titre: "On monte votre carte",
    texte:
      "Vous nous envoyez vos plats et vos prix. On s'occupe des photos, des categories et des options.",
  },
  {
    titre: "Vous partagez votre lien",
    texte:
      "Un lien a votre nom, et un QR code a poser sur le comptoir. Vos clients commandent en deux minutes.",
  },
  {
    titre: "Les commandes arrivent",
    texte:
      "Sur WhatsApp et sur votre tableau de bord, avec une sonnerie. Vous preparez, le client vient chercher ou vous livrez.",
  },
];

const ATOUTS = [
  {
    titre: "Zero commission",
    texte:
      "Un abonnement fixe. Ce que le client paie, vous le gardez en entier.",
  },
  {
    titre: "Vos clients restent les votres",
    texte:
      "Leur nom et leur numero sont a vous, pas a une plateforme qui vous les reloue.",
  },
  {
    titre: "Rien a installer",
    texte:
      "Pas d'application a telecharger. Un lien s'ouvre sur n'importe quel telephone.",
  },
  {
    titre: "Vous fixez vos regles",
    texte:
      "Vos prix, vos frais de livraison, vos horaires. Vous fermez la boutique quand vous voulez.",
  },
  {
    titre: "Les photos vendent",
    texte:
      "Chaque plat avec sa photo, ses tailles et ses supplements. Le panier calcule tout seul.",
  },
  {
    titre: "Vous ne ratez rien",
    texte:
      "Chaque commande est enregistree, meme si le client ferme WhatsApp en cours de route.",
  },
];

const QUESTIONS = [
  {
    q: "Il me faut un site ou une application ?",
    r: "Non. Vous recevez une page prete, a votre nom, avec un QR code a imprimer. Vos clients l'ouvrent depuis WhatsApp ou en scannant le code.",
  },
  {
    q: "Et si je ne sais pas me servir d'un ordinateur ?",
    r: "On installe votre menu et vos photos pour vous. Ensuite, tout se gere depuis le telephone : marquer un plat epuise, fermer la boutique, voir les commandes.",
  },
  {
    q: "Comment je recois les commandes ?",
    r: "Le client remplit son nom, son telephone et son adresse, puis valide. La commande arrive sur votre tableau de bord avec une sonnerie, et un message WhatsApp pre-rempli s'ouvre chez lui.",
  },
  {
    q: "Je peux arreter quand je veux ?",
    r: "Oui. L'abonnement est mensuel, sans engagement : vous arretez a la fin du mois en cours, et votre page reste en ligne jusque-la.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-creme">
      <header className="sticky top-0 z-30 border-b border-bord bg-creme/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-terracotta-fonce"
          >
            Nwslo
          </Link>
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

      {/* --- Accroche ------------------------------------------------ */}
      <main className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <p className="mb-4 inline-block rounded-full bg-terracotta-pale px-4 py-1.5 text-sm font-medium text-terracotta-fonce">
          Installation comprise
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-charbon sm:text-5xl">
          Vos commandes en ligne,
          <br />
          sans donner 30 % a personne
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg text-ardoise">
          Une page de commande a votre nom, un QR code sur le comptoir, et les
          commandes qui arrivent sur WhatsApp. Vous gardez vos marges et vos
          clients.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#tarifs"
            className="rounded-lg bg-terracotta px-6 py-3.5 font-medium text-white transition hover:bg-terracotta-fonce"
          >
            Choisir ma formule
          </a>
          <a
            href="#comment"
            className="rounded-lg border border-bord bg-white px-6 py-3.5 font-medium text-charbon transition hover:bg-creme-fonce"
          >
            Comment ca marche
          </a>
        </div>
      </main>

      {/* --- Le calcul ------------------------------------------------ */}
      <section className="border-y border-bord bg-charbon py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-semibold text-creme">
            Ce que coute une commande a 60 DH
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-6">
              <p className="text-sm text-creme-fonce">
                Sur une plateforme de livraison
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                ~18 DH
              </p>
              <p className="mt-1 text-sm text-ardoise-clair">
                de commission, sur chaque commande
              </p>
            </div>

            <div className="rounded-2xl bg-terracotta p-6">
              <p className="text-sm text-white/80">Sur Nwslo</p>
              <p className="mt-2 text-3xl font-semibold text-white">0 DH</p>
              <p className="mt-1 text-sm text-white/80">
                un abonnement fixe, et c&apos;est tout
              </p>
            </div>
          </div>

          <p className="mt-6 text-creme-fonce">
            300 commandes dans le mois : <strong className="text-white">
            environ 5 400 DH</strong> de commission ailleurs, contre{" "}
            <strong className="text-white">299 DH</strong> ici.
          </p>
        </div>
      </section>

      {/* --- Comment ------------------------------------------------- */}
      <section id="comment" className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-semibold text-charbon">
            Trois etapes, et vous etes en ligne
          </h2>

          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {ETAPES.map((etape, i) => (
              <li
                key={etape.titre}
                className="rounded-2xl border border-bord bg-white p-6"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-charbon">
                  {etape.titre}
                </h3>
                <p className="mt-2 text-sm text-ardoise">{etape.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --- Atouts --------------------------------------------------- */}
      <section className="border-t border-bord bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-semibold text-charbon">
            Pourquoi les snacks y passent
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {ATOUTS.map((atout) => (
              <div key={atout.titre}>
                <h3 className="flex items-center gap-2 font-medium text-charbon">
                  <span aria-hidden className="text-terracotta">
                    ✓
                  </span>
                  {atout.titre}
                </h3>
                <p className="mt-1.5 text-sm text-ardoise">{atout.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Tarifs --------------------------------------------------- */}
      <section id="tarifs" className="border-t border-bord py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-semibold text-charbon">
            Un prix, pas de commission
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ardoise">
            Choisissez selon le nombre de commandes que vous recevez. On peut
            changer de formule a tout moment.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {Object.entries(PLANS).map(([cle, plan]) => {
              const enAvant = cle === "pro";

              return (
                <div
                  key={cle}
                  className={`flex flex-col rounded-2xl bg-white p-6 ${
                    enAvant
                      ? "border-2 border-terracotta"
                      : "border border-bord"
                  }`}
                >
                  <div className="min-h-7">
                    {enAvant ? (
                      <span className="inline-block rounded-full bg-terracotta-pale px-3 py-1 text-xs font-medium text-terracotta-fonce">
                        Le plus choisi
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-charbon">
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

                  <ul className="mt-5 flex-1 space-y-2 text-sm text-ardoise">
                    {[
                      "Page de commande a votre nom",
                      "Menu avec photos et options",
                      "Commandes sur WhatsApp",
                      "QR code a imprimer",
                      "Installation comprise",
                    ].map((ligne) => (
                      <li key={ligne} className="flex gap-2">
                        <span aria-hidden className="text-terracotta">
                          ✓
                        </span>
                        {ligne}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/signup?plan=${cle}`}
                    className={`mt-6 block rounded-lg px-4 py-3 text-center font-medium transition ${
                      enAvant
                        ? "bg-terracotta text-white hover:bg-terracotta-fonce"
                        : "border border-bord text-charbon hover:bg-creme-fonce"
                    }`}
                  >
                    Commencer avec {plan.nom}
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-sm text-ardoise">
            Sans engagement : vous changez de formule ou vous arretez quand
            vous voulez. 12 mois payes d&apos;avance : 2 mois offerts.
          </p>
        </div>
      </section>

      {/* --- Questions ------------------------------------------------ */}
      <section className="border-t border-bord bg-white py-16">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-center text-3xl font-semibold text-charbon">
            Questions frequentes
          </h2>

          <dl className="mt-10 space-y-6">
            {QUESTIONS.map((item) => (
              <div key={item.q} className="border-b border-bord pb-6">
                <dt className="font-medium text-charbon">{item.q}</dt>
                <dd className="mt-2 text-ardoise">{item.r}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* --- Dernier appel -------------------------------------------- */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-semibold text-charbon">
            Votre snack en ligne cette semaine
          </h2>
          <p className="mt-3 text-ardoise">
            On monte votre carte et vos photos. Vous n&apos;avez qu&apos;a
            partager votre lien.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-block rounded-lg bg-terracotta px-6 py-3.5 font-medium text-white transition hover:bg-terracotta-fonce"
          >
            Creer ma page de commande
          </Link>
        </div>
      </section>

      <footer className="border-t border-bord py-6 text-center text-sm text-ardoise-clair">
        Nwslo — commandes en ligne pour les snacks au Maroc
      </footer>
    </div>
  );
}
