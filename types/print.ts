/**
 * Types pour le système d'impression optimisé
 * Support 500+ produits avec QR codes
 */

// ============================================================================
// INTERFACES JOB D'IMPRESSION
// ============================================================================

export type PrintJobStatus =
  | 'idle'
  | 'generating'
  | 'ready'
  | 'printing'
  | 'cancelled'
  | 'error';

export type PrintPhase =
  | 'qr-generation'
  | 'html-building'
  | 'ready';

export interface PrintJobProgress {
  phase: PrintPhase;
  current: number;
  total: number;
  estimatedTimeRemaining?: number; // en secondes
  currentBatch?: number;
  totalBatches?: number;
}

export interface PrintJob {
  id: string;
  status: PrintJobStatus;
  progress: PrintJobProgress;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// CONFIGURATION IMPRESSION
// ============================================================================

export type StickerSizeKey = 'small' | 'medium' | 'large';

export interface StickerSizeConfig {
  perRow: number;      // Nombre de stickers par ligne
  perPage: number;     // Nombre de stickers par page
  qrSize: number;      // Taille QR code en pixels
  height: string;      // Hauteur sticker CSS
  fontSize: string;    // Taille police nom produit
  priceFontSize: string; // Taille police prix
}

export const STICKER_SIZES: Record<StickerSizeKey, StickerSizeConfig> = {
  small: {
    perRow: 5,
    perPage: 40,
    qrSize: 80,
    height: '45mm',
    fontSize: '9px',
    priceFontSize: '10px'
  },
  medium: {
    perRow: 4,
    perPage: 20,
    qrSize: 120,
    height: '55mm',
    fontSize: '11px',
    priceFontSize: '13px'
  },
  large: {
    perRow: 3,
    perPage: 12,
    qrSize: 150,
    height: '70mm',
    fontSize: '13px',
    priceFontSize: '15px'
  }
};

// Configuration liste (tableau de produits)
export const LIST_CONFIG = {
  itemsPerPage: 25,        // 25 produits par page
  qrSize: 80,              // QR code dans tableau
  rowHeight: '90px'        // Hauteur ligne tableau
};

// ============================================================================
// FORMAT D'IMPRESSION
// ============================================================================

export type PrintFormatType = 'list' | 'stickers';

export interface PrintFormat {
  type: PrintFormatType;
  itemsPerPage: number;

  // Options spécifiques stickers
  stickerSize?: StickerSizeKey;
  showProductName?: boolean;
  showPrice?: boolean;
  showCategory?: boolean;
}

// ============================================================================
// OPTIONS DE GÉNÉRATION
// ============================================================================

export interface QRGenerationProgress {
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining?: number;
}

export interface QRGenerationOptions {
  batchSize?: number;  // default: 50
  onProgress?: (progress: QRGenerationProgress) => void;
  abortSignal?: AbortSignal;
}

export interface PrintPageOptions {
  itemsPerPage: number;
  format: PrintFormatType;
  stickerOptions?: {
    afficherNom: boolean;
    afficherPrix: boolean;
    afficherCategorie?: boolean;
    stickersPerRow: number;
    stickerSize: StickerSizeKey;
  };
}

export interface PrintMetadata {
  nomStructure: string;
  logoStructure?: string;
  dateImpression: string;
}

// ============================================================================
// LIMITES ET CONSTANTES
// ============================================================================

export const PRINT_LIMITS = {
  WARNING_THRESHOLD: 300,    // Avertissement au-delà de ce nombre
  BATCH_SIZE: 50,            // Taille de lot pour génération QR
  MEMORY_RELEASE_DELAY: 50,  // Délai entre batches (ms)
  MAX_PRODUCTS: 2000         // Limite technique maximale
};

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

export interface BatchProcessorOptions<T, R> {
  items: T[];
  batchSize: number;
  processItem: (item: T, index: number) => Promise<R>;
  onProgress?: (processed: number, total: number, currentBatch: number, totalBatches: number) => void;
  onBatchComplete?: (batchResults: R[], batchIndex: number) => void;
  delayBetweenBatches?: number;
  abortSignal?: AbortSignal;
}

export interface BatchResult<R> {
  results: R[];
  totalProcessed: number;
  errors: Array<{ index: number; error: Error }>;
  cancelled: boolean;
  duration: number; // en ms
}
