'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Download, Smartphone, Shield, Zap, Wifi } from 'lucide-react';
import { useState, useEffect } from 'react';

interface InstallPromptModalProps {
  isOpen: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPromptModal({ isOpen, onInstall, onDismiss }: InstallPromptModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const features = [
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: "Accès rapide",
      description: "Icône sur votre écran d'accueil"
    },
    {
      icon: <Wifi className="w-5 h-5" />,
      title: "Mode hors ligne",
      description: "Consultez vos données sans connexion"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Plus rapide",
      description: "Performance optimisée"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Sécurisé",
      description: "Vos données sont protégées"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={onDismiss}
          />

          {/* Modal - Mobile First Responsive */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              y: isMobile ? 50 : 20
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: isMobile ? 50 : 20
            }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-x-4 bottom-4 pb-safe md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-x-auto md:bottom-auto md:w-[90%] md:max-w-md z-[9999]"
            style={{
              // Support des safe-areas pour iOS
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              paddingRight: 'max(1rem, env(safe-area-inset-right))'
            }}
          >
            <div className="bg-gradient-to-br from-white via-white to-blue-50/30 rounded-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] md:max-h-none overflow-y-auto backdrop-blur-md border border-white/20">
              {/* Header avec gradient - Responsive */}
              <div className="relative bg-gradient-to-r from-blue-600 to-orange-500 p-4 md:p-6 pb-6 md:pb-8">
                <button
                  onClick={onDismiss}
                  className="absolute top-3 right-3 md:top-4 md:right-4 text-white/80 hover:text-white transition-colors z-10"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>

                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="relative w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-lg flex-shrink-0">
                    <Image
                      src="/icon-192.png"
                      alt="FayClick"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg md:text-2xl font-bold text-white leading-tight">
                      Installer FayClick
                    </h2>
                    <p className="text-white/90 text-xs md:text-sm mt-0.5 md:mt-1">
                      La super app des marchands
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenu - Responsive */}
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {/* Message principal */}
                <div className="text-center">
                  <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                    Installez FayClick sur votre appareil pour une expérience optimale
                  </p>
                </div>

                {/* Features Grid - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-lg md:rounded-xl p-2.5 md:p-3"
                    >
                      <div className="flex items-center space-x-2.5 md:space-x-2">
                        <div className="text-blue-600 flex-shrink-0">
                          {feature.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs md:text-sm font-semibold text-gray-900 leading-tight">
                            {feature.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5 leading-tight">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Boutons d'action - Mobile optimized */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={onDismiss}
                    className="order-2 sm:order-1 px-4 py-3 md:py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm md:text-base"
                  >
                    Plus tard
                  </button>
                  <motion.button
                    onClick={onInstall}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="order-1 sm:order-2 px-4 py-3 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 text-sm md:text-base"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Installer maintenant</span>
                  </motion.button>
                </div>

                {/* Note de sécurité */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 md:p-3">
                  <p className="text-xs text-blue-800 text-center leading-relaxed">
                    Installation gratuite • Sans téléchargement • Données sécurisées
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}