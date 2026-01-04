/**
 * Hook combinant capture audio + transcription + extraction IA
 * Hook principal pour l'intégration dans ModalNouveauDevis
 */

'use client';

import { useState, useCallback } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useApiKeysStore } from '@/stores/apiKeysStore';
import { transcriptionService } from '@/services/transcription.service';
import { voiceExtractionService } from '@/services/voice-extraction.service';
import {
  VoiceInputState,
  VoiceInputContext,
  ExtractedClientData,
  ExtractedServiceData,
  ExtractedEquipementData,
  ExtractedEquipementsMultiplesData,
  VoiceExtractionResult,
  UseVoiceInputReturn
} from '@/types/voice-input';

/**
 * Hook générique pour la capture vocale avec extraction IA
 */
export function useVoiceInput<T extends ExtractedClientData | ExtractedServiceData | ExtractedEquipementData | ExtractedEquipementsMultiplesData>(
  context: VoiceInputContext
): UseVoiceInputReturn<T> {
  const [state, setState] = useState<VoiceInputState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceExtractionResult<T> | null>(null);

  const audioRecorder = useAudioRecorder();
  const { groqApiKey, openaiApiKey, anthropicApiKey, hasTranscriptionKey, hasExtractionKey } = useApiKeysStore();

  /**
   * Démarre la capture audio
   */
  const startCapture = useCallback(async () => {
    setError(null);
    setResult(null);

    // Vérifier les clés API
    if (!hasTranscriptionKey()) {
      setError('Clé API Whisper (Groq ou OpenAI) requise pour la transcription');
      setState('error');
      return;
    }

    if (!hasExtractionKey()) {
      setError('Clé API Claude (Anthropic) requise pour l\'extraction');
      setState('error');
      return;
    }

    try {
      await audioRecorder.startRecording();
      setState('recording');
    } catch {
      setError(audioRecorder.error || "Erreur lors du démarrage de l'enregistrement");
      setState('error');
    }
  }, [audioRecorder, hasTranscriptionKey, hasExtractionKey]);

  /**
   * Arrête l'enregistrement et traite l'audio (transcription + extraction)
   */
  const stopAndProcess = useCallback(async (): Promise<VoiceExtractionResult<T> | null> => {
    try {
      // Étape 1: Arrêter l'enregistrement
      setState('transcribing');
      const audioBlob = await audioRecorder.stopRecording();

      if (!audioBlob) {
        throw new Error('Aucun audio capturé');
      }

      // Étape 2: Transcrire l'audio via Whisper
      const transcription = await transcriptionService.transcribe(
        audioBlob,
        groqApiKey || undefined,
        openaiApiKey || undefined
      );

      if (!transcription.text.trim()) {
        throw new Error('Transcription vide - parlez plus fort ou plus clairement');
      }

      // Étape 3: Extraire les données via Claude
      setState('extracting');

      let extractionResult: VoiceExtractionResult<T>;

      switch (context) {
        case 'client':
          extractionResult = await voiceExtractionService.extractClient(
            transcription.text,
            anthropicApiKey
          ) as VoiceExtractionResult<T>;
          break;

        case 'service':
          extractionResult = await voiceExtractionService.extractService(
            transcription.text,
            anthropicApiKey
          ) as VoiceExtractionResult<T>;
          break;

        case 'equipement':
          extractionResult = await voiceExtractionService.extractEquipement(
            transcription.text,
            anthropicApiKey
          ) as VoiceExtractionResult<T>;
          break;

        case 'equipements_multiples':
          extractionResult = await voiceExtractionService.extractEquipementsMultiples(
            transcription.text,
            anthropicApiKey
          ) as VoiceExtractionResult<T>;
          break;

        default:
          throw new Error(`Contexte non supporté: ${context}`);
      }

      setResult(extractionResult);
      setState('idle');

      return extractionResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de traitement';
      setError(errorMessage);
      setState('error');

      return {
        success: false,
        data: null,
        rawTranscription: '',
        error: errorMessage
      };
    }
  }, [audioRecorder, groqApiKey, openaiApiKey, anthropicApiKey, context]);

  /**
   * Remet le hook à son état initial
   */
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setResult(null);
    audioRecorder.clearError();
  }, [audioRecorder]);

  // Combiner l'état du recorder avec l'état local
  const combinedState = audioRecorder.state === 'error' ? 'error' : state;

  return {
    state: combinedState,
    isSupported: audioRecorder.isSupported,
    error: error || audioRecorder.error,
    result,
    startCapture,
    stopAndProcess,
    reset
  };
}

/**
 * Hook spécialisé pour les données client
 * Extrait: nom_client, tel_client, adresse_client
 */
export function useVoiceInputClient() {
  return useVoiceInput<ExtractedClientData>('client');
}

/**
 * Hook spécialisé pour la recherche de service
 * Extrait: search_term pour filtrer les services disponibles
 */
export function useVoiceInputService() {
  return useVoiceInput<ExtractedServiceData>('service');
}

/**
 * Hook spécialisé pour les données équipement (un seul)
 * Extrait: designation, marque, prix_unitaire, quantite
 */
export function useVoiceInputEquipement() {
  return useVoiceInput<ExtractedEquipementData>('equipement');
}

/**
 * Hook spécialisé pour les équipements multiples (dictée libre)
 * Extrait une liste d'équipements avec quantité et désignation
 */
export function useVoiceInputEquipementsMultiples() {
  return useVoiceInput<ExtractedEquipementsMultiplesData>('equipements_multiples');
}
