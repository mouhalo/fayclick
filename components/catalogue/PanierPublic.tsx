/**
 * Panier public pour le catalogue - Drawer/Modal avec paiement OM/Wave
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, Phone, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { ArticlePanier } from '@/services/online-seller.service';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentContext } from '@/types/payment-wallet';
import { onlineSellerService } from '@/services/online-seller.service';

interface PanierPublicProps {
  isOpen: boolean;
  onClose: () => void;
  articles: ArticlePanier[];
  onModifierQuantite: (id_produit: number, delta: number) => void;
  onSupprimer: (id_produit: number) => void;
  idStructure: number;
  nomStructure: string;
  onPaymentSuccess: () => void;
}

type PageState = 'PANIER' | 'PAYING' | 'SUCCESS';

export default function PanierPublic({
  isOpen,
  onClose,
  articles,
  onModifierQuantite,
  onSupprimer,
  idStructure,
  nomStructure,
  onPaymentSuccess
}: PanierPublicProps) {
  const [telephone, setTelephone] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'OM' | 'WAVE' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageState, setPageState] = useState<PageState>('PANIER');
  const [numFacture, setNumFacture] = useState('');
  const [error, setError] = useState('');

  const total = articles.reduce((sum, a) => sum + a.prix_vente * a.quantite, 0);
  const nbArticles = articles.reduce((sum, a) => sum + a.quantite, 0);

  const formatMontant = (m: number) => m.toLocaleString('fr-FR') + ' FCFA';

  const isFormValid = () => {
    return telephone.length === 9 && /^(77|78|76|70|75)\d{7}$/.test(telephone) && articles.length > 0;
  };

  const handlePayment = (method: 'OM' | 'WAVE') => {
    if (!isFormValid() || isSubmitting) return;
    setIsSubmitting(true);
    setSelectedMethod(method);
    setShowQRCode(true);
  };

  const createPaymentContext = (): PaymentContext | null => {
    if (articles.length === 0) return null;
    const timestamp = Date.now();
    return {
      facture: {
        id_facture: 0,
        num_facture: `PANIER-${idStructure}-${timestamp}`,
        nom_client: `Client_${telephone}`,
        tel_client: telephone,
        nom_structure: nomStructure,
        montant_total: total,
        montant_restant: total
      },
      montant_acompte: total
    };
  };

  const handlePaymentComplete = async (
    statusResponse?: { data?: { uuid?: string; reference_externe?: string } },
    method?: 'OM' | 'WAVE',
    articlesSnapshot?: ArticlePanier[],
    totalSnapshot?: number
  ) => {
    setShowQRCode(false);
    setPageState('PAYING');

    const payMethod = method || selectedMethod;
    const payArticles = articlesSnapshot || articles;
    const payTotal = totalSnapshot || total;

    try {
      if (!payMethod) throw new Error('Methode de paiement manquante');

      const uuid = statusResponse?.data?.uuid || '';
      const ref = statusResponse?.data?.reference_externe || '';
      const timestamp = Date.now();
      const transactionId = `${payMethod}-PANIER-${idStructure}-${timestamp}`;

      const result = await onlineSellerService.createFactureOnlinePanier({
        id_structure: idStructure,
        articles: payArticles,
        prenom: `Client_${telephone}`,
        telephone,
        montant_total: payTotal,
        transaction_id: transactionId,
        uuid: uuid || ref || transactionId,
        mode_paiement: payMethod
      });

      if (result.success) {
        setNumFacture(result.num_facture);
        setPageState('SUCCESS');
      } else {
        throw new Error('Echec creation facture');
      }
    } catch (err) {
      console.error('Erreur creation facture panier:', err);
      setPageState('SUCCESS');
      setNumFacture('En cours de traitement');
    }
  };

  const handlePaymentFailed = (errorMsg: string) => {
    console.error('Paiement panier echoue:', errorMsg);
    setShowQRCode(false);
    setIsSubmitting(false);
    setError('Le paiement a echoue. Veuillez reessayer.');
    setTimeout(() => setError(''), 5000);
  };

  const handleClose = () => {
    if (pageState === 'SUCCESS') {
      setPageState('PANIER');
      setNumFacture('');
      setTelephone('');
      setIsSubmitting(false);
      onPaymentSuccess();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-500 to-emerald-600">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">
              {pageState === 'SUCCESS' ? 'Commande confirmee' : `Panier (${nbArticles})`}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto">
          {pageState === 'SUCCESS' ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">&#10003;</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Paiement reussi !</h3>
              <p className="text-gray-600 text-sm">
                Votre commande a ete enregistree avec succes.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Numero de facture</p>
                <p className="text-lg font-bold text-emerald-600">{numFacture}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
              >
                Fermer
              </button>
            </div>
          ) : pageState === 'PAYING' ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 font-medium">Creation de votre facture...</p>
            </div>
          ) : (
            <>
              {/* Liste articles */}
              {articles.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Votre panier est vide</p>
                </div>
              ) : (
                <div className="divide-y">
                  {articles.map(article => (
                    <div key={article.id_produit} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{article.nom_produit}</p>
                        <p className="text-xs text-emerald-600 font-medium">{formatMontant(article.prix_vente)}</p>
                      </div>

                      {/* Controles quantite */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onModifierQuantite(article.id_produit, -1)}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold">{article.quantite}</span>
                        <button
                          onClick={() => onModifierQuantite(article.id_produit, 1)}
                          disabled={article.quantite >= article.stock_disponible}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>

                      {/* Sous-total + supprimer */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatMontant(article.prix_vente * article.quantite)}</p>
                        <button
                          onClick={() => onSupprimer(article.id_produit)}
                          className="text-red-400 hover:text-red-600 transition-colors mt-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Paiement (seulement si panier non vide et etat PANIER) */}
        {pageState === 'PANIER' && articles.length > 0 && (
          <div className="border-t p-4 space-y-3 bg-gray-50">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-lg font-bold text-emerald-600">{formatMontant(total)}</span>
            </div>

            {/* Telephone */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Telephone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="77 123 45 67"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-gray-900 text-sm"
                  maxLength={9}
                />
              </div>
              {telephone.length > 0 && !/^(77|78|76|70|75)/.test(telephone) && (
                <p className="text-red-500 text-[10px] mt-0.5">Numero invalide (77, 78, 76, 70, 75)</p>
              )}
            </div>

            {/* Erreur */}
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            {/* Boutons paiement */}
            <p className="text-xs text-gray-500 text-center">Choisissez votre mode de paiement</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePayment('OM')}
                disabled={!isFormValid() || isSubmitting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl font-semibold text-xs hover:from-orange-500 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Image src="/images/om.png" alt="OM" width={22} height={22} className="rounded" />
                Payer
              </button>
              <button
                onClick={() => handlePayment('WAVE')}
                disabled={!isFormValid() || isSubmitting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold text-xs hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Image src="/images/wave.png" alt="Wave" width={22} height={22} className="rounded" />
                Payer
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modal QR Code paiement */}
      {showQRCode && selectedMethod && createPaymentContext() && (
        <ModalPaiementQRCode
          isOpen={showQRCode}
          onClose={() => { setShowQRCode(false); setIsSubmitting(false); }}
          paymentMethod={selectedMethod}
          paymentContext={createPaymentContext()!}
          onPaymentComplete={(statusResponse) => {
            // Capture les valeurs actuelles pour eviter closure stale
            handlePaymentComplete(statusResponse, selectedMethod, [...articles], total);
          }}
          onPaymentFailed={handlePaymentFailed}
        />
      )}
    </>
  );
}
