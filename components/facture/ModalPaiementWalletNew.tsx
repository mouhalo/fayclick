/**
 * Modal de paiement avec 3 options de wallet
 * Orange Money, Wave, Free Money
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export type WalletType = 'OM' | 'WAVE' | 'FREE' | 'CASH';

interface WalletOption {
  id: WalletType;
  name: string;
  displayName: string;
  color: string;
  bgGradient: string;
  icon: string;
  ussdCode: string;
  description: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'OM',
    name: 'Orange Money',
    displayName: 'Orange Money',
    color: 'orange',
    bgGradient: 'from-orange-500 to-orange-600',
    icon: '/images/wallets/orange-money.png',
    ussdCode: '#144#',
    description: 'Payez facilement avec Orange Money'
  },
  {
    id: 'WAVE',
    name: 'Wave',
    displayName: 'Wave',
    color: 'blue',
    bgGradient: 'from-blue-500 to-blue-600',
    icon: '/images/wallets/wave.png',
    ussdCode: '*695#',
    description: 'Paiement rapide avec Wave'
  },
  {
    id: 'FREE',
    name: 'Free Money',
    displayName: 'Free Money',
    color: 'green',
    bgGradient: 'from-green-500 to-green-600',
    icon: '/images/wallets/free-money.png',
    ussdCode: '#160#',
    description: 'Transaction sécurisée avec Free Money'
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  montant: number;
  numeroFacture: string;
  onPaymentComplete: (wallet: WalletType) => void;
}

export function ModalPaiementWalletNew({
  isOpen,
  onClose,
  montant,
  numeroFacture,
  onPaymentComplete
}: Props) {
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'phone' | 'confirm'>('select');

  const handleWalletSelect = (wallet: WalletType) => {
    setSelectedWallet(wallet);
    setStep('phone');
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length >= 9) {
      setStep('confirm');
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedWallet) return;
    
    setIsProcessing(true);
    
    // Simuler le traitement du paiement
    setTimeout(() => {
      onPaymentComplete(selectedWallet);
      setIsProcessing(false);
      onClose();
    }, 2000);
  };

  const handleBack = () => {
    if (step === 'phone') {
      setStep('select');
      setSelectedWallet(null);
    } else if (step === 'confirm') {
      setStep('phone');
    }
  };

  const selectedWalletData = WALLET_OPTIONS.find(w => w.id === selectedWallet);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal Container - Centrage parfait avec Flexbox */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
            {/* Header - Fixe */}
            <div className={`bg-gradient-to-r ${
              selectedWalletData ? selectedWalletData.bgGradient : 'from-blue-600 to-purple-600'
            } p-4 sm:p-5 text-white flex-shrink-0`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold">
                    {step === 'select' && 'Choisir un moyen de paiement'}
                    {step === 'phone' && `Payer avec ${selectedWalletData?.displayName}`}
                    {step === 'confirm' && 'Confirmer le paiement'}
                  </h2>
                  <p className="text-white/90 mt-1 text-sm">
                    Facture #{numeroFacture}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {/* Montant à payer */}
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Montant à payer</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {montant.toLocaleString('fr-FR')} F CFA
                </p>
              </div>

              {/* Step: Select Wallet */}
              {step === 'select' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  {WALLET_OPTIONS.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleWalletSelect(wallet.id)}
                      className="w-full p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r ${wallet.bgGradient} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white font-bold text-base sm:text-lg">
                              {wallet.displayName[0]}
                            </span>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">
                              {wallet.displayName}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {wallet.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Step: Phone Number */}
              {step === 'phone' && selectedWalletData && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <form onSubmit={handlePhoneSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Numéro de téléphone {selectedWalletData.displayName}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="77 123 45 67"
                          className="block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                          maxLength={9}
                          autoFocus
                        />
                      </div>
                      <p className="mt-2 text-xs sm:text-sm text-gray-500">
                        Entrez le numéro associé à votre compte {selectedWalletData.displayName}
                      </p>
                    </div>

                    <div className="flex gap-2 sm:gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-gray-100 text-gray-700 rounded-lg font-medium sm:font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base"
                      >
                        Retour
                      </button>
                      <button
                        type="submit"
                        disabled={phoneNumber.length < 9}
                        className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium sm:font-semibold transition-colors text-sm sm:text-base ${
                          phoneNumber.length >= 9
                            ? `bg-gradient-to-r ${selectedWalletData.bgGradient} text-white hover:opacity-90`
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Continuer
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step: Confirm */}
              {step === 'confirm' && selectedWalletData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3 sm:space-y-4"
                >
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <h3 className="font-medium sm:font-semibold text-blue-900 mb-2 sm:mb-3 text-sm sm:text-base">
                      Instructions de paiement
                    </h3>
                    <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-blue-800">
                      <li className="flex gap-2">
                        <span className="font-semibold">1.</span>
                        <span>Composez le <strong>{selectedWalletData.ussdCode}</strong> sur votre téléphone</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">2.</span>
                        <span>Suivez les instructions pour envoyer <strong>{montant.toLocaleString('fr-FR')} F</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">3.</span>
                        <span>Utilisez la référence: <strong>{numeroFacture}</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">4.</span>
                        <span>Confirmez le paiement avec votre code PIN</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs sm:text-sm text-gray-600">Numéro de paiement</p>
                    <p className="font-semibold text-base sm:text-lg">{phoneNumber}</p>
                  </div>

                  <div className="flex gap-2 sm:gap-3 pt-2">
                    <button
                      onClick={handleBack}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-gray-100 text-gray-700 rounded-lg font-medium sm:font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={handleConfirmPayment}
                      disabled={isProcessing}
                      className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium sm:font-semibold transition-colors bg-gradient-to-r ${selectedWalletData.bgGradient} text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          J&apos;ai payé
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-center text-gray-500 mt-2 px-2">
                    En cliquant sur &quot;J&apos;ai payé&quot;, vous confirmez avoir effectué le paiement via {selectedWalletData.displayName}
                  </p>
                </motion.div>
              )}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}