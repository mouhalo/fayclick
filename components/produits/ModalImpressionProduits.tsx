/**
 * Modal d'impression de la liste des produits
 * Optimisé pour gérer 500+ produits avec progression temps réel
 *
 * Fonctionnalités :
 * - Génération QR codes par lots avec progression
 * - Sélection taille étiquettes (petites/moyennes/grandes)
 * - Pagination automatique
 * - Annulation possible
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  FileText,
  Package,
  AlertCircle,
  Tag,
  Check,
  XCircle,
  AlertTriangle,
  Grid3X3,
  LayoutGrid,
  Square
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePrintJob } from '@/hooks/usePrintJob';
import { Produit } from '@/types/produit';
import { StickerSizeKey, STICKER_SIZES, LIST_CONFIG } from '@/types/print';

// ============================================================================
// TYPES
// ============================================================================

interface ModalImpressionProduitsProps {
  isOpen: boolean;
  onClose: () => void;
  produits: Produit[];
  nomStructure: string;
  logoStructure?: string;
}

type ViewState = 'main' | 'qr-options';

// ============================================================================
// COMPOSANTS UI
// ============================================================================

/**
 * Barre de progression avec animation
 */
function ProgressBar({
  current,
  total,
  timeRemaining,
  message
}: {
  current: number;
  total: number;
  timeRemaining?: string;
  message: string;
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 mb-4 border border-blue-200"
    >
      <div className="flex justify-between text-sm text-blue-900 mb-2">
        <span className="font-medium">{message}</span>
        <span className="font-bold">{percentage}%</span>
      </div>

      <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {timeRemaining && (
        <p className="text-xs text-blue-700 mt-2 text-center">
          Temps restant estimé : {timeRemaining}
        </p>
      )}
    </motion.div>
  );
}

/**
 * Sélecteur de taille d'étiquettes
 */
