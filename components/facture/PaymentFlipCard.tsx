'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { PaymentMethod } from '@/types/payment-wallet';

interface PaymentFlipCardProps {
  montantRestant: number;
  montantTotal: number;
  montantAcompte: number;
  isPaid: boolean;
  screenType: 'mobile' | 'tablet' | 'desktop';
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  formatMontant: (montant: number) => string;
}

// Configuration des wallets
const walletMethods: Array<{
  id: PaymentMethod;
  name: string;
  logo: string;
  color: string;
}> = [
  {
    id: 'OM',
    name: 'Orange Money',
    logo: '/images/om.png',
    color: 'border-orange-400 hover:border-orange-500'
  },
  {
    id: 'WAVE',
    name: 'Wave',
    logo: '/images/wave.png',
    color: 'border-blue-400 hover:border-blue-500'
  },
  {
    id: 'FREE',
    name: 'Free Money',
    logo: '/images/free.png',
    color: 'border-green-400 hover:border-green-500'
  }
];

export default function PaymentFlipCard({
  montantRestant,
  montantTotal,
  montantAcompte,
  isPaid,
  screenType,
  onSelectPaymentMethod,
  formatMontant
}: PaymentFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Styles responsifs (compacts pour éviter carte trop allongée)
  const getStyles = () => {
    switch (screenType) {
      case 'mobile':
        return {
          montant: 'text-3xl',
          montantLabel: 'text-sm',
          walletLogo: 'w-10 h-10',
          walletName: 'text-[9px]',
          walletPadding: 'p-2 py-2',
          padding: 'p-3',
          detailText: 'text-xs',
          buttonText: 'text-xs',
          montantRappel: 'text-sm',
          montantRappelValue: 'text-base'
        };
      case 'tablet':
        return {
          montant: 'text-4xl',
          montantLabel: 'text-base',
          walletLogo: 'w-12 h-12',
          walletName: 'text-[10px]',
          walletPadding: 'p-2 py-3',
          padding: 'p-4',
          detailText: 'text-sm',
          buttonText: 'text-sm',
          montantRappel: 'text-sm',
          montantRappelValue: 'text-lg'
        };
      default:
        return {
          montant: 'text-5xl',
          montantLabel: 'text-lg',
          walletLogo: 'w-14 h-14',
          walletName: 'text-xs',
          walletPadding: 'p-3 py-3',
          padding: 'p-5',
          detailText: 'text-sm',
          buttonText: 'text-base',
          montantRappel: 'text-sm',
          montantRappelValue: 'text-lg'
        };
    }
  };

  const styles = getStyles();

  const handleFlip = () => {
    if (!isPaid) {
      setIsFlipped(!isFlipped);
    }
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    onSelectPaymentMethod(method);
  };

  return (
    <div className="relative w-full" style={{ perspective: '1200px' }}>
      <motion.div
        className="grid w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {/* ========== FACE AVANT - MONTANT ========== */}
        <div
          className={`
            relative row-start-1 col-start-1 rounded-2xl overflow-hidden cursor-pointer
            ${!isPaid ? 'hover:shadow-2xl transition-shadow' : ''}
          `}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
          onClick={handleFlip}
        >
          {/* Fond coloré de base */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl"></div>

          {/* Carte glassmorphism */}
          <div className={`
            relative rounded-2xl ${styles.padding} overflow-hidden
            bg-gradient-to-br from-white/15 via-white/10 to-white/5
            backdrop-blur-xl
            border-2 border-white/30
            shadow-[0_4px_16px_rgba(0,0,0,0.1)]
          `}>
            {/* Reflet radial */}
            <div
              className="absolute top-0 left-0 w-3/4 h-3/4 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(255,255,255,0.2), transparent 60%)'
              }}
            ></div>

            {/* Ligne de reflet en haut */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

            {/* Mascotte en fond */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <Image
                src="/images/fond_card_facture.png"
                alt="Mascotte"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>

            {/* Contenu */}
            <div className="relative z-10">
              <h3 className={`text-white/90 font-medium mb-2 ${styles.montantLabel}`}>
                Montant à payer
              </h3>

              {/* Montant principal */}
              <div className="mb-3">
                <span className={`${styles.montant} font-bold text-white`}>
                  {montantRestant > 0
                    ? formatMontant(montantRestant).replace('XOF', '').trim()
                    : formatMontant(montantTotal).replace('XOF', '').trim()
                  }
                </span>
                <span className={`${screenType === 'mobile' ? 'text-lg' : 'text-xl'} text-white/90 ml-2`}>XOF</span>
              </div>

              {/* Détails acompte/restant */}
              <div className={`space-y-1 text-white/80 ${styles.detailText}`}>
                <p>Acompte: <span className="font-medium text-white">{formatMontant(montantAcompte)}</span></p>
                <p>Restant: <span className="font-medium text-white">{formatMontant(montantRestant)}</span></p>
              </div>

              {/* Message sécurisé + indication flip */}
              {!isPaid && (
                <div className="mt-4 flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-white/70 ${styles.detailText}`}>
                    <Shield className="w-4 h-4" />
                    Paiement sécurisé et instantané
                  </div>
                  <motion.div
                    className={`flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full ${styles.buttonText}`}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <CreditCard className="w-4 h-4 text-white" />
                    <span className="text-white font-medium">Payer</span>
                  </motion.div>
                </div>
              )}

              {/* Badge payée */}
              {isPaid && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Check className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">Intégralement payée</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== FACE ARRIÈRE - MODES DE PAIEMENT ========== */}
        <div
          className="relative row-start-1 col-start-1 rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Fond coloré */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl"></div>

          {/* Carte glassmorphism */}
          <div className={`
            relative rounded-2xl ${styles.padding} overflow-hidden
            bg-gradient-to-br from-white/10 via-white/5 to-white/5
            backdrop-blur-xl
            border-2 border-white/20
          `}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-white font-bold ${styles.detailText}`}>
                Choisir un moyen de paiement
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFlip}
                className={`text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full transition-all ${styles.buttonText}`}
              >
                ← Retour
              </motion.button>
            </div>

            {/* Montant à payer (rappel) - compact */}
            <div className="bg-white/10 rounded-lg p-2 mb-3 text-center">
              <span className={`text-white/70 ${styles.montantRappel}`}>Montant : </span>
              <span className={`text-white font-bold ${styles.montantRappelValue}`}>
                {formatMontant(montantRestant)}
              </span>
            </div>

            {/* Grille des wallets */}
            <div className="grid grid-cols-3 gap-2">
              {walletMethods.map((method, index) => (
                <motion.button
                  key={method.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePaymentSelect(method.id)}
                  className={`
                    flex flex-col items-center justify-center ${styles.walletPadding} rounded-xl
                    bg-white hover:bg-gray-50
                    border-2 ${method.color}
                    shadow-lg hover:shadow-xl
                    transition-all duration-200
                  `}
                >
                  <div className={`${styles.walletLogo} relative mb-1`}>
                    <Image
                      src={method.logo}
                      alt={method.name}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </div>
                  <span className={`font-semibold text-gray-700 ${styles.walletName} text-center leading-tight`}>
                    {method.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
