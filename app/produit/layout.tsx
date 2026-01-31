import type { Metadata } from 'next';

// STORY-009 : Open Graph metadata statiques pour aperçus réseaux sociaux
// En static export, les OG tags sont statiques. WhatsApp/TikTok/Facebook
// liront ces balises lors du partage du lien.
export const metadata: Metadata = {
  title: 'Produit en vente - FayClick',
  description: 'Achetez ce produit et payez directement via Orange Money ou Wave. Rapide, sécurisé, sans inscription.',
  openGraph: {
    title: 'Produit en vente sur FayClick',
    description: 'Découvrez ce produit et payez facilement via Orange Money ou Wave. Sans inscription requise.',
    url: 'https://v2.fayclick.net/produit',
    siteName: 'FayClick',
    images: [
      {
        url: 'https://v2.fayclick.net/images/mascotte.png',
        width: 512,
        height: 512,
        alt: 'FayClick - Vente en ligne au Sénégal',
      },
    ],
    locale: 'fr_SN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Produit en vente sur FayClick',
    description: 'Achetez et payez via Orange Money ou Wave. Sans inscription.',
    images: ['https://v2.fayclick.net/images/mascotte.png'],
  },
};

export default function ProduitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
