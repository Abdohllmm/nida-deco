import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useParams } from "react-router";
import { ServiceCard } from "../components/cards";
import { DetailError, DetailSkeleton } from "../components/DetailStates";
import { Gallery, mergeImages } from "../components/Gallery";
import { PageHero } from "../components/HeroBanner";
import { QuoteButton } from "../components/QuoteDialog";
import { DemoBadge } from "../components/ui";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { api } from "../lib/api";
import { currentPageUrl, useSeo } from "../lib/seo";
import type { ServiceDetail, ServiceSummary } from "../lib/types";
import { buildProjectMessage } from "../lib/whatsapp";

export default function ServiceDetailPage() {
  const { slug = "" } = useParams();
  const query = useQuery({
    queryKey: ["service", slug],
    queryFn: () => api.get<ServiceDetail>(`/api/public/services/${encodeURIComponent(slug)}`),
    retry: false,
  });
  const others = useQuery({ queryKey: ["services"], queryFn: () => api.get<ServiceSummary[]>("/api/public/services") });
  const service = query.data;
  useSeo({ title: service?.title ?? "Service", description: service?.shortDescription });

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <DetailError error={query.error} onRetry={() => query.refetch()} />;
  if (!service) return null;

  const related = (others.data ?? []).filter((item) => item.id !== service.id).slice(0, 3);
  const images = mergeImages(service.mainImage, service.gallery);

  return (
    <article>
      <PageHero
        tall
        image={service.mainImage?.url ?? "/images/banner-services.jpg"}
        eyebrow="Service"
        title={service.title}
        crumbs={[{ label: "Accueil", to: "/" }, { label: "Services", to: "/services" }, { label: service.title }]}
        actions={
          <>
            <QuoteButton className="btn-gold" subject={service.title} />
            <WhatsAppLink message={buildProjectMessage(service.title, currentPageUrl())} testId="service-whatsapp">
              Discuter de mon projet
            </WhatsAppLink>
          </>
        }
      >
        {service.shortDescription}
      </PageHero>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Gallery images={images} label={service.title} />
          <div>
            {service.demo && <DemoBadge className="mb-5" />}
            <h2 className="text-3xl leading-tight">Présentation</h2>
            {service.description && <p className="prose-text mt-5 text-base">{service.description}</p>}

            {service.includedItems.length > 0 && (
              <div className="mt-9 rounded-lg bg-ivory p-6 sm:p-7">
                <h2 className="text-xl">Ce que nous pouvons réaliser</h2>
                <ul className="mt-5 space-y-3.5">
                  {service.includedItems.map((item) => (
                    <li key={item} className="flex items-start gap-3.5 font-medium">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-gold-light">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-6 text-sm text-muted">Le bouton WhatsApp ouvre une conversation avec un message prérempli, que vous pouvez modifier avant de l'envoyer.</p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section bg-ivory" aria-labelledby="decouvrez-aussi">
          <div className="container-page">
            <p className="eyebrow mb-4">Services</p>
            <h2 id="decouvrez-aussi" className="mb-10 text-3xl">
              Découvrez aussi
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {related.map((item) => (
                <ServiceCard key={item.id} service={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
