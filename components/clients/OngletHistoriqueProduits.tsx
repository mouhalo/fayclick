/**
 * Onglet Historique Produits - Modal Client
 * Stats d'achat + Tableau des produits achetés avec recherche et tri
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Star, 
  Package, 
  TrendingUp,
  Search,
  SortAsc,
  SortDesc,
  Filter,
  Calendar,
  Hash,
  DollarSign
} from 'lucide-react';
import { 
  ClientDetailComplet, 
  HistoriqueProduitClient, 
  FiltreHistorique, 
  StatCard
} from '@/types/client';
import { clientsService } from '@/services/clients.service';

interface OngletHistoriqueProduitsProps {
  clientDetail: ClientDetailComplet;
  produits: HistoriqueProduitClient[];
  statsCards: StatCard[];
  filtre: FiltreHistorique;
  setFiltre: (filtre: FiltreHistorique) => void;
  isLoading: boolean;
}

// Composant StatCard pour l'historique
function StatCardHistorique({ stat }: { stat: StatCard }) {
  const getIconComponent = (iconName: string) => {
    const icons = {
      Star,
      Package,
      TrendingUp,
      ShoppingBag
    };
    return icons[iconName as keyof typeof icons] || Package;
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'yellow':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-400/30',
          icon: 'text-yellow-300',
          text: 'text-yellow-100'
        };
      case 'blue':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-400/30',
          icon: 'text-blue-300',
          text: 'text-blue-100'
        };
      case 'purple':
        return {
          bg: 'bg-purple-500/20',
          border: 'border-purple-400/30',
          icon: 'text-purple-300',
          text: 'text-purple-100'
        };
      default:
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-400/30',
          icon: 'text-emerald-300',
          text: 'text-emerald-100'
        };
    }
  };

  const IconComponent = getIconComponent(stat.icon);
  const colors = getColorClasses(stat.color);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${colors.bg} ${colors.border} backdrop-blur-sm rounded-2xl p-4 border`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center`}>
          <IconComponent className={`w-5 h-5 ${colors.icon}`} />
        </div>
        {stat.badge && (
          <span className={`px-2 py-1 ${colors.bg} ${colors.border} rounded-lg text-xs ${colors.text} border`}>
            {stat.badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-white/60 text-sm font-medium">{stat.label}</p>
        <p className={`text-xl font-bold ${colors.text}`}>
          {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
        </p>
      </div>
    </motion.div>
  );
}

// Composant ligne de produit
function LigneProduit({ 
  produit, 
  tousLesProduits 
}: { 
  produit: HistoriqueProduitClient;
  tousLesProduits: HistoriqueProduitClient[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/20 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-white truncate">{produit.nom_produit}</span>
            {produit.quantite_totale >= 10 && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-200 rounded-lg text-xs font-medium border border-yellow-400/30">
                Client fidèle
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div>
              <span className="text-white/60 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Quantité:
              </span>
              <p className="text-white font-medium">{produit.quantite_totale}</p>
            </div>
            <div>
              <span className="text-white/60 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Total:
              </span>
              <p className="text-white font-medium">{clientsService.formatMontant(produit.montant_total)}</p>
            </div>
            <div>
              <span className="text-white/60">Prix moyen:</span>
              <p className="text-white">{clientsService.formatMontant(produit.prix_unitaire_moyen)}</p>
            </div>
            <div>
              <span className="text-white/60">Commandes:</span>
              <p className="text-white">{produit.nombre_commandes}</p>
            </div>
            <div>
              <span className="text-white/60 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Dernière:
              </span>
              <p className="text-white">{clientsService.formatDate(produit.date_derniere_commande)}</p>
            </div>
          </div>
        </div>

        {/* Indicateur de popularité */}
        <div className="ml-4 flex flex-col items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center border border-purple-400/30">
            <span className="text-purple-200 font-bold text-sm">
              {Math.round((produit.montant_total / Math.max(...tousLesProduits.map(p => p.montant_total))) * 100)}%
            </span>
          </div>
          <span className="text-white/50 text-xs mt-1">Popularité</span>
        </div>
      </div>
    </motion.div>
  );
}

