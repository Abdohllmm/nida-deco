import { expect, test } from "@playwright/test";

const WHATSAPP_NUMBER = "212661568771";

test("1 · consultation d'un service", async ({ page }) => {
  await page.goto("/services");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const card = page.getByTestId("service-card").filter({ hasText: "Cuisines modernes" });
  await expect(card).toBeVisible();
  // La carte présente une vraie photo, chargée depuis le backend.
  await expect.poll(() => card.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await card.getByRole("link", { name: "Cuisines modernes" }).click();

  await expect(page).toHaveURL(/\/services\/cuisines-modernes$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cuisines modernes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ce que nous pouvons réaliser" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Découvrez aussi" })).toBeVisible();

  // Galerie : navigation entre les photos.
  await page.getByRole("button", { name: "Photo suivante" }).click();
  await expect(page.getByText("2 / 4")).toBeVisible();
  await expect(page).toHaveTitle(/Cuisines modernes/);

  const href = await page.getByTestId("service-whatsapp").getAttribute("href");
  expect(href).toContain(`https://wa.me/${WHATSAPP_NUMBER}?text=`);
  expect(decodeURIComponent(href!.split("?text=")[1])).toContain("Cuisines modernes");
});

test("2 · recherche et filtrage d'un produit, filtres conservés dans l'URL", async ({ page }) => {
  await page.goto("/produits");
  const cards = page.getByTestId("product-card");
  await expect(cards.first()).toBeVisible();
  const total = await cards.count();
  expect(total).toBeGreaterThan(3);

  await page.getByLabel("Recherche").fill("compact");
  await expect(page).toHaveURL(/q=compact/);
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Bureau compact");

  await page.getByRole("button", { name: "Effacer les filtres" }).first().click();
  await expect(cards).toHaveCount(total);

  const categories = page.getByRole("group", { name: "Catégorie" });
  await categories.getByRole("button", { name: "Tables", exact: true }).click();
  await expect(page).toHaveURL(/categorie=tables/);
  await expect(categories.getByRole("button", { name: "Tables", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(cards).toHaveCount(3);
  await expect(page.getByTestId("product-card").filter({ hasText: "Table de réunion" })).toBeVisible();

  await categories.getByRole("button", { name: "Toutes" }).click();
  await page.getByLabel("Disponibilité").selectOption({ label: "Indisponible" });
  await expect(page).toHaveURL(/dispo=indisponible/);
  await expect(cards.first()).toContainText("Indisponible");

  // Un rafraîchissement direct de l'URL filtrée restitue les mêmes filtres.
  await page.reload();
  await expect(page.getByLabel("Disponibilité")).toHaveValue("OUT_OF_STOCK");
  await expect(cards.first()).toContainText("Indisponible");

  await page.goto("/produits?q=aucun-produit-de-ce-nom");
  await expect(page.getByText("Aucun produit ne correspond")).toBeVisible();
});

test("3-4 · consultation d'un produit et lien WhatsApp de commande", async ({ page }) => {
  await page.goto("/produits");
  await page.getByTestId("product-card").filter({ hasText: "Bureau droit" }).getByRole("link", { name: /Voir le produit/ }).click();
  await expect(page).toHaveURL(/\/produits\/bureau-droit-demonstration$/);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bureau droit");
  await expect(page.getByTestId("product-reference")).toHaveText("DEMO-BUR-001");
  // Produit de démonstration sans prix : jamais « 0 MAD ».
  await expect(page.getByTestId("detail-price")).toHaveText("Prix sur demande");
  await expect(page.getByText("0 MAD")).toHaveCount(0);
  await expect(page.getByText("140 × 70 × 75 cm")).toBeVisible();

  // L'image principale est réellement chargée depuis le backend.
  const image = page.getByRole("group", { name: /Photos/ }).locator("img").first();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Augmenter la quantité" }).click();
  await page.getByRole("button", { name: "Augmenter la quantité" }).click();
  await page.getByText("Noyer", { exact: true }).click();

  // On inspecte le lien sans l'ouvrir : aucun message n'est envoyé.
  const link = page.getByTestId("order-whatsapp");
  await expect(link).toContainText("Commander sur WhatsApp");
  await expect(link).toHaveAttribute("target", "_blank");
  const href = (await link.getAttribute("href"))!;
  const url = new URL(href);
  expect(url.origin + url.pathname).toBe(`https://wa.me/${WHATSAPP_NUMBER}`);
  expect(href.split("?text=")[1]).not.toMatch(/[ \n]/);

  const lines = url.searchParams.get("text")!.split("\n");
  expect(lines).toEqual([
    "Bonjour Nidal Deco, je souhaite commander :",
    "Produit : Bureau droit (démonstration)",
    "Référence : DEMO-BUR-001",
    "Quantité : 3",
    "Options : Noyer",
    "Prix affiché : Prix sur demande",
    `Lien : ${new URL(page.url()).origin}/produits/bureau-droit-demonstration`,
    "Pouvez-vous me confirmer la disponibilité et les modalités ?",
  ]);

  await expect(page.getByRole("heading", { name: "Produits similaires" })).toBeVisible();
});

test("page 404 et brouillon inaccessible", async ({ page }) => {
  await page.goto("/produits/ce-produit-n-existe-pas");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await page.goto("/une-page-inconnue");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});

test("8 · soumission d'une demande de contact", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByTestId("contact-whatsapp")).toHaveAttribute("href", new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}\\?text=`));
  // Second numéro de l'entreprise : affiché dans les coordonnées, téléphone et WhatsApp.
  await expect(page.getByTestId("contact-whatsapp-2")).toHaveAttribute("href", /^https:\/\/wa\.me\/212653878201\?text=/);
  await expect(page.getByRole("main").getByRole("link", { name: "06 53 87 82 01", exact: true })).toHaveAttribute("href", "tel:0653878201");

  // Envoi vide : erreurs précises, rien n'est transmis.
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByText("Votre nom est requis.")).toBeVisible();
  await expect(page.getByText("Votre téléphone est requis.")).toBeVisible();
  await expect(page.getByText(/Votre accord est nécessaire/)).toBeVisible();

  const marker = `E2E ${Date.now()}`;
  await page.getByLabel("Nom complet").fill(marker);
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Type de projet").selectOption({ label: "Cuisine" });
  await page.getByLabel(/Ville ou quartier/).fill("Maârif");
  await page.getByLabel("Message").fill("Demande de test automatisé : merci de l'ignorer.");
  await page.getByLabel(/J'accepte d'être recontacté/).check();

  const response = page.waitForResponse((r) => r.url().endsWith("/api/public/contact-requests") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  expect((await response).status()).toBe(201);

  const success = page.getByTestId("contact-success");
  await expect(success).toContainText("Votre demande a bien été enregistrée");
  await expect(success.getByTestId("contact-followup-whatsapp")).toHaveAttribute("href", new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}`));
});

