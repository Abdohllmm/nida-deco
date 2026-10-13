import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { Field, Spinner, fieldAria } from "../../components/ui";
import { api } from "../../lib/api";
import { useSeo } from "../../lib/seo";
import type { Session } from "../../lib/types";
import { useSession, useSetSession } from "./auth";

const schema = z.object({
  email: z.string().trim().min(1, "L'email est requis.").pipe(z.email("Adresse email invalide.")),
  password: z.string().min(1, "Le mot de passe est requis."),
});
type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  useSeo({ title: "Connexion", noindex: true });
  const session = useSession();
  const setSession = useSetSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const target = from && from.startsWith("/admin") && from !== "/admin/login" ? from : "/admin";

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const login = useMutation({
    mutationFn: (values: LoginForm) => api.post<Session>("/api/auth/login", values),
    onSuccess: (data) => {
      setSession(data);
      navigate(target, { replace: true });
    },
    onError: () => resetField("password"),
  });

  if (session.data) {
    return <Navigate to={target} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="" width={72} height={72} className="mx-auto size-18 rounded-full" />
          <h1 className="mt-5 text-3xl">Administration</h1>
          <p className="mt-1 text-sm text-muted">Connectez-vous pour gérer le site.</p>
        </div>
        <form onSubmit={handleSubmit((values) => login.mutate(values))} noValidate className="card space-y-5 p-6">
          {login.isError && (
            <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" data-testid="login-error">
              {login.error.message}
            </p>
          )}
          <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
            <input type="email" autoComplete="username" className="field-input" {...fieldAria("login-email", errors.email?.message)} {...register("email")} />
          </Field>
          <Field label="Mot de passe" htmlFor="login-password" error={errors.password?.message}>
            <input type="password" autoComplete="current-password" className="field-input" {...fieldAria("login-password", errors.password?.message)} {...register("password")} />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
            {login.isPending && <Spinner />}
            Se connecter
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="link">
            Retour au site
          </Link>
        </p>
      </div>
    </main>
  );
}
