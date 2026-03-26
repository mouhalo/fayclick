// ============================================================
// landing-data.ts — Données statiques pour la landing page
// FayClick V2 — Dark Premium Desktop Landing
// ============================================================

// ------------------------------------
// WhatsApp
// ------------------------------------
export const WHATSAPP_NUMBER = '221781043505';
export const WHATSAPP_MESSAGE =
  'Bonjour FayClick ! Je souhaite obtenir plus d\'informations sur votre application de gestion pour mon entreprise au Sénégal.';

// ------------------------------------
// Interfaces
// ------------------------------------
export interface CibleCard {
  icon: string;
  title: string;
  description: string;
  color: string;
  gradient: string;
  features: string[];
}

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  color: string;
  category: string;
}

export interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  category: string;
}

// ------------------------------------
// Cibles Data (4 segments métier)
// ------------------------------------
export const CIBLES_DATA: CibleCard[] = [
  {
    icon: '🏪',
    title: 'Commerce & Boutiques',
    description:
      'Gérez votre stock, vos ventes et vos clients avec une caisse complète adaptée aux boutiques sénégalaises.',
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-amber-500/10',
    features: [
      'Caisse & ventes rapides',
      'Gestion des stocks',
      'Factures & reçus',
      'Suivi clients',
      'Dépenses',
    ],
  },
  {
    icon: '🎓',
    title: 'Écoles & Institutions',
    description:
      'Suivez les scolarités, gérez les inscriptions et centralisez la comptabilité de votre établissement.',
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    features: [
      'Inscriptions élèves',
      'Suivi des paiements',
      'Bulletins & rapports',
      'Gestion des classes',
      'Notifications parents',
    ],
  },
  {
    icon: '🔧',
    title: 'Prestataires de Services',
    description:
      'Créez des devis, suivez vos prestations et facturez facilement vos clients partout au Sénégal.',
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-violet-500/10',
    features: [
      'Création de devis',
      'Suivi prestations',
      'Facturation clients',
      'Agenda & planning',
      'Rapports CA',
    ],
  },
  {
    icon: '🏠',
    title: 'Immobilier & Location',
    description:
      'Gérez vos biens, suivez les loyers et gardez un historique complet de vos locataires.',
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    features: [
      'Gestion des biens',
      'Suivi des loyers',
      'Contrats locataires',
      'États des lieux',
      'Rapports financiers',
    ],
  },
];

// ------------------------------------
// Features Data (9 fonctionnalités)
// ------------------------------------
export const FEATURES_DATA: FeatureCard[] = [
  {
    icon: '💰',
    title: 'Paiement Mobile Money',
    description:
      'Encaissez via Orange Money, Wave et Free Money directement dans l\'application. Confirmations instantanées.',
    color: 'text-orange-400',
    category: 'Paiement',
  },
  {
    icon: '📊',
    title: 'Dashboard Temps Réel',
    description:
      'Visualisez vos KPIs, chiffre d\'affaires, top produits et clients en temps réel depuis votre tableau de bord.',
    color: 'text-blue-400',
    category: 'Analytique',
  },
  {
    icon: '🧾',
    title: 'Facturation Professionnelle',
    description:
      'Créez des factures, devis, bons de livraison et reçus personnalisés avec votre logo en quelques secondes.',
    color: 'text-purple-400',
    category: 'Gestion',
  },
  {
    icon: '📦',
    title: 'Gestion des Stocks',
    description:
      'Suivez vos inventaires, recevez des alertes de stock faible et gérez vos entrées/sorties de marchandises.',
    color: 'text-emerald-400',
    category: 'Stock',
  },
  {
    icon: '👥',
    title: 'CRM Clients Intégré',
    description:
      'Centralisez tous vos clients, leur historique d\'achats et leurs coordonnées dans une base de données unifiée.',
    color: 'text-cyan-400',
    category: 'CRM',
  },
  {
    icon: '⚡',
    title: 'Vente Flash (Caisse Rapide)',
    description:
      'Encaissez en moins de 10 secondes avec la caisse rapide. Scan code-barres, client anonyme, CASH ou Mobile Money.',
    color: 'text-yellow-400',
    category: 'Ventes',
  },
  {
    icon: '🔐',
    title: 'Coffre-Fort KALPE',
    description:
      'Sécurisez vos gains Mobile Money dans votre coffre-fort numérique. Retraits sécurisés par OTP SMS.',
    color: 'text-rose-400',
    category: 'Sécurité',
  },
  {
    icon: '📱',
    title: 'PWA — Fonctionne Hors-ligne',
    description:
      'Installez FayClick comme une app native sur votre téléphone. Fonctionne même sans connexion internet.',
    color: 'text-indigo-400',
    category: 'PWA',
  },
  {
    icon: '📈',
    title: 'Rapports & Statistiques',
    description:
      'Analysez vos performances avec des graphiques détaillés, rapports par période et exports de données.',
    color: 'text-teal-400',
    category: 'Analytique',
  },
];

