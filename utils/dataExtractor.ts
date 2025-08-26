/**
 * Utilitaire pour extraire les données des résultats API
 * qui peuvent être encapsulées dans result_json
 */

export function extractDataFromResults<T = any>(results: unknown[]): T[] {
  if (!results || results.length === 0) {
    return [];
  }

  return results.map(item => {
    // Extraire les données de result_json si elles existent
    const itemWithResult = item as { result_json?: T };
    return itemWithResult.result_json || (item as T);
  });
}

/**
 * Extraire un seul élément de données
 */
export function extractSingleDataFromResult<T = any>(result: unknown): T | null {
  if (!result) {
    return null;
  }

  // Extraire les données de result_json si elles existent
  const itemWithResult = result as { result_json?: T };
  return itemWithResult.result_json || (result as T);
}

/**
 * Alias pour la compatibilité avec l'API service
 */
export function extractArrayDataFromResult<T = any>(results: unknown[]): T[] {
  return extractDataFromResults<T>(results);
}