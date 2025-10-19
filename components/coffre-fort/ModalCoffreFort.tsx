'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoffreFort } from '@/hooks/useCoffreFort';

interface ModalCoffreFortProps {
  isOpen: boolean;
  onClose: () => void;
  structureId: number;
}

type TabType = 'ca' | 'kalpe' | 'transactions';

export default function ModalCoffreFort({ isOpen, onClose, structureId }: ModalCoffreFortProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ca');
  const { data: coffreData, isLoading: coffreLoading } = useCoffreFort(structureId);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

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
                          formatCurrency(coffreData?.ca_total || 0)
                        )}
                      </motion.div>
                      <div className="text-xs opacity-90 mb-1">Chiffre d&apos;Affaires Total</div>
                      <div className="text-[10px] opacity-80 flex items-center justify-center gap-1">
                        <span>📊</span>
                        {coffreLoading ? (
                          <div className="w-12 h-2 bg-white/20 animate-pulse rounded"></div>
                        ) : (
                          <span>{coffreData?.nb_ventes || 0} ventes</span>
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
                          formatCurrency(coffreData?.details?.couts?.charges_exploitation || 0)
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
                          formatCurrency(coffreData?.details?.couts?.cout_achats_marchandises || 0)
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
                            formatCurrency(coffreData?.solde_net || 0)
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
                              formatCurrency(coffreData?.details?.rentabilite?.marge_brute || 0)
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
                              `${(coffreData?.details?.rentabilite?.taux_marge_nette || 0).toFixed(2)}%`
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Onglet KALPE */}
              {activeTab === 'kalpe' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* StatCard Orange Money */}
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 relative flex-shrink-0">
                        <Image
                          src="/images/om.png"
                          alt="Orange Money"
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Orange Money</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Solde disponible</div>
                      <div className="text-lg font-bold text-orange-600">
                        {/* TODO: Intégrer le vrai solde OM */}
                        0 FCFA
                      </div>
                    </div>
                  </div>

                  {/* StatCard Wave */}
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 relative flex-shrink-0">
                        <Image
                          src="/images/wave.png"
                          alt="Wave"
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Wave</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Solde disponible</div>
                      <div className="text-lg font-bold text-blue-600">
                        {/* TODO: Intégrer le vrai solde WAVE */}
                        0 FCFA
                      </div>
                    </div>
                  </div>

                  {/* Bouton Retrait */}
                  <button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                    <span>💸</span>
                    <span>Effectuer un Retrait</span>
                  </button>

                  {/* Note TODO */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">⚠️</span>
                      <div className="text-xs text-yellow-800">
                        <div className="font-semibold mb-1">Fonctionnalité en développement</div>
                        <div>Les soldes KALPE et le système de retrait seront implémentés prochainement.</div>
                      </div>
                    </div>
                  </div>
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
                  {/* StatCards Dépôts/Retraits */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 rounded-lg border-l-4 border-green-500 p-2.5">
                      <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                        <span>📥</span>
                        <span>Total Dépôts</span>
                      </div>
                      <div className="text-sm font-bold text-green-600">
                        {/* TODO: Intégrer total dépôts */}
                        0 FCFA
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg border-l-4 border-red-500 p-2.5">
                      <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                        <span>📤</span>
                        <span>Total Retraits</span>
                      </div>
                      <div className="text-sm font-bold text-red-600">
                        {/* TODO: Intégrer total retraits */}
                        0 FCFA
                      </div>
                    </div>
                  </div>

                  {/* Tableau des transactions */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700">Date</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Téléphone</th>
                            <th className="text-center p-2 font-semibold text-gray-700">Sens</th>
                            <th className="text-right p-2 font-semibold text-gray-700">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* TODO: Intégrer les vraies transactions */}
                          <tr className="border-b border-gray-100">
                            <td colSpan={4} className="text-center py-8 text-gray-400">
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-3xl">📭</span>
                                <span>Aucune transaction pour le moment</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Note TODO */}
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">ℹ️</span>
                      <div className="text-xs text-blue-800">
                        <div className="font-semibold mb-1">Historique à venir</div>
                        <div>L&apos;historique complet des transactions KALPE sera disponible prochainement.</div>
                      </div>
                    </div>
                  </div>
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
