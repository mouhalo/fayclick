/**
 * Page publique : Historique d'achats client
 *
 * Route : /historique[?tel=771234567]
 *
 * Workflow (3 étapes) :
 *   1. Saisie du téléphone → envoi OTP WhatsApp (5 chiffres, TTL 5min)
 *   2. Saisie du code OTP → validation locale
 *   3. Affichage de la liste des achats (Sprint 3)
 *
 * Sécurité :
 *   - L'OTP n'est stocké qu'en state React (jamais en localStorage)
 *   - Téléphone masqué dans les logs via SecurityService.secureLog
 *   - Identification basée sur le téléphone seul (anti-énumération côté PG)
 *
 * Voir : docs/prd-historique-client-public-2026-05-02.md
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import HistoriqueClientPage from '@/components/historique/HistoriqueClientPage';

function HistoriqueContent() {
  const searchParams = useSearchParams();
  const telParam = searchParams.get('tel') ?? undefined;

  // Pré-remplissage optionnel via query param (?tel=XXX)
  // On ne fait que normaliser légèrement : trim + chiffres uniquement.
  // La validation stricte (format SN ou E.164) se fait dans StepPhone.
  let initialTelephone: string | undefined;
  if (telParam) {
    const trimmed = telParam.trim();
    if (/^\+?\d{8,15}$/.test(trimmed)) {
      initialTelephone = trimmed;
    }
  }

  return <HistoriqueClientPage initialTelephone={initialTelephone} />;
}

/**
 * Fallback de chargement Suspense (très bref — useSearchParams uniquement).
 */
function HistoriqueLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-900 flex items-center justify-center">
      <div className="flex items-center gap-3 text-white/80">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-medium">Chargement…</span>
      </div>
    </div>
  );
}

export default function HistoriquePage() {
  return (
    <Suspense fallback={<HistoriqueLoading />}>
      <HistoriqueContent />
    </Suspense>
  );
}
