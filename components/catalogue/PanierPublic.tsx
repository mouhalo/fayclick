/**
 * Panier public pour le catalogue - Drawer Dark Premium avec paiement OM/Wave
 */

'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart, CheckCircle, ExternalLink, Shield } from 'lucide-react';
import Image from 'next/image';
import { ArticlePanier } from '@/services/online-seller.service';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentContext } from '@/types/payment-wallet';
import { onlineSellerService } from '@/services/online-seller.service';
import { recuService } from '@/services/recu.service';
import { encodeFactureParams } from '@/lib/url-encoder';
import cataloguePublicService from '@/services/catalogue-public.service';
import whatsAppMessageService from '@/services/whatsapp-message.service';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/format-locale';

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
  const t = useTranslations('catalogue');
  const { locale } = useLanguage();
  const [telephone, setTelephone] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'OM' | 'WAVE' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [pageState, setPageState] = useState<PageState>('PANIER');
  const [numFacture, setNumFacture] = useState('');
  const [idFacture, setIdFacture] = useState<number | null>(null);
  const [error, setError] = useState('');

  const total = articles.reduce((sum, a) => sum + a.prix_vente * a.quantite, 0);
  const nbArticles = articles.reduce((sum, a) => sum + a.quantite, 0);

  const formatMontant = (m: number) => formatCurrency(m, locale, { devise: 'FCFA' });

  const isFormValid = () => {
    return telephone.length === 9 && /^7\d{8}$/.test(telephone) && articles.length > 0;
  };

  // État pour stocker le contexte de la facture draft
  const [draftContext, setDraftContext] = useState<{ id_facture: number; purl_success: string } | null>(null);

  // Verrous synchrones pour empêcher double création/enregistrement
  const isCreatingDraft = useRef(false);
  const isRegisteringPayment = useRef(false);

  // Anti-abus : cooldown 5s entre deux tentatives
  // Crée la facture draft AVANT le paiement pour obtenir id_facture + purl_success
  const handlePayment = async (method: 'OM' | 'WAVE') => {
    if (!isFormValid() || isSubmitting || isCreatingDraft.current) return;
    const now = Date.now();
    if (now - lastSubmitTime < 5000) return;

    isCreatingDraft.current = true;
    setIsSubmitting(true);
    setLastSubmitTime(now);
    setSelectedMethod(method);

    try {
      // Réutiliser la facture draft existante si on re-clique après fermeture du modal
      if (draftContext) {
        console.log('♻️ [PANIER-PUBLIC] Réutilisation facture draft existante:', draftContext.id_facture);
        setShowQRCode(true);
        return;
      }

      const draft = await onlineSellerService.createDraftFacture({
        id_structure: idStructure,
        articles,
        prenom: `Client_${telephone}`,
        telephone,
        montant: total,
      });

      setIdFacture(draft.id_facture);

      const baseUrl = window.location.origin;
      const recuToken = encodeFactureParams(idStructure, draft.id_facture);
      const purlSuccess = `${baseUrl}/recu?token=${recuToken}`;

      console.log('📋 [PANIER-PUBLIC] Facture draft créée:', draft.id_facture, '→ purl_success:', purlSuccess);

      setDraftContext({ id_facture: draft.id_facture, purl_success: purlSuccess });
      setShowQRCode(true);
    } catch (err) {
      console.error('❌ [PANIER-PUBLIC] Erreur création facture draft:', err);
      setError(t('panier.errors.paymentPrepFailed'));
      setIsSubmitting(false);
      setTimeout(() => setError(''), 5000);
    } finally {
      isCreatingDraft.current = false;
    }
  };

  const createPaymentContext = (): PaymentContext | null => {
    if (articles.length === 0 || !draftContext) return null;
    return {
      facture: {
        id_facture: draftContext.id_facture,
        num_facture: `FAC-${draftContext.id_facture}`,
        nom_client: `Client_${telephone}`,
        tel_client: telephone,
        nom_structure: nomStructure,
        montant_total: total,
        montant_restant: total
      },
      montant_acompte: total,
      purl_success: draftContext.purl_success,
    };
  };

  const handlePaymentComplete = async (
    statusResponse?: { data?: { uuid?: string; reference_externe?: string } },
    method?: 'OM' | 'WAVE',
    _articlesSnapshot?: ArticlePanier[],
    totalSnapshot?: number
  ) => {
    // Protection contre double appel
    if (isRegisteringPayment.current) {
      console.warn('⚠️ [PANIER-PUBLIC] registerPayment déjà en cours, ignoré');
      return;
    }
    isRegisteringPayment.current = true;

    setShowQRCode(false);
    setPageState('PAYING');

    const payMethod = method || selectedMethod;
    const payTotal = totalSnapshot || total;

    try {
      if (!payMethod || !draftContext) throw new Error(t('panier.errors.methodMissing'));

      const uuid = statusResponse?.data?.uuid || '';
      const ref = statusResponse?.data?.reference_externe || '';
      const timestamp = Date.now();
      const transactionId = `${payMethod}-PANIER-${idStructure}-${timestamp}`;

      // Étape 2 : enregistrer le paiement sur la facture draft existante
      const result = await onlineSellerService.registerPaymentOnline({
        id_structure: idStructure,
        id_facture: draftContext.id_facture,
        montant: payTotal,
        transaction_id: transactionId,
        uuid: uuid || ref || transactionId,
        mode_paiement: payMethod,
        telephone,
      });

      if (result.success) {
        setNumFacture(result.num_facture);
        setPageState('SUCCESS');

        const recuUrl = recuService.generateUrlPartage(idStructure, draftContext.id_facture);
        console.log('🔗 [PANIER] Redirection vers reçu:', recuUrl);

        // ===== Notification WhatsApp MARCHAND (best-effort, non bloquant) =====
        // Template `achat_confirme_ok` : informe le marchand qu'un paiement vient
        // d'être reçu sur son catalogue public. Utilise mobile_om en priorité.
        // En cas d'échec : juste un warn console (l'achat est validé pour le client).
        try {
          const contact = await cataloguePublicService.getStructureContact(idStructure);
          const phoneMarchand = contact?.mobile_om || contact?.mobile_wave;
          if (phoneMarchand && telephone) {
            await whatsAppMessageService.sendPurchaseConfirmedNotification(
              phoneMarchand,
              telephone,
              payTotal,
              payMethod,
              recuUrl
            );
          }
        } catch (waErr) {
          console.warn('[PANIER-PUBLIC] Notification marchand WhatsApp échec', waErr);
        }

        setTimeout(() => {
          window.location.href = recuUrl;
        }, 3000);
      } else {
        throw new Error(t('panier.errors.registerFailed'));
      }
    } catch (err) {
      console.error('Erreur enregistrement paiement panier:', err);
      setPageState('SUCCESS');
      setNumFacture('En cours de traitement');
    }
  };

  const handlePaymentFailed = (errorMsg: string) => {
    console.error('Paiement panier echoue:', errorMsg);
    setShowQRCode(false);
    setIsSubmitting(false);
    setError(t('panier.errors.paymentFailed'));
    setTimeout(() => setError(''), 5000);
  };

  const handleClose = () => {
    if (pageState === 'SUCCESS') {
      setPageState('PANIER');
      setNumFacture('');
      setIdFacture(null);
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

      {/* Drawer Dark */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-800 border-l border-white/10 z-50 shadow-2xl flex flex-col"
      >
        {/* Header — Stitch style: X gauche, titre centre */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
          <h2 className="text-lg font-bold text-white">
            {pageState === 'SUCCESS' ? t('panier.titleConfirmed') : t('panier.title', { count: nbArticles })}
          </h2>
          <div className="w-8" /> {/* Spacer pour centrer le titre */}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto">
          {pageState === 'SUCCESS' ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('panier.paymentSuccess')}</h3>
              <p className="text-white/60 text-sm">
                {t('panier.orderRegistered')}
              </p>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/40">{t('panier.invoiceNumber')}</p>
                <p className="text-lg font-bold text-emerald-400">{numFacture}</p>
              </div>

              {idFacture && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    {t('panier.redirectingReceipt')}
                  </div>
                  <button
                    onClick={() => {
                      const recuUrl = recuService.generateUrlPartage(idStructure, idFacture);
                      window.location.href = recuUrl;
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t('panier.viewReceipt')}
                  </button>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full py-3 bg-white/10 text-white/70 rounded-xl font-semibold hover:bg-white/15 transition-colors border border-white/10"
              >
                {t('panier.close')}
              </button>
            </div>
          ) : pageState === 'PAYING' ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-white/70 font-medium">{t('panier.creatingInvoice')}</p>
            </div>
          ) : (
            <>
              {/* Liste articles */}
              {articles.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">{t('panier.empty')}</p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  {articles.map(article => (
                    <div key={article.id_produit} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      {/* Miniature produit — Stitch 48x48 */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/10">
                        {article.photo_url ? (
                          <Image
                            src={article.photo_url}
                            alt={article.nom_produit}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-white/20" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{article.nom_produit}</p>
                        <p className="text-xs text-emerald-400 font-medium">{formatMontant(article.prix_vente)}</p>
                      </div>

                      {/* Controles quantite — Stitch: - N + */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onModifierQuantite(article.id_produit, -1)}
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-emerald-400 font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-white">{article.quantite}</span>
                        <button
                          onClick={() => onModifierQuantite(article.id_produit, 1)}
                          disabled={article.quantite >= article.stock_disponible}
                          className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 disabled:opacity-30 transition-colors text-emerald-400 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
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
          <div className="border-t border-white/10 p-4 space-y-3 bg-slate-900/80">
            {/* Sous-total + Livraison separes (Stitch) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50">{t('panier.subtotal')}</span>
                <span className="text-white font-medium">{formatMontant(total)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50">{t('panier.shipping')}</span>
                <span className="text-emerald-400 font-semibold">{t('panier.shippingFree')}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                <span className="text-white font-bold">{t('panier.total')}</span>
                <span className="text-xl font-bold text-emerald-400">{formatMontant(total)}</span>
              </div>
            </div>

            {/* Telephone */}
            <div>
              <label className="text-xs text-white/40 mb-1 block">{t('panier.phoneLabel')}</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center gap-1 text-white/40 text-xs pointer-events-none">
                  <span>🇸🇳</span>
                  <span>+221</span>
                </div>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder={t('panier.phonePlaceholder')}
                  className="w-full pl-[4.5rem] pr-3 py-2.5 rounded-xl bg-white/10 border border-white/10 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all text-white text-sm placeholder-white/30"
                  maxLength={9}
                />
              </div>
              {telephone.length > 0 && !/^7/.test(telephone) && (
                <p className="text-red-400 text-[10px] mt-0.5">{t('panier.phoneMustStart7')}</p>
              )}
            </div>

            {/* Erreur */}
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}

            {/* Boutons paiement — Stitch: OM vert, Wave jaune */}
            <div className="space-y-2">
              <button
                onClick={() => handlePayment('OM')}
                disabled={!isFormValid() || isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25"
              >
                <Image src="/images/om.png" alt="OM" width={22} height={22} className="rounded" />
                {t('panier.payWithOm')}
              </button>
              <button
                onClick={() => handlePayment('WAVE')}
                disabled={!isFormValid() || isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/25"
              >
                <Image src="/images/wave.png" alt="Wave" width={22} height={22} className="rounded" />
                {t('panier.payWithWave')}
              </button>
            </div>

            {/* Securite (Stitch) */}
            <p className="text-[10px] text-white/30 text-center flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              {t('panier.secureInfo')}
            </p>
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
