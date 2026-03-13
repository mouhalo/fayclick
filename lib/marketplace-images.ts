/**
 * Helper pour les images marketplace avec fallback
 * Les images cat_* seront fournies par l'infographiste
 * En attendant, on utilise des fallbacks avec icones
 */

const BASE = '/images/marketplace';

export const marketplaceImages = {
  heroBanner: `${BASE}/cat_hero_banner.png`,
  heroMobile: `${BASE}/cat_hero_mobile.png`,
  badgeVerified: `${BASE}/cat_badge_verified.svg`,
  badgeLive: `${BASE}/cat_badge_live.svg`,
  defaultCategory: `${BASE}/cat_default.png`,
};

/** Map nom_categorie DB → fichier image */
const CATEGORY_IMAGE_MAP: Record<string, string> = {
  alimentation: `${BASE}/cat_alimentation.png`,
  cosmetique: `${BASE}/cat_cosmetique.png`,
  electronique: `${BASE}/cat_electronique.png`,
  vetements: `${BASE}/cat_vetements.png`,
  informatique: `${BASE}/cat_informatique.png`,
  papeterie: `${BASE}/cat_papeterie.png`,
  maison: `${BASE}/cat_maison.png`,
  autre: `${BASE}/cat_autre.png`,
  produit_service: `${BASE}/cat_autre.png`,
};

/**
 * Retourne l'URL de l'image pour une categorie donnee
 * Normalise le nom (lowercase, sans accents, underscores)
 */
export function getCategoryImage(nomCategorie: string): string {
  if (!nomCategorie) return marketplaceImages.defaultCategory;
  const key = nomCategorie
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]/g, '_');
  return CATEGORY_IMAGE_MAP[key] || marketplaceImages.defaultCategory;
}
