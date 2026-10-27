// components/landing/landing-data.ts

export const WHATSAPP_NUMBER = '221781043505';
export const WHATSAPP_MESSAGE = "Bonjour, j'aimerais en savoir plus sur FayClick.";

// ─── Trio de bénéfices (règle des 3 — refonte enrôlement) ───
export interface TrioBenefit {
  icon: 'zap' | 'smartphone' | 'package';
  colorClass: 'emerald' | 'sky' | 'teal';
  problem: string;
  title: string;
  description: string;
}

export const TRIO_BENEFITS: TrioBenefit[] = [
  {
    icon: 'zap',
    colorClass: 'emerald',
    problem: '« À la caisse, les clients attendent et tout se mélange… »',
    title: 'Encaissez en 3 secondes',
    description:
      'Sélectionnez les produits, encaissez en espèces ou mobile money, le reçu part tout seul. Même dans la foule du marché.',
  },
  {
    icon: 'smartphone',
    colorClass: 'sky',
    problem: "« Certains clients n'ont pas d'espèces sur eux… »",
    title: 'Vos clients paient comme ils veulent',
    description:
      'Wave, Orange Money, Free Money ou espèces : tout est compté, tout est tracé, sans calcul mental.',
  },
  {
    icon: 'package',
    colorClass: 'teal',
    problem: '« Je note tout dans un cahier et je perds le compte… »',
    title: 'Vos chiffres, sans le cahier',
    description:
      "Le stock se met à jour à chaque vente, les alertes arrivent avant la rupture, et votre journée s'affiche toute seule.",
  },
];

// ─── Fonctionnalités secondaires (chips compacts) ───
export const SECONDARY_FEATURES = [
  'Fichier clients',
  'Factures & reçus',
  'Marketplace 24/7',
  'Coffre-Fort KALPE',
  'Scan Code-Barres',
  'Relance SMS',
];

// ─── FAQ (remplace les vidéos tutoriels, fichiers absents) ───
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    question: 'Combien ça coûte ?',
    answer:
      'Créer votre boutique et encaisser vos premières ventes est gratuit. Des options payantes (coffre-fort KALPE, relances SMS avancées) arriveront plus tard — vous ne serez jamais facturé sans le savoir.',
  },
  {
    question: 'Faut-il internet tout le temps ?',
    answer:
      'Non. FayClick fonctionne hors ligne : vos ventes sont enregistrées sur votre téléphone et synchronisées dès que la connexion revient.',
  },
  {
    question: 'Puis-je accepter Wave sans compte marchand ?',
    answer:
      "Oui. Notez le paiement mobile money de votre client comme n'importe quel encaissement : Wave, Orange Money ou Free Money. L'argent arrive sur votre compte mobile money habituel.",
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer:
      'Oui. Vos données sont chiffrées et sauvegardées chaque jour. Elles restent les vôtres et sont exportables à tout moment.',
  },
  {
    question: 'Ça marche sur mon téléphone ?',
    answer:
      'Si vous pouvez ouvrir fayclick.com dans votre navigateur, oui. Pas de téléchargement lourd : FayClick est une web-app qui tourne même sur les petits forfaits et les téléphones modestes.',
  },
  {
    question: 'Comment être accompagné ?',
    answer:
      'Notre équipe répond sur WhatsApp 24/7 au +221 78 104 35 05, en français comme en wolof. Nous pouvons même configurer votre première boutique avec vous.',
  },
];

// ─── Levée d'objections ───
export interface ObjectionCard {
  icon: 'gift' | 'globe' | 'whatsapp';
  colorClass: 'emerald' | 'sky' | 'green';
  title: string;
  description: string;
}

export const OBJECTIONS_DATA: ObjectionCard[] = [
  {
    icon: 'gift',
    colorClass: 'emerald',
    title: 'Gratuit au départ',
    description:
      'Créez votre boutique et encaissez vos premières ventes sans payer. Les options avancées arrivent plus tard, sans surprise.',
  },
  {
    icon: 'globe',
    colorClass: 'sky',
    title: 'Sans téléchargement',
    description:
      "Ouvrez fayclick.com dans votre navigateur, c'est tout. Installable en un clic si vous voulez l'écran d'accueil.",
  },
  {
    icon: 'whatsapp',
    colorClass: 'green',
    title: 'Support WhatsApp 24/7',
    description: 'Une question ? Notre équipe répond jour et nuit, en français comme en wolof.',
  },
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

// ─── Témoignages (preuve sociale) ───
export interface Testimonial {
  initials: string;
  name: string;
  location: string;
  quote: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    initials: 'AD',
    name: 'Aminata D.',
    location: 'Boutique Sandaga, Dakar',
    quote: '« Avant, je notais tout dans un cahier. Maintenant je sais exactement combien j\'ai gagné chaque jour. »',
  },
  {
    initials: 'MS',
    name: 'Moussa S.',
    location: 'Marché HLM, Dakar',
    quote: '« Mes clients paient par Wave, je sors mon téléphone, la vente est enregistrée. Même la nuit. »',
  },
  {
    initials: 'FN',
    name: 'Fatou N.',
    location: 'Castors, Dakar',
    quote: '« Le stock se met à jour tout seul. Je sais ce qu\'il faut commander avant que ce soit fini. »',
  },
];

// ─── Badges gamification détournés en preuve sociale ───
export interface GamificationBadge {
  icon: 'trophy' | 'package-check' | 'shield-check';
  colorClass: 'emerald' | 'sky' | 'teal';
  label: string;
  holder: string;
}

export const GAMIFICATION_BADGES: GamificationBadge[] = [
  { icon: 'trophy', colorClass: 'emerald', label: 'Vendeur du Mois', holder: 'Cheikh Boutique — Marché HLM' },
  { icon: 'package-check', colorClass: 'sky', label: 'Stock Parfait', holder: 'Modou Électronique — Castors' },
  { icon: 'shield-check', colorClass: 'teal', label: 'Zéro Impayé', holder: 'Awa Cosmétiques — Grand Yoff' },
];

// ─── Micro-astuces du splash (storytelling de chargement) ───
export const SPLASH_TIPS = [
  "💡 Astuce : notez chaque vente le jour même — vos bénéfices se calculent tout seuls.",
  '🚀 Plus de 1 386 marchands sénégalais encaissent déjà avec FayClick.',
  "💡 Astuce : relancez un client qui vous doit de l'argent, en un seul clic.",
];

// ─── Navigation ───
export const NAV_LINKS = [
  { label: 'Fonctionnement', href: '#fonctionnement' },
  { label: 'Preuve', href: '#preuve' },
  { label: 'Télécharger', href: '#telecharger' },
  { label: 'Aide', href: '#aide' },
];

export const FOOTER_NAV = [
  { label: 'Fonctionnement', href: '#fonctionnement' },
  { label: 'Preuve', href: '#preuve' },
  { label: 'Aide', href: '#aide' },
  { label: 'Marketplace', href: '/catalogues' },
];

export const FOOTER_LEGAL = [
  { label: "Conditions d'utilisation", href: '/terms' },
  { label: 'Politique de confidentialité', href: '/privacy' },
];

export const PROFILS_CIBLES = ['Boutiquiers', 'Commerçants de marché', 'Vendeurs ambulants', 'Grossistes'];

export const STATS_DATA = [
  { value: '1386+', label: 'Marchands actifs' },
  { value: '45 000+', label: 'Ventes enregistrées' },
  { value: '100%', label: 'Gratuit au départ' },
];
