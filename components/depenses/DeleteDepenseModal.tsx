'use client';

import { X, AlertTriangle } from 'lucide-react';
import type { Depense } from '@/types/depense.types';

interface DeleteDepenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  depense: Depense | null;
}

export default function DeleteDepenseModal({
  isOpen,
  onClose,
  onConfirm,
  depense
}: DeleteDepenseModalProps) {
  if (!isOpen || !depense) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Confirmer la suppression</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-2">
                Êtes-vous sûr de vouloir supprimer cette dépense ?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type :</span>
                  <span className="font-semibold text-gray-800">{depense.nom_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant :</span>
                  <span className="font-semibold text-gray-800">
                    {depense.montant.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date :</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(depense.date_depense).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              <p className="text-red-600 text-sm mt-3 font-medium">
                Cette action est irréversible.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
