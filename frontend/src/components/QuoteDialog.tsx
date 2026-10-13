import { ArrowUpRight } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { QuoteForm } from "./QuoteForm";

interface QuoteApi {
  /** Ouvre la fenêtre de demande de devis, éventuellement avec un sujet prérempli. */
  open: (subject?: string) => void;
}

const QuoteContext = createContext<QuoteApi | null>(null);

/** Fenêtre de devis accessible depuis tout le site public (en-tête, hero, pages services…). */
export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ subject: string; key: number } | null>(null);
  const open = useCallback((subject = "") => setState((previous) => ({ subject, key: (previous?.key ?? 0) + 1 })), []);
  const api = useMemo(() => ({ open }), [open]);

  return (
    <QuoteContext.Provider value={api}>
      {children}
      <Dialog open={state !== null} onClose={() => setState(null)} title="Demander un devis" size="lg">
        <p className="mb-6 text-sm text-muted">Décrivez votre projet : nous revenons vers vous pour en discuter et vous faire une proposition adaptée.</p>
        {state && <QuoteForm key={state.key} idPrefix="devis" subject={state.subject} />}
      </Dialog>
    </QuoteContext.Provider>
  );
}

export function useQuote(): QuoteApi {
  const context = useContext(QuoteContext);
  if (!context) throw new Error("useQuote doit être utilisé dans un QuoteProvider.");
  return context;
}

interface QuoteButtonProps {
  subject?: string;
  className?: string;
  children?: ReactNode;
  onOpen?: () => void;
}

export function QuoteButton({ subject, className = "btn-primary", children = "Demander un devis", onOpen }: QuoteButtonProps) {
  const quote = useQuote();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onOpen?.();
        quote.open(subject);
      }}
    >
      {children}
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </button>
  );
}
