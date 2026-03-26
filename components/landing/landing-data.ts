// components/landing/landing-data.ts

export const WHATSAPP_NUMBER = '221781043505';
export const WHATSAPP_MESSAGE = "Bonjour, j'aimerais en savoir plus sur FayClick.";

export interface CibleCard {
  icon: string;
  problem: string;
  problemDesc: string;
  solutionTitle: string;
  solutionDesc: string;
}

export const CIBLES_DATA: CibleCard[] = [
  {
    icon: '📒',
    problem: '"Je note tout dans un cahier"',
    problemDesc: 'Ventes perdues, stocks imprécis, clients oubliés. Le cahier ne calcule pas vos bénéfices.',
    solutionTitle: 'Dashboard intelligent',
    solutionDesc: 'Tout est automatique : ventes, stocks, bénéfices en temps réel sur votre téléphone.',
  },
  {
    icon: '💸',
    problem: '"Les clients paient quand ils veulent"',
    problemDesc: 'Crédits non suivis, impayés oubliés, pas de relance automatique.',
    solutionTitle: 'Suivi des impayés + relance SMS',
    solutionDesc: 'Chaque crédit est tracé. Relancez vos clients en un clic par SMS.',
  },
  {
    icon: '🏪',
    problem: '"Je ne sais pas ce qui me reste en stock"',
    problemDesc: 'Ruptures de stock imprévues, commandes tardives, pertes de ventes.',
    solutionTitle: 'Gestion de stock en temps réel',
    solutionDesc: 'Stock mis à jour à chaque vente. Alertes de rupture automatiques.',
  },
  {
    icon: '🌙',
    problem: '"Je vends en ligne même quand je ferme"',
    problemDesc: "Boutique fermée = zéro vente. Pas de visibilité en dehors des heures d'ouverture.",
    solutionTitle: 'Catalogue & Marketplace 24/7',
    solutionDesc: 'FayClick expose vos produits dans son marketplace pour vous permettre de vendre H24.',
  },
];

export interface FeatureCard {
  icon: string;
  colorClass: string;
  title: string;
  description: string;
}

export const FEATURES_DATA: FeatureCard[] = [
  { icon: '⚡', colorClass: 'emerald', title: 'Vente Flash', description: 'Encaissez en 3 secondes. Client anonyme, paiement CASH immédiat, reçu automatique.' },
  { icon: '📱', colorClass: 'amber', title: 'Wave, OM & Free Money', description: 'Acceptez les paiements mobile money directement. Vos clients paient par QR code.' },
  { icon: '📦', colorClass: 'blue', title: 'Gestion des Stocks', description: 'Stock mis à jour à chaque vente. Inventaire, alertes de rupture, historique des mouvements.' },
  { icon: '👥', colorClass: 'purple', title: 'Fichier Clients', description: "Historique d'achats, crédits en cours, relance SMS en un clic. Fidélisez sans effort." },
  { icon: '📊', colorClass: 'teal', title: 'Tableau de Bord', description: "CA du jour, top produits, top clients, graphiques. Vos chiffres en un coup d'œil." },
  { icon: '🧾', colorClass: 'rose', title: 'Factures & Reçus', description: 'Factures professionnelles, reçus tickets 80mm, bons de livraison. Impression ou partage WhatsApp.' },
  { icon: '🛍️', colorClass: 'yellow', title: 'Catalogue & Marketplace', description: 'Exposez vos produits en ligne 24/7. Vos clients commandent même quand la boutique est fermée.' },
  { icon: '🔐', colorClass: 'emerald', title: 'Coffre-Fort KALPE', description: 'Soldes OM, Wave et Free centralisés. Retirez votre argent quand vous voulez.' },
  { icon: '📷', colorClass: 'violet', title: 'Scan Code-Barres', description: 'Scannez vos produits avec la caméra du téléphone. Ajout au panier instantané.' },
];

export interface VideoTutorial {
  number: string;
  title: string;
  subtitle: string;
  colorClass: string;
  src: string;
}

