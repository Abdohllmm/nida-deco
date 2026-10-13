import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { ProjectCard } from "../components/cards";
import { PageHero } from "../components/HeroBanner";
import { QuoteButton } from "../components/QuoteDialog";
import { CardGridSkeleton, EmptyState, ErrorState, Pagination } from "../components/ui";
import { api, toQuery } from "../lib/api";
import { useProjectCategories } from "../lib/queries";
import { useSeo } from "../lib/seo";
import type { Page, ProjectSummary } from "../lib/types";

const PAGE_SIZE = 9;
// Proportions alternées : donnent à la galerie son rythme en colonnes décalées.
const RATIOS = ["aspect-[4/3]", "aspect-[4/5]", "aspect-square", "aspect-[4/5]", "aspect-[4/3]", "aspect-square"];

export default function ProjectsPage() {
  useSeo({ title: "Nos réalisations", description: "Aperçu des projets d'aménagement intérieur et de menuiserie sur mesure." });
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("type") ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const categories = useProjectCategories();

  const projects = useQuery({
    queryKey: ["projects", { category, page }],
    queryFn: () => api.get<Page<ProjectSummary>>("/api/public/projects" + toQuery({ category, page: page - 1, size: PAGE_SIZE })),
    placeholderData: keepPreviousData,
  });

  const select = (slug: string) => setSearchParams(slug ? { type: slug } : {}, { preventScrollReset: true });

  return (
    <>
      <PageHero image="/images/banner-realisations.jpg" eyebrow="Réalisations" title="Nos réalisations" crumbs={[{ label: "Accueil", to: "/" }, { label: "Réalisations" }]}>
        Une sélection de projets d'aménagement et de mobilier. Un projet vous inspire ? Parlons du vôtre.
      </PageHero>

      <section className="section">
        <div className="container-page">
          {categories.data && categories.data.length > 0 && (
            <div className="no-scrollbar -mx-5 mb-10 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrer par type de projet">
              <button type="button" className="chip" aria-pressed={category === ""} onClick={() => select("")}>
                Tous les projets
              </button>
              {categories.data.map((item) => (
                <button key={item.id} type="button" className="chip" aria-pressed={category === item.slug} onClick={() => select(item.slug)}>
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {projects.isPending && <CardGridSkeleton />}
          {projects.isError && <ErrorState error={projects.error} onRetry={() => projects.refetch()} />}
          {projects.data && projects.data.items.length === 0 && (
            <EmptyState
              title={category ? "Aucune réalisation de ce type pour le moment" : "Aucune réalisation publiée pour le moment"}
              action={
                category ? (
                  <button type="button" className="btn-secondary" onClick={() => select("")}>
                    Voir toutes les réalisations
                  </button>
                ) : (
                  <QuoteButton />
                )
              }
            >
              Les projets seront ajoutés ici au fur et à mesure.
            </EmptyState>
          )}
          {projects.data && projects.data.items.length > 0 && (
            // Galerie en colonnes : les cartes de hauteurs différentes s'emboîtent sans trous.
            <div className={`columns-1 gap-5 sm:columns-2 lg:columns-3 ${projects.isPlaceholderData ? "opacity-60" : ""}`}>
              {projects.data.items.map((project, index) => (
                <ProjectCard key={project.id} project={project} ratio={RATIOS[index % RATIOS.length]} className="mb-5 break-inside-avoid" />
              ))}
            </div>
          )}
          {projects.data && (
            <Pagination
              page={page}
              totalPages={projects.data.totalPages}
              onChange={(next) => {
                setSearchParams({ ...(category ? { type: category } : {}), ...(next > 1 ? { page: String(next) } : {}) });
                window.scrollTo({ top: 0 });
              }}
            />
          )}
        </div>
      </section>
    </>
  );
}
