import type { Availability, NeedType, PublicationStatus, RequestStatus } from "./types";

export const PRICE_ON_REQUEST = "Prix sur demande";

const priceFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Un prix absent — ou nul par erreur — s'affiche toujours « Prix sur demande », jamais « 0 MAD ». */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price) || price <= 0) {
    return PRICE_ON_REQUEST;
  }
  // Intl insère des espaces insécables ; on les normalise pour un rendu et des messages prévisibles.
  return priceFormatter.format(price).replace(/[  ]/g, " ") + " MAD";
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  IN_STOCK: "En stock",
  ON_ORDER: "Sur commande",
  OUT_OF_STOCK: "Indisponible",
};

export const NEED_TYPE_LABELS: Record<NeedType, string> = {
  AMENAGEMENT: "Aménagement intérieur",
  CUISINE: "Cuisine",
  DRESSING_PLACARD: "Dressing ou placard",
  CHAMBRE: "Chambre",
  MOBILIER: "Meuble sur mesure",
  MENUISERIE: "Menuiserie bois ou aluminium",
  PRODUIT: "Achat d'un produit",
  AUTRE: "Autre demande",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: "Nouveau",
  IN_PROGRESS: "En cours",
  DONE: "Traité",
};

export const PUBLICATION_LABELS: Record<PublicationStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/** Numéro WhatsApp international lisible : 212653878201 → 06 53 87 82 01 ; autres pays → +33 6… */
export function formatWhatsAppNumber(international: string): string {
  const digits = international.replace(/\D/g, "");
  return /^212\d{9}$/.test(digits) ? formatPhone("0" + digits.slice(3)) : "+" + digits;
}

/** Numéro local lisible : 0661568771 → 06 61 56 87 71. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, "");
  return /^0\d{9}$/.test(digits) ? digits.replace(/(\d{2})(?=\d)/g, "$1 ") : phone;
}
