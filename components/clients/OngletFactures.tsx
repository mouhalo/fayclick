/**
 * Onglet Factures - Modal Client
 * Stats de paiement + Tableau des factures avec filtres et actions
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  AlertTriangle,
  Eye,
  CreditCard,
  Filter,
  Search,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { 
  ClientDetailComplet, 
  FactureClient, 
  FiltreFactures, 
  StatCard,
  getStatutFactureBadgeColor
} from '@/types/client';
import { clientsService } from '@/services/clients.service';

interface OngletFacturesProps {
  clientDetail: ClientDetailComplet;
  factures: FactureClient[];
  statsCards: StatCard[];
  filtre: FiltreFactures;
  setFiltre: (filtre: FiltreFactures) => void;
  onMarquerPayee: (idFacture: number, montant: number) => Promise<void>;
  isLoading: boolean;
}

// Composant StatCard pour les factures
function StatCardFacture({ stat }: { stat: StatCard }) {
  const getIconComponent = (iconName: string) => {
    const icons = {
      CheckCircle,
      XCircle,
      DollarSign,
      AlertTriangle
    };
    return icons[iconName as keyof typeof icons] || FileText;
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-400/30',
          icon: 'text-green-300',
          text: 'text-green-100'
        };
      case 'red':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-400/30',
          icon: 'text-red-300',
          text: 'text-red-100'
        };
      default:
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-400/30',
          icon: 'text-blue-300',
          text: 'text-blue-100'
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

// Composant ligne de facture
function LigneFacture({ 
  facture, 
  onMarquerPayee 
}: { 
  facture: FactureClient; 
  onMarquerPayee: (id: number, montant: number) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarquerPayee = async () => {
    if (facture.statut_paiement === 'PAYEE') return;
    
    try {
      setIsProcessing(true);
      await onMarquerPayee(facture.id_facture, facture.montant_facture);
    } catch (error) {
      console.error('Erreur marquage facture:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const statutColors = clientsService.getStatutFactureColor(facture.statut_paiement);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 hover:bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-white">#{facture.numero_facture}</span>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${statutColors.bg} ${statutColors.text} ${statutColors.border}`}>
              {facture.statut_paiement}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-white/60">Date:</span>
              <p className="text-white">{clientsService.formatDate(facture.date_facture)}</p>
            </div>
            <div>
              <span className="text-white/60">Montant:</span>
              <p className="text-white font-medium">{clientsService.formatMontant(facture.montant_facture)}</p>
            </div>
            {facture.date_paiement && (
              <div>
                <span className="text-white/60">Payé le:</span>
                <p className="text-white">{clientsService.formatDate(facture.date_paiement)}</p>
              </div>
            )}
            {facture.montant_restant && facture.montant_restant > 0 && (
              <div>
                <span className="text-white/60">Restant:</span>
                <p className="text-red-300">{clientsService.formatMontant(facture.montant_restant)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          
          {facture.statut_paiement !== 'PAYEE' && (
            <button
              onClick={handleMarquerPayee}
              disabled={isProcessing}
              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function OngletFactures({
  clientDetail,
  factures,
  statsCards,
  filtre,
  setFiltre,
  onMarquerPayee,
  isLoading
}: OngletFacturesProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleFiltreStatut = (statut: FiltreFactures['statut']) => {
    setFiltre({ ...filtre, statut });
  };

  const statutOptions = [
    { value: 'TOUTES', label: 'Toutes', count: clientDetail.factures.length },
    { value: 'PAYEES', label: 'Payées', count: clientDetail.statistiques_factures.nombre_factures_payees },
    { value: 'IMPAYEES', label: 'Impayées', count: clientDetail.statistiques_factures.nombre_factures_impayees },
    { value: 'PARTIELLES', label: 'Partielles', count: clientDetail.factures.filter(f => f.statut_paiement === 'PARTIELLE').length }
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Gestion des Factures
          </h3>
          <p className="text-white/60 text-sm">
            Historique des factures et gestion des paiements
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-xl transition-colors border border-blue-400/30"
        >
          <Filter className="w-4 h-4" />
          Filtres
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Statistiques de paiement */}
      <div>
        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Statistiques de Paiement
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCardFacture stat={stat} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
        >
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {statutOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFiltreStatut(option.value as FiltreFactures['statut'])}
                className={`
                  flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors
                  ${filtre.statut === option.value 
                    ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }
                `}
              >
                <span className="truncate">{option.label}</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Liste des factures */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Liste des Factures ({factures.length})
          </h4>
          
          {filtre.statut !== 'TOUTES' && (
            <button
              onClick={() => handleFiltreStatut('TOUTES')}
              className="text-white/60 hover:text-white text-sm underline"
            >
              Afficher toutes
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
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-4 bg-white/20 rounded w-20"></div>
                      <div className="h-5 bg-white/20 rounded w-16"></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="h-4 bg-white/20 rounded"></div>
                      <div className="h-4 bg-white/20 rounded"></div>
                      <div className="h-4 bg-white/20 rounded"></div>
                      <div className="h-4 bg-white/20 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : factures.length > 0 ? (
            factures.map((facture) => (
              <LigneFacture
                key={facture.id_facture}
                facture={facture}
                onMarquerPayee={onMarquerPayee}
              />
            ))
          ) : (
            // État vide
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/20">
              <FileText className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60 mb-2">
                {filtre.statut === 'TOUTES' 
                  ? 'Aucune facture trouvée'
                  : `Aucune facture ${filtre.statut.toLowerCase()}`
                }
              </p>
              {filtre.statut !== 'TOUTES' && (
                <button
                  onClick={() => handleFiltreStatut('TOUTES')}
                  className="text-blue-300 hover:text-blue-200 text-sm underline"
                >
                  Voir toutes les factures
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Résumé en bas */}
      {factures.length > 0 && !isLoading && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-white/60 text-sm">Total Factures</p>
              <p className="text-white font-semibold">{factures.length}</p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Montant Total</p>
              <p className="text-white font-semibold">
                {clientsService.formatMontant(
                  factures.reduce((sum, f) => sum + f.montant_facture, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Montant Payé</p>
              <p className="text-green-300 font-semibold">
                {clientsService.formatMontant(
                  factures.filter(f => f.statut_paiement === 'PAYEE').reduce((sum, f) => sum + f.montant_facture, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Taux Paiement</p>
              <p className="text-blue-300 font-semibold">
                {factures.length > 0 
                  ? Math.round((factures.filter(f => f.statut_paiement === 'PAYEE').length / factures.length) * 100)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}