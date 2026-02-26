/**
 * Composant PhotoResizer - Modal de redimensionnement de photos
 * Mode photo : Slider taille + Boutons qualité + Preview temps réel
 * Mode logo : Étape Crop (react-easy-crop) + Étape Resize
 * Design glassmorphism thème FayClick
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, Info, ImageIcon, Crop, ChevronRight, ChevronLeft, Circle, Square } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
  PhotoResizerProps,
  ResizePreview,
  QualityLevel,
  QUALITY_PRESETS,
  SIZE_THRESHOLDS,
  LOGO_SIZE_THRESHOLDS,
  CropShape
} from '@/types/photo-resize.types';
import { usePhotoResize } from '@/hooks/usePhotoResize';

export default function PhotoResizer({
  file,
  onCancel,
  onValidate,
  maxSizeMB = 5,
  defaultScale = 0.8,
  defaultQuality = 'medium',
  previewSize = 400,
  mode = 'photo',
  initialCropShape = 'rect'
}: PhotoResizerProps) {
  const {
    processing,
    loadImagePreview,
    generatePreview,
    resizeImage,
    cropImage
  } = usePhotoResize();

  // Seuils de taille selon le mode
  const sizeThresholds = mode === 'logo' ? LOGO_SIZE_THRESHOLDS : SIZE_THRESHOLDS;

  // États communs
  const [scale, setScale] = useState<number>(defaultScale);
  const [quality, setQuality] = useState<QualityLevel>(defaultQuality);
  const [preview, setPreview] = useState<ResizePreview | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // États crop (mode logo)
  const [step, setStep] = useState<'crop' | 'resize'>(mode === 'logo' ? 'crop' : 'resize');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropShape, setCropShape] = useState<CropShape>(initialCropShape);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);

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
        const url = await loadImagePreview(file);
        setPreviewUrl(url);

        // En mode photo ou étape resize, générer preview dimensions
        if (mode === 'photo' || step === 'resize') {
          const activeFile = croppedFile || file;
          const previewData = await generatePreview(activeFile, scale, QUALITY_PRESETS[quality]);
          setPreview(previewData);
        }
      } catch (error) {
        console.error('❌ [PHOTO-RESIZER] Erreur chargement preview:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Mettre à jour preview quand scale/quality change (étape resize)
  useEffect(() => {
    const activeFile = croppedFile || file;
    if (!activeFile || step !== 'resize') return;

    const updatePreview = async () => {
      try {
        const previewData = await generatePreview(activeFile, scale, QUALITY_PRESETS[quality]);
        setPreview(previewData);
      } catch (error) {
        console.error('❌ [PHOTO-RESIZER] Erreur mise à jour preview:', error);
      }
    };
    updatePreview();
  }, [scale, quality, croppedFile, file, step, generatePreview]);

  // Callback crop complete
  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Handler crop → resize
  const handleCropNext = useCallback(async () => {
    if (!file || !croppedAreaPixels || processing) return;
    try {
      setLoading(true);
      const cropped = await cropImage(file, croppedAreaPixels, cropShape);
      setCroppedFile(cropped);

      const url = await loadImagePreview(cropped);
      setPreviewUrl(url);

      const previewData = await generatePreview(cropped, scale, QUALITY_PRESETS[quality]);
      setPreview(previewData);

      setStep('resize');
    } catch (error) {
      console.error('❌ [PHOTO-RESIZER] Erreur crop:', error);
      alert('Erreur lors du recadrage');
    } finally {
      setLoading(false);
    }
  }, [file, croppedAreaPixels, cropShape, processing, cropImage, loadImagePreview, generatePreview, scale, quality]);

  // Handler retour crop
  const handleBackToCrop = useCallback(async () => {
    setCroppedFile(null);
    setStep('crop');
    // Recharger preview originale
    try {
      const url = await loadImagePreview(file);
      setPreviewUrl(url);
    } catch (e) {
      // ignore
    }
  }, [file, loadImagePreview]);

  // Handler validation finale
  const handleValidate = useCallback(async () => {
    const fileToResize = croppedFile || file;
    if (!fileToResize || processing) return;

    try {
      const result = await resizeImage(fileToResize, {
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
  }, [croppedFile, file, scale, quality, maxSizeMB, processing, resizeImage, onValidate]);

  // Handler reset
  const handleReset = useCallback(() => {
    setScale(defaultScale);
    setQuality(defaultQuality);
  }, [defaultScale, defaultQuality]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getSizeIndicator = (size: number) => {
    if (size <= sizeThresholds.PERFECT) {
      return {
        icon: '🟢',
        message: mode === 'logo' ? 'Taille optimale pour un logo!' : 'Parfait pour le web!',
        bgClass: 'bg-emerald-50/60',
        borderClass: 'border-emerald-200/50',
        textClass: 'text-emerald-900'
      };
    } else if (size <= sizeThresholds.WARNING) {
      return {
        icon: '🟠',
        message: 'Attention: Fichier volumineux',
        bgClass: 'bg-orange-50/60',
        borderClass: 'border-orange-200/50',
        textClass: 'text-orange-900'
      };
    } else {
      return {
        icon: '🔴',
        message: 'Réduisez davantage la taille',
        bgClass: 'bg-red-50/60',
        borderClass: 'border-red-200/50',
        textClass: 'text-red-900'
      };
    }
  };

  const indicator = preview ? getSizeIndicator(preview.newSize) : null;

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[95vw] max-w-lg mx-auto my-4 max-h-[95vh] overflow-y-auto rounded-2xl md:rounded-3xl shadow-2xl"
        >
          {/* Background glassmorphism */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/92 to-white/88 backdrop-blur-2xl rounded-2xl md:rounded-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-orange-500/8 rounded-2xl md:rounded-3xl" />
          <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-white/60 shadow-inner" />

          <div className="relative z-10 p-3 md:p-5 space-y-2.5 md:space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                <div className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br ${step === 'crop' ? 'from-indigo-500 to-indigo-600' : 'from-emerald-500 to-emerald-600'} rounded-lg shadow-lg flex-shrink-0`}>
                  {step === 'crop' ? (
                    <Crop className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  ) : (
                    <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                    {step === 'crop' ? 'Recadrer votre logo' : mode === 'logo' ? 'Ajuster la taille' : 'Redimensionner votre photo'}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600 mt-0.5 leading-tight">
                    {step === 'crop'
                      ? 'Déplacez et zoomez pour cadrer votre logo'
                      : 'Ajustez la taille et la qualité'
                    }
                  </p>
                  {mode === 'logo' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-2 h-2 rounded-full ${step === 'crop' ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                      <div className={`w-2 h-2 rounded-full ${step === 'resize' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-[10px] text-gray-500 ml-1">
                        Étape {step === 'crop' ? '1/2' : '2/2'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={onCancel}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                disabled={processing}
              >
                <X className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </button>
            </div>

            {/* === ÉTAPE CROP (mode logo uniquement) === */}
            {step === 'crop' && (
              <>
                <div className="relative w-full aspect-square bg-gray-900 rounded-xl overflow-hidden">
                  {previewUrl ? (
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={cropZoom}
                      aspect={1}
                      cropShape={cropShape}
                      showGrid={cropShape === 'rect'}
                      onCropChange={setCrop}
                      onZoomChange={setCropZoom}
                      onCropComplete={onCropComplete}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Toggle forme */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Forme :</span>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setCropShape('rect')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        cropShape === 'rect'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Square className="w-3.5 h-3.5" />
                      Carré
                    </button>
                    <button
                      onClick={() => setCropShape('round')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        cropShape === 'round'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Circle className="w-3.5 h-3.5" />
                      Rond
                    </button>
                  </div>
                </div>

                {/* Slider Zoom */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs md:text-sm font-semibold text-gray-900">Zoom</label>
                    <span className="text-sm font-bold text-indigo-600">{cropZoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer touch-none
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 md:[&::-webkit-slider-thumb]:w-6 md:[&::-webkit-slider-thumb]:h-6
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-indigo-500
                      [&::-webkit-slider-thumb]:to-indigo-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                      [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 md:[&::-moz-range-thumb]:w-6 md:[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-indigo-500 [&::-moz-range-thumb]:to-indigo-600
                      [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:border-none"
                  />
                </div>

                {/* Boutons crop */}
                <div className="flex gap-2">
                  <button
                    onClick={onCancel}
                    disabled={processing}
                    className="flex-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCropNext}
                    disabled={processing || loading || !croppedAreaPixels}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                  >
                    {processing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Suivant
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* === ÉTAPE RESIZE === */}
            {step === 'resize' && (
              <>
                {/* Preview Image */}
                <div className="flex justify-center">
                  <div className="relative w-full max-w-[200px] md:max-w-[280px] aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg md:rounded-xl overflow-hidden shadow-lg border border-gray-200">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-10 h-10 md:w-12 md:h-12" />
                      </div>
                    )}
                    {preview && (
                      <div className="absolute bottom-1 md:bottom-1.5 right-1 md:right-1.5 px-1.5 md:px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9px] md:text-[10px] text-white font-medium">
                        {preview.newDimensions.width} × {preview.newDimensions.height} px
                      </div>
                    )}
                  </div>
                </div>

                {/* Slider Taille */}
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs md:text-sm font-semibold text-gray-900">Taille</label>
                    <span className="text-sm md:text-base font-bold text-emerald-600">{Math.round(scale * 100)}%</span>
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

                {/* Informations */}
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

                {/* Boutons Qualité */}
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-900">Qualité JPEG</label>
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

                {/* Indicateur Taille */}
                {indicator && preview && (
                  <div className={`flex items-center gap-1.5 p-2 md:p-2.5 ${indicator.bgClass} backdrop-blur-sm rounded-lg border ${indicator.borderClass}`}>
                    <span className="text-sm md:text-base flex-shrink-0">{indicator.icon}</span>
                    <div className={`flex-1 min-w-0 text-[10px] md:text-xs ${indicator.textClass}`}>
                      <strong>{indicator.message}</strong>
                      <span className="ml-1">{formatSize(preview.newSize)}</span>
                    </div>
                  </div>
                )}

                {/* Note d'aide */}
                <div className="flex items-center gap-1.5 p-1.5 md:p-2 bg-amber-50/60 backdrop-blur-sm rounded-lg border border-amber-200/50">
                  <Info className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-[9px] md:text-[10px] text-amber-900 leading-tight">
                    {mode === 'logo'
                      ? 'Un logo de 100-200 KB est idéal pour vos factures et votre profil.'
                      : 'Réduisez la taille à 50-80% pour un bon compromis qualité/poids.'
                    }
                  </p>
                </div>

                {/* Boutons Actions */}
                <div className="flex gap-2">
                  {mode === 'logo' ? (
                    <button
                      onClick={handleBackToCrop}
                      disabled={processing}
                      className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden md:inline">Retour</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleReset}
                      disabled={processing || loading}
                      className="hidden md:flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/80 hover:bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}

                  <div className="flex gap-2 flex-1">
                    <button
                      onClick={onCancel}
                      disabled={processing}
                      className="flex-1 md:flex-none md:min-w-[100px] px-3 md:px-4 py-2.5 md:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm md:text-base font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      Annuler
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
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
