'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authService } from '@/services/auth.service';
import { useDashboardData } from '@/hooks/useDashboardData';
import MainMenu from '@/components/layout/MainMenu';
import { formatAmount } from '@/utils/formatAmount';
import { User } from '@/types/auth';
import { StatusBarPanier } from '@/components/panier/StatusBarPanier';
import { ModalPanier } from '@/components/panier/ModalPanier';
import { ModalFactureSuccess } from '@/components/panier/ModalFactureSuccess';
import { useToast } from '@/components/ui/Toast';
import ModalCoffreFort from '@/components/coffre-fort/ModalCoffreFort';


export default function CommerceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showCoffreModal, setShowCoffreModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const { ToastComponent } = useToast();

  // Hook pour charger les vraies données depuis l'API
  const {
    stats,
    statsCardData,
    isLoading: loadingStats
  } = useDashboardData(user?.id_structure || 0);

  useEffect(() => {
    // Attendre que le composant soit monté côté client avant de vérifier localStorage
    const checkAuthentication = () => {
      // Vérifier l'authentification
      if (!authService.isAuthenticated()) {
        console.log('❌ [COMMERCE] Utilisateur non authentifié, redirection vers login');
        setIsAuthLoading(false);
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      console.log('👤 [COMMERCE] Données utilisateur:', userData?.type_structure, userData?.nom_structure);
      
      if (!userData || userData.type_structure !== 'COMMERCIALE') {
        console.log('⚠️ [COMMERCE] Type de structure incorrect, redirection vers dashboard général');
        setIsAuthLoading(false);
        router.push('/dashboard');
        return;
      }
      
      console.log('✅ [COMMERCE] Authentification validée pour:', userData.nom_structure);
      setUser(userData);
      setIsAuthLoading(false);
    };

    // Attendre un tick pour s'assurer que localStorage est accessible
    const timer = setTimeout(checkAuthentication, 100);
    
    return () => clearTimeout(timer);
  }, [router]);

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

  const handleNotifications = () => {
    setNotifications(0);
    alert('Notifications (3) :\n\n• Nouvelle commande de Fatou K.\n• Rappel : Stock faible pour "Riz parfumé"\n• Paiement Orange Money reçu : 15,000 FCFA');
  };

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-200">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-30"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-black text-white">FC</span>
            </div>
          </div>
          <p className="text-white text-lg font-medium animate-pulse">
            {isAuthLoading ? 'Vérification de la session...' : 'Chargement...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      <div className="max-w-md mx-auto bg-white min-h-screen relative overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-[#18542e] to-[#16a34d] p-5 text-white relative overflow-hidden"
        >
          {/* Pattern Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 2px, transparent 2px)',
              backgroundSize: '25px 25px',
              animation: 'sparkle 20s linear infinite'
            }} />
          </div>

          {/* Header Top */}
          <div className="flex justify-between items-center mb-5 relative z-10">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
              onClick={() => setShowMenu(true)}
            >
              <span className="text-xl">☰</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all relative"
              onClick={handleNotifications}
            >
              <span className="text-xl">🔔</span>
              {notifications > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
                >
                  {notifications}
                </motion.div>
              )}
            </motion.button>
          </div>

          {/* Welcome Section */}
          <div className="text-center relative z-10">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base opacity-90 mb-2"
            >
              Bon retour,
            </motion.p>
            <motion.h1
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" as const }}
              className="text-2xl font-bold mb-4"
            >
              {user.nom_structure}
            </motion.h1>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
            >
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
              <span className="text-sm font-medium">En ligne</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-5 pb-24 bg-gradient-to-b from-[#ecfae5] to-[#1b5307] min-h-[calc(100vh-180px)] overflow-y-auto">
          {/* Stats Section - Réduit de 1/3 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-xl p-3 shadow-md border-l-4 border-orange-500 cursor-pointer"
              onClick={() => router.push('/dashboard/commerce/produits')}
            >
              <span className="text-2xl mb-2 block">📦</span>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {loadingStats ? (
                  <div className="w-10 h-6 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <AnimatedCounter value={statsCardData?.primaryCount || 0} />
                )}
              </div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Produits</div>
              <div className="text-xs text-green-600 mt-1 font-semibold">
                {loadingStats ? (
                  <div className="w-14 h-3 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  `+${statsCardData?.primaryGrowth || 0} cette semaine`
                )}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-xl p-3 shadow-md border-l-4 border-green-500 cursor-pointer"
              onClick={() => router.push('/dashboard/commerce/inventaire')}
            >
              <span className="text-2xl mb-2 block">💰</span>
              <div className="text-lg font-bold text-gray-800 mb-1">
                {loadingStats ? (
                  <div className="w-10 h-5 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  formatAmount(statsCardData?.totalAmount || 0)
                )}
              </div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Valeur Stock</div>
              <div className="text-xs text-emerald-600 mt-1 font-semibold flex items-center justify-center gap-1">
                <span>📊</span> Voir Inventaires
              </div>
            </motion.div>
          </motion.div>

          {/* Clients info section */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-4 mb-4 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-xl font-bold text-gray-800">
                    {loadingStats ? (
                      <div className="w-8 h-5 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      <AnimatedCounter value={stats?.total_clients || 0} />
                    )}
                  </div>
                  <div className="text-xs text-gray-600 font-semibold uppercase">Clients actifs</div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg font-semibold"
                onClick={() => router.push('/dashboard/commerce/clients')}
              >
                Voir tous
              </motion.button>
            </div>
          </motion.div>

          {/* Bouton Vente Flash - Hauteur réduite */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/commerce/venteflash')}
            className="
              bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600
              rounded-2xl p-4 cursor-pointer shadow-xl hover:shadow-2xl
              transition-all border-2 border-white/20 mb-4
              relative overflow-hidden
            "
          >
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px)',
                backgroundSize: '30px 30px'
              }} />
            </div>

            <div className="relative z-10 flex items-center gap-4">
              <motion.span
                className="text-4xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⚡
              </motion.span>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-white mb-0.5">Vente Flash</h3>
                <p className="text-xs text-white/90">
                  Scan code-barre • Recherche rapide • Vente instantanée
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions - Réduit de 1/3 */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="bg-white rounded-xl p-3 mb-3 shadow-md flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h2 className="text-base font-bold text-gray-800">Actions rapides</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '📦', title: 'Liste Produits', subtitle: 'Gérer votre stock', color: 'orange', path: '/produits' },
                { icon: '🧾', title: 'Mes Factures', subtitle: 'Gestion des factures', color: 'purple', path: '/factures' },
                { icon: '👥', title: 'Liste Clients', subtitle: "Carnet d'adresses", color: 'blue', path: '/clients' },
                { icon: '💸', title: 'Liste Dépenses', subtitle: 'Gérer les dépenses', color: 'red', path: '/depenses' }
              ].map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.0 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-gradient-to-br ${
                    action.color === 'orange' ? 'from-orange-50 to-orange-100' :
                    action.color === 'purple' ? 'from-purple-50 to-purple-100' :
                    action.color === 'blue' ? 'from-blue-50 to-blue-100' :
                    action.color === 'red' ? 'from-red-50 to-red-100' :
                    'from-amber-50 to-amber-100'
                  } rounded-xl p-3 text-center cursor-pointer shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-${action.color}-200 relative overflow-hidden`}
                  onClick={() => router.push(`/dashboard/commerce${action.path}`)}
                >
                  <div className="relative z-10">
                    <span className="text-3xl mb-2 block">{action.icon}</span>
                    <div className="text-xs font-bold text-gray-800 mb-0.5">{action.title}</div>
                    <div className="text-[10px] text-gray-600">{action.subtitle}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Coffre-Fort Button - Réduit de 1/3 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl p-3 cursor-pointer shadow-lg hover:shadow-xl transition-all"
              onClick={() => setShowCoffreModal(true)}
            >
              <div className="text-center">
                <span className="text-3xl mb-2 block">🏦</span>
                <div className="text-sm font-bold text-gray-800 mb-0.5">Coffre-Fort</div>
                <div className="text-[10px] text-gray-600">CA réel, ventes, charges & solde</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Coffre Modal */}
        <ModalCoffreFort
          isOpen={showCoffreModal}
          onClose={() => setShowCoffreModal(false)}
          structureId={user?.id_structure || 0}
        />
      </div>

      {/* StatusBar Panier - fixe en bas */}
      <StatusBarPanier />

      {/* Modal Panier */}
      <ModalPanier />

      {/* Modal Facture Success */}
      <ModalFactureSuccess />

      {/* Toast Component */}
      <ToastComponent />

      {/* Menu principal */}
      <MainMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        userName={user?.username}
        businessName={user?.nom_structure}
      />

      <style jsx global>{`
        @keyframes sparkle {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  );
}
