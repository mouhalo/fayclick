'use client';

import React, { useEffect } from 'react';
import { TabContentProps } from '../../types/structure-page';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatAmountWithCurrency } from '@/utils/formatAmount';
import StatsCard from '@/components/dashboard/StatsCard';
import useStructureData from '../../hooks/useStructureData';
import { DashboardStats } from '@/types/dashboard';

const DashboardTab: React.FC<TabContentProps> = ({ isActive, structure }) => {
  const { isMobile } = useBreakpoint();
  const { stats, loadDashboardStats, isLoading } = useStructureData();

  useEffect(() => {
    if (isActive) {
      loadDashboardStats();
    }
  }, [isActive, loadDashboardStats]);

  if (!isActive) return null;

  const renderLoadingState = () => (
    <div className="p-6 space-y-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 rounded-2xl h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-200 rounded-xl h-64"></div>
          <div className="bg-gray-200 rounded-xl h-64"></div>
        </div>
      </div>
    </div>
  );

  const getStatsForStructureType = (stats: DashboardStats) => {
    const baseStats = {
      totalFactures: {
        icon: '📄',
        value: formatAmountWithCurrency(stats.mt_total_factures || 0),
        label: 'Total Factures',
        borderColor: 'border-blue-500',
        description: 'Montant total des factures émises'
      },
      totalPaye: {
        icon: '💰',
        value: formatAmountWithCurrency(stats.mt_total_payees || 0),
        label: 'Total Payé',
        borderColor: 'border-green-500',
        description: 'Montant total des paiements reçus'
      },
      totalImpaye: {
        icon: '⚠️',
        value: formatAmountWithCurrency(stats.mt_total_impayees || 0),
        label: 'Montant Impayé',
        borderColor: 'border-red-500',
        description: 'Montant en attente de paiement'
      }
    };

    const specificStats: any[] = [];

    switch (stats.type_structure) {
      case 'SCOLAIRE':
        if (typeof stats.total_eleves === 'number') {
          specificStats.push({
            icon: '🎓',
            value: stats.total_eleves.toLocaleString(),
            label: 'Total Élèves',
            borderColor: 'border-purple-500',
            description: 'Nombre total d\'élèves inscrits'
          });
        }
        break;
        
      case 'COMMERCIALE':
        if (typeof stats.total_produits === 'number') {
          specificStats.push({
            icon: '📦',
            value: stats.total_produits.toLocaleString(),
            label: 'Total Produits',
            borderColor: 'border-orange-500',
            description: 'Nombre de produits en catalogue'
          });
        }
        if (typeof stats.mt_valeur_stocks === 'number') {
          specificStats.push({
            icon: '📊',
            value: formatAmountWithCurrency(stats.mt_valeur_stocks),
            label: 'Valeur Stocks',
            borderColor: 'border-indigo-500',
            description: 'Valeur totale des stocks'
          });
        }
        break;
        
      case 'IMMOBILIER':
        if (typeof stats.total_clients === 'number') {
          specificStats.push({
            icon: '👥',
            value: stats.total_clients.toLocaleString(),
            label: 'Total Clients',
            borderColor: 'border-teal-500',
            description: 'Nombre total de clients'
          });
        }
        break;
        
      case 'PRESTATAIRE DE SERVICES':
        if (typeof stats.total_services === 'number') {
          specificStats.push({
            icon: '🛠️',
            value: stats.total_services.toLocaleString(),
            label: 'Total Services',
            borderColor: 'border-cyan-500',
            description: 'Nombre de services proposés'
          });
        }
        if (typeof stats.mt_chiffre_affaire === 'number') {
          specificStats.push({
            icon: '📈',
            value: formatAmountWithCurrency(stats.mt_chiffre_affaire),
            label: 'Chiffre d\'Affaires',
            borderColor: 'border-emerald-500',
            description: 'Chiffre d\'affaires total'
          });
        }
        break;
    }

    return { baseStats, specificStats };
  };

  const renderDashboardContent = (stats: DashboardStats) => {
    const { baseStats, specificStats } = getStatsForStructureType(stats);
    
    const allStats = [
      ...Object.values(baseStats),
      ...specificStats
    ];

    return (
      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Dashboard - {stats.nom_structure}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Vue d'ensemble des données de votre structure {stats.type_structure}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
            
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter
            </button>
          </div>
        </div>

        {/* Grille des statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allStats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Section détaillée selon le type de structure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Analyse financière */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-3">💰</span>
              Analyse Financière
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Taux de recouvrement</span>
                <span className="text-sm font-bold text-green-600">
                  {stats.mt_total_factures > 0 
                    ? `${Math.round((stats.mt_total_payees / stats.mt_total_factures) * 100)}%`
                    : '0%'
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Montant moyen par facture</span>
                <span className="text-sm font-bold text-blue-600">
                  {stats.mt_total_factures > 0
                    ? formatAmountWithCurrency(Math.round(stats.mt_total_factures / 100)) // Estimation 100 factures
                    : formatAmountWithCurrency(0)
                  }
                </span>
              </div>
              
              {stats.type_structure === 'COMMERCIALE' && stats.mt_valeur_stocks && (
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Rotation des stocks</span>
                  <span className="text-sm font-bold text-orange-600">
                    {stats.mt_total_factures > 0 && stats.mt_valeur_stocks > 0
                      ? `${Math.round(stats.mt_total_factures / stats.mt_valeur_stocks * 100) / 100}`
                      : '0'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Indicateurs de performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-3">📊</span>
              Indicateurs de Performance
            </h3>
            
            <div className="space-y-4">
              {stats.type_structure === 'SCOLAIRE' && typeof stats.total_eleves === 'number' && (
                <>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Revenus par élève</span>
                    <span className="text-sm font-bold text-purple-600">
                      {formatAmountWithCurrency(Math.round(stats.mt_total_factures / stats.total_eleves))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Paiements par élève</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {formatAmountWithCurrency(Math.round(stats.mt_total_payees / stats.total_eleves))}
                    </span>
                  </div>
                </>
              )}
              
              {stats.type_structure === 'COMMERCIALE' && typeof stats.total_produits === 'number' && stats.total_produits > 0 && (
                <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">CA moyen par produit</span>
                  <span className="text-sm font-bold text-teal-600">
                    {formatAmountWithCurrency(Math.round(stats.mt_total_factures / stats.total_produits))}
                  </span>
                </div>
              )}
              
              {stats.type_structure === 'IMMOBILIER' && typeof stats.total_clients === 'number' && stats.total_clients > 0 && (
                <div className="flex justify-between items-center p-3 bg-cyan-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">CA moyen par client</span>
                  <span className="text-sm font-bold text-cyan-600">
                    {formatAmountWithCurrency(Math.round(stats.mt_total_factures / stats.total_clients))}
                  </span>
                </div>
              )}
              
              {stats.type_structure === 'PRESTATAIRE DE SERVICES' && typeof stats.total_services === 'number' && stats.total_services > 0 && (
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">CA moyen par service</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatAmountWithCurrency(Math.round((stats.mt_chiffre_affaire || 0) / stats.total_services))}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Dernière mise à jour</span>
                <span className="text-sm font-bold text-gray-600">
                  {new Date().toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-3">🚀</span>
            Actions Rapides
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <span className="mr-2">📊</span>
              Voir détails
            </button>
            
            <button className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <span className="mr-2">📈</span>
              Tendances
            </button>
            
            <button className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <span className="mr-2">⚡</span>
              Actions
            </button>
            
            <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <span className="mr-2">📋</span>
              Rapport complet
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return renderLoadingState();
  }

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
        <p className="text-gray-600">Les statistiques de votre dashboard ne sont pas encore disponibles.</p>
        <button 
          onClick={loadDashboardStats}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Charger les données
        </button>
      </div>
    );
  }

  return renderDashboardContent(stats);
};

export default DashboardTab;