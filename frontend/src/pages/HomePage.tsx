import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Hammer, MapPin, Ruler, Sofa } from "lucide-react";
import { Link } from "react-router";
import { ProductCard, ProjectCard, ServiceCard } from "../components/cards";
import { ContactInfo } from "../components/ContactInfo";
import { QuoteButton } from "../components/QuoteDialog";
import { QuoteForm } from "../components/QuoteForm";
import { CardGridSkeleton, ErrorState, SectionHeading, Skeleton } from "../components/ui";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { api } from "../lib/api";
import { useSettings } from "../lib/queries";
import { useSeo } from "../lib/seo";
import type { Page, ProductSummary, ProjectSummary, ServiceSummary } from "../lib/types";
import { GENERIC_MESSAGE } from "../lib/whatsapp";

// Éléments factuels fournis par l'entreprise : aucun chiffre (années, clients, projets) n'est avancé.
const HIGHLIGHTS = [
  { icon: Sofa, title: "Aménagement intérieur", text: "Cuisines, dressings, placards" },
  { icon: Hammer, title: "Menuiserie", text: "Bois et aluminium" },
  { icon: Ruler, title: "Créations sur mesure", text: "Adaptées à votre espace" },
  { icon: MapPin, title: "Casablanca", text: "Maroc" },
];

const STEPS = [
  { title: "Échange sur votre besoin", text: "Vous nous présentez votre projet, par WhatsApp, par téléphone ou via le formulaire." },
  { title: "Étude de votre espace et de vos attentes", text: "Nous précisons ensemble les dimensions, les usages, le style et les matériaux souhaités." },
  { title: "Proposition adaptée à votre projet", text: "Nous vous présentons une proposition correspondant à votre demande." },
  { title: "Réalisation et suivi", text: "Une fois la proposition validée, nous convenons ensemble des modalités de réalisation." },
];

const VALUES = ["Un projet pensé selon votre espace", "Le style et les matériaux que vous souhaitez", "Des usages adaptés à votre quotidien"];

