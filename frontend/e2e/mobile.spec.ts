import { expect, test, type Page } from "@playwright/test";

/** Aucun défilement horizontal : la page ne dépasse pas la largeur de l'écran. */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `débordement horizontal sur ${page.url()}`).toBeLessThanOrEqual(0);
}

test("9 · navigation mobile et absence de débordement", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Le menu de bureau est masqué ; le menu mobile s'ouvre, navigue et se referme.
  await expect(page.getByRole("banner").getByRole("link", { name: "Réalisations", exact: true })).toBeHidden();
  const toggle = page.getByRole("button", { name: "Ouvrir le menu" });
  await toggle.click();
  const menu = page.locator("#menu-mobile");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Produits" }).click();
  await expect(page).toHaveURL(/\/produits$/);
  await expect(menu).toBeHidden();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (const path of ["/services", "/realisations", "/contact", "/a-propos", "/mentions-legales"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("9 · fiche produit sur mobile : le bouton flottant ne masque pas la commande", async ({ page }) => {
  await page.goto("/produits/bureau-droit-demonstration");
  const order = page.getByTestId("order-whatsapp");
  await order.scrollIntoViewIfNeeded();
  await expect(order).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Le bouton de commande reste cliquable : son centre n'est pas recouvert par le bouton flottant.
  const box = (await order.boundingBox())!;
  const covered = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest("[data-testid]")?.getAttribute("data-testid"),
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(covered).toBe("order-whatsapp");
  expect(box.width).toBeGreaterThan(200);
});

test("9 · administration utilisable sur mobile", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Identifiants E2E absents.");
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Mot de passe").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tableau de bord" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#admin-menu").getByRole("link", { name: "Produits" }).click();
  await expect(page.getByTestId("admin-product-row").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/admin/produits/nouveau");
  await expect(page.getByLabel("Nom")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
