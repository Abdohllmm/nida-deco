import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";
import { ConfirmDialog } from "../../components/Dialog";
import { useToast } from "../../components/Toast";
import { Badge, DemoBadge, EmptyState, ErrorState, Field, Skeleton, Spinner, fieldAria } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { SLUG_MESSAGE, SLUG_PATTERN } from "../../lib/productSchema";
import type { Media, PublicationStatus, ServiceDetail, ServiceSummary } from "../../lib/types";
import { AdminHeader, Checkbox, FormSection, StatusBadge, applyServerErrors, linesToList } from "./common";
import { GalleryField, ImageField } from "./ImagePicker";

function useRefresh() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["admin"] });
    client.invalidateQueries({ queryKey: ["services"] });
    client.invalidateQueries({ queryKey: ["service"] });
  };
}

export function ServicesAdminPage() {
  const toast = useToast();
  const refresh = useRefresh();
  const [toDelete, setToDelete] = useState<ServiceSummary | null>(null);
  const services = useQuery({ queryKey: ["admin", "services"], queryFn: () => api.get<ServiceSummary[]>("/api/admin/services") });

  const setPublication = useMutation({
    mutationFn: ({ id, next }: { id: string; next: PublicationStatus }) => api.patch(`/api/admin/services/${id}/status`, { status: next }),
    onSuccess: (_data, { next }) => {
      toast.success(next === "PUBLISHED" ? "Service publié." : "Service dépublié.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/services/${id}`),
    onSuccess: () => {
      toast.success("Service supprimé.");
      setToDelete(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <>
      <AdminHeader
        title="Services"
        description="Prestations d'aménagement et de réalisation sur mesure, affichées dans l'ordre indiqué."
        action={
          <Link to="/admin/services/nouveau" className="btn-primary">
            <Plus className="size-4" aria-hidden="true" />
            Ajouter un service
          </Link>
        }
      />
      {services.isPending && <Skeleton className="h-64 w-full" />}
      {services.isError && <ErrorState error={services.error} onRetry={() => services.refetch()} />}
      {services.data && services.data.length === 0 && (
        <EmptyState
          title="Aucun service pour le moment"
          action={
            <Link to="/admin/services/nouveau" className="btn-primary">
              Ajouter un service
            </Link>
          }
        >
          Présentez vos prestations : cuisines, dressings, placards, menuiserie…
        </EmptyState>
      )}
      {services.data && services.data.length > 0 && (
        <ul className="card divide-y divide-line">
          {services.data.map((service) => {
            const published = service.status === "PUBLISHED";
            return (
              <li key={service.id} className="flex flex-wrap items-center gap-4 p-4">
                {service.mainImage ? <img src={service.mainImage.url} alt="" loading="lazy" className="size-16 shrink-0 rounded-sm object-cover" /> : <div className="size-16 shrink-0 rounded-sm bg-sand" aria-hidden="true" />}
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium">{service.title}</p>
                  <p className="truncate text-sm text-muted">Ordre {service.displayOrder} · {service.shortDescription || "Sans description courte"}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusBadge status={service.status} />
                    {service.featured && <Badge tone="gold">Mis en avant</Badge>}
                    {service.demo && <DemoBadge />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" className="btn-ghost" disabled={setPublication.isPending} onClick={() => setPublication.mutate({ id: service.id, next: published ? "DRAFT" : "PUBLISHED" })}>
                    {published ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    {published ? "Dépublier" : "Publier"}
                    <span className="sr-only"> {service.title}</span>
                  </button>
                  <Link to={`/admin/services/${service.id}`} className="btn-ghost px-2" aria-label={`Modifier ${service.title}`} title="Modifier">
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <button type="button" className="btn-ghost px-2 hover:text-danger" onClick={() => setToDelete(service)} aria-label={`Supprimer ${service.title}`} title="Supprimer">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog open={toDelete !== null} title="Supprimer ce service ?" pending={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete.id)}>
        « {toDelete?.title} » sera définitivement supprimé. Ses images restent disponibles dans la médiathèque.
      </ConfirmDialog>
    </>
  );
}

const schema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(180, "180 caractères maximum."),
  slug: z.string().trim().max(200, "200 caractères maximum.").regex(SLUG_PATTERN, SLUG_MESSAGE),
  shortDescription: z.string().max(300, "300 caractères maximum."),
  description: z.string().max(10000, "10 000 caractères maximum."),
  includedItems: z.string(),
  displayOrder: z.string().trim().regex(/^\d{1,4}$/, "Entrez un nombre entre 0 et 9999."),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.boolean(),
  demo: z.boolean(),
});
type ServiceForm = z.infer<typeof schema>;

const EMPTY: ServiceForm = { title: "", slug: "", shortDescription: "", description: "", includedItems: "", displayOrder: "0", status: "DRAFT", featured: false, demo: false };

export function ServiceFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const toast = useToast();
  const refresh = useRefresh();
  const [mainImage, setMainImage] = useState<Media | null>(null);
  const [gallery, setGallery] = useState<Media[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const service = useQuery({ queryKey: ["admin", "service", id], queryFn: () => api.get<ServiceDetail>(`/api/admin/services/${id}`), enabled: editing, retry: false });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ServiceForm>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    const data = service.data;
    if (data) {
      reset({
        title: data.title,
        slug: data.slug,
        shortDescription: data.shortDescription,
        description: data.description,
        includedItems: data.includedItems.join("\n"),
        displayOrder: String(data.displayOrder),
        status: data.status,
        featured: data.featured,
        demo: data.demo,
      });
      setMainImage(data.mainImage);
      setGallery(data.gallery);
    }
  }, [service.data, reset]);

  const save = useMutation({
    mutationFn: (values: ServiceForm) => {
      const payload = {
        ...values,
        includedItems: linesToList(values.includedItems),
        displayOrder: Number(values.displayOrder),
        mainImageId: mainImage?.id ?? null,
        galleryIds: gallery.map((item) => item.id),
      };
      return editing ? api.put(`/api/admin/services/${id}`, payload) : api.post("/api/admin/services", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Service enregistré." : "Service créé.");
      refresh();
      navigate("/admin/services");
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, Object.keys(EMPTY))),
  });

  if (editing && service.isError) return <ErrorState error={service.error} onRetry={() => service.refetch()} />;
  if (editing && service.isPending) return <Skeleton className="h-96 w-full" />;
  const title = watch("title");

  return (
    <>
      <Link to="/admin/services" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux services
      </Link>
      <AdminHeader title={editing ? "Modifier le service" : "Nouveau service"} />
      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
        noValidate
        className="space-y-6"
      >
        <FormSection title="Informations">
          <Field label="Titre" htmlFor="service-title" error={errors.title?.message} className="sm:col-span-2">
            <input type="text" className="field-input" {...fieldAria("service-title", errors.title?.message)} {...register("title")} />
          </Field>
          <Field label="Slug (adresse de la page)" htmlFor="service-slug" optional error={errors.slug?.message} hint="Laissez vide pour le générer à partir du titre.">
            <input type="text" className="field-input" {...fieldAria("service-slug", errors.slug?.message, "hint")} {...register("slug")} />
          </Field>
          <Field label="Ordre d'affichage" htmlFor="service-order" error={errors.displayOrder?.message} hint="Les plus petits nombres apparaissent en premier.">
            <input type="text" inputMode="numeric" className="field-input" {...fieldAria("service-order", errors.displayOrder?.message, "hint")} {...register("displayOrder")} />
          </Field>
          <Field label="Description courte" htmlFor="service-short" optional error={errors.shortDescription?.message} className="sm:col-span-2">
            <input type="text" className="field-input" {...fieldAria("service-short", errors.shortDescription?.message)} {...register("shortDescription")} />
          </Field>
          <Field label="Description détaillée" htmlFor="service-description" optional error={errors.description?.message} className="sm:col-span-2">
            <textarea rows={6} className="field-input resize-y" {...fieldAria("service-description", errors.description?.message)} {...register("description")} />
          </Field>
          <Field label="Prestations incluses" htmlFor="service-included" optional error={errors.includedItems?.message} hint="Une prestation par ligne." className="sm:col-span-2">
            <textarea rows={4} className="field-input resize-y" {...fieldAria("service-included", errors.includedItems?.message, "hint")} {...register("includedItems")} />
          </Field>
        </FormSection>

        <section className="card space-y-6 p-5 sm:p-6">
          <h2 className="text-2xl">Images</h2>
          <ImageField label="Image principale" hint="JPEG, PNG ou WebP, 8 Mo maximum." value={mainImage} onChange={setMainImage} defaultAlt={title} />
          <GalleryField label="Galerie (facultative)" value={gallery} onChange={setGallery} defaultAlt={title} />
        </section>

        <FormSection title="Publication">
          <Field label="Statut" htmlFor="service-status" error={errors.status?.message}>
            <select className="field-input" {...fieldAria("service-status", errors.status?.message)} {...register("status")}>
              <option value="DRAFT">Brouillon (non visible sur le site)</option>
              <option value="PUBLISHED">Publié</option>
            </select>
          </Field>
          <div className="space-y-3 self-end">
            <Checkbox id="service-featured" label="Mettre en avant sur la page d'accueil" {...register("featured")} />
            <Checkbox id="service-demo" label="Contenu de démonstration" hint="Affiche un badge « Démonstration » sur le site." {...register("demo")} />
          </div>
        </FormSection>

        {formError && (
          <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {editing ? "Enregistrer" : "Créer le service"}
          </button>
          <Link to="/admin/services" className="btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </>
  );
}
