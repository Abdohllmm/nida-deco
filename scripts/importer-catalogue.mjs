// Importe le contenu décrit dans contenu/catalogue/manifest.json via l'API d'administration :
//  - produits réels (publiés, sans prix = « Prix sur demande », non marqués « démonstration ») ;
//  - photos à ajouter à la galerie d'un service existant.
//
// Un produit dont la référence ou le slug existe déjà est ignoré, de même qu'une photo de
// service déjà présente (même texte alternatif) : le script peut être relancé sans risque.
//
//   ADMIN_EMAIL=...  ADMIN_PASSWORD=...  [SITE_URL=http://localhost:8080]  node scripts/importer-catalogue.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "contenu", "catalogue");
const base = (process.env.SITE_URL || "http://localhost:8080").replace(/\/+$/, "");
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Définissez ADMIN_EMAIL et ADMIN_PASSWORD (compte administrateur du site).");
  process.exit(1);
}

// Gestion minimale des cookies : session et jeton CSRF.
const cookies = new Map();
async function call(method, url, body) {
  const headers = { Accept: "application/json", Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") };
  if (method !== "GET") headers["X-XSRF-TOKEN"] = cookies.get("XSRF-TOKEN") ?? "";
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(base + url, { method, headers, body: payload });
  for (const line of response.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const index = pair.indexOf("=");
    cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const details = data?.fieldErrors && Object.keys(data.fieldErrors).length ? " " + JSON.stringify(data.fieldErrors) : "";
    throw new Error(`${method} ${url} → ${response.status} ${data?.message ?? ""}${details}`);
  }
  return data;
}

async function upload(file, alt) {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(path.join(root, file))], { type: "image/jpeg" }), path.basename(file));
  form.append("alt", alt);
  return (await call("POST", "/api/admin/media", form)).id;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
await call("GET", "/api/auth/csrf");
await call("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

// --- Produits ---
const categories = new Map((await call("GET", "/api/admin/product-categories")).map((c) => [c.name, c.id]));
const existing = (await call("GET", "/api/admin/products?size=48")).items;
for (const product of manifest.products ?? []) {
  if (existing.some((p) => p.slug === product.slug || p.reference.toLowerCase() === product.reference.toLowerCase())) {
    console.log(`déjà présent, ignoré : ${product.name}`);
    continue;
  }
  if (!categories.has(product.category)) {
    categories.set(product.category, (await call("POST", "/api/admin/product-categories", { name: product.category, position: 0 })).id);
    console.log(`catégorie créée : ${product.category}`);
  }
  const imageId = await upload(product.image.file, product.image.alt);
  await call("POST", "/api/admin/products", {
    name: product.name,
    slug: product.slug,
    reference: product.reference,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    categoryId: categories.get(product.category),
    price: product.price ?? null, // absent = « Prix sur demande »
    availability: product.availability ?? "ON_ORDER",
    dimensions: product.dimensions ?? "",
    materials: product.materials ?? "",
    colorOptions: product.colorOptions ?? [],
    mainImageId: imageId,
    galleryIds: [imageId],
    status: "PUBLISHED",
    featured: product.featured ?? false,
    demo: false,
  });
  console.log(`produit créé : ${product.name} (${product.reference})`);
}

// --- Services ---
// Créés s'ils n'existent pas encore (même slug). « demo: true » signale un service dont les
// photos sont des illustrations de banque d'images, à remplacer par de vraies photos.
const existingServices = new Set((await call("GET", "/api/admin/services")).map((s) => s.slug));
for (const service of manifest.services ?? []) {
  if (existingServices.has(service.slug)) {
    console.log(`déjà présent, ignoré : service ${service.title}`);
    continue;
  }
  const gallery = [];
  for (const image of service.images ?? []) gallery.push(await upload(image.file, image.alt));
  await call("POST", "/api/admin/services", {
    title: service.title,
    slug: service.slug,
    shortDescription: service.shortDescription ?? "",
    description: service.description ?? "",
    mainImageId: gallery[0] ?? null,
    galleryIds: gallery,
    includedItems: service.includedItems ?? [],
    displayOrder: service.displayOrder ?? 0,
    status: "PUBLISHED",
    featured: service.featured ?? false,
    demo: service.demo ?? false,
  });
  console.log(`service créé : ${service.title} (${gallery.length} photo${gallery.length > 1 ? "s" : ""}${service.demo ? ", illustrations à remplacer" : ""})`);
}

// --- Photo d'accueil ---
// Si aucune photo d'accueil n'est choisie, on reprend la photo principale d'une réalisation publiée.
if (manifest.heroFromProject) {
  const { logo, heroImage, ...settings } = await call("GET", "/api/admin/settings");
  const projects = (await call("GET", "/api/admin/projects?size=48")).items;
  const source = projects.find((p) => p.slug === manifest.heroFromProject);
  if (heroImage) console.log("photo d'accueil déjà définie, inchangée");
  else if (!source?.mainImage) console.log(`photo d'accueil : réalisation « ${manifest.heroFromProject} » absente (importez d'abord les réalisations)`);
  else {
    await call("PUT", "/api/admin/settings", { ...settings, logoId: logo?.id ?? null, heroImageId: source.mainImage.id });
    console.log(`photo d'accueil définie depuis : ${source.title}`);
  }
}

// --- Photos de services ---
const services = await call("GET", "/api/admin/services");
for (const photo of manifest.servicePhotos ?? []) {
  const summary = services.find((s) => s.slug === photo.serviceSlug);
  if (!summary) {
    console.log(`service introuvable, photo ignorée : ${photo.serviceSlug}`);
    continue;
  }
  const service = await call("GET", `/api/admin/services/${summary.id}`);
  if (service.gallery.some((image) => image.alt === photo.alt)) {
    console.log(`photo déjà présente, ignorée : ${service.title}`);
    continue;
  }
  const imageId = await upload(photo.file, photo.alt);
  const gallery = service.gallery.map((image) => image.id);
  const galleryIds = photo.main ? [imageId, ...gallery] : [...gallery, imageId];
  await call("PUT", `/api/admin/services/${service.id}`, {
    title: service.title,
    slug: service.slug,
    shortDescription: service.shortDescription,
    description: service.description,
    mainImageId: photo.main ? imageId : (service.mainImage?.id ?? imageId),
    galleryIds,
    includedItems: service.includedItems,
    displayOrder: service.displayOrder,
    status: service.status,
    featured: service.featured,
    demo: service.demo,
  });
  console.log(`photo ajoutée au service : ${service.title}${photo.main ? " (image principale)" : ""}`);
}
await call("POST", "/api/auth/logout");
