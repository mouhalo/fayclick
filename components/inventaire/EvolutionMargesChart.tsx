'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import type { EvolutionMarge } from '@/types/inventaire.types';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-locale';

interface EvolutionMargesChartProps {
  data: EvolutionMarge[];
  titre?: string;
  /**
   * Contrôle la visibilité des montants (droit `VOIR VALEUR STOCK PA`).
   * - true  : montants affichés normalement (profils ADMIN, MANAGER…)
   * - false : ticks YAxis et tooltip masqués en `***` (profil CAISSIER)
   * La forme du graphique (barres) reste visible pour ne pas casser le layout.
   */
  canView?: boolean;
}

/**
 * Graphique d'évolution des marges réalisées avec barres violettes.
 * Variante de EvolutionChart (ventes vertes) — supporte les marges négatives
 * (vente à perte) via domain={['auto', 'auto']} sur l'axe Y.
 *
 * Pattern de masquage CAISSIER : si canView === false, on remplace
 * uniquement les valeurs chiffrées par `***` (axe + tooltip), pas les barres.
 */
export default function EvolutionMargesChart({ data, titre, canView = true }: EvolutionMargesChartProps) {
  const t = useTranslations('inventory');
  const { locale } = useLanguage();
  const displayTitle = titre ?? t('margins.chart.title');
  const maskedLabel = t('margins.masked');

  // Tooltip personnalisé (violet)
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: unknown[] }) => {
    if (active && payload && payload.length) {
      const point = (payload[0] as { payload: EvolutionMarge }).payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-violet-500">
          <p className="font-semibold text-gray-800 mb-2">{point.label}</p>
          <p className="text-violet-600 font-bold text-lg">
            {canView ? `${formatNumber(point.marge, locale)} FCFA` : `${maskedLabel} FCFA`}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {t(point.nombre_ventes > 1 ? 'chart.tooltipSalePlural' : 'chart.tooltipSaleSingular', { count: point.nombre_ventes })}
          </p>
        </div>
      );
    }
    return null;
  };

  // Pour la coloration "barre max" : on prend la marge la plus haute
  // (en valeur signée — si toutes négatives, le max sera la moins négative).
  const maxMarge = data.length > 0 ? Math.max(...data.map(d => d.marge)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      {/* Titre */}
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <div className="w-1 h-6 bg-violet-500 rounded-full"></div>
        {displayTitle}
      </h3>

      {/* Graphique */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="periode"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              domain={['auto', 'auto']}
              tickFormatter={(value) =>
                canView ? `${(value / 1000).toFixed(0)}k` : maskedLabel
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124, 58, 237, 0.1)' }} />
            <Bar dataKey="marge" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.marge === maxMarge ? '#6d28d9' : '#7c3aed'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>{t('margins.chart.empty')}</p>
        </div>
      )}
    </motion.div>
  );
}
