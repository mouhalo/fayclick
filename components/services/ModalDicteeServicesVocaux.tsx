/**
 * Modal de dictée et matching de services
 * Intègre la capture vocale et match avec les services disponibles
 * L'IA identifie les services dictés parmi ceux disponibles
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Wand2,
  Wrench
} from 'lucide-react';
import {
  ServiceDisponible,
  ServiceMatche,
  ExtractedServicesMatchData,
  VoiceInputState
} from '@/types/voice-input';
import { Service } from '@/types/prestation';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useApiKeysStore } from '@/stores/apiKeysStore';
import { transcriptionService } from '@/services/transcription.service';
import { voiceExtractionService } from '@/services/voice-extraction.service';

interface ModalDicteeServicesVocauxProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (services: ServiceMatche[]) => void;
  servicesDisponibles: Service[];  // Liste complète des services de la structure
  autoStartRecording?: boolean;
}

export function ModalDicteeServicesVocaux({
  isOpen,
  onClose,
  onValidate,
  servicesDisponibles,
  autoStartRecording = true
}: ModalDicteeServicesVocauxProps) {
  // État local des services matchés (accumulateur)
  const [servicesMatches, setServicesMatches] = useState<ServiceMatche[]>([]);

  // État de la capture vocale
  const [voiceState, setVoiceState] = useState<VoiceInputState>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Audio recorder
  const audioRecorder = useAudioRecorder();
  const { groqApiKey, openaiApiKey, anthropicApiKey, hasTranscriptionKey, hasExtractionKey } = useApiKeysStore();

  // Convertir les services disponibles au format simplifié pour l'IA
  const servicesSimplifies: ServiceDisponible[] = useMemo(() => {
    return servicesDisponibles.map(s => ({
      id: s.id_service,
      nom: s.nom_service,
      prix: s.cout_base
    }));
  }, [servicesDisponibles]);

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

    if (servicesSimplifies.length === 0) {
      setError('Aucun service disponible. Créez d\'abord vos services.');
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
  }, [audioRecorder, hasTranscriptionKey, hasExtractionKey, servicesSimplifies.length]);

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

      // Étape 3: Matcher les services via Claude
      setVoiceState('extracting');

      const matchResult = await voiceExtractionService.matchServices(
        transcriptionResult.text,
        servicesSimplifies,
        anthropicApiKey
      );

      if (matchResult.success && matchResult.data) {
        const data = matchResult.data as ExtractedServicesMatchData;
        if (data.services && data.services.length > 0) {
          // Filtrer les doublons (même id_service)
          setServicesMatches(prev => {
            const existingIds = new Set(prev.map(s => s.id_service));
            const newServices = data.services.filter(s => !existingIds.has(s.id_service));
            return [...prev, ...newServices];
          });
        } else {
          setError('Aucun service correspondant trouvé');
        }
      } else {
        setError(matchResult.error || 'Erreur lors du matching');
      }

      setVoiceState('idle');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de traitement';
      setError(errorMessage);
      setVoiceState('error');
    }
  }, [audioRecorder, groqApiKey, openaiApiKey, anthropicApiKey, servicesSimplifies]);

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
    if (isOpen && autoStartRecording && voiceState === 'idle' && servicesMatches.length === 0 && servicesSimplifies.length > 0) {
      const timer = setTimeout(() => {
        startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoStartRecording, voiceState, servicesMatches.length, servicesSimplifies.length, startRecording]);

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setServicesMatches([]);
      setTranscription('');
      setError(null);
      setVoiceState('idle');
      audioRecorder.clearError();
    }
  }, [isOpen, audioRecorder]);

  // Modifier le coût d'un service
  const handleCoutChange = (index: number, cout: number) => {
    setServicesMatches(prev =>
      prev.map((s, i) =>
        i === index ? { ...s, cout: Math.max(0, cout) } : s
      )
    );
  };

  // Modifier la quantité d'un service
  const handleQuantiteChange = (index: number, quantite: number) => {
    setServicesMatches(prev =>
      prev.map((s, i) =>
        i === index ? { ...s, quantite: Math.max(1, quantite) } : s
      )
    );
  };

  // Supprimer un service
  const handleRemove = (index: number) => {
    setServicesMatches(prev => prev.filter((_, i) => i !== index));
  };

  // Ajouter un service manuellement (ouvre un mini-sélecteur)
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  const handleAddServiceManuel = (service: Service) => {
    // Vérifier si déjà ajouté
    if (servicesMatches.some(s => s.id_service === service.id_service)) {
      return;
    }
    setServicesMatches(prev => [...prev, {
      id_service: service.id_service,
      nom_service: service.nom_service,
      cout: service.cout_base,
      quantite: 1
    }]);
    setShowServiceSelector(false);
  };

  // Valider et fermer
  const handleValidate = () => {
    if (servicesMatches.length > 0) {
      onValidate(servicesMatches);
    }
    onClose();
  };

  // Label du statut
  const getStatusLabel = () => {
    switch (voiceState) {
      case 'recording':
        return 'Enregistrement en cours... Cliquez pour arrêter';
      case 'transcribing':
        return 'Transcription en cours...';
      case 'extracting':
        return 'Recherche des services...';
      case 'error':
        return error || 'Erreur';
      default:
        return servicesMatches.length > 0
          ? 'Dictez d\'autres services ou validez'
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

  // Formater montant
  const formatMontant = (montant: number) => `${montant.toLocaleString('fr-FR')} F`;

  // Calculer le total
  const totalServices = servicesMatches.reduce((sum, s) => sum + s.cout * s.quantite, 0);

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
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Dictée Services
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-orange-100 mt-1">
              {servicesSimplifies.length} service(s) disponible(s)
            </p>
          </div>

          {/* Zone de contrôle vocal */}
          <div className="px-4 py-4 bg-orange-50 border-b border-orange-100">
            <div className="flex items-center gap-4">
              {/* Bouton Microphone */}
              <motion.button
                onClick={toggleRecording}
                disabled={voiceState === 'transcribing' || voiceState === 'extracting' || servicesSimplifies.length === 0}
                whileTap={{ scale: 0.95 }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  voiceState === 'recording'
                    ? 'bg-red-500 animate-pulse'
                    : voiceState === 'transcribing' || voiceState === 'extracting'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : servicesSimplifies.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600'
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
                      className="bg-orange-500 h-1 rounded-full"
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
                <p className="text-xs text-orange-600 font-medium mb-1">Dernière transcription :</p>
                <p className="text-sm text-gray-700 italic line-clamp-2">"{transcription}"</p>
              </div>
            )}
          </div>

          {/* Liste des services matchés */}
          <div className="p-4 overflow-y-auto max-h-[calc(85vh-320px)] space-y-3">
            {servicesMatches.length === 0 ? (
              <div className="text-center py-8">
                {servicesSimplifies.length === 0 ? (
                  <>
                    <AlertCircle className="w-12 h-12 text-orange-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      Aucun service disponible.
                      <br />
                      Créez d'abord vos services dans "Mes Services".
                    </p>
                  </>
                ) : (
                  <>
                    <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      {voiceState === 'idle'
                        ? 'Dictez vos services...\nEx: "Installation clim et plomberie"'
                        : 'Recherche en cours...'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {servicesMatches.map((service, index) => (
                  <motion.div
                    key={service.id_service}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-xl border border-orange-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icône Service */}
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Wrench className="w-4 h-4 text-orange-600" />
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {service.nom_service}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          {/* Quantité */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Qté:</span>
                            <input
                              type="number"
                              min="1"
                              value={service.quantite}
                              onChange={(e) => handleQuantiteChange(index, parseInt(e.target.value) || 1)}
                              className="w-12 px-1 py-1 text-center text-sm font-bold border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                            />
                          </div>

                          {/* Coût */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Coût:</span>
                            <input
                              type="number"
                              min="0"
                              value={service.cout}
                              onChange={(e) => handleCoutChange(index, parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                            />
                            <span className="text-xs text-gray-500">F</span>
                          </div>
                        </div>

                        {/* Sous-total */}
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          = {formatMontant(service.cout * service.quantite)}
                        </p>
                      </div>

                      {/* Bouton Supprimer */}
                      <button
                        onClick={() => handleRemove(index)}
                        className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Bouton Ajouter manuellement */}
            {!showServiceSelector ? (
              <button
                onClick={() => setShowServiceSelector(true)}
                className="w-full py-3 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 font-medium flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Ajouter manuellement
              </button>
            ) : (
              <div className="bg-white rounded-xl border border-orange-200 p-3">
                <p className="text-sm text-gray-600 mb-2">Sélectionner un service:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {servicesDisponibles
                    .filter(s => !servicesMatches.some(m => m.id_service === s.id_service))
                    .map((service) => (
                      <button
                        key={service.id_service}
                        onClick={() => handleAddServiceManuel(service)}
                        className="w-full text-left p-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm font-medium truncate">{service.nom_service}</span>
                        <span className="text-sm text-orange-600 flex-shrink-0 ml-2">
                          {formatMontant(service.cout_base)}
                        </span>
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => setShowServiceSelector(false)}
                  className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>

          {/* Total */}
          {servicesMatches.length > 0 && (
            <div className="px-4 py-2 bg-orange-50 border-t border-orange-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total services:</span>
                <span className="text-lg font-bold text-orange-600">{formatMontant(totalServices)}</span>
              </div>
            </div>
          )}

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
              disabled={servicesMatches.length === 0 || voiceState === 'recording' || voiceState === 'transcribing' || voiceState === 'extracting'}
              className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Valider ({servicesMatches.length})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalDicteeServicesVocaux;
