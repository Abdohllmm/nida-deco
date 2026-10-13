import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "Définissez E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD pour exécuter les tests d'administration.");

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Mot de passe").fill(PASSWORD!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tableau de bord" })).toBeVisible();
}

test("l'administration est inaccessible sans connexion", async ({ page, request }) => {
  await page.goto("/admin/produits");
  await expect(page).toHaveURL(/\/admin\/login$/);
  // La protection est appliquée par le backend, pas seulement par l'interface.
  expect((await request.get("/api/admin/products")).status()).toBe(401);
  expect((await request.get("/api/admin/contact-requests")).status()).toBe(401);
});

test("5 · connexion administrateur, erreur générique puis accès au tableau de bord", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("inconnu@exemple.test");
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByTestId("login-error")).toHaveText("Email ou mot de passe incorrect.");

  await login(page);
  await expect(page.getByRole("link", { name: /Demandes reçues/ })).toBeVisible();
  // Les contenus d'exemple sont signalés, avec la marche à suivre pour les remplacer.
  await expect(page.getByTestId("demo-note")).toContainText("de démonstration à remplacer");

  // La session survit à un rechargement direct d'une page d'administration.
  await page.goto("/admin/produits");
  await expect(page.getByRole("heading", { level: 1, name: "Produits" })).toBeVisible();

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("6-7 · création, publication, modification, dépublication et suppression d'un produit", async ({ page }) => {
  const stamp = Date.now();
  const name = `Bureau E2E ${stamp}`;
  const renamed = `${name} modifié`;
  const reference = `E2E-${stamp}`;
  const slug = `bureau-e2e-${stamp}`;
  const row = (text: string) => page.getByTestId("admin-product-row").filter({ hasText: text });

  await login(page);
  await page.goto("/admin/produits/nouveau");

  // Validation : formulaire vide puis prix nul refusé.
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await expect(page.getByText("Le nom est requis.")).toBeVisible();
  await expect(page.getByText("La catégorie est requise.")).toBeVisible();

  await page.getByLabel("Nom").fill(name);
  await page.getByLabel("Référence").fill(reference);
  await page.getByLabel("Catégorie").selectOption({ label: "Bureaux" });
  await page.getByLabel("Prix (MAD)").fill("0");
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await expect(page.getByText(/Le prix doit être supérieur à 0/)).toBeVisible();

  // Création en brouillon, sans prix.
  await page.getByLabel("Prix (MAD)").fill("");
  await page.getByLabel("Description courte").fill("Produit créé par un test automatisé.");
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await expect(page).toHaveURL(/\/admin\/produits$/);
  await expect(row(name)).toContainText("Brouillon");
  await expect(row(name)).toContainText("Prix sur demande");

  // Brouillon : invisible publiquement, y compris par accès direct à son adresse.
  expect((await page.request.get(`/api/public/products/${slug}`)).status()).toBe(404);
  await page.goto(`/produits/${slug}`);
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();

  // Publication.
  await page.goto("/admin/produits");
  await row(name).getByRole("button", { name: /^Publier/ }).click();
  await expect(row(name)).toContainText("Publié");
  await page.goto(`/produits/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByTestId("detail-price")).toHaveText("Prix sur demande");

  // Modification : nouveau nom et prix.
  await page.goto("/admin/produits");
  await row(name).getByRole("link", { name: /Modifier/ }).click();
  await expect(page.getByLabel("Nom")).toHaveValue(name);
  await page.getByLabel("Nom").fill(renamed);
  await page.getByLabel("Prix (MAD)").fill("2499,90");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/admin\/produits$/);
  await expect(row(renamed)).toContainText("2 499,9 MAD");
  await page.goto(`/produits/${slug}`);
  await expect(page.getByTestId("detail-price")).toHaveText("2 499,9 MAD");
  const href = (await page.getByTestId("order-whatsapp").getAttribute("href"))!;
  expect(new URL(href).searchParams.get("text")).toContain("Prix affiché : 2 499,9 MAD");

  // Dépublication : retour à l'invisibilité publique.
  await page.goto("/admin/produits");
  await row(renamed).getByRole("button", { name: /^Dépublier/ }).click();
  await expect(row(renamed)).toContainText("Brouillon");
  expect((await page.request.get(`/api/public/products/${slug}`)).status()).toBe(404);

  // Suppression avec confirmation : annuler conserve le produit.
  await row(renamed).getByRole("button", { name: /Supprimer/ }).click();
  const dialog = page.getByRole("dialog", { name: "Supprimer ce produit ?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(row(renamed)).toHaveCount(1);
  await row(renamed).getByRole("button", { name: /Supprimer/ }).click();
  await dialog.getByRole("button", { name: "Supprimer" }).click();
  await expect(row(renamed)).toHaveCount(0);
});

test("les demandes de contact sont consultables et gérables", async ({ page }) => {
  const marker = `E2E admin ${Date.now()}`;
  await page.goto("/contact");
  await page.getByLabel("Nom complet").fill(marker);
  await page.getByLabel("Téléphone").fill("0612345678");
  await page.getByLabel("Type de projet").selectOption({ label: "Autre demande" });
  await page.getByLabel(/Budget envisagé/).fill("20 000 MAD");
  await page.getByLabel("Message").fill("Demande de test automatisé : merci de l'ignorer.");
  await page.getByLabel(/J'accepte d'être recontacté/).check();
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByTestId("contact-success")).toBeVisible();

  await login(page);
  await page.goto("/admin/demandes");
  await page.getByTestId("request-list").getByRole("button").filter({ hasText: marker }).click();
  const dialog = page.getByRole("dialog", { name: marker });
  await expect(dialog).toContainText("Demande de test automatisé");
  await expect(dialog).toContainText("20 000 MAD");
  await dialog.getByLabel("Statut").selectOption({ label: "Traité" });
  await expect(page.getByText("Statut mis à jour.")).toBeVisible();

  await dialog.getByRole("button", { name: "Supprimer la demande" }).click();
  await page.getByRole("dialog", { name: "Supprimer cette demande ?" }).getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText("Demande supprimée.")).toBeVisible();
  await expect(page.getByText(marker)).toHaveCount(0);
});
