import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ConfirmDialog } from "../../components/Dialog";
import { useToast } from "../../components/Toast";
import { Badge, DemoBadge, EmptyState, ErrorState, Pagination, Skeleton } from "../../components/ui";
import { api, errorMessage, toQuery } from "../../lib/api";
import { AVAILABILITY_LABELS, formatPrice } from "../../lib/format";
import type { Page, ProductSummary, PublicationStatus } from "../../lib/types";
import { AdminHeader, StatusBadge } from "./common";

export default function ProductsAdminPage() {
  const client = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PublicationStatus | "">("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ProductSummary | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const products = useQuery({
    queryKey: ["admin", "products", { q, status, page }],
    queryFn: () => api.get<Page<ProductSummary>>("/api/admin/products" + toQuery({ q, status, page: page - 1, size: 20 })),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    client.invalidateQueries({ queryKey: ["admin", "products"] });
    client.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    client.invalidateQueries({ queryKey: ["products"] });
    client.invalidateQueries({ queryKey: ["product"] });
  };

  const setPublication = useMutation({
    mutationFn: ({ id, next }: { id: string; next: PublicationStatus }) => api.patch(`/api/admin/products/${id}/status`, { status: next }),
    onSuccess: (_data, { next }) => {
      toast.success(next === "PUBLISHED" ? "Produit publié." : "Produit dépublié.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const setFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => api.patch(`/api/admin/products/${id}/featured`, { featured }),
    onSuccess: (_data, { featured }) => {
      toast.success(featured ? "Produit mis en avant." : "Produit retiré de la mise en avant.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/products/${id}`),
    onSuccess: () => {
      toast.success("Produit supprimé.");
      setToDelete(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const data = products.data;

  return (
    <>
      <AdminHeader
        title="Produits"
        description="Les produits publiés apparaissent dans le catalogue. Un produit sans prix affiche « Prix sur demande »."
        action={
          <Link to="/admin/produits/nouveau" className="btn-primary">
            <Plus className="size-4" aria-hidden="true" />
            Ajouter un produit
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <label htmlFor="admin-product-search" className="sr-only">
            Rechercher un produit
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="admin-product-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou référence" className="field-input pl-9" />
        </div>
        <div>
          <label htmlFor="admin-product-status" className="sr-only">
            Filtrer par statut
          </label>
          <select
            id="admin-product-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PublicationStatus | "");
              setPage(1);
            }}
            className="field-input"
          >
            <option value="">Tous les statuts</option>
            <option value="PUBLISHED">Publiés</option>
            <option value="DRAFT">Brouillons</option>
          </select>
        </div>
      </div>

      {products.isPending && <Skeleton className="h-64 w-full" />}
      {products.isError && <ErrorState error={products.error} onRetry={() => products.refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState
          title={q || status ? "Aucun produit ne correspond" : "Aucun produit pour le moment"}
          action={
            !q && !status ? (
              <Link to="/admin/produits/nouveau" className="btn-primary">
                Ajouter un produit
              </Link>
            ) : undefined
          }
        >
          {q || status ? "Modifiez la recherche ou le filtre." : "Créez votre premier produit pour alimenter le catalogue."}
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <ul className="card divide-y divide-line" data-testid="admin-product-list">
          {data.items.map((product) => {
            const published = product.status === "PUBLISHED";
            return (
              <li key={product.id} className="flex flex-wrap items-center gap-4 p-4" data-testid="admin-product-row">
                {product.mainImage ? (
                  <img src={product.mainImage.url} alt="" loading="lazy" className="size-16 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="size-16 shrink-0 rounded-sm bg-sand" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-muted">
                    {product.reference} · {product.category.name} · {formatPrice(product.price)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusBadge status={product.status} />
                    <Badge>{AVAILABILITY_LABELS[product.availability]}</Badge>
                    {product.featured && <Badge tone="gold">Mis en avant</Badge>}
                    {product.demo && <DemoBadge />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setPublication.mutate({ id: product.id, next: published ? "DRAFT" : "PUBLISHED" })}
                    disabled={setPublication.isPending}
                  >
                    {published ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    {published ? "Dépublier" : "Publier"}
                    <span className="sr-only"> {product.name}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2"
                    onClick={() => setFeatured.mutate({ id: product.id, featured: !product.featured })}
                    disabled={setFeatured.isPending}
                    aria-pressed={product.featured}
                    aria-label={`${product.featured ? "Retirer de la mise en avant" : "Mettre en avant"} : ${product.name}`}
                    title={product.featured ? "Retirer de la mise en avant" : "Mettre en avant"}
                  >
                    <Star className={`size-4 ${product.featured ? "fill-gold text-gold-dark" : ""}`} aria-hidden="true" />
                  </button>
                  <Link to={`/admin/produits/${product.id}`} className="btn-ghost px-2" aria-label={`Modifier ${product.name}`} title="Modifier">
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <button type="button" className="btn-ghost px-2 hover:text-danger" onClick={() => setToDelete(product)} aria-label={`Supprimer ${product.name}`} title="Supprimer">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce produit ?"
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      >
        « {toDelete?.name} » sera définitivement supprimé. Ses images restent disponibles dans la médiathèque.
      </ConfirmDialog>
    </>
  );
}
