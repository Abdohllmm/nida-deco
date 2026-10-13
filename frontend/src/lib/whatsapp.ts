import { formatPrice } from "./format";

/**
 * Construit un lien wa.me. Le site ne fait qu'ouvrir une conversation avec un
 * message prérempli : rien n'est envoyé tant que le visiteur ne valide pas dans
 * WhatsApp. Renvoie null si aucun numéro valide n'est configuré.
 */
export function buildWhatsAppUrl(number: string | null | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export interface OrderMessageInput {
  name: string;
  reference: string;
  quantity: number;
  options?: string[];
  price: number | null;
  url: string;
}

export function buildOrderMessage({ name, reference, quantity, options = [], price, url }: OrderMessageInput): string {
  const selected = options.filter((option) => option.trim() !== "");
  const lines = [
    "Bonjour Nidal Deco, je souhaite commander :",
    `Produit : ${name}`,
    `Référence : ${reference}`,
    `Quantité : ${quantity}`,
    ...(selected.length > 0 ? [`Options : ${selected.join(", ")}`] : []),
    `Prix affiché : ${formatPrice(price)}`,
    `Lien : ${url}`,
    "Pouvez-vous me confirmer la disponibilité et les modalités ?",
  ];
  return lines.join("\n");
}

export function buildProjectMessage(subject: string, url: string): string {
  return ["Bonjour Nidal Deco, je souhaite discuter de mon projet :", subject, `Lien : ${url}`].join("\n");
}

export const GENERIC_MESSAGE = "Bonjour Nidal Deco, je souhaite obtenir des informations.";
