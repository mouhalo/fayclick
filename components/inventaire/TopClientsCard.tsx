'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Phone, Crown, Star, User, ChevronDown } from 'lucide-react';
import type { TopClient } from '@/types/inventaire.types';

interface TopClientsCardProps {
  clients: TopClient[];
  defaultExpanded?: boolean;
}

/**
 * Carte dépliable affichant le top 5 des meilleurs clients
 * Design compact en zone répétée pour une meilleure lisibilité
 */
export default function TopClientsCard({ clients, defaultExpanded = true }: TopClientsCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calcul du total pour l'aperçu replié
  const totalMontant = clients?.reduce((acc, c) => acc + c.montant_total, 0) || 0;

  // Badge de statut client
  const getStatutBadge = (statut: 'VIP' | 'Premium' | 'Standard') => {
    const styles = {
      VIP: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        icon: <Crown className="w-2.5 h-2.5" />
      },
      Premium: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        icon: <Star className="w-2.5 h-2.5" />
      },
      Standard: {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        icon: <User className="w-2.5 h-2.5" />
      }
    };
    return styles[statut];
  };

  // Couleur du badge de rang
  const getRangeBadgeColor = (rang: number) => {
    switch (rang) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white';
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
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header cliquable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-gray-800">Meilleurs clients</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {clients?.length || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className="text-xs text-emerald-600 font-semibold">
              {totalMontant.toLocaleString('fr-FR')} F
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* Liste des clients - Zone répétée dépliable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {clients && clients.length > 0 ? (
              <div className="divide-y divide-gray-50 px-4 pb-4">
                {clients.map((client, index) => {
                  const statutStyle = getStatutBadge(client.statut);

                  return (
                    <motion.div
                      key={client.rang}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="py-2.5 first:pt-0 last:pb-0"
                    >
                      {/* Ligne principale */}
                      <div className="flex items-center gap-2">
                        {/* Badge rang compact */}
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${getRangeBadgeColor(client.rang)}`}>
                          {client.rang}
                        </div>

                        {/* Initiales client - compact */}
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full ${getInitialsBgColor(client.rang)} flex items-center justify-center`}>
                          <span className="text-white font-bold text-xs">{client.initiales}</span>
                        </div>

                        {/* Nom client - prend tout l'espace */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm leading-tight" title={client.nom_client}>
                            {client.nom_client}
                          </p>
                        </div>

                        {/* Montant */}
                        <div className="flex-shrink-0 text-right">
                          <p className="font-bold text-emerald-600 text-sm whitespace-nowrap">
                            {client.montant_total.toLocaleString('fr-FR')} F
                          </p>
                        </div>
                      </div>

                      {/* Ligne secondaire - détails */}
                      <div className="flex items-center justify-between mt-1 ml-8">
                        <div className="flex items-center gap-2">
                          {/* Téléphone */}
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="w-2.5 h-2.5" />
                            {client.tel_client}
                          </span>
                          {/* Badge statut */}
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${statutStyle.bg} ${statutStyle.text}`}>
                            {statutStyle.icon}
                            {client.statut}
                          </span>
                        </div>
                        {/* Commandes */}
                        <span className="text-xs text-gray-400">
                          {client.nombre_factures} cmd{client.nombre_factures > 1 ? 's' : ''}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Users className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">Aucun client sur cette période</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
