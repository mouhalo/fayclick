/**
 * Types pour la capture vocale et extraction IA
 * Module de saisie vocale pour création de devis
 */

// État d'enregistrement audio
export type VoiceInputState = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'error';

// Type de contexte pour extraction IA
export type VoiceInputContext = 'client' | 'service' | 'equipement' | 'equipements_multiples' | 'services_match';

// Provider de transcription
export type TranscriptionProvider = 'groq' | 'openai';

// Données client extraites par IA
export interface ExtractedClientData {
  nom_client?: string;
  tel_client?: string;
  adresse_client?: string;
  confidence: number; // 0-1
}

// Données service extraites par IA (terme de recherche)
export interface ExtractedServiceData {
  search_term: string;
  confidence: number;
}

// Données équipement extraites par IA (un seul)
export interface ExtractedEquipementData {
  designation?: string;
  marque?: string;
  prix_unitaire?: number;
  quantite?: number;
  confidence: number;
}

// Équipement simplifié pour dictée libre (Qté + Désignation seulement)
export interface EquipementSimple {
  quantite: number;
  designation: string;
}

// Données équipements multiples extraites par IA (dictée libre)
export interface ExtractedEquipementsMultiplesData {
  equipements: EquipementSimple[];
  confidence: number;
}

// Service disponible simplifié pour le matching IA
export interface ServiceDisponible {
  id: number;
  nom: string;
  prix: number;
}

// Service matché par l'IA
export interface ServiceMatche {
  id_service: number;
  nom_service: string;
  cout: number;  // Prix proposé (peut être modifié)
  quantite: number;
}

// Données services matchés extraites par IA (dictée libre)
export interface ExtractedServicesMatchData {
  services: ServiceMatche[];
  confidence: number;
}

// Union type pour les données extraites
export type ExtractedData = ExtractedClientData | ExtractedServiceData | ExtractedEquipementData | ExtractedEquipementsMultiplesData | ExtractedServicesMatchData;

// Réponse de transcription
export interface TranscriptionResponse {
  text: string;
  provider: TranscriptionProvider;
}

// Réponse de l'extraction IA
export interface VoiceExtractionResult<T extends ExtractedData> {
  success: boolean;
  data: T | null;
  rawTranscription: string;
  error?: string;
}

// Configuration du service IA
export interface AIExtractionConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

// Props du bouton microphone
export interface MicrophoneButtonProps {
  context: VoiceInputContext;
  state: VoiceInputState;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Interface de retour du hook useAudioRecorder
export interface UseAudioRecorderReturn {
  state: VoiceInputState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  isSupported: boolean;
  error: string | null;
  clearError: () => void;
}

// Interface de retour du hook useVoiceInput
export interface UseVoiceInputReturn<T extends ExtractedData> {
  state: VoiceInputState;
  isSupported: boolean;
  error: string | null;
  result: VoiceExtractionResult<T> | null;
  startCapture: () => Promise<void>;
  stopAndProcess: () => Promise<VoiceExtractionResult<T> | null>;
  reset: () => void;
}
