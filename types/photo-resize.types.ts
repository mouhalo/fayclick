/**
 * Types TypeScript pour le redimensionnement de photos FayClick V2
 * Utilisé par le composant PhotoResizer
 */

// Options de redimensionnement
export interface ResizeOptions {
  scale: number;           // 0.25 à 1.0 (25% à 100%)
  quality: number;         // 0.6 à 0.9 (60% à 90%)
  maxSizeMB?: number;      // Taille max recommandée (défaut 5MB)
}

// Dimensions d'image
export interface ImageDimensions {
  width: number;
  height: number;
}

// Preview du redimensionnement
export interface ResizePreview {
  originalSize: number;           // Taille fichier original (bytes)
  newSize: number;                // Taille fichier redimensionné (bytes)
  originalDimensions: ImageDimensions;
  newDimensions: ImageDimensions;
  scale: number;
  quality: number;
}

// Niveaux de qualité prédéfinis
export type QualityLevel = 'low' | 'medium' | 'high';

export const QUALITY_PRESETS: Record<QualityLevel, number> = {
  low: 0.6,      // 60% - Fichier léger
  medium: 0.8,   // 80% - Bon compromis
  high: 0.9      // 90% - Haute qualité
};

// Seuils de taille pour indicateurs visuels
export const SIZE_THRESHOLDS = {
  PERFECT: 5 * 1024 * 1024,      // 5 MB - Vert
  WARNING: 10 * 1024 * 1024,     // 10 MB - Orange
  ERROR: 15 * 1024 * 1024        // 15 MB - Rouge
} as const;

// Props du composant PhotoResizer
export interface PhotoResizerProps {
  file: File;
  onCancel: () => void;
  onValidate: (optimizedFile: File) => void;

  // Options optionnelles
  maxSizeMB?: number;              // Taille max recommandée (défaut 5MB)
  defaultScale?: number;           // Scale par défaut (défaut 0.8 = 80%)
  defaultQuality?: QualityLevel;   // Qualité par défaut (défaut 'medium')
  previewSize?: number;            // Taille preview canvas (défaut 400px)
}

// État du redimensionnement
export interface ResizeState {
  scale: number;
  quality: number;
  preview: ResizePreview | null;
  loading: boolean;
  error: string | null;
}

// Résultat du redimensionnement
export interface ResizeResult {
  success: boolean;
  file?: File;
  error?: string;
  originalSize: number;
  newSize: number;
  compressionRatio: number;  // Pourcentage de réduction
}
