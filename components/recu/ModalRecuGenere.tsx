/**
 * Modal de succès après paiement de facture - Génération de reçu
 * Design glassmorphisme vert avec QR Code et partage WhatsApp
 * Basé sur ModalFactureSuccess avec adaptations pour les reçus
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, QrCode as QrIcon, MessageCircle,
  Link, Copy, ExternalLink, Download, ChevronDown, ChevronUp,
  Receipt, CreditCard, Calendar, Clock
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import QRCode from 'react-qr-code';
import { factureService } from '@/services/facture.service';
import { authService } from '@/services/auth.service';
import { encodeFactureParams } from '@/lib/url-encoder';
import { ModalRecuGenereProps, RecuDetails, RecuUrls, TypePaiement } from '@/types/recu';
import { WalletType } from '@/components/facture/ModalPaiementWalletNew';
import { recuService } from '@/services/recu.service';

// Configuration des wallets pour affichage
const WALLET_CONFIG = {
  OM: {
    name: 'Orange Money',
    displayName: '🟠 Orange Money',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: '🟠'
  },
  WAVE: {
    name: 'Wave',
    displayName: '🔵 Wave',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: '🔵'
  },
  FREE: {
    name: 'Free Money',
    displayName: '🟢 Free Money',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: '🟢'
  },
  CASH: {
    name: 'Espèces',
    displayName: '💵 Espèces',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: '💵'
  }
};

export function ModalRecuGenere({
  isOpen,
  onClose,
  factureId,
  walletUsed,
  montantPaye,
  numeroRecu,
  dateTimePaiement,
  referenceTransaction,
  typePaiement,
  montantFactureTotal
}: ModalRecuGenereProps) {
  const { isMobile, isMobileLarge, isTablet, isDesktop } = useBreakpoint();
  const [recuDetails, setRecuDetails] = useState<RecuDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);

  // Générer les URLs pour le reçu
  const urls = useMemo((): RecuUrls => {
    if (!recuDetails || !factureId || factureId <= 0) {
      return { simple: '', encoded: '', full: '' };
    }

    try {
      const user = authService.getUser();
      const idStructure = user?.id_structure || recuDetails.facture.id_structure;

      if (!idStructure || idStructure <= 0) {
        console.warn('ID structure invalide pour génération URL reçu');
        return { simple: '', encoded: '', full: '' };
      }

      // URL simple format: /recu/{id_structure}#{id_facture}
      const simpleUrl = `/recu/${idStructure}%23${factureId}`;

      // URL encodée avec token (même système que factures)
      const token = encodeFactureParams(idStructure, factureId);
      const encodedUrl = `/recu?token=${token}`;

      // URL complète avec domaine
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${baseUrl}${encodedUrl}`;

      return { simple: simpleUrl, encoded: encodedUrl, full: fullUrl };
    } catch (error) {
      console.error('Erreur génération URLs reçu:', error);
      return { simple: '', encoded: '', full: '' };
    }
  }, [recuDetails, factureId]);

  useEffect(() => {
    if (isOpen && factureId) {
      loadRecuDetails();
    }
  }, [isOpen, factureId]);

  const loadRecuDetails = async () => {
    if (!factureId) return;

    try {
      setLoading(true);
      setError(null);

      // Charger les détails de la facture (maintenant payée)
      const details = await factureService.getFactureDetails(factureId);

      // Construire les détails du reçu
      const recuData: RecuDetails = {
        facture: {
          ...details,
          libelle_etat: 'PAYEE' as const,
          numrecu: numeroRecu || details.numrecu || `REC${Date.now()}`
        },
        paiement: {
          date_paiement: dateTimePaiement || new Date().toISOString(),
          methode_paiement: walletUsed,
          montant_paye: montantPaye,
          reference_transaction: referenceTransaction,
          numero_telephone: details.tel_client
        }
      };

      setRecuDetails(recuData);
    } catch (err: any) {
      console.error('Erreur chargement détails reçu:', err);
      setError(err.message || 'Impossible de charger les détails du reçu');
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
    if (!recuDetails) return;

    const phoneNumber = recuDetails.facture.tel_client || '771234567';
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const senegalPhone = cleanPhone.startsWith('221') ? cleanPhone : `221${cleanPhone}`;

    const walletInfo = WALLET_CONFIG[walletUsed];
    const datePaiement = new Date(recuDetails.paiement.date_paiement).toLocaleDateString('fr-FR');

    const isAcompte = typePaiement === 'ACOMPTE';
    const montantRestant = montantFactureTotal ? montantFactureTotal - montantPaye : 0;

    const message = encodeURIComponent(
      `🧾 *${isAcompte ? 'REÇU ACOMPTE' : 'REÇU DE PAIEMENT'}* ✅\n\n` +
      `📄 Facture: ${recuDetails.facture.num_facture}\n` +
      `🏪 ${recuDetails.facture.nom_structure}\n\n` +
      `💰 *${isAcompte ? 'Acompte versé' : 'Montant payé'}: ${montantPaye?.toLocaleString('fr-FR')} FCFA*\n` +
      (isAcompte && montantFactureTotal ? `💳 Total facture: ${montantFactureTotal.toLocaleString('fr-FR')} FCFA\n` : '') +
      (isAcompte && montantRestant > 0 ? `⚠️ Restant dû: ${montantRestant.toLocaleString('fr-FR')} FCFA\n\n` : '\n') +
      `💳 Méthode: ${walletInfo.name}\n` +
      `📅 Date: ${datePaiement}\n` +
      `🧾 N° Reçu: ${recuDetails.facture.numrecu}\n\n` +
      `🔗 Voir le reçu officiel:\n${urls.full || 'URL en cours de génération...'}\n\n` +
      `✅ *${isAcompte ? 'Acompte confirmé' : 'Paiement confirmé'}*\n` +
      `_Merci pour votre confiance !_`
    );

    window.open(`https://wa.me/${senegalPhone}?text=${message}`, '_blank');
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('recu-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `QR_Recu_${recuDetails?.facture.num_facture || 'recu'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  const walletInfo = WALLET_CONFIG[walletUsed] || WALLET_CONFIG.CASH;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center ${styles.padding}`}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              bg-gradient-to-br from-emerald-100/95 via-green-50/95 to-white/95
              backdrop-blur-xl rounded-3xl w-full ${styles.container}
              shadow-2xl border border-emerald-200/50
              overflow-hidden max-h-[90vh] overflow-y-auto
            `}
          >
            {/* Header avec effet glassmorphisme VERT */}
            <div className={`
              bg-gradient-to-r from-emerald-500/90 to-green-600/90
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
                    <Receipt className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} />
                  </div>
                  <div>
                    <h2 className={`${styles.titleSize} font-bold`}>Paiement réussi !</h2>
                    <p className={`text-emerald-100 ${styles.subtitleSize}`}>🧾 Reçu généré</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
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
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} border-3 border-emerald-500 border-t-transparent rounded-full animate-spin`} />
                </div>
              ) : error ? (
                <div className="text-center py-6 sm:py-8 text-red-600">
                  <p className={isMobile ? 'text-sm' : 'text-base'}>{error}</p>
                </div>
              ) : recuDetails ? (
                <>
                  {/* Badge REÇU OFFICIEL avec type paiement */}
                  <div className="flex justify-center mb-4">
                    {typePaiement === 'ACOMPTE' ? (
                      <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        REÇU ACOMPTE
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        REÇU OFFICIEL
                      </div>
                    )}
                  </div>

                  {/* Informations du reçu */}
                  <div className={`bg-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-emerald-100`}>
                    <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>N° Reçu</span>
                      <span className={`font-bold text-emerald-700 ${isMobile ? 'text-sm' : 'text-base'}`}>
                        {recuDetails.facture.numrecu}
                      </span>
                    </div>

                    <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Facture</span>
                      <span className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : 'text-base'}`}>
                        {recuDetails.facture.num_facture}
                      </span>
                    </div>

                    <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Client</span>
                      <span className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : 'text-base'} text-right flex-1 ml-2`} style={{ wordBreak: 'break-word' }}>
                        {recuDetails.facture.nom_client}
                      </span>
                    </div>

                    {/* Informations de paiement */}
                    <div className={`border-t border-emerald-100 ${isMobile ? 'pt-3' : 'pt-4'} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 flex items-center gap-1`}>
                          <CreditCard className="w-3 h-3" />
                          Méthode
                        </span>
                        <span className={`${walletInfo.color} font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>
                          {walletInfo.displayName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />
                          Date/Heure
                        </span>
                        <span className={`font-medium text-gray-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {formatDateTime(recuDetails.paiement.date_paiement)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-gray-700`}>
                          {typePaiement === 'ACOMPTE' ? 'Acompte versé' : 'Montant payé'}
                        </span>
                        <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold ${
                          typePaiement === 'ACOMPTE' ? 'text-orange-600' : 'text-emerald-600'
                        }`}>
                          {montantPaye?.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      {/* Affichage spécial pour les acomptes */}
                      {typePaiement === 'ACOMPTE' && montantFactureTotal && (
                        <div className="mt-3 pt-3 border-t border-orange-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Montant total facture</span>
                            <span className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : 'text-base'}`}>
                              {montantFactureTotal.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Montant restant</span>
                            <span className={`font-bold text-red-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                              {(montantFactureTotal - montantPaye).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>

                          {/* Barre de progression */}
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Progression paiement</span>
                              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-orange-600`}>
                                {Math.round((montantPaye / montantFactureTotal) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(montantPaye / montantFactureTotal) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className={`bg-gradient-to-br from-emerald-50/60 to-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-6'} mb-4 sm:mb-6 border border-emerald-100`}>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setQrExpanded(!qrExpanded)}
                        className="flex items-center gap-2 font-semibold text-gray-800 hover:text-emerald-600 transition-colors flex-1 text-left"
                      >
                        <QrIcon className={`${styles.iconSize} text-emerald-600`} />
                        <span className={isMobile ? 'text-sm' : 'text-base'}>QR Code du reçu</span>
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
                          className="text-emerald-600 hover:text-emerald-700 transition-colors ml-2"
                          title="Télécharger QR Code"
                        >
                          <Download className={styles.iconSize} />
                        </button>
                      )}
                    </div>

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
                                id="recu-qr-code"
                                value={urls.full}
                                size={styles.qrSize}
                                level="H"
                                fgColor="#059669"
                                bgColor="#ffffff"
                              />
                            ) : (
                              <div className={`flex items-center justify-center ${isMobile ? 'h-[120px]' : 'h-[200px]'} text-gray-400`}>
                                <p className="text-sm">Génération QR code...</p>
                              </div>
                            )}
                          </div>

                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 text-center mt-2`}>
                            Scannez pour accéder au reçu officiel
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                      {isMobile ? 'Partager reçu' : 'Partager le reçu'}
                    </motion.button>

                    {/* Copier URL */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyUrl}
                      className={`
                        w-full bg-white/60 backdrop-blur-sm border-2 border-emerald-200
                        text-emerald-700 font-semibold ${styles.buttonPadding} rounded-xl
                        hover:bg-white/80 transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      {copiedUrl ? (
                        <>
                          <CheckCircle className={styles.iconSize} />
                          {isMobile ? 'Copié !' : 'Lien copié !'}
                        </>
                      ) : (
                        <>
                          <Copy className={styles.iconSize} />
                          Copier le lien
                        </>
                      )}
                    </motion.button>

                    {/* Voir reçu */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => urls.full && window.open(urls.full, '_blank')}
                      disabled={!urls.full}
                      className={`
                        w-full bg-emerald-100/60 backdrop-blur-sm
                        text-emerald-700 font-medium ${isMobile ? 'py-2.5' : 'py-3'} rounded-xl
                        hover:bg-emerald-100/80 transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      <ExternalLink className={isMobile ? 'w-4 h-4' : 'w-4 h-4'} />
                      Voir le reçu
                    </motion.button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}