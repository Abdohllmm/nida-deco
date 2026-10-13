import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../../components/Toast";
import { ErrorState, Field, Skeleton, Spinner, fieldAria } from "../../components/ui";
import { api } from "../../lib/api";
import type { CompanySettings, Media } from "../../lib/types";
import { buildWhatsAppUrl } from "../../lib/whatsapp";
import { AdminHeader, FormSection, applyServerErrors } from "./common";
import { ImageField } from "./ImagePicker";

const schema = z.object({
  displayName: z.string().trim().min(1, "Le nom affiché est requis.").max(120, "120 caractères maximum."),
  phone: z.string().trim().regex(/^$|^\+?[0-9][0-9 .()-]{5,24}$/, "Numéro de téléphone invalide."),
  whatsappNumber: z.string().trim().regex(/^$|^[1-9][0-9]{7,14}$/, "Format international sans « + » ni espaces, par exemple 212661568771."),
  secondaryPhone: z.string().trim().regex(/^$|^\+?[0-9][0-9 .()-]{5,24}$/, "Numéro de téléphone invalide."),
  secondaryWhatsappNumber: z.string().trim().regex(/^$|^[1-9][0-9]{7,14}$/, "Format international sans « + » ni espaces, par exemple 212653878201."),
  instagramUrl: z.string().trim().regex(/^$|^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/, "Lien attendu : https://www.instagram.com/votre_compte/"),
  contactEmail: z.union([z.literal(""), z.email("Adresse email invalide.")]),
  city: z.string().trim().max(120, "120 caractères maximum."),
  address: z.string().trim().max(300, "300 caractères maximum."),
  openingHours: z.string().trim().max(500, "500 caractères maximum."),
  aboutText: z.string().trim().max(5000, "5 000 caractères maximum."),
  heroTitle: z.string().trim().max(200, "200 caractères maximum."),
  heroSubtitle: z.string().trim().max(500, "500 caractères maximum."),
  introTitle: z.string().trim().max(200, "200 caractères maximum."),
  introText: z.string().trim().max(5000, "5 000 caractères maximum."),
});
type SettingsForm = z.infer<typeof schema>;
const FIELDS = Object.keys(schema.shape);

export default function SettingsPage() {
  const client = useQueryClient();
  const toast = useToast();
  const [logo, setLogo] = useState<Media | null>(null);
  const [heroImage, setHeroImage] = useState<Media | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: () => api.get<CompanySettings>("/api/admin/settings") });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<SettingsForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const data = settings.data;
    if (data) {
      const { logo: currentLogo, heroImage: currentHero, ...values } = data;
      reset(values);
      setLogo(currentLogo);
      setHeroImage(currentHero);
    }
  }, [settings.data, reset]);

  const save = useMutation({
    mutationFn: (values: SettingsForm) => api.put<CompanySettings>("/api/admin/settings", { ...values, logoId: logo?.id ?? null, heroImageId: heroImage?.id ?? null }),
    onSuccess: (data) => {
      toast.success("Paramètres enregistrés.");
      client.setQueryData(["admin", "settings"], data);
      client.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS)),
  });

  if (settings.isError) return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />;
  if (settings.isPending) return <Skeleton className="h-96 w-full" />;

  const whatsappPreview = buildWhatsAppUrl(watch("whatsappNumber"), "Test");
  const text = (id: string, name: keyof SettingsForm, label: string, options: { hint?: string; optional?: boolean; type?: string; className?: string } = {}) => (
    <Field label={label} htmlFor={id} error={errors[name]?.message} hint={options.hint} optional={options.optional} className={options.className}>
      <input type={options.type ?? "text"} className="field-input" {...fieldAria(id, errors[name]?.message, options.hint)} {...register(name)} />
    </Field>
  );
  const area = (id: string, name: keyof SettingsForm, label: string, rows: number, options: { hint?: string; optional?: boolean } = {}) => (
    <Field label={label} htmlFor={id} error={errors[name]?.message} hint={options.hint} optional={options.optional} className="sm:col-span-2">
      <textarea rows={rows} className="field-input resize-y" {...fieldAria(id, errors[name]?.message, options.hint)} {...register(name)} />
    </Field>
  );

  return (
    <>
      <AdminHeader title="Paramètres de l'entreprise" description="Ces informations alimentent tout le site : en-tête, pied de page, page Contact et liens WhatsApp." />
      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
        noValidate
        className="space-y-6"
      >
        <FormSection title="Identité">
          {text("settings-name", "displayName", "Nom affiché")}
          {text("settings-city", "city", "Ville")}
          <div className="sm:col-span-2">
            <ImageField label="Logo" hint="Affiché dans l'en-tête. Image carrée recommandée. Sans logo choisi, le logo fourni à l'installation est utilisé." value={logo} onChange={setLogo} defaultAlt="Logo" />
          </div>
        </FormSection>

        <FormSection title="Coordonnées">
          {text("settings-phone", "phone", "Téléphone", { type: "tel" })}
          <Field label="Numéro WhatsApp international" htmlFor="settings-whatsapp" error={errors.whatsappNumber?.message} hint="Indicatif pays puis numéro, sans « + », sans 0 initial ni espaces. Exemple : 212661568771.">
            <input type="text" inputMode="numeric" className="field-input" {...fieldAria("settings-whatsapp", errors.whatsappNumber?.message, "hint")} {...register("whatsappNumber")} />
            {whatsappPreview ? (
              <a href={whatsappPreview} target="_blank" rel="noopener noreferrer" className="link mt-1.5 inline-block text-xs">
                Tester ce numéro dans WhatsApp
              </a>
            ) : (
              <span className="mt-1.5 block text-xs text-muted">Sans numéro, les boutons WhatsApp sont masqués sur le site.</span>
            )}
          </Field>
          {text("settings-phone-2", "secondaryPhone", "Second téléphone", { optional: true, type: "tel" })}
          {text("settings-whatsapp-2", "secondaryWhatsappNumber", "Second numéro WhatsApp", {
            optional: true,
            hint: "Même format international. Affiché dans les coordonnées ; les boutons de commande et de devis utilisent le numéro principal.",
          })}
          {text("settings-instagram", "instagramUrl", "Instagram", { optional: true, type: "url" })}
          {text("settings-email", "contactEmail", "Email de contact", { optional: true, type: "email" })}
          {text("settings-address", "address", "Adresse", { optional: true, hint: "Affichée uniquement si elle est renseignée.", className: "sm:col-span-2" })}
          {area("settings-hours", "openingHours", "Horaires", 3, { optional: true, hint: "Affichés uniquement s'ils sont renseignés. Une ligne par plage." })}
        </FormSection>

        <FormSection title="Page d'accueil">
          {text("settings-hero-title", "heroTitle", "Accroche principale", { className: "sm:col-span-2" })}
          {area("settings-hero-subtitle", "heroSubtitle", "Sous-titre", 3)}
          <div className="sm:col-span-2">
            <ImageField label="Photo de l'accueil" hint="Remplace l'illustration par défaut. Utilisez une photo dont vous détenez les droits." value={heroImage} onChange={setHeroImage} defaultAlt="Intérieur aménagé" />
          </div>
          {text("settings-intro-title", "introTitle", "Titre de la présentation", { className: "sm:col-span-2" })}
          {area("settings-intro-text", "introText", "Texte de présentation (accueil)", 4)}
        </FormSection>

        <FormSection title="Page À propos">{area("settings-about", "aboutText", "Texte de présentation", 8)}</FormSection>

        {formError && (
          <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending && <Spinner />}
          Enregistrer les paramètres
        </button>
      </form>
    </>
  );
}
