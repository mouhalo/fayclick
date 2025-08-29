/**
 * Modal de sélection du wallet pour paiement de facture
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { WalletProvider, WalletInfo } from '@/types/facture-publique';
import { formatAmount } from '@/utils/formatAmount';

interface ModalPaiementWalletProps {
  isOpen: boolean;
  onClose: () => void;
  montant: number;
  numeroFacture: string;
  onPaymentSelect: (wallet: WalletProvider) => void;
}

const wallets: WalletInfo[] = [
  {
    id: 'orange_money',
    name: 'Orange Money',
    displayName: 'Orange Money',
    color: 'from-orange-500 to-orange-600',
    icon: '🍊',
    instructions: [
      'Composez #144#',
      'Choisir 1: Transfert d\'argent',
      'Choisir 1: Vers Orange Money',
      'Entrez le numéro marchand: 77 123 45 67',
      'Entrez le montant',
      'Entrez votre code secret',
      'Confirmez la transaction'
    ],
    numero: '77 123 45 67'
  },
  {
    id: 'wave',
    name: 'Wave',
    displayName: 'Wave',
    color: 'from-blue-500 to-blue-600',
    icon: '🌊',
    instructions: [
      'Ouvrez l\'application Wave',
      'Cliquez sur "Envoyer"',
      'Entrez le numéro: 77 234 56 78',
      'Entrez le montant',
      'Ajoutez la référence de la facture',
      'Validez avec votre code PIN'
    ],
    numero: '77 234 56 78'
  },
  {
    id: 'free_money',
    name: 'Free Money',
    displayName: 'Free Money',
    color: 'from-green-500 to-green-600',
    icon: '💚',
    instructions: [
      'Composez #222#',
      'Choisir 1: Envoyer de l\'argent',
      'Entrez le numéro: 76 345 67 89',
      'Entrez le montant',
      'Entrez votre code secret',
      'Confirmez l\'envoi'
    ],
    numero: '76 345 67 89'
  }
];

export function ModalPaiementWallet({
  isOpen,
  onClose,
  montant,
  numeroFacture,
  onPaymentSelect
}: ModalPaiementWalletProps) {
  const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleWalletSelect = (wallet: WalletInfo) => {
    setSelectedWallet(wallet);
    setShowInstructions(true);
  };

  const handleBack = () => {
    setShowInstructions(false);
    setSelectedWallet(null);
  };

  const handleConfirmPayment = () => {
    if (selectedWallet) {
      onPaymentSelect(selectedWallet.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <Smartphone className="w-12 h-12 mx-auto mb-3" />
              <h2 className="text-xl font-bold mb-1">
                {showInstructions ? 'Instructions de paiement' : 'Choisir un moyen de paiement'}
              </h2>
              <p className="text-blue-100 text-sm">
                Facture {numeroFacture}
              </p>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-6">
            {!showInstructions ? (
              <>
                {/* Montant à payer */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
                  <p className="text-gray-600 text-sm mb-1">Montant à payer</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatAmount(montant)} FCFA
                  </p>
                </div>

                {/* Liste des wallets */}
                <div className="space-y-3">
                  {wallets.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleWalletSelect(wallet)}
                      className={`w-full p-4 rounded-xl bg-gradient-to-r ${wallet.color} text-white shadow-lg hover:shadow-xl transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{wallet.icon}</span>
                          <div className="text-left">
                            <p className="font-semibold">{wallet.displayName}</p>
                            <p className="text-xs opacity-90">Paiement mobile</p>
                          </div>
                        </div>
                        <div className="bg-white/20 rounded-full p-2">
                          <Smartphone className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Instructions détaillées */}
                {selectedWallet && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* En-tête wallet sélectionné */}
                    <div className={`bg-gradient-to-r ${selectedWallet.color} text-white rounded-lg p-4`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{selectedWallet.icon}</span>
                        <div>
                          <p className="font-semibold">{selectedWallet.displayName}</p>
                          <p className="text-sm opacity-90">Numéro: {selectedWallet.numero}</p>
                        </div>
                      </div>
                    </div>

                    {/* Montant */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-600 mb-1">Montant à envoyer:</p>
                      <p className="text-lg font-bold text-blue-800">
                        {formatAmount(montant)} FCFA
                      </p>
                    </div>

                    {/* Instructions étape par étape */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3">
                        Suivez ces étapes:
                      </h3>
                      <ol className="space-y-2">
                        {selectedWallet.instructions.map((instruction, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm text-gray-700">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Note importante */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        <strong>Important:</strong> Utilisez la référence <strong>{numeroFacture}</strong> dans votre transaction
                      </p>
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleBack}
                        className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Retour
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConfirmPayment}
                        className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        J'ai payé
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}