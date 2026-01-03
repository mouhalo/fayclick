/**
 * Carte d'affichage d'un devis
 * Affiche: numéro, client, montants services/équipements, date
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  User,
  Phone,
  Home,
  Calendar,
  Wrench,
  Package,
  Eye,
  Receipt,
  Trash2
} from 'lucide-react';
import { DevisFromDB } from '@/types/prestation';

interface CarteDevisProps {
  devisData: DevisFromDB;
  onClick: (devis: DevisFromDB) => void;
  onCreerFacture?: (devis: DevisFromDB) => void;
  onDelete?: (devis: DevisFromDB) => void;
  index?: number;
}

export function CarteDevis({
  devisData,
  onClick,
  onCreerFacture,
  onDelete,
  index = 0
}: CarteDevisProps) {
  const { devis, resume } = devisData;

  const formatMontant = (montant: number) =>
    `${montant.toLocaleString('fr-FR')} F`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPhone = (phone: string) => {
    if (!phone || phone.length < 9) return phone;
    return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 7)} ${phone.slice(7)}`;
  };

  // Calculer le total
  const totalDevis = devis.montant + devis.montant_equipement;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden cursor-pointer border border-gray-100"
      onClick={() => onClick(devisData)}
    >
      {/* Header avec numéro et date */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="font-bold text-sm">{devis.num_devis}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
              <Calendar className="w-3 h-3" />
              {formatDate(devis.date_devis)}
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(devisData);
                }}
                className="w-7 h-7 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                title="Supprimer ce devis"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {/* Client */}
        <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">
              {devis.nom_client_payeur}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {formatPhone(devis.tel_client)}
            </p>
            {devis.adresse_client && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Home className="w-3 h-3" />
                <span className="truncate">{devis.adresse_client}</span>
              </p>
            )}
          </div>
        </div>

        {/* Résumé des montants - Grid 2 colonnes */}
        <div className="grid grid-cols-2 gap-4">
          {/* Services */}
          <div>
            <span className="text-gray-600 flex items-center gap-1.5 text-sm">
              <Wrench className="w-4 h-4 text-orange-500" />
              Services ({resume.nb_produits})
            </span>
            <p className="font-semibold text-orange-600 mt-0.5">
              {formatMontant(resume.montant_produits)}
            </p>
          </div>

          {/* Équipements */}
          <div>
            <span className="text-gray-600 flex items-center gap-1.5 text-sm">
              <Package className="w-4 h-4 text-purple-500" />
              Équipements ({resume.nb_equipements})
            </span>
            <p className="font-semibold text-purple-600 mt-0.5">
              {formatMontant(resume.montant_equipements)}
            </p>
          </div>
        </div>

        {/* Total */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-gray-700 font-medium">Total devis</span>
          <span className="text-xl font-bold text-blue-600">
            {formatMontant(totalDevis)}
          </span>
        </div>

        {/* Boutons d'action */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(devisData);
            }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Eye className="w-4 h-4" />
            Voir détails
          </button>

          {onCreerFacture && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreerFacture(devisData);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              Créer Facture
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default CarteDevis;