export function OngletHistoriqueProduits({
  clientDetail,
  produits,
  statsCards,
  filtre,
  setFiltre,
  isLoading
}: OngletHistoriqueProduitsProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (recherche: string) => {
    setFiltre({ ...filtre, recherche });
  };

  const handleSort = (tri: FiltreHistorique['tri']) => {
    const nouvelOrdre = filtre.tri === tri && filtre.ordre === 'desc' ? 'asc' : 'desc';
    setFiltre({ ...filtre, tri, ordre: nouvelOrdre });
  };

  const sortOptions = [
    { value: 'quantite', label: 'Quantité', icon: Hash },
    { value: 'montant', label: 'Montant', icon: DollarSign },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'nom', label: 'Nom', icon: Package }
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Historique des Achats
          </h3>
          <p className="text-white/60 text-sm">
            Analyse des produits achetés et habitudes de consommation
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-xl transition-colors border border-purple-400/30"
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Statistiques d'historique */}
      <div>
        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Statistiques d'Achat
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCardHistorique stat={stat} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filtres et recherche */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
        >
          <div className="space-y-4">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                value={filtre.recherche}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm"
              />
            </div>

            {/* Options de tri */}
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                const isActive = filtre.tri === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSort(option.value as FiltreHistorique['tri'])}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                    {isActive && (
                      filtre.ordre === 'desc' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Liste des produits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Produits Achetés ({produits.length})
          </h4>
          
          {filtre.recherche && (
            <button
              onClick={() => handleSearch('')}
              className="text-white/60 hover:text-white text-sm underline"
            >
              Effacer recherche
            </button>
          )}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            // Skeleton loading
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/20">
                  <div className="animate-pulse">
                    <div className="h-5 bg-white/20 rounded w-2/3 mb-3"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="h-4 bg-white/20 rounded"></div>
                      <div className="h-4 bg-white/20 rounded"></div>
                      <div className="h-4 bg-white/20 rounded"></div>
                      <div className="h-4 bg-white/20 rounded"></div>
                      <div className="h-4 bg-white/20 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : produits.length > 0 ? (
            produits.map((produit) => (
              <LigneProduit
                key={produit.id_produit}
                produit={produit}
                tousLesProduits={produits}
              />
            ))
          ) : (
            // État vide
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/20">
              <ShoppingBag className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60 mb-2">
                {filtre.recherche 
                  ? `Aucun produit trouvé pour "${filtre.recherche}"`
                  : 'Aucun produit acheté'
                }
              </p>
              {filtre.recherche && (
                <button
                  onClick={() => handleSearch('')}
                  className="text-purple-300 hover:text-purple-200 text-sm underline"
                >
                  Voir tous les produits
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Insights en bas */}
      {produits.length > 0 && !isLoading && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/20">
          <h5 className="text-white font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Insights Client
          </h5>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h6 className="text-white/80 text-sm font-medium mb-2">Top 3 Produits</h6>
              <div className="space-y-2">
                {produits.slice(0, 3).map((produit, index) => (
                  <div key={produit.id_produit} className="flex items-center gap-3 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-200' : 
                        index === 1 ? 'bg-gray-500/20 text-gray-200' : 
                        'bg-orange-500/20 text-orange-200'}`}>
                      {index + 1}
                    </span>
                    <span className="text-white truncate">{produit.nom_produit}</span>
                    <span className="text-white/60 ml-auto">{produit.quantite_totale}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h6 className="text-white/80 text-sm font-medium mb-2">Résumé</h6>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Total dépensé:</span>
                  <span className="text-white font-medium">
                    {clientsService.formatMontant(
                      produits.reduce((sum, p) => sum + p.montant_total, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Panier moyen:</span>
                  <span className="text-white font-medium">
                    {clientsService.formatMontant(
                      produits.reduce((sum, p) => sum + p.montant_total, 0) / 
                      Math.max(produits.reduce((sum, p) => sum + p.nombre_commandes, 0), 1)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Dernière commande:</span>
                  <span className="text-white font-medium">
                    {clientsService.formatDate(
                      produits.reduce((latest, p) => 
                        new Date(p.date_derniere_commande) > new Date(latest) 
                          ? p.date_derniere_commande 
                          : latest, 
                        produits[0]?.date_derniere_commande || ''
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}