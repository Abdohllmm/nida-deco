import { ArrowRight, Hammer, Ruler, Sofa } from "lucide-react";
import { Link } from "react-router";
import { PageHero } from "../components/HeroBanner";
import { QuoteButton } from "../components/QuoteDialog";
import { ErrorState, Skeleton } from "../components/ui";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { useSettings } from "../lib/queries";
import { useSeo } from "../lib/seo";
import { GENERIC_MESSAGE } from "../lib/whatsapp";

// Prestations indiquées par l'entreprise.
const ACTIVITIES = ["Décoration intérieure", "Aménagement clé en main", "Cuisines modernes", "Dressings", "Placards", "Menuiserie bois et aluminium"];

const PILLARS = [
  { icon: Ruler, title: "Sur mesure", text: "Chaque réalisation est conçue selon les dimensions et les contraintes de votre espace." },
  { icon: Sofa, title: "Aménagement complet", text: "Cuisines, dressings, placards et mobilier : un même interlocuteur pour votre intérieur." },
  { icon: Hammer, title: "Menuiserie", text: "Des ouvrages en bois et en aluminium adaptés à votre habitat ou à vos locaux." },
];

export default function AboutPage() {
  const settings = useSettings();
  const s = settings.data;
  useSeo({ title: "À propos", description: "NIDAL DECO, entreprise d'aménagement intérieur et de menuiserie sur mesure basée à Casablanca." });

  return (
    <>
      <PageHero image="/images/banner-about.jpg" eyebrow="À propos" title={s?.displayName || "NIDAL DECO"} crumbs={[{ label: "Accueil", to: "/" }, { label: "À propos" }]}>
        Aménagement intérieur et menuiserie sur mesure{s?.city ? ` à ${s.city}` : ""}.
      </PageHero>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
          <div>
            <p className="eyebrow mb-4">Notre activité</p>
            <h2 className="text-3xl leading-tight sm:text-4xl">Un accompagnement de l'idée à la réalisation</h2>
            {settings.isPending && (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            )}
            {settings.isError && (
              <div className="mt-6">
                <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
              </div>
            )}
            {s?.aboutText && <p className="prose-text mt-6 text-lg">{s.aboutText}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/services" className="btn-primary">
                Voir nos services
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link to="/realisations" className="btn-secondary">
                Voir nos réalisations
              </Link>
            </div>
          </div>

          <aside className="h-fit rounded-lg bg-ink p-7 sm:p-8">
            <h2 className="text-xl text-white">Nos prestations</h2>
            <ul className="mt-5 space-y-3.5">
              {ACTIVITIES.map((activity) => (
                <li key={activity} className="flex items-center gap-3.5 text-white/85">
                  <span className="h-px w-5 shrink-0 bg-gold" aria-hidden="true" />
                  {activity}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              <QuoteButton className="btn-gold w-full" />
              <WhatsAppLink message={GENERIC_MESSAGE} className="btn-whatsapp w-full">
                Écrire sur WhatsApp
              </WhatsAppLink>
            </div>
          </aside>
        </div>
      </section>

      <section className="section bg-ivory">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg bg-white p-7 shadow-[0_1px_3px_rgb(0_0_0/0.08)]">
              <span className="flex size-12 items-center justify-center rounded-md bg-ink text-gold-light">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
