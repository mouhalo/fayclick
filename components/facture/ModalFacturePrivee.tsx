/**
 * Modal pour afficher les détails d'une facture privée pour les commerçants
 * Design compact avec FlipCard (Infos ↔ QR Code)
 * Responsive: 3 breakpoints (Mobile, Tablette, Desktop)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Receipt,
  User,
  Phone,
  Loader2,
  AlertCircle,
  QrCode,
  Trash2,
  Copy,
  Check,
  History,
  Package,
  ChevronDown,
  RotateCw,
  Printer
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import QRCode from 'react-qr-code';
import { facturePriveeService, FacturePriveeData, PaiementHistorique } from '@/services/facture-privee.service';
import { ModalPaiementWalletNew, WalletType } from './ModalPaiementWalletNew';
import { ModalFacturePriveeProps } from '@/types/facture-privee';
import { ModalConfirmation } from '@/components/ui/ModalConfirmation';
import { ModalRecuGenere } from '@/components/recu';
import { recuService } from '@/services/recu.service';

export function ModalFacturePrivee({
  isOpen,
  onClose,
  factureId,
  numFacture,
  factureData,
  onFactureDeleted,
  onPaymentComplete
}: ModalFacturePriveeProps) {
  const { isMobile, isMobileLarge, isTablet } = useBreakpoint();
  const [facture, setFacture] = useState<FacturePriveeData | null>(factureData || null);
  const [paiements, setPaiements] = useState<PaiementHistorique[]>([]);
  const [loading, setLoading] = useState(!factureData && !!factureId);
  const [error, setError] = useState<string | null>(null);
  const [urlPartage, setUrlPartage] = useState<string>('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Styles responsives selon breakpoint
  const styles = getResponsiveStyles();

  function getResponsiveStyles() {
    if (isMobile) {
      return {
        modal: 'max-w-[300px]',
        padding: 'p-3',
        title: 'text-sm',
        subtitle: 'text-[10px]',
        label: 'text-[10px]',
        value: 'text-xs',
        montant: 'text-lg',
        icon: 'w-4 h-4',
        iconSm: 'w-3 h-3',
        qrSize: 90,
        button: 'px-3 py-1.5 text-xs',
        flipHeight: 'h-[140px]',
        gap: 'gap-2',
        space: 'space-y-2'
      };
    } else if (isMobileLarge || isTablet) {
      return {
        modal: 'max-w-[340px]',
        padding: 'p-4',
        title: 'text-base',
        subtitle: 'text-xs',
        label: 'text-xs',
        value: 'text-sm',
        montant: 'text-xl',
        icon: 'w-5 h-5',
        iconSm: 'w-3.5 h-3.5',
        qrSize: 100,
        button: 'px-4 py-2 text-sm',
        flipHeight: 'h-[160px]',
        gap: 'gap-3',
        space: 'space-y-3'
      };
    }
    return {
      modal: 'max-w-[380px]',
      padding: 'p-4',
      title: 'text-base',
      subtitle: 'text-xs',
      label: 'text-xs',
      value: 'text-sm',
      montant: 'text-2xl',
      icon: 'w-5 h-5',
      iconSm: 'w-4 h-4',
      qrSize: 110,
      button: 'px-4 py-2 text-sm',
      flipHeight: 'h-[180px]',
      gap: 'gap-3',
      space: 'space-y-3'
    };
  }

  // États pour le reçu généré
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    wallet: WalletType;
    montant: number;
    numeroRecu?: string;
    dateTimePaiement?: string;
    referenceTransaction?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && factureId && !factureData) {
      loadFactureData();
    } else if (factureData) {
      setFacture(factureData);
      generateUrlPartage(factureData);
      loadHistoriquePaiements(factureData.id_facture);
    }
  }, [isOpen, factureId, factureData]);

  const loadFactureData = async () => {
    if (!factureId) return;
    try {
      setLoading(true);
      setError(null);
      const factureResult = await facturePriveeService.getFacturePrivee(factureId, numFacture);
      setFacture(factureResult);
      generateUrlPartage(factureResult);
      loadHistoriquePaiements(factureId);
    } catch (err: unknown) {
      console.error('Erreur lors du chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoriquePaiements = async (idFacture: number) => {
    try {
      const historique = await facturePriveeService.getHistoriquePaiements(idFacture);
      setPaiements(historique);
    } catch (err) {
      console.error('Erreur historique paiements:', err);
    }
  };

  const generateUrlPartage = (data: FacturePriveeData) => {
    const url = facturePriveeService.generateUrlPartage(data.id_structure, data.id_facture);
    setUrlPartage(url);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(urlPartage);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie URL:', err);
    }
  };

  const handleSupprimer = () => {
    if (!facture || facture.id_etat !== 1) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmSupprimer = async () => {
    if (!facture) return;
    try {
      setDeleting(true);
      setShowDeleteConfirm(false);
      const result = await facturePriveeService.supprimerFacture(facture.id_facture, facture.id_structure);
      if (result.success) {
        onFactureDeleted?.(facture.id_facture);
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (err: unknown) {
      console.error('Erreur suppression:', err);
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handlePaymentComplete = async (wallet: WalletType, referenceTransaction?: string) => {
    setShowWalletModal(false);
    if (facture) {
      try {
        const recuResponse = await recuService.creerRecu({
          id_facture: facture.id_facture,
          id_structure: facture.id_structure,
          methode_paiement: wallet,
          montant_paye: facture.montant,
          reference_transaction: referenceTransaction,
          numero_telephone: facture.tel_client,
          date_paiement: new Date().toISOString()
        });

        if (recuResponse.success) {
          setLastPaymentInfo({
            wallet,
            montant: facture.montant,
            numeroRecu: recuResponse.numero_recu,
            dateTimePaiement: new Date().toISOString(),
            referenceTransaction
          });
          setTimeout(() => setShowRecuModal(true), 300);
        }
      } catch (error) {
        console.error('Erreur création reçu:', error);
        const numeroRecu = `REC-${facture.id_structure}-${facture.id_facture}-${Date.now()}`;
        setLastPaymentInfo({
          wallet,
          montant: facture.montant,
          numeroRecu,
          dateTimePaiement: new Date().toISOString(),
          referenceTransaction
        });
        setTimeout(() => setShowRecuModal(true), 300);
      }
      loadHistoriquePaiements(facture.id_facture);
    }
    onPaymentComplete?.(facture?.id_facture || 0);
  };

  const formatMontant = (montant: number): string => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(montant);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-SN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${styles.modal} bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col`}
        >
          {/* HEADER - Compact */}
          <div className={`bg-gradient-to-r from-blue-600 to-purple-600 ${styles.padding} text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className={styles.icon} />
                <div>
                  <h2 className={`${styles.title} font-bold`}>
                    {loading ? 'Chargement...' : facture?.num_facture}
                  </h2>
                  {facture && (
                    <p className={`${styles.subtitle} text-white/80`}>
                      {formatDate(facture.date_facture)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30"
              >
                <X className={styles.iconSm} />
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className={`${styles.padding} overflow-y-auto flex-1 ${styles.space}`}>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className={`${styles.icon} text-blue-600 animate-spin mr-2`} />
                <span className={styles.value}>Chargement...</span>
              </div>
            )}

            {error && (
              <div className="text-center py-6">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <p className={`text-red-600 ${styles.label}`}>{error}</p>
              </div>
            )}

            {facture && !loading && !error && (
              <>
                {/* MONTANT - Zone principale */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {facture.id_etat !== 2 && (
                      <button
                        onClick={() => setShowWalletModal(true)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        title="Payer"
                      >
                        <QrCode className={styles.iconSm} />
                      </button>
                    )}
                    <span className={`${styles.montant} font-bold text-gray-900`}>
                      {formatMontant(facture.montant)}
                    </span>
                  </div>
                  <div className={`${styles.label} mt-1 ${facture.id_etat === 2 ? 'text-green-600' : 'text-orange-600'}`}>
                    {facture.id_etat === 2 ? '✅ Payée' : `⏳ Reste: ${formatMontant(facture.montant - facture.mt_acompte)}`}
                  </div>
                </div>

                {/* FLIPCARD - Infos ↔ QR Code */}
                <div
                  className={`relative ${styles.flipHeight}`}
                  style={{ perspective: '1000px' }}
                >
                  <motion.div
                    className="relative w-full h-full cursor-pointer"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    style={{ transformStyle: 'preserve-3d' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    {/* FACE AVANT - Infos Client + Produits */}
                    <div
                      className="absolute inset-0 w-full h-full bg-white rounded-xl border-2 border-gray-200 p-3 overflow-hidden"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      {/* Header avec bouton flip */}
                      <div className="flex items-center justify-between mb-2">
                        <div className={`flex items-center gap-1 ${styles.value} font-semibold text-gray-800`}>
                          <Package className={styles.iconSm} />
                          Détails facture
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                          className="p-1.5 bg-purple-100 hover:bg-purple-200 rounded-full"
                          title="Voir QR Code"
                        >
                          <RotateCw className={`${styles.iconSm} text-purple-600`} />
                        </button>
                      </div>

                      {/* Infos client */}
                      <div className={`${styles.label} text-gray-600 mb-2 flex flex-wrap gap-x-3 gap-y-1`}>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {facture.nom_client || 'Client'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {facture.tel_client}
                        </span>
                      </div>

                      {/* Liste produits */}
                      {facture.details && facture.details.length > 0 ? (
                        <div className="overflow-y-auto max-h-[60px]">
                          <table className={`w-full ${styles.label}`}>
                            <tbody>
                              {facture.details.map((d) => (
                                <tr key={d.id_detail} className="border-b border-gray-100">
                                  <td className="py-0.5 text-gray-800 truncate max-w-[120px]">{d.nom_produit}</td>
                                  <td className="py-0.5 text-center text-gray-600">×{d.quantite}</td>
                                  <td className="py-0.5 text-right font-medium text-blue-600">{formatMontant(d.sous_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={`${styles.label} text-gray-400 text-center py-2`}>
                          Aucun détail produit
                        </p>
                      )}

                      {/* Indication flip */}
                      <p className={`${styles.label} text-purple-500 text-center mt-2`}>
                        Cliquez pour voir le QR Code →
                      </p>
                    </div>

                    {/* FACE ARRIÈRE - QR Code */}
                    <div
                      className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-3 flex flex-col items-center justify-center"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      {/* Header avec bouton flip */}
                      <div className="absolute top-2 left-3 right-3 flex items-center justify-between">
                        <div className={`flex items-center gap-1 ${styles.value} font-semibold text-gray-800`}>
                          <QrCode className={styles.iconSm} />
                          Partager
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                          className="p-1.5 bg-purple-100 hover:bg-purple-200 rounded-full"
                          title="Voir détails"
                        >
                          <RotateCw className={`${styles.iconSm} text-purple-600`} />
                        </button>
                      </div>

                      {/* QR Code */}
                      <div className="bg-white p-2 rounded-lg shadow-sm border mt-4">
                        <QRCode
                          value={urlPartage || 'https://fayclick.net'}
                          size={styles.qrSize}
                          level="M"
                          bgColor="#ffffff"
                          fgColor="#7c3aed"
                        />
                      </div>

                      {/* Bouton copier */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(); }}
                        className={`mt-2 flex items-center gap-1 ${styles.label} text-purple-600 hover:text-purple-700 font-medium`}
                      >
                        {urlCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {urlCopied ? 'Copié !' : 'Copier le lien'}
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* HISTORIQUE - Accordéon compact */}
                {paiements.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-2">
                    <button
                      onClick={() => setShowHistorique(!showHistorique)}
                      className="w-full flex items-center justify-between"
                    >
                      <span className={`${styles.value} font-semibold text-gray-800 flex items-center gap-1`}>
                        <History className={styles.iconSm} />
                        Paiements ({paiements.length})
                      </span>
                      <motion.div animate={{ rotate: showHistorique ? 180 : 0 }}>
                        <ChevronDown className={styles.iconSm} />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {showHistorique && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-1"
                        >
                          {paiements.map((p, i) => (
                            <div key={i} className="bg-white rounded-lg p-2 border flex justify-between items-center">
                              <div>
                                <span className={`${styles.value} font-medium`}>{formatMontant(p.montant)}</span>
                                <span className={`${styles.label} text-gray-500 ml-2`}>{p.mode_paiement}</span>
                              </div>
                              <span className={`${styles.label} px-1.5 py-0.5 bg-green-100 text-green-700 rounded`}>
                                {p.statut}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>

          {/* FOOTER */}
          {facture && !loading && !error && (
            <div className={`${styles.padding} bg-gray-50 border-t flex justify-between items-center`}>
              <button
                onClick={onClose}
                className={`${styles.button} bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium`}
              >
                Fermer
              </button>

              <div className="flex items-center gap-2">
                {/* Bouton Imprimer */}
                <button
                  onClick={() => window.open(urlPartage, '_blank')}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                  title="Imprimer la facture"
                >
                  <Printer className={styles.iconSm} />
                </button>

                {facture.id_etat === 1 && (
                  <button
                    onClick={handleSupprimer}
                    disabled={deleting}
                    className={`${styles.button} bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-1 disabled:opacity-50`}
                  >
                    {deleting ? <Loader2 className={`${styles.iconSm} animate-spin`} /> : <Trash2 className={styles.iconSm} />}
                    {isMobile ? 'Suppr.' : 'Supprimer'}
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Modals secondaires */}
        {facture && (
          <>
            <ModalPaiementWalletNew
              isOpen={showWalletModal}
              onClose={() => setShowWalletModal(false)}
              montant={facture.montant}
              numeroFacture={facture.num_facture}
              onPaymentComplete={handlePaymentComplete}
            />

            <ModalConfirmation
              isOpen={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              onConfirm={handleConfirmSupprimer}
              title="Supprimer la facture"
              message={`Supprimer ${facture.num_facture} ?\nCette action est irréversible.`}
              confirmText="Supprimer"
              cancelText="Annuler"
              type="danger"
              loading={deleting}
            />

            {lastPaymentInfo && (
              <ModalRecuGenere
                isOpen={showRecuModal}
                onClose={() => setShowRecuModal(false)}
                factureId={facture.id_facture}
                walletUsed={lastPaymentInfo.wallet}
                montantPaye={lastPaymentInfo.montant}
                numeroRecu={lastPaymentInfo.numeroRecu}
                dateTimePaiement={lastPaymentInfo.dateTimePaiement}
                referenceTransaction={lastPaymentInfo.referenceTransaction}
              />
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
