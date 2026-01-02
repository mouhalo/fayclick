/**
 * Modal pour afficher les détails d'une facture privée pour les commerçants
 * Design harmonisé avec les autres modals de l'application
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Receipt,
  User,
  Phone,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  QrCode,
  Trash2,
  Copy,
  Check,
  History,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
  const [facture, setFacture] = useState<FacturePriveeData | null>(factureData || null);
  const [paiements, setPaiements] = useState<PaiementHistorique[]>([]);
  const [loading, setLoading] = useState(!factureData && !!factureId);
  const [error, setError] = useState<string | null>(null);
  const [urlPartage, setUrlPartage] = useState<string>('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // États pour le reçu généré
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    wallet: WalletType;
    montant: number;
    numeroRecu?: string;
    dateTimePaiement?: string;
    referenceTransaction?: string;
  } | null>(null);

  // Charger les données de la facture si un ID est fourni
  useEffect(() => {
    if (isOpen && factureId && !factureData) {
      loadFactureData();
    } else if (factureData) {
      setFacture(factureData);
      generateUrlPartage(factureData);
      // L'historique sera chargé dans loadFactureData ou séparément si nécessaire
      loadHistoriquePaiements(factureData.id_facture);
    }
  }, [isOpen, factureId, factureData]);

  const loadFactureData = async () => {
    if (!factureId) return;

    try {
      setLoading(true);
      setError(null);

      // Charger seulement les données principales de la facture
      // Passer le numFacture si disponible pour optimiser la recherche
      const factureResult = await facturePriveeService.getFacturePrivee(factureId, numFacture);

      setFacture(factureResult);
      generateUrlPartage(factureResult);

      // Charger l'historique en parallèle sans bloquer l'affichage principal
      loadHistoriquePaiements(factureId);

    } catch (err: unknown) {
      console.error('Erreur lors du chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la facture');
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

  const generateUrlPartage = (factureData: FacturePriveeData) => {
    const url = facturePriveeService.generateUrlPartage(
      factureData.id_structure,
      factureData.id_facture
    );
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

  const handleSupprimer = async () => {
    if (!facture || facture.id_etat !== 1) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmSupprimer = async () => {
    if (!facture) return;

    try {
      setDeleting(true);
      setShowDeleteConfirm(false);

      const result = await facturePriveeService.supprimerFacture(
        facture.id_facture,
        facture.id_structure
      );

      if (result.success) {
        onFactureDeleted?.(facture.id_facture);
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (err: unknown) {
      console.error('Erreur suppression:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      alert(errorMessage); // On pourrait aussi utiliser un toast ici
    } finally {
      setDeleting(false);
    }
  };

  const handlePaymentComplete = async (wallet: WalletType, referenceTransaction?: string) => {
    setShowWalletModal(false);

    // Créer le reçu en base de données et afficher le modal
    if (facture) {
      try {
        // Créer le reçu via le service
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
          // Préparer les informations du reçu pour l'affichage
          setLastPaymentInfo({
            wallet,
            montant: facture.montant,
            numeroRecu: recuResponse.numero_recu,
            dateTimePaiement: new Date().toISOString(),
            referenceTransaction
          });

          // Afficher le modal de reçu après un court délai pour une meilleure UX
          setTimeout(() => {
            setShowRecuModal(true);
          }, 300);

          console.log('✅ [FACTURE-PRIVEE] Reçu créé avec succès:', {
            numeroRecu: recuResponse.numero_recu,
            idFacture: facture.id_facture,
            montant: facture.montant
          });
        }

      } catch (error) {
        console.error('❌ [FACTURE-PRIVEE] Erreur création reçu:', error);

        // En cas d'erreur, afficher quand même le reçu avec les infos locales
        const numeroRecu = `REC-${facture.id_structure}-${facture.id_facture}-${Date.now()}`;
        setLastPaymentInfo({
          wallet,
          montant: facture.montant,
          numeroRecu,
          dateTimePaiement: new Date().toISOString(),
          referenceTransaction
        });

        setTimeout(() => {
          setShowRecuModal(true);
        }, 300);
      }

      // Recharger l'historique des paiements
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateCourt = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-SN');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {loading ? 'Chargement...' : `Facture ${facture?.num_facture}`}
                  </h2>
                  <p className="text-white/90 text-sm">
                    {facture && formatDate(facture.date_facture)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
                <span className="text-gray-600">Chargement des détails...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            )}

            {facture && !loading && !error && (
              <div className="space-y-6">
                {/* Informations principales */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Client */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Informations Client
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      <p><strong>Nom:</strong> {facture.nom_client}</p>
                      <p><strong>Téléphone:</strong> {facture.tel_client}</p>
                      <p><strong>Description:</strong> {facture.description}</p>
                    </div>
                  </div>
 
                  {/* Facturation */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Détails Financiers
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      <p><strong>Statut:</strong>
                        <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                          facture.libelle_etat === 'PAYEE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {facture.libelle_etat === 'PAYEE' ? 'Payée' : 'En attente'}
                        </span>
                      </p>
                      {facture.mt_remise > 0 && (
                        <p><strong>Remise:</strong> <span className="text-orange-600">{formatMontant(facture.mt_remise)}</span></p>
                      )}
                      <p><strong>Acompte:</strong> {formatMontant(facture.mt_acompte)}</p>
                      {facture.libelle_etat !== 'PAYEE' && facture.mt_restant > 0 && (
                        <p><strong>Restant:</strong> {formatMontant(facture.mt_restant)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Montant total avec bouton QR Code pour paiement */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">Montant Total</p>
                    <div className="flex items-center justify-center gap-3">
                      {facture.id_etat !== 2 && (
                        <button
                          onClick={() => setShowWalletModal(true)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Configurer le paiement mobile"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                      )}
                      <p className="text-3xl font-bold text-gray-900">
                        {formatMontant(facture.montant)}
                      </p>
                    </div>
                    {facture.id_etat === 2 && (
                      <p className="text-green-600 text-sm mt-2 font-medium">
                        ✅ Facture déjà payée
                      </p>
                    )}
                  </div>
                </div>

                {/* Détails de la commande */}
                {facture.details && facture.details.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-600" />
                        Détails de la commande ({facture.details.length} produit{facture.details.length > 1 ? 's' : ''})
                      </h3>
                      <motion.div
                        animate={{ rotate: showDetails ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {showDetails && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-2 font-medium text-gray-900">Produit</th>
                                  <th className="text-center py-2 px-2 font-medium text-gray-900">Qté</th>
                                  <th className="text-right py-2 px-2 font-medium text-gray-900">Prix Unit.</th>
                                  <th className="text-right py-2 px-2 font-medium text-gray-900">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {facture.details.map((detail, index) => (
                                  <motion.tr
                                    key={detail.id_detail}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                    className="border-b border-gray-100"
                                  >
                                    <td className="py-2 px-2">
                                      <div>
                                        <p className="font-medium text-gray-900">{detail.nom_produit}</p>
                                        {detail.description_produit && (
                                          <p className="text-xs text-gray-600">{detail.description_produit}</p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="text-center py-2 px-2 font-medium">
                                      {detail.quantite}
                                    </td>
                                    <td className="text-right py-2 px-2">
                                      {formatMontant(detail.prix)}
                                    </td>
                                    <td className="text-right py-2 px-2 font-medium">
                                      {formatMontant(detail.sous_total)}
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-gray-300 bg-gray-100">
                                  <td colSpan={3} className="text-right py-3 px-2 font-bold">
                                    Total:
                                  </td>
                                  <td className="text-right py-3 px-2 font-bold text-blue-600">
                                    {formatMontant(facture.montant)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* QR Code & Partage */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <button
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="w-full flex items-center justify-between text-left cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-purple-600" />
                      QR Code & Partage
                    </h3>
                    <motion.div
                      animate={{ rotate: showQrCode ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showQrCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                      >
                        {/* QR Code de l'URL */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                            QR Code de la facture
                          </p>
                          <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-lg shadow-inner border">
                              <QRCode
                                value={urlPartage}
                                size={180}
                                level="H"
                                bgColor="#ffffff"
                                fgColor="#000000"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            Scannez ce code pour accéder à la facture
                          </p>
                        </div>

                        {/* Section URL de partage */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">URL de Partage</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={urlPartage}
                              readOnly
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                            />
                            <button
                              onClick={handleCopyUrl}
                              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                              title={urlCopied ? 'URL copiée !' : 'Copier l\'URL'}
                            >
                              {urlCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Historique des paiements */}
                {paiements.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <button
                      onClick={() => setShowHistorique(!showHistorique)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <History className="w-5 h-5 text-purple-600" />
                        Historique des Paiements ({paiements.length})
                      </h3>
                      <motion.div
                        animate={{ rotate: showHistorique ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Calendar className="w-5 h-5 text-gray-400" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {showHistorique && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-2"
                        >
                          {paiements.map((paiement, index) => (
                            <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {formatMontant(paiement.montant)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {paiement.mode_paiement} • {formatDateCourt(paiement.date_paiement)}
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  {paiement.statut}
                                </span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {facture && !loading && !error && (
            <div className="bg-gray-50 p-6 flex-shrink-0">
              <div className="flex justify-between">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Fermer
                </button>

                {facture.id_etat === 1 && (
                  <button
                    onClick={handleSupprimer}
                    disabled={deleting}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Modal Wallet */}
        {facture && (
          <ModalPaiementWalletNew
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
            montant={facture.montant}
            numeroFacture={facture.num_facture}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {/* Modal de confirmation de suppression */}
        {facture && (
          <ModalConfirmation
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleConfirmSupprimer}
            title="Supprimer la facture"
            message={`Êtes-vous sûr de vouloir supprimer la facture ${facture.num_facture} ?\n\nCette action est irréversible et supprimera définitivement toutes les données associées.`}
            confirmText="Supprimer"
            cancelText="Annuler"
            type="danger"
            loading={deleting}
          />
        )}

        {/* Modal de reçu généré */}
        {facture && lastPaymentInfo && (
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
      </motion.div>
    </AnimatePresence>
  );
}