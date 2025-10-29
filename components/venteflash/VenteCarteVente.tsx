/**
 * Carte individuelle d'une vente
 * Affichage : Date, NumFacture, Montant + Mode, NomCaissier
 * Actions : Détails (accordéon), Voir, Supprimer (admin), Reçu, Facture
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Eye, Trash2, FileText, Receipt, Loader2
} from 'lucide-react';
import { VenteFlash, DetailVente } from '@/types/venteflash.types';
import { useUserProfile } from '@/hooks/useUserProfile';
import database from '@/services/database.service';

interface VenteCarteVenteProps {
  vente: VenteFlash;
  onDelete?: (id_facture: number) => void;
  onViewReceipt?: (id_facture: number) => void;
  onViewInvoice?: (id_facture: number) => void;
}

export function VenteCarteVente({
  vente,
  onDelete,
  onViewReceipt,
  onViewInvoice
}: VenteCarteVenteProps) {
  const { isAdmin } = useUserProfile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [details, setDetails] = useState<DetailVente[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Charger les détails au premier déploiement
  const handleToggleDetails = async () => {
    if (!isExpanded && details.length === 0) {
      setIsLoadingDetails(true);
      try {
        // Appel fonction PostgreSQL get_facture_details
        const query = `SELECT * FROM get_facture_details(${vente.id_facture})`;
        const results = await database.query(query);

        // Parser la réponse
        if (results && results.length > 0) {
          const response = results[0].get_facture_details;
          const parsedResponse = typeof response === 'string'
            ? JSON.parse(response)
            : response;

          if (parsedResponse.success && parsedResponse.data) {
            setDetails(parsedResponse.data);
          }
        }
      } catch (error) {
        console.error('❌ [VENTE CARTE] Erreur chargement détails:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    }

    setIsExpanded(!isExpanded);
  };

  // Badge mode paiement
  const renderModePaiementBadge = () => {
    const colors: Record<string, string> = {
      'OM': 'bg-orange-100 text-orange-800',
      'WAVE': 'bg-blue-100 text-blue-800',
      'FREE': 'bg-indigo-100 text-indigo-800',
      'ESPECES': 'bg-green-100 text-green-800',
      'CHEQUE': 'bg-purple-100 text-purple-800',
      'CREDIT': 'bg-yellow-100 text-yellow-800'
    };

    const colorClass = colors[vente.mode_paiement] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {vente.mode_paiement}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
    >
      {/* Ligne principale */}
      <div className="flex items-center justify-between mb-3">
        {/* Date + Num Facture */}
        <div className="flex-1">
          <div className="text-sm text-gray-500">
            {new Date(vente.date_facture).toLocaleDateString('fr-FR')}
          </div>
          <div className="font-semibold text-gray-900">
            #{vente.num_facture}
          </div>
        </div>

        {/* Montant + Mode */}
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {vente.montant_total.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="mt-1">
            {renderModePaiementBadge()}
          </div>
        </div>
      </div>

      {/* Client/Caissier */}
      <div className="text-sm text-gray-600 mb-3">
        <span className="font-medium">{vente.nom_client}</span>
        {vente.nom_caissier && (
          <span className="ml-2 text-gray-400">• {vente.nom_caissier}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Bouton Détails */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggleDetails}
          className="
            flex items-center gap-1 px-3 py-1.5 rounded-lg
            bg-blue-100 text-blue-700 hover:bg-blue-200
            text-sm font-medium transition-colors
          "
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Détails
        </motion.button>

        {/* Bouton Supprimer (Admin uniquement) */}
        {isAdmin && onDelete && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (confirm(`Supprimer la facture #${vente.num_facture} ?\nCette action est irréversible.`)) {
                onDelete(vente.id_facture);
              }
            }}
            className="
              flex items-center gap-1 px-3 py-1.5 rounded-lg
              bg-red-100 text-red-700 hover:bg-red-200
              text-sm font-medium transition-colors
            "
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </motion.button>
        )}

        {/* Bouton Reçu */}
        {onViewReceipt && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewReceipt(vente.id_facture)}
            className="
              flex items-center gap-1 px-3 py-1.5 rounded-lg
              bg-green-100 text-green-700 hover:bg-green-200
              text-sm font-medium transition-colors
            "
          >
            <Receipt className="w-4 h-4" />
            Reçu
          </motion.button>
        )}

        {/* Bouton Facture */}
        {onViewInvoice && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewInvoice(vente.id_facture)}
            className="
              flex items-center gap-1 px-3 py-1.5 rounded-lg
              bg-purple-100 text-purple-700 hover:bg-purple-200
              text-sm font-medium transition-colors
            "
          >
            <FileText className="w-4 h-4" />
            Facture
          </motion.button>
        )}
      </div>

      {/* Section Détails dépliable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-200">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">Chargement...</span>
                </div>
              ) : details.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Articles vendus</h4>
                  {details.map((detail, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{detail.nom_produit}</div>
                        <div className="text-sm text-gray-500">
                          {detail.quantite} × {detail.prix_unitaire.toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                      <div className="font-semibold text-gray-900">
                        {detail.total.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500">
                  Aucun détail disponible
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
