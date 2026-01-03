/**
 * Bouton microphone réutilisable avec états visuels
 * États: idle (bleu) / recording (rouge+pulse) / transcribing (orange+spin) / extracting (violet+spin)
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { VoiceInputState, MicrophoneButtonProps } from '@/types/voice-input';

// Styles par état
const STATE_STYLES: Record<VoiceInputState, { bg: string; text: string; ring: string }> = {
  idle: {
    bg: 'bg-blue-500 hover:bg-blue-600',
    text: 'text-white',
    ring: 'focus:ring-blue-400'
  },
  recording: {
    bg: 'bg-red-500',
    text: 'text-white',
    ring: 'focus:ring-red-400'
  },
  transcribing: {
    bg: 'bg-amber-500',
    text: 'text-white',
    ring: 'focus:ring-amber-400'
  },
  extracting: {
    bg: 'bg-purple-500',
    text: 'text-white',
    ring: 'focus:ring-purple-400'
  },
  error: {
    bg: 'bg-gray-400 hover:bg-gray-500',
    text: 'text-white',
    ring: 'focus:ring-gray-400'
  }
};

// Styles par taille
const SIZE_STYLES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
};

const ICON_SIZE = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

// Labels par contexte
const CONTEXT_LABELS: Record<string, string> = {
  client: 'client',
  service: 'service',
  equipement: 'équipement'
};

export function MicrophoneButton({
  context,
  state,
  onClick,
  disabled = false,
  size = 'md',
  className = ''
}: MicrophoneButtonProps) {
  const styles = STATE_STYLES[state];
  const isProcessing = state === 'transcribing' || state === 'extracting';
  const isRecording = state === 'recording';

  // Déterminer l'icône à afficher
  const getIcon = () => {
    if (isProcessing) {
      return <Loader2 className={`${ICON_SIZE[size]} animate-spin`} />;
    }
    if (isRecording) {
      return <MicOff className={ICON_SIZE[size]} />;
    }
    return <Mic className={ICON_SIZE[size]} />;
  };

  // Déterminer le titre (tooltip)
  const getTitle = () => {
    const label = CONTEXT_LABELS[context] || context;
    switch (state) {
      case 'recording':
        return 'Cliquez pour arrêter';
      case 'transcribing':
        return 'Transcription en cours...';
      case 'extracting':
        return 'Extraction IA en cours...';
      case 'error':
        return 'Erreur - Cliquez pour réessayer';
      default:
        return `Dicter les infos ${label}`;
    }
  };

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // Empêcher propagation vers les accordéons
        onClick();
      }}
      disabled={disabled || isProcessing}
      title={getTitle()}
      className={`
        ${SIZE_STYLES[size]}
        ${styles.bg}
        ${styles.text}
        ${styles.ring}
        relative
        rounded-full flex items-center justify-center
        shadow-md hover:shadow-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
      transition={isRecording ? { duration: 1, repeat: Infinity } : {}}
      whileTap={{ scale: 0.95 }}
    >
      {getIcon()}

      {/* Indicateur pulse pour enregistrement */}
      {isRecording && (
        <motion.span
          className="absolute inset-0 rounded-full bg-red-500"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

export default MicrophoneButton;
