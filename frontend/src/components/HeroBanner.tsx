import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeroProps {
  /** Photo de fond. */
  image: string;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  /** Bandeau plus haut pour les pages de détail. */
  tall?: boolean;
}

/**
 * Bandeau d'en-tête des pages intérieures : photo pleine largeur sous un voile
 * sombre, fil d'Ariane, titre blanc. Le voile garantit la lisibilité du texte
 * quelle que soit la photo choisie.
 */
export function PageHero({ image, eyebrow, title, children, crumbs, actions, tall = false }: PageHeroProps) {
  return (
    <header className="relative isolate overflow-hidden bg-ink">
      <img src={image} alt="" fetchPriority="high" className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/45" aria-hidden="true" />
      <div className={`container-page ${tall ? "py-20 sm:py-28" : "py-14 sm:py-20"}`}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((crumb, index) => (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-gold-light">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-white">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="eyebrow-light mb-4">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl leading-[1.1] text-white sm:text-5xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{children}</div>}
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}
