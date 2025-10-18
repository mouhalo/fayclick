'use client';

import { motion } from 'framer-motion';
import { Users, Phone, Crown, Star, Award } from 'lucide-react';
import type { TopClient } from '@/types/inventaire.types';

interface TopClientsCardProps {
  clients: TopClient[];
}

/**
 * Carte affichant le top 5 des meilleurs clients
 */
export default function TopClientsCard({ clients }: TopClientsCardProps) {
  // Badge de statut client
  const getStatutBadge = (statut: 'VIP' | 'Premium' | 'Standard') => {
    const styles = {
      VIP: {
        bg: 'bg-gradient-to-r from-amber-400 to-amber-600',
        text: 'text-white',
        icon: <Crown className="w-3 h-3" />
      },
      Premium: {
        bg: 'bg-gradient-to-r from-purple-400 to-purple-600',
        text: 'text-white',
        icon: <Star className="w-3 h-3" />
      },
      Standard: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        icon: <Award className="w-3 h-3" />
      }
    };
    return styles[statut];
  };

  // Couleur du badge de rang
  const getRangeBadgeColor = (rang: number) => {
    switch (rang) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  };

  // Couleur de fond des initiales
  const getInitialsBgColor = (rang: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    return colors[(rang - 1) % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Users className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Meilleurs clients</h3>
      </div>

      {/* Liste des clients */}
      {clients && clients.length > 0 ? (
        <div className="space-y-3">
          {clients.map((client, index) => {
            const statutStyle = getStatutBadge(client.statut);

            return (
              <motion.div
                key={client.rang}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {/* Badge de rang */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRangeBadgeColor(client.rang)}`}>
                  {client.rang}
                </div>

                {/* Initiales client */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getInitialsBgColor(client.rang)} flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">{client.initiales}</span>
                </div>

                {/* Informations client */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{client.nom_client}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{client.tel_client}</span>
                  </div>
                  {/* Badge statut */}
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${statutStyle.bg} ${statutStyle.text}`}>
                    {statutStyle.icon}
                    <span>{client.statut}</span>
                  </div>
                </div>

                {/* Montant et commandes */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-emerald-600 text-sm">
                    {client.montant_total.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {client.nombre_factures} {client.nombre_factures > 1 ? 'commandes' : 'commande'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Users className="w-16 h-16 mb-3 opacity-30" />
          <p className="text-sm">Aucun client sur cette période</p>
        </div>
      )}
    </motion.div>
  );
}
