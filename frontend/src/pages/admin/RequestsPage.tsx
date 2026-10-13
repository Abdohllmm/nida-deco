import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { ConfirmDialog, Dialog } from "../../components/Dialog";
import { WhatsAppIcon } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { Badge, EmptyState, ErrorState, Pagination, Skeleton, Spinner } from "../../components/ui";
import { api, errorMessage, toQuery } from "../../lib/api";
import { NEED_TYPE_LABELS, REQUEST_STATUS_LABELS, formatDateTime } from "../../lib/format";
import type { ContactRequestAdmin, Page, RequestStatus } from "../../lib/types";
import { AdminHeader } from "./common";
import { REQUEST_TONES } from "./DashboardPage";

const STATUSES: RequestStatus[] = ["NEW", "IN_PROGRESS", "DONE"];

/** Numéro marocain local (06…) → format international pour wa.me ; sinon chiffres tels quels. */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return /^0\d{9}$/.test(digits) ? "212" + digits.slice(1) : digits;
}

export default function RequestsPage() {
  const client = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (STATUSES.find((value) => value === searchParams.get("statut")) ?? "") as RequestStatus | "";
  const openId = searchParams.get("ouvrir");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ContactRequestAdmin | null>(null);

  const requests = useQuery({
    queryKey: ["admin", "requests", { status, page }],
    queryFn: () => api.get<Page<ContactRequestAdmin>>("/api/admin/contact-requests" + toQuery({ status, page: page - 1, size: 20 })),
    placeholderData: keepPreviousData,
  });
  const detail = useQuery({
    queryKey: ["admin", "request", openId],
    queryFn: () => api.get<ContactRequestAdmin>(`/api/admin/contact-requests/${openId}`),
    enabled: openId !== null,
    retry: false,
  });

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: key === "ouvrir" });
  };
  const refresh = () => client.invalidateQueries({ queryKey: ["admin"] });

  const setStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: RequestStatus }) => api.patch<ContactRequestAdmin>(`/api/admin/contact-requests/${id}/status`, { status: next }),
    onSuccess: () => {
      toast.success("Statut mis à jour.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/contact-requests/${id}`),
    onSuccess: () => {
      toast.success("Demande supprimée.");
      setToDelete(null);
      setParam("ouvrir", null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const data = requests.data;
  const opened = detail.data;
  const chip = (active: boolean) => `rounded-full border px-4 py-2 text-sm transition-colors ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-gold-dark hover:text-ink"}`;

  return (
    <>
      <AdminHeader title="Demandes de contact" description="Demandes envoyées depuis le formulaire du site. Aucune notification par email n'est envoyée : consultez cette page régulièrement." />

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        <button type="button" className={chip(status === "")} aria-pressed={status === ""} onClick={() => { setPage(1); setParam("statut", null); }}>
          Toutes
        </button>
        {STATUSES.map((value) => (
          <button key={value} type="button" className={chip(status === value)} aria-pressed={status === value} onClick={() => { setPage(1); setParam("statut", value); }}>
            {REQUEST_STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {requests.isPending && <Skeleton className="h-64 w-full" />}
      {requests.isError && <ErrorState error={requests.error} onRetry={() => requests.refetch()} />}
      {data && data.items.length === 0 && <EmptyState title={status ? "Aucune demande avec ce statut" : "Aucune demande pour le moment"}>Les demandes envoyées depuis la page Contact apparaîtront ici.</EmptyState>}
      {data && data.items.length > 0 && (
        <ul className="card divide-y divide-line" data-testid="request-list">
          {data.items.map((request) => (
            <li key={request.id}>
              <button type="button" onClick={() => setParam("ouvrir", request.id)} className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 text-left hover:bg-ivory">
                <div className="min-w-0 flex-1 basis-56">
                  <p className={`truncate ${request.status === "NEW" ? "font-semibold" : "font-medium"}`}>{request.name}</p>
                  <p className="truncate text-sm text-muted">{request.message}</p>
                  <p className="mt-1 text-xs text-muted">
                    {NEED_TYPE_LABELS[request.needType]} · {formatDateTime(request.createdAt)}
                  </p>
                </div>
                <Badge tone={REQUEST_TONES[request.status]}>{REQUEST_STATUS_LABELS[request.status]}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      <Dialog
        open={openId !== null}
        onClose={() => setParam("ouvrir", null)}
        title={opened ? opened.name : "Demande"}
        size="lg"
        footer={
          opened && (
            <button type="button" className="btn-ghost hover:text-danger" onClick={() => setToDelete(opened)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Supprimer la demande
            </button>
          )
        }
      >
        {detail.isPending && (
          <div className="flex justify-center py-10">
            <Spinner className="size-6 text-gold-dark" />
          </div>
        )}
        {detail.isError && <ErrorState error={detail.error} onRetry={() => detail.refetch()} />}
        {opened && (
          <div className="space-y-5 text-sm">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Reçue le</dt>
                <dd>{formatDateTime(opened.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Type de projet</dt>
                <dd>{NEED_TYPE_LABELS[opened.needType]}</dd>
              </div>
              {opened.location && (
                <div>
                  <dt className="text-xs text-muted">Ville ou quartier</dt>
                  <dd>{opened.location}</dd>
                </div>
              )}
              {opened.budget && (
                <div>
                  <dt className="text-xs text-muted">Budget envisagé</dt>
                  <dd>{opened.budget}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted">Accord pour être recontacté</dt>
                <dd>{opened.consent ? "Oui" : "Non renseigné"}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${opened.phone.replace(/\s+/g, "")}`} className="btn-secondary">
                <Phone className="size-4" aria-hidden="true" />
                {opened.phone}
              </a>
              <a href={`https://wa.me/${toWhatsAppNumber(opened.phone)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <WhatsAppIcon className="size-4" />
                WhatsApp
              </a>
              {opened.email && (
                <a href={`mailto:${opened.email}`} className="btn-secondary">
                  <Mail className="size-4" aria-hidden="true" />
                  {opened.email}
                </a>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted">Message</p>
              <p className="rounded-sm border border-line bg-ivory p-4 leading-relaxed break-words whitespace-pre-line">{opened.message}</p>
            </div>
            <div>
              <label htmlFor="request-status" className="mb-1.5 block text-sm font-medium">
                Statut
              </label>
              <select
                id="request-status"
                value={opened.status}
                disabled={setStatus.isPending}
                onChange={(event) => setStatus.mutate({ id: opened.id, next: event.target.value as RequestStatus })}
                className="field-input max-w-xs"
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {REQUEST_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={toDelete !== null} title="Supprimer cette demande ?" pending={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete.id)}>
        La demande de « {toDelete?.name} » et ses coordonnées seront définitivement supprimées.
      </ConfirmDialog>
    </>
  );
}