// ------------------------------------
// Videos Data (9 tutoriels)
// ------------------------------------
export const VIDEOS_DATA: VideoTutorial[] = [
  {
    id: 'v1',
    title: 'Premiers pas avec FayClick',
    description: 'Créez votre compte et configurez votre structure en moins de 5 minutes.',
    duration: '4:32',
    thumbnail: '/images/tutorials/thumb-getting-started.jpg',
    category: 'Démarrage',
  },
  {
    id: 'v2',
    title: 'Créer votre première facture',
    description: 'Ajoutez des articles, un client et générez votre première facture professionnelle.',
    duration: '3:15',
    thumbnail: '/images/tutorials/thumb-facture.jpg',
    category: 'Facturation',
  },
  {
    id: 'v3',
    title: 'Encaisser avec Orange Money',
    description: 'Processus complet de paiement OM : QR code, validation et confirmation.',
    duration: '2:48',
    thumbnail: '/images/tutorials/thumb-orange-money.jpg',
    category: 'Paiement',
  },
  {
    id: 'v4',
    title: 'Gérer votre stock',
    description: 'Ajoutez des produits, gérez les stocks et configurez les alertes.',
    duration: '5:20',
    thumbnail: '/images/tutorials/thumb-stock.jpg',
    category: 'Stock',
  },
  {
    id: 'v5',
    title: 'Vente Flash — Caisse Rapide',
    description: 'Encaissez en quelques secondes avec la vente flash. Idéal pour les commerces.',
    duration: '2:10',
    thumbnail: '/images/tutorials/thumb-venteflash.jpg',
    category: 'Ventes',
  },
  {
    id: 'v6',
    title: 'Tableau de bord Analytics',
    description: 'Comprendre vos KPIs, lire les graphiques et analyser vos performances.',
    duration: '6:05',
    thumbnail: '/images/tutorials/thumb-dashboard.jpg',
    category: 'Analytique',
  },
  {
    id: 'v7',
    title: 'Coffre-Fort KALPE & Retraits',
    description: 'Gérez vos soldes Mobile Money et effectuez des retraits sécurisés.',
    duration: '3:55',
    thumbnail: '/images/tutorials/thumb-kalpe.jpg',
    category: 'Wallet',
  },
  {
    id: 'v8',
    title: 'Installer FayClick sur Android',
    description: 'Ajoutez FayClick à l\'écran d\'accueil de votre téléphone Android.',
    duration: '1:30',
    thumbnail: '/images/tutorials/thumb-install-android.jpg',
    category: 'Installation',
  },
  {
    id: 'v9',
    title: 'Installer FayClick sur iPhone',
    description: 'Installez FayClick via Safari sur votre iPhone ou iPad.',
    duration: '1:45',
    thumbnail: '/images/tutorials/thumb-install-ios.jpg',
    category: 'Installation',
  },
];

