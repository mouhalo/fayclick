/**
 * Modal pour choisir le mode de paiement (Cash, OM, Wave, Free)
 * Design glassmorphisme cohérent avec FayClick V2
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Banknote, Smartphone } from 'lucide-react';
import { PaymentMethod, WALLET_CONFIG, formatAmount } from '@/types/payment-wallet';

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

  const paymentMethods: Array<{
    id: PaymentMethod;
    name: string;
    description: string;
    icon: JSX.Element;
    color: string;
    bgGradient: string;
  }> = [
    {
      id: 'CASH',
      name: 'Espèces',
      description: 'Paiement en liquide',
      icon: <Banknote className="w-8 h-8" />,
      color: 'text-green-600',
      bgGradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
      id: 'OM',
      name: 'Orange Money',
      description: 'Paiement mobile Orange',
      icon: <div className="text-3xl">🟠</div>,
      color: 'text-orange-600',
      bgGradient: 'from-orange-500/20 to-amber-500/20'
    },
    {
      id: 'WAVE',
      name: 'Wave',
      description: 'Paiement mobile Wave',
      icon: <div className="text-3xl">🌊</div>,
      color: 'text-blue-600',
      bgGradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      id: 'FREE',
      name: 'Free Money',
      description: 'Paiement mobile Free',
      icon: <div className="text-3xl">💚</div>,
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Mode de Paiement
                  </h2>
                  <p className="text-white/80 text-sm">
                    Sélectionnez comment recevoir le paiement
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Montant et client */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Montant de l'acompte</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatAmount(montantAcompte)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Client: <span className="font-medium">{nomClient}</span>
              </p>
            </div>
          </div>

          {/* Options de paiement */}
          <div className="p-6 space-y-3">
            {paymentMethods.map((method) => (
              <motion.button
                key={method.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectMethod(method.id)}
                className={`w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400
                  bg-gradient-to-r ${method.bgGradient} hover:shadow-lg
                  transition-all duration-300 group`}
              >
                <div className="flex items-center gap-4">
                  <div className={`${method.color} group-hover:scale-110 transition-transform`}>
                    {method.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">
                      {method.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {method.description}
                    </p>
                  </div>
                  <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Footer avec note */}
          <div className="px-6 pb-6">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
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