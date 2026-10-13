import { Link } from "react-router";
import { useSeo } from "../lib/seo";

export default function NotFoundPage() {
  useSeo({ title: "Page introuvable", noindex: true });
  return (
    <section className="container-page py-24 text-center sm:py-32">
      <p className="font-display text-7xl font-extrabold text-gold sm:text-8xl" aria-hidden="true">404</p>
      <h1 className="mt-4 text-3xl sm:text-4xl">Page introuvable</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">La page demandée n'existe pas ou n'est plus disponible.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">
          Retour à l'accueil
        </Link>
        <Link to="/produits" className="btn-secondary">
          Voir les produits
        </Link>
      </div>
    </section>
  );
}
