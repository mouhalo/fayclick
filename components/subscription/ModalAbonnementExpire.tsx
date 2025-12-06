/**
 * Modal Abonnement Expiré - Composant réutilisable
 * Affiche un modal élégant invitant l'utilisateur à renouveler son abonnement
 * Design responsive et centré pour tous les écrans
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Lock,
  ArrowRight,
  X,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface ModalAbonnementExpireProps {
  /** Contrôle l'affichage du modal */
  isOpen: boolean;
  /** Callback pour fermer le modal */
  onClose: () => void;
  /** Nom de la fonctionnalité bloquée (optionnel) */
  featureName?: string;
  /** Message personnalisé (optionnel) */
  customMessage?: string;
  /** Callback après clic sur renouveler (optionnel) */
  onRenew?: () => void;
}

export function ModalAbonnementExpire({
  isOpen,
  onClose,
  featureName,
  customMessage,
  onRenew
}: ModalAbonnementExpireProps) {
  const router = useRouter();

  const handleRenew = () => {
    onClose();
    if (onRenew) {
      onRenew();
    } else {
      router.push('/settings?tab=subscription');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal Container - Centré */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300
              }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec gradient */}
              <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 pt-8 pb-16 px-6">
                {/* Bouton fermer */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Icône centrale avec animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="relative">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Lock className="w-10 h-10 text-white" />
                    </div>
                    {/* Badge alerte */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <AlertTriangle className="w-4 h-4 text-yellow-800" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Titre */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-white text-center mt-4"
                >
                  Abonnement expiré
                </motion.h2>
              </div>

              {/* Contenu */}
              <div className="relative px-6 pb-6 -mt-8">
                {/* Carte message */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
                >
                  <p className="text-gray-700 text-center leading-relaxed">
                    {customMessage || (
                      <>
                        {featureName ? (
                          <>
                            La fonctionnalité <span className="font-semibold text-gray-900">"{featureName}"</span> nécessite un abonnement actif.
                          </>
                        ) : (
                          <>Cette fonctionnalité nécessite un abonnement actif.</>
                        )}
                        <br />
                        <span className="text-sm text-gray-500 mt-2 block">
                          Renouvelez votre abonnement pour continuer à profiter de toutes les fonctionnalités de FayClick.
                        </span>
                      </>
                    )}
                  </p>
                </motion.div>

                {/* Avantages rapides */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500"
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Accès complet</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-300 rounded-full" />
                  <div className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Sans interruption</span>
                  </div>
                </motion.div>

                {/* Boutons d'action */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 space-y-3"
                >
                  {/* Bouton principal - Renouveler */}
                  <button
                    onClick={handleRenew}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 via-blue-600 to-sky-500 hover:from-blue-600 hover:via-blue-700 hover:to-sky-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group"
                  >
                    <Crown className="w-5 h-5" />
                    <span>Renouveler mon abonnement</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Bouton secondaire - Plus tard */}
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors"
                  >
                    Peut-être plus tard
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook pour gérer l'affichage du modal d'abonnement expiré
 * Facilite l'intégration dans les composants
 */
import { useState, useCallback } from 'react';

export function useModalAbonnementExpire() {
  const [isOpen, setIsOpen] = useState(false);
  const [featureName, setFeatureName] = useState<string | undefined>();
  const [customMessage, setCustomMessage] = useState<string | undefined>();

  const showModal = useCallback((feature?: string, message?: string) => {
    setFeatureName(feature);
    setCustomMessage(message);
    setIsOpen(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsOpen(false);
    setFeatureName(undefined);
    setCustomMessage(undefined);
  }, []);

  return {
    isOpen,
    featureName,
    customMessage,
    showModal,
    hideModal
  };
}
