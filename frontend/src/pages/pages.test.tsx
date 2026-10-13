import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductCard } from "../components/cards";
import { ToastProvider } from "../components/Toast";
import type { CompanySettings, ProductDetail, ProductSummary } from "../lib/types";
import ContactPage from "./ContactPage";
import ProductDetailPage from "./ProductDetailPage";

const settings: CompanySettings = {
  displayName: "NIDAL DECO",
  phone: "0661568771",
  whatsappNumber: "212661568771",
  secondaryPhone: "",
  secondaryWhatsappNumber: "",
  instagramUrl: "https://www.instagram.com/nidal_deco1/",
  contactEmail: "",
  city: "Casablanca",
  address: "",
  openingHours: "",
  aboutText: "",
  logo: null,
  heroTitle: "",
  heroSubtitle: "",
  heroImage: null,
  introTitle: "",
  introText: "",
};

const summary: ProductSummary = {
  id: "p1",
  name: "Bureau Élégance",
  slug: "bureau-elegance",
  reference: "BUR-100",
  shortDescription: "Un bureau sobre.",
  category: { id: "c1", name: "Bureaux", slug: "bureaux", position: 1, itemCount: null },
  price: null,
  availability: "OUT_OF_STOCK",
  status: "PUBLISHED",
  featured: false,
  demo: false,
  mainImage: null,
  updatedAt: "2026-01-01T00:00:00Z",
};

const detail: ProductDetail = { ...summary, description: "", dimensions: null, materials: null, colorOptions: ["Noyer", "Blanc"], gallery: [], createdAt: "2026-01-01T00:00:00Z" };

type Handler = (url: string, init?: RequestInit) => { status?: number; body: unknown } | undefined;
let posted: { url: string; body: unknown }[] = [];

function mockApi(handler: Handler) {
  posted = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method && init.method !== "GET") posted.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
      const custom = handler(url, init);
      const result = custom ?? (url === "/api/public/settings" ? { body: settings } : url === "/api/auth/csrf" ? { body: { token: "jeton" } } : { status: 404, body: { message: "Introuvable" } });
      const status = result.status ?? 200;
      return new Response(JSON.stringify(result.body), { status, headers: { "Content-Type": "application/json" } });
    }),
  );
}

function renderAt(path: string, routes: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider>
          <Routes>{routes}</Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  document.cookie = "XSRF-TOKEN=jeton";
});
afterEach(() => vi.unstubAllGlobals());

describe("carte produit", () => {
  it("affiche « Prix sur demande » sans prix, jamais 0 MAD, et signale l'indisponibilité", () => {
    render(
      <MemoryRouter>
        <ProductCard product={summary} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("product-price")).toHaveTextContent("Prix sur demande");
    expect(screen.queryByText(/0 MAD/)).not.toBeInTheDocument();
    expect(screen.getByText("Indisponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le produit Bureau Élégance" })).toHaveAttribute("href", "/produits/bureau-elegance");
  });

  it("affiche le prix en MAD lorsqu'il est renseigné", () => {
    render(
      <MemoryRouter>
        <ProductCard product={{ ...summary, price: 4500, availability: "IN_STOCK" }} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("product-price")).toHaveTextContent("4 500 MAD");
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });
});

