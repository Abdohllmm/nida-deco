import { MapPin, Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { formatPhone } from "../lib/format";
import { useSettings } from "../lib/queries";
import { GENERIC_MESSAGE, buildWhatsAppUrl } from "../lib/whatsapp";
import { InstagramIcon, WhatsAppIcon } from "./icons";
import { QuoteButton, QuoteProvider } from "./QuoteDialog";

const NAVIGATION = [
  { to: "/", label: "Accueil", end: true },
  { to: "/services", label: "Services" },
  { to: "/realisations", label: "Réalisations" },
  { to: "/produits", label: "Produits" },
  { to: "/a-propos", label: "À propos" },
  { to: "/contact", label: "Contact" },
];

// Domaines d'intervention indiqués par l'entreprise, rappelés dans le pied de page.
const SERVICE_LINKS = ["Cuisines modernes", "Dressings", "Placards", "Aménagement intérieur", "Menuiserie bois et aluminium"];

function Brand({ light = false }: { light?: boolean }) {
  const { data: settings } = useSettings();
  const name = settings?.displayName || "NIDAL DECO";
  return (
    <Link to="/" className="flex shrink-0 items-center gap-3" aria-label={`${name} — retour à l'accueil`}>
      {/* Logo fourni par l'entreprise ; remplaçable dans Administration > Paramètres. */}
      <img src={settings?.logo?.url ?? "/logo.png"} alt="" width={48} height={48} className="size-11 rounded-full object-cover sm:size-12" />
      <span className={`font-display text-lg font-extrabold tracking-[0.08em] sm:text-xl ${light ? "text-white" : "text-ink"}`}>{name}</span>
    </Link>
  );
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  whatsapp: string | null;
}

/** Menu mobile plein écran : liens larges, devis et WhatsApp toujours visibles en bas. */
function MobileMenu({ open, onClose, whatsapp }: MobileMenuProps) {
  // Le défilement de la page est bloqué tant que le menu est ouvert.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div id="menu-mobile" className="fixed inset-x-0 top-[calc(4rem+3px)] bottom-0 z-40 flex flex-col overflow-y-auto bg-ink text-white lg:hidden">
      <nav aria-label="Navigation principale" className="container-page flex-1 py-4">
        <ul>
          {NAVIGATION.map((item) => (
            <li key={item.to} className="border-b border-white/10">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex items-center justify-between py-4 font-display text-2xl font-extrabold ${isActive ? "text-gold-light" : "text-white"}`}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="container-page flex flex-col gap-3 pt-2 pb-8">
        <QuoteButton className="btn-gold w-full" onOpen={onClose} />
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-light w-full">
            <WhatsAppIcon className="size-5" />
            Écrire sur WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { data: settings } = useSettings();
  const whatsapp = buildWhatsAppUrl(settings?.whatsappNumber, GENERIC_MESSAGE);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled || open ? "shadow-[0_6px_24px_rgb(0_0_0/0.08)]" : ""}`}>
      {/* Filet doré : rappel discret du logo. */}
      <div className="h-[3px] bg-gold" aria-hidden="true" />
      <div className="container-page flex h-16 items-center justify-between gap-6 lg:h-20">
        <Brand />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigation principale">
          {NAVIGATION.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative py-2 font-display text-sm font-bold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-gold after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100 ${
                  isActive ? "text-ink after:scale-x-100" : "text-anthracite/75 after:scale-x-0"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-12 items-center justify-center rounded-md border border-line text-ink transition-colors hover:border-whatsapp hover:bg-whatsapp"
              aria-label="Écrire sur WhatsApp (nouvel onglet)"
            >
              <WhatsAppIcon className="size-5" />
            </a>
          )}
          <QuoteButton />
        </div>
        <button
          type="button"
          className="-mr-2 flex size-11 items-center justify-center rounded-md text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-7" aria-hidden="true" /> : <Menu className="size-7" aria-hidden="true" />}
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
        </button>
      </div>
      <MobileMenu open={open} onClose={() => setOpen(false)} whatsapp={whatsapp} />
    </header>
  );
}

function Footer() {
  const { data: settings } = useSettings();
  const whatsapp = buildWhatsAppUrl(settings?.whatsappNumber, GENERIC_MESSAGE);
  const name = settings?.displayName || "NIDAL DECO";
  const link = "text-white/70 transition-colors hover:text-gold-light";
  const heading = "mb-5 font-display text-xs font-bold tracking-[0.18em] text-gold-light uppercase";
  return (
    // Marge basse supplémentaire sur mobile : le bouton WhatsApp flottant ne recouvre pas les derniers liens.
    <footer className="bg-ink pb-20 text-white sm:pb-0">
      <div className="container-page grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Brand light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">
            Aménagement intérieur et menuiserie sur mesure{settings?.city ? ` à ${settings.city}` : ""} : cuisines, dressings, placards et mobilier.
          </p>
          {settings?.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex size-11 items-center justify-center rounded-md border border-white/20 text-white transition-colors hover:border-gold hover:text-gold-light"
              aria-label="Instagram (nouvel onglet)"
            >
              <InstagramIcon className="size-5" />
            </a>
          )}
        </div>
        <nav aria-label="Pied de page — navigation">
          <p className={heading}>Navigation</p>
          <ul className="space-y-3 text-sm">
            {NAVIGATION.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Pied de page — services">
          <p className={heading}>Services</p>
          <ul className="space-y-3 text-sm">
            {SERVICE_LINKS.map((label) => (
              <li key={label}>
                <Link to="/services" className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className={heading}>Contact</p>
          <ul className="space-y-4 text-sm">
            {settings?.city && (
              <li className="flex items-start gap-3 text-white/70">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
                <span>
                  {settings.address && <span className="block">{settings.address}</span>}
                  {settings.city}, Maroc
                </span>
              </li>
            )}
            {[settings?.phone, settings?.secondaryPhone].filter(Boolean).map((phone) => (
              <li key={phone}>
                <a href={`tel:${phone!.replace(/\s+/g, "")}`} className={`flex items-center gap-3 ${link}`}>
                  <Phone className="size-4 shrink-0 text-gold" aria-hidden="true" />
                  {formatPhone(phone!)}
                </a>
              </li>
            ))}
            {whatsapp && (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 ${link}`}>
                  <WhatsAppIcon className="size-4 shrink-0 text-gold" />
                  WhatsApp
                </a>
              </li>
            )}
            {settings?.instagramUrl && (
              <li>
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 ${link}`}>
                  <InstagramIcon className="size-4 shrink-0 text-gold" />
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-6 text-xs text-white/55">
          <p>
            © {new Date().getFullYear()} {name}. Tous droits réservés.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link to="/mentions-legales" className="hover:text-gold-light">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link to="/politique-de-confidentialite" className="hover:text-gold-light">
                Politique de confidentialité
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppFab() {
  const { data: settings } = useSettings();
  const href = buildWhatsAppUrl(settings?.whatsappNumber, GENERIC_MESSAGE);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-whatsapp text-ink shadow-[0_8px_24px_rgb(0_0_0/0.25)] transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
      aria-label="Discuter sur WhatsApp (nouvel onglet)"
      data-testid="whatsapp-fab"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();

  // Retour en haut de page à chaque changement de page (pas lors d'un simple changement de filtre).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <QuoteProvider>
      <div className="flex min-h-screen flex-col">
        <a href="#contenu" className="btn-gold sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]">
          Aller au contenu
        </a>
        <Header />
        <main id="contenu" className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <WhatsAppFab />
      </div>
    </QuoteProvider>
  );
}
