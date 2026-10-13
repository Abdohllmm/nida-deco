import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Images, Inbox, LayoutDashboard, LogOut, Menu, Package, Settings, Tags, UserRound, Wrench, X, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useToast } from "../../components/Toast";
import { api, errorMessage } from "../../lib/api";
import { useSeo } from "../../lib/seo";
import { RequireAuth, useSession, useSetSession } from "./auth";

const NAVIGATION = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/admin/produits", label: "Produits", icon: Package },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/realisations", label: "Réalisations", icon: Images },
  { to: "/admin/categories", label: "Catégories", icon: Tags },
  { to: "/admin/demandes", label: "Demandes", icon: Inbox },
  { to: "/admin/medias", label: "Médiathèque", icon: FolderOpen },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
  { to: "/admin/compte", label: "Mon compte", icon: UserRound },
];

function Shell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const session = useSession();
  const setSession = useSetSession();

  useSeo({ title: "Administration", noindex: true });
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const logout = useMutation({
    mutationFn: () => api.post<void>("/api/auth/logout"),
    onSuccess: () => {
      setSession(null);
      navigate("/admin/login", { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const navigation = (
    <nav aria-label="Administration" className="flex flex-1 flex-col gap-1 p-3">
      {NAVIGATION.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-sand font-medium text-ink" : "text-muted hover:bg-ivory hover:text-ink"}`
          }
        >
          <Icon className="size-4.5 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
      <a href="/" target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted hover:bg-ivory hover:text-ink">
        <ExternalLink className="size-4.5 shrink-0" aria-hidden="true" />
        Voir le site
      </a>
    </nav>
  );

  const account = (
    <div className="border-t border-line p-3">
      <p className="truncate px-3 text-xs text-muted" title={session.data?.email}>
        {session.data?.email}
      </p>
      <button type="button" className="btn-ghost mt-1 w-full justify-start" onClick={() => logout.mutate()} disabled={logout.isPending}>
        <LogOut className="size-4" aria-hidden="true" />
        Se déconnecter
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Barre supérieure sur mobile et tablette */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <span className="font-display text-lg font-semibold tracking-[0.12em]">NIDAL DECO · Admin</span>
        <button type="button" className="btn-ghost -mr-2 px-2" aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen((value) => !value)}>
          {open ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
        </button>
      </header>
      {open && (
        <div id="admin-menu" className="fixed inset-x-0 top-14 bottom-0 z-30 flex flex-col overflow-y-auto bg-white lg:hidden">
          {navigation}
          {account}
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <img src="/logo.png" alt="" width={40} height={40} className="size-10 rounded-full" />
          <div>
            <p className="font-display text-lg leading-tight font-semibold tracking-[0.12em]">NIDAL DECO</p>
            <p className="text-xs text-muted">Administration</p>
          </div>
        </div>
        {navigation}
        {account}
      </aside>

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <RequireAuth>
      <Shell />
    </RequireAuth>
  );
}
