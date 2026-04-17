'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogOut } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNotifications } from '@/hooks/useNotifications';
import MainMenu from '@/components/layout/MainMenu';
import { ModalDeconnexion } from '@/components/auth/ModalDeconnexion';
import { ModalNotifications } from '@/components/notifications/ModalNotifications';
import { formatAmount } from '@/utils/formatAmount';
import { User } from '@/types/auth';
import { useHasRight } from '@/hooks/useRights';
import { ModalFactureSuccess } from '@/components/panier/ModalFactureSuccess';
import { useToast } from '@/components/ui/Toast';
import ModalCoffreFort from '@/components/coffre-fort/ModalCoffreFort';
import { useSubscriptionStatus } from '@/contexts/AuthContext';
import { ModalAbonnementExpire, useModalAbonnementExpire } from '@/components/subscription/ModalAbonnementExpire';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import CommerceDashboardDesktop from '@/components/dashboard/CommerceDashboardDesktop';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/format-locale';
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';
import { PaymentDrawer } from '@/components/notifications/PaymentDrawer';


export default function CommerceDashboard() {
  const router = useRouter();
  const t = useTranslations('dashboardCommerce');
  const { locale } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showCoffreModal, setShowCoffreModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showValeurStock, setShowValeurStock] = useState(false);
  const { ToastComponent } = useToast();

  // Hook responsive pour switch mobile/desktop
  const { isDesktop, isDesktopLarge, isTablet } = useBreakpoint();
  const isDesktopView = isDesktop || isDesktopLarge;

  // Hook état abonnement pour bloquer les fonctionnalités si expiré
  const { canAccessFeature } = useSubscriptionStatus();

  // Hook pour le modal d'abonnement expiré
  const {
    isOpen: isAbonnementModalOpen,
    featureName: abonnementFeatureName,
    showModal: showAbonnementModal,
    hideModal: hideAbonnementModal
  } = useModalAbonnementExpire();

  // Hook pour charger les vraies données depuis l'API
  const {
    stats,
    statsCardData,
    isLoading: loadingStats
  } = useDashboardData(user?.id_structure || 0);

  // Droits utilisateur
  const canViewProducts = useHasRight("VOIR NOMBRE PRODUITS");
  const canViewStockValue = useHasRight("VOIR VALEUR STOCK PA");
  const canViewCA = useHasRight("VOIR CHIFFRE D'AFFAIRE");
  const canViewInventaire = useHasRight("VOIR INVENTAIRE");
  const canAddDepense = useHasRight("AJOUTER DEPENSE");
  const canViewTotalFactures = useHasRight("VOIR TOTAL FACTURES");
  const canManageSettings = useHasRight("GERER PARAMETRAGES");

  // Hook pour les notifications
  const {
    unreadCount: notificationCount,
    refresh: refreshNotifications
  } = useNotifications({
    userId: user?.id || 0,
    autoFetch: !!user?.id,
    refreshInterval: 60000
  });

  // Hook notifications paiements (poll 15s, drawer automatique)
  const {
    newPayments,
    hasNew,
    drawerOpen,
    setDrawerOpen,
    unreadCount: paymentUnreadCount,
    markAsRead: markPaymentAsRead,
  } = usePaymentNotifications({ userId: user?.id || 0 });

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
            {isAuthLoading ? t('sessionChecking') : t('loading')}
          </p>
        </div>
      </div>
    );
  }

  // Desktop / Tablette : afficher le dashboard desktop
  if (isDesktopView || isTablet) {
    return (
      <>
        <CommerceDashboardDesktop
          user={user}
          notificationCount={paymentUnreadCount || notificationCount}
          canViewCA={canViewCA}
          canAccessFeature={canAccessFeature}
          showAbonnementModal={showAbonnementModal}
          onShowCoffreModal={() => setShowCoffreModal(true)}
          onShowLogoutModal={() => setShowLogoutModal(true)}
          onShowNotificationsModal={() => setShowNotificationsModal(true)}
          onShowProfilModal={() => window.dispatchEvent(new Event('openProfileModal'))}
          isTablet={!isDesktopLarge}
          hasNewPayments={hasNew}
          onBellAlertClick={() => setDrawerOpen(true)}
        />

        {/* MainMenu (masque, monte pour ecouter openProfileModal) */}
        <MainMenu
          isOpen={false}
          onClose={() => {}}
          userName={user?.username}
          businessName={user?.nom_structure}
        />

        {/* Modals partages */}
        <ModalCoffreFort
          isOpen={showCoffreModal}
          onClose={() => setShowCoffreModal(false)}
          structureId={user?.id_structure || 0}
        />
        <ModalFactureSuccess />
        <ToastComponent />
        <ModalAbonnementExpire
          isOpen={isAbonnementModalOpen}
          onClose={hideAbonnementModal}
          featureName={abonnementFeatureName}
        />
        <ModalNotifications
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          userId={user?.id || 0}
        />
        <ModalDeconnexion
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => {
            authService.logout();
            router.push('/login');
          }}
          userName={user?.username}
        />
        {/* Drawer paiements reçus (desktop) */}
        <PaymentDrawer
          isOpen={drawerOpen}
          payments={newPayments}
          onClose={() => setDrawerOpen(false)}
          onMarkRead={markPaymentAsRead}
          onViewAll={() => { setDrawerOpen(false); setShowNotificationsModal(true); }}
        />
      </>
    );
  }

  // Mobile : dashboard existant (inchange)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      <div className="max-w-md mx-auto bg-white min-h-screen relative overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-[#18542e] to-[#16a34d] p-4 pb-3 text-white relative overflow-hidden"
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
          <div className="flex justify-between items-center mb-3 relative z-10">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
              onClick={() => setShowMenu(true)}
            >
              <span className="text-xl">☰</span>
            </motion.button>

            <div className="flex items-center gap-2">
              {/* Bouton Notifications — pulse orange si nouveaux paiements */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all relative ${
                  hasNew
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_0_16px_rgba(245,158,11,0.6)]'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
                onClick={() => hasNew ? setDrawerOpen(true) : setShowNotificationsModal(true)}
              >
                {hasNew && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-amber-400 opacity-40 animate-ping" />
                    <span className="absolute -inset-1 rounded-full border-2 border-amber-400/40 animate-ping [animation-delay:0.3s]" />
                  </>
                )}
                <span className="text-xl relative z-10">🔔</span>
                {(paymentUnreadCount > 0 || notificationCount > 0) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold z-10"
                  >
                    {(paymentUnreadCount || notificationCount) > 9 ? '9+' : (paymentUnreadCount || notificationCount)}
                  </motion.div>
                )}
              </motion.button>

              {/* Bouton Déconnexion */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-600/80 transition-all"
                onClick={() => setShowLogoutModal(true)}
                title={t('logoutTitle')}
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="text-center relative z-10">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm opacity-90 mb-1"
            >
              {t('welcome')}
            </motion.p>
            <motion.h1
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" as const }}
              className="text-xl font-bold mb-2"
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
              <span className="text-sm font-medium">{t('online')}</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-4 pb-24 bg-gradient-to-b from-[#ecfae5] to-[#1b5307] min-h-[calc(100vh-160px)] overflow-y-auto">
          {/* Stats Section - Réduit de 1/3 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-2 mb-3"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-xl p-3 shadow-md border-l-4 border-orange-500 cursor-pointer"
              onClick={() => router.push('/dashboard/commerce/produits')}
            >
              <span className="text-xl mb-1 block">📦</span>
              <div className="text-xl font-bold text-gray-800 mb-0.5">
                {!canViewProducts ? (
                  <span className="text-gray-400">---</span>
                ) : loadingStats ? (
                  <div className="w-10 h-6 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <AnimatedCounter value={statsCardData?.primaryCount || 0} />
                )}
              </div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">{t('stats.products')}</div>
              {canViewProducts && (
                <div className="text-xs text-green-600 mt-1 font-semibold">
                  {loadingStats ? (
                    <div className="w-14 h-3 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    t('stats.productsGrowth', { count: statsCardData?.primaryGrowth || 0 })
                  )}
                </div>
              )}
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-xl p-3 shadow-md border-l-4 border-green-500 cursor-pointer relative"
              onClick={() => {
                if (!canViewInventaire) return;
                if (!canAccessFeature(t('features.inventories'))) {
                  showAbonnementModal(t('features.inventoriesLong'));
                  return;
                }
                router.push('/dashboard/commerce/inventaire');
              }}
            >
              {canViewStockValue && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowValeurStock(!showValeurStock);
                  }}
                  className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
                  aria-label={showValeurStock ? t('stats.hideAmount') : t('stats.showAmount')}
                >
                  {showValeurStock ? (
                    <Eye className="w-4 h-4 text-gray-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}

              <span className="text-xl mb-1 block">💰</span>
              <div className="text-base font-bold text-gray-800 mb-0.5">
                {!canViewStockValue ? (
                  <span className="text-gray-400">---</span>
                ) : loadingStats ? (
                  <div className="w-10 h-5 bg-gray-200 animate-pulse rounded"></div>
                ) : showValeurStock ? (
                  formatCurrency(statsCardData?.totalAmount || 0, locale, { devise: 'FCFA' })
                ) : (
                  '••••••'
                )}
              </div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">{t('stats.stockValue')}</div>
              {canViewInventaire && (
                <div className="text-xs text-emerald-600 mt-1 font-semibold flex items-center justify-center gap-1">
                  <span>📊</span> {t('stats.viewInventories')}
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Bouton Vente Flash - Ultra compact */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (!canAccessFeature('Vente Flash')) {
                showAbonnementModal(t('features.venteFlash'));
                return;
              }
              router.push('/dashboard/commerce/venteflash');
            }}
            className="
              bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600
              rounded-xl p-2.5 cursor-pointer shadow-lg hover:shadow-xl
              transition-all border border-white/20 mb-3
              relative overflow-hidden
            "
          >
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px)',
                backgroundSize: '20px 20px'
              }} />
            </div>

            <div className="relative z-10 flex items-center gap-2.5">
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⚡
              </motion.span>
              <h3 className="text-sm font-bold text-white">{t('venteFlashTitle')}</h3>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '📦', title: t('cards.productsTitle'), subtitle: t('cards.productsSubtitle'), color: 'orange', path: '/produits', visible: true },
                { icon: '🧾', title: t('cards.invoicesTitle'), subtitle: t('cards.invoicesSubtitle'), color: 'purple', path: '/factures', visible: true },
                { icon: '👥', title: t('cards.clientsTitle'), subtitle: t('cards.clientsSubtitle'), color: 'blue', path: '/clients', visible: true },
                { icon: '💸', title: t('cards.expensesTitle'), subtitle: t('cards.expensesSubtitle'), color: 'red', path: '/depenses', visible: true }
              ].filter(a => a.visible).map((action, index) => (
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

            {/* Coffre-Fort Button - toujours visible, restrictions internes */}
            {(
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
                  <div className="text-sm font-bold text-gray-800 mb-0.5">{t('safe.title')}</div>
                  <div className="text-[10px] text-gray-600">{t('safe.subtitle')}</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Coffre Modal */}
        <ModalCoffreFort
          isOpen={showCoffreModal}
          onClose={() => setShowCoffreModal(false)}
          structureId={user?.id_structure || 0}
        />
      </div>

      {/* Modal Facture Success */}
      <ModalFactureSuccess />

      {/* Toast Component */}
      <ToastComponent />

      {/* Modal abonnement expiré */}
      <ModalAbonnementExpire
        isOpen={isAbonnementModalOpen}
        onClose={hideAbonnementModal}
        featureName={abonnementFeatureName}
      />

      {/* Menu principal */}
      <MainMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        userName={user?.username}
        businessName={user?.nom_structure}
      />

      {/* Modal Notifications */}
      <ModalNotifications
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        userId={user?.id || 0}
      />

      {/* Drawer paiements reçus */}
      <PaymentDrawer
        isOpen={drawerOpen}
        payments={newPayments}
        onClose={() => setDrawerOpen(false)}
        onMarkRead={markPaymentAsRead}
        onViewAll={() => { setDrawerOpen(false); setShowNotificationsModal(true); }}
      />

      {/* Modal Déconnexion */}
      <ModalDeconnexion
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          authService.logout();
          router.push('/login');
        }}
        userName={user?.username}
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
