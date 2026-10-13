import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useParams } from "react-router";
import { DetailError, DetailSkeleton } from "../components/DetailStates";
import { Gallery, mergeImages } from "../components/Gallery";
import { PageHero } from "../components/HeroBanner";
import { MediaImage } from "../components/MediaImage";
import { QuoteButton } from "../components/QuoteDialog";
import { DemoBadge } from "../components/ui";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { api } from "../lib/api";
import { currentPageUrl, useSeo } from "../lib/seo";
import type { ProjectDetail } from "../lib/types";

export default function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const query = useQuery({
    queryKey: ["project", slug],
    queryFn: () => api.get<ProjectDetail>(`/api/public/projects/${encodeURIComponent(slug)}`),
    retry: false,
  });
  const project = query.data;
  useSeo({ title: project?.title ?? "Réalisation", description: project?.description.slice(0, 160) });

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <DetailError error={query.error} onRetry={() => query.refetch()} />;
  if (!project) return null;

  const message = [`Bonjour Nidal Deco, je souhaite un projet similaire à : ${project.title}`, `Lien : ${currentPageUrl()}`].join("\n");

  return (
    <article>
      <PageHero
        tall
        image={project.mainImage?.url ?? "/images/banner-realisations.jpg"}
        eyebrow={project.category.name}
        title={project.title}
        crumbs={[{ label: "Accueil", to: "/" }, { label: "Réalisations", to: "/realisations" }, { label: project.title }]}
      >
        {project.location && (
          <p className="flex items-center gap-2">
            <MapPin className="size-5 text-gold-light" aria-hidden="true" />
            {project.location}
          </p>
        )}
      </PageHero>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <Gallery images={mergeImages(project.mainImage, project.gallery)} label={project.title} />
          <div>
            {project.demo && <DemoBadge className="mb-5" />}
            <h2 className="text-3xl leading-tight">Le projet</h2>
            {project.description && <p className="prose-text mt-5 text-base">{project.description}</p>}
            <div className="mt-9 rounded-lg bg-ink p-6 sm:p-7">
              <h2 className="text-xl text-white">Un projet similaire en tête ?</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/75">Décrivez-nous votre espace et vos envies : nous en discutons avec vous.</p>
              <div className="mt-6 flex flex-col gap-3">
                <QuoteButton className="btn-gold w-full" subject={`Projet similaire à « ${project.title} »`}>
                  Réaliser un projet similaire
                </QuoteButton>
                <WhatsAppLink message={message} className="btn-whatsapp w-full" testId="project-whatsapp">
                  En parler sur WhatsApp
                </WhatsAppLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Affiché uniquement si les deux photos ont été fournies pour ce projet. */}
      {project.beforeImage && project.afterImage && (
        <section className="section bg-ivory" aria-labelledby="avant-apres">
          <div className="container-page">
            <p className="eyebrow mb-4">Transformation</p>
            <h2 id="avant-apres" className="mb-10 text-3xl">
              Avant / après
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <figure>
                <MediaImage media={project.beforeImage} fallbackAlt={`${project.title} — avant`} className="rounded-lg" />
                <figcaption className="mt-3 font-display text-sm font-bold">Avant</figcaption>
              </figure>
              <figure>
                <MediaImage media={project.afterImage} fallbackAlt={`${project.title} — après`} className="rounded-lg" />
                <figcaption className="mt-3 font-display text-sm font-bold">Après</figcaption>
              </figure>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
