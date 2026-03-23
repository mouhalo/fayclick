'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Produit } from '@/types/produit';
import { CreateLiveParams } from '@/types/live';
import liveService from '@/services/live.service';
import ProduitCheckList from './ProduitCheckList';

interface ModalCreerLiveProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number;
  produits: Produit[];
  onLiveCreated: () => void;
}

interface FormData {
  nom_du_live: string;
  date_debut: string;
  date_fin: string;
  tel_contact1: string;
  tel_contact2: string;
}

const ModalCreerLive: React.FC<ModalCreerLiveProps> = ({
  isOpen,
  onClose,
  idStructure,
  produits,
  onLiveCreated,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormData>({
    nom_du_live: '',
    date_debut: '',
    date_fin: '',
    tel_contact1: '',
    tel_contact2: '',
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Date minimum = maintenant (format datetime-local)
  const nowISO = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  }, []);

  // Date max fin = debut + 7 jours
  const maxDateFin = useMemo(() => {
    if (!form.date_debut) return '';
    const d = new Date(form.date_debut);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  }, [form.date_debut]);

  // Validation step 1
  const isStep1Valid = useMemo(() => {
    const { nom_du_live, date_debut, date_fin } = form;
    if (!nom_du_live.trim() || nom_du_live.trim().length < 3 || nom_du_live.trim().length > 100) return false;
    if (!date_debut) return false;
    if (new Date(date_debut) < new Date(nowISO)) return false;
    if (!date_fin) return false;
    if (new Date(date_fin) <= new Date(date_debut)) return false;
    // Max 7 jours
    const debut = new Date(date_debut);
    const fin = new Date(date_fin);
    const diffDays = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) return false;
    return true;
  }, [form, nowISO]);

  // Validation step 2
  const isStep2Valid = useMemo(() => selectedIds.length > 0, [selectedIds]);

  const handleFormChange = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
  }, []);

  const handleCreate = useCallback(async () => {
    if (!isStep2Valid) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params: CreateLiveParams = {
        id_structure: idStructure,
        nom_du_live: form.nom_du_live.trim(),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        produit_ids: selectedIds,
      };
      if (form.tel_contact1.trim()) params.tel_contact1 = form.tel_contact1.trim();
      if (form.tel_contact2.trim()) params.tel_contact2 = form.tel_contact2.trim();

      const response = await liveService.createLive(params);

      if (response.success) {
        setSuccessMsg(response.message || 'Live cree avec succes !');
        setTimeout(() => {
          onLiveCreated();
          handleReset();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(response.message || 'Erreur lors de la creation du live');
      }
    } catch (err) {
      console.error('Erreur creation live:', err);
      setErrorMsg('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [isStep2Valid, idStructure, form, selectedIds, onLiveCreated, onClose]);

  const handleReset = useCallback(() => {
    setStep(1);
    setForm({ nom_du_live: '', date_debut: '', date_fin: '', tel_contact1: '', tel_contact2: '' });
    setSelectedIds([]);
    setSuccessMsg('');
    setErrorMsg('');
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    handleReset();
    onClose();
  }, [isLoading, handleReset, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient vert */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Creer un Live</h2>
              <p className="text-green-100 text-sm mt-0.5">
                {step === 1 ? 'Informations du live' : 'Selection des produits'}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Message succes */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message erreur */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 1 : Formulaire */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Nom du live */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom du live <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nom_du_live}
                  onChange={(e) => handleFormChange('nom_du_live', e.target.value)}
                  placeholder="Ex: Promo weekend, Nouveautes..."
                  maxLength={100}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                />
                {form.nom_du_live.trim().length > 0 && form.nom_du_live.trim().length < 3 && (
                  <p className="mt-1 text-xs text-red-500">Minimum 3 caracteres</p>
                )}
              </div>

              {/* Date debut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date de debut <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.date_debut}
                  min={nowISO}
                  onChange={(e) => handleFormChange('date_debut', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                />
              </div>

              {/* Date fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.date_fin}
                  min={form.date_debut || nowISO}
                  max={maxDateFin || undefined}
                  onChange={(e) => handleFormChange('date_fin', e.target.value)}
                  disabled={!form.date_debut}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {form.date_debut && (
                  <p className="mt-1 text-xs text-gray-400">Maximum 7 jours apres le debut</p>
                )}
              </div>

              {/* Telephones (optionnels) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telephone 1
                  </label>
                  <input
                    type="text"
                    value={form.tel_contact1}
                    onChange={(e) => handleFormChange('tel_contact1', e.target.value)}
                    placeholder="77XXXXXXX"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telephone 2
                  </label>
                  <input
                    type="text"
                    value={form.tel_contact2}
                    onChange={(e) => handleFormChange('tel_contact2', e.target.value)}
                    placeholder="77XXXXXXX"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2 : Selection produits */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ProduitCheckList
                produits={produits}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </motion.div>
          )}
        </div>

        {/* Footer avec boutons */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/80">
          {step === 1 ? (
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Suivant
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
              <button
                onClick={handleCreate}
                disabled={!isStep2Valid || isLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creation...
                  </>
                ) : (
                  <>
                    Creer le live ({selectedIds.length} produit{selectedIds.length > 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ModalCreerLive;
