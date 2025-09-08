'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useStructure } from '@/hooks/useStructure';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardData } from '@/hooks/useDashboardData';
import AuthGuard from '@/components/auth/AuthGuard';
import MainMenu from '@/components/layout/MainMenu';
import DashboardContainer from '@/components/layout/DashboardContainer';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsGrid from '@/components/dashboard/StatsGrid';
import StatsCard from '@/components/dashboard/StatsCard';
import { formatAmount } from '@/utils/formatAmount';

function ScolaireDashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { structure, isSchool } = useStructure();
  const { checks } = usePermissions();
  const [showMenu, setShowMenu] = useState(false);
  const [showFinancesModal, setShowFinancesModal] = useState(false);
  const [notifications, setNotifications] = useState(2);

  // Hook pour charger les vraies données depuis l'API
  const { 
    stats, 
    statsCardData, 
    financialData, 
    isLoading: loadingStats, 
    error: statsError, 
    refresh: refreshStats 
  } = useDashboardData(structure?.id_structure || 0);

  useEffect(() => {
    // Vérifier que l'utilisateur a accès à ce type de dashboard
    if (!isSchool) {
      console.log('⚠️ [SCOLAIRE] Type de structure incorrect, redirection vers dashboard général');
      router.push('/dashboard');
      return;
    }
    
    console.log('✅ [SCOLAIRE] Dashboard scolaire validé pour:', structure?.nom_structure);
  }, [isSchool, structure, router]);

  // Animation du compteur
  const AnimatedCounter = ({ value, duration = 1500 }: { value: number; duration?: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let startTime: number;
      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        setCount(Math.floor(progress * value));
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      
      return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <>{count}</>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount) + ' FCFA';
  };

  const handleNotifications = () => {
    setNotifications(0);
    alert('Notifications (2) :\n\n• Nouveau paiement : Classe CM2 - Aminata D.\n• Rappel : Échéance frais inscription CE1');
  };

  if (!user || !structure) {
    return null; // AuthGuard handles loading states
  }

  return (
    <DashboardContainer backgroundGradient="from-blue-600 via-blue-700 to-blue-800">
        <DashboardHeader
          title={structure.nom_structure}
          subtitle="Bienvenue,"
          gradient="from-blue-500 to-blue-600"
          onMenuClick={() => setShowMenu(true)}
          onNotificationClick={handleNotifications}
          notificationCount={notifications}
        />

        {/* Content */}
        <div className="p-5 pb-24 bg-gradient-to-b from-blue-50 to-blue-100 min-h-[calc(100vh-180px)] overflow-y-auto lg:p-8 lg:pb-32">
          {/* Stats Section */}
          <StatsGrid>
            <StatsCard
              icon="👨‍🎓"
              value={<AnimatedCounter value={statsCardData?.primaryCount || 0} />}
              label="Élèves"
              sublabel={`+${statsCardData?.primaryGrowth || 0} ce trimestre`}
              borderColor="border-blue-500"
              onClick={() => router.push('/dashboard/scolaire/students')}
              isLoading={loadingStats}
            />

            <StatsCard
              icon="💰"
              value={formatAmount(statsCardData?.totalAmount || 0)}
              label="Total Factures"
              sublabel="FCFA"
              borderColor="border-green-500"
              onClick={() => setShowFinancesModal(true)}
              isLoading={loadingStats}
            />

            <StatsCard
              icon="✅"
              value={formatAmount(statsCardData?.totalPaid || 0)}
              label="Payées"
              sublabel={
                <span className="text-green-600">
                  {`${statsCardData?.recoveryRate || 0}% recouvré`}
                </span>
              }
              borderColor="border-green-500"
              onClick={() => setShowFinancesModal(true)}
              isLoading={loadingStats}
            />

            <StatsCard
              icon="❌"
              value={formatAmount(statsCardData?.totalUnpaid || 0)}
              label="Impayées"
              sublabel={
                <span className="text-red-600">
                  {`${Math.round((statsCardData?.totalUnpaid || 0) / (statsCardData?.totalAmount || 1) * 100)}% du total`}
                </span>
              }
              borderColor="border-red-500"
              onClick={() => router.push('/dashboard/scolaire/unpaid')}
              isLoading={loadingStats}
            />
          </StatsGrid>

          {/* Quick Actions */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-md flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h2 className="text-lg font-bold text-gray-800">Gestion Scolaire</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🏫', title: 'Ma Structure', subtitle: 'Configuration & utilisateurs', color: 'blue', path: '/structure/gestion' },
                { icon: '📚', title: 'Mes Données', subtitle: 'Élèves & services', color: 'orange', path: '/data' },
                { icon: '📄', title: 'Mes Factures', subtitle: 'Édition & recherche', color: 'green', path: '/invoices' },
                { icon: '💼', title: 'Mes Finances', subtitle: 'Solde & reversements', color: 'purple', path: '/finance' }
              ].map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-gradient-to-br ${
                    action.color === 'blue' ? 'from-blue-50 to-blue-100' :
                    action.color === 'orange' ? 'from-orange-50 to-orange-100' :
                    action.color === 'green' ? 'from-green-50 to-green-100' :
                    'from-purple-50 to-purple-100'
                  } rounded-2xl p-5 text-center cursor-pointer shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-${action.color}-200 relative overflow-hidden`}
                  onClick={() => {
                    // Gestion spéciale pour "Ma Structure" qui pointe vers une route absolue
                    if (action.path === '/structure/gestion') {
                      router.push(action.path);
                    } else {
                      router.push(`/dashboard/scolaire${action.path}`);
                    }
                  }}
                >
                  <div className="relative z-10">
                    <span className="text-4xl mb-3 block">{action.icon}</span>
                    <div className="text-sm font-bold text-gray-800 mb-1">{action.title}</div>
                    <div className="text-xs text-gray-600">{action.subtitle}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Finances Modal */}
        <AnimatePresence>
          {showFinancesModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowFinancesModal(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={{ type: "spring" as const, damping: 25 }}
                className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 text-white text-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                      backgroundSize: '15px 15px',
                      animation: 'sparkle 15s linear infinite'
                    }} />
                  </div>
                  <div className="relative z-10">
                    <span className="text-5xl mb-3 block">🏫</span>
                    <h3 className="text-xl font-bold mb-1">Finances Scolaires</h3>
                    <p className="text-sm opacity-90">Situation financière de l&apos;établissement</p>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  {/* Revenue Display */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-5 text-center mb-5 relative overflow-hidden">
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
                        className="text-3xl font-bold mb-1"
                      >
                        {loadingStats ? (
                          <div className="w-32 h-8 bg-white/20 animate-pulse rounded mx-auto"></div>
                        ) : (
                          formatCurrency(financialData?.totalRevenues || 0)
                        )}
                      </motion.div>
                      <div className="text-sm opacity-90">Revenus Totaux de l&apos;École</div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="space-y-3">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-l-4 border-green-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <span className="font-semibold text-gray-700">Factures Encaissées</span>
                      </div>
                      <div className="font-bold text-green-600">
                        {loadingStats ? (
                          <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          formatCurrency(financialData?.totalInvoices || 0)
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-l-4 border-red-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <span className="font-semibold text-gray-700">Charges & Frais</span>
                      </div>
                      <div className="font-bold text-red-600">
                        {loadingStats ? (
                          <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          formatCurrency(financialData?.totalCharges || 0)
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💎</span>
                        <span className="font-semibold text-gray-700">Solde Net</span>
                      </div>
                      <div className="font-bold text-blue-600">
                        {loadingStats ? (
                          <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          formatCurrency(financialData?.soldeNet || 0)
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Close Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
                    onClick={() => setShowFinancesModal(false)}
                  >
                    Fermer
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu principal */}
        <MainMenu
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          userName={user?.username}
          businessName={structure?.nom_structure}
        />

        <style jsx global>{`
          @keyframes sparkle {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
          }
        `}</style>
    </DashboardContainer>
  );
}

export default function ScolaireDashboard() {
  return (
    <AuthGuard>
      <ScolaireDashboardContent />
    </AuthGuard>
  );
}
