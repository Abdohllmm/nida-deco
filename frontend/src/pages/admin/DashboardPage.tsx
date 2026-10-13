import { useQuery } from "@tanstack/react-query";
import { Images, Inbox, Package, Wrench } from "lucide-react";
import { Link } from "react-router";
import { Badge, EmptyState, ErrorState, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { NEED_TYPE_LABELS, REQUEST_STATUS_LABELS, formatDateTime } from "../../lib/format";
import type { Dashboard, RequestStatus } from "../../lib/types";
import { AdminHeader } from "./common";

export const REQUEST_TONES: Record<RequestStatus, "warning" | "neutral" | "success"> = { NEW: "warning", IN_PROGRESS: "neutral", DONE: "success" };

export default function DashboardPage() {
  const dashboard = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => api.get<Dashboard>("/api/admin/dashboard") });
  const data = dashboard.data;
  const stats = [
    { label: "Produits", value: data?.products, to: "/admin/produits", icon: Package },
    { label: "Services", value: data?.services, to: "/admin/services", icon: Wrench },
    { label: "Réalisations", value: data?.projects, to: "/admin/realisations", icon: Images },
    { label: "Demandes reçues", value: data?.contactRequests, to: "/admin/demandes", icon: Inbox },
  ];

  return (
    <>
      <AdminHeader title="Tableau de bord" description="Vue d'ensemble des contenus du site et des demandes reçues via le formulaire de contact." />
      {dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <>
          {data && data.demoItems > 0 && (
            <div role="note" className="mb-6 rounded-lg border-l-4 border-gold bg-sand px-5 py-4 text-sm" data-testid="demo-note">
              <p className="font-display font-extrabold">
                {data.demoItems} contenu{data.demoItems > 1 ? "s" : ""} de démonstration à remplacer
              </p>
              <p className="mt-1.5 text-anthracite">
                Les services, produits et réalisations marqués « Démonstration » utilisent des photos d'illustration qui ne sont pas vos réalisations. Pour les remplacer : ouvrez
                l'élément, téléversez vos propres photos (image principale et galerie), corrigez les textes puis décochez « Contenu de démonstration ». Les photos de l'accueil
                et le logo se changent dans{" "}
                <Link to="/admin/parametres" className="link">
                  Paramètres
                </Link>
                .
              </p>
            </div>
          )}
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(({ label, value, to, icon: Icon }) => (
              <li key={label}>
                <Link to={to} className="card block p-5 transition-shadow hover:shadow-md">
                  <Icon className="size-5 text-gold-dark" aria-hidden="true" />
                  {value === undefined ? <Skeleton className="mt-3 h-9 w-12" /> : <p className="mt-3 font-display text-4xl font-semibold">{value}</p>}
                  <p className="mt-1 text-sm text-muted">{label}</p>
                </Link>
              </li>
            ))}
          </ul>

          <section className="mt-10" aria-labelledby="dernieres-demandes">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="dernieres-demandes" className="text-2xl">
                Dernières demandes
                {data && data.newContactRequests > 0 && (
                  <span className="ml-3 align-middle">
                    <Badge tone="warning">
                      {data.newContactRequests} nouvelle{data.newContactRequests > 1 ? "s" : ""}
                    </Badge>
                  </span>
                )}
              </h2>
              <Link to="/admin/demandes" className="link text-sm">
                Toutes les demandes
              </Link>
            </div>
            {dashboard.isPending && <Skeleton className="h-40 w-full" />}
            {data && data.latestRequests.length === 0 && <EmptyState title="Aucune demande pour le moment">Les demandes envoyées depuis la page Contact apparaîtront ici.</EmptyState>}
            {data && data.latestRequests.length > 0 && (
              <ul className="card divide-y divide-line">
                {data.latestRequests.map((request) => (
                  <li key={request.id}>
                    <Link to={`/admin/demandes?ouvrir=${request.id}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 hover:bg-ivory">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{request.name}</p>
                        <p className="text-sm text-muted">
                          {NEED_TYPE_LABELS[request.needType]} · {formatDateTime(request.createdAt)}
                        </p>
                      </div>
                      <Badge tone={REQUEST_TONES[request.status]}>{REQUEST_STATUS_LABELS[request.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="mt-8 text-xs text-muted">
            Aucune statistique de vente n'est affichée : les commandes se concluent dans WhatsApp et ne sont pas enregistrées par le site.
          </p>
        </>
      )}
    </>
  );
}
