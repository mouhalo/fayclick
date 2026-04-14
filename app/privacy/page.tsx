import Link from 'next/link';
import { Metadata } from 'next';
import { Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Politique de confidentialité - FayClick',
  description:
    'Politique de confidentialité FayClick V2 : données personnelles, cookies, RGPD',
};

export default function PrivacyPage() {
  const lastUpdate = '13 avril 2026';

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background:
          'linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #134e4a 100%)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-emerald-200/70 text-sm mb-8">
          Dernière mise à jour : {lastUpdate}
        </p>

        <div className="space-y-6 text-emerald-50/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              1. Responsable du traitement
            </h2>
            <p>
              FayClick, édité par ICELABSOFT-SARL (Dakar, Sénégal), est
              responsable du traitement des données personnelles collectées
              dans le cadre de l&apos;utilisation de la plateforme. Pour toute
              question :{' '}
              <a
                href="https://wa.me/221781043505"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300 underline hover:text-emerald-200"
              >
                support via WhatsApp
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              2. Données collectées
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Identification du marchand</strong> : nom de la
                structure, adresse, numéro de téléphone, email (si pays
                CEDEAO/Maghreb hors Sénégal), logo.
              </li>
              <li>
                <strong>Données transactionnelles</strong> : factures,
                paiements, ventes, catalogue, clients associés.
              </li>
              <li>
                <strong>Données d&apos;usage</strong> : pages consultées, actions
                effectuées, logs techniques (adresse IP, type d&apos;appareil).
              </li>
              <li>
                <strong>Données de connexion mobile</strong> : numéros
                associés aux comptes Orange Money / Wave / Free / WhatsApp
                pour l&apos;authentification OTP.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              3. Finalités du traitement
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fourniture et amélioration continue de nos services.</li>
              <li>
                Authentification sécurisée (OTP par SMS, WhatsApp ou email).
              </li>
              <li>
                Production <strong>d&apos;analyses et de statistiques
                agrégées anonymisées</strong> destinées à comprendre les
                tendances de consommation, les volumes sectoriels et à
                alimenter des rapports marché.
              </li>
              <li>
                Respect des obligations légales, comptables et fiscales.
              </li>
              <li>
                Communication relative au service (notifications
                fonctionnelles, support).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              4. Anonymisation et données agrégées
            </h2>
            <p>
              Conformément aux{' '}
              <Link
                href="/terms"
                className="text-emerald-300 underline hover:text-emerald-200"
              >
                conditions générales
              </Link>
              , FayClick réalise des analyses à partir de données strictement
              anonymisées. Les identifiants personnels (nom, téléphone,
              email, adresse précise) sont systématiquement supprimés ou
              remplacés par des identifiants techniques avant toute
              exploitation statistique. Les jeux de données agrégés ne
              permettent en aucun cas la ré-identification d&apos;un marchand
              ou d&apos;un client final.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              5. Base légale
            </h2>
            <p>
              Les traitements reposent sur : (i) l&apos;exécution du contrat
              liant l&apos;utilisateur à FayClick, (ii) le consentement de
              l&apos;utilisateur à l&apos;inscription (acceptation des CGU et
              de la politique de confidentialité), (iii) les obligations
              légales applicables, et (iv) l&apos;intérêt légitime de
              FayClick à améliorer son service sur la base de données
              anonymisées.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              6. Durée de conservation
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Données de compte actif : durée de vie du compte + 3 ans
                après fermeture.
              </li>
              <li>
                Données comptables (factures, paiements) : 10 ans,
                conformément aux obligations légales.
              </li>
              <li>
                Logs techniques : 12 mois maximum.
              </li>
              <li>
                Données anonymisées agrégées : conservation illimitée (non
                identifiantes).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              7. Destinataires
            </h2>
            <p>
              Les données personnelles ne sont <strong>jamais vendues</strong>.
              Elles peuvent être transmises à :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Nos sous-traitants techniques (hébergement, API SMS/email/
                WhatsApp, passerelles de paiement) sous contrat de
                confidentialité.
              </li>
              <li>
                Les autorités compétentes sur réquisition judiciaire.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              8. Transferts hors UE
            </h2>
            <p>
              Certains sous-traitants (Meta pour WhatsApp, fournisseurs de
              services cloud) peuvent être situés hors Union Européenne. Ces
              transferts sont encadrés par les clauses contractuelles types
              de la Commission Européenne ou par des mécanismes équivalents
              garantissant un niveau de protection adéquat.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              9. Vos droits RGPD
            </h2>
            <p>
              Conformément au RGPD et à la loi sénégalaise n° 2008-12, vous
              disposez des droits suivants sur vos données personnelles :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Droit d&apos;accès et de copie.</li>
              <li>Droit de rectification.</li>
              <li>Droit à l&apos;effacement (« droit à l&apos;oubli »).</li>
              <li>Droit à la limitation du traitement.</li>
              <li>Droit à la portabilité.</li>
              <li>Droit d&apos;opposition au traitement.</li>
              <li>
                Droit de définir des directives post-mortem sur vos données.
              </li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous via le support WhatsApp.
              Nous vous répondrons dans un délai maximum de 30 jours.
            </p>
            <p className="mt-2 text-sm text-emerald-200/80">
              ⚠️ Les droits RGPD portent uniquement sur vos données
              personnelles identifiantes. Les données anonymisées intégrées
              dans nos analyses agrégées ne relèvent pas du champ d&apos;application
              du RGPD et ne peuvent être retirées rétroactivement des jeux
              statistiques déjà produits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              10. Cookies
            </h2>
            <p>
              FayClick utilise uniquement des cookies strictement nécessaires
              au fonctionnement du service (session, authentification,
              préférences utilisateur). Aucun cookie publicitaire ni de
              tracking tiers n&apos;est déposé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              11. Sécurité
            </h2>
            <p>
              Nous mettons en œuvre des mesures techniques et
              organisationnelles adaptées : chiffrement HTTPS, stockage
              sécurisé des mots de passe, tokens OTP à usage unique, audits
              périodiques, contrôle d&apos;accès strict côté serveur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              12. Réclamation
            </h2>
            <p>
              Si vous estimez que le traitement de vos données personnelles
              ne respecte pas la réglementation, vous pouvez introduire une
              réclamation auprès de la Commission de Protection des Données
              Personnelles du Sénégal (CDP) ou de l&apos;autorité compétente
              de votre pays de résidence.
            </p>
          </section>

          <p className="text-xs text-emerald-200/60 pt-4 border-t border-emerald-400/20">
            Cette politique complète nos{' '}
            <Link
              href="/terms"
              className="text-emerald-300 underline hover:text-emerald-200"
            >
              conditions générales d&apos;utilisation
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
