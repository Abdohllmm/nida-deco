import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CircleCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { ApiError, api } from "../lib/api";
import { NEED_TYPES, contactSchema, type ContactForm } from "../lib/contactSchema";
import { NEED_TYPE_LABELS } from "../lib/format";
import type { NeedType } from "../lib/types";
import { Field, Spinner, fieldAria } from "./ui";
import { WhatsAppLink } from "./WhatsAppLink";

interface QuoteFormProps {
  /** Préfixe rendant les identifiants de champs uniques quand plusieurs formulaires coexistent. */
  idPrefix: string;
  /** Sujet prérempli dans le message (service ou projet consulté). */
  subject?: string;
  defaultNeedType?: NeedType;
  /** Version courte : nom, téléphone, type de projet, message. */
  compact?: boolean;
}

/**
 * Formulaire de demande de devis. La demande est enregistrée par le backend ;
 * aucun email n'est envoyé et aucun délai de réponse n'est promis.
 */
export function QuoteForm({ idPrefix, subject = "", defaultNeedType, compact = false }: QuoteFormProps) {
  const [sent, setSent] = useState<ContactForm | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      needType: defaultNeedType,
      location: "",
      budget: "",
      message: subject ? `Bonjour, je souhaite un devis pour : ${subject}.\n` : "",
      consent: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ContactForm) => api.post<{ id: string }>("/api/public/contact-requests", values),
    onSuccess: (_receipt, values) => {
      setSent(values);
      reset();
    },
    onError: (error) => {
      // Les erreurs de validation du serveur sont rattachées à leur champ.
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof ContactForm, { message });
        }
      }
    },
  });

  const id = (name: string) => `${idPrefix}-${name}`;

  if (sent) {
    const followUp = [
      "Bonjour Nidal Deco, je viens d'envoyer une demande via votre site.",
      `Nom : ${sent.name}`,
      `Projet : ${NEED_TYPE_LABELS[sent.needType]}`,
      sent.message,
    ].join("\n");
    return (
      <div role="status" data-testid="contact-success">
        <CircleCheck className="size-11 text-emerald-600" aria-hidden="true" />
        <h3 className="mt-4 text-2xl">Demande enregistrée</h3>
        <p className="mt-3 text-muted">Votre demande a bien été enregistrée. Vous pouvez également nous contacter directement sur WhatsApp.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <WhatsAppLink message={followUp} testId="contact-followup-whatsapp">
            Poursuivre sur WhatsApp
          </WhatsAppLink>
          <button type="button" className="btn-secondary" onClick={() => setSent(null)}>
            Nouvelle demande
          </button>
        </div>
      </div>
    );
  }

  const generalError = mutation.isError && Object.keys((mutation.error as ApiError).fieldErrors ?? {}).length === 0 ? mutation.error.message : null;

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate aria-label="Demande de devis">
      {generalError && (
        <p role="alert" className="mb-5 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {generalError}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom complet" htmlFor={id("name")} error={errors.name?.message}>
          <input type="text" autoComplete="name" className="field-input" {...fieldAria(id("name"), errors.name?.message)} {...register("name")} />
        </Field>
        <Field label="Téléphone" htmlFor={id("phone")} error={errors.phone?.message}>
          <input type="tel" autoComplete="tel" inputMode="tel" className="field-input" {...fieldAria(id("phone"), errors.phone?.message)} {...register("phone")} />
        </Field>
        {!compact && (
          <Field label="Email" htmlFor={id("email")} optional error={errors.email?.message}>
            <input type="email" autoComplete="email" className="field-input" {...fieldAria(id("email"), errors.email?.message)} {...register("email")} />
          </Field>
        )}
        <Field label="Type de projet" htmlFor={id("need")} error={errors.needType?.message} className={compact ? "sm:col-span-2" : ""}>
          <select className="field-input" defaultValue={defaultNeedType ?? ""} {...fieldAria(id("need"), errors.needType?.message)} {...register("needType")}>
            <option value="" disabled>
              Sélectionnez…
            </option>
            {NEED_TYPES.map((value) => (
              <option key={value} value={value}>
                {NEED_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        {!compact && (
          <>
            <Field label="Ville ou quartier" htmlFor={id("location")} optional error={errors.location?.message}>
              <input type="text" autoComplete="address-level2" className="field-input" {...fieldAria(id("location"), errors.location?.message)} {...register("location")} />
            </Field>
            <Field label="Budget envisagé" htmlFor={id("budget")} optional error={errors.budget?.message}>
              <input type="text" placeholder="Indicatif, en MAD" className="field-input" {...fieldAria(id("budget"), errors.budget?.message)} {...register("budget")} />
            </Field>
          </>
        )}
        <Field label="Message" htmlFor={id("message")} error={errors.message?.message} className="sm:col-span-2">
          <textarea rows={compact ? 4 : 5} className="field-input resize-y" {...fieldAria(id("message"), errors.message?.message)} {...register("message")} />
        </Field>
        <div className="sm:col-span-2">
          <div className="flex items-start gap-3">
            <input
              id={id("consent")}
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-ink)]"
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? `${id("consent")}-error` : undefined}
              {...register("consent")}
            />
            <label htmlFor={id("consent")} className="text-sm text-muted">
              J'accepte d'être recontacté au sujet de ma demande.{" "}
              <Link to="/politique-de-confidentialite" className="link">
                Politique de confidentialité
              </Link>
            </label>
          </div>
          {errors.consent && (
            <p id={`${id("consent")}-error`} role="alert" className="mt-1.5 text-sm text-danger">
              {errors.consent.message}
            </p>
          )}
        </div>
      </div>
      <button type="submit" className="btn-primary mt-6 w-full sm:w-auto" disabled={mutation.isPending}>
        {mutation.isPending ? <Spinner /> : null}
        {mutation.isPending ? "Envoi en cours…" : "Envoyer ma demande"}
        {!mutation.isPending && <ArrowRight className="size-4" aria-hidden="true" />}
      </button>
    </form>
  );
}