// ------------------------------------
// PWA Advantages (4 avantages)
// ------------------------------------
export const PWA_ADVANTAGES = [
  {
    icon: '⚡',
    title: 'Installation Rapide',
    description: 'Ajoutez FayClick à votre écran d\'accueil en 2 clics. Aucun store nécessaire.',
    color: 'text-yellow-400',
  },
  {
    icon: '📶',
    title: 'Mode Hors-ligne',
    description: 'Continuez à travailler sans internet. Vos données se synchronisent automatiquement.',
    color: 'text-emerald-400',
  },
  {
    icon: '🔔',
    title: 'Notifications Push',
    description: 'Recevez des alertes en temps réel pour les paiements et les événements importants.',
    color: 'text-blue-400',
  },
  {
    icon: '🔄',
    title: 'Mises à Jour Auto',
    description: 'FayClick se met à jour automatiquement. Vous avez toujours la dernière version.',
    color: 'text-purple-400',
  },
];

// ------------------------------------
// Browser Guides (3 navigateurs)
// ------------------------------------
export const BROWSER_GUIDES = [
  {
    browser: 'Chrome',
    icon: '🌐',
    platform: 'Android',
    steps: [
      'Ouvrez FayClick dans Chrome',
      'Appuyez sur le menu ⋮ (3 points)',
      'Sélectionnez "Ajouter à l\'écran d\'accueil"',
      'Confirmez l\'installation',
    ],
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    browser: 'Safari',
    icon: '🧭',
    platform: 'iPhone / iPad',
    steps: [
      'Ouvrez FayClick dans Safari',
      'Appuyez sur l\'icône Partager □↑',
      'Sélectionnez "Sur l\'écran d\'accueil"',
      'Appuyez sur "Ajouter"',
    ],
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-amber-500/10',
  },
  {
    browser: 'Samsung Internet',
    icon: '📱',
    platform: 'Samsung Galaxy',
    steps: [
      'Ouvrez FayClick dans Samsung Internet',
      'Appuyez sur le menu ☰',
      'Sélectionnez "Ajouter page à"',
      'Choisissez "Écran d\'accueil"',
    ],
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-violet-500/10',
  },
];

// ------------------------------------
// Navigation Links (5 items)
// ------------------------------------
export const NAV_LINKS = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Cibles', href: '#cibles' },
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Télécharger', href: '#download' },
  { label: 'Support', href: '#support' },
];

// ------------------------------------
// Footer Navigation (5 items)
// ------------------------------------
export const FOOTER_NAV = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Télécharger', href: '#download' },
  { label: 'Tutoriels', href: '#tutoriels' },
  { label: 'Support', href: '#support' },
];

// ------------------------------------
// Footer Legal (3 items)
// ------------------------------------
export const FOOTER_LEGAL = [
  { label: 'Politique de Confidentialité', href: '/privacy' },
  { label: 'Conditions d\'Utilisation', href: '/terms' },
  { label: 'Mentions Légales', href: '/legal' },
];

// ------------------------------------
// Profils Cibles (4 items)
// ------------------------------------
export const PROFILS_CIBLES = [
  {
    icon: '🏪',
    label: 'Commerçants',
    description: 'Boutiques, épiceries, supermarchés',
  },
  {
    icon: '🎓',
    label: 'Établissements scolaires',
    description: 'Écoles, universités, centres de formation',
  },
  {
    icon: '🔧',
    label: 'Prestataires',
    description: 'Artisans, consultants, agences',
  },
  {
    icon: '🏠',
    label: 'Immobilier',
    description: 'Agences, propriétaires, promoteurs',
  },
];

// ------------------------------------
// Stats Data (3 statistiques)
// ------------------------------------
export const STATS_DATA = [
  {
    value: '500+',
    label: 'Structures actives',
    description: 'Entreprises qui font confiance à FayClick',
    icon: '🏢',
  },
  {
    value: '24/7',
    label: 'Disponibilité',
    description: 'Application accessible à toute heure',
    icon: '⏰',
  },
  {
    value: '100%',
    label: 'Sénégalais',
    description: 'Conçu pour le marché sénégalais',
    icon: '🇸🇳',
  },
];
