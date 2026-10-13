import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import type { Media } from "../lib/types";
import { MediaImage } from "./MediaImage";

interface GalleryProps {
  images: Media[];
  /** Nom du contenu, utilisé pour les libellés accessibles. */
  label: string;
  ratio?: string;
}

/** Fusionne image principale et galerie sans doublon, image principale en tête. */
export function mergeImages(main: Media | null, gallery: Media[]): Media[] {
  const all = main ? [main, ...gallery] : gallery;
  return all.filter((image, index) => all.findIndex((other) => other.id === image.id) === index);
}

/**
 * Galerie accessible : grande image, flèches, vignettes cliquables et navigation
 * au clavier (flèches gauche/droite, Début, Fin).
 */
export function Gallery({ images, label, ratio = "aspect-[4/3]" }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(images.length - 1, 0));
  const count = images.length;

  if (count === 0) {
    return <MediaImage media={null} fallbackAlt={label} ratio={ratio} className="rounded-lg" priority />;
  }

  const go = (next: number) => setIndex((next + count) % count);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(current + 1);
    else if (event.key === "ArrowLeft") go(current - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(count - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div role="group" aria-roledescription="galerie" aria-label={`Photos — ${label}`} onKeyDown={onKeyDown}>
      <div className="relative">
        <MediaImage media={images[current]} fallbackAlt={`${label} — photo ${current + 1}`} ratio={ratio} className="rounded-lg" priority />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
              aria-label="Photo suivante"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <p className="absolute right-3 bottom-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs text-ink" aria-live="polite">
              {current + 1} / {count}
            </p>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Afficher la photo ${i + 1} sur ${count}`}
                aria-current={i === current ? "true" : undefined}
                className={`block w-full overflow-hidden rounded-md border-2 transition-colors ${i === current ? "border-gold" : "border-transparent hover:border-line"}`}
              >
                <MediaImage media={image} fallbackAlt={`${label} — vignette ${i + 1}`} ratio="aspect-square" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
