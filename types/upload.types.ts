/**
 * Types TypeScript pour l'upload de logos FayClick V2
 */

// Interface pour la configuration d'upload
export interface UploadConfig {
  MAX_FILE_SIZE: number;
  ALLOWED_MIME_TYPES: string[];
  IMAGE_QUALITY: number;
  MAX_DIMENSIONS: {
    width: number;
    height: number;
  };
}

// Configuration FTP
export interface FTPConfig {
  host: string;
  user: string;
  password: string;
  secure: boolean;
  timeout: number;
  remoteDir: string;
}

// État d'upload
export type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'success' | 'error';

// Résultat d'upload
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

// Interface pour le progress d'upload
export interface UploadProgress {
  status: UploadStatus;
  progress: number; // 0-100
  message: string;
  eta?: number; // temps estimé restant en ms
}

// Interface pour la validation de fichier
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

// Interface pour le composant LogoUpload
export interface LogoUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onFileSelect?: (file: File) => void;
  initialPreview?: string;
  className?: string;
  disabled?: boolean;
  forceRemoteUpload?: boolean; // Si true, upload FTP obligatoire même en DEV
  label?: string; // Label personnalisé pour l'upload
}

// Interface pour l'état du logo dans le formulaire
export interface LogoState {
  file?: File;
  preview?: string;
  url?: string;
  uploading: boolean;
  progress: number;
  error?: string;
}

// Constantes de configuration
export const UPLOAD_CONSTANTS: UploadConfig = {
  MAX_FILE_SIZE: 512 * 1024, // 0.5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  IMAGE_QUALITY: 0.8,
  MAX_DIMENSIONS: {
    width: 800,
    height: 800
  }
};

// Configuration FTP (sans les credentials sensibles)
export const FTP_CONSTANTS = {
  REMOTE_DIR: '/uploads/',
  BASE_URL: 'https://fayclick.net',
  FILENAME_PATTERN: 'logo-{timestamp}-{hash}.{ext}'
} as const;

// Types utilitaires pour l'upload
export type FileExtension = 'png' | 'jpg' | 'jpeg' | 'gif';
export type CompressionOptions = {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  quality: number;
};

// Interface pour le service d'upload
export interface ILogoUploadService {
  uploadLogo(file: File, onProgress?: (progress: UploadProgress) => void): Promise<UploadResult>;
  validateFile(file: File): Promise<FileValidationResult>;
  compressImage(file: File): Promise<File>;
  generateFilename(originalName: string): string;
}

// Interface pour les événements d'upload
export interface UploadEvents {
  onStart?: () => void;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

// Type pour les erreurs d'upload
export interface UploadError extends Error {
  code: 'VALIDATION_FAILED' | 'COMPRESSION_FAILED' | 'UPLOAD_FAILED' | 'NETWORK_ERROR' | 'TIMEOUT';
  details?: Record<string, unknown>;
}

export default UPLOAD_CONSTANTS;