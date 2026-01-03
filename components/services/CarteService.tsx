/**
 * Carte d'affichage d'un service
 * Affiche nom, coût de base, catégorie
 * Cliquable pour édition
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Tag, Banknote, Edit2, Trash2 } from 'lucide-react';
import { Service } from '@/types/prestation';

interface CarteServiceProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete?: (service: Service) => void;
  index?: number;
}

export function CarteService({
  service,
  onEdit,
  onDelete,
  index = 0
}: CarteServiceProps) {
  const formatMontant = (montant: number) =>
    `${montant.toLocaleString('fr-FR')} F`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden cursor-pointer border border-gray-100"
      onClick={() => onEdit(service)}
    >
      {/* Header avec icône et catégorie */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            {service.nom_categorie && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {service.nom_categorie}
              </span>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(service);
              }}
              className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(service);
                }}
                className="w-7 h-7 bg-red-500/30 rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {/* Nom du service */}
        <h3 className="font-bold text-gray-800 text-base mb-2 line-clamp-2">
          {service.nom_service}
        </h3>

        {/* Description */}
        {service.description && (
          <p className="text-gray-500 text-xs mb-3 line-clamp-2">
            {service.description}
          </p>
        )}

        {/* Coût de base */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5" />
            Coût de base
          </span>
          <span className="font-bold text-orange-600 text-lg">
            {formatMontant(service.cout_base)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default CarteService;
