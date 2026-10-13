import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Spinner } from "./ui";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "lg";
}

/**
 * Fenêtre modale basée sur l'élément natif <dialog> : le navigateur gère le
 * piège de focus, la touche Échap et le retour du focus à la fermeture.
 */
export function Dialog({ open, onClose, title, children, footer, size = "sm" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Un clic sur le fond (le <dialog> lui-même, pas son contenu) ferme la fenêtre.
      onClick={(event) => event.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] rounded-xl border-0 bg-white p-0 text-ink shadow-2xl ${size === "lg" ? "max-w-3xl" : "max-w-md"}`}
    >
      {open && (
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
            <h2 id={titleId} className="text-xl sm:text-2xl">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="btn-ghost -mr-2 px-2" aria-label="Fermer">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4 sm:px-7">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation explicite avant une action irréversible. */
export function ConfirmDialog({ open, title, children, confirmLabel = "Supprimer", pending = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending} autoFocus>
            Annuler
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={pending}>
            {pending && <Spinner />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-muted">{children}</div>
    </Dialog>
  );
}
