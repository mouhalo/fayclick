/**
 * Normalise les noms de categories pour l'affichage
 * "produit_service" → "Produit Service"
 * "ELECTRONIQUE" → "Electronique"
 * "alimentation_boisson" → "Alimentation Boisson"
 */
export function formatNomCategorie(nom: string): string {
  if (!nom) return '';
  return nom
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