export const VIDEOS_DATA: VideoTutorial[] = [
  { number: '01', title: 'Créer un compte gratuitement', subtitle: 'Inscription en 2 minutes', colorClass: 'emerald', src: '/videos/1.mp4' },
  { number: '02', title: 'Démarrer avec FayClick', subtitle: "Premier pas dans l'application", colorClass: 'emerald', src: '/videos/2.mp4' },
  { number: '03', title: 'Ajouter vos produits et stocks', subtitle: 'Catalogue et inventaire', colorClass: 'emerald', src: '/videos/3.mp4' },
  { number: '04', title: 'Effectuer une Vente', subtitle: 'Panier et encaissement', colorClass: 'emerald', src: '/videos/4.mp4' },
  { number: '05', title: 'Fidéliser vos clients', subtitle: 'Fichier clients et historique', colorClass: 'emerald', src: '/videos/5.mp4' },
  { number: '06', title: 'Accepter des Paiements Wave/OM/Free', subtitle: 'Mobile money intégré', colorClass: 'amber', src: '/videos/6.mp4' },
  { number: '07', title: 'Suivre vos clients et les impayés', subtitle: 'Crédits et relances SMS', colorClass: 'emerald', src: '/videos/7.mp4' },
  { number: '08', title: 'Voir Stats et Inventaires', subtitle: 'Dashboard et rapports', colorClass: 'emerald', src: '/videos/8.mp4' },
  { number: '09', title: 'Renouveler son abonnement', subtitle: "Gestion de l'abonnement", colorClass: 'violet', src: '/videos/9.mp4' },
];

export const PWA_ADVANTAGES = [
  { title: 'Pas de téléchargement', desc: 'Pas besoin de Play Store ni App Store. Ouvrez fayclick.com et travaillez.' },
  { title: 'Toujours à jour', desc: 'Mises à jour automatiques. Pas de version obsolète sur votre téléphone.' },
  { title: 'Zéro espace disque', desc: 'Ne prend pas de place sur votre téléphone. Idéal pour les appareils avec peu de mémoire.' },
  { title: 'Multi-appareil', desc: 'Téléphone, tablette, ordinateur — un seul compte, toutes vos données synchronisées.' },
];

export const BROWSER_GUIDES = [
  {
    name: 'Google Chrome',
    icon: 'G',
    iconGradient: 'from-[#4285F4] to-[#34A853]',
    recommended: true,
    steps: [
      'Ouvrez fayclick.com',
      'Menu ⋮ (3 points en haut à droite)',
      '"Ajouter à l\'écran d\'accueil"',
      'Confirmez → icône FayClick ajoutée !',
    ],
  },
  {
    name: 'Safari (iPhone)',
    icon: '🧭',
    iconGradient: 'from-[#007AFF] to-[#5AC8FA]',
    recommended: false,
    steps: [
      'Ouvrez fayclick.com',
      'Bouton partage ⬆ (en bas)',
      '"Sur l\'écran d\'accueil"',
      'Confirmez → c\'est prêt !',
    ],
  },
  {
    name: 'Samsung Internet',
    icon: 'S',
    iconGradient: 'from-[#1428A0] to-[#6E7FF3]',
    recommended: false,
    steps: [
      'Ouvrez fayclick.com',
      'Menu ≡ → "Ajouter à l\'écran d\'accueil"',
      'Confirmez et retrouvez FayClick sur votre bureau',
    ],
  },
];

export const NAV_LINKS = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Cibles', href: '#cibles' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Télécharger', href: '#telechargements' },
  { label: 'Support', href: '#support' },
];

export const FOOTER_NAV = [
  { label: 'Accueil', href: '#hero' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Télécharger', href: '#telechargements' },
  { label: 'Tutoriels', href: '#support' },
  { label: 'Marketplace', href: '/catalogues' },
];

export const FOOTER_LEGAL = [
  { label: "Conditions d'utilisation", href: '#' },
  { label: 'Politique de confidentialité', href: '#' },
  { label: 'Mentions légales', href: '#' },
];

export const PROFILS_CIBLES = ['Boutiquiers', 'Commerçants de marché', 'Vendeurs ambulants', 'Grossistes'];

export const STATS_DATA = [
  { value: '500+', label: 'Marchands actifs' },
  { value: '24/7', label: 'Support WhatsApp' },
  { value: '100%', label: 'Gratuit au départ' },
];
