/**
 * Composant de sélection de mode de paiement - Style VenteFlash
 * Design 3 grandes cartes colorées (CASH, WAVE, OM)
 * Sans Free Money
 */

'use client';

import { motion } from 'framer-motion';
import { Banknote } from 'lucide-react';
import { PaymentMethod } from '@/types/payment-wallet';
import Image from 'next/image';

interface PaymentMethodSelectorProps {
  onMethodAction: (method: PaymentMethod) => void;
  onCancel: () => void;
  availableMethods?: PaymentMethod[];
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  montant?: number;
}

interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  shortName: string;
  logo?: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
}

export function PaymentMethodSelector({
  onMethodAction,
  onCancel,
  availableMethods = ['CASH', 'OM', 'WAVE'],
  size = 'md',
  disabled = false,
  montant = 0
}: PaymentMethodSelectorProps) {

  // Configuration des 3 méthodes de paiement (sans FREE)
  const paymentMethods: PaymentMethodConfig[] = [
    {
      id: 'CASH',
      name: 'CASH',
      shortName: 'Cash',
      bgGradient: 'from-green-400 to-emerald-500',
      borderColor: 'border-green-300',
      textColor: 'text-white'
    },
    {
      id: 'WAVE',
      name: 'WAVE',
      shortName: 'Wave',
      logo: '/images/wave.png',
      bgGradient: 'from-blue-400 to-blue-600',
      borderColor: 'border-blue-300',
      textColor: 'text-white'
    },
    {
      id: 'OM',
      name: 'OM',
      shortName: 'OM',
      logo: '/images/om.png',
      bgGradient: 'from-orange-400 to-orange-600',
      borderColor: 'border-orange-300',
      textColor: 'text-white'
    }
  ];

  // Filtrer les méthodes disponibles (exclure FREE même si passé)
  const filteredMethods = paymentMethods.filter(method =>
    availableMethods.includes(method.id) && method.id !== 'FREE'
  );

  // Styles selon la taille
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          card: 'h-20',
          icon: 'w-8 h-8',
          text: 'text-xs',
          iconContainer: 'w-8 h-8'
        };
      case 'lg':
        return {
          card: 'h-36',
          icon: 'w-14 h-14',
          text: 'text-lg',
          iconContainer: 'w-14 h-14'
        };
      default: // md
        return {
          card: 'h-28',
          icon: 'w-10 h-10',
          text: 'text-sm',
          iconContainer: 'w-10 h-10'
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <div className="space-y-4">
      {/* Titre */}
      <p className={`text-center text-gray-600 ${sizeStyles.text} mb-3`}>
        Choisissez votre mode de paiement
      </p>

      {/* Grille 3 colonnes - Style VenteFlash */}
      <div className={`grid grid-cols-3 ${size === 'sm' ? 'gap-2' : 'gap-3'}`}>
        {filteredMethods.map((method, index) => (
          <motion.button
            key={method.id}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            onClick={() => !disabled && onMethodAction(method.id)}
            disabled={disabled}
            className={`
              ${sizeStyles.card}
              bg-gradient-to-br ${method.bgGradient}
              rounded-xl border-2 ${method.borderColor}
              flex flex-col items-center justify-center
              cursor-pointer shadow-lg
              transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2
            `}
            aria-label={`Payer avec ${method.name}`}
          >
            {/* Icône ou Logo */}
            <div className={`${sizeStyles.iconContainer} bg-white/30 rounded-full flex items-center justify-center mb-2 ${method.logo ? 'p-1' : ''}`}>
              {method.logo ? (
                <div className="relative w-full h-full bg-white rounded-full overflow-hidden">
                  <Image
                    src={method.logo}
                    alt={method.name}
                    fill
                    className="object-contain p-1"
                    sizes="40px"
                  />
                </div>
              ) : (
                <Banknote className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} text-white`} />
              )}
            </div>

            {/* Nom de la méthode */}
            <span className={`font-bold ${method.textColor} ${sizeStyles.text}`}>
              {method.name}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Bouton Annuler */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCancel}
        disabled={disabled}
        className={`
          w-full py-3 rounded-xl border-2
          bg-gradient-to-br from-gray-50 to-gray-100
          border-gray-200 hover:border-gray-300
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
          flex items-center justify-center
          text-gray-700 font-medium
        `}
        aria-label="Annuler le paiement"
      >
        Annuler
      </motion.button>
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
