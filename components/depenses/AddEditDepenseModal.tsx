'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Depense, TypeDepense, DepenseFormData } from '@/types/depense.types';

interface AddEditDepenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepenseFormData, depenseId?: number) => Promise<void>;
  depense?: Depense | null;
  typesDepenses: TypeDepense[];
}

export default function AddEditDepenseModal({
  isOpen,
  onClose,
  onSubmit,
  depense,
  typesDepenses
}: AddEditDepenseModalProps) {
  const [formData, setFormData] = useState<DepenseFormData>({
    date_depense: new Date().toISOString().split('T')[0],
    id_type_depense: 0,
    montant: 0,
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialiser le formulaire
  useEffect(() => {
    if (depense) {
      setFormData({
        date_depense: depense.date_depense,
        id_type_depense: depense.id_type_depense,
        montant: depense.montant,
        description: depense.description
      });
    } else {
      setFormData({
        date_depense: new Date().toISOString().split('T')[0],
        id_type_depense: typesDepenses[0]?.id_type_depense || 0,
        montant: 0,
        description: ''
      });
    }
    setError(null);
  }, [depense, typesDepenses, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.date_depense) {
      setError('La date est requise');
      return;
    }
    if (formData.id_type_depense === 0) {
      setError('Veuillez sélectionner un type de dépense');
      return;
    }
    if (formData.montant <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(formData, depense?.id_depense);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {depense ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de la dépense *
            </label>
            <input
              type="date"
              value={formData.date_depense}
              onChange={(e) => setFormData({ ...formData, date_depense: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Type de dépense */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de dépense *
            </label>
            <select
              value={formData.id_type_depense}
              onChange={(e) => setFormData({ ...formData, id_type_depense: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value={0}>Sélectionnez un type</option>
              {typesDepenses.map((type) => (
                <option key={type.id_type_depense} value={type.id_type_depense}>
                  {type.nom_type}
                </option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant (FCFA) *
            </label>
            <input
              type="number"
              value={formData.montant || ''}
              onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Détails de la dépense..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enregistrement...' : (depense ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
