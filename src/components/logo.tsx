/**
 * La marque : un repere de lieu dont le creux est un N, et le nom a cote.
 *
 * Le signe dit « un commerce pres de vous », et la lettre l'empeche
 * d'etre lu comme une enieme application de cartes. Il ne represente
 * aucun metier en particulier — il resterait juste si Nwslo servait un
 * jour autre chose que des snacks.
 *
 * Le signe est dessine en SVG plutot que charge comme image — il suit
 * la taille demandee sans jamais etre flou, et ne coute aucune requete.
 *
 * Le nom reste du texte : il herite de la police du site, donc le
 * logotype ne se desaccorde jamais du reste de la page.
 *
 * Toute retouche du dessin doit etre verifiee a 32 px : c'est la taille
 * de l'onglet, et le N loge dans la goutte y devient vite illisible.
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
          d="M24 3 C32 3 38.5 9.5 38.5 17.5 C38.5 27.5 24 45 24 45 C24 45 9.5 27.5 9.5 17.5 C9.5 9.5 16 3 24 3 Z"
          fill="var(--creme)"
        />
        <path
          d="M18.5 24 V11.5 L29.5 24 V11.5"
          fill="none"
          stroke="var(--terracotta)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {avecNom ? (
        <span className="text-xl font-extrabold tracking-tight text-charbon">
          Nws<span className="text-terracotta">lo</span>
        </span>
      ) : null}
    </span>
  );
}