function arrowLink(to: string, label: string, light = false) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2 font-display text-sm font-bold ${light ? "text-white hover:text-gold-light" : "text-ink hover:text-gold-dark"}`}>
      {label}
      <ArrowRight className="size-4 text-gold transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}

export default function HomePage() {
  const settings = useSettings();
  const services = useQuery({
    queryKey: ["services", { featured: true }],
    queryFn: () => api.get<ServiceSummary[]>("/api/public/services?featured=true"),
  });
  const projects = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: () => api.get<Page<ProjectSummary>>("/api/public/projects?size=5"),
  });
  const products = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => api.get<Page<ProductSummary>>("/api/public/products?featured=true&size=4"),
  });
  const s = settings.data;
  const name = s?.displayName || "NIDAL DECO";
  // Paramètres connus, ou en échec : on affiche alors les textes et l'image par défaut.
  const settingsDone = !settings.isPending;

  useSeo({ title: "Aménagement intérieur et menuiserie sur mesure à Casablanca", description: s?.heroSubtitle });

  return (
    <>
      {/* 1 — Hero : panneau sombre et grande photo, sans illustration. */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div className="lg:grid lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Le texte s'aligne sur la grille du site, quelle que soit la largeur de l'écran. */}
          <div className="relative z-10 flex items-center px-5 py-14 sm:px-8 sm:py-20 lg:py-24 lg:pr-16 lg:pl-[max(2rem,calc((100vw-1320px)/2+2rem))]">
            <div className="w-full max-w-xl animate-rise">
              <p className="eyebrow-light mb-6">
                {name}
                {s?.city ? ` · ${s.city}` : ""}
              </p>
              {settingsDone ? (
                <h1 className="text-4xl leading-[1.08] text-white sm:text-5xl xl:text-[3.5rem]">{s?.heroTitle || "Votre intérieur, pensé et réalisé sur mesure."}</h1>
              ) : (
                <Skeleton className="h-32 w-full bg-white/10" />
              )}
              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
                {s?.heroSubtitle || "Cuisines modernes, dressings, placards, mobilier et aménagements intérieurs adaptés à vos besoins."}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <QuoteButton className="btn-gold" />
                <Link to="/realisations" className="btn-light">
                  Découvrir nos réalisations
                </Link>
              </div>
            </div>
          </div>
          <div className="relative h-72 sm:h-96 lg:h-auto">
            {/* Rendue une fois l'image choisie connue : sinon l'image par défaut serait téléchargée
                puis aussitôt remplacée. Pas de lazy-load : c'est l'image principale. */}
            {settingsDone && (
              <img
                src={s?.heroImage?.url ?? "/images/hero.jpg"}
                alt={s?.heroImage?.alt || "Cuisine moderne aménagée sur mesure"}
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent lg:bg-gradient-to-r lg:from-ink lg:via-ink/15 lg:to-transparent" aria-hidden="true" />
            <div
              // Sur mobile, la carte laisse la place du bouton WhatsApp flottant à droite.
              className="absolute right-24 bottom-5 left-5 flex items-center gap-4 rounded-lg bg-white p-4 shadow-xl sm:right-8 sm:bottom-8 sm:left-auto sm:max-w-xs">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-ink text-gold-light">
                <Ruler className="size-6" aria-hidden="true" />
              </span>
              <p className="font-display text-sm leading-snug font-extrabold">
                Aménagement intérieur
                <span className="block font-sans text-sm font-normal text-muted">Menuiserie sur mesure</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Barre de confiance : domaines et localisation, sans chiffre inventé. */}
      <section aria-label="NIDAL DECO en bref" className="border-b border-line bg-white">
        <ul className="container-page grid grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className={`flex items-center gap-4 py-6 sm:py-8 ${index % 2 === 1 ? "pl-4 sm:pl-8" : "pr-4"} ${index > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""}`}>
              <Icon className="size-7 shrink-0 text-gold" strokeWidth={1.6} aria-hidden="true" />
              <p className="font-display text-sm leading-snug font-extrabold sm:text-base">
                {title}
                <span className="block font-sans text-xs font-normal text-muted sm:text-sm">{text}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 — Présentation */}
      <section className="section">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="absolute -bottom-4 -left-4 hidden h-2/3 w-2/3 rounded-lg bg-sand sm:block" aria-hidden="true" />
            <img src="/images/about.jpg" alt="Salon contemporain aménagé" loading="lazy" width={960} height={640} className="relative aspect-[4/3] w-full rounded-lg object-cover" />
            <div className="absolute top-6 -right-3 hidden h-24 w-1.5 rounded-full bg-gold sm:block" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow mb-4">{name}</p>
            <h2 className="text-3xl leading-tight sm:text-4xl">{s?.introTitle || "Des solutions adaptées à votre espace"}</h2>
            <p className="prose-text mt-5 text-base">
              {s?.introText ||
                "NIDAL DECO accompagne les particuliers dans leurs projets d'aménagement intérieur, de la définition du besoin à la réalisation. Chaque projet est pensé selon l'espace, le style souhaité et les usages du quotidien."}
            </p>
            <ul className="mt-7 space-y-3.5">
              {VALUES.map((value) => (
                <li key={value} className="flex items-center gap-3.5 font-medium">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-gold-light">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {value}
                </li>
              ))}
            </ul>
            <Link to="/a-propos" className="btn-primary mt-9">
              En savoir plus
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4 — Services */}
      <section className="section bg-ivory" aria-labelledby="accueil-services">
        <div className="container-page">
          <SectionHeading id="accueil-services" eyebrow="Services" title="Nos domaines d'intervention" action={arrowLink("/services", "Tous les services")}>
            Des prestations conçues et réalisées sur mesure, selon votre espace et vos usages.
          </SectionHeading>
          {services.isPending && <CardGridSkeleton count={6} />}
          {services.isError && <ErrorState error={services.error} onRetry={() => services.refetch()} />}
          {services.data && services.data.length === 0 && <p className="text-muted">Les services seront présentés prochainement.</p>}
          {services.data && services.data.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {services.data.slice(0, 6).map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5 — Réalisations : grille éditoriale, une grande image et quatre secondaires. */}
      <section className="section" aria-labelledby="accueil-realisations">
        <div className="container-page">
          <SectionHeading id="accueil-realisations" eyebrow="Réalisations" title="Nos réalisations" action={arrowLink("/realisations", "Voir toutes les réalisations")}>
            Découvrez une sélection de projets d'aménagement et de mobilier réalisés selon les besoins de chaque espace.
          </SectionHeading>
          {projects.isPending && <CardGridSkeleton count={3} />}
          {projects.isError && <ErrorState error={projects.error} onRetry={() => projects.refetch()} />}
          {projects.data && projects.data.items.length === 0 && <p className="text-muted">Les réalisations seront publiées prochainement.</p>}
          {projects.data && projects.data.items.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:auto-rows-[270px] lg:grid-cols-4 lg:gap-5">
              {projects.data.items.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  large={index === 0}
                  ratio="aspect-[4/3] lg:aspect-auto lg:h-full"
                  className={index === 0 ? "sm:col-span-2 lg:row-span-2" : ""}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6 — Processus */}
      <section className="section bg-ivory" aria-labelledby="accueil-processus">
        <div className="container-page">
          <SectionHeading id="accueil-processus" eyebrow="Notre méthode" title="Un projet clair, étape par étape" />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-lg bg-white p-7 shadow-[0_1px_3px_rgb(0_0_0/0.08)]">
                <div className="flex items-center gap-4">
                  <span className="font-display text-4xl leading-none font-extrabold text-gold" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg leading-snug">
                  <span className="sr-only">Étape {index + 1} : </span>
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7 — Produits */}
      <section className="section" aria-labelledby="accueil-produits">
        <div className="container-page">
          <SectionHeading id="accueil-produits" eyebrow="Produits" title="Mobilier disponible à la vente" action={arrowLink("/produits", "Voir tout le catalogue")}>
            Bureaux et mobilier à commander directement par WhatsApp.
          </SectionHeading>
          {products.isPending && <CardGridSkeleton count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />}
          {products.isError && <ErrorState error={products.error} onRetry={() => products.refetch()} />}
          {products.data && products.data.items.length === 0 && <p className="text-muted">Le catalogue sera bientôt disponible.</p>}
          {products.data && products.data.items.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 8 — Appel à l'action */}
      <section className="relative isolate overflow-hidden bg-ink" aria-labelledby="accueil-cta">
        <img src="/images/cta.jpg" alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/60" aria-hidden="true" />
        <div className="container-page flex flex-wrap items-center justify-between gap-10 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow-light mb-4">Votre projet</p>
            <h2 id="accueil-cta" className="text-3xl leading-tight text-white sm:text-4xl">
              Vous avez un projet d'aménagement ?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">Échangez avec {name} pour discuter de votre besoin et obtenir une proposition adaptée.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuoteButton className="btn-gold" />
            <WhatsAppLink message={GENERIC_MESSAGE}>Écrire sur WhatsApp</WhatsAppLink>
          </div>
        </div>
      </section>

      {/* 9 — Contact rapide */}
      <section className="section bg-ivory" aria-labelledby="accueil-contact">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-20">
          <div>
            <p className="eyebrow mb-4">Contact</p>
            <h2 id="accueil-contact" className="text-3xl leading-tight sm:text-4xl">
              Parlons de votre projet
            </h2>
            <p className="mt-4 mb-9 text-muted">Écrivez-nous sur WhatsApp, appelez-nous ou laissez-nous votre demande : nous revenons vers vous pour en discuter.</p>
            <ContactInfo />
          </div>
          <div className="rounded-lg bg-white p-6 shadow-[0_1px_3px_rgb(0_0_0/0.08)] sm:p-9">
            <h3 className="mb-6 text-xl">Demande rapide</h3>
            <QuoteForm idPrefix="accueil" compact />
          </div>
        </div>
      </section>
    </>
  );
}
