'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Notification pour demander à l'utilisateur de changer son mot de passe
 * S'affiche si pwd_changed === false après connexion
 */
export default function PasswordChangeNotification() {
  const { user, isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté et n'a pas changé son mot de passe
    if (isAuthenticated && user && user.pwd_changed === false && !isDismissed) {
      // Petit délai pour laisser la page se charger
      const timer = setTimeout(() => {
        setIsVisible(true);
        console.log('⚠️ [PWD NOTIFICATION] Utilisateur doit changer son mot de passe:', user.login);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isAuthenticated, user, isDismissed]);

  const handleGoToProfile = () => {
    setIsVisible(false);
    // Dispatcher un événement pour ouvrir le modal de profil
    window.dispatchEvent(new CustomEvent('openProfileModal'));
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 inset-x-0 mx-auto z-[9999] w-[90%] max-w-md"
        >
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-2xl shadow-orange-500/30 overflow-hidden">
            {/* Barre de progression animée */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 15, ease: 'linear' }}
              className="h-1 bg-white/30"
            />

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icône */}
                <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <h3 className="text-white font-bold text-sm">
                      Sécurité du compte
                    </h3>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Vous utilisez encore votre mot de passe initial.
                    Pour la sécurité de votre compte, veuillez le modifier.
                  </p>

                  {/* Boutons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleGoToProfile}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors text-sm"
                    >
                      Modifier maintenant
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 text-white/80 hover:text-white text-sm transition-colors"
                    >
                      Plus tard
                    </button>
                  </div>
                </div>

                {/* Bouton fermer */}
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
