import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "../../components/Dialog";
import { useToast } from "../../components/Toast";
import { ErrorState, Field, Skeleton, Spinner, fieldAria } from "../../components/ui";
import { ApiError, api, errorMessage } from "../../lib/api";
import type { Category } from "../../lib/types";
import { AdminHeader } from "./common";

interface SectionProps {
  title: string;
  description: string;
  /** Segment d'URL de l'API : product-categories ou project-categories. */
  resource: "product-categories" | "project-categories";
  itemLabel: string;
  idPrefix: string;
}

function CategorySection({ title, description, resource, itemLabel, idPrefix }: SectionProps) {
  const client = useQueryClient();
  const toast = useToast();
  const endpoint = `/api/admin/${resource}`;
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("0");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const categories = useQuery({ queryKey: ["admin", resource], queryFn: () => api.get<Category[]>(endpoint) });

  useEffect(() => {
    if (editing === null) return;
    setName(editing === "new" ? "" : editing.name);
    setPosition(editing === "new" ? String((categories.data?.length ?? 0) + 1) : String(editing.position));
    setFieldError(undefined);
  }, [editing]);

  const refresh = () => {
    client.invalidateQueries({ queryKey: ["admin"] });
    client.invalidateQueries({ queryKey: [resource] });
    client.invalidateQueries({ queryKey: ["products"] });
    client.invalidateQueries({ queryKey: ["projects"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), position: Number(position) || 0 };
      return editing !== "new" && editing !== null ? api.put(`${endpoint}/${editing.id}`, body) : api.post(endpoint, body);
    },
    onSuccess: () => {
      toast.success("Catégorie enregistrée.");
      setEditing(null);
      refresh();
    },
    onError: (error) => setFieldError(error instanceof ApiError ? (Object.values(error.fieldErrors)[0] ?? error.message) : errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (category: Category) => api.delete(`${endpoint}/${category.id}${reassignTo ? `?reassignTo=${reassignTo}` : ""}`),
    onSuccess: () => {
      toast.success("Catégorie supprimée.");
      setToDelete(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFieldError("Le nom est requis.");
      return;
    }
    save.mutate();
  };

  const inUse = (toDelete?.itemCount ?? 0) > 0;
  const others = categories.data?.filter((category) => category.id !== toDelete?.id) ?? [];

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden="true" />
          Ajouter
        </button>
      </div>

      <div className="mt-5">
        {categories.isPending && <Skeleton className="h-24 w-full" />}
        {categories.isError && <ErrorState error={categories.error} onRetry={() => categories.refetch()} />}
        {categories.data && categories.data.length === 0 && <p className="text-sm text-muted">Aucune catégorie pour le moment.</p>}
        {categories.data && categories.data.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {categories.data.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted">
                    Position {category.position} · {category.itemCount ?? 0} {itemLabel}
                    {(category.itemCount ?? 0) > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="btn-ghost px-2" onClick={() => setEditing(category)} aria-label={`Modifier la catégorie ${category.name}`}>
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 hover:text-danger"
                    onClick={() => {
                      setReassignTo("");
                      setToDelete(category);
                    }}
                    aria-label={`Supprimer la catégorie ${category.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <Field label="Nom" htmlFor={`${idPrefix}-name`} error={fieldError}>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="field-input" {...fieldAria(`${idPrefix}-name`, fieldError)} />
          </Field>
          <Field label="Position" htmlFor={`${idPrefix}-position`} hint="Ordre d'affichage dans les filtres.">
            <input type="number" min={0} max={9999} value={position} onChange={(event) => setPosition(event.target.value)} className="field-input" {...fieldAria(`${idPrefix}-position`, undefined, "hint")} />
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              Enregistrer
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Supprimer cette catégorie ?"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setToDelete(null)} disabled={remove.isPending}>
              Annuler
            </button>
            <button type="button" className="btn-danger" onClick={() => toDelete && remove.mutate(toDelete)} disabled={remove.isPending || (inUse && !reassignTo)}>
              {remove.isPending && <Spinner />}
              Supprimer
            </button>
          </>
        }
      >
        {inUse ? (
          <div className="space-y-4 text-sm">
            <p>
              « {toDelete?.name} » est utilisée par {toDelete?.itemCount} {itemLabel}
              {(toDelete?.itemCount ?? 0) > 1 ? "s" : ""}. Choisissez la catégorie qui les recevra avant la suppression.
            </p>
            {others.length === 0 ? (
              <p className="text-danger">Créez d'abord une autre catégorie pour pouvoir réaffecter ces éléments.</p>
            ) : (
              <Field label="Réaffecter vers" htmlFor={`${idPrefix}-reassign`}>
                <select id={`${idPrefix}-reassign`} value={reassignTo} onChange={(event) => setReassignTo(event.target.value)} className="field-input">
                  <option value="">Sélectionnez…</option>
                  {others.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">« {toDelete?.name} » n'est utilisée par aucun élément et sera définitivement supprimée.</p>
        )}
      </Dialog>
    </section>
  );
}

export default function CategoriesPage() {
  return (
    <>
      <AdminHeader title="Catégories" description="Organisez le catalogue et les réalisations. Une catégorie encore utilisée ne peut être supprimée qu'en réaffectant ses éléments." />
      <div className="space-y-6">
        <CategorySection title="Catégories de produits" description="Utilisées par les filtres du catalogue." resource="product-categories" itemLabel="produit" idPrefix="product-category" />
        <CategorySection title="Types de réalisations" description="Utilisés par les filtres de la page Réalisations." resource="project-categories" itemLabel="réalisation" idPrefix="project-category" />
      </div>
    </>
  );
}
