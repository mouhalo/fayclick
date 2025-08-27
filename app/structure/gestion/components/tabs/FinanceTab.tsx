'use client';

import React, { useState, useEffect } from 'react';
import { TabContentProps, ReversementRecord, MonthlyTransactionData } from '../../types/structure-page';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatAmountWithCurrency } from '@/utils/formatAmount';
import { formatDate } from '@/utils/formatters';
import StatsCard from '@/components/dashboard/StatsCard';
import useStructureData from '../../hooks/useStructureData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FinanceTab: React.FC<TabContentProps> = ({ isActive, structure }) => {
  const { isMobile } = useBreakpoint();
  const { transactions, loadTransactions } = useStructureData();
  const [activeSection, setActiveSection] = useState<'etat' | 'reversements' | 'transactions'>('etat');
  const [filters, setFilters] = useState({
    nomAgent: '',
    walletCompte: '',
    mode: 'Tous' as 'Tous' | 'WALLET' | 'BANK'
  });

  // Données mockées pour l'état financier
  const financeStats = {
    totalPaye: {
      amount: 107953500,
      description: 'Montant total des paiements reçus',
      lastUpdate: new Date(),
      icon: 'dollar-sign',
      color: 'success'
    },
    totalReverse: {
      amount: 106286034,
      description: 'Montant total des reversements',
      lastUpdate: new Date(),
      icon: 'arrow-down',
      color: 'info'
    },
    soldeCompte: {
      amount: 1667466,
      description: 'Montant disponible actuellement',
      lastUpdate: new Date(),
      icon: 'wallet',
      color: 'primary'
    }
  };

  // Données mockées pour les reversements
  const reversements: ReversementRecord[] = [
    {
      reference: 'REV-2024-001',
      statut: 'EFFECTUE',
      date: '2024-01-15',
      mode: 'WALLET',
      initial: 5000000,
      taux: 2.5,
      depose: 4875000,
      compte: '221771234567',
      document: 'receipt-001.pdf'
    },
    {
      reference: 'REV-2024-002',
      statut: 'EN_ATTENTE',
      date: '2024-01-20',
      mode: 'BANK',
      initial: 3000000,
      taux: 1.5,
      depose: 2955000,
      compte: 'CB0123456789',
    },
  ];

  // Préparer les données pour le graphique
  const chartData: MonthlyTransactionData[] = [
    { month: 'Jan', credits: 15000000, debits: 12000000, soldeNet: 3000000, transactions: 150 },
    { month: 'Fév', credits: 18000000, debits: 14000000, soldeNet: 4000000, transactions: 180 },
    { month: 'Mar', credits: 16000000, debits: 13000000, soldeNet: 3000000, transactions: 165 },
    { month: 'Avr', credits: 20000000, debits: 15000000, soldeNet: 5000000, transactions: 200 },
    { month: 'Mai', credits: 22000000, debits: 16000000, soldeNet: 6000000, transactions: 220 },
    { month: 'Jun', credits: 19000000, debits: 14500000, soldeNet: 4500000, transactions: 190 },
  ];

  useEffect(() => {
    if (isActive) {
      loadTransactions();
    }
  }, [isActive, loadTransactions]);

  if (!isActive) return null;

  const renderStatutBadge = (statut: ReversementRecord['statut']) => {
    const styles = {
      'EFFECTUE': 'bg-green-100 text-green-800',
      'EN_ATTENTE': 'bg-yellow-100 text-yellow-800',
      'ECHEC': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[statut]}`}>
        {statut.replace('_', ' ')}
      </span>
    );
  };

  const renderFinanceStats = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-900">État Financier</h3>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          icon="💰"
          value={formatAmountWithCurrency(financeStats.totalPaye.amount)}
          label="Total Payé"
          sublabel={financeStats.totalPaye.description}
          borderColor="border-green-500"
        />
        
        <StatsCard
          icon="↩️"
          value={formatAmountWithCurrency(financeStats.totalReverse.amount)}
          label="Total Reversé"
          sublabel={financeStats.totalReverse.description}
          borderColor="border-blue-500"
        />
        
        <StatsCard
          icon="🏦"
          value={formatAmountWithCurrency(financeStats.soldeCompte.amount)}
          label="Solde Compte"
          sublabel={financeStats.soldeCompte.description}
          borderColor="border-orange-500"
        />
      </div>
    </div>
  );

  const renderReversements = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-900">Historique des Reversements</h3>
        
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            value={filters.mode}
            onChange={(e) => setFilters({...filters, mode: e.target.value as any})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Tous">Tous les modes</option>
            <option value="WALLET">Mobile Money</option>
            <option value="BANK">Virement bancaire</option>
          </select>
          
          <input
            type="text"
            placeholder="Rechercher un compte..."
            value={filters.walletCompte}
            onChange={(e) => setFilters({...filters, walletCompte: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table responsive */}
      {isMobile ? (
        <div className="space-y-4">
          {reversements.map((reversement, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{reversement.reference}</p>
                  <p className="text-sm text-gray-500">{formatDate(reversement.date)}</p>
                </div>
                {renderStatutBadge(reversement.statut)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Mode:</span>
                  <span className="ml-2 font-medium">{reversement.mode}</span>
                </div>
                <div>
                  <span className="text-gray-500">Taux:</span>
                  <span className="ml-2 font-medium">{reversement.taux}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Initial:</span>
                  <span className="ml-2 font-medium">{formatAmountWithCurrency(reversement.initial)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Déposé:</span>
                  <span className="ml-2 font-medium text-green-600">{formatAmountWithCurrency(reversement.depose)}</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500">Compte: </span>
                <span className="text-xs font-mono">{reversement.compte}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Initial (FCFA)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Taux (%)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Déposé (FCFA)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Compte</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reversements.map((reversement, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reversement.reference}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{renderStatutBadge(reversement.statut)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(reversement.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reversement.mode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatAmountWithCurrency(reversement.initial)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{reversement.taux}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">{formatAmountWithCurrency(reversement.depose)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{reversement.compte}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reversement.document && (
                      <button className="text-blue-600 hover:text-blue-900 text-sm">
                        📄 Voir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-900">Analyse des Transactions</h3>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100">
            6 mois
          </button>
          <button className="px-4 py-2 text-sm bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200">
            1 an
          </button>
        </div>
      </div>

      {/* Stats résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {formatAmountWithCurrency(chartData.reduce((acc, item) => acc + item.credits, 0))}
          </div>
          <div className="text-sm text-green-600 font-medium">Total Crédits</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">
            {formatAmountWithCurrency(chartData.reduce((acc, item) => acc + item.debits, 0))}
          </div>
          <div className="text-sm text-red-600 font-medium">Total Débits</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {formatAmountWithCurrency(chartData.reduce((acc, item) => acc + item.soldeNet, 0))}
          </div>
          <div className="text-sm text-blue-600 font-medium">Solde Net</div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-600">
            {chartData.reduce((acc, item) => acc + item.transactions, 0)}
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Transactions</div>
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Évolution Mensuelle</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatAmountWithCurrency(value)} />
              <Tooltip formatter={(value) => formatAmountWithCurrency(value as number)} />
              <Bar dataKey="credits" fill="#10b981" name="Crédits" />
              <Bar dataKey="debits" fill="#ef4444" name="Débits" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table détaillée */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mois</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Crédits</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Débits</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Solde Net</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chartData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.month} 2024</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">{formatAmountWithCurrency(item.credits)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-medium">{formatAmountWithCurrency(item.debits)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">{formatAmountWithCurrency(item.soldeNet)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.transactions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Navigation sous-sections */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'etat', label: 'État Financier', icon: '💰' },
            { key: 'reversements', label: 'Reversements', icon: '↩️' },
            { key: 'transactions', label: 'Transactions', icon: '📊' }
          ].map(section => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key as any)}
              className={`
                flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeSection === section.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu selon la section active */}
      {activeSection === 'etat' && renderFinanceStats()}
      {activeSection === 'reversements' && renderReversements()}
      {activeSection === 'transactions' && renderTransactions()}
    </div>
  );
};

export default FinanceTab;