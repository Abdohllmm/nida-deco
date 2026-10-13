import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmDialog } from "../../components/Dialog";
import { useToast } from "../../components/Toast";
import { Badge, EmptyState, ErrorState, Pagination, Skeleton, Spinner } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { formatFileSize } from "../../lib/format";
import type { AdminMedia, Media, Page } from "../../lib/types";
import { AdminHeader } from "./common";
import { ACCEPTED_TYPES, checkImageFile } from "./ImagePicker";

export default function MediaPage() {
  const client = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<AdminMedia | null>(null);

  const media = useQuery({
    queryKey: ["admin", "media", "library", page],
    queryFn: () => api.get<Page<AdminMedia>>(`/api/admin/media?page=${page - 1}&size=24`),
    placeholderData: keepPreviousData,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "media"] });

  const upload = async (files: File[]) => {
    setUploading(true);
    let added = 0;
    for (const file of files) {
      const problem = checkImageFile(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      try {
        await api.post<Media>("/api/admin/media", form);
        added++;
      } catch (error) {
        toast.error(`« ${file.name} » : ${errorMessage(error)}`);
      }
    }
    setUploading(false);
    if (added > 0) {
      toast.success(added > 1 ? `${added} images ajoutées.` : "Image ajoutée.");
      setPage(1);
      refresh();
    }
  };

  const saveAlt = useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) => api.patch(`/api/admin/media/${id}`, { alt }),
    onSuccess: () => {
      toast.success("Texte alternatif enregistré.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/media/${id}`),
    onSuccess: () => {
      toast.success("Image supprimée.");
      setToDelete(null);
      refresh();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      setToDelete(null);
    },
  });

  const data = media.data;

  return (
    <>
      <AdminHeader
        title="Médiathèque"
        description="Toutes les images téléversées. Une image encore utilisée par un contenu ne peut pas être supprimée. Formats acceptés : JPEG, PNG, WebP (8 Mo maximum)."
        action={
          <>
            <input
              ref={input}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (files.length > 0) void upload(files);
              }}
            />
            <button type="button" className="btn-primary" onClick={() => input.current?.click()} disabled={uploading}>
              {uploading ? <Spinner /> : <Upload className="size-4" aria-hidden="true" />}
              {uploading ? "Envoi en cours…" : "Téléverser des images"}
            </button>
          </>
        }
      />

      {media.isPending && <Skeleton className="h-64 w-full" />}
      {media.isError && <ErrorState error={media.error} onRetry={() => media.refetch()} />}
      {data && data.items.length === 0 && <EmptyState title="La médiathèque est vide">Téléversez vos photos pour les utiliser dans les produits, services et réalisations.</EmptyState>}
      {data && data.items.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((item) => (
            <li key={item.id} className="card p-2.5">
              <img src={item.url} alt={item.alt} loading="lazy" className="aspect-[4/3] w-full rounded-sm object-cover" />
              <label htmlFor={`alt-${item.id}`} className="mt-2.5 mb-1 block text-xs text-muted">
                Texte alternatif
              </label>
              <input
                id={`alt-${item.id}`}
                type="text"
                defaultValue={item.alt}
                key={item.alt}
                maxLength={255}
                placeholder="Décrivez l'image"
                className="field-input px-2 py-1.5 text-xs"
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value !== item.alt) saveAlt.mutate({ id: item.id, alt: value });
                }}
              />
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted">
                    {item.width && item.height ? `${item.width} × ${item.height} · ` : ""}
                    {formatFileSize(item.sizeBytes)}
                  </p>
                  <div className="mt-1">{item.usageCount > 0 ? <Badge tone="success">Utilisée ({item.usageCount})</Badge> : <Badge>Non utilisée</Badge>}</div>
                </div>
                <button
                  type="button"
                  className="btn-ghost px-2 hover:text-danger"
                  disabled={item.usageCount > 0}
                  onClick={() => setToDelete(item)}
                  aria-label={`Supprimer l'image ${item.alt || item.originalName || ""}`}
                  title={item.usageCount > 0 ? "Image utilisée : retirez-la d'abord des contenus concernés." : "Supprimer"}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      <ConfirmDialog open={toDelete !== null} title="Supprimer cette image ?" pending={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete.id)}>
        Le fichier sera définitivement supprimé du serveur.
      </ConfirmDialog>
    </>
  );
}
