import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { ProductCard } from "../components/cards";
import { PageHero } from "../components/HeroBanner";
import { CardGridSkeleton, EmptyState, ErrorState, Pagination } from "../components/ui";
import { api, toQuery } from "../lib/api";
import { AVAILABILITY_LABELS } from "../lib/format";
import { DEFAULT_FILTERS, hasActiveFilters, parseProductFilters, toSearchParams, withFilter, type ProductFilters } from "../lib/productFilters";
import { useProductCategories } from "../lib/queries";
import { useSeo } from "../lib/seo";
import type { Availability, Page, ProductSort, ProductSummary } from "../lib/types";

const PAGE_SIZE = 12;

export default function ProductsPage() {
  useSeo({ title: "Nos produits", description: "Découvrez le mobilier proposé à la vente par NIDAL DECO : bureaux, tables et rangements." });

  // L'URL est la source de vérité des filtres : un lien partagé restitue la même liste.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseProductFilters(searchParams);
  const categories = useProductCategories();

  const [search, setSearch] = useState(filters.q);
  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  const update = (change: Partial<ProductFilters>) => setSearchParams(toSearchParams(withFilter(filters, change)), { preventScrollReset: true });

  // La saisie est appliquée après une courte pause, ou immédiatement à la validation du formulaire.
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const timer = window.setTimeout(() => update({ q: search }), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const products = useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      api.get<Page<ProductSummary>>(
        "/api/public/products" +
          toQuery({ q: filters.q, category: filters.category, availability: filters.availability, sort: filters.sort, page: filters.page - 1, size: PAGE_SIZE }),
      ),
    placeholderData: keepPreviousData,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    update({ q: search });
  };

  const data = products.data;
  const active = hasActiveFilters(filters);
  const clear = () => setSearchParams(toSearchParams({ ...DEFAULT_FILTERS, sort: filters.sort }), { preventScrollReset: true });

  return (
    <>
      <PageHero image="/images/banner-produits.jpg" eyebrow="Catalogue" title="Nos produits" crumbs={[{ label: "Accueil", to: "/" }, { label: "Produits" }]}>
        Bureaux, tables et mobilier. Les prix sont indiqués en dirhams (MAD) lorsqu'ils sont renseignés ; la commande se fait par WhatsApp.
      </PageHero>

      <section className="section bg-ivory">
        <div className="container-page">
          <form onSubmit={onSubmit} role="search" aria-label="Filtrer les produits" className="mb-8 rounded-lg bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] sm:p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
              <div>
                <label htmlFor="filtre-recherche" className="sr-only">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id="filtre-recherche"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un produit ou une référence"
                    maxLength={100}
                    className="field-input min-h-12 pl-12"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filtre-disponibilite" className="sr-only">
                  Disponibilité
                </label>
                <select
                  id="filtre-disponibilite"
                  value={filters.availability}
                  onChange={(event) => update({ availability: event.target.value as Availability | "" })}
                  className="field-input min-h-12 md:w-52"
                >
                  <option value="">Toutes disponibilités</option>
                  {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((value) => (
                    <option key={value} value={value}>
                      {AVAILABILITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filtre-tri" className="sr-only">
                  Trier par
                </label>
                <select id="filtre-tri" value={filters.sort} onChange={(event) => update({ sort: event.target.value as ProductSort })} className="field-input min-h-12 md:w-48">
                  <option value="NEWEST">Nouveautés</option>
                  <option value="PRICE_ASC">Prix croissant</option>
                  <option value="PRICE_DESC">Prix décroissant</option>
                </select>
              </div>
            </div>

            {/* Catégories sous forme de puces, défilables horizontalement sur mobile. */}
            {categories.data && categories.data.length > 0 && (
              <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5" role="group" aria-label="Catégorie">
                <button type="button" className="chip" aria-pressed={filters.category === ""} onClick={() => update({ category: "" })}>
                  Toutes
                </button>
                {categories.data.map((category) => (
                  <button key={category.id} type="button" className="chip" aria-pressed={filters.category === category.slug} onClick={() => update({ category: category.slug })}>
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="mb-6 flex min-h-9 flex-wrap items-center justify-between gap-3">
            <p className="font-display text-sm font-bold" aria-live="polite" data-testid="result-count">
              {data ? `${data.totalItems} produit${data.totalItems > 1 ? "s" : ""}` : " "}
            </p>
            {active && (
              <button type="button" className="btn-ghost" onClick={clear}>
                <X className="size-4" aria-hidden="true" />
                Effacer les filtres
              </button>
            )}
          </div>

          {products.isPending && <CardGridSkeleton count={8} columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />}
          {products.isError && <ErrorState error={products.error} onRetry={() => products.refetch()} />}
          {data && data.items.length === 0 && (
            <EmptyState
              title={active ? "Aucun produit ne correspond" : "Aucun produit publié pour le moment"}
              action={
                active ? (
                  <button type="button" className="btn-secondary" onClick={clear}>
                    Réinitialiser la recherche
                  </button>
                ) : undefined
              }
            >
              {active ? "Essayez d'autres critères ou effacez les filtres." : "Le catalogue sera bientôt disponible."}
            </EmptyState>
          )}
          {data && data.items.length > 0 && (
            <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${products.isPlaceholderData ? "opacity-60" : ""}`} aria-busy={products.isPlaceholderData}>
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          {data && (
            <Pagination
              page={filters.page}
              totalPages={data.totalPages}
              onChange={(page) => {
                setSearchParams(toSearchParams({ ...filters, page }));
                window.scrollTo({ top: 0 });
              }}
            />
          )}
        </div>
      </section>
    </>
  );
}