function StickerSizeSelector({
  value,
  onChange,
  isMobile
}: {
  value: StickerSizeKey;
  onChange: (size: StickerSizeKey) => void;
  isMobile: boolean;
}) {
  const sizes: Array<{
    key: StickerSizeKey;
    label: string;
    desc: string;
    icon: typeof Grid3X3;
  }> = [
    { key: 'small', label: 'Petites', desc: '40/page', icon: Grid3X3 },
    { key: 'medium', label: 'Moyennes', desc: '20/page', icon: LayoutGrid },
    { key: 'large', label: 'Grandes', desc: '12/page', icon: Square }
  ];

  return (
    <div className="mb-4">
      <label className={`block font-semibold text-gray-800 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
        Taille des étiquettes
      </label>
      <div className="grid grid-cols-3 gap-2">
        {sizes.map((size) => (
          <motion.button
            key={size.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(size.key)}
            className={`
              p-3 rounded-xl border-2 transition-all
              ${value === size.key
                ? 'border-emerald-500 bg-emerald-50/80'
                : 'border-gray-200 bg-white/60 hover:border-gray-300'
              }
            `}
          >
            <size.icon className={`
              ${isMobile ? 'w-5 h-5' : 'w-6 h-6'} mx-auto mb-1
              ${value === size.key ? 'text-emerald-600' : 'text-gray-500'}
            `} />
            <div className={`
              font-semibold
              ${isMobile ? 'text-xs' : 'text-sm'}
              ${value === size.key ? 'text-emerald-700' : 'text-gray-700'}
            `}>
              {size.label}
            </div>
            <div className={`
              ${isMobile ? 'text-[10px]' : 'text-xs'}
              ${value === size.key ? 'text-emerald-600' : 'text-gray-500'}
            `}>
              {size.desc}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/**
 * Alerte d'avertissement
 */
function WarningAlert({ message, isMobile }: { message: string; isMobile: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-amber-50 border border-amber-200 rounded-xl ${isMobile ? 'p-3' : 'p-4'} mb-4`}
    >
      <div className="flex items-start gap-2 text-amber-800">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span className={isMobile ? 'text-xs' : 'text-sm'}>{message}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function ModalImpressionProduits({
  isOpen,
  onClose,
  produits,
  nomStructure,
  logoStructure
}: ModalImpressionProduitsProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // États locaux
  const [viewState, setViewState] = useState<ViewState>('main');
  const [stickerSize, setStickerSize] = useState<StickerSizeKey>('medium');
  const [qrOptions, setQrOptions] = useState({
    afficherNom: true,
    afficherPrix: true
  });

  // Hook d'impression
  const {
    job,
    startPrint,
    cancel,
    reset,
    isProcessing,
    progressMessage,
    timeRemaining,
    warning
  } = usePrintJob({
    produits,
    nomStructure,
    logoStructure
  });

  // Réinitialiser à l'ouverture
  useEffect(() => {
    if (isOpen) {
      reset();
      setViewState('main');
      setStickerSize('medium');
      setQrOptions({ afficherNom: true, afficherPrix: true });
    }
  }, [isOpen, reset]);

  // Calculer statistiques
  const stats = useMemo(() => ({
    totalProduits: produits.length,
    categories: new Set(produits.map(p => p.nom_categorie || 'Sans catégorie')).size,
    valeurStock: produits.reduce((sum, p) => {
      const stock = p.niveau_stock || 0;
      const prix = p.prix_vente || 0;
      return sum + (stock * prix);
    }, 0),
    produitsEnStock: produits.filter(p => (p.niveau_stock || 0) > 0).length,
    pagesListe: Math.ceil(produits.length / LIST_CONFIG.itemsPerPage),
    pagesStickers: Math.ceil(produits.length / STICKER_SIZES[stickerSize].perPage)
  }), [produits, stickerSize]);

  // Handlers
  const handlePrintList = async () => {
    await startPrint({ format: 'list' });
    if (job.status !== 'error') {
      setTimeout(onClose, 500);
    }
  };

  const handlePrintStickers = async () => {
    await startPrint({
      format: 'stickers',
      stickerSize,
      afficherNom: qrOptions.afficherNom,
      afficherPrix: qrOptions.afficherPrix
    });
    if (job.status !== 'error') {
      setTimeout(onClose, 500);
    }
  };

  const handleCancel = () => {
    cancel();
    setTimeout(() => {
      reset();
      onClose();
    }, 500);
  };

  // Styles adaptatifs
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        container: 'max-w-xs',
        padding: 'p-3',
        headerPadding: 'p-4',
        contentPadding: 'p-4',
        titleSize: 'text-lg',
        subtitleSize: 'text-xs',
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
          onClick={!isProcessing ? onClose : undefined}
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
                    <FileText className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} />
                  </div>
                  <div>
                    <h2 className={`${styles.titleSize} font-bold`}>Impression Produits</h2>
                    <p className={`text-emerald-100 ${styles.subtitleSize}`}>
                      {stats.totalProduits} produits
                    </p>
                  </div>
                </div>
                <button
                  onClick={isProcessing ? handleCancel : onClose}
                  className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors`}
                >
                  <X className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className={styles.contentPadding}>
              {/* Badge d'info */}
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {isProcessing ? 'GÉNÉRATION EN COURS' : 'IMPRESSION PDF'}
                </div>
              </div>

              {/* Barre de progression */}
              {isProcessing && (
                <ProgressBar
                  current={job.progress.current}
                  total={job.progress.total}
                  timeRemaining={timeRemaining}
                  message={progressMessage}
                />
              )}

              {/* Avertissement pour grandes listes */}
              {warning && !isProcessing && (
                <WarningAlert message={warning} isMobile={isMobile} />
              )}

              {/* Statistiques */}
              {!isProcessing && (
                <div className={`bg-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 border border-emerald-100`}>
                  <h3 className={`font-bold text-gray-800 ${isMobile ? 'text-sm mb-3' : 'text-base mb-4'}`}>
                    Aperçu du document
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Total produits */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-3 rounded-xl border border-emerald-100">
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mb-1`}>Total produits</div>
                      <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-emerald-600`}>
                        {stats.totalProduits}
                      </div>
                    </div>

                    {/* Catégories */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl border border-blue-100">
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mb-1`}>Catégories</div>
                      <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>
                        {stats.categories}
                      </div>
                    </div>

                    {/* Produits en stock */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 rounded-xl border border-orange-100">
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mb-1`}>En stock</div>
                      <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-600`}>
                        {stats.produitsEnStock}
                      </div>
                    </div>

                    {/* Pages estimées */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-100">
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mb-1`}>
                        Pages (stickers)
                      </div>
                      <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-purple-600`}>
                        {stats.pagesStickers}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message d'erreur */}
              {job.status === 'error' && job.error && (
                <div className={`bg-red-50 border border-red-200 rounded-xl ${isMobile ? 'p-3' : 'p-4'} mb-4`}>
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <span className={isMobile ? 'text-sm' : 'text-base'}>{job.error}</span>
                  </div>
                </div>
              )}

              {/* Message d'annulation */}
              {job.status === 'cancelled' && (
                <div className={`bg-amber-50 border border-amber-200 rounded-xl ${isMobile ? 'p-3' : 'p-4'} mb-4`}>
                  <div className="flex items-center gap-2 text-amber-800">
                    <XCircle className="w-5 h-5" />
                    <span className={isMobile ? 'text-sm' : 'text-base'}>Impression annulée</span>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              {!isProcessing && viewState === 'main' && (
                <>
                  {/* Vue principale: Liste ou Stickers QR */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Imprimer Liste Complète */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePrintList}
                      disabled={produits.length === 0}
                      className={`
                        bg-gradient-to-r from-emerald-500 to-green-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex flex-col items-center justify-center gap-1
                        ${isMobile ? 'text-sm' : 'text-base'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <FileText className={styles.iconSize} />
                      <span>Liste complète</span>
                      <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} opacity-80`}>
                        {stats.pagesListe} page{stats.pagesListe > 1 ? 's' : ''}
                      </span>
                    </motion.button>

                    {/* Stickers QR Codes */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setViewState('qr-options')}
                      disabled={produits.length === 0}
                      className={`
                        bg-gradient-to-r from-blue-500 to-cyan-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex flex-col items-center justify-center gap-1
                        ${isMobile ? 'text-sm' : 'text-base'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <Tag className={styles.iconSize} />
                      <span>Étiquettes QR</span>
                      <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} opacity-80`}>
                        {stats.pagesStickers} page{stats.pagesStickers > 1 ? 's' : ''}
                      </span>
                    </motion.button>
                  </div>

                  {/* Bouton Annuler */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className={`
                      mt-3 w-full
                      bg-white/60 backdrop-blur-sm border-2 border-gray-200
                      text-gray-700 font-semibold ${styles.buttonPadding} rounded-xl
                      hover:bg-white/80 transition-all
                      flex items-center justify-center gap-2
                      ${isMobile ? 'text-sm' : 'text-base'}
                    `}
                  >
                    <X className={styles.iconSize} />
                    Annuler
                  </motion.button>
                </>
              )}

              {/* Options Stickers QR */}
              {!isProcessing && viewState === 'qr-options' && (
                <>
                  <div className={`bg-blue-50/80 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 border border-blue-200`}>
                    <h3 className={`font-bold text-blue-900 ${isMobile ? 'text-sm' : 'text-base'} mb-4 flex items-center gap-2`}>
                      <Tag className="w-5 h-5" />
                      Options d'impression des étiquettes
                    </h3>

                    {/* Sélecteur de taille */}
                    <StickerSizeSelector
                      value={stickerSize}
                      onChange={setStickerSize}
                      isMobile={isMobile}
                    />

                    {/* Options checkboxes */}
                    <div className="space-y-3">
                      {/* Option: Afficher nom */}
                      <motion.label
                        whileTap={{ scale: 0.98 }}
                        className={`
                          flex items-center gap-3 cursor-pointer
                          bg-white/60 backdrop-blur-sm rounded-xl ${isMobile ? 'p-3' : 'p-4'}
                          border-2 transition-all
                          ${qrOptions.afficherNom ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200'}
                        `}
                      >
                        <div className={`
                          w-6 h-6 rounded-lg flex items-center justify-center
                          ${qrOptions.afficherNom ? 'bg-emerald-500' : 'bg-gray-200'}
                          transition-colors
                        `}>
                          {qrOptions.afficherNom && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={qrOptions.afficherNom}
                          onChange={(e) => setQrOptions(prev => ({ ...prev, afficherNom: e.target.checked }))}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'} text-gray-800`}>
                            Afficher le nom du produit
                          </div>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                            Le nom s'affichera sous le QR code
                          </div>
                        </div>
                      </motion.label>

                      {/* Option: Afficher prix */}
                      <motion.label
                        whileTap={{ scale: 0.98 }}
                        className={`
                          flex items-center gap-3 cursor-pointer
                          bg-white/60 backdrop-blur-sm rounded-xl ${isMobile ? 'p-3' : 'p-4'}
                          border-2 transition-all
                          ${qrOptions.afficherPrix ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200'}
                        `}
                      >
                        <div className={`
                          w-6 h-6 rounded-lg flex items-center justify-center
                          ${qrOptions.afficherPrix ? 'bg-emerald-500' : 'bg-gray-200'}
                          transition-colors
                        `}>
                          {qrOptions.afficherPrix && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={qrOptions.afficherPrix}
                          onChange={(e) => setQrOptions(prev => ({ ...prev, afficherPrix: e.target.checked }))}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'} text-gray-800`}>
                            Afficher le prix de vente
                          </div>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                            Le prix s'affichera sous le nom
                          </div>
                        </div>
                      </motion.label>
                    </div>

                    {/* Info format */}
                    <div className={`mt-4 bg-blue-100/60 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-800`}>
                        <strong>{STICKER_SIZES[stickerSize].perRow} étiquettes</strong> par ligne,{' '}
                        <strong>{STICKER_SIZES[stickerSize].perPage}</strong> par page
                      </p>
                    </div>
                  </div>

                  {/* Boutons d'action Options */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Retour */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setViewState('main')}
                      className={`
                        bg-white/60 backdrop-blur-sm border-2 border-gray-200
                        text-gray-700 font-semibold ${styles.buttonPadding} rounded-xl
                        hover:bg-white/80 transition-all
                        flex items-center justify-center gap-2
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      <X className={styles.iconSize} />
                      Retour
                    </motion.button>

                    {/* Imprimer Stickers */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePrintStickers}
                      disabled={produits.length === 0}
                      className={`
                        bg-gradient-to-r from-blue-500 to-cyan-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex items-center justify-center gap-2
                        ${isMobile ? 'text-sm' : 'text-base'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <Printer className={styles.iconSize} />
                      Imprimer
                    </motion.button>
                  </div>
                </>
              )}

              {/* Bouton Annuler pendant génération */}
              {isProcessing && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  className={`
                    w-full
                    bg-gradient-to-r from-red-500 to-rose-600
                    text-white font-semibold ${styles.buttonPadding} rounded-xl
                    shadow-lg hover:shadow-xl transition-all
                    flex items-center justify-center gap-2
                    ${isMobile ? 'text-sm' : 'text-base'}
                  `}
                >
                  <XCircle className={styles.iconSize} />
                  Annuler la génération
                </motion.button>
              )}

              {/* Note */}
              {!isProcessing && (
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 text-center mt-4`}>
                  Les QR codes peuvent être découpés et collés sur vos produits
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
