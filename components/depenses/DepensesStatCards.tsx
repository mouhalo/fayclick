'use client';

import { TrendingUp, DollarSign } from 'lucide-react';
import type { ResumeDepenses, TypeDepense } from '@/types/depense.types';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-locale';

interface DepensesStatCardsProps {
  resume: ResumeDepenses;
  typesDepenses: TypeDepense[];
}

export default function DepensesStatCards({ resume, typesDepenses }: DepensesStatCardsProps) {
  const t = useTranslations('expenses');
  const { locale } = useLanguage();
  // Trouver le type le plus coûteux
  const typePlusCouteux = typesDepenses.length > 0
    ? typesDepenses.reduce((max, type) =>
        type.total_depenses > max.total_depenses ? type : max
      )
    : null;

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* StatCard 1 : Nombre et Total */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="text-blue-600" size={20} />
          <span className="text-sm text-gray-600 font-medium">{t('stats.expenses')}</span>
        </div>
        <div className="space-y-1">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {resume.nb_depenses}
            </div>
            <div className="text-xs text-gray-500">{t('stats.count')}</div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-xl font-semibold text-blue-600">
              {formatNumber(resume.total_depenses, locale)} FCFA
            </div>
            <div className="text-xs text-gray-500">{t('stats.total')}</div>
          </div>
        </div>
      </div>

      {/* StatCard 2 : Type le plus coûteux */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-orange-600" size={20} />
          <span className="text-sm text-gray-600 font-medium">{t('stats.mostCostlyShort')}</span>
        </div>
        {typePlusCouteux ? (
          <div className="space-y-1">
            <div className="text-lg font-bold text-gray-800 truncate">
              {typePlusCouteux.nom_type}
            </div>
            <div className="text-xl font-semibold text-orange-600">
              {formatNumber(typePlusCouteux.total_depenses, locale)} FCFA
            </div>
            <div className="text-xs text-gray-500">
              {t(typePlusCouteux.nb_depenses > 1 ? 'stats.countPlural' : 'stats.countSingular', { count: typePlusCouteux.nb_depenses })} • {typePlusCouteux.pourcentage_total.toFixed(1)}%
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">{t('stats.none')}</div>
        )}
      </div>
    </div>
  );
}
