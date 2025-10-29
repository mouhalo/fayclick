/**
 * Liste des ventes du jour
 * Section 3: Affichage scrollable des ventes avec VenteCarteVente
 */

'use client';

import { motion } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { VenteFlash } from '@/types/venteflash.types';
import { VenteCarteVente } from './VenteCarteVente';

interface VenteFlashListeVentesProps {
  ventes: VenteFlash[];
  isLoading?: boolean;
  onDeleteVente?: (id_facture: number) => void;
  onViewReceipt?: (id_facture: number) => void;
  onViewInvoice?: (id_facture: number) => void;
}

export function VenteFlashListeVentes({
  ventes,
  isLoading = false,
  onDeleteVente,
  onViewReceipt,
  onViewInvoice
}: VenteFlashListeVentesProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-xl h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (ventes.length === 0) {
    return (
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
          Aucune vente aujourd'hui
        </h3>
        <p className="text-gray-500">
          Les ventes de la journée apparaîtront ici
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header liste */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Ventes du jour ({ventes.length})
        </h2>
      </div>

      {/* Liste scrollable */}
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
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
