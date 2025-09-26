/**
 * Modal pour choisir le mode de paiement (Cash, OM, Wave, Free)
 * Design glassmorphisme cohérent avec FayClick V2 - Version optimisée
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Banknote } from 'lucide-react';
import { PaymentMethod, formatAmount } from '@/types/payment-wallet';
import Image from 'next/image';

interface ModalChoixPaiementProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: PaymentMethod) => void;
  montantAcompte: number;
  nomClient: string;
}

export function ModalChoixPaiement({
  isOpen,
  onClose,
  onSelectMethod,
  montantAcompte,
  nomClient
}: ModalChoixPaiementProps) {

  const walletMethods: Array<{
    id: PaymentMethod;
    name: string;
    logo: string;
    color: string;
    bgGradient: string;
  }> = [
    {
      id: 'OM',
      name: 'Orange Money',
      logo: '/images/om.png',
      color: 'text-orange-600',
      bgGradient: 'from-orange-500/20 to-amber-500/20'
    },
    {
      id: 'WAVE',
      name: 'Wave',
      logo: '/images/wave.png',
      color: 'text-blue-600',
      bgGradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      id: 'FREE',
      name: 'Free Money',
      logo: '/images/free.png',
      color: 'text-green-600',
      bgGradient: 'from-green-600/20 to-teal-500/20'
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-3"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header compact */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Mode de Paiement
                  </h2>
                  <p className="text-white/80 text-sm">
                    Sélectionnez comment recevoir le paiement
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Montant et client compact */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Montant de l&apos;acompte</p>
              <p className="text-xl font-bold text-gray-900">
                {formatAmount(montantAcompte)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Client: <span className="font-medium">{nomClient}</span>
              </p>
            </div>
          </div>

          {/* Options de paiement optimisées */}
          <div className="p-4 space-y-3">
            {/* Mode Espèces - 1x1 (pleine largeur) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMethod('CASH')}
              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-green-400
                bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:shadow-lg
                transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <div className="text-green-600 group-hover:scale-110 transition-transform">
                  <Banknote className="w-8 h-8" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">
                    Espèces
                  </h3>
                  <p className="text-sm text-gray-600">
                    Paiement en liquide
                  </p>
                </div>
                <div className="text-gray-400 group-hover:text-green-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.button>

            {/* Wallets mobiles - Grille 3x1 */}
            <div className="grid grid-cols-3 gap-2">
              {walletMethods.map((method, index) => (
                <motion.button
                  key={method.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onSelectMethod(method.id)}
                  className={`p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400
                    bg-gradient-to-r ${method.bgGradient} hover:shadow-lg
                    transition-all duration-300 group flex flex-col items-center text-center`}
                >
                  <div className="mb-2 group-hover:scale-110 transition-transform">
                    <div className="w-12 h-12 relative bg-white rounded-lg p-1 shadow-sm">
                      <Image
                        src={method.logo}
                        alt={method.name}
                        fill
                        className="object-contain p-1"
                        sizes="48px"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-xs leading-tight">
                      {method.name}
                    </h3>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Footer avec note compact */}
          <div className="px-4 pb-4">
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Note:</span> Pour les paiements mobiles,
                le client devra scanner un QR code ou utiliser un lien de paiement.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}