/**
 * ImageProcessor Service
 * Prétraitement des images pour CLIP (redimensionnement, normalisation)
 * FayClick V2 - Reconnaissance Visuelle Commerce
 */

export interface ProcessedImage {
  base64: string;           // Image encodée en base64
  dataUrl: string;          // Data URL complète
  hash: string;             // Hash SHA-256 de l'image
  originalSize: number;     // Taille originale en bytes
  processedSize: number;    // Taille après traitement
  dimensions: string;       // Format "WxH"
  mimeType: string;         // Type MIME
}

export interface ProcessingOptions {
  targetSize?: number;      // Taille cible (défaut: 224px pour CLIP)
  quality?: number;         // Qualité JPEG (0-1, défaut: 0.85)
  format?: 'jpeg' | 'png';  // Format de sortie
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  targetSize: 224,    // CLIP utilise 224x224
  quality: 0.85,
  format: 'jpeg'
};

/**
 * Calcule le hash SHA-256 d'une chaîne
 */
async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Charge une image depuis un File ou Blob
 */
function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossible de charger l\'image'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Redimensionne et normalise une image pour CLIP
 */
function resizeImage(
  img: HTMLImageElement,
  targetSize: number,
  quality: number,
  format: 'jpeg' | 'png'
): { canvas: HTMLCanvasElement; dataUrl: string } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Impossible de créer le contexte canvas');
  }

  // Calcul du crop carré centré (préserve le ratio 1:1)
  const size = Math.min(img.width, img.height);
  const offsetX = (img.width - size) / 2;
  const offsetY = (img.height - size) / 2;

  // Définir la taille du canvas
  canvas.width = targetSize;
  canvas.height = targetSize;

  // Fond blanc (évite les problèmes de transparence)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Dessiner l'image redimensionnée et centrée
  ctx.drawImage(
    img,
    offsetX, offsetY, size, size,  // Source (crop carré)
    0, 0, targetSize, targetSize   // Destination
  );

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return { canvas, dataUrl };
}

/**
 * Extrait la partie base64 d'une data URL
 */
function extractBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
}

/**
 * Calcule la taille en bytes d'une chaîne base64
 */
function getBase64Size(base64: string): number {
  // Formule: (longueur * 3) / 4 - padding
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Service de prétraitement d'images
 */
export class ImageProcessor {
  private options: ProcessingOptions;

  constructor(options: Partial<ProcessingOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Traite une image pour la rendre compatible CLIP
   */
  async process(source: File | Blob | string): Promise<ProcessedImage> {
    // Calculer la taille originale
    let originalSize = 0;
    if (source instanceof File || source instanceof Blob) {
      originalSize = source.size;
    } else if (typeof source === 'string' && source.startsWith('data:')) {
      originalSize = getBase64Size(extractBase64(source));
    }

    // Charger l'image
    const img = await loadImage(source);

    // Libérer l'URL d'objet si créée
    if (source instanceof File || source instanceof Blob) {
      URL.revokeObjectURL(img.src);
    }

    // Redimensionner
    const { dataUrl } = resizeImage(
      img,
      this.options.targetSize!,
      this.options.quality!,
      this.options.format!
    );

    // Extraire base64
    const base64 = extractBase64(dataUrl);
    const processedSize = getBase64Size(base64);

    // Calculer le hash
    const hash = await calculateHash(base64);

    // Format dimensions
    const dimensions = `${this.options.targetSize}x${this.options.targetSize}`;
    const mimeType = this.options.format === 'jpeg' ? 'image/jpeg' : 'image/png';

    return {
      base64,
      dataUrl,
      hash,
      originalSize,
      processedSize,
      dimensions,
      mimeType
    };
  }

  /**
   * Traite plusieurs images en parallèle
   */
  async processBatch(sources: (File | Blob | string)[]): Promise<ProcessedImage[]> {
    return Promise.all(sources.map(source => this.process(source)));
  }

  /**
   * Vérifie si une source est une image valide
   */
  async validate(source: File | Blob | string): Promise<boolean> {
    try {
      await loadImage(source);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtient les dimensions d'une image sans la traiter
   */
  async getDimensions(source: File | Blob | string): Promise<{ width: number; height: number }> {
    const img = await loadImage(source);
    return { width: img.width, height: img.height };
  }
}

// Instance singleton
export const imageProcessor = new ImageProcessor();

export default ImageProcessor;
