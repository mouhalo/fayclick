import Link from 'next/link';
import { Metadata } from 'next';
import { Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Conditions Générales - FayClick',
  description: 'Conditions générales d\'utilisation de FayClick V2',
};

export default function TermsPage() {
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
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-emerald-200/70 text-sm mb-8">
          Dernière mise à jour : {lastUpdate}
        </p>

        <div className="space-y-6 text-emerald-50/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              1. Acceptation des conditions
            </h2>
            <p>
              En créant un compte FayClick, en utilisant l&apos;application ou en
              souscrivant à l&apos;un de nos services, vous reconnaissez avoir lu,
              compris et accepté l&apos;intégralité des présentes conditions
              générales. Si vous n&apos;êtes pas d&apos;accord avec l&apos;une
              quelconque de ces dispositions, vous devez cesser immédiatement
              d&apos;utiliser nos services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              2. Objet de la plateforme
            </h2>
            <p>
              FayClick est une Super App destinée aux marchands des secteurs
              commerciaux, services, scolaires et immobiliers au Sénégal et
              dans les pays CEDEAO, UEMOA et Maghreb. La plateforme permet la
              gestion des ventes, factures, clients, catalogues, paiements
              mobiles et autres fonctionnalités dédiées aux petites et
              moyennes structures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              3. Utilisation des données et analyses agrégées
            </h2>
            <p className="mb-2">
              FayClick utilise <strong>exclusivement des données anonymisées
              et agrégées</strong> issues de l&apos;activité de ses clients à
              des fins d&apos;analyse de la consommation, d&apos;amélioration
              du service et de production de statistiques sectorielles.
            </p>
            <p className="mb-2">
              En acceptant les présentes conditions, l&apos;utilisateur
              reconnaît et accepte expressément que :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Ses données de transaction, de catalogue, de clientèle et
                d&apos;usage peuvent être intégrées dans des jeux de données
                agrégées et anonymisées à des fins d&apos;analyse statistique
                et commerciale.
              </li>
              <li>
                Toute donnée personnelle identifiante est préalablement
                anonymisée conformément aux règles du <strong>Règlement
                Général sur la Protection des Données (RGPD)</strong> et aux
                lois nationales applicables (notamment la loi sénégalaise
                n° 2008-12 du 25 janvier 2008 sur la protection des données à
                caractère personnel).
              </li>
              <li>
                Les analyses résultantes (tendances de consommation, volumes
                sectoriels, panier moyen, etc.) ne permettent aucune
                identification directe ou indirecte d&apos;un individu ou
                d&apos;une structure en particulier.
              </li>
              <li>
                L&apos;utilisateur <strong>renonce expressément à toute
                poursuite judiciaire, demande de dédommagement ou
                réclamation</strong> à l&apos;encontre de FayClick, de ses
                dirigeants, employés ou partenaires, au titre de
                l&apos;intégration de ses données anonymisées dans ces
                analyses, statistiques ou jeux de données agrégées.
              </li>
              <li>
                L&apos;utilisateur conserve toutefois la faculté d&apos;exercer
                ses droits RGPD (accès, rectification, suppression, portabilité)
                sur ses données personnelles identifiantes auprès du support
                FayClick.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              4. Obligations de l&apos;utilisateur
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Fournir des informations exactes, à jour et conformes à la
                réalité lors de l&apos;inscription.
              </li>
              <li>
                Ne pas utiliser la plateforme à des fins frauduleuses,
                illégales ou contraires aux bonnes mœurs.
              </li>
              <li>
                Préserver la confidentialité de ses identifiants et de son
                code PIN.
              </li>
              <li>
                Respecter les droits de propriété intellectuelle de FayClick
                et des tiers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              5. Responsabilité
            </h2>
            <p>
              FayClick s&apos;engage à fournir la plateforme selon les règles
              de l&apos;art, mais ne saurait être tenue pour responsable de
              pertes de données, d&apos;indisponibilité temporaire, ou de
              dommages indirects résultant de l&apos;usage ou de
              l&apos;impossibilité d&apos;usage du service. Les transactions
              financières transitant par les partenaires mobile money (Orange
              Money, Wave, Free Money, WhatsApp) relèvent de la responsabilité
              exclusive desdits partenaires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              6. Résiliation
            </h2>
            <p>
              FayClick se réserve le droit de suspendre ou résilier tout
              compte en cas de violation des présentes conditions, sans
              préavis ni indemnité. L&apos;utilisateur peut à tout moment
              demander la fermeture de son compte via le support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              7. Modifications
            </h2>
            <p>
              FayClick se réserve le droit de modifier les présentes
              conditions à tout moment. Les utilisateurs seront informés par
              notification dans l&apos;application ou par email. La poursuite
              de l&apos;utilisation du service vaut acceptation des nouvelles
              conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">
              8. Droit applicable et juridiction
            </h2>
            <p>
              Les présentes conditions sont régies par le droit sénégalais.
              Tout litige relatif à leur interprétation ou exécution relève de
              la compétence exclusive des tribunaux de Dakar, sans préjudice
              des dispositions impératives applicables à la protection des
              données personnelles dans le pays de résidence de
              l&apos;utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">9. Contact</h2>
            <p>
              Pour toute question relative aux présentes conditions ou à
              l&apos;exercice de vos droits RGPD :{' '}
              <a
                href="https://wa.me/221781043505"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300 underline hover:text-emerald-200"
              >
                support FayClick via WhatsApp
              </a>
              .
            </p>
          </section>

          <p className="text-xs text-emerald-200/60 pt-4 border-t border-emerald-400/20">
            Voir également notre{' '}
            <Link
              href="/privacy"
              className="text-emerald-300 underline hover:text-emerald-200"
            >
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
