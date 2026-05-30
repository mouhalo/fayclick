'use client';

import type { ResumeMarges, PeriodeType } from '@/types/inventaire.types';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-locale';

interface ResumeMargesCardProps {
  data: ResumeMarges;
  /**
   * Contrôle la visibilité des montants (droit `VOIR VALEUR STOCK PA`).
   * - true  : montants visibles (ADMIN, MANAGER…)
   * - false : montants masqués en `***` (CAISSIER)
   */
  canView: boolean;
  /**
   * Période active (semaine / mois / année) pour choisir le label
   * de comparaison (vs semaine dernière / vs mois dernier / vs année dernière).
   */
  periode: PeriodeType;
}

/**
 * Card 2 colonnes affichant le résumé des marges réalisées sur la période :
 *   ┌─────────────────────────────────────────────┐
 *   │ 💰 Résumé des marges                         │
 *   ├──────────────────────┬──────────────────────┤
 *   │ 87 500               │ +8.3%                │
 *   │ Marge totale (FCFA)  │ vs semaine dernière  │
 *   └──────────────────────┴──────────────────────┘
 *
 * Règles d'affichage :
 * - canView=false → toutes les valeurs deviennent `***` (label masked)
 * - marge_variation=null → affichage du fallback `—` (label naLabel)
 * - marge_total < 0 → affichée en rouge (vente à perte)
 * - variation ≥0 → vert emerald-600 / <0 → rouge red-600
 */
export default function ResumeMargesCard({ data, canView, periode }: ResumeMargesCardProps) {
  const t = useTranslations('inventory');
  const { locale } = useLanguage();

  const variationLabel = t(
    periode === 'semaine'
      ? 'variation.vsWeek'
      : periode === 'annee'
        ? 'variation.vsYear'
        : 'variation.vsMonth'
  );

  const masked = t('margins.masked');
  const naLabel = t('margins.naLabel');

  // Couleur de la marge totale : rouge si négative (vente à perte), violet sinon
  const isLoss = data.marge_total < 0;
  const marginTotalColor = canView && isLoss ? 'text-red-600' : 'text-violet-600';

  // Affichage variation
  const variation = data.marge_variation;
  const variationIsPositive = variation !== null && variation >= 0;
  const variationColor =
    variation === null
      ? 'text-gray-500'
      : variationIsPositive
        ? 'text-emerald-600'
        : 'text-red-600';

  const variationText =
    variation === null
      ? naLabel
      : `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border-l-4 border-violet-500">
      {/* Titre */}
      <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span>💰</span>
        <span>{t('margins.summary.title')}</span>
      </h2>

      {/* Grille 2 colonnes : Marge totale | Variation */}
      <div className="grid grid-cols-2 gap-4">
        {/* Col 1 — Marge totale */}
        <div>
          <div className={`text-xl font-bold ${marginTotalColor}`}>
            {canView ? formatNumber(data.marge_total, locale) : masked}
          </div>
          <div className="text-xs text-gray-600 font-medium">
            {t('margins.summary.marginTotal')}
          </div>
        </div>

        {/* Col 2 — Variation vs période N-1 */}
        <div>
          <div className={`text-xl font-bold ${canView ? variationColor : 'text-violet-600'}`}>
            {canView ? variationText : masked}
          </div>
          <div className="text-xs text-gray-600 font-medium">
            {variationLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
