/**
 * VisualRecognitionService
 * Service principal de reconnaissance visuelle des produits
 * FayClick V2 - Commerce
 */

import { ImageProcessor, ProcessedImage } from './image-processor';
import { ClipClient } from './clip-client';
import { EmbeddingStore, ProductEmbedding, createEmbeddingStore } from './embedding-store';
import { SimilarityEngine, VisualMatch, MatchResult } from './similarity-engine';

export type VisualState = 'idle' | 'capturing' | 'processing' | 'matched' | 'no_match' | 'enrolling' | 'enrolled' | 'error';

export interface VisualRecognitionResult {
  success: boolean;
  matches: VisualMatch[];
  topMatch: VisualMatch | null;
  confidence: number;
  processingTime: number;
  method: 'local' | 'api';
  newEmbedding?: number[];  // Embedding généré (pour enrôlement si pas de match)
  imageHash?: string;       // Hash de l'image traitée
}

export interface EnrollmentResult {
  success: boolean;
  idProduit: number;
  imageHash: string;
  message: string;
}

export interface VisualRecognitionStats {
  totalEmbeddings: number;
  cacheStats: {
    count: number;
    lastUpdate: Date | null;
    isStale: boolean;
  };
  apiHealthy: boolean;
}

type StateChangeCallback = (state: VisualState, error?: string) => void;

// Seuils de confiance
const CONFIDENCE_THRESHOLD = 0.85;   // Match confiant (auto-select)
const SUGGESTION_THRESHOLD = 0.60;   // Afficher comme suggestion
const DUPLICATE_THRESHOLD = 0.98;    // Considéré comme doublon

/**
 * Service principal de reconnaissance visuelle
 */
export class VisualRecognitionService {
  private imageProcessor: ImageProcessor;
  private clipClient: ClipClient;
  private embeddingStore: EmbeddingStore | null = null;
  private similarityEngine: SimilarityEngine | null = null;

