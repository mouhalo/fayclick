'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import depenseService from '@/services/depense.service';
import type { TypeDepense } from '@/types/depense.types';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-locale';

interface GererTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  structureId: number;
  onTypesUpdated: () => void;
  typesDepenses: TypeDepense[];
}

export default function GererTypesModal({
  isOpen,
  onClose,
  structureId,
  onTypesUpdated,
  typesDepenses
}: GererTypesModalProps) {
  const t = useTranslations('expenses');
  const { locale } = useLanguage();
  const [nomType, setNomType] = useState('');
  const [editingType, setEditingType] = useState<TypeDepense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNomType('');
      setEditingType(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomType.trim()) {
      setError(t('types.errorNameRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await depenseService.ajouterOuModifierType(
        structureId,
        nomType.trim(),
        editingType?.id_type_depense || 0
      );

      setNomType('');
      setEditingType(null);
      onTypesUpdated();
    } catch (err: any) {
      setError(err.message || t('types.errorSave'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (type: TypeDepense) => {
    setEditingType(type);
    setNomType(type.nom_type);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setNomType('');
    setError(null);
  };

  const handleDelete = async (typeId: number) => {
    if (!confirm(t('types.confirmDelete'))) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await depenseService.supprimerType(structureId, typeId);
      onTypesUpdated();
    } catch (err: any) {
      setError(err.message || t('types.errorDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">{t('types.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Formulaire d'ajout/édition */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {editingType ? t('types.labelEdit') : t('types.labelAdd')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nomType}
                  onChange={(e) => setNomType(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('types.namePlaceholder')}
                  maxLength={120}
                  required
                />
                {editingType && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    {t('types.cancel')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {editingType ? <Edit2 size={18} /> : <Plus size={18} />}
                  {isSubmitting ? t('types.submitting') : (editingType ? t('types.submitEdit') : t('types.submitAdd'))}
                </button>
              </div>
            </div>
          </form>

          {/* Liste des types existants */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {t('types.existing', { count: typesDepenses.length })}
            </h3>
            <div className="space-y-2">
              {typesDepenses.map((type) => (
                <div
                  key={type.id_type_depense}
                  className={`flex items-center justify-between p-3 rounded-lg border transition ${
                    editingType?.id_type_depense === type.id_type_depense
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{type.nom_type}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t(type.nb_depenses > 1 ? 'types.countPlural' : 'types.countSingular', { count: type.nb_depenses })} • {formatNumber(type.total_depenses, locale)} FCFA
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(type)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title={t('types.editBtn')}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id_type_depense)}
                      disabled={type.nb_depenses > 0}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={type.nb_depenses > 0 ? t('types.deleteBlocked') : t('types.deleteBtn')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
