/**
 * Composant de sélection de mode de paiement intégré
 * Design responsive pour l'intégration dans les modals de paiement
 * Optimisé mobile-first avec support des wallets sénégalais
 */

'use client';

import { motion } from 'framer-motion';
import { Banknote, Smartphone } from 'lucide-react';
import { PaymentMethod } from '@/types/payment-wallet';
import Image from 'next/image';

interface PaymentMethodSelectorProps {
  onMethodAction: (method: PaymentMethod) => void; // Action directe pour chaque méthode
  onCancel: () => void; // Bouton annuler
  availableMethods?: PaymentMethod[];
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  montant?: number; // Pour afficher le montant dans les boutons
}

interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  shortName: string;
  logo?: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  borderColor: string;
}

export function PaymentMethodSelector({
  onMethodAction,
  onCancel,
  availableMethods = ['CASH', 'OM', 'WAVE', 'FREE'],
  size = 'md',
  disabled = false,
  montant = 0
}: PaymentMethodSelectorProps) {

  // Configuration des méthodes de paiement
  const paymentMethods: PaymentMethodConfig[] = [
    {
      id: 'CASH',
      name: 'Espèces',
      shortName: 'Cash',
      icon: <Banknote className="w-5 h-5" />,
      color: 'text-green-700',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200 hover:border-green-400'
    },
    {
      id: 'OM',
      name: 'Orange Money',
      shortName: 'OM',
      logo: '/images/om.png',
      icon: <Smartphone className="w-5 h-5" />,
      color: 'text-orange-700',
      bgGradient: 'from-orange-50 to-amber-50',
      borderColor: 'border-orange-200 hover:border-orange-400'
    },
    {
      id: 'WAVE',
      name: 'Wave',
      shortName: 'Wave',
      logo: '/images/wave.png',
      icon: <Smartphone className="w-5 h-5" />,
      color: 'text-blue-700',
      bgGradient: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200 hover:border-blue-400'
    },
    {
      id: 'FREE',
      name: 'Free Money',
      shortName: 'Free',
      logo: '/images/free.png',
      icon: <Smartphone className="w-5 h-5" />,
      color: 'text-green-700',
      bgGradient: 'from-green-50 to-teal-50',
      borderColor: 'border-green-200 hover:border-green-400'
    }
  ];

  // Formater le montant pour affichage
  const formatMontant = (amount: number) => {
    return amount > 0 ? `${amount.toLocaleString('fr-FR')} FCFA` : '';
  };

  // Filtrer les méthodes disponibles et séparer Cash des wallets
  const filteredMethods = paymentMethods.filter(method =>
    availableMethods.includes(method.id)
  );

  const cashMethod = filteredMethods.find(method => method.id === 'CASH');
  const walletMethods = filteredMethods.filter(method => method.id !== 'CASH');

  // Styles selon la taille
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'p-3',
          icon: 'w-4 h-4',
          text: 'text-xs',
          logo: 'w-6 h-6',
          title: 'text-sm'
        };
      case 'lg':
        return {
          button: 'p-5',
          icon: 'w-6 h-6',
          text: 'text-base',
          logo: 'w-10 h-10',
          title: 'text-lg'
        };
      default: // md
        return {
          button: 'p-4',
          icon: 'w-5 h-5',
          text: 'text-sm',
          logo: 'w-8 h-8',
          title: 'text-base'
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Créer un bouton d'action pour chaque méthode
  const createActionButton = (method: PaymentMethodConfig, isMainAction = false) => (
    <motion.button
      key={method.id}
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={() => !disabled && onMethodAction(method.id)}
      disabled={disabled}
      className={`
        relative ${sizeStyles.button} rounded-xl border-2
        bg-gradient-to-br ${method.bgGradient}
        transition-all duration-200
        ${disabled
          ? 'opacity-50 cursor-not-allowed border-gray-200'
          : `${method.borderColor} hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`
        }
        ${isMainAction ? 'ring-2 ring-green-300 border-green-400' : ''}
        ${isMainAction
          ? 'flex items-center justify-center space-x-3 min-h-[60px]'
          : 'flex flex-col items-center text-center justify-center min-h-[100px]'
        }
        group
      `}
      aria-label={`Payer ${formatMontant(montant)} avec ${method.name}`}
      style={isMainAction ? { width: '-webkit-fill-available' } : undefined}
    >
      {/* Badge "Par défaut" pour le mode cash */}
      {isMainAction && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
            Par défaut
          </span>
        </div>
      )}

      {/* Layout pour bouton principal (horizontal) */}
      {isMainAction ? (
        <>
          {/* Icône ou logo - taille réduite pour layout horizontal */}
          <div className={`${method.color} group-hover:scale-110 transition-transform`}>
            {method.logo ? (
              <div className="w-8 h-8 relative bg-white rounded-lg p-1 shadow-sm">
                <Image
                  src={method.logo}
                  alt={method.name}
                  fill
                  className="object-contain p-0.5"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                {method.icon}
              </div>
            )}
          </div>

          {/* Texte horizontal */}
          <div className="flex-1 text-left">
            <p className={`${sizeStyles.title} font-bold text-gray-900 leading-tight`}>
              {method.name}
            </p>
            {montant > 0 && (
              <p className={`${sizeStyles.text} text-gray-600 leading-tight`}>
                {formatMontant(montant)}
              </p>
            )}
            <p className="text-xs text-gray-500 leading-tight">
              Paiement immédiat
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Layout pour boutons secondaires (vertical) */}
          <div className={`mb-3 ${method.color} group-hover:scale-110 transition-transform`}>
            {method.logo ? (
              <div className={`${sizeStyles.logo} relative bg-white rounded-lg p-1 shadow-sm`}>
                <Image
                  src={method.logo}
                  alt={method.name}
                  fill
                  className="object-contain p-0.5"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className={`${sizeStyles.logo} bg-white rounded-lg flex items-center justify-center shadow-sm`}>
                {method.icon}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className={`${sizeStyles.title} font-bold text-gray-900 leading-tight`}>
              {method.name}
            </p>
            {montant > 0 && (
              <p className={`${sizeStyles.text} text-gray-600 leading-tight`}>
                {formatMontant(montant)}
              </p>
            )}
            <p className="text-xs text-gray-500 leading-tight">
              Générer QR code
            </p>
          </div>
        </>
      )}
    </motion.button>
  );

  return (
    <div className="space-y-4">
      <div className={`text-center ${sizeStyles.text} text-gray-700 font-medium`}>
        Choisissez votre mode de paiement
      </div>

      {/* Mode Cash - Bouton principal avec largeur proportionnelle */}
      {cashMethod && (
        <div className="flex justify-center">
          <div className="w-full max-w-xs">
            {createActionButton(cashMethod, true)}
          </div>
        </div>
      )}

      {/* Modes Wallets (3x1) */}
      {walletMethods.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {walletMethods.map((method) => createActionButton(method))}
        </div>
      )}

      {/* Bouton Annuler (1x1) */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCancel}
        disabled={disabled}
        className={`
          w-full ${sizeStyles.button} rounded-xl border-2
          bg-gradient-to-br from-gray-50 to-gray-100
          border-gray-200 hover:border-gray-300
          transition-all duration-200
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1'
          }
          flex items-center justify-center
          text-gray-700 font-medium
          min-h-[60px]
        `}
        aria-label="Annuler le paiement"
      >
        <span className={sizeStyles.title}>Annuler</span>
      </motion.button>

      {/* Message d'information */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          💡 Le mode espèces est sélectionné par défaut pour un paiement rapide
        </p>
      </div>
    </div>
  );
}

// Composant de validation pour les erreurs
export function PaymentMethodError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg"
    >
      <p className="text-sm text-red-700">{message}</p>
    </motion.div>
  );
}