/**
 * Composant principal avec onglets pour Factures et Paiements (Reçus)
 * Design glassmorphism avec animations fluides
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CreditCard, TrendingUp, Calendar } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface TabData {
  id: 'factures' | 'paiements';
  label: string;
  icon: React.ReactNode;
  count?: number;
  color: string;
}

interface FacturesOngletsProps {
  children?: React.ReactNode;
  facturesContent: React.ReactNode;
  paiementsContent: React.ReactNode;
  facturesCount?: number;
  paiementsCount?: number;
}

export function FacturesOnglets({
  facturesContent,
  paiementsContent,
  facturesCount = 0,
  paiementsCount = 0
}: FacturesOngletsProps) {
  const [activeTab, setActiveTab] = useState<'factures' | 'paiements'>('factures');
  const { isMobile } = useBreakpoint();

  const tabs: TabData[] = [
    {
      id: 'factures',
      label: 'Factures',
      icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" />,
      count: facturesCount,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'paiements',
      label: 'Paiements',
      icon: <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />,
      count: paiementsCount,
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Onglets avec design glassmorphism */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-2">
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  transition-all duration-300 font-medium
                  ${activeTab === tab.id
                    ? 'text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }
                `}
                whileHover={{ scale: activeTab !== tab.id ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Background animé pour l'onglet actif */}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.color} rounded-xl`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                {/* Contenu de l'onglet */}
                <div className="relative flex items-center gap-2">
                  {tab.icon}
                  <span className={`${isMobile ? 'text-sm' : 'text-base'}`}>
                    {tab.label}
                  </span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`
                        px-2 py-0.5 rounded-full text-xs font-bold
                        ${activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }
                      `}
                    >
                      {tab.count}
                    </motion.span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu des onglets avec animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'factures' ? facturesContent : paiementsContent}
        </motion.div>
      </AnimatePresence>

      {/* Indicateur de statut en bas (optionnel) */}
      <div className="flex justify-center mt-6">
        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>Dernière mise à jour</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}