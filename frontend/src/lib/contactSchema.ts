import { z } from "zod";
import type { NeedType } from "./types";

export const NEED_TYPES = ["CUISINE", "DRESSING_PLACARD", "CHAMBRE", "AMENAGEMENT", "MOBILIER", "MENUISERIE", "PRODUIT", "AUTRE"] as const satisfies readonly NeedType[];

/** Demande de devis ou de contact. Mêmes règles que la validation du backend, qui reste la référence. */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Votre nom est requis.").max(120, "120 caractères maximum."),
  phone: z
    .string()
    .trim()
    .min(1, "Votre téléphone est requis.")
    .regex(/^\+?[0-9][0-9 .()-]{5,24}$/, "Numéro de téléphone invalide."),
  email: z.union([z.literal(""), z.email("Adresse email invalide.").max(254, "Adresse email trop longue.")]),
  needType: z.enum(NEED_TYPES, "Choisissez un type de projet."),
  location: z.string().trim().max(160, "160 caractères maximum."),
  budget: z.string().trim().max(80, "80 caractères maximum."),
  message: z.string().trim().min(10, "Décrivez votre projet en quelques mots (10 caractères minimum).").max(4000, "4 000 caractères maximum."),
  consent: z.boolean().refine((value) => value, "Votre accord est nécessaire pour que nous puissions vous recontacter."),
});

export type ContactForm = z.infer<typeof contactSchema>;
