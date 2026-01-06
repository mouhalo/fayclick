/**
 * Modal d'options d'ajout de produit
 * Offre 3 modes d'ajout : Manuel, Photo IA, Voix (à venir)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, PenTool, Camera, Mic, Sparkles } from 'lucide-react';

interface ModalOptionsAjoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManuel: () => void;
  onSelectPhoto: () => void;
  onSelectVoix?: () => void;
}

export function ModalOptionsAjout({
  isOpen,
  onClose,
  onSelectManuel,
  onSelectPhoto,
  onSelectVoix
}: ModalOptionsAjoutProps) {
  if (!isOpen) return null;

  const options = [
    {
      id: 'manuel',
      title: 'Ajout manuel',
      description: 'Saisissez les informations du produit',
      icon: PenTool,
      gradient: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      available: true,
      onClick: () => {
        onClose();
        onSelectManuel();
      }
    },
    {
      id: 'photo',
      title: 'Capture photo',
      description: 'Reconnaissance par intelligence artificielle',
      icon: Camera,
      gradient: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      badge: 'IA',
      badgeColor: 'bg-amber-400 text-amber-900',
      available: true,
      onClick: () => {
        onClose();
        onSelectPhoto();
      }
    },
    {
      id: 'voix',
      title: 'Ajout vocal',
      description: 'Dictez les informations du produit',
      icon: Mic,
      gradient: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      badge: 'Bientôt',
      badgeColor: 'bg-slate-300 text-slate-600',
      available: false,
      onClick: onSelectVoix
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="modal-options-ajout-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4"
        onClick={onClose}
      >
        <motion.div
          key="modal-options-ajout-content"
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          {/* Header - Compact sur mobile */}
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-3 sm:p-5 text-white relative overflow-hidden">
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }} />
            </div>

            <div className="relative z-10 flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Ajouter un produit</h3>
                  <p className="text-white/80 text-xs sm:text-sm">Choisissez votre méthode</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Options - Compact sur mobile */}
          <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
            {options.map((option, index) => {
              const Icon = option.icon;

              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={option.available ? option.onClick : undefined}
                  disabled={!option.available}
                  className={`w-full p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 flex items-center gap-2.5 sm:gap-4 text-left group ${
                    option.available
                      ? 'border-transparent hover:border-green-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-slate-50 hover:bg-white'
                      : 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-70'
                  }`}
                >
                  {/* Icône - Plus petite sur mobile */}
                  <div className={`relative w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl ${option.bgColor} flex items-center justify-center flex-shrink-0 ${
                    option.available ? 'group-hover:scale-110' : ''
                  } transition-transform`}>
                    <Icon className={`w-5 h-5 sm:w-7 sm:h-7 ${option.iconColor}`} />
                    {option.badge && (
                      <div className={`absolute -top-1 -right-1 px-1 sm:px-1.5 py-0.5 ${option.badgeColor} rounded-full text-[8px] sm:text-[10px] font-bold`}>
                        {option.badge}
                      </div>
                    )}
                  </div>

                  {/* Texte - Plus compact sur mobile */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm sm:text-base ${option.available ? 'text-slate-800' : 'text-slate-500'}`}>
                      {option.title}
                    </h4>
                    <p className={`text-xs sm:text-sm truncate ${option.available ? 'text-slate-500' : 'text-slate-400'}`}>
                      {option.description}
                    </p>
                  </div>

                  {/* Flèche - Plus petite sur mobile */}
                  {option.available && (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 group-hover:bg-green-100 flex items-center justify-center transition-colors flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 group-hover:text-green-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer - Compact sur mobile */}
          <div className="px-3 pb-3 sm:px-5 sm:pb-5">
            <button
              onClick={onClose}
              className="w-full py-2.5 sm:py-3 text-slate-500 text-sm sm:text-base font-medium hover:text-slate-700 transition-colors"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalOptionsAjout;
