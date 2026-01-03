/**
 * Service de transcription audio via Whisper (Groq / OpenAI)
 * Pattern singleton cohérent avec les services existants
 */

import SecurityService from './security.service';
import { TranscriptionResponse } from '@/types/voice-input';

// URLs des endpoints API
const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export class TranscriptionService {
  private static instance: TranscriptionService;

  private constructor() {}

  public static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  /**
   * Transcrit via Groq (whisper-large-v3) - plus rapide
   */
  async transcribeWithGroq(audioBlob: Blob, apiKey: string): Promise<TranscriptionResponse> {
    SecurityService.secureLog('log', '[Transcription] Groq', { size: audioBlob.size });

    const formData = new FormData();
    const audioFile = new File([audioBlob], 'audio.webm', {
      type: audioBlob.type || 'audio/webm'
    });

    formData.append('file', audioFile);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'fr');
    formData.append('response_format', 'json');

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Erreur Groq: ${response.status}`);
    }

    const data = await response.json();
    SecurityService.secureLog('log', '[Transcription] Groq succès', { textLength: data.text?.length });

    return { text: data.text || '', provider: 'groq' };
  }

  /**
   * Transcrit via OpenAI (whisper-1) - fallback
   */
  async transcribeWithOpenAI(audioBlob: Blob, apiKey: string): Promise<TranscriptionResponse> {
    SecurityService.secureLog('log', '[Transcription] OpenAI', { size: audioBlob.size });

    const formData = new FormData();
    const audioFile = new File([audioBlob], 'audio.webm', {
      type: audioBlob.type || 'audio/webm'
    });

    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');
    formData.append('response_format', 'json');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Erreur OpenAI: ${response.status}`);
    }

    const data = await response.json();
    SecurityService.secureLog('log', '[Transcription] OpenAI succès', { textLength: data.text?.length });

    return { text: data.text || '', provider: 'openai' };
  }

  /**
   * Transcription avec fallback automatique Groq > OpenAI
   */
  async transcribe(
    audioBlob: Blob,
    groqApiKey?: string,
    openaiApiKey?: string
  ): Promise<TranscriptionResponse> {
    // Priorité à Groq (plus rapide)
    if (groqApiKey) {
      try {
        return await this.transcribeWithGroq(audioBlob, groqApiKey);
      } catch (error) {
        SecurityService.secureLog('warn', '[Transcription] Groq échec, tentative OpenAI', error);
        if (openaiApiKey) {
          return await this.transcribeWithOpenAI(audioBlob, openaiApiKey);
        }
        throw error;
      }
    }

    // Sinon utiliser OpenAI
    if (openaiApiKey) {
      return await this.transcribeWithOpenAI(audioBlob, openaiApiKey);
    }

    // Aucune clé configurée
    throw new Error('Aucune clé API de transcription configurée (Groq ou OpenAI)');
  }
}

export const transcriptionService = TranscriptionService.getInstance();
