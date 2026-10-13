import type { ReactNode } from "react";
import { useSettings } from "../lib/queries";
import { buildWhatsAppUrl } from "../lib/whatsapp";
import { WhatsAppIcon } from "./icons";

interface WhatsAppLinkProps {
  message: string;
  children: ReactNode;
  className?: string;
  icon?: boolean;
  testId?: string;
}

/**
 * Lien ouvrant une conversation WhatsApp avec un message prérempli. Le numéro
 * provient uniquement des paramètres de l'entreprise. Sans numéro configuré, le
 * lien n'est pas affiché plutôt que de proposer un bouton sans effet.
 */
export function WhatsAppLink({ message, children, className = "btn-whatsapp", icon = true, testId }: WhatsAppLinkProps) {
  const { data: settings } = useSettings();
  const href = buildWhatsAppUrl(settings?.whatsappNumber, message);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} data-testid={testId}>
      {icon && <WhatsAppIcon className="size-5 shrink-0" />}
      <span>
        {children}
        <span className="sr-only"> (ouvre WhatsApp dans un nouvel onglet)</span>
      </span>
    </a>
  );
}
