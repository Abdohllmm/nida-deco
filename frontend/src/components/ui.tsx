import { ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError, errorMessage } from "../lib/api";

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-sand ${className}`} aria-hidden="true" />;
}

/** Grille de cartes fantômes affichée pendant le chargement d'une liste. */
export function CardGridSkeleton({ count = 6, columns = "sm:grid-cols-2 lg:grid-cols-3" }: { count?: number; columns?: string }) {
  return (
    <div className={`grid gap-6 ${columns}`} role="status" aria-label="Chargement en cours">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card overflow-hidden">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-ivory px-6 py-14 text-center">
      <p className="font-display text-xl font-extrabold">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const network = error instanceof ApiError && error.isNetwork;
  return (
    <div role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <CircleAlert className="mx-auto size-7 text-danger" aria-hidden="true" />
      <p className="mt-3 font-medium">{network ? "Le serveur est injoignable" : "Le chargement a échoué"}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5">
          <RefreshCw className="size-4" aria-hidden="true" />
          Réessayer
        </button>
      )}
    </div>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-anthracite shadow-sm ring-1 ring-black/10 ${className}`}
      title="Contenu d'exemple, à remplacer par un contenu réel dans l'administration."
    >
      Démonstration
    </span>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "gold"; children: ReactNode }) {
  const tones = {
    neutral: "border-line bg-ivory text-muted",
    success: "border-emerald-700/20 bg-emerald-50 text-emerald-800",
    warning: "border-gold/40 bg-sand text-gold-dark",
    danger: "border-danger/30 bg-danger/5 text-danger",
    gold: "border-gold/60 bg-white text-gold-dark",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** Variante pour fond sombre. */
  light?: boolean;
  id?: string;
}

/** Titre de section : label doré, titre fort, texte d'introduction et action alignée à droite. */
export function SectionHeading({ eyebrow, title, children, action, light = false, id }: SectionHeadingProps) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 lg:mb-12">
      <div className="max-w-2xl">
        {eyebrow && <p className={`mb-4 ${light ? "eyebrow-light" : "eyebrow"}`}>{eyebrow}</p>}
        <h2 id={id} className={`text-3xl leading-tight sm:text-4xl ${light ? "text-white" : ""}`}>
          {title}
        </h2>
        {children && <p className={`mt-4 text-base leading-relaxed ${light ? "text-white/75" : "text-muted"}`}>{children}</p>}
      </div>
      {action}
    </div>
  );
}

interface PaginationProps {
  /** Page courante, à partir de 1. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
      <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">Précédent</span>
      </button>
      <p className="text-sm text-muted" aria-live="polite">
        Page <span className="font-medium text-ink">{page}</span> sur {totalPages}
      </p>
      <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <span className="max-sm:sr-only">Suivant</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Libellé, aide et message d'erreur d'un champ. L'erreur est reliée au champ par aria-describedby. */
export function Field({ label, htmlFor, error, hint, optional, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(facultatif)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Attributs d'accessibilité à poser sur le champ associé à un <Field>. */
export function fieldAria(id: string, error?: string, hint?: string) {
  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}
