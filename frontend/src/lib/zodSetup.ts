import { z } from "zod";

// Zod n'essaie pas de compiler ses validateurs avec « new Function » : la politique de
// sécurité du site (CSP) l'interdit, et l'essai laisserait une erreur en console.
// Ce réglage est lu à la définition de chaque schéma : ce module doit donc être le
// premier importé par main.tsx.
z.config({ jitless: true });