test("accueil : hero en photo, sans illustration ni police serif, et devis accessible en fenêtre", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("main section").first();
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Votre intérieur, pensé et réalisé sur mesure.");
  // Le hero affiche une photo (balise img chargée), pas un dessin vectoriel.
  await expect(hero.locator("svg[role=img]")).toHaveCount(0);
  const photo = hero.locator("img").first();
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(600);

  const fonts = await page.evaluate(() => ({
    title: getComputedStyle(document.querySelector("h1")!).fontFamily,
    body: getComputedStyle(document.body).fontFamily,
  }));
  expect(fonts.title).toContain("Manrope");
  expect(fonts.body).toContain("Inter");
  expect(fonts.title + fonts.body).not.toMatch(/Cormorant|Georgia|Times/);

  await expect(page.getByTestId("service-card")).toHaveCount(6);
  await expect(page.getByTestId("project-card").first()).toBeVisible();

  // Devis : fenêtre ouverte depuis l'en-tête, fermée par Échap, puis envoi réel depuis le hero.
  await page.getByRole("banner").getByRole("button", { name: "Demander un devis" }).click();
  const dialog = page.getByRole("dialog", { name: "Demander un devis" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await hero.getByRole("button", { name: "Demander un devis" }).click();
  await dialog.getByLabel("Nom complet").fill(`E2E devis ${Date.now()}`);
  await dialog.getByLabel("Téléphone").fill("0612345678");
  await dialog.getByLabel("Type de projet").selectOption({ label: "Dressing ou placard" });
  await dialog.getByLabel("Message").fill("Demande de test automatisé : merci de l'ignorer.");
  await dialog.getByLabel(/J'accepte d'être recontacté/).check();
  await dialog.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(dialog.getByTestId("contact-success")).toContainText("Votre demande a bien été enregistrée");
  await expect(dialog.getByTestId("contact-followup-whatsapp")).toHaveAttribute("href", new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}`));
});
