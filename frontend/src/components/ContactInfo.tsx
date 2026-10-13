import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { formatPhone, formatWhatsAppNumber } from "../lib/format";
import { useSettings } from "../lib/queries";
import { GENERIC_MESSAGE, buildWhatsAppUrl } from "../lib/whatsapp";
import { InstagramIcon, WhatsAppIcon } from "./icons";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-ink text-gold-light">{icon}</span>
      <div className="min-w-0 pt-0.5">
        <p className="font-display text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
        <div className="mt-0.5 font-medium break-words">{children}</div>
      </div>
    </li>
  );
}

/** Coordonnées de l'entreprise. Adresse, email et horaires n'apparaissent que s'ils sont renseignés. */
export function ContactInfo() {
  const { data: s } = useSettings();
  const phones = [s?.phone, s?.secondaryPhone].filter((value): value is string => Boolean(value));
  // Un ou deux numéros WhatsApp : chacun ouvre sa propre conversation.
  const whatsapps = [s?.whatsappNumber, s?.secondaryWhatsappNumber]
    .map((number) => ({ number: number ?? "", url: buildWhatsAppUrl(number, GENERIC_MESSAGE) }))
    .filter((entry): entry is { number: string; url: string } => entry.url !== null);
  const link = "hover:text-gold-dark hover:underline underline-offset-4";
  return (
    <ul className="space-y-5">
      {s?.city && (
        <Row icon={<MapPin className="size-5" aria-hidden="true" />} label="Localisation">
          {s.address && <span className="block">{s.address}</span>}
          {s.city}, Maroc
        </Row>
      )}
      {phones.length > 0 && (
        <Row icon={<Phone className="size-5" aria-hidden="true" />} label="Téléphone">
          {phones.map((phone) => (
            <a key={phone} href={`tel:${phone.replace(/\s+/g, "")}`} className={`block ${link}`}>
              {formatPhone(phone)}
            </a>
          ))}
        </Row>
      )}
      {whatsapps.length > 0 && (
        <Row icon={<WhatsAppIcon className="size-5" />} label="WhatsApp">
          {whatsapps.map((entry, index) => (
            <a
              key={entry.number}
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block ${link}`}
              data-testid={index === 0 ? "contact-whatsapp" : "contact-whatsapp-2"}
              aria-label={`Écrire sur WhatsApp au ${formatWhatsAppNumber(entry.number)} (nouvel onglet)`}
            >
              {whatsapps.length > 1 ? formatWhatsAppNumber(entry.number) : "Ouvrir une conversation"}
            </a>
          ))}
        </Row>
      )}
      {s?.contactEmail && (
        <Row icon={<Mail className="size-5" aria-hidden="true" />} label="Email">
          <a href={`mailto:${s.contactEmail}`} className={link}>
            {s.contactEmail}
          </a>
        </Row>
      )}
      {s?.instagramUrl && (
        <Row icon={<InstagramIcon className="size-5" />} label="Instagram">
          <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className={link}>
            Voir le profil
          </a>
        </Row>
      )}
      {s?.openingHours && (
        <Row icon={<Clock className="size-5" aria-hidden="true" />} label="Horaires">
          <span className="whitespace-pre-line">{s.openingHours}</span>
        </Row>
      )}
    </ul>
  );
}
