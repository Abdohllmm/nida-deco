import type { ReactNode } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { Badge } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { PUBLICATION_LABELS } from "../../lib/format";
import type { PublicationStatus } from "../../lib/types";

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: PublicationStatus }) {
  return <Badge tone={status === "PUBLISHED" ? "success" : "neutral"}>{PUBLICATION_LABELS[status]}</Badge>;
}

/**
 * Reporte les erreurs du serveur sur les champs du formulaire quand elles en
 * désignent un ; renvoie sinon le message général à afficher.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, knownFields: readonly string[]): string | null {
  if (error instanceof ApiError) {
    const entries = Object.entries(error.fieldErrors);
    const known = entries.filter(([field]) => knownFields.includes(field));
    known.forEach(([field, message], index) => setError(field as Path<T>, { message }, { shouldFocus: index === 0 }));
    if (known.length > 0 && known.length === entries.length) {
      return "Certains champs sont à corriger.";
    }
    // Erreur sur un champ non affiché (image, galerie…) : on montre son message.
    const other = entries.find(([field]) => !knownFields.includes(field));
    if (other) return other[1];
  }
  return errorMessage(error);
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-2xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Checkbox({ id, label, hint, ...props }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-1 size-4 accent-[var(--color-gold-dark)]" {...props} />
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

/** Transforme une zone de texte « une valeur par ligne » en liste nettoyée. */
export function linesToList(text: string): string[] {
  return [...new Set(text.split("\n").map((line) => line.trim()).filter(Boolean))];
}
