// Importe les réalisations décrites dans contenu/realisations/manifest.json via l'API
// d'administration : téléversement des photos, création des types de projet manquants,
// puis création des fiches (publiées, non marquées « démonstration »).
//
// Une réalisation dont le slug existe déjà est ignorée : le script peut être relancé sans risque.
//
//   ADMIN_EMAIL=...  ADMIN_PASSWORD=...  [SITE_URL=http://localhost:8080]  node scripts/importer-realisations.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "contenu", "realisations");
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

const categories = new Map((await call("GET", "/api/admin/project-categories")).map((c) => [c.name, c.id]));
const existing = new Set((await call("GET", "/api/admin/projects?size=48")).items.map((p) => p.slug));

for (const project of manifest) {
  if (existing.has(project.slug)) {
    console.log(`déjà présent, ignoré : ${project.title}`);
    continue;
  }
  if (!categories.has(project.category)) {
    categories.set(project.category, (await call("POST", "/api/admin/project-categories", { name: project.category })).id);
    console.log(`type de projet créé : ${project.category}`);
  }
  const gallery = [];
  for (const image of project.images) gallery.push(await upload(image.file, image.alt));
  const beforeImageId = project.before ? await upload(project.before.file, project.before.alt) : null;
  await call("POST", "/api/admin/projects", {
    title: project.title,
    slug: project.slug,
    categoryId: categories.get(project.category),
    description: project.description,
    location: "",
    mainImageId: gallery[0],
    galleryIds: gallery,
    beforeImageId,
    afterImageId: project.before ? gallery[project.afterIndex ?? 0] : null,
    status: "PUBLISHED",
    demo: false,
  });
  console.log(`réalisation créée : ${project.title} (${gallery.length} photo${gallery.length > 1 ? "s" : ""}${project.before ? ", avant/après" : ""})`);
}
await call("POST", "/api/auth/logout");
