/**
 * Modal de dictée et édition des équipements
 * Intègre la capture vocale directement dans le modal
 * Permet d'activer/désactiver la dictée et d'accumuler les équipements
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mic,
  MicOff,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Wand2
} from 'lucide-react';
import { EquipementSimple, ExtractedEquipementsMultiplesData, VoiceInputState } from '@/types/voice-input';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useApiKeysStore } from '@/stores/apiKeysStore';
import { transcriptionService } from '@/services/transcription.service';
import { voiceExtractionService } from '@/services/voice-extraction.service';

interface ModalEditionEquipementsVocauxProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (equipements: EquipementSimple[]) => void;
  autoStartRecording?: boolean; // Démarrer automatiquement l'enregistrement
}

export function ModalEditionEquipementsVocaux({
  isOpen,
  onClose,
  onValidate,
  autoStartRecording = true
}: ModalEditionEquipementsVocauxProps) {
  // État local des équipements (accumulateur)
  const [equipements, setEquipements] = useState<EquipementSimple[]>([]);

  // État de la capture vocale
  const [voiceState, setVoiceState] = useState<VoiceInputState>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Audio recorder
  const audioRecorder = useAudioRecorder();
  const { groqApiKey, openaiApiKey, anthropicApiKey, hasTranscriptionKey, hasExtractionKey } = useApiKeysStore();

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    setError(null);

    // Vérifier les clés API
    if (!hasTranscriptionKey()) {
      setError('Clé API Whisper (Groq ou OpenAI) requise pour la transcription');
      setVoiceState('error');
      return;
    }

    if (!hasExtractionKey()) {
      setError('Clé API Claude (Anthropic) requise pour l\'extraction');
      setVoiceState('error');
      return;
    }

    try {
      await audioRecorder.startRecording();
      setVoiceState('recording');
    } catch {
      setError(audioRecorder.error || "Erreur lors du démarrage de l'enregistrement");
      setVoiceState('error');
    }
  }, [audioRecorder, hasTranscriptionKey, hasExtractionKey]);

  // Arrêter et traiter l'enregistrement
  const stopAndProcess = useCallback(async () => {
    try {
      // Étape 1: Arrêter l'enregistrement
      setVoiceState('transcribing');
      const audioBlob = await audioRecorder.stopRecording();

      if (!audioBlob) {
        throw new Error('Aucun audio capturé');
      }

      // Étape 2: Transcrire l'audio via Whisper
      const transcriptionResult = await transcriptionService.transcribe(
        audioBlob,
        groqApiKey || undefined,
        openaiApiKey || undefined
      );

      if (!transcriptionResult.text.trim()) {
        throw new Error('Transcription vide - parlez plus fort ou plus clairement');
      }

      setTranscription(transcriptionResult.text);

      // Étape 3: Extraire les équipements via Claude
      setVoiceState('extracting');

      const extractionResult = await voiceExtractionService.extractEquipementsMultiples(
        transcriptionResult.text,
        anthropicApiKey
      );

      if (extractionResult.success && extractionResult.data) {
        const data = extractionResult.data as ExtractedEquipementsMultiplesData;
        if (data.equipements && data.equipements.length > 0) {
          // Ajouter les nouveaux équipements à la liste existante
          setEquipements(prev => [...prev, ...data.equipements]);
        }
      } else {
        setError(extractionResult.error || 'Aucun équipement détecté');
      }

      setVoiceState('idle');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de traitement';
      setError(errorMessage);
      setVoiceState('error');
    }
  }, [audioRecorder, groqApiKey, openaiApiKey, anthropicApiKey]);

  // Toggle enregistrement
  const toggleRecording = useCallback(async () => {
    if (voiceState === 'recording') {
      await stopAndProcess();
    } else if (voiceState === 'idle' || voiceState === 'error') {
      setError(null);
      await startRecording();
    }
  }, [voiceState, startRecording, stopAndProcess]);

  // Auto-démarrer l'enregistrement à l'ouverture
  useEffect(() => {
    if (isOpen && autoStartRecording && voiceState === 'idle' && equipements.length === 0) {
      // Petit délai pour laisser le modal s'afficher
      const timer = setTimeout(() => {
        startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoStartRecording, voiceState, equipements.length, startRecording]);

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setEquipements([]);
      setTranscription('');
      setError(null);
      setVoiceState('idle');
      audioRecorder.clearError();
    }
  }, [isOpen, audioRecorder]);

  // Modifier la quantité d'un équipement
  const handleQuantiteChange = (index: number, quantite: number) => {
    setEquipements(prev =>
      prev.map((eq, i) =>
        i === index ? { ...eq, quantite: Math.max(1, quantite) } : eq
      )
    );
  };

  // Modifier la désignation d'un équipement
  const handleDesignationChange = (index: number, designation: string) => {
    setEquipements(prev =>
      prev.map((eq, i) =>
        i === index ? { ...eq, designation } : eq
      )
    );
  };

  // Supprimer un équipement
  const handleRemove = (index: number) => {
    setEquipements(prev => prev.filter((_, i) => i !== index));
  };

  // Ajouter une ligne vide
  const handleAddLine = () => {
    setEquipements(prev => [...prev, { quantite: 1, designation: '' }]);
  };

  // Valider et fermer
  const handleValidate = () => {
    // Filtrer les lignes vides
    const validEquipements = equipements.filter(eq => eq.designation.trim() !== '');
    if (validEquipements.length > 0) {
      onValidate(validEquipements);
    }
    onClose();
  };

  // Vérifier si on peut valider
  const hasValidEquipements = equipements.some(eq => eq.designation.trim() !== '');

  // Label du statut
  const getStatusLabel = () => {
    switch (voiceState) {
      case 'recording':
        return 'Enregistrement en cours... Cliquez pour arrêter';
      case 'transcribing':
        return 'Transcription en cours...';
      case 'extracting':
        return 'Analyse IA en cours...';
      case 'error':
        return error || 'Erreur';
      default:
        return equipements.length > 0
          ? 'Dictez d\'autres équipements ou validez'
          : 'Cliquez sur le micro pour dicter';
    }
  };

  // Couleur du statut
  const getStatusColor = () => {
    switch (voiceState) {
      case 'recording':
        return 'text-red-500';
      case 'transcribing':
      case 'extracting':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Dictée Équipements
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Zone de contrôle vocal */}
          <div className="px-4 py-4 bg-purple-50 border-b border-purple-100">
            <div className="flex items-center gap-4">
              {/* Bouton Microphone */}
              <motion.button
                onClick={toggleRecording}
                disabled={voiceState === 'transcribing' || voiceState === 'extracting'}
                whileTap={{ scale: 0.95 }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  voiceState === 'recording'
                    ? 'bg-red-500 animate-pulse'
                    : voiceState === 'transcribing' || voiceState === 'extracting'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                {voiceState === 'transcribing' || voiceState === 'extracting' ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : voiceState === 'recording' ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.button>

              {/* Statut */}
              <div className="flex-1">
                <p className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusLabel()}
                </p>
                {voiceState === 'recording' && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-100" />
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-200" />
                  </div>
                )}
                {(voiceState === 'transcribing' || voiceState === 'extracting') && (
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <motion.div
                      className="bg-purple-500 h-1 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: voiceState === 'transcribing' ? '50%' : '100%' }}
                      transition={{ duration: 1.5 }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dernière transcription */}
            {transcription && (
              <div className="mt-3 p-2 bg-white rounded-lg">
                <p className="text-xs text-purple-600 font-medium mb-1">Dernière transcription :</p>
                <p className="text-sm text-gray-700 italic line-clamp-2">"{transcription}"</p>
              </div>
            )}
          </div>

          {/* Liste des équipements */}
          <div className="p-4 overflow-y-auto max-h-[calc(85vh-280px)] space-y-3">
            {equipements.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {voiceState === 'idle'
                    ? 'Dictez vos équipements...\nEx: "2 compresseurs, 5 filtres, 1 câble"'
                    : 'Traitement en cours...'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {equipements.map((equipement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-xl border border-purple-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      {/* Numéro */}
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-600">{index + 1}</span>
                      </div>

                      {/* Input Quantité */}
                      <input
                        type="number"
                        min="1"
                        value={equipement.quantite}
                        onChange={(e) => handleQuantiteChange(index, parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-2 text-center font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      />

                      {/* Input Désignation */}
                      <input
                        type="text"
                        value={equipement.designation}
                        onChange={(e) => handleDesignationChange(index, e.target.value)}
                        placeholder="Désignation..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      />

                      {/* Bouton Supprimer */}
                      <button
                        onClick={() => handleRemove(index)}
                        className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Bouton Ajouter une ligne */}
            <button
              onClick={handleAddLine}
              className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-medium flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter manuellement
            </button>
          </div>

          {/* Footer avec boutons */}
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleValidate}
              disabled={!hasValidEquipements || voiceState === 'recording' || voiceState === 'transcribing' || voiceState === 'extracting'}
              className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Valider ({equipements.filter(eq => eq.designation.trim()).length})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalEditionEquipementsVocaux;
