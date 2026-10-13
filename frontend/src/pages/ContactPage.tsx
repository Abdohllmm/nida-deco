import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ContactInfo } from "../components/ContactInfo";
import { PageHero } from "../components/HeroBanner";
import { QuoteForm } from "../components/QuoteForm";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { useSeo } from "../lib/seo";
import { GENERIC_MESSAGE } from "../lib/whatsapp";

export default function ContactPage() {
  useSeo({ title: "Contact et devis", description: "Demandez un devis ou contactez NIDAL DECO à Casablanca par téléphone, WhatsApp ou formulaire." });
  const [searchParams] = useSearchParams();
  const subject = (searchParams.get("sujet") ?? "").slice(0, 200);
  const quote = searchParams.get("type") === "devis";
  const form = useRef<HTMLDivElement>(null);

  // /contact?type=devis amène directement au formulaire.
  useEffect(() => {
    if (quote) form.current?.scrollIntoView({ block: "start" });
  }, [quote]);

  return (
    <>
      <PageHero image="/images/banner-contact.jpg" eyebrow="Contact" title={quote ? "Demander un devis" : "Parlons de votre projet"} crumbs={[{ label: "Accueil", to: "/" }, { label: "Contact" }]}>
        Décrivez-nous votre projet ou écrivez-nous directement sur WhatsApp.
      </PageHero>

      <section className="section bg-ivory">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div>
            <p className="eyebrow mb-4">Coordonnées</p>
            <h2 className="mb-8 text-3xl leading-tight">Nous contacter</h2>
            <ContactInfo />
            <div className="mt-9 rounded-lg bg-ink p-6">
              <p className="font-display font-extrabold text-white">Une question rapide ?</p>
              <p className="mt-1.5 text-sm text-white/75">Écrivez-nous directement, sans passer par le formulaire.</p>
              <WhatsAppLink message={GENERIC_MESSAGE} className="btn-whatsapp mt-5 w-full">
                Écrire sur WhatsApp
              </WhatsAppLink>
            </div>
          </div>

          <div ref={form} className="scroll-mt-28 rounded-lg bg-white p-6 shadow-[0_1px_3px_rgb(0_0_0/0.08)] sm:p-10">
            <h2 className="text-2xl sm:text-3xl">Votre demande de devis</h2>
            <p className="mt-2 mb-8 text-sm text-muted">Les champs sont obligatoires, sauf mention contraire.</p>
            <QuoteForm idPrefix="contact" subject={subject} />
          </div>
        </div>
      </section>
    </>
  );
}
