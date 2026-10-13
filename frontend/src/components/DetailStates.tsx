import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { ApiError } from "../lib/api";
import NotFoundPage from "../pages/NotFoundPage";
import { ErrorState, Skeleton } from "./ui";

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-gold-dark">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-2" role="status" aria-label="Chargement en cours">
      <Skeleton className="aspect-[4/3]" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-12 w-1/2" />
      </div>
    </div>
  );
}

/** Contenu introuvable ou non publié → page 404 ; autre erreur → message avec « Réessayer ». */
export function DetailError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundPage />;
  }
  return (
    <div className="container-page py-16">
      <ErrorState error={error} onRetry={onRetry} />
    </div>
  );
}
