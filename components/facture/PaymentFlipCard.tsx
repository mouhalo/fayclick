'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, CreditCard, RotateCcw, Receipt } from 'lucide-react';
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
  const [selectedWallet, setSelectedWallet] = useState<PaymentMethod | null>(null);

  // Configuration des wallets
  const walletOptions = [
    { id: 'OM' as PaymentMethod, name: 'Orange Money', logo: '/images/om.png', color: 'border-orange-400', bg: 'bg-orange-50' },
    { id: 'WAVE' as PaymentMethod, name: 'Wave', logo: '/images/wave.png', color: 'border-blue-400', bg: 'bg-blue-50' },
    { id: 'FREE' as PaymentMethod, name: 'Free Money', logo: '/images/free.png', color: 'border-green-400', bg: 'bg-green-50' }
  ];

  // Styles responsifs
  const getStyles = () => {
    switch (screenType) {
      case 'mobile':
        return {
          montant: 'text-3xl',
          montantLabel: 'text-xs',
          padding: 'p-4',
          detailText: 'text-xs',
          walletLogo: 'w-10 h-10',
          walletName: 'text-[10px]',
          walletPadding: 'p-2'
        };
      case 'tablet':
        return {
          montant: 'text-4xl',
          montantLabel: 'text-sm',
          padding: 'p-5',
          detailText: 'text-sm',
          walletLogo: 'w-12 h-12',
          walletName: 'text-xs',
          walletPadding: 'p-3'
        };
      default:
        return {
          montant: 'text-5xl',
          montantLabel: 'text-base',
          padding: 'p-6',
          detailText: 'text-sm',
          walletLogo: 'w-14 h-14',
          walletName: 'text-sm',
          walletPadding: 'p-4'
        };
    }
  };

  const styles = getStyles();

  // Handler pour le bouton Payer
  const handlePay = () => {
    if (selectedWallet) {
      onSelectPaymentMethod(selectedWallet);
    }
  };

  // Handler pour flipper vers les wallets
  const handleFlipToWallets = () => {
    if (!isPaid) {
      setIsFlipped(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full"
      style={{ perspective: '1000px' }}
    >
      {/* Container avec flip 3D */}
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full"
      >
        {/* ========== FACE AVANT - Montant à payer ========== */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Fond coloré de base */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl"></div>

          {/* Bordure dorée */}
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/50"></div>

          {/* Carte glassmorphism */}
          <div className={`
            relative rounded-2xl ${styles.padding} overflow-hidden
            bg-gradient-to-br from-white/15 via-white/10 to-white/5
            backdrop-blur-xl
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
            <div className="absolute inset-0 pointer-events-none opacity-25">
              <Image
                src="/images/fond_card_facture.png"
                alt="Mascotte"
                fill
                className="object-cover object-right"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>

            {/* Contenu */}
            <div className="relative z-10 text-center">
              {/* Label Montant à payer dans un badge */}
              <div className="inline-block mb-3">
                <span className={`bg-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-full font-medium ${styles.montantLabel}`}>
                  Montant à payer
                </span>
              </div>

              {/* Montant principal */}
              <div className="mb-3">
                <span className={`${styles.montant} font-bold text-white`}>
                  {montantRestant > 0
                    ? formatMontant(montantRestant).replace('XOF', '').replace('FCFA', '').trim()
                    : formatMontant(montantTotal).replace('XOF', '').replace('FCFA', '').trim()
                  }
                </span>
                <span className={`${screenType === 'mobile' ? 'text-lg' : 'text-xl'} text-white/90 ml-2`}>XOF</span>
              </div>

              {/* Détails acompte/restant */}
              <div className={`space-y-0.5 text-white/80 ${styles.detailText}`}>
                <p>Acompte: <span className="font-medium text-white">{formatMontant(montantAcompte)}</span></p>
                <p>Restant: <span className="font-medium text-white">{formatMontant(montantRestant)}</span></p>
              </div>

              {/* Bouton pour flipper - Payer maintenant */}
              {!isPaid && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFlipToWallets}
                  className={`mt-4 w-full py-3 rounded-full font-bold shadow-lg transition-all
                    bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600
                    text-white border-2 border-amber-300 flex items-center justify-center gap-2
                    ${screenType === 'mobile' ? 'text-sm' : 'text-base'}`}
                >
                  <CreditCard className="w-5 h-5" />
                  Payer maintenant
                </motion.button>
              )}

              {/* Badge payée */}
              {isPaid && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Check className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">Intégralement payée</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== FACE ARRIÈRE - Choix du wallet ========== */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Fond coloré de base */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl"></div>

          {/* Bordure dorée */}
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/50"></div>

          {/* Carte glassmorphism */}
          <div className={`
            relative rounded-2xl ${styles.padding} overflow-hidden h-full
            bg-gradient-to-br from-white/10 via-white/5 to-white/0
            backdrop-blur-xl
          `}>
            {/* Ligne de reflet en haut */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

            {/* Contenu */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Header avec bouton retour */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-white/90 font-medium ${styles.montantLabel}`}>
                  Choisir un moyen de paiement
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsFlipped(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-white/70" />
                </motion.button>
              </div>

              {/* Grille des wallets */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                {walletOptions.map((wallet) => (
                  <motion.button
                    key={wallet.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedWallet(wallet.id)}
                    className={`relative flex flex-col items-center justify-center ${styles.walletPadding} rounded-xl bg-white/95 border-2 transition-all ${
                      selectedWallet === wallet.id
                        ? `${wallet.color} shadow-lg ring-2 ring-offset-1 ring-amber-400`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Badge de sélection */}
                    {selectedWallet === wallet.id && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`${styles.walletLogo} relative mb-1`}>
                      <Image
                        src={wallet.logo}
                        alt={wallet.name}
                        fill
                        className="object-contain"
                        sizes="56px"
                      />
                    </div>
                    <span className={`font-medium text-gray-700 text-center ${styles.walletName}`}>
                      {wallet.name}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Bouton Payer */}
              <motion.button
                whileHover={{ scale: selectedWallet ? 1.02 : 1 }}
                whileTap={{ scale: selectedWallet ? 0.98 : 1 }}
                onClick={handlePay}
                disabled={!selectedWallet}
                className={`mt-3 w-full py-3 rounded-full font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                  selectedWallet
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white border-2 border-amber-300'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-400'
                } ${screenType === 'mobile' ? 'text-sm' : 'text-base'}`}
              >
                <Receipt className="w-5 h-5" />
                Payer {formatMontant(montantRestant)}
              </motion.button>

              {/* Message sécurisé */}
              <div className={`mt-2 flex items-center justify-center gap-2 text-white/60 ${styles.detailText}`}>
                <Shield className="w-3.5 h-3.5" />
                Paiement sécurisé
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
