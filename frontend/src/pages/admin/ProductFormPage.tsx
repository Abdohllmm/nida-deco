import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { useToast } from "../../components/Toast";
import { ErrorState, Field, Skeleton, Spinner, fieldAria } from "../../components/ui";
import { api } from "../../lib/api";
import { AVAILABILITY_LABELS } from "../../lib/format";
import { EMPTY_PRODUCT, productSchema, productToForm, toProductPayload, type ProductForm } from "../../lib/productSchema";
import type { Availability, Category, Media, ProductDetail } from "../../lib/types";
import { AdminHeader, Checkbox, FormSection, applyServerErrors } from "./common";
import { GalleryField, ImageField } from "./ImagePicker";

export default function ProductFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const [mainImage, setMainImage] = useState<Media | null>(null);
  const [gallery, setGallery] = useState<Media[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ["admin", "product-categories"], queryFn: () => api.get<Category[]>("/api/admin/product-categories") });
  const product = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => api.get<ProductDetail>(`/api/admin/products/${id}`),
    enabled: editing,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: EMPTY_PRODUCT });

  useEffect(() => {
    if (product.data) {
      reset(productToForm(product.data));
      setMainImage(product.data.mainImage);
      setGallery(product.data.gallery);
    }
  }, [product.data, reset]);

  const save = useMutation({
    mutationFn: (values: ProductForm) => {
      const payload = toProductPayload(values, mainImage?.id ?? null, gallery.map((item) => item.id));
      return editing ? api.put<ProductDetail>(`/api/admin/products/${id}`, payload) : api.post<ProductDetail>("/api/admin/products", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Produit enregistré." : "Produit créé.");
      client.invalidateQueries({ queryKey: ["admin"] });
      client.invalidateQueries({ queryKey: ["products"] });
      client.invalidateQueries({ queryKey: ["product"] });
      navigate("/admin/produits");
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, Object.keys(EMPTY_PRODUCT))),
  });

  if (editing && product.isError) {
    return <ErrorState error={product.error} onRetry={() => product.refetch()} />;
  }
  if (editing && product.isPending) {
    return <Skeleton className="h-96 w-full" />;
  }

  const name = watch("name");
  const noCategory = categories.data !== undefined && categories.data.length === 0;

  return (
    <>
      <Link to="/admin/produits" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux produits
      </Link>
      <AdminHeader title={editing ? "Modifier le produit" : "Nouveau produit"} />

      {noCategory && (
        <p role="alert" className="mb-6 rounded-sm border border-gold/60 bg-gold/10 px-4 py-3 text-sm">
          Créez d'abord une catégorie de produits dans{" "}
          <Link to="/admin/categories" className="link">
            Catégories
          </Link>
          .
        </p>
      )}

      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
        noValidate
        className="space-y-6"
      >
        <FormSection title="Informations">
          <Field label="Nom" htmlFor="product-name" error={errors.name?.message} className="sm:col-span-2">
            <input type="text" className="field-input" {...fieldAria("product-name", errors.name?.message)} {...register("name")} />
          </Field>
          <Field label="Référence" htmlFor="product-reference" error={errors.reference?.message} hint="Identifiant unique, repris dans le message WhatsApp.">
            <input type="text" className="field-input" {...fieldAria("product-reference", errors.reference?.message, "hint")} {...register("reference")} />
          </Field>
          <Field label="Slug (adresse de la page)" htmlFor="product-slug" optional error={errors.slug?.message} hint="Laissez vide pour le générer à partir du nom.">
            <input type="text" className="field-input" {...fieldAria("product-slug", errors.slug?.message, "hint")} {...register("slug")} />
          </Field>
          <Field label="Catégorie" htmlFor="product-category" error={errors.categoryId?.message}>
            <select className="field-input" {...fieldAria("product-category", errors.categoryId?.message)} {...register("categoryId")}>
              <option value="">Sélectionnez…</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Disponibilité" htmlFor="product-availability" error={errors.availability?.message}>
            <select className="field-input" {...fieldAria("product-availability", errors.availability?.message)} {...register("availability")}>
              {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((value) => (
                <option key={value} value={value}>
                  {AVAILABILITY_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prix (MAD)" htmlFor="product-price" optional error={errors.price?.message} hint="Laissez vide pour afficher « Prix sur demande ».">
            <input type="text" inputMode="decimal" className="field-input" {...fieldAria("product-price", errors.price?.message, "hint")} {...register("price")} />
          </Field>
          <Field label="Description courte" htmlFor="product-short" optional error={errors.shortDescription?.message} className="sm:col-span-2">
            <input type="text" className="field-input" {...fieldAria("product-short", errors.shortDescription?.message)} {...register("shortDescription")} />
          </Field>
          <Field label="Description détaillée" htmlFor="product-description" optional error={errors.description?.message} className="sm:col-span-2">
            <textarea rows={6} className="field-input resize-y" {...fieldAria("product-description", errors.description?.message)} {...register("description")} />
          </Field>
        </FormSection>

        <FormSection title="Caractéristiques" description="Ces informations ne s'affichent sur la fiche que si elles sont renseignées.">
          <Field label="Dimensions" htmlFor="product-dimensions" optional error={errors.dimensions?.message}>
            <input type="text" placeholder="140 × 70 × 75 cm" className="field-input" {...fieldAria("product-dimensions", errors.dimensions?.message)} {...register("dimensions")} />
          </Field>
          <Field label="Matériaux" htmlFor="product-materials" optional error={errors.materials?.message}>
            <input type="text" className="field-input" {...fieldAria("product-materials", errors.materials?.message)} {...register("materials")} />
          </Field>
          <Field label="Options de couleur" htmlFor="product-colors" optional error={errors.colorOptions?.message} hint="Une option par ligne. Le visiteur peut en choisir une avant de commander." className="sm:col-span-2">
            <textarea rows={3} className="field-input resize-y" {...fieldAria("product-colors", errors.colorOptions?.message, "hint")} {...register("colorOptions")} />
          </Field>
        </FormSection>

        <section className="card space-y-6 p-5 sm:p-6">
          <h2 className="text-2xl">Images</h2>
          <ImageField label="Image principale" hint="JPEG, PNG ou WebP, 8 Mo maximum." value={mainImage} onChange={setMainImage} defaultAlt={name} />
          <GalleryField label="Galerie" hint="L'ordre affiché ici est celui de la fiche produit." value={gallery} onChange={setGallery} defaultAlt={name} />
        </section>

        <FormSection title="Publication">
          <Field label="Statut" htmlFor="product-status" error={errors.status?.message}>
            <select className="field-input" {...fieldAria("product-status", errors.status?.message)} {...register("status")}>
              <option value="DRAFT">Brouillon (non visible sur le site)</option>
              <option value="PUBLISHED">Publié</option>
            </select>
          </Field>
          <div className="space-y-3 self-end">
            <Checkbox id="product-featured" label="Mettre en avant sur la page d'accueil" {...register("featured")} />
            <Checkbox id="product-demo" label="Contenu de démonstration" hint="Affiche un badge « Démonstration » sur le site." {...register("demo")} />
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
            {editing ? "Enregistrer" : "Créer le produit"}
          </button>
          <Link to="/admin/produits" className="btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </>
  );
}
