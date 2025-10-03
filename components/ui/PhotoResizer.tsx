/**
 * Composant PhotoResizer - Modal de redimensionnement de photos
 * Approche 2 (Rapide) : Slider taille + Boutons qualité + Preview temps réel
 * Design glassmorphism thème FayClick (vert/orange)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, AlertCircle, Info, ImageIcon } from 'lucide-react';
import {
  PhotoResizerProps,
  ResizePreview,
  QualityLevel,
  QUALITY_PRESETS,
  SIZE_THRESHOLDS
} from '@/types/photo-resize.types';
import { usePhotoResize } from '@/hooks/usePhotoResize';

export default function PhotoResizer({
  file,
  onCancel,
  onValidate,
  maxSizeMB = 5,
  defaultScale = 0.8,
  defaultQuality = 'medium',
  previewSize = 400
}: PhotoResizerProps) {
  // Hook de redimensionnement
  const {
    processing,
    loadImagePreview,
    generatePreview,
    resizeImage
  } = usePhotoResize();

  // États
  const [scale, setScale] = useState<number>(defaultScale);
  const [quality, setQuality] = useState<QualityLevel>(defaultQuality);
  const [preview, setPreview] = useState<ResizePreview | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Détection côté client pour Portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Charger preview initiale
  useEffect(() => {
    const loadInitialPreview = async () => {
      try {
        setLoading(true);

        // Charger image preview (data URL)
        const url = await loadImagePreview(file);
        setPreviewUrl(url);

        // Générer preview dimensions/tailles
        const previewData = await generatePreview(
          file,
          scale,
          QUALITY_PRESETS[quality]
        );
        setPreview(previewData);
      } catch (error) {
        console.error('❌ [PHOTO-RESIZER] Erreur chargement preview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialPreview();
  }, [file, scale, quality, loadImagePreview, generatePreview]);

  // Mettre à jour preview quand scale/quality change
  useEffect(() => {
    if (!file) return;

    const updatePreview = async () => {
      try {
        const previewData = await generatePreview(
          file,
          scale,
          QUALITY_PRESETS[quality]
        );
        setPreview(previewData);
      } catch (error) {
        console.error('❌ [PHOTO-RESIZER] Erreur mise à jour preview:', error);
      }
    };

    updatePreview();
  }, [scale, quality, file, generatePreview]);

  // Handler validation
  const handleValidate = useCallback(async () => {
    if (!file || processing) return;

    try {
      const result = await resizeImage(file, {
        scale,
        quality: QUALITY_PRESETS[quality],
        maxSizeMB
      });

      if (result.success && result.file) {
        onValidate(result.file);
      } else {
        alert(`Erreur de redimensionnement: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [PHOTO-RESIZER] Erreur validation:', error);
      alert('Erreur lors du redimensionnement');
    }
  }, [file, scale, quality, maxSizeMB, processing, resizeImage, onValidate]);

  // Handler reset
  const handleReset = useCallback(() => {
    setScale(defaultScale);
    setQuality(defaultQuality);
  }, [defaultScale, defaultQuality]);

  // Formatter taille en MB
  const formatSize = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Déterminer couleur indicateur selon taille
  const getSizeIndicator = (size: number) => {
    if (size <= SIZE_THRESHOLDS.PERFECT) {
      return {
        color: 'emerald',
        icon: '🟢',
        message: 'Parfait pour le web!',
        bgClass: 'bg-emerald-50/60',
        borderClass: 'border-emerald-200/50',
        textClass: 'text-emerald-900'
      };
    } else if (size <= SIZE_THRESHOLDS.WARNING) {
      return {
        color: 'orange',
        icon: '🟠',
        message: 'Attention: Fichier volumineux',
        bgClass: 'bg-orange-50/60',
        borderClass: 'border-orange-200/50',
        textClass: 'text-orange-900'
      };
    } else {
      return {
        color: 'red',
        icon: '🔴',
        message: 'Réduisez davantage la taille',
        bgClass: 'bg-red-50/60',
        borderClass: 'border-red-200/50',
        textClass: 'text-red-900'
      };
    }
  };

  const indicator = preview ? getSizeIndicator(preview.newSize) : null;

  // Ne rien rendre côté serveur (SSR)
  if (!mounted) return null;

  // Rendu via Portal pour sortir du conteneur parent
  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      >
        {/* Modal - Mobile First Design */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[95vw] max-w-lg mx-auto my-4 max-h-[95vh] overflow-y-auto rounded-2xl md:rounded-3xl shadow-2xl"
        >
          {/* Background glassmorphism multicouches */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/92 to-white/88 backdrop-blur-2xl rounded-2xl md:rounded-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-orange-500/8 rounded-2xl md:rounded-3xl" />
          <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-white/60 shadow-inner" />

          {/* Contenu */}
          <div className="relative z-10 p-3 md:p-5 space-y-2.5 md:space-y-3">
            {/* Header - Responsive */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg flex-shrink-0">
                  <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                    Redimensionner votre photo
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600 mt-0.5 leading-tight">
                    Ajustez la taille et la qualité
                  </p>
                </div>
              </div>

              {/* Bouton fermer */}
              <button
                onClick={onCancel}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                disabled={processing}
              >
                <X className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </button>
            </div>

            {/* Preview Image - Compact */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-[200px] md:max-w-[280px] aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg md:rounded-xl overflow-hidden shadow-lg border border-gray-200">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-10 h-10 md:w-12 md:h-12" />
                  </div>
                )}

                {/* Dimensions affichées */}
                {preview && (
                  <div className="absolute bottom-1 md:bottom-1.5 right-1 md:right-1.5 px-1.5 md:px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9px] md:text-[10px] text-white font-medium">
                    {preview.newDimensions.width} × {preview.newDimensions.height} px
                  </div>
                )}
              </div>
            </div>

            {/* Slider Taille - Responsive */}
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs md:text-sm font-semibold text-gray-900">
                  📏 Taille
                </label>
                <span className="text-sm md:text-base font-bold text-emerald-600">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="25"
                max="100"
                step="5"
                value={scale * 100}
                onChange={(e) => setScale(Number(e.target.value) / 100)}
                disabled={processing || loading}
                className="w-full h-2 bg-gradient-to-r from-emerald-200 to-orange-200 rounded-lg appearance-none cursor-pointer touch-none
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 md:[&::-webkit-slider-thumb]:w-6 md:[&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-emerald-500
                  [&::-webkit-slider-thumb]:to-emerald-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                  [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 md:[&::-moz-range-thumb]:w-6 md:[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-emerald-500 [&::-moz-range-thumb]:to-emerald-600
                  [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2
                  [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:border-none"
              />

              <div className="flex justify-between text-[10px] md:text-xs text-gray-500">
                <span>25%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Informations - Compact */}
            {preview && (
              <div className="p-2 md:p-2.5 bg-blue-50/60 backdrop-blur-sm rounded-lg border border-blue-200/50 space-y-0.5 md:space-y-1">
                <div className="text-[10px] md:text-xs text-blue-900 space-y-0.5">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">Original:</span>
                    <span className="font-bold text-right">
                      {preview.originalDimensions.width}×{preview.originalDimensions.height} ({formatSize(preview.originalSize)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">Nouveau:</span>
                    <span className="font-bold text-right">
                      {preview.newDimensions.width}×{preview.newDimensions.height} ({formatSize(preview.newSize)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons Qualité - Responsive */}
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-xs md:text-sm font-semibold text-gray-900">
                🎨 Qualité JPEG
              </label>

              <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                {(['low', 'medium', 'high'] as QualityLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setQuality(level)}
                    disabled={processing || loading}
                    className={`px-2 md:px-3 py-2 md:py-2.5 rounded-lg text-[11px] md:text-sm font-semibold transition-all ${
                      quality === level
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg scale-[1.02] md:scale-105'
                        : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200'
                    }`}
                  >
                    <span className="hidden md:inline">
                      {level === 'low' && 'Basse (60%)'}
                      {level === 'medium' && 'Moyenne (80%)'}
                      {level === 'high' && 'Haute (90%)'}
                    </span>
                    <span className="md:hidden">
                      {level === 'low' && 'Basse'}
                      {level === 'medium' && 'Moy.'}
                      {level === 'high' && 'Haute'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Indicateur Taille - Compact */}
            {indicator && preview && (
              <div className={`flex items-center gap-1.5 p-2 md:p-2.5 ${indicator.bgClass} backdrop-blur-sm rounded-lg border ${indicator.borderClass}`}>
                <span className="text-sm md:text-base flex-shrink-0">{indicator.icon}</span>
                <div className={`flex-1 min-w-0 text-[10px] md:text-xs ${indicator.textClass}`}>
                  <strong>{indicator.message}</strong>
                  <span className="ml-1">
                    {formatSize(preview.newSize)}
                    {maxSizeMB && preview.newSize > maxSizeMB * 1024 * 1024 && (
                      <> (Max: {maxSizeMB} MB)</>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Note d'aide - Compact sans label */}
            <div className="flex items-center gap-1.5 p-1.5 md:p-2 bg-amber-50/60 backdrop-blur-sm rounded-lg border border-amber-200/50">
              <Info className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600 flex-shrink-0" />
              <p className="text-[9px] md:text-[10px] text-amber-900 leading-tight">
                Réduisez la taille à 50-80% pour un bon compromis qualité/poids.
              </p>
            </div>

            {/* Boutons Actions - Responsive */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-2.5">
              {/* Reset button - Hidden on mobile, shown on desktop */}
              <button
                onClick={handleReset}
                disabled={processing || loading}
                className="hidden md:flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/80 hover:bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              {/* Annuler + Valider - Full width on mobile */}
              <div className="flex gap-2 flex-1">
                <button
                  onClick={onCancel}
                  disabled={processing}
                  className="flex-1 md:flex-none md:min-w-[100px] px-3 md:px-4 py-2.5 md:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm md:text-base font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  <span className="md:hidden">❌</span>
                  <span className="hidden md:inline">❌ Annuler</span>
                </button>

                <button
                  onClick={handleValidate}
                  disabled={processing || loading}
                  className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm md:text-base font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden md:inline">Traitement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Valider</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Utiliser createPortal pour monter au niveau du body
  return createPortal(modalContent, document.body);
}
