import { useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AvailabilityBadge, ProductCard } from "../components/cards";
import { Breadcrumb, DetailError, DetailSkeleton } from "../components/DetailStates";
import { Gallery, mergeImages } from "../components/Gallery";
import { DemoBadge } from "../components/ui";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import { currentPageUrl, useSeo } from "../lib/seo";
import type { ProductPublicDetail } from "../lib/types";
import { buildOrderMessage } from "../lib/whatsapp";

const MAX_QUANTITY = 99;

export default function ProductDetailPage() {
  const { slug = "" } = useParams();
  const query = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get<ProductPublicDetail>(`/api/public/products/${encodeURIComponent(slug)}`),
    retry: false,
  });
  const product = query.data?.product;
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("");

  // Changer de produit (produits similaires) réinitialise la sélection.
  useEffect(() => {
    setQuantity(1);
    setColor("");
  }, [slug]);

  useSeo({ title: product?.name ?? "Produit", description: product?.shortDescription });

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <DetailError error={query.error} onRetry={() => query.refetch()} />;
  if (!product) return null;

  const unavailable = product.availability === "OUT_OF_STOCK";
  const hasPrice = product.price !== null && product.price > 0;
  const message = buildOrderMessage({
    name: product.name,
    reference: product.reference,
    quantity,
    options: color ? [color] : [],
    price: product.price,
    url: currentPageUrl(),
  });
  const details = [
    { label: "Référence", value: product.reference },
    { label: "Dimensions", value: product.dimensions },
    { label: "Matériaux", value: product.materials },
  ].filter((row) => row.value);

  const setSafeQuantity = (value: number) => setQuantity(Math.min(MAX_QUANTITY, Math.max(1, Math.round(value) || 1)));
  const stepper = "flex size-12 items-center justify-center transition-colors hover:bg-ivory disabled:opacity-40";

  return (
    <>
      <div className="border-b border-line bg-ivory">
        <div className="container-page py-4">
          <Breadcrumb items={[{ label: "Accueil", to: "/" }, { label: "Produits", to: "/produits" }, { label: product.name }]} />
        </div>
      </div>

      <div className="container-page py-10 sm:py-14">
        <article className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <Gallery images={mergeImages(product.mainImage, product.gallery)} label={product.name} />

          <div>
            <p className="font-display text-xs font-bold tracking-[0.14em] text-gold-dark uppercase">
              <Link to={`/produits?categorie=${product.category.slug}`} className="hover:underline">
                {product.category.name}
              </Link>
            </p>
            <h1 className="mt-2.5 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-2 text-sm text-muted">
              Réf. <span className="font-semibold text-ink" data-testid="product-reference">{product.reference}</span>
            </p>
            {product.demo && <DemoBadge className="mt-4" />}

            <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-line py-5">
              <p className={hasPrice ? "font-display text-3xl font-extrabold" : "font-display text-xl font-bold text-anthracite"} data-testid="detail-price">
                {formatPrice(product.price)}
              </p>
              <AvailabilityBadge availability={product.availability} />
            </div>

            {product.shortDescription && <p className="mt-6 text-lg leading-relaxed">{product.shortDescription}</p>}
            {product.description && <p className="prose-text mt-3">{product.description}</p>}

            {product.colorOptions.length > 0 && (
              <fieldset className="mt-8">
                <legend className="mb-3 font-display text-sm font-bold">
                  Couleur / finition <span className="font-sans font-normal text-muted">(facultatif)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {product.colorOptions.map((option) => (
                    <label
                      key={option}
                      className={`cursor-pointer rounded-md border px-4 py-2.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${
                        color === option ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={color === option} onChange={() => setColor(color === option ? "" : option)} />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-8">
              <label htmlFor="quantite" className="mb-3 block font-display text-sm font-bold">
                Quantité souhaitée
              </label>
              <div className="inline-flex items-center overflow-hidden rounded-md border border-line">
                <button type="button" className={stepper} onClick={() => setSafeQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Diminuer la quantité">
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <input
                  id="quantite"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_QUANTITY}
                  value={quantity}
                  onChange={(event) => setSafeQuantity(Number(event.target.value))}
                  className="h-12 w-16 border-x border-line bg-white text-center font-semibold [appearance:textfield] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" className={stepper} onClick={() => setSafeQuantity(quantity + 1)} disabled={quantity >= MAX_QUANTITY} aria-label="Augmenter la quantité">
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-8">
              {unavailable && (
                <p className="mb-4 rounded-md border border-line bg-ivory px-4 py-3 text-sm text-anthracite" role="status" data-testid="unavailable-notice">
                  Ce produit est actuellement indisponible. Vous pouvez tout de même nous écrire pour connaître les délais.
                </p>
              )}
              <WhatsAppLink message={message} className="btn-whatsapp min-h-14 w-full text-base" testId="order-whatsapp">
                {unavailable ? "Demander la disponibilité sur WhatsApp" : "Commander sur WhatsApp"}
              </WhatsAppLink>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Le bouton ouvre WhatsApp avec un message prérempli. Aucune commande n'est enregistrée ni payée sur ce site : la disponibilité et les modalités vous sont
                confirmées dans la conversation.
              </p>
            </div>

            <dl className="mt-9 divide-y divide-line rounded-lg bg-ivory px-5 text-sm">
              {details.map((row) => (
                <div key={row.label} className="grid grid-cols-[7.5rem_1fr] gap-4 py-3.5">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      </div>

      {query.data.similar.length > 0 && (
        <section className="section bg-ivory" aria-labelledby="produits-similaires">
          <div className="container-page">
            <p className="eyebrow mb-4">Catalogue</p>
            <h2 id="produits-similaires" className="mb-10 text-3xl">
              Produits similaires
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {query.data.similar.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
