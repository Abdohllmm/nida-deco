import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import { PublicLayout } from "./components/PublicLayout";
import { Spinner } from "./components/ui";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

// Chargement différé : chaque page n'est téléchargée qu'à sa première visite.
// L'administration forme un ensemble séparé que les visiteurs ne chargent jamais.
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const LegalNoticePage = lazy(() => import("./pages/LegalPages").then((m) => ({ default: m.LegalNoticePage })));
const PrivacyPage = lazy(() => import("./pages/LegalPages").then((m) => ({ default: m.PrivacyPage })));

const LoginPage = lazy(() => import("./pages/admin/LoginPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const ProductsAdminPage = lazy(() => import("./pages/admin/ProductsAdminPage"));
const ProductFormPage = lazy(() => import("./pages/admin/ProductFormPage"));
const ServicesAdminPage = lazy(() => import("./pages/admin/ServicesAdmin").then((m) => ({ default: m.ServicesAdminPage })));
const ServiceFormPage = lazy(() => import("./pages/admin/ServicesAdmin").then((m) => ({ default: m.ServiceFormPage })));
const ProjectsAdminPage = lazy(() => import("./pages/admin/ProjectsAdmin").then((m) => ({ default: m.ProjectsAdminPage })));
const ProjectFormPage = lazy(() => import("./pages/admin/ProjectsAdmin").then((m) => ({ default: m.ProjectFormPage })));
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage"));
const RequestsPage = lazy(() => import("./pages/admin/RequestsPage"));
const MediaPage = lazy(() => import("./pages/admin/MediaPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const AccountPage = lazy(() => import("./pages/admin/AccountPage"));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Chargement de la page">
      <Spinner className="size-6 text-gold-dark" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:slug" element={<ServiceDetailPage />} />
          <Route path="produits" element={<ProductsPage />} />
          <Route path="produits/:slug" element={<ProductDetailPage />} />
          <Route path="realisations" element={<ProjectsPage />} />
          <Route path="realisations/:slug" element={<ProjectDetailPage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="mentions-legales" element={<LegalNoticePage />} />
          <Route path="politique-de-confidentialite" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="admin/login" element={<LoginPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="produits" element={<ProductsAdminPage />} />
          <Route path="produits/nouveau" element={<ProductFormPage />} />
          <Route path="produits/:id" element={<ProductFormPage />} />
          <Route path="services" element={<ServicesAdminPage />} />
          <Route path="services/nouveau" element={<ServiceFormPage />} />
          <Route path="services/:id" element={<ServiceFormPage />} />
          <Route path="realisations" element={<ProjectsAdminPage />} />
          <Route path="realisations/nouveau" element={<ProjectFormPage />} />
          <Route path="realisations/:id" element={<ProjectFormPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="demandes" element={<RequestsPage />} />
          <Route path="medias" element={<MediaPage />} />
          <Route path="parametres" element={<SettingsPage />} />
          <Route path="compte" element={<AccountPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
