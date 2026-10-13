import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "react-router";
import { AVAILABILITY_LABELS, formatPrice } from "../lib/format";
import type { Availability, ProductSummary, ProjectSummary, ServiceSummary } from "../lib/types";
import { MediaImage } from "./MediaImage";
import { Badge, DemoBadge } from "./ui";

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const tone = availability === "IN_STOCK" ? "success" : availability === "ON_ORDER" ? "warning" : "neutral";
  return <Badge tone={tone}>{AVAILABILITY_LABELS[availability]}</Badge>;
}

/** Carte service : grande photo, numéro discret, titre, description et lien fléché. */
export function ServiceCard({ service, index }: { service: ServiceSummary; index?: number }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_1px_3px_rgb(0_0_0/0.08)] transition-shadow duration-300 hover:shadow-[0_16px_40px_rgb(0_0_0/0.12)]" data-testid="service-card">
      <div className="relative overflow-hidden">
        <MediaImage media={service.mainImage} fallbackAlt={service.title} ratio="aspect-[4/3]" className="transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-ink/0 transition-colors duration-300 group-hover:bg-ink/20" aria-hidden="true" />
        {index !== undefined && (
          <span className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-md bg-ink font-display text-sm font-extrabold text-gold-light" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        {service.demo && <DemoBadge className="absolute top-4 right-4" />}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl leading-snug">
          {/* Le lien couvre toute la carte : une seule cible, large, au clavier comme au toucher. */}
          <Link to={`/services/${service.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-gold">
            {service.title}
          </Link>
        </h3>
        <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">{service.shortDescription}</p>
        <p className="mt-5 flex items-center gap-2 font-display text-sm font-bold text-ink" aria-hidden="true">
          <span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 group-hover:after:scale-x-100">
            Découvrir le service
          </span>
          <ArrowRight className="size-4 text-gold-dark transition-transform duration-300 group-hover:translate-x-1" />
        </p>
      </div>
    </article>
  );
}

/** Carte produit de catalogue : grande image, catégorie, nom, prix mis en avant, bouton plein. */
export function ProductCard({ product }: { product: ProductSummary }) {
  const hasPrice = product.price !== null && product.price > 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition-shadow duration-300 hover:shadow-[0_16px_40px_rgb(0_0_0/0.1)]" data-testid="product-card">
      <Link to={`/produits/${product.slug}`} className="relative block overflow-hidden" tabIndex={-1} aria-hidden="true">
        <MediaImage media={product.mainImage} fallbackAlt={product.name} ratio="aspect-[4/3]" className="transition-transform duration-700 group-hover:scale-105" />
        {product.demo && <DemoBadge className="absolute top-3 left-3" />}
        {product.availability === "OUT_OF_STOCK" && (
          <span className="absolute right-3 bottom-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-semibold text-white">Indisponible</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-display text-[11px] font-bold tracking-[0.14em] text-gold-dark uppercase">{product.category.name}</p>
        <h3 className="mt-1.5 text-lg leading-snug">{product.name}</h3>
        <div className="mt-3 flex flex-1 flex-wrap items-end justify-between gap-2">
          <p className={hasPrice ? "font-display text-xl font-extrabold" : "text-sm font-medium text-muted"} data-testid="product-price">
            {formatPrice(product.price)}
          </p>
          {/* Seule une disponibilité réellement définie comme « En stock » est mise en avant. */}
          {product.availability === "IN_STOCK" && <Badge tone="success">Disponible</Badge>}
          {product.availability === "ON_ORDER" && <span className="text-xs text-muted">Sur commande</span>}
        </div>
        <Link to={`/produits/${product.slug}`} className="btn-primary mt-5 w-full" aria-label={`Voir le produit ${product.name}`}>
          Voir le produit
        </Link>
      </div>
    </article>
  );
}

interface ProjectCardProps {
  project: ProjectSummary;
  /** Classes de proportion ; « h-full » pour remplir une cellule de grille. */
  ratio?: string;
  className?: string;
  large?: boolean;
}

/**
 * Carte réalisation : la photo occupe toute la carte, la catégorie et le titre
 * restent lisibles en permanence (pas seulement au survol, absent sur mobile) et
 * « Voir le projet » apparaît au survol ou au focus.
 */
export function ProjectCard({ project, ratio = "aspect-[4/3]", className = "", large = false }: ProjectCardProps) {
  return (
    <article className={`group relative overflow-hidden rounded-lg bg-ink ${className}`} data-testid="project-card">
      <Link to={`/realisations/${project.slug}`} className="block h-full focus-visible:outline-offset-[-4px]" aria-label={`Voir le projet ${project.title}`}>
        <MediaImage media={project.mainImage} fallbackAlt={project.title} ratio={ratio} className="transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent transition-opacity duration-300 group-hover:from-ink/95 group-hover:via-ink/50" aria-hidden="true" />
        {project.demo && <DemoBadge className="absolute top-4 left-4" />}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <span className="inline-block rounded-full bg-gold px-3 py-1 font-display text-[11px] font-bold tracking-wider text-ink uppercase">{project.category.name}</span>
          <h3 className={`mt-3 leading-snug text-white ${large ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}>{project.title}</h3>
          {project.location && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75">
              <MapPin className="size-3.5" aria-hidden="true" />
              {project.location}
            </p>
          )}
          <p
            className="mt-0 flex max-h-0 items-center gap-2 overflow-hidden font-display text-sm font-bold text-gold-light opacity-0 transition-all duration-300 group-focus-within:mt-4 group-focus-within:max-h-8 group-focus-within:opacity-100 group-hover:mt-4 group-hover:max-h-8 group-hover:opacity-100"
            aria-hidden="true"
          >
            Voir le projet <ArrowUpRight className="size-4" />
          </p>
        </div>
      </Link>
    </article>
  );
}
