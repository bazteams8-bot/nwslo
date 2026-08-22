/**
 * La marque : une bulle de message avec un menu dedans, et le nom a cote.
 *
 * Le signe represente le service, pas la nourriture : la commande arrive
 * chez le gerant comme un message, et les deux lignes evoquent un menu.
 * Ce choix reste lisible si Nwslo s'etend un jour a d'autres secteurs
 * que la restauration rapide — rien ici n'evoque un plat.
 *
 * Le signe est dessine en SVG plutot que charge comme image — il suit
 * la taille demandee sans jamais etre flou, et ne coute aucune requete.
 *
 * Le nom reste du texte : il herite de la police du site, donc le
 * logotype ne se desaccorde jamais du reste de la page.
 */
export function Logo({
  taille = 28,
  avecNom = true,
}: {
  taille?: number;
  avecNom?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        viewBox="0 0 48 48"
        width={taille}
        height={taille}
        aria-hidden
        className="shrink-0"
      >
        <rect width="48" height="48" rx="12" fill="var(--terracotta)" />
        <path
          d="M11 15a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22l-8 7v-7a3 3 0 0 1-3-3z"
          fill="var(--creme)"
        />
        <g
          stroke="var(--terracotta)"
          strokeWidth="2.6"
          strokeLinecap="round"
        >
          <path d="M17 18h14M17 24h9" />
        </g>
      </svg>

      {avecNom ? (
        <span className="text-xl font-extrabold tracking-tight text-charbon">
          Nws<span className="text-terracotta">lo</span>
        </span>
      ) : null}
    </span>
  );
}
