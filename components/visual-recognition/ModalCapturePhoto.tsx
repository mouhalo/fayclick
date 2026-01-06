/**
 * ModalCapturePhoto
 * Modal de capture photo pour enrôlement/reconnaissance visuelle
 * FayClick V2 - Commerce
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  Loader2,
  SwitchCamera,
  ImagePlus,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useVisualRecognition } from '@/hooks/useVisualRecognition';
import { VisualMatch } from '@/services/visual-recognition';

interface ModalCapturePhotoProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'enroll' | 'recognize';
  idStructure: number;
  idProduit?: number;           // Requis pour mode 'enroll'
  nomProduit?: string;          // Nom du produit pour affichage
  onEnrolled?: () => void;      // Callback après enrôlement réussi
  onRecognized?: (match: VisualMatch | null) => void;  // Callback après reconnaissance
}

export function ModalCapturePhoto({
  isOpen,
  onClose,
  mode,
  idStructure,
  idProduit,
  nomProduit,
  onEnrolled,
  onRecognized
}: ModalCapturePhotoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const {
    state,
    isProcessing,
    isReady,
    error,
    enroll,
    recognize,
    stats,
    reset
  } = useVisualRecognition({ idStructure, autoInit: isOpen });

  // Démarrer la caméra
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        setCameraError(null);

        // Arrêter le stream existant
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('[Camera] Erreur:', err);
        setCameraError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isOpen, facingMode]);

  // Nettoyer à la fermeture
  useEffect(() => {
    if (!isOpen) {
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setCapturedImage(null);
      setPreviewUrl(null);
      reset();
    }
  }, [isOpen]);

  // Nettoyer l'URL de preview
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Capturer une image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      blob => {
        if (blob) {
          setCapturedImage(blob);
          setPreviewUrl(URL.createObjectURL(blob));
        }
      },
      'image/jpeg',
      0.9
    );
  }, []);

  // Reprendre la capture
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    reset();
  }, [previewUrl, reset]);

  // Changer de caméra
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Importer depuis la galerie
  const importFromGallery = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  // Traiter l'image
  const processImage = useCallback(async () => {
    console.log('[ModalCapturePhoto] processImage appelé, mode:', mode);
    console.log('[ModalCapturePhoto] capturedImage:', capturedImage ? 'présent' : 'null');
    console.log('[ModalCapturePhoto] isReady:', isReady);

    if (!capturedImage) {
      console.warn('[ModalCapturePhoto] Pas d\'image capturée');
      return;
    }

    if (mode === 'enroll' && idProduit) {
      console.log('[ModalCapturePhoto] Mode enrôlement, idProduit:', idProduit);
      const result = await enroll(idProduit, capturedImage);
      if (result.success) {
        onEnrolled?.();
        onClose();
      }
    } else if (mode === 'recognize') {
      console.log('[ModalCapturePhoto] Mode reconnaissance, lancement...');
      const result = await recognize(capturedImage);
      console.log('[ModalCapturePhoto] Résultat recognize:', result);
      if (result) {
        console.log('[ModalCapturePhoto] topMatch:', result.topMatch);
        onRecognized?.(result.topMatch);
      } else {
        console.log('[ModalCapturePhoto] Pas de résultat, appel onRecognized(null)');
        onRecognized?.(null);
      }
    }
  }, [capturedImage, mode, idProduit, enroll, recognize, onEnrolled, onRecognized, onClose, isReady]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 bg-white/10 backdrop-blur-sm rounded-full"
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>

          <div className="text-center">
            <h2 className="text-white font-semibold text-sm">
              {mode === 'enroll' ? 'Enregistrer image' : 'Scanner produit'}
            </h2>
            {nomProduit && (
              <p className="text-white/70 text-xs truncate max-w-[200px]">
                {nomProduit}
              </p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            className="p-2 bg-white/10 backdrop-blur-sm rounded-full"
          >
            <SwitchCamera className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Zone caméra / Preview */}
        <div className="flex-1 relative">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6">
              <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
              <p className="text-white text-center mb-4">{cameraError}</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={importFromGallery}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2"
              >
                <ImagePlus className="w-5 h-5" />
                Importer depuis la galerie
              </motion.button>
            </div>
          ) : previewUrl ? (
            // Image capturée
            <img
              src={previewUrl}
              alt="Captured"
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            // Flux vidéo
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Canvas caché pour capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Guide de cadrage */}
          {!previewUrl && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="w-64 h-64 border-2 border-white/40 rounded-2xl" />
                {/* Coins décoratifs */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
              </div>
              <p className="absolute bottom-8 text-white/70 text-sm">
                Centrez le produit dans le cadre
              </p>
            </div>
          )}

          {/* Overlay de traitement */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-white font-medium">
                {mode === 'enroll' ? 'Enregistrement...' : 'Analyse en cours...'}
              </p>
              <p className="text-white/60 text-sm mt-1">
                Extraction des caractéristiques visuelles
              </p>
            </div>
          )}

          {/* État succès enrôlement */}
          {state === 'enrolled' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex flex-col items-center justify-center"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-white" />
              </div>
              <p className="text-white font-bold text-lg">Image enregistrée !</p>
              <p className="text-white/80 text-sm mt-1">
                Le produit peut maintenant être reconnu
              </p>
            </motion.div>
          )}

          {/* Erreur */}
          {error && state === 'error' && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-24 left-4 right-4 bg-red-500/90 backdrop-blur-sm rounded-xl p-3"
            >
              <p className="text-white text-sm text-center">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Stats */}
        {stats && !previewUrl && (
          <div className="absolute bottom-32 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{stats.totalEmbeddings} produits enregistrés</span>
            </div>
          </div>
        )}

        {/* Contrôles */}
        <div className="p-4 pb-8 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
          <div className="flex items-center justify-center gap-6">
            {previewUrl ? (
              <>
                {/* Reprendre */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={retakePhoto}
                  disabled={isProcessing}
                  className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center disabled:opacity-50"
                >
                  <RotateCcw className="w-6 h-6 text-white" />
                </motion.button>

                {/* Valider */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={processImage}
                  disabled={isProcessing || !isReady}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Check className="w-8 h-8 text-white" />
                  )}
                </motion.button>

                {/* Galerie */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={importFromGallery}
                  disabled={isProcessing}
                  className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center disabled:opacity-50"
                >
                  <ImagePlus className="w-6 h-6 text-white" />
                </motion.button>
              </>
            ) : (
              <>
                {/* Galerie */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={importFromGallery}
                  className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <ImagePlus className="w-6 h-6 text-white" />
                </motion.button>

                {/* Capture */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={captureImage}
                  disabled={!stream}
                  className="w-20 h-20 rounded-full bg-white border-4 border-white/30 disabled:opacity-50"
                />

                {/* Placeholder pour symétrie */}
                <div className="w-14 h-14" />
              </>
            )}
          </div>
        </div>

        {/* Input fichier caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalCapturePhoto;