  private state: VisualState = 'idle';
  private stateListeners: StateChangeCallback[] = [];
  private idStructure: number = 0;
  private initialized: boolean = false;

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.clipClient = new ClipClient();
  }

  /**
   * Initialise le service pour une structure donnée
   */
  async initialize(idStructure: number): Promise<void> {
    if (this.initialized && this.idStructure === idStructure) {
      return;
    }

    this.idStructure = idStructure;

    // Créer les stores spécifiques à la structure
    this.embeddingStore = createEmbeddingStore(idStructure);
    this.similarityEngine = new SimilarityEngine(this.embeddingStore);

    // Initialiser le cache de similarité
    await this.similarityEngine.initialize();

    this.initialized = true;
    console.log(`[VisualRecognition] Initialisé pour structure ${idStructure}`);
  }

  /**
   * Mode RECONNAISSANCE: Identifier un produit existant
   */
  async recognize(
    imageSource: File | Blob | string | HTMLVideoElement
  ): Promise<VisualRecognitionResult> {
    this.ensureInitialized();
    const startTime = performance.now();
    this.setState('processing');

    try {
      // 1. Capturer depuis vidéo si nécessaire
      let source: File | Blob | string = imageSource as File | Blob | string;
      if (imageSource instanceof HTMLVideoElement) {
        source = await this.captureVideoFrame(imageSource);
      }

      // 2. Prétraiter l'image
      const processed = await this.imageProcessor.process(source);

      // 3. Obtenir l'embedding via API CLIP
      const clipResult = await this.clipClient.getEmbedding(processed.base64);
      const embedding = clipResult.embedding;

      // 4. Rechercher les similaires dans le cache local
      const matchResult = await this.similarityEngine!.findSimilar(embedding, {
        limit: 5,
        minSimilarity: SUGGESTION_THRESHOLD
      });

      // 5. Déterminer le résultat
      const result: VisualRecognitionResult = {
        success: matchResult.matches.length > 0,
        matches: matchResult.matches,
        topMatch: matchResult.topMatch,
        confidence: matchResult.confidence,
        processingTime: performance.now() - startTime,
        method: 'api',
        newEmbedding: embedding,
        imageHash: processed.hash
      };

      // 6. Mettre à jour l'état
      if (result.confidence >= CONFIDENCE_THRESHOLD) {
        this.setState('matched');
      } else if (result.matches.length > 0) {
        this.setState('matched'); // Suggestions disponibles
      } else {
        this.setState('no_match');
      }

      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de reconnaissance';
      this.setState('error', message);
      throw error;
    }
  }

  /**
   * Mode ENRÔLEMENT: Associer une image à un produit
   */
  async enroll(
    idProduit: number,
    imageSource: File | Blob | string | HTMLVideoElement,
    options?: {
      skipDuplicateCheck?: boolean;
      thumbnailDataUrl?: string;
    }
  ): Promise<EnrollmentResult> {
    this.ensureInitialized();
    this.setState('enrolling');

    try {
      // 1. Capturer depuis vidéo si nécessaire
      let source: File | Blob | string = imageSource as File | Blob | string;
      if (imageSource instanceof HTMLVideoElement) {
        source = await this.captureVideoFrame(imageSource);
      }

      // 2. Prétraiter l'image
      const processed = await this.imageProcessor.process(source);

      // 3. Obtenir l'embedding via API CLIP
      const clipResult = await this.clipClient.getEmbedding(processed.base64);
      const embedding = clipResult.embedding;

      // 4. Vérifier les doublons si demandé
      if (!options?.skipDuplicateCheck) {
        const duplicateId = await this.similarityEngine!.isDuplicate(embedding);
        if (duplicateId && duplicateId !== idProduit) {
          this.setState('error', `Image similaire déjà associée au produit ${duplicateId}`);
          return {
            success: false,
            idProduit,
            imageHash: processed.hash,
            message: `Image similaire déjà associée au produit ${duplicateId}`
          };
        }
      }

      // 5. Sauvegarder l'embedding
      await this.embeddingStore!.save(idProduit, embedding, processed.hash, {
        thumbnailDataUrl: options?.thumbnailDataUrl || processed.dataUrl,
        confidence: 1.0,
        syncToServer: true
      });

      // 6. Rafraîchir le cache de similarité
      await this.similarityEngine!.refreshCache();

      this.setState('enrolled');

      return {
        success: true,
        idProduit,
        imageHash: processed.hash,
        message: 'Image enrôlée avec succès'
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur d\'enrôlement';
      this.setState('error', message);
      return {
        success: false,
        idProduit,
        imageHash: '',
        message
      };
    }
  }

  /**
   * Met à jour l'embedding d'un produit existant
   */
  async updateEmbedding(
    idProduit: number,
    imageSource: File | Blob | string | HTMLVideoElement
  ): Promise<EnrollmentResult> {
    // Supprimer l'ancien embedding puis enrôler le nouveau
    await this.embeddingStore?.delete(idProduit);
    return this.enroll(idProduit, imageSource, { skipDuplicateCheck: true });
  }

  /**
   * Supprime l'embedding d'un produit
   */
  async removeEmbedding(idProduit: number): Promise<void> {
    this.ensureInitialized();
    await this.embeddingStore!.delete(idProduit);
    await this.similarityEngine!.refreshCache();
  }

  /**
   * Vérifie si un produit a déjà un embedding
   */
  async hasEmbedding(idProduit: number): Promise<boolean> {
    this.ensureInitialized();
    return this.embeddingStore!.hasEmbedding(idProduit);
  }

  /**
   * Récupère l'embedding d'un produit
   */
  async getEmbedding(idProduit: number): Promise<ProductEmbedding | undefined> {
    this.ensureInitialized();
    return this.embeddingStore!.getByProductId(idProduit);
  }

  /**
   * Synchronise les embeddings depuis le serveur
   */
  async syncFromServer(): Promise<number> {
    this.ensureInitialized();
    const synced = await this.embeddingStore!.syncFromServer();
    await this.similarityEngine!.refreshCache();
    return synced;
  }

  /**
   * Capture une frame depuis un élément vidéo
   */
  private captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossible de créer le contexte canvas'));
        return;
      }

      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Impossible de capturer la frame vidéo'));
          }
        },
        'image/jpeg',
        0.9
      );
    });
  }

  /**
   * Obtient les statistiques du service
   */
  async getStats(): Promise<VisualRecognitionStats> {
    this.ensureInitialized();

    const totalEmbeddings = await this.embeddingStore!.count();
    const cacheStats = this.similarityEngine!.getCacheStats();
    const apiHealthy = await this.clipClient.healthCheck();

    return {
      totalEmbeddings,
      cacheStats,
      apiHealthy
    };
  }

  /**
   * Gestion de l'état
   */
  getState(): VisualState {
    return this.state;
  }

  private setState(newState: VisualState, error?: string): void {
    this.state = newState;
    this.stateListeners.forEach(cb => cb(newState, error));
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Réinitialise l'état à idle
   */
  resetState(): void {
    this.setState('idle');
  }

  /**
   * Vérifie que le service est initialisé
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('VisualRecognitionService non initialisé. Appelez initialize() d\'abord.');
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.embeddingStore?.close();
    this.stateListeners = [];
    this.initialized = false;
  }

  /**
   * Seuils de confiance (exposés pour l'UI)
   */
  static get THRESHOLDS() {
    return {
      CONFIDENT: CONFIDENCE_THRESHOLD,
      SUGGESTION: SUGGESTION_THRESHOLD,
      DUPLICATE: DUPLICATE_THRESHOLD
    };
  }
}

// Singleton global
let instance: VisualRecognitionService | null = null;

export function getVisualRecognitionService(): VisualRecognitionService {
  if (!instance) {
    instance = new VisualRecognitionService();
  }
  return instance;
}

export default VisualRecognitionService;
