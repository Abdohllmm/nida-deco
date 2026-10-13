import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FolderOpen, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { useToast } from "../../components/Toast";
import { ErrorState, Pagination, Spinner } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import type { AdminMedia, Media, Page } from "../../lib/types";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Contrôle indicatif côté navigateur ; la limite réelle est appliquée par le serveur. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Vérifie un fichier avant envoi. Renvoie un message d'erreur, ou null s'il est acceptable. */
export function checkImageFile(file: { type: string; size: number; name: string }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `« ${file.name} » : format non pris en charge. Utilisez une image JPEG, PNG ou WebP.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `« ${file.name} » dépasse la taille maximale de 8 Mo.`;
  }
  return null;
}

function useUpload() {
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ file, alt }: { file: File; alt: string }) => {
      const problem = checkImageFile(file);
      if (problem) throw new Error(problem);
      const form = new FormData();
      form.append("file", file);
      form.append("alt", alt);
      return api.post<Media>("/api/admin/media", form);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "media"] }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Champ de texte alternatif enregistré dès que l'on quitte le champ. */
function AltInput({ media, onSaved }: { media: Media; onSaved: (media: Media) => void }) {
  const id = useId();
  const toast = useToast();
  const save = useMutation({
    mutationFn: (alt: string) => api.patch<AdminMedia>(`/api/admin/media/${media.id}`, { alt }),
    onSuccess: (updated) => onSaved({ ...media, alt: updated.alt }),
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div className="mt-2">
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        Texte alternatif
      </label>
      <input
        id={id}
        type="text"
        defaultValue={media.alt}
        key={media.id + media.alt}
        maxLength={255}
        placeholder="Décrivez l'image"
        className="field-input px-2 py-1.5 text-xs"
        onBlur={(event) => {
          const value = event.target.value.trim();
          if (value !== media.alt) save.mutate(value);
        }}
      />
    </div>
  );
}

interface LibraryDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (media: Media) => void;
  excludedIds?: string[];
}

function LibraryDialog({ open, onClose, onPick, excludedIds = [] }: LibraryDialogProps) {
  const [page, setPage] = useState(1);
  const library = useQuery({
    queryKey: ["admin", "media", page],
    queryFn: () => api.get<Page<AdminMedia>>(`/api/admin/media?page=${page - 1}&size=18`),
    enabled: open,
  });
  return (
    <Dialog open={open} onClose={onClose} title="Choisir dans la médiathèque" size="lg">
      {library.isPending && (
        <div className="flex justify-center py-10">
          <Spinner className="size-6 text-gold-dark" />
        </div>
      )}
      {library.isError && <ErrorState error={library.error} onRetry={() => library.refetch()} />}
      {library.data && library.data.items.length === 0 && <p className="py-8 text-center text-sm text-muted">La médiathèque est vide. Téléversez d'abord une image.</p>}
      {library.data && library.data.items.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {library.data.items.map((item) => {
            const used = excludedIds.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={used}
                  onClick={() => {
                    onPick(item);
                    onClose();
                  }}
                  className="block w-full overflow-hidden rounded-sm border-2 border-transparent hover:border-gold-dark disabled:opacity-40"
                  aria-label={`Choisir l'image ${item.alt || item.originalName || ""}${used ? " (déjà sélectionnée)" : ""}`}
                >
                  <img src={item.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {library.data && <Pagination page={page} totalPages={library.data.totalPages} onChange={setPage} />}
    </Dialog>
  );
}

function UploadButton({ onFiles, pending, multiple = false }: { onFiles: (files: File[]) => void; pending: boolean; multiple?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
      <button type="button" className="btn-secondary" onClick={() => input.current?.click()} disabled={pending}>
        {pending ? <Spinner /> : <Upload className="size-4" aria-hidden="true" />}
        {pending ? "Envoi…" : "Téléverser"}
      </button>
    </>
  );
}

