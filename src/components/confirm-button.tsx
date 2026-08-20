"use client";

/**
 * Bouton de suppression qui demande confirmation avant d'envoyer le
 * formulaire. Sans cela, un clic mal place efface une categorie sans
 * aucun moyen de revenir en arriere.
 */
export function ConfirmButton({
  question,
  children,
  className,
}: {
  question: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(question)) e.preventDefault();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
