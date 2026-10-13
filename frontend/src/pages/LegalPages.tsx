import type { ReactNode } from "react";
import { Link } from "react-router";
import { useSettings } from "../lib/queries";
import { useSeo } from "../lib/seo";

/** Information que l'entreprise doit encore fournir : affichée telle quelle, jamais inventée. */
function ToComplete({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-gold/25 px-1.5 py-0.5 text-ink">[À compléter : {children}]</mark>;
}

function LegalHeader({ title }: { title: string }) {
  return (
    <header className="bg-ink">
      <div className="container-page py-14 sm:py-16">
        <p className="eyebrow-light mb-4">Informations</p>
        <h1 className="text-4xl text-white sm:text-5xl">{title}</h1>
      </div>
    </header>
  );
}

function DraftNotice() {
  return (
    <p className="mb-10 rounded-lg border-l-4 border-gold bg-sand px-5 py-4 text-sm" role="note">
      <strong>Document à compléter.</strong> Cette page est une structure de départ. Les éléments surlignés doivent être fournis par l'entreprise, et le texte n'a pas
      été validé par un juriste : faites-le relire avant la mise en ligne.
    </p>
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl">{title}</h2>
      <div className="space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function LegalNoticePage() {
  useSeo({ title: "Mentions légales", noindex: true });
  const { data: s } = useSettings();
  return (
    <>
      <LegalHeader title="Mentions légales" />
      <div className="container-page max-w-3xl py-12 sm:py-16">
        <DraftNotice />
        <LegalSection title="Éditeur du site">
          <p>
            Nom commercial : <span className="text-ink">{s?.displayName || "NIDAL DECO"}</span>
          </p>
          <p>
            Dénomination sociale et forme juridique : <ToComplete>raison sociale et forme juridique</ToComplete>
          </p>
          <p>
            Siège social : {s?.address ? <span className="text-ink">{s.address}, {s.city}</span> : <ToComplete>adresse complète du siège</ToComplete>}
          </p>
          <p>
            Registre du commerce (RC) : <ToComplete>numéro et ville d'immatriculation</ToComplete>
          </p>
          <p>
            Identifiant commun de l'entreprise (ICE) : <ToComplete>numéro ICE</ToComplete>
          </p>
          <p>
            Identifiant fiscal (IF) : <ToComplete>numéro IF</ToComplete>
          </p>
          <p>
            Directeur de la publication : <ToComplete>nom du responsable</ToComplete>
          </p>
          <p>
            Téléphone : <span className="text-ink">{s?.phone || "—"}</span>
          </p>
          <p>
            Email : {s?.contactEmail ? <span className="text-ink">{s.contactEmail}</span> : <ToComplete>adresse email de contact</ToComplete>}
          </p>
        </LegalSection>
        <LegalSection title="Hébergement">
          <p>
            Hébergeur du site : <ToComplete>nom, adresse et contact de l'hébergeur</ToComplete>
          </p>
        </LegalSection>
        <LegalSection title="Produits et prix">
          <p>
            Les produits présentés sur ce site ne peuvent pas être achetés en ligne. Les prix affichés, lorsqu'ils le sont, sont indicatifs et exprimés en dirhams
            marocains (MAD). La disponibilité, le prix définitif et les modalités de commande sont confirmés lors de l'échange avec l'entreprise.
          </p>
        </LegalSection>
        <LegalSection title="Propriété intellectuelle">
          <p>
            Les textes, photographies et éléments graphiques du site sont la propriété de leur auteur respectif. <ToComplete>préciser les titulaires des droits sur les contenus et les crédits photographiques</ToComplete>
          </p>
        </LegalSection>
      </div>
    </>
  );
}

export function PrivacyPage() {
  useSeo({ title: "Politique de confidentialité", noindex: true });
  const { data: s } = useSettings();
  return (
    <>
      <LegalHeader title="Politique de confidentialité" />
      <div className="container-page max-w-3xl py-12 sm:py-16">
        <DraftNotice />
        <LegalSection title="Responsable du traitement">
          <p>
            <span className="text-ink">{s?.displayName || "NIDAL DECO"}</span> — <ToComplete>identité juridique et adresse du responsable du traitement</ToComplete>
          </p>
        </LegalSection>
        <LegalSection title="Données collectées">
          <p>Ce site collecte uniquement les informations que vous saisissez dans le formulaire de contact : nom, téléphone, adresse email (facultative), type de besoin et message.</p>
          <p>Le formulaire peut aussi recueillir, si vous les indiquez, votre ville ou quartier et un budget envisagé. Le site ne propose ni création de compte client ni paiement en ligne.</p>
        </LegalSection>
        <LegalSection title="Finalité">
          <p>Ces informations servent exclusivement à traiter votre demande et à vous recontacter. Elles ne sont ni vendues ni utilisées à des fins publicitaires.</p>
        </LegalSection>
        <LegalSection title="Durée de conservation">
          <p>
            <ToComplete>durée de conservation des demandes de contact</ToComplete>
          </p>
        </LegalSection>
        <LegalSection title="WhatsApp et Instagram">
          <p>
            Les boutons WhatsApp et Instagram ouvrent des services tiers. Aucune information n'est transmise par ce site tant que vous n'avez pas cliqué ; les échanges
            qui suivent sont soumis aux conditions de ces services.
          </p>
        </LegalSection>
        <LegalSection title="Cookies">
          <p>
            Le site public n'utilise pas de cookie publicitaire ni de mesure d'audience. Un cookie technique de sécurité est déposé pour protéger l'envoi des formulaires,
            et un cookie de session est utilisé uniquement dans l'espace d'administration.
          </p>
        </LegalSection>
        <LegalSection title="Vos droits">
          <p>
            Vous pouvez demander l'accès à vos données, leur rectification ou leur suppression en nous contactant via la <Link to="/contact" className="link">page de contact</Link>.
          </p>
          <p>
            <ToComplete>références de la déclaration ou de l'autorisation auprès de la CNDP (loi 09-08), le cas échéant</ToComplete>
          </p>
        </LegalSection>
      </div>
    </>
  );
}
