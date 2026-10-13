import { useQuery } from "@tanstack/react-query";
import { ServiceCard } from "../components/cards";
import { PageHero } from "../components/HeroBanner";
import { QuoteButton } from "../components/QuoteDialog";
import { CardGridSkeleton, EmptyState, ErrorState } from "../components/ui";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";
import type { ServiceSummary } from "../lib/types";
import { GENERIC_MESSAGE } from "../lib/whatsapp";

export default function ServicesPage() {
  useSeo({
    title: "Nos services",
    description: "Cuisines modernes, dressings, placards, aménagement intérieur, menuiserie bois et aluminium à Casablanca.",
  });
  const services = useQuery({ queryKey: ["services"], queryFn: () => api.get<ServiceSummary[]>("/api/public/services") });

  return (
    <>
      <PageHero image="/images/banner-services.jpg" eyebrow="Services" title="Nos services" crumbs={[{ label: "Accueil", to: "/" }, { label: "Services" }]}>
        Aménagement intérieur et menuiserie sur mesure : chaque prestation est étudiée selon votre espace et vos usages.
      </PageHero>

      <section className="section bg-ivory">
        <div className="container-page">
          {services.isPending && <CardGridSkeleton />}
          {services.isError && <ErrorState error={services.error} onRetry={() => services.refetch()} />}
          {services.data && services.data.length === 0 && (
            <EmptyState title="Aucun service publié pour le moment" action={<QuoteButton />}>
              Les prestations seront présentées ici prochainement. Vous pouvez dès maintenant nous décrire votre projet.
            </EmptyState>
          )}
          {services.data && services.data.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {services.data.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-ink">
        <div className="container-page flex flex-wrap items-center justify-between gap-8 py-14">
          <div className="max-w-xl">
            <h2 className="text-2xl text-white sm:text-3xl">Un projet en tête ?</h2>
            <p className="mt-3 text-white/75">Décrivez-nous votre besoin : nous en discutons avec vous pour vous faire une proposition adaptée.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuoteButton className="btn-gold" />
            <WhatsAppLink message={GENERIC_MESSAGE}>Écrire sur WhatsApp</WhatsAppLink>
          </div>
        </div>
      </section>
    </>
  );
}
