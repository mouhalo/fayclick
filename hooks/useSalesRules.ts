'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface SalesRules {
  creditAutorise: boolean;
  limiteCredit: number;
  acompteAutorise: boolean;
}

const SALES_RULES_KEY = 'fayclick_regles_ventes';

const DEFAULT_SALES_RULES: SalesRules = {
  creditAutorise: true,
  limiteCredit: 50000,
  acompteAutorise: true,
};

function getSalesRulesKey(idStructure: number): string {
  return `${SALES_RULES_KEY}_${idStructure}`;
}

/**
 * Hook pour lire les règles de vente depuis localStorage.
 * Utilisable dans les pages vente, panier, factures, etc.
 */
export function useSalesRules(): SalesRules {
  const { user } = useAuth();
  const [rules, setRules] = useState<SalesRules>(DEFAULT_SALES_RULES);

  useEffect(() => {
    if (!user?.id_structure) return;

    try {
      const stored = localStorage.getItem(getSalesRulesKey(user.id_structure));
      if (stored) {
        const parsed = JSON.parse(stored);
        setRules({ ...DEFAULT_SALES_RULES, ...parsed });
      }
    } catch (e) {
      console.warn('Erreur lecture règles ventes:', e);
    }
  }, [user?.id_structure]);

  return rules;
}