interface ImageFieldProps {
  label: string;
  hint?: string;
  value: Media | null;
  onChange: (media: Media | null) => void;
  /** Texte alternatif proposé par défaut pour une nouvelle image. */
  defaultAlt?: string;
}

/** Sélection d'une image unique : téléversement, médiathèque, aperçu et retrait. */
export function ImageField({ label, hint, value, onChange, defaultAlt = "" }: ImageFieldProps) {
  const [library, setLibrary] = useState(false);
  const upload = useUpload();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {hint && <p className="mb-2 text-xs text-muted">{hint}</p>}
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-36">
          {value ? (
            <img src={value.url} alt={value.alt} className="aspect-[4/3] w-full rounded-sm border border-line object-cover" />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-sm border border-dashed border-line bg-ivory text-xs text-muted">Aucune image</div>
          )}
          {value && <AltInput media={value} onSaved={onChange} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <UploadButton pending={upload.isPending} onFiles={([file]) => upload.mutate({ file, alt: defaultAlt }, { onSuccess: onChange })} />
          <button type="button" className="btn-secondary" onClick={() => setLibrary(true)}>
            <FolderOpen className="size-4" aria-hidden="true" />
            Médiathèque
          </button>
          {value && (
            <button type="button" className="btn-ghost" onClick={() => onChange(null)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Retirer
            </button>
          )}
        </div>
      </div>
      <LibraryDialog open={library} onClose={() => setLibrary(false)} onPick={onChange} />
    </fieldset>
  );
}

interface GalleryFieldProps {
  label: string;
  hint?: string;
  value: Media[];
  onChange: (media: Media[]) => void;
  defaultAlt?: string;
  max?: number;
}

/** Galerie ordonnée : ajout de plusieurs images, réorganisation et retrait. */
export function GalleryField({ label, hint, value, onChange, defaultAlt = "", max = 20 }: GalleryFieldProps) {
  const [library, setLibrary] = useState(false);
  const [pending, setPending] = useState(false);
  const upload = useUpload();
  const toast = useToast();

  const addFiles = async (files: File[]) => {
    const room = max - value.length;
    if (files.length > room) toast.error(`La galerie est limitée à ${max} images.`);
    setPending(true);
    const added: Media[] = [];
    for (const file of files.slice(0, Math.max(room, 0))) {
      try {
        added.push(await upload.mutateAsync({ file, alt: defaultAlt }));
      } catch {
        // L'erreur est déjà signalée par une notification ; on poursuit avec les fichiers suivants.
      }
    }
    setPending(false);
    if (added.length > 0) onChange([...value, ...added]);
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {hint && <p className="mb-2 text-xs text-muted">{hint}</p>}
      {value.length > 0 && (
        <ol className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {value.map((media, index) => (
            <li key={media.id} className="rounded-sm border border-line bg-white p-2">
              <img src={media.url} alt={media.alt} loading="lazy" className="aspect-[4/3] w-full rounded-sm object-cover" />
              <AltInput media={media} onSaved={(updated) => onChange(value.map((item) => (item.id === updated.id ? updated : item)))} />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex">
                  <button type="button" className="btn-ghost px-2" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Déplacer l'image ${index + 1} vers la gauche`}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-ghost px-2" onClick={() => move(index, 1)} disabled={index === value.length - 1} aria-label={`Déplacer l'image ${index + 1} vers la droite`}>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <button type="button" className="btn-ghost px-2" onClick={() => onChange(value.filter((item) => item.id !== media.id))} aria-label={`Retirer l'image ${index + 1} de la galerie`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        <UploadButton multiple pending={pending} onFiles={addFiles} />
        <button type="button" className="btn-secondary" onClick={() => setLibrary(true)} disabled={value.length >= max}>
          <FolderOpen className="size-4" aria-hidden="true" />
          Médiathèque
        </button>
      </div>
      <LibraryDialog open={library} onClose={() => setLibrary(false)} onPick={(media) => onChange([...value, media])} excludedIds={value.map((item) => item.id)} />
    </fieldset>
  );
}
