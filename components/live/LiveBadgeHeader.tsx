'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Live } from '@/types/live';

interface LiveBadgeHeaderProps {
  live: Live;
  onDelete: () => void;
}

const LiveBadgeHeader: React.FC<LiveBadgeHeaderProps> = ({ live, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const heureFinFormatted = useMemo(() => {
    try {
      const d = new Date(live.date_fin);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  }, [live.date_fin]);

  const nbProduits = live.nb_produits ?? live.produits?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-400/30 max-h-12"
    >
      {/* Partie gauche : dot pulsant + nom */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Dot pulsant */}
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>

        <span className="text-sm text-red-700 font-medium whitespace-nowrap">Live actif :</span>
        <span className="text-sm font-bold text-red-800 truncate">{live.nom_du_live}</span>
      </div>

      {/* Partie droite : infos + bouton */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-red-600 whitespace-nowrap hidden sm:inline">
          {"Jusqu'a"} {heureFinFormatted}
        </span>

        {nbProduits > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">
            {nbProduits} produit{nbProduits > 1 ? 's' : ''}
          </span>
        )}

        {/* Bouton Fin / Confirmation inline */}
        <AnimatePresence mode="wait">
          {!showConfirm ? (
            <motion.button
              key="btn-fin"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-red-400 text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fin
            </motion.button>
          ) : (
            <motion.div
              key="btn-confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-xs text-red-700 font-medium whitespace-nowrap">Confirmer ?</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Oui
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirm(false);
                }}
                className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
              >
                Non
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LiveBadgeHeader;
