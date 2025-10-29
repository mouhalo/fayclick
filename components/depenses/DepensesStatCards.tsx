'use client';

import { TrendingUp, DollarSign } from 'lucide-react';
import type { ResumeDepenses, TypeDepense } from '@/types/depense.types';

interface DepensesStatCardsProps {
  resume: ResumeDepenses;
  typesDepenses: TypeDepense[];
}

export default function DepensesStatCards({ resume, typesDepenses }: DepensesStatCardsProps) {
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
          <span className="text-sm text-gray-600 font-medium">Dépenses</span>
        </div>
        <div className="space-y-1">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {resume.nb_depenses}
            </div>
            <div className="text-xs text-gray-500">Nombre de dépenses</div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-xl font-semibold text-blue-600">
              {resume.total_depenses.toLocaleString('fr-FR')} FCFA
            </div>
            <div className="text-xs text-gray-500">Total dépensé</div>
          </div>
        </div>
      </div>

      {/* StatCard 2 : Type le plus coûteux */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-orange-600" size={20} />
          <span className="text-sm text-gray-600 font-medium">Type + coûteux</span>
        </div>
        {typePlusCouteux ? (
          <div className="space-y-1">
            <div className="text-lg font-bold text-gray-800 truncate">
              {typePlusCouteux.nom_type}
            </div>
            <div className="text-xl font-semibold text-orange-600">
              {typePlusCouteux.total_depenses.toLocaleString('fr-FR')} FCFA
            </div>
            <div className="text-xs text-gray-500">
              {typePlusCouteux.nb_depenses} dépense(s) • {typePlusCouteux.pourcentage_total.toFixed(1)}%
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">Aucune dépense</div>
        )}
      </div>
    </div>
  );
}
