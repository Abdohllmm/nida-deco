import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Spinner } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { ApiError, SESSION_EXPIRED_EVENT, api } from "../../lib/api";
import type { Session } from "../../lib/types";

const SESSION_KEY = ["session"];

/**
 * Session courante, lue auprès du serveur. L'interface ne fait que refléter cet
 * état : chaque route /api/admin est de toute façon protégée côté backend.
 */
export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: async (): Promise<Session | null> => {
      try {
        return await api.get<Session>("/api/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useSetSession() {
  const client = useQueryClient();
  return (session: Session | null) => {
    if (session === null) {
      // À la déconnexion, on efface aussi toutes les données d'administration en mémoire.
      client.removeQueries({ predicate: (query) => query.queryKey[0] === "admin" });
    }
    client.setQueryData(SESSION_KEY, session);
  };
}

/** Réserve l'accès aux écrans d'administration et gère l'expiration de session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const setSession = useSetSession();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    const onExpired = () => {
      setSession(null);
      toast.error("Votre session a expiré. Veuillez vous reconnecter.");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  if (session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Vérification de la session">
        <Spinner className="size-6 text-gold-dark" />
      </div>
    );
  }
  if (session.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-medium">Impossible de vérifier votre session.</p>
        <p className="text-sm text-muted">{session.error.message}</p>
        <button type="button" className="btn-secondary" onClick={() => session.refetch()}>
          Réessayer
        </button>
      </div>
    );
  }
  if (!session.data) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
