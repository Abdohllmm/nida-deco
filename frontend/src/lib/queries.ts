import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Category, CompanySettings } from "./types";

/** Paramètres de l'entreprise : source unique du numéro WhatsApp, du téléphone, etc. */
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<CompanySettings>("/api/public/settings"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: () => api.get<Category[]>("/api/public/product-categories"),
    staleTime: 60 * 1000,
  });
}

export function useProjectCategories() {
  return useQuery({
    queryKey: ["project-categories"],
    queryFn: () => api.get<Category[]>("/api/public/project-categories"),
    staleTime: 60 * 1000,
  });
}
