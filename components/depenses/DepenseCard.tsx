'use client';

import { Calendar, Edit, Trash2, Tag, Clock } from 'lucide-react';
import type { Depense } from '@/types/depense.types';

interface DepenseCardProps {
  depense: Depense;
  onEdit: (depense: Depense) => void;
  onDelete: (depense: Depense) => void;
}

export default function DepenseCard({ depense, onEdit, onDelete }: DepenseCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
      {/* Header : Date + Type + Actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {formatDate(depense.date_depense)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">
              {depense.nom_type}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(depense)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Modifier"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => onDelete(depense)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Supprimer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {depense.description}
      </p>

      {/* Footer : Montant + Mise à jour */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xl font-bold text-green-600">
          {depense.montant.toLocaleString('fr-FR')} FCFA
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={12} />
          <span>{formatDateTime(depense.tms_update)}</span>
        </div>
      </div>
    </div>
  );
}
