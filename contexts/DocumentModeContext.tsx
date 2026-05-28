/**
 * DocumentModeContext - Mode actif du panier (Facture / Proforma / Bon de Commande)
 *
 * Source de verite unique partagee entre :
 *  - PanierSidePanel (desktop, draggable) : expose le dropdown 3 modes (UI)
 *  - ModalPanier (mobile) : lit le mode pour acheminer les articles vers le bon store
 *  - app/dashboard/commerce/produits/page.tsx : route addArticle vers le store actif
 *
 * Sans ce context, les ajouts d'articles depuis la page Produits vont
 * toujours dans le store facture, rendant les modes Proforma/BC inutilisables.
 *
 * Persistance localStorage par structure :
 *   fayclick_panier_mode_{id_structure} = "facture" | "proforma" | "bonCommande"
 *
 * Si compte_prive=false, le mode est force a 'facture' (les autres modes
 * sont reserves aux comptes prives qui ont active l'option).
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

export type DocumentMode = 'facture' | 'proforma' | 'bonCommande';

interface DocumentModeContextValue {
  mode: DocumentMode;
  setMode: (mode: DocumentMode) => void;
}

const DocumentModeContext = createContext<DocumentModeContextValue | null>(null);

/**
 * Lit le mode persiste en localStorage pour une structure donnee.
 * Retourne 'facture' par defaut (et toujours pour comptes non-prives).
 */
function readStoredMode(idStructure: number, comptePrive: boolean): DocumentMode {
  if (typeof window === 'undefined' || !idStructure || !comptePrive) {
    return 'facture';
  }
  const stored = localStorage.getItem(`fayclick_panier_mode_${idStructure}`);
  if (stored === 'facture' || stored === 'proforma' || stored === 'bonCommande') {
    return stored;
  }
  return 'facture';
}

export function DocumentModeProvider({ children }: { children: ReactNode }) {
  const { structure } = useAuth();
  const idStructure = structure?.id_structure ?? 0;
  const comptePrive = structure?.compte_prive === true;

  // Init lazy : evite SSR/hydratation incoherente
  const [mode, setModeState] = useState<DocumentMode>(() =>
    readStoredMode(idStructure, comptePrive)
  );

  // Re-hydrater si l'auth charge en differe (login tardif, refreshAuth)
  useEffect(() => {
    setModeState(readStoredMode(idStructure, comptePrive));
  }, [idStructure, comptePrive]);

  // Garde de coherence : si compte_prive devient false, forcer 'facture'
  useEffect(() => {
    if (!comptePrive && mode !== 'facture') {
      setModeState('facture');
    }
  }, [comptePrive, mode]);

  const setMode = useCallback(
    (newMode: DocumentMode) => {
      setModeState(newMode);
      if (typeof window !== 'undefined' && idStructure && comptePrive) {
        localStorage.setItem(`fayclick_panier_mode_${idStructure}`, newMode);
      }
    },
    [idStructure, comptePrive]
  );

  return (
    <DocumentModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DocumentModeContext.Provider>
  );
}

/**
 * Hook pour acceder au mode document courant.
 *
 * @throws Error si appele hors d'un DocumentModeProvider
 *
 * @example
 *   const { mode, setMode } = useDocumentMode();
 *   if (mode === 'bonCommande') { ... }
 */
export function useDocumentMode(): DocumentModeContextValue {
  const ctx = useContext(DocumentModeContext);
  if (!ctx) {
    throw new Error(
      'useDocumentMode must be used inside a <DocumentModeProvider>. ' +
        'Wrap your route (e.g., app/dashboard/commerce/layout.tsx) with <DocumentModeProvider>.'
    );
  }
  return ctx;
}
