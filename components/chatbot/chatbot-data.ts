// components/chatbot/chatbot-data.ts
// Corpus FAQ du chatbot — réponses traduites à la main (fr/en/wo).
// Ces réponses sont servies LOCALEMENT (instantané, zéro coût) ;
// le LLM (proxy PHP) ne traite que les questions hors corpus.

import type { Locale } from '@/contexts/LanguageContext';

export interface FaqEntry {
  id: string;
  keysFr: string[];
  keysEn: string[];
  keysWo: string[];
  answers: Record<Locale, string>;
  /** Ajoute le lien « Créer ma boutique gratuite → » après la réponse */
  ctaRegister?: boolean;
}

export const FAQ_CORPUS: FaqEntry[] = [
  {
    id: 'gratuit',
    keysFr: ['gratuit', 'prix', 'coût', 'cout', 'payer', 'tarif', 'abonnement'],
    keysEn: ['free', 'price', 'cost', 'pay', 'subscription'],
    keysWo: ['mbaam', 'pey', 'njëgg', 'payer'],
    answers: {
      fr: '✅ <b>Gratuit au départ !</b> Vous créez votre boutique et encaissez vos premières ventes sans payer. Des options avancées (coffre-fort KALPE, relances SMS) arriveront plus tard, sans surprise.',
      en: '✅ <b>Free to start!</b> Create your shop and take your first payments without paying. Advanced options (KALPE safe, SMS reminders) will come later, with no surprises.',
      wo: '✅ <b>Baaxul pey bu jëkk!</b> Defal sa boutique te fat sa njëkk vente ba doylu. Ay options yu kawe (coffre KALPE, relance SMS) dañuy ñëw ginnaaw, amul lu la saas.',
    },
    ctaRegister: true,
  },
  {
    id: 'howto',
    keysFr: ['comment ça marche', 'comment ca marche', 'fonctionne', 'utiliser', 'demarrer', 'démarrer', 'commencer'],
    keysEn: ['how it works', 'how does it work', 'get started', 'start', 'use'],
    keysWo: ['naka lay ligéeye', 'nakka lay dox', 'tàmbali'],
    answers: {
      fr: '📱 C\'est simple comme 1 · 2 · 3 :<br>1. Créez votre compte (2 minutes)<br>2. Ajoutez vos produits<br>3. Encaissez votre première vente — espèces, Wave, OM ou Free Money.',
      en: '📱 As simple as 1 · 2 · 3:<br>1. Create your account (2 minutes)<br>2. Add your products<br>3. Take your first payment — cash, Wave, OM or Free Money.',
      wo: '📱 Saafara niki 1 · 2 · 3 :<br>1. Defal sa compte (2 minutes)<br>2. Yokk sa produits<br>3. Fat sa jëkk vente — cash, Wave, OM walla Free Money.',
    },
    ctaRegister: true,
  },
  {
    id: 'paiements',
    keysFr: ['wave', 'orange money', 'om', 'mobile money', 'paiement', 'payer client', 'especes', 'espèces'],
    keysEn: ['wave', 'orange money', 'mobile money', 'payment', 'cash'],
    keysWo: ['wave', 'orange money', 'paiement', 'fatu', 'cash'],
    answers: {
      fr: '💸 Oui ! Vos clients paient comme ils veulent : <b>Wave, Orange Money, Free Money ou espèces</b>. Tout est compté et tracé automatiquement, sans calcul mental.',
      en: '💸 Yes! Your customers pay however they like: <b>Wave, Orange Money, Free Money or cash</b>. Everything is counted and tracked automatically.',
      wo: '💸 Waaw ! Sa clients ñoom dañuy fey naka la ñu bëgge : <b>Wave, Orange Money, Free Money walla cash</b>. Lépp day conté te teewal boppam.',
    },
    ctaRegister: true,
  },
  {
    id: 'stock',
    keysFr: ['stock', 'inventaire', 'rupture', 'produit'],
    keysEn: ['stock', 'inventory', 'product'],
    keysWo: ['stock', 'inventaire', 'produits'],
    answers: {
      fr: '📦 Le stock se met à jour à chaque vente et des <b>alertes arrivent avant la rupture</b>. Fini le cahier : votre journée s\'affiche toute seule.',
      en: '📦 Stock updates with every sale and <b>alerts arrive before you run out</b>. No more notebook: your day displays itself.',
      wo: '📦 Stock bi day yokku ci yoon-yoon bu fat, <b>ay waxtaan dañuy ñëw bu maasee</b>. Du nga bëgg cahier : sa bés day feeñ ci boppam.',
    },
  },
  {
    id: 'download',
    keysFr: ['télécharger', 'telecharger', 'installer', 'application', 'app', 'play store', 'app store'],
    keysEn: ['download', 'install', 'app', 'play store', 'app store'],
    keysWo: ['télécharger', 'installer', 'app'],
    answers: {
      fr: '🌐 Aucun téléchargement obligatoire ! Ouvrez fayclick.com dans votre navigateur. Pour l\'expérience « app », ajoutez la page à votre écran d\'accueil en un clic.',
      en: '🌐 No download required! Just open fayclick.com in your browser. For an app-like experience, add the page to your home screen in one tap.',
      wo: '🌐 Amul téléchargement bu laaj ! Ubbi fayclick.com ci sa navigateur. Bu la bëggee « app », yokk xët bi ci sa écran d\'accueil ci benn clic.',
    },
  },
  {
    id: 'offline',
    keysFr: ['hors ligne', 'offline', 'sans internet', 'connexion', 'reseau', 'réseau'],
    keysEn: ['offline', 'no internet', 'connection', 'network'],
    keysWo: ['offline', 'amul internet', 'connexion'],
    answers: {
      fr: '📶 Oui ! FayClick fonctionne <b>hors ligne</b> : vos ventes sont enregistrées sur votre téléphone et synchronisées dès que la connexion revient.',
      en: '📶 Yes! FayClick works <b>offline</b>: your sales are saved on your phone and synced as soon as the connection returns.',
      wo: '📶 Waaw ! FayClick day dox <b>bu amul internet</b> : sa ventes dañuy bind ci sa téléphone te dañuy sync bu connexion dellusi.',
    },
  },
  {
    id: 'securite',
    keysFr: ['sécurité', 'securite', 'données', 'donnees', 'confidentiel', 'vol'],
    keysEn: ['security', 'data', 'private', 'safe'],
    keysWo: ['securite', 'données', 'kaaraange'],
    answers: {
      fr: '🔒 Vos données sont <b>chiffrées et sauvegardées chaque jour</b>. Elles restent les vôtres et sont exportables à tout moment.',
      en: '🔒 Your data is <b>encrypted and backed up daily</b>. It stays yours and can be exported at any time.',
      wo: '🔒 Sa données dañu <b>cryptées te sauvegardées bés bu nekk</b>. Yow ñu la, te mën nga leen export ci kàddam kàddam.',
    },
  },
  {
    id: 'clients',
    keysFr: ['client', 'fidélis', 'fidelis', 'relance', 'sms', 'impayé', 'impaye', 'crédit', 'credit'],
    keysEn: ['customer', 'loyalty', 'reminder', 'sms', 'debt', 'credit'],
    keysWo: ['client', 'relance', 'sms', 'dette'],
    answers: {
      fr: '👥 Chaque client a sa fiche : historique d\'achats, crédits en cours, et <b>relance SMS en un clic</b> pour les impayés.',
      en: '👥 Every customer has a profile: purchase history, pending credits, and <b>one-tap SMS reminders</b> for unpaid balances.',
      wo: '👥 Benn benn client am na ay xibaar : historique d\'achats, crédits yu des, te <b>relance SMS ci benn clic</b> ngir ñi ñu la dell.',
    },
  },
  {
    id: 'marketplace',
    keysFr: ['marketplace', 'catalogue', 'boutique en ligne', 'vendre en ligne', '24/7'],
    keysEn: ['marketplace', 'catalog', 'online', '24/7'],
    keysWo: ['marketplace', 'catalogue', 'online'],
    answers: {
      fr: '🛍️ La <b>marketplace FayClick</b> expose vos produits 24/7 : vos clients commandent même quand la boutique est fermée.',
      en: '🛍️ The <b>FayClick marketplace</b> showcases your products 24/7: customers order even when your shop is closed.',
      wo: '🛍️ <b>Marketplace FayClick</b> day wone sa produits 24/7 : sa clients dañuy commande bu sa boutique tàjje.',
    },
  },
  {
    id: 'kalpe',
    keysFr: ['kalpe', 'coffre', 'retrait', 'argent', 'solde'],
    keysEn: ['kalpe', 'safe', 'withdraw', 'money', 'balance'],
    keysWo: ['kalpe', 'coffre', 'xalis'],
    answers: {
      fr: '🔐 Le <b>coffre-fort KALPE</b> centralise vos soldes OM, Wave et Free. Vous retirez votre argent quand vous voulez.',
      en: '🔐 The <b>KALPE safe</b> centralizes your OM, Wave and Free balances. Withdraw your money whenever you want.',
      wo: '🔐 <b>Coffre KALPE</b> day boole sa soldes OM, Wave ak Free. Mën nga jel sa xalis bu la soob.',
    },
  },
  {
    id: 'support',
    keysFr: ['whatsapp', 'humain', 'conseiller', 'aide', 'support', 'contacter', 'parler', 'question'],
    keysEn: ['whatsapp', 'human', 'advisor', 'help', 'support', 'contact', 'talk'],
    keysWo: ['whatsapp', 'nit', 'ndimbal', 'support', 'wax'],
    answers: {
      fr: '💬 Notre équipe répond sur <b>WhatsApp 24/7</b> au +221 78 104 35 05, en français comme en wolof. Nous pouvons même configurer votre première boutique avec vous.',
      en: '💬 Our team answers on <b>WhatsApp 24/7</b> at +221 78 104 35 05, in French and Wolof. We can even set up your first shop with you.',
      wo: '💬 Sama équipe day tontu ci <b>WhatsApp 24/7</b> ci +221 78 104 35 05, ci français ak wolof. Mën nanu defal ak yow sa jëkk boutique.',
    },
  },
  {
    id: 'telephone',
    keysFr: ['téléphone', 'telephone', 'mobile', 'android', 'iphone', 'vieux'],
    keysEn: ['phone', 'mobile', 'android', 'iphone', 'old'],
    keysWo: ['téléphone', 'mobile', 'android'],
    answers: {
      fr: '📱 Si vous pouvez ouvrir fayclick.com dans votre navigateur, ça marche ! FayClick est une web-app légère qui tourne même sur les petits forfaits et les téléphones modestes.',
      en: '📱 If you can open fayclick.com in your browser, it works! FayClick is a lightweight web-app that runs even on small data plans and modest phones.',
      wo: '📱 Su mën nga ubbi fayclick.com ci sa navigateur, day dox ! FayClick web-app bu lejjet la, day dox ci forfaits yu ndaw ak téléphones yu yomb.',
    },
  },
];

export const WHATSAPP_BOT_URL = (lang: Locale) => {
  const texts: Record<Locale, string> = {
    fr: 'Bonjour, j\'aimerais parler à un conseiller FayClick.',
    en: 'Hello, I would like to talk to a FayClick advisor.',
    wo: 'Salaam, dama bëgg wax ak benn conseiller FayClick.',
  };
  return `https://wa.me/221781043505?text=${encodeURIComponent(texts[lang])}`;
};
