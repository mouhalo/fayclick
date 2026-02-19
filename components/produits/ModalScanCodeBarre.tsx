/**
 * Modal fullscreen pour scanner les codes-barres
 * Design glassmorphism vert avec animations Framer Motion
 * Compatible PWA et mobile-first
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Flashlight, CheckCircle, AlertCircle } from 'lucide-react';
import BarcodeScanner, { BarcodeFormat } from 'react-qr-barcode-scanner';

interface ModalScanCodeBarreProps {
  /** Modal ouvert/fermé */
  isOpen: boolean;
  /** Callback fermeture modal */
  onClose: () => void;
  /** Callback scan réussi avec le code */
  onScanSuccess: (code: string) => void;
  /** Contexte d'utilisation */
  context: 'panier' | 'ajout-produit' | 'venteflash';
}

export function ModalScanCodeBarre({
  isOpen,
  onClose,
  onScanSuccess,
  context
}: ModalScanCodeBarreProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Demander permission caméra au montage
   */
  useEffect(() => {
    if (isOpen) {
      requestCameraPermission();
      setScanning(true);
      setScanSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  /**
   * Demande d'accès à la caméra
   */
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Caméra arrière par défaut
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      // Stopper immédiatement le stream (Scanner va gérer sa propre instance)
      stream.getTracks().forEach(track => track.stop());

      setHasPermission(true);
      setErrorMessage(null);
    } catch (err) {
      console.error('❌ [MODAL SCAN] Permission caméra refusée:', err);

      let message = 'Impossible d\'accéder à la caméra';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = 'Permission refusée. Autorisez la caméra dans les paramètres.';
        } else if (err.name === 'NotFoundError') {
          message = 'Aucune caméra détectée sur cet appareil.';
        } else if (err.name === 'NotReadableError') {
          message = 'Caméra déjà utilisée par une autre application.';
        }
      }

      setErrorMessage(message);
      setHasPermission(false);
    }
  };

  /**
   * Handler scan (onUpdate du BarcodeScanner)
   */
  const handleUpdate = useCallback((err: unknown, result?: any) => {
    if (err) {
      // Ignorer "NotFoundException" - c'est normal quand aucun code n'est détecté
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('NotFoundException') || errorMessage.includes('No MultiFormat Readers')) {
        return; // Pas d'erreur, juste pas de code détecté dans cette frame
      }
      console.error('❌ [MODAL SCAN] Erreur scan:', err);
      return;
    }

    if (!result || !scanning) return;

    const code = result.getText();
    if (!code) return;

    console.log('📊 [MODAL SCAN] Code détecté:', code, 'Format:', result.getBarcodeFormat());

    // Bloquer nouveaux scans
    setScanning(false);
    setScanSuccess(true);

    // Vibration si supporté (mobile)
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Callback avec le code
    onScanSuccess(code);

    // Fermer après 500ms (feedback visuel)
    setTimeout(() => {
      onClose();
      setScanning(true);
      setScanSuccess(false);
    }, 500);
  }, [scanning, onScanSuccess, onClose]);

  /**
   * Handler erreur caméra (onError du BarcodeScanner)
   */
  const handleCameraError = useCallback((error: string | DOMException) => {
    console.error('❌ [MODAL SCAN] Erreur caméra:', error);

    let message = 'Impossible d\'accéder à la caméra';
    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        message = 'Permission refusée. Autorisez la caméra dans les paramètres.';
      } else if (error.name === 'NotFoundError') {
        message = 'Aucune caméra détectée sur cet appareil.';
      } else if (error.name === 'NotReadableError') {
        message = 'Caméra déjà utilisée par une autre application.';
      }
    }

    setErrorMessage(message);
    setHasPermission(false);
  }, []);

  /**
   * Toggle torche (si supporté)
   */
  const handleToggleTorch = useCallback(() => {
    setTorchEnabled(prev => !prev);
    // Note: L'activation de la torche dépend du support navigateur
    // Certains navigateurs ne le supportent pas encore
  }, []);

  /**
   * Fermeture manuelle
   */
  const handleClose = useCallback(() => {
    setScanning(false);
    setScanSuccess(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <style>{`
        .scanner-fullscreen-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black scanner-fullscreen-container"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 to-transparent p-4 safe-top">
          <div className="flex items-center justify-between text-white">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                Scanner un code-barres
              </h2>
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                {context === 'panier'
                  ? 'Centrez le code pour ajouter au panier'
                  : 'Scannez le code du nouveau produit'}
              </p>
            </div>

            <button
              onClick={handleClose}
              className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors ml-4"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Zone Scanner */}
        <div className="relative w-full h-full bg-black">
          {hasPermission === false ? (
            /* Permission refusée */
            <div className="flex items-center justify-center h-full text-white text-center p-6">
              <div className="max-w-md">
                <AlertCircle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-red-400" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3">Accès caméra refusé</h3>
                <p className="text-white/80 mb-6">
                  {errorMessage || 'Autorisez l\'accès à la caméra dans les paramètres de votre navigateur'}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={requestCameraPermission}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors"
                  >
                    Réessayer
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          ) : hasPermission === null ? (
            /* Chargement permission */
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <Camera className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 animate-pulse" />
                <p className="text-lg sm:text-xl font-medium">Demande d'accès caméra...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Conteneur Scanner avec dimensions fixes */}
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}
              >
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <BarcodeScanner
                    onUpdate={handleUpdate}
                    onError={handleCameraError}
                    width="100%"
                    height="100%"
                    facingMode="environment"
                    torch={torchEnabled}
                    delay={100}
                    formats={[
                      BarcodeFormat.EAN_13,         // Codes-barres produits (13 chiffres) - PRIORITÉ
                      BarcodeFormat.EAN_8,          // Codes-barres produits (8 chiffres)
                      BarcodeFormat.CODE_128,       // Code 128 (usage général)
                      BarcodeFormat.UPC_A,          // UPC américain
                      BarcodeFormat.UPC_E,          // UPC compact
                      BarcodeFormat.CODE_39,        // Code 39 (industriel)
                      BarcodeFormat.QR_CODE,        // QR codes
                      BarcodeFormat.ITF,            // Interleaved 2 of 5
                      BarcodeFormat.CODABAR,        // Codabar
                      BarcodeFormat.DATA_MATRIX,    // Data Matrix
                      BarcodeFormat.PDF_417,        // PDF417
                    ]}
                  />
                </div>
              </div>

              {/* Overlay guide visuel - CENTRÉ */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="relative">
                  {/* Rectangle guide - PLUS LARGE */}
                  <div className="w-80 sm:w-96 md:w-[500px] h-48 sm:h-56 md:h-64 border-4 border-green-500 rounded-2xl shadow-2xl shadow-green-500/50">
                    {/* Coins animés */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl animate-pulse"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl animate-pulse"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl animate-pulse"></div>
                  </div>

                  {/* Ligne de scan animée */}
                  {scanning && (
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-green-400 shadow-lg shadow-green-400/50 rounded-full"
                      animate={{
                        top: ['0%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Message d'instruction */}
              {scanning && !scanSuccess && (
                <div className="absolute bottom-32 left-0 right-0 z-10 text-center px-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-block bg-black/70 backdrop-blur-md px-6 py-3 rounded-full text-white font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Centrez le code dans le cadre vert
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Succès visuel */}
              {scanSuccess && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-green-500/30 backdrop-blur-sm z-20"
                >
                  <div className="text-center text-white">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <CheckCircle className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 text-green-400" />
                    </motion.div>
                    <p className="text-2xl sm:text-3xl font-bold">Code scanné !</p>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {hasPermission && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6 safe-bottom">
            <div className="flex justify-center gap-4">
              {/* Bouton torche */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleTorch}
                className={`p-3 sm:p-4 rounded-full backdrop-blur-sm transition-all ${
                  torchEnabled
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                aria-label="Activer/désactiver la torche"
                title="Torche"
              >
                <Flashlight className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
