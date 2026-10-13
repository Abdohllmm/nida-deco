import { z } from "zod";
import type { Availability, ProductDetail, PublicationStatus } from "./types";

export const SLUG_PATTERN = /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE = "Utilisez des minuscules, des chiffres et des tirets (laissez vide pour le générer).";

const AVAILABILITIES = ["IN_STOCK", "ON_ORDER", "OUT_OF_STOCK"] as const satisfies readonly Availability[];
const STATUSES = ["DRAFT", "PUBLISHED"] as const satisfies readonly PublicationStatus[];

/** Convertit la saisie du prix. Chaîne vide → null (« Prix sur demande »). */
export function parsePrice(input: string): number | null {
  const text = input.trim().replace(/\s/g, "").replace(",", ".");
  return text === "" ? null : Number(text);
}

export const productSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(180, "180 caractères maximum."),
  slug: z.string().trim().max(200, "200 caractères maximum.").regex(SLUG_PATTERN, SLUG_MESSAGE),
  reference: z
    .string()
    .trim()
    .min(1, "La référence est requise.")
    .max(60, "60 caractères maximum.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Lettres, chiffres, points, tirets et barres obliques uniquement."),
  shortDescription: z.string().max(300, "300 caractères maximum."),
  description: z.string().max(10000, "10 000 caractères maximum."),
  categoryId: z.string().min(1, "La catégorie est requise."),
  // Saisie libre : vide = « Prix sur demande ». Un prix de 0 est refusé.
  price: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{1,7}([.,]\d{1,2})?$/.test(value.replace(/\s/g, "")), "Prix invalide. Exemple : 2500 ou 2499,90.")
    .refine((value) => {
      const price = parsePrice(value);
      return price === null || Number.isNaN(price) || price > 0;
    }, "Le prix doit être supérieur à 0. Laissez vide pour « Prix sur demande »."),
  availability: z.enum(AVAILABILITIES),
  dimensions: z.string().max(200, "200 caractères maximum."),
  materials: z.string().max(300, "300 caractères maximum."),
  colorOptions: z.string(),
  status: z.enum(STATUSES),
  featured: z.boolean(),
  demo: z.boolean(),
});

export type ProductForm = z.infer<typeof productSchema>;

export const EMPTY_PRODUCT: ProductForm = {
  name: "",
  slug: "",
  reference: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  price: "",
  availability: "ON_ORDER",
  dimensions: "",
  materials: "",
  colorOptions: "",
  status: "DRAFT",
  featured: false,
  demo: false,
};

export function productToForm(product: ProductDetail): ProductForm {
  return {
    name: product.name,
    slug: product.slug,
    reference: product.reference,
    shortDescription: product.shortDescription,
    description: product.description,
    categoryId: product.category.id,
    price: product.price === null ? "" : String(product.price).replace(".", ","),
    availability: product.availability,
    dimensions: product.dimensions ?? "",
    materials: product.materials ?? "",
    colorOptions: product.colorOptions.join("\n"),
    status: product.status,
    featured: product.featured,
    demo: product.demo,
  };
}

/** Corps de requête attendu par l'API à partir des valeurs du formulaire. */
export function toProductPayload(form: ProductForm, mainImageId: string | null, galleryIds: string[]) {
  return {
    ...form,
    price: parsePrice(form.price),
    colorOptions: [...new Set(form.colorOptions.split("\n").map((line) => line.trim()).filter(Boolean))],
    mainImageId,
    galleryIds,
  };
}
