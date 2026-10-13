import { ImageIcon } from "lucide-react";
import type { Media } from "../lib/types";

interface MediaImageProps {
  media: Media | null | undefined;
  /** Texte alternatif de repli quand le média n'en a pas. */
  fallbackAlt: string;
  /** Classes de ratio, par exemple aspect-[4/3]. La place est réservée avant le chargement. */
  ratio?: string;
  className?: string;
  /** true pour l'image principale visible dès l'arrivée sur la page. */
  priority?: boolean;
  fit?: "cover" | "contain";
}

/**
 * Image d'un contenu. Le conteneur impose un ratio fixe et les dimensions
 * connues sont transmises au navigateur : aucun saut de mise en page au
 * chargement. Sans image, un emplacement neutre est affiché.
 */
export function MediaImage({ media, fallbackAlt, ratio = "aspect-[4/3]", className = "", priority = false, fit = "cover" }: MediaImageProps) {
  return (
    <div className={`relative overflow-hidden bg-sand ${ratio} ${className}`}>
      {media ? (
        <img
          src={media.url}
          alt={media.alt || fallbackAlt}
          width={media.width ?? undefined}
          height={media.height ?? undefined}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          className={`absolute inset-0 size-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted/70" role="img" aria-label={`${fallbackAlt} — image à venir`}>
          <ImageIcon className="size-8" strokeWidth={1.2} aria-hidden="true" />
          <span className="text-xs">Image à venir</span>
        </div>
      )}
    </div>
  );
}
