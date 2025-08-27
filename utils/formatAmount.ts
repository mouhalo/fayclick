/**
 * Fonction utilitaire pour formater les montants monétaires
 * Gère l'affichage optimal selon la valeur (K, M, avec décimales si nécessaire)
 */

export function formatAmount(amount: number): string {
  if (!amount || amount === 0) {
    return '0';
  }

  const absAmount = Math.abs(amount);
  
  // Pour les montants < 1000 : afficher le nombre exact
  if (absAmount < 1000) {
    return amount.toString();
  }
  
  // Pour les montants entre 1K et 999K : afficher en K
  if (absAmount < 1000000) {
    const valueInK = amount / 1000;
    // Si c'est un nombre entier, pas de décimales
    if (valueInK % 1 === 0) {
      return `${valueInK.toFixed(0)}K`;
    }
    // Sinon, 1 décimale max
    return `${valueInK.toFixed(1)}K`;
  }
  
  // Pour les montants ≥ 1M : afficher en M
  const valueInM = amount / 1000000;
  
  // Si c'est un nombre entier, pas de décimales
  if (valueInM % 1 === 0) {
    return `${valueInM.toFixed(0)}M`;
  }
  
  // Si la première décimale est 0, afficher quand même (ex: 1.0M)
  // Sinon, afficher avec 1 décimale (ex: 1.7M)
  return `${valueInM.toFixed(1)}M`;
}

/**
 * Version avec devise FCFA pour l'affichage complet
 */
export function formatAmountWithCurrency(amount: number): string {
  return `${formatAmount(amount)} FCFA`;
}

/**
 * Fonction pour formater avec le contexte business spécifique
 */
export function formatAmountForDashboard(amount: number, context?: 'scolaire' | 'immobilier' | 'commerciale'): string {
  return formatAmount(amount);
}