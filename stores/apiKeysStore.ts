/**
 * Store Zustand pour la gestion des clés API IA
 * Utilisé pour la transcription Whisper (Groq/OpenAI) et extraction Claude
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TranscriptionProvider } from '@/types/voice-input';

interface ApiKeysState {
  // Clés API
  groqApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
}

interface ApiKeysActions {
  // Setters
  setGroqApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;

  // Helpers
  hasTranscriptionKey: () => boolean;
  hasExtractionKey: () => boolean;
  getPreferredTranscriptionProvider: () => TranscriptionProvider | null;

  // Reset
  clearAllKeys: () => void;
}

type ApiKeysStore = ApiKeysState & ApiKeysActions;

// Clés par défaut depuis les variables d'environnement
const getDefaultKeys = (): ApiKeysState => ({
  groqApiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  anthropicApiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || ''
});

export const useApiKeysStore = create<ApiKeysStore>()(
  persist(
    (set, get) => ({
      // État initial depuis env
      ...getDefaultKeys(),

      // Setters
      setGroqApiKey: (key: string) => set({ groqApiKey: key }),
      setOpenaiApiKey: (key: string) => set({ openaiApiKey: key }),
      setAnthropicApiKey: (key: string) => set({ anthropicApiKey: key }),

      // Vérifie si une clé de transcription est disponible (Groq ou OpenAI)
      hasTranscriptionKey: () => {
        const state = get();
        return Boolean(state.groqApiKey || state.openaiApiKey);
      },

      // Vérifie si la clé Claude est disponible pour l'extraction
      hasExtractionKey: () => {
        return Boolean(get().anthropicApiKey);
      },

      // Retourne le provider de transcription préféré (Groq prioritaire)
      getPreferredTranscriptionProvider: (): TranscriptionProvider | null => {
        const state = get();
        if (state.groqApiKey) return 'groq';
        if (state.openaiApiKey) return 'openai';
        return null;
      },

      // Reset toutes les clés
      clearAllKeys: () => set(getDefaultKeys())
    }),
    {
      name: 'fayclick-api-keys',
      storage: createJSONStorage(() => localStorage),
      // Persister uniquement les clés (pas les fonctions)
      partialize: (state) => ({
        groqApiKey: state.groqApiKey,
        openaiApiKey: state.openaiApiKey,
        anthropicApiKey: state.anthropicApiKey
      })
    }
  )
);
