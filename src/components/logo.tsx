/**
 * La marque : un bol fumant, et le nom a cote.
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
        <g
          stroke="var(--creme)"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M19 20c0-2.8 2.6-2.8 2.6-5.6S19 11.6 19 8.8" />
          <path d="M29 20c0-2.8 2.6-2.8 2.6-5.6S29 11.6 29 8.8" />
        </g>
        <path d="M9 25.5h30a15 15 0 0 1-30 0z" fill="var(--creme)" />
      </svg>

      {avecNom ? (
        <span className="text-lg font-bold tracking-tight text-terracotta-fonce">
          Nwslo
        </span>
      ) : null}
    </span>
  );
}
