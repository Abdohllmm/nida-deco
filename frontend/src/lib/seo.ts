import { useEffect } from "react";

interface Seo {
  title: string;
  description?: string;
  /** Pages à exclure de l'indexation (administration, 404). */
  noindex?: boolean;
}

export const SITE_NAME = "NIDAL DECO";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

/**
 * Met à jour le titre et les métadonnées lors de la navigation dans le navigateur.
 * Les robots qui n'exécutent pas JavaScript reçoivent les mêmes informations du
 * backend, qui les inscrit dans le HTML servi (voir SeoController).
 */
export function useSeo({ title, description, noindex = false }: Seo) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;
    setMeta("property", "og:title", fullTitle);
    if (description !== undefined) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
  }, [title, description, noindex]);
}

/** Adresse publique de la page courante, sans paramètres ni ancre. */
export function currentPageUrl(): string {
  return window.location.origin + window.location.pathname;
}
