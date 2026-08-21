"use client";

import { useActionState, useState } from "react";
import { saveHours, type ReglagesState } from "./actions";
import { ErrorBox, NoticeBox, SubmitButton } from "@/components/form";

export type Creneau = { o: string; c: string } | null;

const INITIAL: ReglagesState = { error: null, notice: null };

// Affiches du lundi au dimanche, mais stockes a l'index que Postgres
// donne au jour (0 = dimanche), pour que la base lise le tableau sans
// conversion.
const JOURS = [
  { index: 1, nom: "Lundi" },
  { index: 2, nom: "Mardi" },
  { index: 3, nom: "Mercredi" },
  { index: 4, nom: "Jeudi" },
  { index: 5, nom: "Vendredi" },
  { index: 6, nom: "Samedi" },
  { index: 0, nom: "Dimanche" },
];

const HEURE =
  "rounded-lg border border-bord bg-white px-2 py-1.5 text-sm text-charbon outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 disabled:opacity-40";

export function HoursForm({ horaires }: { horaires: Creneau[] | null }) {
  const [state, formAction] = useActionState(saveHours, INITIAL);
  const [actifs, setActifs] = useState(horaires !== null);
  const [ouverts, setOuverts] = useState<boolean[]>(() =>
    JOURS.map(({ index }) => (horaires ? horaires[index] != null : true)),
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3 rounded-xl border border-bord p-3">
        <input
          type="checkbox"
          name="horaires_actifs"
          checked={actifs}
          onChange={(e) => setActifs(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--terracotta)]"
        />
        <span>
          <span className="block font-medium text-charbon">
            Ouvrir et fermer automatiquement
          </span>
          <span className="block text-sm text-ardoise">
            Sans horaires, seul le bouton « Accepter les commandes » decide.
          </span>
        </span>
      </label>

      {actifs ? (
        <div className="space-y-2">
          {JOURS.map(({ index, nom }, rang) => {
            const creneau = horaires?.[index] ?? null;
            const ouvert = ouverts[rang];

            return (
              <div
                key={index}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-bord px-3 py-2"
              >
                <label className="flex w-32 items-center gap-2 text-sm text-charbon">
                  <input
                    type="checkbox"
                    name={`jour_${index}_ouvert`}
                    checked={ouvert}
                    onChange={(e) =>
                      setOuverts((liste) =>
                        liste.map((v, i) => (i === rang ? e.target.checked : v)),
                      )
                    }
                    className="size-4 accent-[var(--terracotta)]"
                  />
                  {nom}
                </label>

                <input
                  type="time"
                  name={`jour_${index}_o`}
                  defaultValue={creneau?.o ?? "10:00"}
                  disabled={!ouvert}
                  className={HEURE}
                />
                <span className="text-sm text-ardoise-clair">a</span>
                <input
                  type="time"
                  name={`jour_${index}_c`}
                  defaultValue={creneau?.c ?? "23:00"}
                  disabled={!ouvert}
                  className={HEURE}
                />

                {!ouvert ? (
                  <span className="text-sm text-ardoise-clair">ferme</span>
                ) : null}
              </div>
            );
          })}

          <p className="text-sm text-ardoise">
            Une fermeture apres minuit est acceptee : 18:00 a 02:00 garde la
            boutique ouverte jusqu&apos;a 2 h du matin.
          </p>
        </div>
      ) : null}

      <ErrorBox message={state.error} />
      <NoticeBox message={state.notice} />
      <SubmitButton>Enregistrer les horaires</SubmitButton>
    </form>
  );
}
