import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../../components/Toast";
import { Field, Spinner, fieldAria } from "../../components/ui";
import { api } from "../../lib/api";
import type { Session } from "../../lib/types";
import { AdminHeader, applyServerErrors } from "./common";
import { useSession, useSetSession } from "./auth";

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
    newPassword: z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères.").max(72, "72 caractères maximum."),
    confirmation: z.string().min(1, "Confirmez le nouveau mot de passe."),
  })
  .refine((values) => values.newPassword === values.confirmation, { path: ["confirmation"], message: "Les deux mots de passe ne correspondent pas." });
type PasswordForm = z.infer<typeof passwordSchema>;

const emailSchema = z.object({
  newEmail: z.string().trim().min(1, "L'email est requis.").pipe(z.email("Adresse email invalide.")),
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
});
type EmailForm = z.infer<typeof emailSchema>;

function ErrorNote({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger sm:col-span-2">
      {message}
    </p>
  ) : null;
}

function EmailSection() {
  const toast = useToast();
  const session = useSession();
  const setSession = useSetSession();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EmailForm>({ resolver: zodResolver(emailSchema), defaultValues: { newEmail: "", currentPassword: "" } });

  const save = useMutation({
    mutationFn: (values: EmailForm) => api.put<Session>("/api/auth/email", values),
    onSuccess: (data) => {
      setSession(data);
      reset();
      toast.success("Adresse email mise à jour.");
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["newEmail", "currentPassword"])),
  });

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-2xl">Adresse email</h2>
      <p className="mt-1 text-sm text-muted">
        Email de connexion actuel : <span className="font-medium text-ink">{session.data?.email}</span>
      </p>
      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
        noValidate
        className="mt-5 grid gap-5 sm:grid-cols-2"
      >
        <Field label="Nouvel email" htmlFor="account-new-email" error={errors.newEmail?.message}>
          <input type="email" autoComplete="email" className="field-input" {...fieldAria("account-new-email", errors.newEmail?.message)} {...register("newEmail")} />
        </Field>
        <Field label="Mot de passe actuel" htmlFor="account-email-password" error={errors.currentPassword?.message}>
          <input type="password" autoComplete="current-password" className="field-input" {...fieldAria("account-email-password", errors.currentPassword?.message)} {...register("currentPassword")} />
        </Field>
        <ErrorNote message={formError} />
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            Modifier l'email
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordSection() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmation: "" } });

  const save = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordForm) => api.put<void>("/api/auth/password", { currentPassword, newPassword }),
    onSuccess: () => {
      reset();
      toast.success("Mot de passe modifié.");
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["currentPassword", "newPassword"])),
  });

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-2xl">Mot de passe</h2>
      <p className="mt-1 text-sm text-muted">Au moins 10 caractères. Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.</p>
      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
        noValidate
        className="mt-5 grid gap-5 sm:grid-cols-2"
      >
        <Field label="Mot de passe actuel" htmlFor="account-current" error={errors.currentPassword?.message} className="sm:col-span-2 sm:max-w-sm">
          <input type="password" autoComplete="current-password" className="field-input" {...fieldAria("account-current", errors.currentPassword?.message)} {...register("currentPassword")} />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="account-new" error={errors.newPassword?.message}>
          <input type="password" autoComplete="new-password" className="field-input" {...fieldAria("account-new", errors.newPassword?.message)} {...register("newPassword")} />
        </Field>
        <Field label="Confirmer le nouveau mot de passe" htmlFor="account-confirm" error={errors.confirmation?.message}>
          <input type="password" autoComplete="new-password" className="field-input" {...fieldAria("account-confirm", errors.confirmation?.message)} {...register("confirmation")} />
        </Field>
        <ErrorNote message={formError} />
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            Modifier le mot de passe
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AccountPage() {
  return (
    <>
      <AdminHeader title="Mon compte" description="Identifiants de connexion à l'administration. Toute modification demande votre mot de passe actuel." />
      <div className="space-y-6">
        <EmailSection />
        <PasswordSection />
        <p className="text-xs text-muted">
          Mot de passe oublié ? Il n'existe pas de récupération par email : la réinitialisation se fait sur le serveur, selon la procédure décrite dans le README.
        </p>
      </div>
    </>
  );
}
