/**
 * Modal de succès après création de facture
 * Design glassmorphisme bleu clair avec QR Code et partage WhatsApp
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, QrCode as QrIcon, MessageCircle,
  Copy, ExternalLink, Download, ChevronDown
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import QRCode from 'react-qr-code';
import { factureService } from '@/services/facture.service';
import { authService } from '@/services/auth.service';
import { encodeFactureParams } from '@/lib/url-encoder';
import { produitsService } from '@/services/produits.service';
import { useFactureSuccessStore } from '@/hooks/useFactureSuccess';
import { PaymentMethodSelector } from '@/components/factures/PaymentMethodSelector';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';
import { AjouterAcompteData } from '@/types/facture';

export function ModalFactureSuccess() {
  const { isOpen, factureId, closeModal } = useFactureSuccessStore();
  const { isMobile, isMobileLarge,  isDesktop } = useBreakpoint();
  const [factureDetails, setFactureDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);

  // États pour la gestion des paiements
  const [showPaymentSection, setShowPaymentSection] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // États pour les modals de paiement
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Générer les URLs seulement quand les données sont disponibles
  const urls = useMemo(() => {
    // Conditions de sécurité
    if (!factureDetails || !factureId || factureId <= 0) {
      return { simple: '', encoded: '', full: '' };
    }
    
    try {
      const user = authService.getUser();
      const idStructure = user?.id_structure || factureDetails.id_structure;
      
      // Validation supplémentaire
      if (!idStructure || idStructure <= 0) {
        console.warn('ID structure invalide pour génération URL');
        return { simple: '', encoded: '', full: '' };
      }
      
      // URL simple format: /fay/{id_structure}#{id_facture}
      const simpleUrl = `/fay/${idStructure}%23${factureId}`;
      
      // URL encodée avec token
      const token = encodeFactureParams(idStructure, factureId);
      const encodedUrl = `/facture?token=${token}`;
      
      // URL complète avec domaine (utilise l'URL encodée pour être sûr)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${baseUrl}${encodedUrl}`;
      
      return { simple: simpleUrl, encoded: encodedUrl, full: fullUrl };
    } catch (error) {
      console.error('Erreur génération URLs facture:', error);
      return { simple: '', encoded: '', full: '' };
    }
  }, [factureDetails, factureId]);

  useEffect(() => {
    if (isOpen && factureId) {
      // Reset initial complet seulement à la PREMIÈRE ouverture
      if (!hasInitialized) {
        console.log('🎯 [FACTURE-SUCCESS] Initialisation complète');
        setPaymentError('');
        setPaymentSuccess(false);
        setSelectedPaymentMethod(null);
        setShowPaymentSection(true);
        setShowQRCodeModal(false); // Reset initial uniquement
        setPaymentLoading(false);
        setHasInitialized(true);
      } else {
        console.log('🔄 [FACTURE-SUCCESS] Rechargement - préservation états QR');
      }

      loadFactureDetails();
    } else if (!isOpen) {
      // Reset pour la prochaine ouverture
      setHasInitialized(false);
    }
  }, [isOpen, factureId, hasInitialized]);

  const loadFactureDetails = async () => {
    if (!factureId) return;
    
    try {
      setLoading(true);
      setError(null);
      const details = await factureService.getFactureDetails(factureId);
      setFactureDetails(details);
      
      // Actualiser les produits après création de facture
      try {
        await produitsService.getListeProduits({});
        console.log('✅ Stocks actualisés après création de facture');
      } catch (error) {
        console.error('Erreur actualisation produits:', error);
      }
    } catch (err: any) {
      console.error('Erreur chargement détails facture:', err);
      setError(err.message || 'Impossible de charger les détails');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!urls.full) {
      console.warn('URL non disponible pour copie');
      return;
    }
    try {
      await navigator.clipboard.writeText(urls.full);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Erreur copie URL:', err);
    }
  };

  const handleWhatsAppShare = () => {
    if (!factureDetails) return;
    
    const phoneNumber = factureDetails.tel_client || '771234567';
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const senegalPhone = cleanPhone.startsWith('221') ? cleanPhone : `221${cleanPhone}`;
    
    const message = encodeURIComponent(
      `🧾 *Facture ${factureDetails.num_facture}*\n\n` +
      `💰 Montant: ${factureDetails.montant?.toLocaleString('fr-FR')} FCFA\n` +
      `${factureDetails.mt_remise > 0 ? `🎁 Remise: ${factureDetails.mt_remise?.toLocaleString('fr-FR')} FCFA\n` : ''}` +
      `${factureDetails.mt_acompte > 0 ? `✅ Acompte: ${factureDetails.mt_acompte?.toLocaleString('fr-FR')} FCFA\n` : ''}` +
      `📊 *Reste à payer: ${factureDetails.mt_restant?.toLocaleString('fr-FR')} FCFA*\n\n` +
      `🔗 Voir la facture:\n${urls.full || 'URL en cours de génération...'}\n\n` +
      `_Merci pour votre confiance !_`
    );
    
    window.open(`https://wa.me/${senegalPhone}?text=${message}`, '_blank');
  };

  // Logique de paiement - Fonction principale
  const handlePaymentAction = async (method: PaymentMethod) => {
    if (!factureDetails || factureDetails.mt_restant <= 0) return;

    setPaymentError('');
    setSelectedPaymentMethod(method);

    if (method === 'CASH') {
      await processCashPayment();
    } else {
      // Paiement wallet - ouvrir le modal QR Code
      setShowQRCodeModal(true);
    }
  };

  // Traitement du paiement cash (solde complet)
  const processCashPayment = async () => {
    if (!factureDetails) return;

    setPaymentLoading(true);
    setPaymentError('');

    try {
      const user = authService.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Générer transaction_id pour paiement cash
      const generateCashTransactionId = (): string => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        return `CASH-${factureDetails.id_structure}-${day}${month}${year}${hours}${minutes}`;
      };

      const acompteData: AjouterAcompteData = {
        id_structure: factureDetails.id_structure,
        id_facture: factureDetails.id_facture,
        montant_acompte: factureDetails.mt_restant, // Solde complet
        transaction_id: generateCashTransactionId(),
        uuid: 'face2face'
      };

      console.log('💰 [CASH-SUCCESS] Encaissement facture avec:', {
        transaction_id: acompteData.transaction_id,
        uuid: acompteData.uuid,
        montant: acompteData.montant_acompte,
        facture: factureDetails.num_facture
      });

      const response = await factureService.addAcompte(acompteData);

      if (response.success) {
        setPaymentSuccess(true);
        setShowPaymentSection(false);

        // Actualiser les détails de la facture
        await loadFactureDetails();

        console.log('✅ [CASH-SUCCESS] Facture entièrement payée');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du paiement cash';
      setPaymentError(errorMessage);
      console.error('❌ [CASH-ERROR]:', errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Gérer le succès du paiement wallet
  const handleWalletPaymentComplete = async (paymentStatusResponse: any) => {
    if (!factureDetails || !selectedPaymentMethod) return;

    try {
      console.log('🔄 [WALLET-SUCCESS] Traitement paiement wallet réussi:', paymentStatusResponse);

      // Extraire UUID et transaction_id depuis la réponse
      let uuid = '';
      let transaction_id = '';

      if (paymentStatusResponse?.data?.uuid) {
        uuid = paymentStatusResponse.data.uuid;
      }

      if (paymentStatusResponse?.data?.reference_externe) {
        transaction_id = paymentStatusResponse.data.reference_externe;
      }

      console.log('💳 [WALLET-SUCCESS] Données extraites:', {
        uuid,
        transaction_id,
        status: paymentStatusResponse?.data?.statut
      });

      if (!uuid || !transaction_id) {
        console.error('❌ [WALLET-ERROR] Données manquantes:', { uuid, transaction_id });
        throw new Error('Données de paiement incomplètes (UUID ou transaction_id manquant)');
      }

      // Ajouter l'acompte avec les données de paiement wallet
      const acompteData: AjouterAcompteData = {
        id_structure: factureDetails.id_structure,
        id_facture: factureDetails.id_facture,
        montant_acompte: factureDetails.mt_restant, // Solde complet
        transaction_id: transaction_id,
        uuid: uuid
      };

      console.log('💾 [WALLET-SUCCESS] Enregistrement solde avec:', acompteData);

      const response = await factureService.addAcompte(acompteData);

      if (response.success) {
        setShowQRCodeModal(false);
        setPaymentSuccess(true);
        setShowPaymentSection(false);

        // Actualiser les détails de la facture
        await loadFactureDetails();

        console.log('✅ [WALLET-SUCCESS] Facture entièrement payée');
      }
    } catch (error: unknown) {
      console.error('❌ [WALLET-ERROR] Erreur enregistrement:', error);
      setShowQRCodeModal(false);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement wallet';
      setPaymentError(errorMessage);
    }
  };

  // Gérer l'échec du paiement wallet
  const handleWalletPaymentFailed = (error: string) => {
    console.error('❌ [WALLET-FAILED] Échec du paiement wallet:', error);
    setShowQRCodeModal(false);
    setPaymentError(error);
  };

  // Créer le contexte de paiement pour les modals wallet
  const createPaymentContext = (): PaymentContext | null => {
    if (!factureDetails) return null;

    return {
      facture: {
        id_facture: factureDetails.id_facture,
        num_facture: factureDetails.num_facture,
        nom_client: factureDetails.nom_client_payeur,
        tel_client: factureDetails.tel_client,
        montant_total: factureDetails.montant,
        montant_restant: factureDetails.mt_restant,
        nom_structure: factureDetails.nom_structure
      },
      montant_acompte: factureDetails.mt_restant // Solde complet
    };
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('facture-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `QR_${factureDetails?.num_facture || 'facture'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // Styles adaptatifs selon le breakpoint
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        container: 'max-w-xs',
        padding: 'p-3',
        headerPadding: 'p-4',
        contentPadding: 'p-4',
        titleSize: 'text-lg',
        subtitleSize: 'text-xs',
        qrSize: 120,
        buttonPadding: 'py-3',
        iconSize: 'w-4 h-4'
      };
    } else if (isMobileLarge) {
      return {
        container: 'max-w-sm',
        padding: 'p-4',
        headerPadding: 'p-5',
        contentPadding: 'p-5',
        titleSize: 'text-xl',
        subtitleSize: 'text-sm',
        qrSize: 150,
        buttonPadding: 'py-3.5',
        iconSize: 'w-5 h-5'
      };
    } else {
      return {
        container: 'max-w-md',
        padding: 'p-4',
        headerPadding: 'p-6',
        contentPadding: 'p-6',
        titleSize: 'text-xl',
        subtitleSize: 'text-sm',
        qrSize: 200,
        buttonPadding: 'py-4',
        iconSize: 'w-5 h-5'
      };
    }
  };

  const styles = getResponsiveStyles();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center ${styles.padding}`}
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              bg-gradient-to-br from-sky-100/95 via-sky-50/95 to-white/95
              backdrop-blur-xl rounded-3xl w-full ${styles.container}
              shadow-2xl border border-sky-200/50
              overflow-hidden max-h-[90vh] overflow-y-auto
            `}
          >
            {/* Header avec effet glassmorphisme */}
            <div className={`
              bg-gradient-to-r from-sky-400/90 to-sky-500/90 
              backdrop-blur-lg ${styles.headerPadding} text-white relative overflow-hidden
            `}>
              {/* Pattern décoratif */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }} />
              </div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center`}>
                    <CheckCircle className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} />
                  </div>
                  <div>
                    <h2 className={`${styles.titleSize} font-bold`}>
                      {paymentSuccess
                        ? 'Facture payée !'
                        : factureDetails?.mt_restant <= 0
                          ? 'Facture soldée !'
                          : 'Facture créée !'
                      }
                    </h2>
                    <p className={`text-sky-100 ${styles.subtitleSize}`}>
                      {paymentSuccess
                        ? 'Paiement enregistré'
                        : factureDetails?.mt_restant <= 0
                          ? 'Entièrement payée'
                          : 'Prête à partager'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors`}
                >
                  <X className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className={styles.contentPadding}>
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} border-3 border-sky-500 border-t-transparent rounded-full animate-spin`} />
                </div>
              ) : error ? (
                <div className="text-center py-6 sm:py-8 text-red-600">
                  <p className={isMobile ? 'text-sm' : 'text-base'}>{error}</p>
                </div>
              ) : factureDetails ? (
                <>
                  {/* Informations facture */}
                  <div className={`bg-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-sky-100`}>
                    <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Numéro</span>
                      <span className={`font-bold text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>{factureDetails.num_facture}</span>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Client</span>
                      <span className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : 'text-base'} text-right flex-1 ml-2`} style={{ wordBreak: 'break-word' }}>
                        {factureDetails.nom_client_payeur}
                      </span>
                    </div>
                    
                    <div className={`border-t border-sky-100 ${isMobile ? 'pt-3' : 'pt-4'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-gray-700`}>Reste à payer</span>
                        <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-sky-600`}>
                          {factureDetails.mt_restant?.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section Paiement - Seulement si montant restant > 0 */}
                  {factureDetails.mt_restant > 0 && showPaymentSection && (
                    <div className={`bg-gradient-to-br from-emerald-50/60 to-green-50/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-emerald-100`}>
                      <div className={`text-center ${isMobile ? 'mb-3' : 'mb-4'}`}>
                        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-emerald-800 mb-1`}>
                          Encaisser maintenant
                        </h3>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-600`}>
                          Choisissez votre mode de paiement
                        </p>
                      </div>

                      <PaymentMethodSelector
                        onMethodAction={handlePaymentAction}
                        onCancel={() => setShowPaymentSection(false)}
                        montant={factureDetails.mt_restant}
                        size={isMobile ? 'sm' : 'md'}
                        disabled={paymentLoading}
                      />

                      {/* Messages d'erreur de paiement */}
                      {paymentError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className={`text-red-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {paymentError}
                          </p>
                        </div>
                      )}

                      {/* Message de succès de paiement */}
                      {paymentSuccess && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className={`text-emerald-700 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            ✅ Facture entièrement payée !
                          </p>
                        </div>
                      )}

                      {/* Loader de paiement */}
                      {paymentLoading && (
                        <div className="mt-3 flex items-center justify-center">
                          <div className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2`} />
                          <span className={`text-emerald-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Traitement du paiement...
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message si facture déjà soldée */}
                  {factureDetails.mt_restant <= 0 && (
                    <div className={`bg-gradient-to-br from-emerald-50/60 to-green-50/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-emerald-100`}>
                      <div className="text-center">
                        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2`}>
                          <CheckCircle className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-emerald-600`} />
                        </div>
                        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-emerald-800 mb-1`}>
                          Facture soldée
                        </h3>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-600`}>
                          Cette facture a été entièrement payée
                        </p>
                      </div>
                    </div>
                  )}

                  {/* QR Code Section Repliable */}
                  <div className={`bg-gradient-to-br from-sky-50/60 to-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-6'} mb-4 sm:mb-6 border border-sky-100`}>
                    {/* Header avec toggle */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setQrExpanded(!qrExpanded)}
                        className="flex items-center gap-2 font-semibold text-gray-800 hover:text-sky-600 transition-colors flex-1 text-left"
                      >
                        <QrIcon className={`${styles.iconSize} text-sky-600`} />
                        <span className={isMobile ? 'text-sm' : 'text-base'}>QR Code de paiement</span>
                        <motion.div
                          animate={{ rotate: qrExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className={`${styles.iconSize} text-gray-500`} />
                        </motion.div>
                      </button>
                      {qrExpanded && (
                        <button
                          onClick={handleDownloadQR}
                          className="text-sky-600 hover:text-sky-700 transition-colors ml-2"
                          title="Télécharger QR Code"
                        >
                          <Download className={styles.iconSize} />
                        </button>
                      )}
                    </div>
                    
                    {/* Section QR repliable avec animation */}
                    <AnimatePresence>
                      {qrExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className={`bg-white ${isMobile ? 'p-3' : 'p-4'} rounded-xl flex items-center justify-center mt-3`}>
                            {urls.full ? (
                              <QRCode
                                id="facture-qr-code"
                                value={urls.full}
                                size={styles.qrSize}
                                level="H"
                                fgColor="#0284c7"
                                bgColor="#ffffff"
                              />
                            ) : (
                              <div className={`flex items-center justify-center ${isMobile ? 'h-[120px]' : 'h-[200px]'} text-gray-400`}>
                                <p className="text-sm">Génération QR code...</p>
                              </div>
                            )}
                          </div>
                          
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 text-center mt-2`}>
                            Scannez pour accéder à la facture
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Instructions quand fermé */}
                    {!qrExpanded && (
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 text-center mt-1`}>
                        Appuyez pour afficher le QR code
                      </p>
                    )}
                  </div>

                  {/* Boutons d'action */}
                  <div className={`space-y-${isMobile ? '2' : '3'}`}>
                    {/* WhatsApp */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWhatsAppShare}
                      className={`
                        w-full bg-gradient-to-r from-green-500 to-green-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      <MessageCircle className={styles.iconSize} />
                      {isMobile ? 'WhatsApp' : 'Partager sur WhatsApp'}
                    </motion.button>

                    {/* Copier URL */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyUrl}
                      className={`
                        w-full bg-white/60 backdrop-blur-sm border-2 border-sky-200
                        text-sky-700 font-semibold ${styles.buttonPadding} rounded-xl
                        hover:bg-white/80 transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      {copiedUrl ? (
                        <>
                          <CheckCircle className={styles.iconSize} />
                          {isMobile ? 'Copié !' : 'URL copiée !'}
                        </>
                      ) : (
                        <>
                          <Copy className={styles.iconSize} />
                          Copier le lien
                        </>
                      )}
                    </motion.button>

                    {/* Voir facture */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => urls.full && window.open(urls.full, '_blank')}
                      disabled={!urls.full}
                      className={`
                        w-full bg-sky-100/60 backdrop-blur-sm
                        text-sky-700 font-medium ${isMobile ? 'py-2.5' : 'py-3'} rounded-xl
                        hover:bg-sky-100/80 transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      <ExternalLink className={isMobile ? 'w-4 h-4' : 'w-4 h-4'} />
                      Voir la facture
                    </motion.button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de paiement QR Code pour les wallets */}
      {factureDetails && selectedPaymentMethod && selectedPaymentMethod !== 'CASH' && (
        <ModalPaiementQRCode
          isOpen={showQRCodeModal}
          onClose={() => setShowQRCodeModal(false)}
          paymentMethod={selectedPaymentMethod}
          paymentContext={createPaymentContext()!}
          onPaymentComplete={handleWalletPaymentComplete}
          onPaymentFailed={handleWalletPaymentFailed}
        />
      )}
    </AnimatePresence>
  );
}