'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Check } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface ModalSelectionPeriodeProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (annee: number, mois: number, semaine: number, jour: number) => void;
  initialAnnee?: number;
  initialMois?: number;
  initialSemaine?: number;
  initialJour?: number;
}

/**
 * Calcule le numéro de semaine pour une date donnée
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Calcule la semaine correspondant au premier jour d'un mois
 */
function getFirstWeekOfMonth(annee: number, mois: number): number {
  const firstDay = new Date(annee, mois - 1, 1);
  return getWeekNumber(firstDay);
}

/**
 * Calcule le nombre de jours dans un mois
 */
function getDaysInMonth(annee: number, mois: number): number {
  return new Date(annee, mois, 0).getDate();
}

/**
 * Modal de sélection de période pour les statistiques inventaire
 * Permet de choisir Année (2024-2030), Mois (1-12), Semaine (liée au mois), Jour (1-31)
 */
export default function ModalSelectionPeriode({
  isOpen,
  onClose,
  onValidate,
  initialAnnee,
  initialMois,
  initialSemaine,
  initialJour
}: ModalSelectionPeriodeProps) {
  const t = useTranslations('inventory');
  const currentDate = new Date();

  // États locaux
  const [annee, setAnnee] = useState(initialAnnee || currentDate.getFullYear());
  const [mois, setMois] = useState(initialMois || currentDate.getMonth() + 1);
  const [semaine, setSemaine] = useState(initialSemaine || getWeekNumber(currentDate));
  const [jour, setJour] = useState(initialJour || currentDate.getDate());

  // Calculer le nombre de jours dans le mois sélectionné
  const nombreJoursDansMois = useMemo(() => {
    return getDaysInMonth(annee, mois);
  }, [annee, mois]);

  // Calculer la semaine du premier jour du mois sélectionné
  const semainesDuMois = useMemo(() => {
    const firstWeek = getFirstWeekOfMonth(annee, mois);
    const lastDay = new Date(annee, mois - 1, getDaysInMonth(annee, mois));
    const lastWeek = getWeekNumber(lastDay);
    return { first: firstWeek, last: lastWeek };
  }, [annee, mois]);

  // Réinitialiser les valeurs quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setAnnee(initialAnnee || currentDate.getFullYear());
      setMois(initialMois || currentDate.getMonth() + 1);
      setSemaine(initialSemaine || getWeekNumber(currentDate));
      setJour(initialJour || currentDate.getDate());
    }
  }, [isOpen, initialAnnee, initialMois, initialSemaine, initialJour]);

  // Quand le mois change, ajuster la semaine automatiquement
  useEffect(() => {
    const newFirstWeek = getFirstWeekOfMonth(annee, mois);
    setSemaine(newFirstWeek);
    // Ajuster le jour si nécessaire
    const maxJours = getDaysInMonth(annee, mois);
    if (jour > maxJours) {
      setJour(maxJours);
    }
  }, [mois, annee]);

  // Générer les options d'années (2024 à 2030)
  const annees = Array.from({ length: 7 }, (_, i) => 2024 + i);

  // Générer les options de mois (1 à 12) avec noms
  const moisOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: t(`periodModal.months.${i + 1}` as any)
  }));

  // Générer les options de semaines (liées au mois sélectionné)
  const semainesOptions = useMemo(() => {
    const semaines: number[] = [];
    for (let s = semainesDuMois.first; s <= semainesDuMois.last; s++) {
      semaines.push(s);
    }
    return semaines;
  }, [semainesDuMois]);

  // Générer les options de jours (selon le mois)
  const joursOptions = useMemo(() => {
    return Array.from({ length: nombreJoursDansMois }, (_, i) => i + 1);
  }, [nombreJoursDansMois]);

  const handleValidate = () => {
    onValidate(annee, mois, semaine, jour);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {t('periodModal.title')}
                      </h2>
                      <p className="text-sm text-emerald-100">
                        {t('periodModal.subtitle')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Contenu */}
              <div className="p-6 space-y-4">
                {/* Sélection Année */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('periodModal.year')}
                  </label>
                  <select
                    value={annee}
                    onChange={(e) => setAnnee(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                             transition-all duration-200 bg-gray-50 text-gray-800
                             font-medium cursor-pointer"
                  >
                    {annees.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sélection Mois */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('periodModal.month')}
                  </label>
                  <select
                    value={mois}
                    onChange={(e) => setMois(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                             transition-all duration-200 bg-gray-50 text-gray-800
                             font-medium cursor-pointer"
                  >
                    {moisOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sélection Semaine (liée au mois) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('periodModal.week')} <span className="text-xs text-gray-500">{t('periodModal.weekHint')}</span>
                  </label>
                  <select
                    value={semaine}
                    onChange={(e) => setSemaine(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                             transition-all duration-200 bg-emerald-50 text-gray-800
                             font-medium cursor-pointer"
                  >
                    {semainesOptions.map((s) => (
                      <option key={s} value={s}>
                        {t('periodModal.weekOption', { num: s })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sélection Jour */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('periodModal.day')} <span className="text-xs text-gray-500">{t('periodModal.dayHint', { count: nombreJoursDansMois, month: moisOptions.find(m => m.value === mois)?.label ?? '' })}</span>
                  </label>
                  <select
                    value={jour}
                    onChange={(e) => setJour(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                             focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                             transition-all duration-200 bg-gray-50 text-gray-800
                             font-medium cursor-pointer"
                  >
                    {joursOptions.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Résumé de la sélection */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-sm text-emerald-700 font-medium">
                    {t('periodModal.selected')}
                  </p>
                  <p className="text-emerald-800 font-semibold mt-1">
                    {t('periodModal.selectedSummary', { day: jour, month: moisOptions.find(m => m.value === mois)?.label ?? '', year: annee, week: semaine })}
                  </p>
                </div>
              </div>

              {/* Footer avec boutons */}
              <div className="px-6 pb-6 pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200
                           text-gray-600 font-semibold hover:bg-gray-50
                           transition-all duration-200"
                >
                  {t('periodModal.cancel')}
                </button>
                <button
                  onClick={handleValidate}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500
                           text-white font-semibold hover:from-emerald-600 hover:to-teal-600
                           transition-all duration-200 flex items-center justify-center gap-2
                           shadow-lg shadow-emerald-200"
                >
                  <Check className="w-5 h-5" />
                  {t('periodModal.validate')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
