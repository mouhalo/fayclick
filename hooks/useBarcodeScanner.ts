/**
 * Hook personnalisé pour gérer le scan de code-barres
 * Encapsule la logique de caméra, permissions et états
 *
 * @example
 * const { isScanning, scannedCode, startScanning, stopScanning } = useBarcodeScanner();
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface BarcodeScannerState {
  /** Indique si le scan est en cours */
  isScanning: boolean;
  /** Dernier code scanné (null si aucun) */
  scannedCode: string | null;
  /** Message d'erreur (null si aucune erreur) */
  error: string | null;
  /** Permission caméra accordée (null = non demandée, true = accordée, false = refusée) */
  hasPermission: boolean | null;
}

export interface BarcodeScannerActions {
  /** Démarre le scan (demande permission si nécessaire) */
  startScanning: () => void;
  /** Arrête le scan */
  stopScanning: () => void;
  /** Réinitialise l'état complet du scanner */
  resetScanner: () => void;
  /** Définit manuellement le code scanné */
  setScannedCode: (code: string | null) => void;
  /** Définit une erreur */
  setError: (error: string | null) => void;
}

export type UseBarcodeScanner = BarcodeScannerState & BarcodeScannerActions;

export function useBarcodeScanner(): UseBarcodeScanner {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Référence au stream vidéo pour cleanup
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Démarre le scan et demande les permissions caméra
   */
  const startScanning = useCallback(async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Demander permission caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Caméra arrière par défaut
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);
    } catch (err) {
      console.error('❌ [BARCODE SCANNER] Erreur permission caméra:', err);

      let errorMessage = 'Erreur d\'accès à la caméra';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permission caméra refusée. Autorisez l\'accès dans les paramètres.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra détectée sur cet appareil.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Caméra déjà utilisée par une autre application.';
        }
      }

      setError(errorMessage);
      setHasPermission(false);
      setIsScanning(false);
    }
  }, []);

  /**
   * Arrête le scan et libère les ressources caméra
   */
  const stopScanning = useCallback(() => {
    setIsScanning(false);

    // Arrêter tous les tracks du stream vidéo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  /**
   * Réinitialise complètement l'état du scanner
   */
  const resetScanner = useCallback(() => {
    stopScanning();
    setScannedCode(null);
    setError(null);
    setHasPermission(null);
  }, [stopScanning]);

  /**
   * Cleanup automatique quand le composant est démonté
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  return {
    // État
    isScanning,
    scannedCode,
    error,
    hasPermission,

    // Actions
    startScanning,
    stopScanning,
    resetScanner,
    setScannedCode,
    setError,
  };
}
