/**
 * Liste des ventes du jour
 * Section 3: Affichage scrollable des ventes avec VenteCarteVente
 */

'use client';

import { motion } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { VenteFlash } from '@/types/venteflash.types';
import { VenteCarteVente } from './VenteCarteVente';
import { useTranslations } from '@/hooks/useTranslations';

interface VenteFlashListeVentesProps {
  ventes: VenteFlash[];
  isLoading?: boolean;
  onDeleteVente?: (id_facture: number) => void;
  onViewReceipt?: (id_facture: number) => void;
  onViewInvoice?: (id_facture: number) => void;
  /** Modifier une vente PAYÉE du jour (réutilise le flux d'édition existant) */
  onModifier?: (id_facture: number) => void;
  /** ADMIN : affiche le sélecteur de date pour consulter n'importe quelle journée */
  isAdmin?: boolean;
  /** Date consultée (format YYYY-MM-DD) */
  selectedDate?: string;
  /** Callback changement de date (ADMIN uniquement) */
  onDateChange?: (date: string) => void;
}

export function VenteFlashListeVentes({
  ventes,
  isLoading = false,
  onDeleteVente,
  onViewReceipt,
  onViewInvoice,
  onModifier,
  isAdmin = false,
  selectedDate,
  onDateChange
}: VenteFlashListeVentesProps) {
  const t = useTranslations('venteFlash');

  const today = new Date().toISOString().split('T')[0];
  const isToday = !selectedDate || selectedDate === today;

  // Titre : « Ventes du jour (N) » si aujourd'hui, sinon « Ventes du JJ/MM/AAAA (N) ».
  // Format numérique locale-agnostique construit depuis YYYY-MM-DD (évite tout décalage de fuseau).
  const dateLabel = (() => {
    if (isToday || !selectedDate) return '';
    const [y, m, d] = selectedDate.split('-');
    return `${d}/${m}/${y}`;
  })();

  const titre = isToday
    ? t('salesList.titleWithCount', { count: ventes.length })
    : t('salesList.titleWithDate', { date: dateLabel, count: ventes.length });

  // En-tête toujours rendu (titre + sélecteur de date ADMIN), quel que soit l'état
  // (chargement / vide / liste) → le sélecteur ne disparaît jamais.
  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="text-lg font-bold text-gray-900">{titre}</h2>
      {isAdmin && (
        <div className="flex items-center gap-2">
          <label htmlFor="vf-date-picker" className="text-sm font-medium text-gray-600">
            {t('salesList.date')}
          </label>
          <input
            id="vf-date-picker"
            type="date"
            value={selectedDate || today}
            max={today}
            onChange={(e) => onDateChange?.(e.target.value)}
            className="px-3 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white text-gray-900"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {header}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : ventes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="
            bg-gradient-to-br from-gray-50 to-gray-100
            rounded-2xl p-12 text-center border-2 border-dashed border-gray-300
          "
        >
          <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            {t('salesList.empty')}
          </h3>
          <p className="text-gray-500">
            {t('salesList.emptyHint')}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {ventes.map((vente, index) => (
            <motion.div
              key={vente.id_facture}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <VenteCarteVente
                vente={vente}
                onDelete={onDeleteVente}
                onViewReceipt={onViewReceipt}
                onViewInvoice={onViewInvoice}
                onModifier={onModifier}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
