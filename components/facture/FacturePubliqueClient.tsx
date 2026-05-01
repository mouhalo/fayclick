'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  User,
  Calendar,
  Package,
  AlertCircle,
  Loader,
  Eye,
  EyeOff,
  ChevronDown,
  FileText,
  Copy,
  Check,
  Share2,
  Download,
  HelpCircle
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { decodeFactureParams, encodeFactureParams } from '@/lib/url-encoder';
import { facturePubliqueService } from '@/services/facture-publique.service';
import { recuService } from '@/services/recu.service';
import cataloguePublicService from '@/services/catalogue-public.service';
import whatsAppMessageService from '@/services/whatsapp-message.service';
import { FactureComplete } from '@/types/facture';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';
import PaymentFlipCard from './PaymentFlipCard';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate as formatDateLocale, toBcp47 } from '@/lib/format-locale';

interface FacturePubliqueClientProps {
  token: string;
}

export default function FacturePubliqueClient({ token }: FacturePubliqueClientProps) {
  const { isMobile, isMobileLarge, isTablet, isDesktop, isDesktopLarge } = useBreakpoint();
  const t = useTranslations('publicFacture');
  const { locale } = useLanguage();

  // Déterminer le type d'écran pour les 3 breakpoints principaux
  const screenType = (isMobile || isMobileLarge) ? 'mobile' : isTablet ? 'tablet' : 'desktop';
  const [facture, setFacture] = useState<FactureComplete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour l'affichage
  const [showPrices, setShowPrices] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // États pour le système de paiement
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // État pour le bouton Copier
  const [copied, setCopied] = useState(false);

  const loadFacture = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Décoder les paramètres depuis l'URL
      const result = decodeFactureParams(token);

      if (!result || !result.id_structure || !result.id_facture) {
        throw new Error(t('errorInvalidToken'));
      }

      const { id_structure: idStructure, id_facture: idFacture } = result;

      // Charger les détails de la facture
      const factureData = await facturePubliqueService.getFacturePublique(idStructure, idFacture);

      if (!factureData) {
        throw new Error(t('errorNotFound'));
      }

      // Assertion de type pour unknown vers FactureComplete
      const typedFactureData = factureData as FactureComplete;
      setFacture(typedFactureData);

      // Debug: Vérifier le contenu du logo
      console.log('🔍 Debug facture data:', {
        id_facture: typedFactureData.facture.id_facture,
        nom_structure: typedFactureData.facture.nom_structure,
        logo: typedFactureData.facture.logo,
        logo_type: typeof typedFactureData.facture.logo,
        logo_length: typedFactureData.facture.logo?.length
      });

      // Si la facture est déjà payée, rediriger immédiatement vers le reçu.
      // Cas d'usage : marchand qui clique sur le bouton "Facture" dans la
      // notification WhatsApp achat_confirme_ok (Meta exige une URL /facture
      // dans le template, mais le marchand veut voir le reçu généré).
      const isPaid =
        typedFactureData.facture.id_etat !== 1 ||
        typedFactureData.facture.mt_restant === 0;
      if (isPaid) {
        const recuUrl = recuService.generateUrlPartage(
          typedFactureData.facture.id_structure,
          typedFactureData.facture.id_facture
        );
        console.log('✅ [FACTURE-PUBLIQUE] Facture déjà payée, redirection vers reçu:', recuUrl);
        window.location.replace(recuUrl);
        return;
      }

    } catch (err: unknown) {
      console.error('Erreur lors du chargement de la facture:', err);
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    loadFacture();
  }, [loadFacture]);

  const formatMontant = (montant: number): string => {
    return formatCurrency(montant, locale, { devise: 'FCFA' });
  };

  // Fonction pour copier le numéro de facture
  const handleCopyNumFacture = async () => {
    if (!facture) return;
    try {
      await navigator.clipboard.writeText(facture.facture.num_facture);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  // Fonction pour partager la facture
  const handleShare = async () => {
    if (!facture) return;
    const shareData = {
      title: t('shareTitle', { num: facture.facture.num_facture }),
      text: t('shareText', { structure: facture.facture.nom_structure, amount: formatMontant(facture.facture.montant) }),
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert(t('linkCopied'));
      }
    } catch (err) {
      console.error('Erreur partage:', err);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(toBcp47(locale), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Fonction de gestion du paiement directe
  const handleWalletPayment = (method: PaymentMethod) => {
    if (!facture || facture.facture.id_etat !== 1) return;
    setSelectedPaymentMethod(method);
    setShowQRCode(true);
  };

  const createPaymentContext = (): PaymentContext | null => {
    if (!facture) return null;

    // Construire purl_success vers la page reçu (cohérence avec /produit
    // et /catalogue qui passent ce param au service de paiement).
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://v2.fayclick.net';
    const recuToken = encodeFactureParams(
      facture.facture.id_structure,
      facture.facture.id_facture
    );
    const purlSuccess = `${baseUrl}/recu?token=${recuToken}`;

    return {
      facture: {
        id_facture: facture.facture.id_facture,
        num_facture: facture.facture.num_facture,
        nom_client: facture.facture.nom_client,
        tel_client: facture.facture.tel_client,
        montant_total: facture.facture.montant,
        montant_restant: facture.facture.mt_restant
      },
      montant_acompte: facture.facture.mt_restant, // Paiement du montant restant
      purl_success: purlSuccess
    };
  };

  const handleWalletPaymentComplete = async (statusResponse?: {
    data?: {
      uuid?: string;
      reference_externe?: string;
      telephone?: string;
      montant?: string | number;
    }
  }) => {
    console.log('💳 [FACTURE-PUBLIQUE] Paiement complété, statusResponse:', statusResponse);

    // Fermer le modal QR code
    setShowQRCode(false);

    // Vérifier qu'on a les données nécessaires
    if (!facture || !selectedPaymentMethod) {
      console.error('❌ [FACTURE-PUBLIQUE] Données manquantes pour enregistrer le paiement');
      setPaymentSuccess(true);
      setTimeout(() => loadFacture(), 2000);
      return;
    }

    // Extraire les données du paiement
    const uuid = statusResponse?.data?.uuid || '';
    const referenceExterne = statusResponse?.data?.reference_externe || '';
    const telephone = statusResponse?.data?.telephone || facture.facture.tel_client || '000000000';

    // Construire le transaction_id
    const timestamp = Date.now();
    const transactionId = `${selectedPaymentMethod}-PUB-${facture.facture.id_structure}-${timestamp}`;

    console.log('💰 [FACTURE-PUBLIQUE] Enregistrement acompte:', {
      id_structure: facture.facture.id_structure,
      id_facture: facture.facture.id_facture,
      montant: facture.facture.mt_restant,
      mode_paiement: selectedPaymentMethod,
      uuid,
      transactionId
    });

    try {
      // Appeler le service pour enregistrer l'acompte
      const result = await facturePubliqueService.addAcomptePublique({
        id_structure: facture.facture.id_structure,
        id_facture: facture.facture.id_facture,
        montant_acompte: facture.facture.mt_restant,
        transaction_id: transactionId,
        uuid: uuid || referenceExterne || transactionId,
        mode_paiement: selectedPaymentMethod as 'OM' | 'WAVE' | 'FREE',
        telephone
      });

      console.log('📋 [FACTURE-PUBLIQUE] Résultat enregistrement:', result);

      if (result.success) {
        console.log('✅ [FACTURE-PUBLIQUE] Paiement + reçu enregistrés par add_acompte_facture1:', result.data);
        setPaymentSuccess(true);

        // Le reçu est créé automatiquement par add_acompte_facture1 côté BD
        // Rediriger vers la page reçu public après 2.5s
        const recuUrl = recuService.generateUrlPartage(
          facture.facture.id_structure,
          facture.facture.id_facture
        );
        console.log('🔗 [FACTURE-PUBLIQUE] Redirection vers reçu:', recuUrl);

        // ===== Notification WhatsApp MARCHAND (best-effort, non bloquant) =====
        // Template `achat_confirme_ok` : informe le marchand qu'un paiement
        // vient d'être reçu sur sa facture publique. URL = page reçu (déjà payée).
        try {
          const contact = await cataloguePublicService.getStructureContact(
            facture.facture.id_structure
          );
          const phoneMarchand = contact?.mobile_om || contact?.mobile_wave;
          if (phoneMarchand && telephone) {
            // ⚠️ Template Meta exige https://fayclick.com/facture (whitelist).
            // La page /facture redirige auto vers /recu si payée.
            const factureUrl = recuService.generateUrlFactureCanonique(
              facture.facture.id_structure,
              facture.facture.id_facture
            );
            await whatsAppMessageService.sendPurchaseConfirmedNotification(
              phoneMarchand,
              telephone,
              facture.facture.mt_restant,
              selectedPaymentMethod || 'OM',
              factureUrl
            );
          }
        } catch (waErr) {
          console.warn('[FACTURE-PUBLIQUE] Notification marchand WhatsApp échec', waErr);
        }

        setTimeout(() => {
          window.location.href = recuUrl;
        }, 2500);
        return;
      } else {
        console.error('❌ [FACTURE-PUBLIQUE] Échec enregistrement:', result.message);
        setPaymentSuccess(true);
      }
    } catch (err) {
      console.error('❌ [FACTURE-PUBLIQUE] Erreur lors de l\'enregistrement:', err);
      setPaymentSuccess(true);
    }

    // Recharger la facture pour voir le nouveau statut (fallback si pas de redirection reçu)
    setTimeout(() => {
      loadFacture();
    }, 2000);
  };

  const handleWalletPaymentFailed = (error: string) => {
    setShowQRCode(false);
    alert(t('paymentFailed', { error }));
  };

  // Styles responsifs pour les 3 breakpoints : Mobile, Tablette, PC
  const getStyles = () => {
    switch (screenType) {
      case 'mobile':
        return {
          container: 'px-3 py-4',
          maxWidth: 'max-w-md',
          card: 'p-3',
          headerPadding: 'px-4 py-3',
          title: 'text-lg',
          subtitle: 'text-sm',
          buttonText: 'text-sm',
          infoGrid: 'grid-cols-1 gap-3',
        };
      case 'tablet':
        return {
          container: 'px-6 py-6',
          maxWidth: 'max-w-xl',
          card: 'p-5',
          headerPadding: 'px-5 py-4',
          title: 'text-xl',
          subtitle: 'text-base',
          buttonText: 'text-base',
          infoGrid: 'grid-cols-2 gap-4',
        };
      default: // desktop
        return {
          container: 'px-8 py-8',
          maxWidth: 'max-w-2xl',
          card: 'p-6',
          headerPadding: 'px-6 py-5',
          title: 'text-2xl',
          subtitle: 'text-lg',
          buttonText: 'text-base',
          infoGrid: 'grid-cols-2 gap-6',
        };
    }
  };

  const styles = getStyles();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-green-700 font-medium">{t('loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-800 mb-2">{t('errorTitle')}</h1>
          <p className="text-red-600 mb-4">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!facture) return null;

  // Déterminer si la facture est payée
  const isPaid = facture.facture.id_etat !== 1 || facture.facture.mt_restant === 0;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 ${styles.container}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${styles.maxWidth} mx-auto`}
      >
        {/* ========== CARTE PRINCIPALE CONTENEUR ========== */}
        <div className="bg-gradient-to-b from-white/80 via-white/60 to-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">

          {/* ========== HEADER VERT ========== */}
          <div className="relative">
            <div className={`bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 ${styles.headerPadding} pb-14`}>
              <div className="flex items-center justify-between">
                {/* Logo + Nom Structure */}
                <div className="flex items-center gap-3">
                  {facture.facture.logo && facture.facture.logo.trim() !== '' ? (
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={facture.facture.logo}
                        alt={t('logoAlt', { name: facture.facture.nom_structure })}
                        className={`${screenType === 'mobile' ? 'h-8' : 'h-10'} w-auto object-contain`}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className={`bg-white/20 backdrop-blur-sm rounded-xl ${screenType === 'mobile' ? 'p-2.5' : 'p-3'}`}>
                      <Receipt className={`${screenType === 'mobile' ? 'w-6 h-6' : 'w-7 h-7'} text-white`} />
                    </div>
                  )}
                  <div>
                    <h1 className={`${styles.title} font-bold text-white`}>
                      {facture.facture.nom_structure}
                    </h1>
                    <p className={`${styles.subtitle} text-white/80 flex items-center gap-1`}>
                      <Calendar className={`${screenType === 'mobile' ? 'w-3 h-3' : 'w-4 h-4'}`} />
                      {t('issuedOn', { date: formatDate(facture.facture.date_facture) })}
                    </p>
                  </div>
                </div>

                {/* Badge Statut */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold shadow-lg ${
                    isPaid
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  } ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                    <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></span>
                    {isPaid ? t('statusPaid') : t('statusPending')}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Demi-cercle décoratif doré */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
              <div className={`${screenType === 'mobile' ? 'w-16 h-8' : 'w-20 h-10'} bg-gradient-to-b from-amber-400 to-amber-500 rounded-b-full border-4 border-white shadow-lg`}></div>
            </div>
          </div>

          {/* ========== CARTE INFOS FACTURE (superposée) ========== */}
          <div className="relative -mt-6 mx-3 z-10">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 pt-6">
              {/* Message de succès de paiement */}
              {paymentSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-center"
                >
                  <div className="text-green-700 font-semibold flex items-center justify-center gap-2 text-sm">
                    <Check className="w-4 h-4" />
                    {t('paymentConfirmed')}
                  </div>
                </motion.div>
              )}

              <h3 className={`font-bold text-gray-800 mb-3 flex items-center gap-2 ${screenType === 'mobile' ? 'text-sm' : 'text-base'}`}>
                <FileText className={`${screenType === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'} text-green-600`} />
                {t('infoTitle')}
              </h3>

              {/* N° Facture avec bouton Copier */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 mb-2">
                <div className="flex items-center gap-2">
                  <Receipt className={`${screenType === 'mobile' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-500`} />
                  <span className={`font-mono font-bold text-gray-800 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                    {t('invoiceNumber', { num: facture.facture.num_facture })}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyNumFacture}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  } ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('copied') : t('copy')}
                </motion.button>
              </div>

              {/* Client */}
              <div className="flex items-center gap-2 mb-3">
                <User className={`${screenType === 'mobile' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-500`} />
                <span className={`text-gray-700 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                  {t('clientLabel')} <span className="font-medium text-gray-900">{facture.facture.nom_client}</span> · {facture.facture.tel_client}
                </span>
              </div>

              {/* Boutons Partager / Télécharger PDF - Style pilule compact */}
              <div className="flex gap-2 justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShare}
                  className={`flex items-center gap-1.5 py-2 px-4 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-full font-medium shadow-sm transition-all ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}
                >
                  <Share2 className="w-4 h-4" />
                  {t('share')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-1.5 py-2 px-4 bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50 rounded-full font-medium shadow-sm transition-all ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}
                >
                  <Download className="w-4 h-4" />
                  {t('downloadPdf')}
                </motion.button>
              </div>
            </div>
          </div>

          {/* ========== CARTE MONTANT À PAYER (avec flip pour les wallets) ========== */}
          <div className="mx-3 mt-3">
            <PaymentFlipCard
              montantRestant={facture.facture.mt_restant}
              montantTotal={facture.facture.montant}
              montantAcompte={facture.facture.mt_acompte}
              isPaid={isPaid}
              screenType={screenType}
              onSelectPaymentMethod={handleWalletPayment}
              formatMontant={formatMontant}
            />
          </div>

          {/* ========== BOUTON DÉTAILS DE LA VENTE ========== */}
          <div className="mx-3 mt-2 mb-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setShowDetails(!showDetails)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}
            >
              <Package className={`${screenType === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'} text-gray-600`} />
              <span className="font-medium text-gray-700">
                {showDetails ? t('hideDetails') : t('showDetails')}
              </span>
              <motion.div
                animate={{ rotate: showDetails ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className={`${screenType === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'} text-gray-500`} />
              </motion.div>
            </motion.button>
          </div>

          {/* ========== FOOTER DANS LA CARTE ========== */}
          <div className="border-t border-gray-100 py-3 px-4 text-center">
            <div className={`flex items-center justify-center gap-4 text-gray-500 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
              <button className="hover:text-green-600 transition-colors flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                {t('help')}
              </button>
              <span>·</span>
              <button className="hover:text-green-600 transition-colors">
                {t('legal')}
              </button>
            </div>
            <p className={`mt-2 font-semibold text-green-600 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
              🌿 FayClick
            </p>
          </div>
        </div>

        {/* ========== SECTION DÉPLIABLE - DÉTAILS DE LA VENTE ========== */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden mt-4"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.1 }}
                className={`bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 ${styles.card}`}
              >
                {/* Header de la section détails */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-gray-900 flex items-center gap-2 ${screenType === 'mobile' ? 'text-sm' : 'text-base'}`}>
                    <Package className={`${screenType === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'} text-green-600`} />
                    {t('orderDetails')}
                  </h3>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPrices(!showPrices)}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 rounded-lg shadow-sm transition-all ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}
                  >
                    {showPrices ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="font-medium">
                      {showPrices ? t('hidePrices') : t('showPrices')}
                    </span>
                  </motion.button>
                </div>

                {/* Tableau des produits */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-green-50/50">
                        <th className={`text-left py-2 px-3 font-medium text-gray-900 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>{t('tableProduct')}</th>
                        <th className={`text-center py-2 px-3 font-medium text-gray-900 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>{t('tableQty')}</th>
                        {showPrices && (
                          <>
                            <th className={`text-right py-2 px-3 font-medium text-gray-900 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>{t('tableUnitPrice')}</th>
                            <th className={`text-right py-2 px-3 font-medium text-gray-900 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>{t('tableTotal')}</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {facture.details?.map((item, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="border-b border-gray-100 hover:bg-green-50/30 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div>
                              <p className={`font-medium text-gray-900 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>{item.nom_produit}</p>
                              <p className={`text-gray-500 ${screenType === 'mobile' ? 'text-[10px]' : 'text-xs'}`}>{t('productCode', { id: item.id_produit })}</p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3 font-medium">
                            <span className={`bg-green-100 text-green-800 px-2 py-0.5 rounded-full ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                              {item.quantite}
                            </span>
                          </td>
                          {showPrices && (
                            <>
                              <td className={`text-right py-3 px-3 text-gray-700 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                                {formatMontant(item.prix)}
                              </td>
                              <td className={`text-right py-3 px-3 font-bold text-gray-900 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                                {formatMontant(item.sous_total)}
                              </td>
                            </>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                    {showPrices && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gradient-to-r from-green-50 to-emerald-50">
                          <td colSpan={3} className={`text-right py-3 px-3 font-bold text-gray-900 ${screenType === 'mobile' ? 'text-sm' : 'text-base'}`}>
                            {t('grandTotal')}
                          </td>
                          <td className={`text-right py-3 px-3 font-bold text-green-600 ${screenType === 'mobile' ? 'text-base' : 'text-lg'}`}>
                            {formatMontant(facture.facture.montant)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {!showPrices && (
                  <div className="mt-4 text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className={`text-amber-800 ${screenType === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                      <Eye className="w-3 h-3 inline mr-2" />
                      {t('pricesHidden')}
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {/* ========== MODAL QR CODE ========== */}
      {facture && selectedPaymentMethod && selectedPaymentMethod !== 'CASH' && (
        <ModalPaiementQRCode
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          paymentMethod={selectedPaymentMethod}
          paymentContext={createPaymentContext()!}
          onPaymentComplete={handleWalletPaymentComplete}
          onPaymentFailed={handleWalletPaymentFailed}
        />
      )}
    </div>
  );
}