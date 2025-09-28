/**
 * Modal de confirmation de paiement simplifié
 * Design minimaliste et responsif pour tous les écrans
 * Format compact selon les spécifications UX FayClick V2
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  DollarSign,
  Smartphone,
  X,
  Clock
} from 'lucide-react';
import { PaymentMethod } from '@/types/payment-wallet';
import { FactureComplete } from '@/types/facture';
import Image from 'next/image';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ModalConfirmationPaiementProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  facture: FactureComplete | null;
  montantAcompte: number;
  paymentMethod: PaymentMethod;
  disabled?: boolean;
}

export function ModalConfirmationPaiement({
  isOpen,
  onClose,
  onConfirm,
  facture,
  montantAcompte,
  paymentMethod,
  disabled = false
}: ModalConfirmationPaiementProps) {
  const { isMobile } = useBreakpoint();

  // Configuration simplifiée des méthodes de paiement
  const getPaymentMethodInfo = (method: PaymentMethod) => {
    const configs = {
      'CASH': {
        name: 'Espèces',
        description: 'Paiement en liquide',
        icon: <DollarSign className="w-5 h-5" />,
        bgColor: 'bg-green-500',
        processingTime: 'Immédiat',
        logo: null
      },
      'OM': {
        name: 'Orange Money',
        description: 'Paiement mobile sécurisé',
        icon: <Smartphone className="w-5 h-5" />,
        bgColor: 'bg-orange-500',
        processingTime: '1-2 minutes',
        logo: '/images/om.png'
      },
      'WAVE': {
        name: 'Wave',
        description: 'Transfert d\'argent mobile',
        icon: <Smartphone className="w-5 h-5" />,
        bgColor: 'bg-blue-500',
        processingTime: '1-2 minutes',
        logo: '/images/wave.png'
      },
      'FREE': {
        name: 'Free Money',
        description: 'Service de paiement mobile',
        icon: <Smartphone className="w-5 h-5" />,
        bgColor: 'bg-green-600',
        processingTime: '1-2 minutes',
        logo: '/images/free.png'
      }
    };
    return configs[method];
  };

  const methodInfo = getPaymentMethodInfo(paymentMethod);

  if (!isOpen || !facture || !methodInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && !disabled && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
          className={`
            w-full bg-white rounded-2xl shadow-2xl overflow-hidden
            ${isMobile ? 'max-w-sm mx-2' : 'max-w-md'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header simplifié */}
          <div className="bg-green-500 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div>
                  <h2 className={`font-bold text-white ${
                    isMobile ? 'text-base' : 'text-lg'
                  }`}>
                    Confirmer le paiement
                  </h2>
                  <p className="text-white/90 text-xs">
                    Vérifiez les détails avant de procéder
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={disabled}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Contenu principal simplifié */}
          <div className={`${isMobile ? 'p-4' : 'p-5'} space-y-4`}>

            {/* Détails minimaux de la facture */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Détails de la facture</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">N° Facture:</span>
                <span className="font-medium text-sm">{facture.facture.num_facture}</span>
              </div>
            </div>

            {/* Section paiement compact */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Paiement à effectuer</h3>

              {/* Mode de paiement compact */}
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-10 h-10 ${methodInfo.bgColor} rounded-lg flex items-center justify-center`}>
                  {methodInfo.logo ? (
                    <div className="w-6 h-6 relative bg-white rounded p-0.5">
                      <Image
                        src={methodInfo.logo}
                        alt={methodInfo.name}
                        fill
                        className="object-contain"
                        sizes="24px"
                      />
                    </div>
                  ) : (
                    <div className="text-white">
                      {methodInfo.icon}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{methodInfo.name}</p>
                  <p className="text-xs text-gray-600">{methodInfo.description}</p>
                </div>
              </div>

              {/* Montant en valeur */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 text-sm">Montant:</span>
                <span className="font-bold text-lg text-blue-600">
                  {montantAcompte.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {/* Timing compact */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Temps de traitement:</span>
                <span className="font-medium flex items-center text-sm">
                  <Clock className="w-3 h-3 mr-1" />
                  {methodInfo.processingTime}
                </span>
              </div>
            </div>
          </div>

          {/* Actions compactes */}
          <div className={`bg-gray-50 ${isMobile ? 'px-4 py-3' : 'px-5 py-4'}`}>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={disabled}
                className={`
                  flex-1 bg-white text-gray-700 border border-gray-300 rounded-xl
                  ${isMobile ? 'py-2.5 px-3 text-sm' : 'py-3 px-4 text-base'}
                  hover:bg-gray-50 transition-colors font-medium disabled:opacity-50
                `}
              >
                Annuler
              </button>

              <button
                onClick={onConfirm}
                disabled={disabled}
                className={`
                  flex-1 bg-green-500 text-white rounded-xl
                  ${isMobile ? 'py-2.5 px-3 text-sm' : 'py-3 px-4 text-base'}
                  hover:bg-green-600 hover:shadow-lg transition-all font-medium disabled:opacity-50
                  flex items-center justify-center space-x-2
                `}
              >
                {disabled ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Confirmer le paiement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}