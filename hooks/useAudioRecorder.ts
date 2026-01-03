/**
 * Hook de capture audio via MediaRecorder
 * Pattern similaire à useBarcodeScanner pour cleanup MediaStream
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceInputState, UseAudioRecorderReturn } from '@/types/voice-input';

/**
 * Hook pour gérer l'enregistrement audio via le microphone
 * Utilise l'API MediaRecorder du navigateur
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<VoiceInputState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Références pour le MediaRecorder et les chunks audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Promesse pour résoudre le blob audio à l'arrêt
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null);

  /**
   * Vérifie le support de l'API MediaRecorder au montage
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

    setIsSupported(hasMediaDevices && hasMediaRecorder);

    if (!hasMediaDevices || !hasMediaRecorder) {
      setError("Votre navigateur ne supporte pas l'enregistrement audio");
    }
  }, []);

  /**
   * Nettoie les ressources (stream, recorder)
   */
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  /**
   * Démarre l'enregistrement audio
   */
  const startRecording = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      // Demande l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000 // Recommandé pour Whisper
        }
      });

      streamRef.current = stream;

      // Détermine le meilleur format supporté
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      // Crée le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collecte les chunks audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Gère l'arrêt de l'enregistrement
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Résout la promesse avec le blob
        if (stopResolverRef.current) {
          stopResolverRef.current(audioBlob);
          stopResolverRef.current = null;
        }

        cleanup();
      };

      // Gère les erreurs
      mediaRecorder.onerror = () => {
        setError("Erreur lors de l'enregistrement audio");
        setState('error');

        if (stopResolverRef.current) {
          stopResolverRef.current(null);
          stopResolverRef.current = null;
        }

        cleanup();
      };

      // Démarre l'enregistrement (collecte toutes les 100ms)
      mediaRecorder.start(100);
      setState('recording');

    } catch (err) {
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setError("Accès au microphone refusé. Autorisez l'accès dans les paramètres du navigateur.");
            break;
          case 'NotFoundError':
            setError('Aucun microphone détecté sur cet appareil.');
            break;
          case 'NotReadableError':
            setError('Le microphone est utilisé par une autre application.');
            break;
          default:
            setError(`Erreur microphone: ${err.message}`);
        }
      } else {
        setError("Erreur lors de l'accès au microphone");
      }

      setState('error');
      cleanup();
      throw err;
    }
  }, [cleanup]);

  /**
   * Arrête l'enregistrement et retourne le blob audio
   */
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || state !== 'recording') {
        resolve(null);
        return;
      }

      stopResolverRef.current = resolve;
      setState('transcribing');
      mediaRecorderRef.current.stop();
    });
  }, [state]);

  /**
   * Efface l'erreur et remet l'état à idle
   */
  const clearError = useCallback(() => {
    setError(null);
    if (state === 'error') {
      setState('idle');
    }
  }, [state]);

  /**
   * Nettoie au démontage du composant
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    startRecording,
    stopRecording,
    isSupported,
    error,
    clearError
  };
}
