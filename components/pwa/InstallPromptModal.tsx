'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Download, Smartphone, Shield, Zap, Wifi } from 'lucide-react';

interface InstallPromptModalProps {
  isOpen: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPromptModal({ isOpen, onInstall, onDismiss }: InstallPromptModalProps) {
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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-[9999]"
          >
            <div className="bg-gradient-to-br from-white via-white to-blue-50/30 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header avec gradient */}
              <div className="relative bg-gradient-to-r from-blue-600 to-orange-500 p-6 pb-8">
                <button
                  onClick={onDismiss}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex items-center space-x-4">
                  <div className="relative w-16 h-16 bg-white rounded-2xl p-2 shadow-lg">
                    <Image
                      src="/icon-192.png"
                      alt="FayClick"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Installer FayClick
                    </h2>
                    <p className="text-white/90 text-sm mt-1">
                      La super app des marchands
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenu */}
              <div className="p-6 space-y-6">
                {/* Message principal */}
                <div className="text-center">
                  <p className="text-gray-700">
                    Installez FayClick sur votre appareil pour une expérience optimale
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-xl p-3"
                    >
                      <div className="flex items-start space-x-2">
                        <div className="text-blue-600 mt-0.5">
                          {feature.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {feature.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Boutons d'action */}
                <div className="flex space-x-3">
                  <button
                    onClick={onDismiss}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Plus tard
                  </button>
                  <motion.button
                    onClick={onInstall}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Installer</span>
                  </motion.button>
                </div>

                {/* Note de sécurité */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-800 text-center">
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