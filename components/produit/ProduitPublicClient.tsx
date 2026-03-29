'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Package,
  Tag,
  Phone,
  Minus,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Share2
} from 'lucide-react';
import Image from 'next/image';
import { decodeProduitParams, encodeFactureParams } from '@/lib/url-encoder';
import { onlineSellerService, ProduitPublic } from '@/services/online-seller.service';
import { recuService } from '@/services/recu.service';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';

interface ProduitPublicClientProps {
  token: string;
}

type PageState = 'LOADING' | 'PRODUCT' | 'PAYING' | 'SUCCESS' | 'MASCOTTE' | 'ERROR';

export default function ProduitPublicClient({ token }: ProduitPublicClientProps) {
  // Données produit
  const [produit, setProduit] = useState<ProduitPublic | null>(null);
  const [nomStructure, setNomStructure] = useState('');
  const [logoStructure, setLogoStructure] = useState<string | null>(null);
  const [idStructure, setIdStructure] = useState(0);

  // Formulaire client
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [quantite, setQuantite] = useState(1);

  // Paiement
  const [pageState, setPageState] = useState<PageState>('LOADING');
  const [error, setError] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Résultat
  const [numFacture, setNumFacture] = useState('');
  const [idFacture, setIdFacture] = useState<number | null>(null);

  // STORY-010 : Anti-abus - empêcher les doubles clics et soumissions multiples
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // Calculs
  const montantTotal = (produit?.prix_vente || 0) * quantite;

  const formatMontant = (m: number) => `${m.toLocaleString('fr-FR')} FCFA`;

  // Chargement du produit
  const loadProduit = useCallback(async () => {
    try {
      const decoded = decodeProduitParams(token);
      if (!decoded) {
        setError('Lien produit invalide');
        setPageState('ERROR');
        return;
      }

      setIdStructure(decoded.id_structure);

      const result = await onlineSellerService.getProduitPublic(
        decoded.id_structure,
        decoded.id_produit
      );

      setProduit(result.produit);
      setNomStructure(result.nom_structure);
      setLogoStructure(result.logo_structure);
      setPageState('PRODUCT');
    } catch (err) {
      console.error('❌ [PRODUIT-PUBLIC] Erreur chargement:', err);
      setError('Produit introuvable ou lien expiré');
      setPageState('ERROR');
    }
  }, [token]);

  useEffect(() => {
    loadProduit();
  }, [loadProduit]);

  // Validation formulaire
  const isFormValid = () => {
    return (
      /^(77|78|76|70|75)\d{7}$/.test(telephone) &&
      quantite >= 1 &&
      quantite <= (produit?.niveau_stock || 0)
    );
  };

  // Lancer le paiement - crée la facture draft AVANT pour obtenir id_facture + purl_success
  // STORY-010 : Anti-abus - cooldown 5s entre deux tentatives
  const handlePayment = async (method: PaymentMethod) => {
    if (!isFormValid() || !produit || isSubmitting) return;

    const now = Date.now();
    if (now - lastSubmitTime < 5000) return;

    setIsSubmitting(true);
    setLastSubmitTime(now);
    const clientPrenom = `Client_${telephone}`;
    setPrenom(clientPrenom);
    setSelectedPaymentMethod(method);

    try {
      // Créer facture draft (IMPAYEE) AVANT le paiement pour obtenir id_facture
      const draft = await onlineSellerService.createDraftFacture({
        id_structure: idStructure,
        id_produit: produit.id_produit,
        quantite,
        prenom: clientPrenom,
        telephone,
        montant: montantTotal,
      });

      setIdFacture(draft.id_facture);

      // Construire purl_success avec le token du reçu
      const baseUrl = window.location.origin;
      const recuToken = encodeFactureParams(idStructure, draft.id_facture);
      const purlSuccess = `${baseUrl}/recu?token=${recuToken}`;

      console.log('📋 [PRODUIT-PUBLIC] Facture draft créée:', draft.id_facture, '→ purl_success:', purlSuccess);

      // Stocker le contexte de paiement avec la vraie facture
      setDraftContext({ id_facture: draft.id_facture, purl_success: purlSuccess });
      setShowQRCode(true);
    } catch (err) {
      console.error('❌ [PRODUIT-PUBLIC] Erreur création facture draft:', err);
      setError('Erreur lors de la préparation du paiement');
      setIsSubmitting(false);
      setTimeout(() => setError(''), 5000);
    }
  };

  // État pour stocker le contexte de la facture draft
  const [draftContext, setDraftContext] = useState<{ id_facture: number; purl_success: string } | null>(null);

  // Contexte de paiement pour le modal QR — utilise la vraie facture draft
  const createPaymentContext = (): PaymentContext | null => {
    if (!produit || !draftContext) return null;
    return {
      facture: {
        id_facture: draftContext.id_facture,
        num_facture: `FAC-${draftContext.id_facture}`,
        nom_client: prenom.trim() || `Client_${telephone}`,
        tel_client: telephone,
        nom_structure: nomStructure,
        montant_total: montantTotal,
        montant_restant: montantTotal
      },
      montant_acompte: montantTotal,
      purl_success: draftContext.purl_success,
    };
  };

  // Callback après paiement réussi — la facture draft existe déjà, on enregistre le paiement
  // useCallback obligatoire pour éviter stale closure avec le polling ModalPaiementQRCode
  const handlePaymentComplete = useCallback(async (statusResponse?: {
    data?: {
      uuid?: string;
      reference_externe?: string;
      telephone?: string;
    }
  }) => {
    console.log('💳 [PRODUIT-PUBLIC] Paiement complété:', statusResponse);
    setShowQRCode(false);
    setPageState('PAYING');

    try {
      if (!draftContext || !selectedPaymentMethod) {
        throw new Error('Données manquantes (facture draft ou méthode)');
      }

      const uuid = statusResponse?.data?.uuid || '';
      const referenceExterne = statusResponse?.data?.reference_externe || '';
      const timestamp = Date.now();
      const transactionId = `${selectedPaymentMethod}-ONLINE-${idStructure}-${timestamp}`;

      // Étape 2 : enregistrer le paiement sur la facture draft existante
      const result = await onlineSellerService.registerPaymentOnline({
        id_structure: idStructure,
        id_facture: draftContext.id_facture,
        montant: montantTotal,
        transaction_id: transactionId,
        uuid: uuid || referenceExterne || transactionId,
        mode_paiement: selectedPaymentMethod as 'OM' | 'WAVE',
        telephone,
      });

      if (result.success) {
        setNumFacture(result.num_facture);
        setPageState('SUCCESS');
        console.log('🧾 [PRODUIT-PUBLIC] Paiement enregistré sur facture', draftContext.id_facture);

        // Transition vers mascotte après 2.5s
        setTimeout(() => setPageState('MASCOTTE'), 2500);
      } else {
        throw new Error('Échec enregistrement paiement');
      }
    } catch (err) {
      console.error('❌ [PRODUIT-PUBLIC] Erreur enregistrement paiement:', err);
      setPageState('SUCCESS');
      setNumFacture('En cours de traitement');
      setTimeout(() => setPageState('MASCOTTE'), 2500);
    }
  }, [draftContext, selectedPaymentMethod, idStructure, montantTotal, telephone]);

  const handlePaymentFailed = useCallback((errorMsg: string) => {
    console.error('❌ [PRODUIT-PUBLIC] Paiement échoué:', errorMsg);
    setShowQRCode(false);
    setIsSubmitting(false);
    setError('Le paiement a échoué. Veuillez réessayer.');
    setTimeout(() => setError(''), 5000);
  }, []);

  // Partage WhatsApp
  const handleShare = () => {
    const message = `Regardez ce produit !\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ========== RENDER ==========

  // Loading
  if (pageState === 'LOADING') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-sky-100 flex items-center justify-center p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-10 h-10 text-sky-600" />
        </motion.div>
      </div>
    );
  }

  // Erreur
  if (pageState === 'ERROR') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-semibold text-lg">{error}</p>
          <p className="text-red-400 text-sm mt-2">Ce lien ne fonctionne pas ou a expiré.</p>
        </div>
      </div>
    );
  }

  // Génération URL reçu
  const recuUrl = idFacture
    ? recuService.generateUrlPartage(idStructure, idFacture)
    : null;

  // Succès après paiement (fade-out vers mascotte)
  if (pageState === 'SUCCESS' || pageState === 'MASCOTTE') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {pageState === 'SUCCESS' && (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-3xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
              </motion.div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Paiement réussi !</h2>
              <p className="text-sm text-gray-600 mb-3">Votre achat a été confirmé.</p>

              <div className="bg-emerald-50 rounded-xl p-3 mb-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Produit</span>
                  <span className="font-medium text-gray-900">{produit?.nom_produit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quantité</span>
                  <span className="font-medium text-gray-900">{quantite}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant payé</span>
                  <span className="font-bold text-emerald-600 text-sm">{formatMontant(montantTotal)}</span>
                </div>
              </div>

              <p className="text-gray-400 text-[11px]">Préparation de votre reçu...</p>
            </motion.div>
          )}

          {pageState === 'MASCOTTE' && (
            <motion.div
              key="mascotte"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 150 }}
              className="max-w-sm w-full text-center"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Image
                  src="/images/mascotte.png"
                  alt="FayClick Mascotte"
                  width={180}
                  height={180}
                  className="mx-auto mb-4"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-xl p-5"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-1">Merci pour votre achat !</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Partagez le reçu au vendeur pour vous faire livrer.
                </p>

                {recuUrl ? (
                  <a
                    href={recuUrl}
                    className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Voir mon reçu
                  </a>
                ) : (
                  <button
                    onClick={handleShare}
                    className="w-full bg-green-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-600 transition-colors text-sm"
                  >
                    <Share2 className="w-5 h-5" />
                    Partager sur WhatsApp
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Création facture en cours
  if (pageState === 'PAYING') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-sky-100 flex items-center justify-center p-4">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-10 h-10 text-sky-600 mx-auto mb-4" />
          </motion.div>
          <p className="text-sky-700 font-medium">Création de votre facture...</p>
        </div>
      </div>
    );
  }

  // ========== PAGE PRODUIT (état PRODUCT) ==========
  if (!produit) return null;

  const stockDisponible = produit.niveau_stock > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-sky-100">
      {/* Header structure */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <a href={`/catalogue?id=${idStructure}`} className="flex-shrink-0">
            <Image
              src={logoStructure || '/images/logofayclick.png'}
              alt={nomStructure}
              width={40}
              height={40}
              className="rounded-full object-cover border-2 border-white/30"
            />
          </a>
          <a href={`/catalogue?id=${idStructure}`} className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-sm truncate">{nomStructure}</h1>
            <p className="text-green-200 text-xs">Vente en ligne</p>
          </a>
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-3 space-y-3">
        {/* Carte Produit */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Image produit */}
          <div className="flex justify-center pt-4 pb-2">
            <Image
              src={produit.photos?.[0]?.url_photo || '/images/mascotte.png'}
              alt={produit.nom_produit}
              width={120}
              height={120}
              className="object-contain rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).src = '/images/mascotte.png'; }}
            />
          </div>

          {/* Nom + catégorie */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {produit.nom_produit}
              </h2>
              <div className="flex-shrink-0 bg-sky-100 text-sky-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                {produit.nom_categorie || 'Produit'}
              </div>
            </div>
            {produit.description && (
              <p className="text-gray-500 text-xs leading-relaxed">{produit.description}</p>
            )}
          </div>

          {/* Prix + Stock */}
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-2">
              <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500">Prix</p>
                <p className="font-bold text-emerald-700 text-sm">{formatMontant(produit.prix_vente)}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-lg p-2 ${stockDisponible ? 'bg-blue-50' : 'bg-red-50'}`}>
              <Package className={`w-4 h-4 flex-shrink-0 ${stockDisponible ? 'text-blue-600' : 'text-red-500'}`} />
              <div>
                <p className="text-[10px] text-gray-500">Stock</p>
                <p className={`font-bold text-sm ${stockDisponible ? 'text-blue-700' : 'text-red-600'}`}>
                  {stockDisponible ? `${produit.niveau_stock} dispo` : 'Épuisé'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quantité + Total */}
        {stockDisponible && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-lg px-4 py-3"
          >
            <label className="text-xs text-gray-500 mb-2 block">Quantité</label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setQuantite(Math.max(1, quantite - 1))}
                disabled={quantite <= 1}
                className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xl font-bold text-gray-900 min-w-[1.5rem] text-center">{quantite}</span>
              <button
                onClick={() => setQuantite(Math.min(produit.niveau_stock, quantite + 1))}
                disabled={quantite >= produit.niveau_stock}
                className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-gray-600 text-sm font-medium">Total à payer</span>
              <span className="text-lg font-bold text-emerald-600">{formatMontant(montantTotal)}</span>
            </div>
          </motion.div>
        )}

        {/* Formulaire client + Paiement */}
        {stockDisponible && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg px-4 py-3 space-y-3"
          >
            <h3 className="font-semibold text-gray-900 text-sm">Votre numéro de paiement</h3>

            {/* Téléphone */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="77 123 45 67"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-gray-900 text-sm"
                  maxLength={9}
                />
              </div>
              {telephone.length > 0 && !/^(77|78|76|70|75)/.test(telephone) && (
                <p className="text-red-500 text-[10px] mt-0.5">Numéro invalide (77, 78, 76, 70, 75)</p>
              )}
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Boutons paiement - grille 2 colonnes */}
            <p className="text-xs text-gray-500 text-center">Choisissez votre mode de paiement</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Orange Money */}
              <button
                onClick={() => handlePayment('OM')}
                disabled={!isFormValid() || isSubmitting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl font-semibold text-xs hover:from-orange-500 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Image src="/images/om.png" alt="OM" width={22} height={22} className="rounded" />
                Payer {formatMontant(montantTotal)}
              </button>

              {/* Wave */}
              <button
                onClick={() => handlePayment('WAVE')}
                disabled={!isFormValid() || isSubmitting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold text-xs hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Image src="/images/wave.png" alt="Wave" width={22} height={22} className="rounded" />
                Payer {formatMontant(montantTotal)}
              </button>
            </div>
          </motion.div>
        )}

        {/* Stock épuisé */}
        {!stockDisponible && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Ce produit est en rupture de stock</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs pb-4">
          Propulsé par <span className="font-medium text-sky-500">FayClick</span>
        </p>
      </div>

      {/* Modal Paiement QR Code */}
      {showQRCode && selectedPaymentMethod && selectedPaymentMethod !== 'CASH' && createPaymentContext() && (
        <ModalPaiementQRCode
          isOpen={showQRCode}
          onClose={() => { setShowQRCode(false); setIsSubmitting(false); }}
          paymentMethod={selectedPaymentMethod as Exclude<PaymentMethod, 'CASH'>}
          paymentContext={createPaymentContext()!}
          onPaymentComplete={handlePaymentComplete}
          onPaymentFailed={handlePaymentFailed}
        />
      )}
    </div>
  );
}
