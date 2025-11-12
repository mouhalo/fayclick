/**
 * Modal d'impression de la liste des produits
 * Design glassmorphisme vert avec prévisualisation et statistiques
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, FileText, Package, AlertCircle, Tag, Check } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Produit } from '@/types/produit';
import { printProduitsList, printQRStickers } from '@/services/produits-print.service';

interface ModalImpressionProduitsProps {
  isOpen: boolean;
  onClose: () => void;
  produits: Produit[];
  nomStructure: string;
  logoStructure?: string;
}

export function ModalImpressionProduits({
  isOpen,
  onClose,
  produits,
  nomStructure,
  logoStructure
}: ModalImpressionProduitsProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQROptions, setShowQROptions] = useState(false);
  const [qrOptions, setQrOptions] = useState({
    afficherNom: true,
    afficherPrix: true
  });

  // Réinitialiser l'état à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setError(null);
      setShowQROptions(false);
      setQrOptions({ afficherNom: true, afficherPrix: true });
    }
  }, [isOpen]);

  // Calculer statistiques
  const stats = {
    totalProduits: produits.length,
    categories: new Set(produits.map(p => p.nom_categorie || 'Sans catégorie')).size,
    valeurStock: produits.reduce((sum, p) => {
      const stock = p.niveau_stock || 0;
      const prix = p.prix_vente || 0;
      return sum + (stock * prix);
    }, 0),
    produitsEnStock: produits.filter(p => (p.niveau_stock || 0) > 0).length
  };

  // Lancer l'impression liste complète
  const handlePrint = async () => {
    if (produits.length === 0) {
      setError('Aucun produit à imprimer');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🖨️ [MODAL IMPRESSION] Lancement impression...');

      const success = await printProduitsList({
        produits,
        nomStructure,
        logoStructure
      });

      if (success) {
        console.log('✅ [MODAL IMPRESSION] Impression réussie');
        // Fermer le modal après un court délai
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setError('Impossible d\'ouvrir la fenêtre d\'impression');
      }
    } catch (err) {
      console.error('❌ [MODAL IMPRESSION] Erreur:', err);
      setError('Une erreur est survenue lors de l\'impression');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lancer l'impression des stickers QR codes
  const handlePrintQRStickers = async () => {
    if (produits.length === 0) {
      setError('Aucun produit à imprimer');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🖨️ [MODAL IMPRESSION] Lancement impression stickers QR...');

      const success = await printQRStickers({
        produits,
        nomStructure,
        afficherNom: qrOptions.afficherNom,
        afficherPrix: qrOptions.afficherPrix
      });

      if (success) {
        console.log('✅ [MODAL IMPRESSION] Impression stickers réussie');
        // Fermer le modal après un court délai
        setTimeout(() => {
          setShowQROptions(false);
          onClose();
        }, 500);
      } else {
        setError('Impossible d\'ouvrir la fenêtre d\'impression');
      }
    } catch (err) {
      console.error('❌ [MODAL IMPRESSION] Erreur:', err);
      setError('Une erreur est survenue lors de l\'impression');
    } finally {
      setIsProcessing(false);
    }
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
                    <FileText className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} />
                  </div>
                  <div>
                    <h2 className={`${styles.titleSize} font-bold`}>Impression Produits</h2>
                    <p className={`text-emerald-100 ${styles.subtitleSize}`}>📦 Liste avec QR codes</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50`}
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
                  IMPRESSION PDF
                </div>
              </div>

              {/* Statistiques */}
              <div className={`bg-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-emerald-100`}>
                <h3 className={`font-bold text-gray-800 ${isMobile ? 'text-sm mb-3' : 'text-base mb-4'}`}>
                  📊 Aperçu du document
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

                  {/* Valeur stock */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-100">
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mb-1`}>Valeur stock</div>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-purple-600`}>
                      {stats.valeurStock.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className={`bg-red-50 border border-red-200 rounded-xl ${isMobile ? 'p-3' : 'p-4'} mb-4`}>
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <span className={isMobile ? 'text-sm' : 'text-base'}>{error}</span>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              {!showQROptions ? (
                <>
                  {/* Vue principale: Liste ou Stickers QR */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Imprimer Liste Complète */}
                    <motion.button
                      whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                      whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                      onClick={handlePrint}
                      disabled={isProcessing || produits.length === 0}
                      className={`
                        bg-gradient-to-r from-emerald-500 to-green-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex items-center justify-center gap-2
                        ${isMobile ? 'text-sm' : 'text-base'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {isProcessing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className={styles.iconSize}
                          >
                            <Printer className={styles.iconSize} />
                          </motion.div>
                          Génération...
                        </>
                      ) : (
                        <>
                          <FileText className={styles.iconSize} />
                          Liste complète
                        </>
                      )}
                    </motion.button>

                    {/* Stickers QR Codes */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowQROptions(true)}
                      disabled={isProcessing || produits.length === 0}
                      className={`
                        bg-gradient-to-r from-blue-500 to-cyan-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex items-center justify-center gap-2
                        ${isMobile ? 'text-sm' : 'text-base'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <Tag className={styles.iconSize} />
                      Stickers QR
                    </motion.button>
                  </div>

                  {/* Bouton Annuler */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    disabled={isProcessing}
                    className={`
                      mt-3 w-full
                      bg-white/60 backdrop-blur-sm border-2 border-gray-200
                      text-gray-700 font-semibold ${styles.buttonPadding} rounded-xl
                      hover:bg-white/80 transition-all
                      flex items-center justify-center gap-2
                      ${isMobile ? 'text-sm' : 'text-base'}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <X className={styles.iconSize} />
                    Annuler
                  </motion.button>
                </>
              ) : (
                <>
                  {/* Options Stickers QR */}
                  <div className={`bg-blue-50/80 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 border border-blue-200`}>
                    <h3 className={`font-bold text-blue-900 ${isMobile ? 'text-sm' : 'text-base'} mb-4 flex items-center gap-2`}>
                      <Tag className="w-5 h-5" />
                      Options d'impression des stickers
                    </h3>

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
                        <strong>Format:</strong> 4 stickers par ligne, découpage facile
                      </p>
                    </div>
                  </div>

                  {/* Boutons d'action Options */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Retour */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowQROptions(false)}
                      disabled={isProcessing}
                      className={`
                        bg-white/60 backdrop-blur-sm border-2 border-gray-200
                        text-gray-700 font-semibold ${styles.buttonPadding} rounded-xl
                        hover:bg-white/80 transition-all
                        flex items-center justify-center gap-2
                        ${isMobile ? 'text-sm' : 'text-base'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <X className={styles.iconSize} />
                      Retour
                    </motion.button>

                    {/* Imprimer Stickers */}
                    <motion.button
                      whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                      whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                      onClick={handlePrintQRStickers}
                      disabled={isProcessing || produits.length === 0}
                      className={`
                        bg-gradient-to-r from-blue-500 to-cyan-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex items-center justify-center gap-2
                        ${isMobile ? 'text-sm' : 'text-base'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {isProcessing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className={styles.iconSize}
                          >
                            <Printer className={styles.iconSize} />
                          </motion.div>
                          Génération...
                        </>
                      ) : (
                        <>
                          <Printer className={styles.iconSize} />
                          Imprimer
                        </>
                      )}
                    </motion.button>
                  </div>
                </>
              )}

              {/* Note */}
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 text-center mt-4`}>
                💡 Les QR codes peuvent être découpés et collés sur vos produits
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
