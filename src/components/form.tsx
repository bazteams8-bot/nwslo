"use client";

import { useFormStatus } from "react-dom";

export function Field({
  label,
  name,
  type = "text",
  hint,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-charbon">
        {label}
      </span>
      <input
        name={name}
        type={type}
        className="block w-full rounded-lg border border-bord bg-white px-3 py-2.5 text-charbon outline-none transition placeholder:text-ardoise-clair focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        {...rest}
      />
      {hint ? <span className="mt-1.5 block text-xs text-ardoise-clair">{hint}</span> : null}
    </label>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

export function NoticeBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-lg border border-vert-doux bg-vert-doux px-3 py-2.5 text-sm text-vert-fonce"
    >
      {message}
    </p>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  // useFormStatus lit l'etat du <form> parent : pas besoin de gerer
  // nous-memes un booleen "chargement".
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-terracotta px-4 py-2.5 font-medium text-white transition hover:bg-terracotta-fonce focus-visible:ring-2 focus-visible:ring-terracotta/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Un instant..." : children}
    </button>
  );
}
