import type { Availability, ProductSort } from "./types";

/** Filtres du catalogue, synchronisés avec les paramètres d'URL (liens partageables). */
export interface ProductFilters {
  q: string;
  category: string;
  availability: Availability | "";
  sort: ProductSort;
  /** Page courante, à partir de 1 dans l'URL. */
  page: number;
}

export const DEFAULT_FILTERS: ProductFilters = { q: "", category: "", availability: "", sort: "NEWEST", page: 1 };

const AVAILABILITIES: Availability[] = ["IN_STOCK", "ON_ORDER", "OUT_OF_STOCK"];
const SORTS: Record<string, ProductSort> = { recent: "NEWEST", "prix-croissant": "PRICE_ASC", "prix-decroissant": "PRICE_DESC" };
const AVAILABILITY_PARAMS: Record<string, Availability> = {
  "en-stock": "IN_STOCK",
  "sur-commande": "ON_ORDER",
  indisponible: "OUT_OF_STOCK",
};

function keyOf<T extends string>(map: Record<string, T>, value: T): string | undefined {
  return Object.keys(map).find((key) => map[key] === value);
}

/** Lit les filtres depuis l'URL en ignorant toute valeur inconnue. */
export function parseProductFilters(params: URLSearchParams): ProductFilters {
  const availability = AVAILABILITY_PARAMS[params.get("dispo") ?? ""] ?? "";
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    q: (params.get("q") ?? "").trim().slice(0, 100),
    category: params.get("categorie") ?? "",
    availability: AVAILABILITIES.includes(availability as Availability) ? availability : "",
    sort: SORTS[params.get("tri") ?? ""] ?? "NEWEST",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Écrit les filtres dans l'URL ; les valeurs par défaut sont omises. */
export function toSearchParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("categorie", filters.category);
  if (filters.availability) params.set("dispo", keyOf(AVAILABILITY_PARAMS, filters.availability)!);
  if (filters.sort !== "NEWEST") params.set("tri", keyOf(SORTS, filters.sort)!);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

/** Modifier un filtre ramène toujours à la première page. */
export function withFilter(filters: ProductFilters, change: Partial<ProductFilters>): ProductFilters {
  return { ...filters, page: 1, ...change };
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return filters.q !== "" || filters.category !== "" || filters.availability !== "";
}
