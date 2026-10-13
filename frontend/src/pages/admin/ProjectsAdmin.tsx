import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";
import { ConfirmDialog } from "../../components/Dialog";
import { useToast } from "../../components/Toast";
import { DemoBadge, EmptyState, ErrorState, Field, Pagination, Skeleton, Spinner, fieldAria } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { SLUG_MESSAGE, SLUG_PATTERN } from "../../lib/productSchema";
import type { Category, Media, Page, ProjectDetail, ProjectSummary, PublicationStatus } from "../../lib/types";
import { AdminHeader, Checkbox, FormSection, StatusBadge, applyServerErrors } from "./common";
import { GalleryField, ImageField } from "./ImagePicker";

function useRefresh() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["admin"] });
    client.invalidateQueries({ queryKey: ["projects"] });
    client.invalidateQueries({ queryKey: ["project"] });
  };
}

export function ProjectsAdminPage() {
  const toast = useToast();
  const refresh = useRefresh();
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ProjectSummary | null>(null);
  const projects = useQuery({
    queryKey: ["admin", "projects", page],
    queryFn: () => api.get<Page<ProjectSummary>>(`/api/admin/projects?page=${page - 1}&size=20`),
    placeholderData: keepPreviousData,
  });

  const setPublication = useMutation({
    mutationFn: ({ id, next }: { id: string; next: PublicationStatus }) => api.patch(`/api/admin/projects/${id}/status`, { status: next }),
    onSuccess: (_data, { next }) => {
      toast.success(next === "PUBLISHED" ? "Réalisation publiée." : "Réalisation dépubliée.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/projects/${id}`),
    onSuccess: () => {
      toast.success("Réalisation supprimée.");
      setToDelete(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const data = projects.data;

  return (
    <>
      <AdminHeader
        title="Réalisations"
        description="Projets présentés sur le site. Publiez uniquement des photos de vos propres réalisations."
        action={
          <Link to="/admin/realisations/nouveau" className="btn-primary">
            <Plus className="size-4" aria-hidden="true" />
            Ajouter une réalisation
          </Link>
        }
      />
      {projects.isPending && <Skeleton className="h-64 w-full" />}
      {projects.isError && <ErrorState error={projects.error} onRetry={() => projects.refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState
          title="Aucune réalisation pour le moment"
          action={
            <Link to="/admin/realisations/nouveau" className="btn-primary">
              Ajouter une réalisation
            </Link>
          }
        >
          Ajoutez vos projets terminés pour les présenter aux visiteurs.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <ul className="card divide-y divide-line">
          {data.items.map((project) => {
            const published = project.status === "PUBLISHED";
            return (
              <li key={project.id} className="flex flex-wrap items-center gap-4 p-4">
                {project.mainImage ? <img src={project.mainImage.url} alt="" loading="lazy" className="size-16 shrink-0 rounded-sm object-cover" /> : <div className="size-16 shrink-0 rounded-sm bg-sand" aria-hidden="true" />}
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium">{project.title}</p>
                  <p className="text-sm text-muted">
                    {project.category.name}
                    {project.location ? ` · ${project.location}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusBadge status={project.status} />
                    {project.demo && <DemoBadge />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" className="btn-ghost" disabled={setPublication.isPending} onClick={() => setPublication.mutate({ id: project.id, next: published ? "DRAFT" : "PUBLISHED" })}>
                    {published ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    {published ? "Dépublier" : "Publier"}
                    <span className="sr-only"> {project.title}</span>
                  </button>
                  <Link to={`/admin/realisations/${project.id}`} className="btn-ghost px-2" aria-label={`Modifier ${project.title}`} title="Modifier">
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <button type="button" className="btn-ghost px-2 hover:text-danger" onClick={() => setToDelete(project)} aria-label={`Supprimer ${project.title}`} title="Supprimer">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}
      <ConfirmDialog open={toDelete !== null} title="Supprimer cette réalisation ?" pending={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete.id)}>
        « {toDelete?.title} » sera définitivement supprimée. Ses images restent disponibles dans la médiathèque.
      </ConfirmDialog>
    </>
  );
}

const schema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(180, "180 caractères maximum."),
  slug: z.string().trim().max(200, "200 caractères maximum.").regex(SLUG_PATTERN, SLUG_MESSAGE),
  categoryId: z.string().min(1, "Le type de projet est requis."),
  description: z.string().max(10000, "10 000 caractères maximum."),
  location: z.string().max(160, "160 caractères maximum."),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  demo: z.boolean(),
});
type ProjectForm = z.infer<typeof schema>;
const EMPTY: ProjectForm = { title: "", slug: "", categoryId: "", description: "", location: "", status: "DRAFT", demo: false };

export function ProjectFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const [mainImage, setMainImage] = useState<Media | null>(null);
  const [gallery, setGallery] = useState<Media[]>([]);
  const [before, setBefore] = useState<Media | null>(null);
  const [after, setAfter] = useState<Media | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ["admin", "project-categories"], queryFn: () => api.get<Category[]>("/api/admin/project-categories") });
  const project = useQuery({ queryKey: ["admin", "project", id], queryFn: () => api.get<ProjectDetail>(`/api/admin/projects/${id}`), enabled: editing, retry: false });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProjectForm>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    const data = project.data;
    if (data) {
      reset({ title: data.title, slug: data.slug, categoryId: data.category.id, description: data.description, location: data.location ?? "", status: data.status, demo: data.demo });
      setMainImage(data.mainImage);
      setGallery(data.gallery);
      setBefore(data.beforeImage);
      setAfter(data.afterImage);
    }
  }, [project.data, reset]);

  const save = useMutation({
    mutationFn: (values: ProjectForm) => {
      const payload = {
        ...values,
        mainImageId: mainImage?.id ?? null,
        galleryIds: gallery.map((item) => item.id),
        beforeImageId: before?.id ?? null,
        afterImageId: after?.id ?? null,
      };
      return editing ? api.put(`/api/admin/projects/${id}`, payload) : api.post("/api/admin/projects", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Réalisation enregistrée." : "Réalisation créée.");
      refresh();
      navigate("/admin/realisations");
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, Object.keys(EMPTY))),
  });

  if (editing && project.isError) return <ErrorState error={project.error} onRetry={() => project.refetch()} />;
  if (editing && project.isPending) return <Skeleton className="h-96 w-full" />;
  const title = watch("title");
  const noCategory = categories.data !== undefined && categories.data.length === 0;
  const incompletePair = (before === null) !== (after === null);

  return (
    <>
      <Link to="/admin/realisations" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux réalisations
      </Link>
      <AdminHeader title={editing ? "Modifier la réalisation" : "Nouvelle réalisation"} />
      {noCategory && (
        <p role="alert" className="mb-6 rounded-sm border border-gold/60 bg-gold/10 px-4 py-3 text-sm">
          Créez d'abord un type de réalisation dans{" "}
          <Link to="/admin/categories" className="link">
            Catégories
          </Link>
          .
        </p>
      )}
      <form
        onSubmit={handleSubmit((values) => {
          if (incompletePair) {
            setFormError("Renseignez les deux images « avant » et « après », ou aucune.");
            return;
          }
          setFormError(null);
          save.mutate(values);
        })}
        noValidate
        className="space-y-6"
      >
        <FormSection title="Informations">
          <Field label="Titre" htmlFor="project-title" error={errors.title?.message} className="sm:col-span-2">
            <input type="text" className="field-input" {...fieldAria("project-title", errors.title?.message)} {...register("title")} />
          </Field>
          <Field label="Type de projet" htmlFor="project-category" error={errors.categoryId?.message}>
            <select className="field-input" {...fieldAria("project-category", errors.categoryId?.message)} {...register("categoryId")}>
              <option value="">Sélectionnez…</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Localisation" htmlFor="project-location" optional error={errors.location?.message} hint="Par exemple un quartier ou une ville.">
            <input type="text" className="field-input" {...fieldAria("project-location", errors.location?.message, "hint")} {...register("location")} />
          </Field>
          <Field label="Slug (adresse de la page)" htmlFor="project-slug" optional error={errors.slug?.message} hint="Laissez vide pour le générer à partir du titre." className="sm:col-span-2">
            <input type="text" className="field-input" {...fieldAria("project-slug", errors.slug?.message, "hint")} {...register("slug")} />
          </Field>
          <Field label="Description" htmlFor="project-description" optional error={errors.description?.message} className="sm:col-span-2">
            <textarea rows={6} className="field-input resize-y" {...fieldAria("project-description", errors.description?.message)} {...register("description")} />
          </Field>
        </FormSection>

        <section className="card space-y-6 p-5 sm:p-6">
          <h2 className="text-2xl">Images</h2>
          <ImageField label="Image principale" hint="JPEG, PNG ou WebP, 8 Mo maximum." value={mainImage} onChange={setMainImage} defaultAlt={title} />
          <GalleryField label="Galerie" value={gallery} onChange={setGallery} defaultAlt={title} max={30} />
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-2xl">Avant / après (facultatif)</h2>
          <p className="mt-1 text-sm text-muted">À renseigner uniquement avec deux vraies photos du même espace. Le comparatif n'apparaît que si les deux images sont présentes.</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <ImageField label="Photo « avant »" value={before} onChange={setBefore} defaultAlt={`${title} — avant`} />
            <ImageField label="Photo « après »" value={after} onChange={setAfter} defaultAlt={`${title} — après`} />
          </div>
        </section>

        <FormSection title="Publication">
          <Field label="Statut" htmlFor="project-status" error={errors.status?.message}>
            <select className="field-input" {...fieldAria("project-status", errors.status?.message)} {...register("status")}>
              <option value="DRAFT">Brouillon (non visible sur le site)</option>
              <option value="PUBLISHED">Publié</option>
            </select>
          </Field>
          <div className="self-end">
            <Checkbox id="project-demo" label="Contenu de démonstration" hint="Affiche un badge « Démonstration » sur le site." {...register("demo")} />
          </div>
        </FormSection>

        {formError && (
          <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={save.isPending || noCategory}>
            {save.isPending && <Spinner />}
            {editing ? "Enregistrer" : "Créer la réalisation"}
          </button>
          <Link to="/admin/realisations" className="btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </>
  );
}
