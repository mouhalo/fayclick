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
  selectedMethod: PaymentMethod | null;
  onMethodSelect: (method: PaymentMethod) => void;
  availableMethods?: PaymentMethod[];
  size?: 'sm' | 'md' | 'lg';
  layout?: 'grid' | 'row';
  disabled?: boolean;
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
  selectedMethod,
  onMethodSelect,
  availableMethods = ['CASH', 'OM', 'WAVE', 'FREE'],
  size = 'md',
  layout = 'grid',
  disabled = false
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

  // Filtrer les méthodes disponibles
  const filteredMethods = paymentMethods.filter(method =>
    availableMethods.includes(method.id)
  );

  // Styles selon la taille
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'p-2',
          icon: 'w-4 h-4',
          text: 'text-xs',
          logo: 'w-6 h-6'
        };
      case 'lg':
        return {
          button: 'p-4',
          icon: 'w-6 h-6',
          text: 'text-base',
          logo: 'w-10 h-10'
        };
      default: // md
        return {
          button: 'p-3',
          icon: 'w-5 h-5',
          text: 'text-sm',
          logo: 'w-8 h-8'
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Layout responsive
  const getLayoutClasses = () => {
    if (layout === 'row') {
      return 'flex flex-row gap-2 overflow-x-auto';
    }

    // Grid responsive par défaut
    return `grid gap-2 ${
      filteredMethods.length <= 2
        ? 'grid-cols-2'
        : 'grid-cols-2 md:grid-cols-4'
    }`;
  };

  return (
    <div className="space-y-3">
      <label className={`block text-gray-700 font-medium ${sizeStyles.text}`}>
        Mode de paiement
      </label>

      <div className={getLayoutClasses()}>
        {filteredMethods.map((method, index) => {
          const isSelected = selectedMethod === method.id;

          return (
            <motion.button
              key={method.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={disabled ? {} : { scale: 1.02 }}
              whileTap={disabled ? {} : { scale: 0.98 }}
              onClick={() => !disabled && onMethodSelect(method.id)}
              disabled={disabled}
              className={`
                relative ${sizeStyles.button} rounded-xl border-2
                bg-gradient-to-br ${method.bgGradient}
                transition-all duration-200
                ${disabled
                  ? 'opacity-50 cursor-not-allowed border-gray-200'
                  : `${method.borderColor} hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`
                }
                ${isSelected
                  ? `border-blue-500 shadow-md ring-2 ring-blue-200 ${method.bgGradient}`
                  : ''
                }
                flex flex-col items-center text-center min-h-[80px] justify-center
                group
              `}
              aria-pressed={isSelected}
              aria-label={`Payer avec ${method.name}`}
            >
              {/* Indicateur de sélection */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <div className="w-2 h-2 bg-white rounded-full" />
                </motion.div>
              )}

              {/* Icône ou logo */}
              <div className={`mb-2 ${method.color} group-hover:scale-110 transition-transform`}>
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

              {/* Nom de la méthode */}
              <div>
                <p className={`${sizeStyles.text} font-semibold text-gray-900 leading-tight`}>
                  {layout === 'grid' ? method.shortName : method.name}
                </p>
                {method.id === 'CASH' && (
                  <p className="text-xs text-gray-500 mt-0.5">Liquide</p>
                )}
                {method.id !== 'CASH' && layout === 'grid' && (
                  <p className="text-xs text-gray-500 mt-0.5">Mobile</p>
                )}
              </div>

              {/* Badge recommandé (optionnel) */}
              {method.id === 'CASH' && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                    Rapide
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Message d'aide */}
      {selectedMethod && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-200"
        >
          <p className="text-xs text-blue-800">
            {selectedMethod === 'CASH' ? (
              <>
                <span className="font-semibold">Paiement en espèces :</span> Le paiement sera enregistré immédiatement.
              </>
            ) : (
              <>
                <span className="font-semibold">Paiement mobile :</span> Un QR code sera généré pour le client.
              </>
            )}
          </p>
        </motion.div>
      )}
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