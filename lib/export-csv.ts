/**
 * Utilitaires de sérialisation et téléchargement CSV.
 *
 * Générique et découplé de tout composant : réutilisable pour l'export
 * de factures, dépenses, clients, etc.
 *
 * Format produit (compatibilité Excel FR) :
 * - Séparateur : `;` (point-virgule)
 * - Fin de ligne : `\r\n` (CRLF)
 * - Encodage : UTF-8 avec BOM (ajouté par `downloadCsv`)
 * - Échappement : tout champ contenant `;`, `"` ou un retour ligne est
 *   entouré de guillemets doubles, les `"` internes étant doublés.
 */

/** Séparateur de colonnes (point-virgule pour Excel FR). */
const CSV_SEPARATOR = ';';

/** Fin de ligne CRLF (compatibilité Excel Windows). */
const CSV_EOL = '\r\n';

/** Marqueur d'ordre des octets UTF-8 — permet à Excel de lire les accents. */
const UTF8_BOM = '﻿';

export interface ArrayToCsvOptions {
  /** Séparateur de colonnes. Défaut : `;`. */
  separator?: string;
  /** Fin de ligne. Défaut : `\r\n`. */
  eol?: string;
}

/**
 * Échappe une cellule CSV : si elle contient le séparateur, un guillemet
 * ou un saut de ligne, elle est encadrée de guillemets et ses guillemets
 * internes sont doublés.
 */
function escapeCell(value: string | number, separator: string): string {
  const str = String(value ?? '');
  const mustQuote =
    str.includes(separator) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');
  if (!mustQuote) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Sérialise un tableau de lignes en chaîne CSV.
 *
 * @param rows - Tableau de lignes ; chaque ligne est un tableau de cellules.
 * @param options - Séparateur et fin de ligne personnalisables.
 * @returns Chaîne CSV (sans BOM — ajouté au téléchargement).
 *
 * @example
 * arrayToCsv([['Période', 'Montant'], ['13/05', 125000]])
 * // → "Période;Montant\r\n13/05;125000"
 */
export function arrayToCsv(
  rows: (string | number)[][],
  options?: ArrayToCsvOptions
): string {
  const separator = options?.separator ?? CSV_SEPARATOR;
  const eol = options?.eol ?? CSV_EOL;
  return rows
    .map((row) => row.map((cell) => escapeCell(cell, separator)).join(separator))
    .join(eol);
}

/**
 * Déclenche le téléchargement d'un fichier CSV dans le navigateur.
 *
 * Ajoute le BOM UTF-8, crée un Blob `text/csv;charset=utf-8`, puis un lien
 * `<a download>` temporaire cliqué et révoqué immédiatement.
 *
 * @param filename - Nom du fichier (extension `.csv` incluse).
 * @param csvContent - Contenu CSV produit par `arrayToCsv`.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([UTF8_BOM + csvContent], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
