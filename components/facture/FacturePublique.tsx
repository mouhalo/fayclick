/**
 * Composant d'affichage public d'une facture
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt, 
  Calendar, 
  Phone, 
  User, 
  Package,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Printer,
  Share2
} from 'lucide-react';
import { FacturePublique, WalletProvider } from '@/types/facture-publique';
import { formatAmount } from '@/utils/formatAmount';
import { ModalPaiementWallet } from './ModalPaiementWallet';

interface FacturePubliqueProps {
  facture: FacturePublique;
  onPaymentComplete?: (wallet: WalletProvider) => void;
}

export function FacturePubliqueComponent({ 
  facture, 
  onPaymentComplete 
}: FacturePubliqueProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { facture: info, details, resume } = facture;
  const isPaid = info.id_etat !== 1;

  const handlePrint = () => {
    if (isClient) {
      window.print();
    }
  };

  const handleShare = async () => {
    if (!isClient) return;

    const shareUrl = window.location.href;
    const shareData = {
      title: `Facture ${info.num_facture}`,
      text: `Facture de ${formatAmount(info.montant)} FCFA - ${info.nom_structure}`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Lien copié dans le presse-papiers');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const handlePayment = (wallet: WalletProvider) => {
    console.log('Paiement avec:', wallet);
    setShowPaymentModal(false);
    if (onPaymentComplete) {
      onPaymentComplete(wallet);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* En-tête avec actions */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6 print:shadow-none">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-4">
              {/* Logo de la structure ou FayClick */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 flex-shrink-0"
              >
                <div className="w-full h-full bg-white rounded-full p-2 flex items-center justify-center">
                  {info.logo && info.logo !== '' ? (
                    <img
                      src={info.logo}
                      alt={info.nom_structure}
                      className="w-full h-full object-contain rounded-full"
                    />
                  ) : (
                    <img
                      src="/images/logo.png"
                      alt="FayClick"
                      className="w-full h-full object-contain rounded-full"
                    />
                  )}
                </div>
              </motion.div>

              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {info.nom_structure}
                </h1>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  <span className="text-lg font-semibold text-gray-700">
                    {info.num_facture}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 print:hidden">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrint}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Imprimer"
              >
                <Printer className="w-5 h-5 text-gray-600" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Partager"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>
          </div>

          {/* Statut de paiement */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            isPaid 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {isPaid ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Payée</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">En attente de paiement</span>
              </>
            )}
          </div>
        </div>

        {/* Informations client et date */}
        <div className="bg-white shadow-lg p-6 border-t print:shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium text-gray-800">{info.nom_client}</p>
                </div>
              </div>
              {info.tel_client && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium text-gray-800">{info.tel_client}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date facture</p>
                  <p className="font-medium text-gray-800">
                    {new Date(info.date_facture).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium text-gray-800">{info.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Détails des articles */}
        <div className="bg-white shadow-lg p-6 border-t print:shadow-none">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Détails de la facture
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Article</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">Qté</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Prix unit.</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail, index) => (
                  <motion.tr
                    key={detail.id_detail}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100"
                  >
                    <td className="py-3 px-2">
                      <p className="font-medium text-gray-800">{detail.nom_produit}</p>
                    </td>
                    <td className="text-center py-3 px-2 text-gray-700">
                      {detail.quantite}
                    </td>
                    <td className="text-right py-3 px-2 text-gray-700">
                      {formatAmount(detail.prix)}
                    </td>
                    <td className="text-right py-3 px-2 font-medium text-gray-800">
                      {formatAmount(detail.sous_total)} FCFA
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Résumé */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium text-gray-800">
                {formatAmount(info.montant + info.mt_remise)} FCFA
              </span>
            </div>
            {info.mt_remise > 0 && (
              <div className="flex justify-between items-center py-2 text-green-600">
                <span>Remise</span>
                <span className="font-medium">- {formatAmount(info.mt_remise)} FCFA</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-t border-gray-200">
              <span className="text-lg font-semibold text-gray-800">Total</span>
              <span className="text-xl font-bold text-blue-600">
                {formatAmount(info.montant)} FCFA
              </span>
            </div>
            {info.mt_acompte > 0 && (
              <>
                <div className="flex justify-between items-center py-2 text-blue-600">
                  <span>Acompte versé</span>
                  <span className="font-medium">- {formatAmount(info.mt_acompte)} FCFA</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t border-gray-200">
                  <span className="text-lg font-semibold text-gray-800">Reste à payer</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatAmount(info.mt_restant)} FCFA
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bouton de paiement */}
        {!isPaid && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-b-2xl shadow-lg p-6 border-t print:hidden"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <CreditCard className="w-6 h-6" />
              <span className="text-lg">
                Payer {formatAmount(info.mt_restant > 0 ? info.mt_restant : info.montant)} FCFA
              </span>
            </motion.button>
          </motion.div>
        )}

        {/* Pied de page */}
        <div className="mt-6 text-center text-sm text-gray-500 print:mt-12">
          <p>Généré le {new Date(facture.timestamp_generation).toLocaleString('fr-FR')}</p>
          <p className="mt-2">© {new Date().getFullYear()} {info.nom_structure} - Tous droits réservés</p>
        </div>
      </motion.div>

      {/* Modal de paiement */}
      <ModalPaiementWallet
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        montant={info.mt_restant > 0 ? info.mt_restant : info.montant}
        numeroFacture={info.num_facture}
        onPaymentSelect={handlePayment}
      />
    </div>
  );
}