import { describe, expect, it } from "vitest";
import { contactSchema } from "./contactSchema";
import { PRICE_ON_REQUEST, formatPhone, formatPrice, formatWhatsAppNumber } from "./format";
import { DEFAULT_FILTERS, hasActiveFilters, parseProductFilters, toSearchParams, withFilter } from "./productFilters";
import { EMPTY_PRODUCT, parsePrice, productSchema, toProductPayload } from "./productSchema";
import { buildOrderMessage, buildWhatsAppUrl } from "./whatsapp";

describe("lien WhatsApp", () => {
  const order = { name: "Bureau Élégance", reference: "BUR-100", quantity: 2, price: 4500, url: "https://nidaldeco.example/produits/bureau-elegance" };

  it("cible le numéro configuré et encode le message", () => {
    const message = buildOrderMessage(order);
    const url = buildWhatsAppUrl("212661568771", message)!;
    expect(url.startsWith("https://wa.me/212661568771?text=")).toBe(true);
    const encoded = url.split("?text=")[1];
    // Aucun caractère réservé ne doit rester brut dans le paramètre.
    expect(encoded).not.toMatch(/[ \n&#?]/);
    expect(encoded).toContain("%0A");
    expect(decodeURIComponent(encoded)).toBe(message);
  });

  it("produit le message attendu, ligne par ligne", () => {
    expect(buildOrderMessage({ ...order, options: ["Noyer"] }).split("\n")).toEqual([
      "Bonjour Nidal Deco, je souhaite commander :",
      "Produit : Bureau Élégance",
      "Référence : BUR-100",
      "Quantité : 2",
      "Options : Noyer",
      "Prix affiché : 4 500 MAD",
      "Lien : https://nidaldeco.example/produits/bureau-elegance",
      "Pouvez-vous me confirmer la disponibilité et les modalités ?",
    ]);
  });

  it("omet la ligne Options sans sélection et indique « Prix sur demande » sans prix", () => {
    const message = buildOrderMessage({ ...order, price: null, options: ["", "  "] });
    expect(message).not.toContain("Options :");
    expect(message).toContain("Prix affiché : Prix sur demande");
    expect(message).not.toContain("0 MAD");
  });

  it("encode correctement un nom contenant des caractères spéciaux", () => {
    const url = buildWhatsAppUrl("212661568771", buildOrderMessage({ ...order, name: "Table & chaises #2 (100% bois)" }))!;
    expect(url).toContain("Table%20%26%20chaises%20%232%20(100%25%20bois)");
  });

  it("nettoie le numéro et refuse un numéro absent", () => {
    expect(buildWhatsAppUrl("+212 661-568-771", "Bonjour")).toBe("https://wa.me/212661568771?text=Bonjour");
    expect(buildWhatsAppUrl("", "Bonjour")).toBeNull();
    expect(buildWhatsAppUrl(undefined, "Bonjour")).toBeNull();
  });
});

describe("affichage du prix", () => {
  it("n'affiche jamais 0 MAD", () => {
    for (const value of [null, undefined, 0, -5, Number.NaN]) {
      expect(formatPrice(value)).toBe(PRICE_ON_REQUEST);
    }
  });

  it("formate un prix en MAD", () => {
    expect(formatPrice(4500)).toBe("4 500 MAD");
    expect(formatPrice(1299.5)).toBe("1 299,5 MAD");
  });

  it("formate le téléphone local", () => {
    expect(formatPhone("0661568771")).toBe("06 61 56 87 71");
    expect(formatPhone("+212 661568771")).toBe("+212 661568771");
    expect(formatWhatsAppNumber("212653878201")).toBe("06 53 87 82 01");
    expect(formatWhatsAppNumber("33612345678")).toBe("+33612345678");
  });
});

describe("filtres du catalogue", () => {
  it("lit les filtres depuis l'URL", () => {
    const filters = parseProductFilters(new URLSearchParams("q=bureau&categorie=bureaux&dispo=en-stock&tri=prix-croissant&page=3"));
    expect(filters).toEqual({ q: "bureau", category: "bureaux", availability: "IN_STOCK", sort: "PRICE_ASC", page: 3 });
  });

  it("ignore les valeurs inconnues ou invalides", () => {
    expect(parseProductFilters(new URLSearchParams("dispo=nimporte&tri=xyz&page=-2"))).toEqual(DEFAULT_FILTERS);
    expect(parseProductFilters(new URLSearchParams("page=abc")).page).toBe(1);
  });

  it("n'écrit dans l'URL que les valeurs non par défaut", () => {
    expect(toSearchParams(DEFAULT_FILTERS).toString()).toBe("");
    expect(toSearchParams({ q: " bureau ", category: "tables", availability: "OUT_OF_STOCK", sort: "PRICE_DESC", page: 2 }).toString()).toBe(
      "q=bureau&categorie=tables&dispo=indisponible&tri=prix-decroissant&page=2",
    );
  });

  it("fait l'aller-retour URL → filtres → URL", () => {
    const query = "q=table&categorie=tables&dispo=sur-commande&tri=prix-decroissant&page=4";
    expect(toSearchParams(parseProductFilters(new URLSearchParams(query))).toString()).toBe(query);
  });

  it("revient à la première page quand un filtre change", () => {
    const current = { ...DEFAULT_FILTERS, page: 5 };
    expect(withFilter(current, { category: "bureaux" })).toMatchObject({ category: "bureaux", page: 1 });
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: "PRICE_ASC" })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, availability: "IN_STOCK" })).toBe(true);
  });
});

describe("formulaire produit", () => {
  const valid = { ...EMPTY_PRODUCT, name: "Bureau", reference: "BUR-1", categoryId: "c1" };

  it("accepte un produit sans prix et envoie null", () => {
    const parsed = productSchema.parse(valid);
    expect(toProductPayload(parsed, null, []).price).toBeNull();
  });

  it("refuse un prix nul ou mal formé", () => {
    expect(productSchema.safeParse({ ...valid, price: "0" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, price: "0,00" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, price: "abc" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, price: "-10" }).success).toBe(false);
  });

  it("convertit le prix saisi et nettoie les options", () => {
    expect(parsePrice("2 499,90")).toBe(2499.9);
    const payload = toProductPayload(productSchema.parse({ ...valid, price: "2499,90", colorOptions: "Noyer\n\n Blanc \nNoyer" }), "m1", ["m1", "m2"]);
    expect(payload).toMatchObject({ price: 2499.9, colorOptions: ["Noyer", "Blanc"], mainImageId: "m1", galleryIds: ["m1", "m2"] });
  });

  it("signale les champs obligatoires et un slug invalide", () => {
    const result = productSchema.safeParse({ ...EMPTY_PRODUCT, slug: "Pas Un Slug" });
    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["name", "reference", "categoryId", "slug"]));
  });
});

describe("formulaire de contact", () => {
  it("valide une demande correcte, email facultatif", () => {
    const result = contactSchema.safeParse({ name: "Client", phone: "06 61 56 87 71", email: "", needType: "CUISINE", message: "Je souhaite un devis.", location: "", budget: "", consent: true });
    expect(result.success).toBe(true);
  });

  it("donne un message précis par champ invalide", () => {
    const result = contactSchema.safeParse({ name: " ", phone: "abc", email: "pas-un-email", needType: "", message: "court", location: "", budget: "", consent: false });
    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    expect(new Set(fields)).toEqual(new Set(["name", "phone", "email", "needType", "message", "consent"]));
  });
});