describe("fiche produit", () => {
  it("prépare le lien WhatsApp avec la quantité et l'option choisies", async () => {
    mockApi((url) => (url === "/api/public/products/bureau-elegance" ? { body: { product: detail, similar: [] } } : undefined));
    const user = userEvent.setup();
    renderAt("/produits/bureau-elegance", <Route path="/produits/:slug" element={<ProductDetailPage />} />);

    const link = await screen.findByTestId("order-whatsapp");
    expect(screen.getByTestId("detail-price")).toHaveTextContent("Prix sur demande");
    expect(screen.getByTestId("unavailable-notice")).toBeInTheDocument();
    expect(link).toHaveTextContent("Demander la disponibilité sur WhatsApp");

    await user.click(screen.getByRole("button", { name: "Augmenter la quantité" }));
    await user.click(screen.getByLabelText("Noyer"));

    const href = screen.getByTestId("order-whatsapp").getAttribute("href")!;
    expect(href.startsWith("https://wa.me/212661568771?text=")).toBe(true);
    const message = decodeURIComponent(href.split("?text=")[1]);
    expect(message).toContain("Produit : Bureau Élégance");
    expect(message).toContain("Référence : BUR-100");
    expect(message).toContain("Quantité : 2");
    expect(message).toContain("Options : Noyer");
    expect(message).toContain("Prix affiché : Prix sur demande");
    // L'adresse exacte de la page est vérifiée dans un vrai navigateur (tests E2E).
    expect(message).toMatch(/\nLien : https?:\/\/\S+\n/);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("affiche la page 404 pour un produit introuvable ou non publié", async () => {
    mockApi(() => undefined);
    renderAt("/produits/brouillon", <Route path="/produits/:slug" element={<ProductDetailPage />} />);
    expect(await screen.findByRole("heading", { name: "Page introuvable" })).toBeInTheDocument();
  });
});

describe("formulaire de contact", () => {
  const route = <Route path="/contact" element={<ContactPage />} />;

  it("bloque l'envoi et affiche une erreur précise par champ", async () => {
    mockApi(() => undefined);
    const user = userEvent.setup();
    renderAt("/contact", route);

    await user.type(screen.getByLabelText("Téléphone"), "abc");
    await user.click(screen.getByRole("button", { name: "Envoyer ma demande" }));

    expect(await screen.findByText("Votre nom est requis.")).toBeInTheDocument();
    expect(screen.getByText("Numéro de téléphone invalide.")).toBeInTheDocument();
    expect(screen.getByText("Choisissez un type de projet.")).toBeInTheDocument();
    expect(screen.getByText("Votre accord est nécessaire pour que nous puissions vous recontacter.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom complet")).toHaveAttribute("aria-invalid", "true");
    expect(posted).toHaveLength(0);
  });

  it("enregistre la demande puis propose de poursuivre sur WhatsApp, sans prétendre l'avoir envoyée", async () => {
    mockApi((url, init) => (url === "/api/public/contact-requests" && init?.method === "POST" ? { status: 201, body: { id: "r1", createdAt: "2026-01-01T00:00:00Z" } } : undefined));
    const user = userEvent.setup();
    renderAt("/contact?sujet=Cuisines%20modernes", route);

    expect(screen.getByLabelText("Message")).toHaveValue("Bonjour, je souhaite un devis pour : Cuisines modernes.\n");
    await user.type(screen.getByLabelText("Nom complet"), "Client Test");
    await user.type(screen.getByLabelText("Téléphone"), "0612345678");
    await user.selectOptions(screen.getByLabelText("Type de projet"), "CUISINE");
    await user.type(screen.getByLabelText(/Ville ou quartier/), "Maârif");

    // Sans consentement, rien n'est envoyé.
    await user.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    expect(await screen.findByText("Votre accord est nécessaire pour que nous puissions vous recontacter.")).toBeInTheDocument();
    expect(posted).toHaveLength(0);

    await user.click(screen.getByLabelText(/J'accepte d'être recontacté/));
    await user.click(screen.getByRole("button", { name: "Envoyer ma demande" }));

    const success = await screen.findByTestId("contact-success");
    expect(within(success).getByRole("heading", { name: "Demande enregistrée" })).toBeInTheDocument();
    expect(success).toHaveTextContent("Votre demande a bien été enregistrée. Vous pouvez également nous contacter directement sur WhatsApp.");
    // Aucune promesse non confirmée par l'entreprise.
    expect(success).not.toHaveTextContent(/gratuit|24 ?h/i);
    expect(posted).toHaveLength(1);
    expect(posted[0].body).toMatchObject({ name: "Client Test", phone: "0612345678", email: "", needType: "CUISINE", location: "Maârif", budget: "", consent: true });

    const followUp = within(success).getByTestId("contact-followup-whatsapp");
    expect(followUp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/212661568771\?text=/);
  });

  it("affiche les erreurs renvoyées par le serveur", async () => {
    mockApi((url, init) =>
      url === "/api/public/contact-requests" && init?.method === "POST"
        ? { status: 400, body: { code: "VALIDATION_ERROR", message: "Certains champs sont invalides.", fieldErrors: { phone: "Numéro refusé par le serveur." } } }
        : undefined,
    );
    const user = userEvent.setup();
    renderAt("/contact", route);
    await user.type(screen.getByLabelText("Nom complet"), "Client Test");
    await user.type(screen.getByLabelText("Téléphone"), "0612345678");
    await user.selectOptions(screen.getByLabelText("Type de projet"), "AUTRE");
    await user.type(screen.getByLabelText("Message"), "Bonjour, une question.");
    await user.click(screen.getByLabelText(/J'accepte d'être recontacté/));
    await user.click(screen.getByRole("button", { name: "Envoyer ma demande" }));

    expect(await screen.findByText("Numéro refusé par le serveur.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("contact-success")).not.toBeInTheDocument());
  });
});
