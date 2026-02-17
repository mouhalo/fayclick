'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoffreFort } from '@/hooks/useCoffreFort';
import { useWalletStructure } from '@/hooks/useWalletStructure';
import { useStructure } from '@/hooks/useStructure';
import { useHasRight } from '@/hooks/useRights';
import WalletFlipCard from './WalletFlipCard';

interface ModalCoffreFortProps {
  isOpen: boolean;
  onClose: () => void;
  structureId: number;
}

type TabType = 'ca' | 'kalpe' | 'transactions';

type TransactionFilter = 'all' | 'recu' | 'retrait';

export default function ModalCoffreFort({ isOpen, onClose, structureId }: ModalCoffreFortProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ca');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [searchPhone, setSearchPhone] = useState('');
  const { data: coffreData, isLoading: coffreLoading } = useCoffreFort(structureId);
  const {
    soldes,
    walletData,
    transactions,
    totaux,
    isLoading: walletLoading,
    refresh: refreshWallet
  } = useWalletStructure(structureId);

  // Récupérer les numéros de téléphone de la structure
  const { structure, contact } = useStructure();
  const mobileOm = contact?.mobileOm || '';
  const mobileWave = contact?.mobileWave || '';
  const nomStructure = structure?.nom_structure || '';

  // Droit de voir les chiffres financiers (CA, soldes KALPE)
  const canViewCA = useHasRight("VOIR CHIFFRE D'AFFAIRE");

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  /** Affiche le montant ou **** selon le droit */
  const displayAmount = (amount: number) => {
    if (!canViewCA) return '****';
    return formatCurrency(amount);
  };

  /** Affiche un pourcentage ou **** selon le droit */
  const displayPercent = (value: number) => {
    if (!canViewCA) return '****';
    return `${value.toFixed(2)}%`;
  };

  /** Affiche un nombre ou **** selon le droit */
  const displayNumber = (value: number) => {
    if (!canViewCA) return '****';
    return String(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhone = (phone: string | null) => {
    if (!phone || phone === '000000000') return '-';
    // Format: 77 123 45 67
    if (phone.length === 9) {
      return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 7)} ${phone.slice(7)}`;
    }
    return phone;
  };

  // Filtrer les transactions selon le filtre actif + recherche téléphone
  const filteredTransactions = transactions.filter((t) => {
    // Filtre par sens
    if (transactionFilter === 'recu' && t.sens !== 'ENTREE') return false;
    if (transactionFilter === 'retrait' && t.sens !== 'SORTIE') return false;
    // Filtre par téléphone
    if (searchPhone.trim()) {
      const search = searchPhone.replace(/\s/g, '');
      const phone = (t.telephone || '').replace(/\s/g, '');
      if (!phone.includes(search)) return false;
    }
    return true;
  });

  const tabs = [
    { id: 'ca' as TabType, label: 'CA Global', icon: '💰' },
    { id: 'kalpe' as TabType, label: 'KALPE', icon: '📱' },
    { id: 'transactions' as TabType, label: 'Transactions', icon: '📊' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>🏦</span>
                    <span>Coffre-Fort Financier</span>
                  </h2>
                  <p className="text-xs opacity-90 mt-1">Situation financière en temps réel</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Onglets */}
              <div className="flex gap-2 mt-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all
                      ${activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'bg-white/10 text-white hover:bg-white/20'
                      }
                    `}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body avec scroll */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Onglet CA Global */}
              {activeTab === 'ca' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* CA Display */}
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-3 text-center mb-3 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        animation: 'sparkle 10s linear infinite'
                      }} />
                    </div>
                    <div className="relative z-10">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" as const }}
                        className="text-xl font-bold mb-0.5"
                      >
                        {coffreLoading ? (
                          <div className="w-24 h-6 bg-white/20 animate-pulse rounded mx-auto"></div>
                        ) : (
                          displayAmount(coffreData?.ca_total || 0)
                        )}
                      </motion.div>
                      <div className="text-xs opacity-90 mb-1">Chiffre d&apos;Affaires Total</div>
                      <div className="text-[10px] opacity-80 flex items-center justify-center gap-1">
                        <span>📊</span>
                        {coffreLoading ? (
                          <div className="w-12 h-2 bg-white/20 animate-pulse rounded"></div>
                        ) : (
                          <span>{displayNumber(coffreData?.nb_ventes || 0)} ventes</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="space-y-2">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border-l-4 border-orange-500"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💼</span>
                        <span className="text-xs font-semibold text-gray-700">Total Charges</span>
                      </div>
                      <div className="text-sm font-bold text-orange-600">
                        {coffreLoading ? (
                          <div className="w-16 h-3 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          displayAmount(coffreData?.details?.couts?.charges_exploitation || 0)
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border-l-4 border-purple-500"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🛒</span>
                        <span className="text-xs font-semibold text-gray-700">Total Achats</span>
                      </div>
                      <div className="text-sm font-bold text-purple-600">
                        {coffreLoading ? (
                          <div className="w-16 h-3 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          displayAmount(coffreData?.details?.couts?.cout_achats_marchandises || 0)
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="bg-blue-50 rounded-lg border-l-4 border-blue-500 p-2.5"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💎</span>
                          <span className="text-xs font-semibold text-gray-700">Solde Net</span>
                        </div>
                        <div className="text-sm font-bold text-blue-600">
                          {coffreLoading ? (
                            <div className="w-16 h-3 bg-gray-200 animate-pulse rounded"></div>
                          ) : (
                            displayAmount(coffreData?.solde_net || 0)
                          )}
                        </div>
                      </div>

                      {/* Détails supplémentaires */}
                      <div className="space-y-1.5 pt-2 border-t border-blue-200">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-600 flex items-center gap-1">
                            <span>📈</span>
                            <span>Marge Brute</span>
                          </span>
                          <span className="font-semibold text-emerald-600">
                            {coffreLoading ? (
                              <div className="w-14 h-2.5 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                              displayAmount(coffreData?.details?.rentabilite?.marge_brute || 0)
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-600 flex items-center gap-1">
                            <span>📊</span>
                            <span>Taux de Marge</span>
                          </span>
                          <span className="font-semibold text-indigo-600">
                            {coffreLoading ? (
                              <div className="w-10 h-2.5 bg-gray-200 animate-pulse rounded"></div>
                            ) : (
                              displayPercent(coffreData?.details?.rentabilite?.taux_marge_nette || 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Onglet KALPE - Wallets avec Flip Cards */}
              {activeTab === 'kalpe' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Solde Total avec bouton Actualiser */}
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
                        backgroundSize: '15px 15px'
                      }} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-xs opacity-80">Solde Total KALPE</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            refreshWallet();
                          }}
                          disabled={walletLoading}
                          className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-all disabled:opacity-50"
                          title="Actualiser les soldes"
                        >
                          <span className={`text-sm ${walletLoading ? 'animate-spin inline-block' : ''}`}>🔄</span>
                        </button>
                      </div>
                      <div className="text-2xl font-bold text-center">
                        {walletLoading ? (
                          <div className="w-28 h-7 bg-white/20 animate-pulse rounded mx-auto"></div>
                        ) : (
                          displayAmount(soldes?.solde_total || 0)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info retrait */}
                  {canViewCA ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-700">
                        Cliquez sur une carte pour effectuer un retrait
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-amber-700">
                        🔒 Montants masqués — droits insuffisants
                      </p>
                    </div>
                  )}

                  {/* WalletFlipCard Orange Money */}
                  <WalletFlipCard
                    type="OM"
                    solde={soldes?.solde_om || 0}
                    totalNet={walletData?.soldes?.om?.total_net || 0}
                    totalRetire={walletData?.soldes?.om?.total_retire || 0}
                    telephone={mobileOm}
                    idStructure={structureId}
                    nomStructure={nomStructure}
                    isLoading={walletLoading}
                    onRetraitSuccess={refreshWallet}
                    masquerChiffres={!canViewCA}
                  />

                  {/* WalletFlipCard Wave */}
                  <WalletFlipCard
                    type="WAVE"
                    solde={soldes?.solde_wave || 0}
                    totalNet={walletData?.soldes?.wave?.total_net || 0}
                    totalRetire={walletData?.soldes?.wave?.total_retire || 0}
                    telephone={mobileWave}
                    idStructure={structureId}
                    nomStructure={nomStructure}
                    isLoading={walletLoading}
                    onRetraitSuccess={refreshWallet}
                    masquerChiffres={!canViewCA}
                  />

                  {/* WalletFlipCard Free Money (utilise le même numéro que OM) */}
                  <WalletFlipCard
                    type="FREE"
                    solde={soldes?.solde_free || 0}
                    totalNet={walletData?.soldes?.free?.total_net || 0}
                    totalRetire={walletData?.soldes?.free?.total_retire || 0}
                    telephone={mobileOm}
                    idStructure={structureId}
                    nomStructure={nomStructure}
                    isLoading={walletLoading}
                    onRetraitSuccess={refreshWallet}
                    masquerChiffres={!canViewCA}
                  />

                  {/* Bouton Rafraîchir */}
                  <button
                    onClick={refreshWallet}
                    disabled={walletLoading}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className={walletLoading ? 'animate-spin' : ''}>🔄</span>
                    <span>{walletLoading ? 'Chargement...' : 'Actualiser les soldes'}</span>
                  </button>
                </motion.div>
              )}

              {/* Onglet Transactions */}
              {activeTab === 'transactions' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* StatCards Total Reçus / Total Retraits - Cliquables pour filtrer */}
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => setTransactionFilter(transactionFilter === 'recu' ? 'all' : 'recu')}
                      className={`
                        text-left rounded-lg border-l-4 p-2.5 transition-all
                        ${transactionFilter === 'recu'
                          ? 'bg-green-100 border-green-600 ring-2 ring-green-300'
                          : 'bg-green-50 border-green-500 hover:bg-green-100'
                        }
                      `}
                    >
                      <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                        <span>📥</span>
                        <span>Total Reçus</span>
                        {transactionFilter === 'recu' && <span className="ml-auto text-green-600">✓</span>}
                      </div>
                      <div className="text-sm font-bold text-green-600">
                        {walletLoading ? (
                          <div className="w-16 h-4 bg-gray-200 animate-pulse rounded"></div>
                        ) : !canViewCA ? (
                          '****'
                        ) : (
                          formatCurrency(totaux.totalRecus)
                        )}
                      </div>
                    </motion.button>

                    <motion.button
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      onClick={() => setTransactionFilter(transactionFilter === 'retrait' ? 'all' : 'retrait')}
                      className={`
                        text-left rounded-lg border-l-4 p-2.5 transition-all
                        ${transactionFilter === 'retrait'
                          ? 'bg-red-100 border-red-600 ring-2 ring-red-300'
                          : 'bg-red-50 border-red-500 hover:bg-red-100'
                        }
                      `}
                    >
                      <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                        <span>📤</span>
                        <span>Total Retraits</span>
                        {transactionFilter === 'retrait' && <span className="ml-auto text-red-600">✓</span>}
                      </div>
                      <div className="text-sm font-bold text-red-600">
                        {walletLoading ? (
                          <div className="w-16 h-4 bg-gray-200 animate-pulse rounded"></div>
                        ) : !canViewCA ? (
                          '****'
                        ) : (
                          formatCurrency(totaux.totalRetraits)
                        )}
                      </div>
                    </motion.button>
                  </div>

                  {/* Barre de recherche + Actualiser */}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                      <input
                        type="tel"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        placeholder="Rechercher un téléphone..."
                        className="w-full pl-8 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all bg-white"
                      />
                      {searchPhone && (
                        <button
                          onClick={() => setSearchPhone('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={refreshWallet}
                      disabled={walletLoading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-all disabled:opacity-50 flex-shrink-0"
                      title="Actualiser les transactions"
                    >
                      <span className={`text-sm ${walletLoading ? 'animate-spin inline-block' : ''}`}>🔄</span>
                      <span className="text-xs font-medium hidden sm:inline">Actualiser</span>
                    </button>
                  </div>

                  {/* Indicateur de filtre actif */}
                  {(transactionFilter !== 'all' || searchPhone.trim()) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-1.5"
                    >
                      <span className="text-xs text-gray-600">
                        {transactionFilter !== 'all' && (
                          <>Filtre: <strong>{transactionFilter === 'recu' ? 'Réceptions' : 'Retraits'}</strong></>
                        )}
                        {transactionFilter !== 'all' && searchPhone.trim() && ' + '}
                        {searchPhone.trim() && (
                          <>Tél: <strong>{searchPhone}</strong></>
                        )}
                      </span>
                      <button
                        onClick={() => { setTransactionFilter('all'); setSearchPhone(''); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Tout effacer
                      </button>
                    </motion.div>
                  )}

                  {/* Tableau des transactions */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700">Date</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Téléphone</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Sens</th>
                            <th className="text-right p-2 font-semibold text-gray-700">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {walletLoading ? (
                            // Skeleton loading
                            [...Array(5)].map((_, i) => (
                              <tr key={i} className="border-b border-gray-100">
                                <td className="p-2"><div className="w-24 h-3 bg-gray-200 animate-pulse rounded"></div></td>
                                <td className="p-2"><div className="w-20 h-3 bg-gray-200 animate-pulse rounded"></div></td>
                                <td className="p-2 text-center"><div className="w-12 h-3 bg-gray-200 animate-pulse rounded mx-auto"></div></td>
                                <td className="p-2 text-right"><div className="w-16 h-3 bg-gray-200 animate-pulse rounded ml-auto"></div></td>
                              </tr>
                            ))
                          ) : filteredTransactions.length === 0 ? (
                            <tr className="border-b border-gray-100">
                              <td colSpan={4} className="text-center py-8 text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-3xl">{searchPhone.trim() ? '🔍' : '📭'}</span>
                                  <span>
                                    {searchPhone.trim()
                                      ? `Aucun résultat pour "${searchPhone}"`
                                      : transactionFilter === 'all'
                                        ? 'Aucune transaction pour le moment'
                                        : transactionFilter === 'recu'
                                          ? 'Aucune réception trouvée'
                                          : 'Aucun retrait trouvé'
                                    }
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredTransactions.map((transaction) => (
                              <tr
                                key={`${transaction.type}-${transaction.id}`}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                              >
                                <td className="p-2 text-gray-700">
                                  {formatDate(transaction.date)}
                                </td>
                                <td className="p-2 text-gray-600">
                                  {formatPhone(transaction.telephone)}
                                </td>
                                <td className="p-2 text-center">
                                  <span
                                    className={`
                                      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                                      ${transaction.sens === 'ENTREE'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                      }
                                    `}
                                  >
                                    {transaction.sens === 'ENTREE' ? '↓' : '↑'}
                                    {transaction.sens === 'ENTREE' ? 'Entrée' : 'Sortie'}
                                  </span>
                                </td>
                                <td className={`p-2 text-right font-semibold ${
                                  transaction.sens === 'ENTREE' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {transaction.sens === 'ENTREE' ? '+' : '-'}
                                  {formatCurrency(transaction.montant)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Nombre de transactions */}
                  {!walletLoading && filteredTransactions.length > 0 && (
                    <div className="text-center text-xs text-gray-500">
                      {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''}
                      {(transactionFilter !== 'all' || searchPhone.trim()) && ` (sur ${transactions.length} au total)`}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg text-sm transition-all"
                onClick={onClose}
              >
                Fermer
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
