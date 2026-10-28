/**
 * Seuil "stock faible" de la page Produits
 * Préférence locale (localStorage) propre à chaque structure : un produit est
 * considéré en stock faible quand niveau_stock < seuil.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

export const SEUIL_STOCK_FAIBLE_DEFAUT = 5;

const storageKey = (idStructure: number) => `fayclick_seuil_stock_faible_${idStructure}`;

export function useSeuilStockFaible(idStructure?: number) {
  const [seuil, setSeuilState] = useState<number>(SEUIL_STOCK_FAIBLE_DEFAUT);

  // Lecture au montage (localStorage indisponible côté serveur / navigation privée)
  useEffect(() => {
    if (!idStructure) return;
    try {
      const raw = localStorage.getItem(storageKey(idStructure));
      const valeur = raw !== null ? Number(raw) : NaN;
      if (Number.isInteger(valeur) && valeur > 0) {
        setSeuilState(valeur);
      }
    } catch {
      // Préférence non lisible : on garde la valeur par défaut
    }
  }, [idStructure]);

  const setSeuil = useCallback((valeur: number) => {
    setSeuilState(valeur);
    if (!idStructure) return;
    try {
      localStorage.setItem(storageKey(idStructure), String(valeur));
    } catch {
      // Stockage indisponible : le seuil reste valable pour la session en cours
    }
  }, [idStructure]);

  return { seuil, setSeuil };
}
