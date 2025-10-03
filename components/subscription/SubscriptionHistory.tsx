/**
 * Composant d'affichage de l'historique des abonnements
 * Tableau avec Date, Type, Montant et État
 */

'use client';

import { motion } from 'framer-motion';
import { Calendar, Check, XCircle, Clock, Ban } from 'lucide-react';
import {
  HistoriqueAbonnement,
  SubscriptionStatus,
  formatSubscriptionDate,
  STATUS_COLORS
} from '@/types/subscription.types';
import { formatAmount } from '@/types/payment-wallet';

interface SubscriptionHistoryProps {
  historique: HistoriqueAbonnement[];
  isLoading?: boolean;
}

/**
 * Icône selon le statut
 */
function getStatusIcon(statut: SubscriptionStatus) {
  switch (statut) {
    case 'ACTIF':
      return <Check className="w-4 h-4 text-emerald-600" />;
    case 'EXPIRE':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'EN_ATTENTE':
      return <Clock className="w-4 h-4 text-orange-600" />;
    case 'ANNULE':
      return <Ban className="w-4 h-4 text-gray-600" />;
    default:
      return null;
  }
}

export default function SubscriptionHistory({
  historique,
  isLoading = false
}: SubscriptionHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!historique || historique.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Aucun historique d'abonnement</p>
        <p className="text-sm text-gray-500 mt-1">
          Vos abonnements apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-900 mb-4">
        Historique des abonnements
      </h3>

      {/* Version Mobile - Cards */}
      <div className="md:hidden space-y-3">
        {historique.map((item, index) => (
          <motion.div
            key={item.id_abonnement}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-all shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  {getStatusIcon(item.statut)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {item.type_abonnement}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatSubscriptionDate(item.date_debut)}
                  </p>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[item.statut]}`}>
                {item.statut}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-600">Montant</span>
              <span className="font-bold text-gray-900">
                {formatAmount(item.montant)} FCFA
              </span>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Réf: {item.ref_abonnement}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Version Desktop - Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-emerald-50 to-green-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Type
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Montant
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                État
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Référence
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {historique.map((item, index) => (
              <motion.tr
                key={item.id_abonnement}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {formatSubscriptionDate(item.date_debut)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700">
                    {item.type_abonnement}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-gray-900">
                    {formatAmount(item.montant)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">FCFA</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {getStatusIcon(item.statut)}
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[item.statut]}`}>
                      {item.statut}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600 font-mono">
                    {item.ref_abonnement}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
