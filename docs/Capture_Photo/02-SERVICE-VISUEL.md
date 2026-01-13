# Service de Reconnaissance Visuelle CLIP - Spécifications Techniques


Configurer → NEXT_PUBLIC_REPLICATE_API_KEY=your_replicate_api_key_here

**Module**: `VisualRecognitionService`  
**Priorité**: Moyenne (Enrôlement nouveaux produits)  
**Dépendances**: CLIP API (OpenAI/Replicate), IndexedDB, Canvas API

---

## 1. Vue d'ensemble

### 1.1 Objectif

Permettre l'enrôlement de nouveaux produits par capture photo et la reconnaissance visuelle ultérieure via embeddings CLIP avec matching local.

### 1.2 Principe CLIP

CLIP (Contrastive Language-Image Pre-training) convertit images ET texte en vecteurs de même dimension (512D), permettant de comparer visuellement des produits sans classification préalable.

```
Image produit → CLIP Encoder → Vecteur 512D → Similarité cosinus → Match
```

### 1.3 Stratégie coût

| Phase | Action | Coût |
|-------|--------|------|
| Enrôlement | Photo → API CLIP → Embedding stocké | ~0.0002$/image |
| Usage quotidien | Photo → Matching local embeddings | GRATUIT |

**ROI** : Après enrôlement initial (150 produits ≈ 0.03$), le système est autonome.

---

## 2. Architecture du service

### 2.1 Structure des fichiers

```
src/
├── services/
│   └── recognition/
│       ├── visual/
│       │   ├── VisualRecognitionService.ts  # Service principal
│       │   ├── ImageProcessor.ts            # Prétraitement images
│       │   ├── ClipClient.ts                # Client API CLIP
│       │   ├── EmbeddingStore.ts            # Stockage embeddings
│       │   ├── SimilarityEngine.ts          # Calcul similarités
│       │   └── LocalClipModel.ts            # Optionnel: modèle local
│       └── index.ts
├── hooks/
│   └── useVisualRecognition.ts              # Hook React
├── components/
│   └── ProductCamera/
│       ├── ProductCamera.tsx                # Composant capture
│       ├── CameraPreview.tsx                # Preview + crop
│       └── MatchResults.tsx                 # Affichage résultats
└── types/
    └── visual.types.ts
```

### 2.2 Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODE ENRÔLEMENT                              │
│                                                                 │
│  Capture → Prétraitement → API CLIP → Embedding → IndexedDB    │
│              224x224         cloud      512D                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MODE RECONNAISSANCE                          │
│                                                                 │
│  Capture → Prétraitement → [Local first] → Matching → Résultat │
│              224x224        embeddings     cosinus              │
│                                ↓                                │
│                        [Si < 10 produits]                       │
│                               ↓                                 │
│                         API CLIP → Compare                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Types TypeScript

```typescript
// src/types/visual.types.ts

export interface ImageCaptureConfig {
  maxWidth: number;           // Taille max capture (1024)
  targetSize: number;         // Taille CLIP (224)
  quality: number;            // Qualité JPEG (0.8)
  thumbnailSize: number;      // Taille miniature (64)
}

export interface ProcessedImage {
  original: Blob;             // Image originale compressée
  clipReady: Blob;            // Image 224x224 pour CLIP
  thumbnail: Blob;            // Miniature 64x64
  hash: string;               // Hash pour déduplication
}

export interface ProductEmbedding {
  id: string;
  productId: string;
  embedding: number[];        // Vecteur 512D
  thumbnailBlob: Blob;
  createdAt: Date;
  source: 'clip_api' | 'clip_local' | 'manual';
  confidence: number;         // Qualité de l'embedding
}

export interface VisualMatch {
  productId: string;
  similarity: number;         // 0-1
  embedding: ProductEmbedding;
}

export interface VisualRecognitionResult {
  success: boolean;
  matches: VisualMatch[];
  topMatch: VisualMatch | null;
  confidence: number;
  processingTime: number;
  method: 'local' | 'api';
  newEmbedding?: number[];    // Si nouveau produit
}

export type VisualState = 'idle' | 'capturing' | 'processing' | 'matched' | 'no_match' | 'error';
```

---

## 4. Implémentation détaillée

### 4.1 Prétraitement d'images

```typescript
// src/services/recognition/visual/ImageProcessor.ts

import { ProcessedImage, ImageCaptureConfig } from '@/types/visual.types';

export class ImageProcessor {
  private config: ImageCaptureConfig = {
    maxWidth: 1024,
    targetSize: 224,      // Taille standard CLIP
    quality: 0.8,
    thumbnailSize: 64,
  };

  constructor(config?: Partial<ImageCaptureConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async processForClip(imageSource: Blob | HTMLImageElement | HTMLVideoElement): Promise<ProcessedImage> {
    // Étape 1: Charger image dans canvas
    const img = await this.loadImage(imageSource);
    
    // Étape 2: Compression originale
    const original = await this.resizeAndCompress(
      img, 
      this.config.maxWidth, 
      this.config.quality
    );
    
    // Étape 3: Préparation CLIP (224x224, centré, normalisé)
    const clipReady = await this.prepareForClip(img);
    
    // Étape 4: Thumbnail
    const thumbnail = await this.resizeAndCompress(
      img, 
      this.config.thumbnailSize, 
      0.7
    );
    
    // Étape 5: Hash pour déduplication
    const hash = await this.computeImageHash(clipReady);
    
    return { original, clipReady, thumbnail, hash };
  }

  private async loadImage(source: Blob | HTMLImageElement | HTMLVideoElement): Promise<HTMLImageElement> {
    if (source instanceof HTMLImageElement) {
      return source;
    }
    
    if (source instanceof HTMLVideoElement) {
      return this.captureVideoFrame(source);
    }
    
    // Blob
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(source);
    });
  }

  private async captureVideoFrame(video: HTMLVideoElement): Promise<HTMLImageElement> {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Failed to capture video frame'));
          return;
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      }, 'image/jpeg', 0.9);
    });
  }

  private async prepareForClip(img: HTMLImageElement): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const size = this.config.targetSize;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    
    // Fond blanc (pour transparence)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    // Calcul crop centré (carré)
    const minDim = Math.min(img.width, img.height);
    const sx = (img.width - minDim) / 2;
    const sy = (img.height - minDim) / 2;
    
    // Dessiner centré
    ctx.drawImage(
      img,
      sx, sy, minDim, minDim,  // Source (crop carré centré)
      0, 0, size, size          // Destination (224x224)
    );
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create CLIP image')),
        'image/jpeg',
        0.9  // Haute qualité pour CLIP
      );
    });
  }

  private async resizeAndCompress(
    img: HTMLImageElement, 
    maxSize: number, 
    quality: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    
    // Calcul dimensions
    let { width, height } = img;
    if (width > height) {
      if (width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to compress image')),
        'image/jpeg',
        quality
      );
    });
  }

  // Hash perceptuel simple pour déduplication
  private async computeImageHash(blob: Blob): Promise<string> {
    const img = await this.loadImage(blob);
    
    // Réduire à 8x8 niveaux de gris
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 8, 8);
    
    const imageData = ctx.getImageData(0, 0, 8, 8);
    const pixels = imageData.data;
    
    // Calculer moyenne
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      sum += gray;
    }
    const avg = sum / 64;
    
    // Générer hash binaire
    let hash = '';
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      hash += gray > avg ? '1' : '0';
    }
    
    // Convertir en hex
    return parseInt(hash, 2).toString(16).padStart(16, '0');
  }

  // Utilitaire: convertir Blob en base64
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
```

### 4.2 Client API CLIP

```typescript
// src/services/recognition/visual/ClipClient.ts

import { ENV } from '@/config/env';

interface ClipEmbeddingResponse {
  embedding: number[];
  model: string;
  processingTime: number;
}

export class ClipClient {
  private provider: 'openai' | 'replicate';
  
  constructor(provider: 'openai' | 'replicate' = 'replicate') {
    this.provider = provider;
  }

  async getEmbedding(imageBase64: string): Promise<ClipEmbeddingResponse> {
    const startTime = Date.now();
    
    if (this.provider === 'openai') {
      return this.getOpenAIEmbedding(imageBase64, startTime);
    } else {
      return this.getReplicateEmbedding(imageBase64, startTime);
    }
  }

  // Option A: OpenAI (plus cher, plus stable)
  private async getOpenAIEmbedding(
    imageBase64: string, 
    startTime: number
  ): Promise<ClipEmbeddingResponse> {
    // Note: OpenAI n'a pas d'API CLIP publique directe
    // On utilise leur API vision avec un trick
    // Alternative: utiliser leur embedding model avec description
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: `Product image for visual recognition`,
        // Note: Ceci est un placeholder - OpenAI n'expose pas CLIP directement
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      embedding: data.data[0].embedding,
      model: 'text-embedding-3-small',
      processingTime: Date.now() - startTime,
    };
  }

  // Option B: Replicate (moins cher, recommandé)
  private async getReplicateEmbedding(
    imageBase64: string, 
    startTime: number
  ): Promise<ClipEmbeddingResponse> {
    // Créer la prédiction
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${ENV.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // CLIP ViT-B/32 - bon équilibre performance/vitesse
        version: 'openai/clip-vit-base-patch32',
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Replicate API error: ${error.detail || createResponse.statusText}`);
    }

    const prediction = await createResponse.json();
    
    // Polling pour résultat (généralement < 2s)
    const result = await this.pollPrediction(prediction.id);
    
    return {
      embedding: result.output.embedding,
      model: 'clip-vit-base-patch32',
      processingTime: Date.now() - startTime,
    };
  }

  private async pollPrediction(predictionId: string, maxAttempts = 30): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${ENV.REPLICATE_API_KEY}`,
          },
        }
      );

      const prediction = await response.json();

      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed') {
        throw new Error(`Prediction failed: ${prediction.error}`);
      }

      // Attendre 200ms avant retry
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    throw new Error('Prediction timeout');
  }
}
```

### 4.3 Stockage des embeddings

```typescript
// src/services/recognition/visual/EmbeddingStore.ts

import { db } from '@/db';
import { ProductEmbedding } from '@/types/visual.types';

export class EmbeddingStore {
  // Sauvegarder un embedding
  async save(
    productId: string, 
    embedding: number[], 
    thumbnail: Blob,
    source: ProductEmbedding['source'] = 'clip_api'
  ): Promise<ProductEmbedding> {
    const record: ProductEmbedding = {
      id: crypto.randomUUID(),
      productId,
      embedding,
      thumbnailBlob: thumbnail,
      createdAt: new Date(),
      source,
      confidence: 1.0,
    };

    await db.product_embeddings.add(record);
    
    return record;
  }

  // Récupérer tous les embeddings
  async getAll(): Promise<ProductEmbedding[]> {
    return db.product_embeddings.toArray();
  }

  // Récupérer embedding par produit
  async getByProductId(productId: string): Promise<ProductEmbedding | undefined> {
    return db.product_embeddings
      .where('productId')
      .equals(productId)
      .first();
  }

  // Vérifier si un produit a un embedding
  async hasEmbedding(productId: string): Promise<boolean> {
    const count = await db.product_embeddings
      .where('productId')
      .equals(productId)
      .count();
    return count > 0;
  }

  // Supprimer embedding
  async delete(productId: string): Promise<void> {
    await db.product_embeddings
      .where('productId')
      .equals(productId)
      .delete();
  }

  // Compter le nombre d'embeddings
  async count(): Promise<number> {
    return db.product_embeddings.count();
  }

  // Mettre à jour embedding existant
  async update(productId: string, embedding: number[]): Promise<void> {
    const existing = await this.getByProductId(productId);
    if (existing) {
      await db.product_embeddings.update(existing.id, {
        embedding,
        createdAt: new Date(),
      });
    }
  }

  // Export pour backup
  async exportAll(): Promise<{ productId: string; embedding: number[] }[]> {
    const all = await this.getAll();
    return all.map(e => ({
      productId: e.productId,
      embedding: e.embedding,
    }));
  }

  // Import depuis backup
  async importBulk(
    data: { productId: string; embedding: number[] }[],
    thumbnails: Map<string, Blob>
  ): Promise<number> {
    let imported = 0;
    
    for (const item of data) {
      const exists = await this.hasEmbedding(item.productId);
      if (!exists) {
        const thumbnail = thumbnails.get(item.productId) || new Blob();
        await this.save(item.productId, item.embedding, thumbnail, 'manual');
        imported++;
      }
    }
    
    return imported;
  }
}
```

### 4.4 Moteur de similarité

```typescript
// src/services/recognition/visual/SimilarityEngine.ts

import { ProductEmbedding, VisualMatch } from '@/types/visual.types';
import { EmbeddingStore } from './EmbeddingStore';

export class SimilarityEngine {
  private embeddingStore: EmbeddingStore;
  private cachedEmbeddings: ProductEmbedding[] = [];
  private lastCacheUpdate: Date | null = null;

  constructor(embeddingStore: EmbeddingStore) {
    this.embeddingStore = embeddingStore;
  }

  async initialize(): Promise<void> {
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    this.cachedEmbeddings = await this.embeddingStore.getAll();
    this.lastCacheUpdate = new Date();
  }

  // Trouver les produits les plus similaires
  async findSimilar(
    queryEmbedding: number[], 
    limit: number = 5,
    minSimilarity: number = 0.5
  ): Promise<VisualMatch[]> {
    // Rafraîchir cache si nécessaire (> 5 min)
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }

    if (this.cachedEmbeddings.length === 0) {
      return [];
    }

    // Calculer similarités
    const matches: VisualMatch[] = this.cachedEmbeddings
      .map(embedding => ({
        productId: embedding.productId,
        similarity: this.cosineSimilarity(queryEmbedding, embedding.embedding),
        embedding,
      }))
      .filter(match => match.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return matches;
  }

  // Similarité cosinus - cœur de l'algorithme
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    
    if (magnitude === 0) return 0;
    
    return dotProduct / magnitude;
  }

  // Version optimisée pour batch (SIMD-like)
  async findSimilarBatch(
    queryEmbeddings: number[][],
    limit: number = 5
  ): Promise<VisualMatch[][]> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }

    return queryEmbeddings.map(query => {
      const matches = this.cachedEmbeddings.map(embedding => ({
        productId: embedding.productId,
        similarity: this.cosineSimilarity(query, embedding.embedding),
        embedding,
      }));

      return matches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    });
  }

  // Vérifier si exact duplicate existe (similarity > 0.98)
  async isDuplicate(queryEmbedding: number[]): Promise<string | null> {
    const matches = await this.findSimilar(queryEmbedding, 1, 0.98);
    return matches.length > 0 ? matches[0].productId : null;
  }

  // Stats du cache
  getCacheStats(): { count: number; lastUpdate: Date | null } {
    return {
      count: this.cachedEmbeddings.length,
      lastUpdate: this.lastCacheUpdate,
    };
  }

  private shouldRefreshCache(): boolean {
    if (!this.lastCacheUpdate) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - this.lastCacheUpdate.getTime() > fiveMinutes;
  }

  // Normaliser un vecteur (utile pour certains modèles)
  private normalizeVector(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vec;
    return vec.map(val => val / magnitude);
  }
}
```

### 4.5 Service principal

```typescript
// src/services/recognition/visual/VisualRecognitionService.ts

import { ImageProcessor } from './ImageProcessor';
import { ClipClient } from './ClipClient';
import { EmbeddingStore } from './EmbeddingStore';
import { SimilarityEngine } from './SimilarityEngine';
import { 
  VisualRecognitionResult, 
  VisualState, 
  ProcessedImage 
} from '@/types/visual.types';
import { ProductMatch } from '@/types/recognition.types';

type StateChangeCallback = (state: VisualState) => void;

export class VisualRecognitionService {
  private imageProcessor: ImageProcessor;
  private clipClient: ClipClient;
  private embeddingStore: EmbeddingStore;
  private similarityEngine: SimilarityEngine;
  
  private state: VisualState = 'idle';
  private stateListeners: StateChangeCallback[] = [];
  
  // Seuils de confiance
  private readonly CONFIDENCE_THRESHOLD = 0.85;  // Match confiant
  private readonly SUGGESTION_THRESHOLD = 0.6;   // Afficher comme suggestion
  private readonly MIN_EMBEDDINGS_FOR_LOCAL = 10; // Min pour skip API

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.clipClient = new ClipClient('replicate');
    this.embeddingStore = new EmbeddingStore();
    this.similarityEngine = new SimilarityEngine(this.embeddingStore);
  }

  async initialize(): Promise<void> {
    await this.similarityEngine.initialize();
  }

  // Mode reconnaissance: identifier un produit existant
  async recognize(
    imageSource: Blob | HTMLVideoElement
  ): Promise<VisualRecognitionResult> {
    const startTime = Date.now();
    this.setState('processing');

    try {
      // Prétraitement
      const processed = await this.imageProcessor.processForClip(imageSource);
      
      // Stratégie: local first si assez d'embeddings
      const embeddingCount = await this.embeddingStore.count();
      
      let embedding: number[];
      let method: 'local' | 'api';

      if (embeddingCount >= this.MIN_EMBEDDINGS_FOR_LOCAL) {
        // Essayer matching local d'abord
        const localResult = await this.tryLocalMatch(processed);
        
        if (localResult && localResult.confidence >= this.CONFIDENCE_THRESHOLD) {
          this.setState('matched');
          return {
            success: true,
            matches: localResult.matches,
            topMatch: localResult.matches[0] || null,
            confidence: localResult.confidence,
            processingTime: Date.now() - startTime,
            method: 'local',
          };
        }
      }

      // Fallback API si pas de match local confiant
      const base64 = await this.imageProcessor.blobToBase64(processed.clipReady);
      const clipResult = await this.clipClient.getEmbedding(base64);
      embedding = clipResult.embedding;
      method = 'api';

      // Recherche similarité
      const matches = await this.similarityEngine.findSimilar(
        embedding,
        5,
        this.SUGGESTION_THRESHOLD
      );

      const topMatch = matches[0] || null;
      const confidence = topMatch?.similarity || 0;

      if (confidence >= this.CONFIDENCE_THRESHOLD) {
        this.setState('matched');
      } else if (matches.length > 0) {
        this.setState('matched'); // Suggestions disponibles
      } else {
        this.setState('no_match');
      }

      return {
        success: matches.length > 0,
        matches,
        topMatch,
        confidence,
        processingTime: Date.now() - startTime,
        method,
        newEmbedding: embedding, // Pour enrôlement si nouveau
      };

    } catch (error) {
      this.setState('error');
      console.error('[VisualRecognition] Error:', error);
      throw error;
    }
  }

  // Mode enrôlement: associer une image à un produit
  async enroll(
    productId: string,
    imageSource: Blob | HTMLVideoElement
  ): Promise<boolean> {
    this.setState('processing');

    try {
      // Vérifier si embedding existe déjà
      const existing = await this.embeddingStore.hasEmbedding(productId);
      
      // Prétraitement
      const processed = await this.imageProcessor.processForClip(imageSource);
      
      // Obtenir embedding via API
      const base64 = await this.imageProcessor.blobToBase64(processed.clipReady);
      const clipResult = await this.clipClient.getEmbedding(base64);
      
      if (existing) {
        // Mettre à jour
        await this.embeddingStore.update(productId, clipResult.embedding);
      } else {
        // Créer nouveau
        await this.embeddingStore.save(
          productId,
          clipResult.embedding,
          processed.thumbnail,
          'clip_api'
        );
      }

      // Rafraîchir cache
      await this.similarityEngine.refreshCache();
      
      this.setState('idle');
      return true;

    } catch (error) {
      this.setState('error');
      console.error('[VisualRecognition] Enroll error:', error);
      throw error;
    }
  }

  // Match local sans API (pour produits déjà enrôlés)
  private async tryLocalMatch(
    processed: ProcessedImage
  ): Promise<{ matches: any[]; confidence: number } | null> {
    // Pour un vrai matching local, il faudrait un modèle CLIP local
    // Ici on fait du matching par hash perceptuel comme fallback
    
    // Cette méthode est un placeholder - en production, 
    // on utiliserait ONNX Runtime avec un modèle CLIP quantifié
    
    return null;
  }

  // Convertir résultat visuel en ProductMatch standard
  toProductMatch(result: VisualRecognitionResult): ProductMatch | null {
    if (!result.topMatch) return null;

    return {
      productId: result.topMatch.productId,
      confidence: result.topMatch.similarity,
      matchType: 'visual',
      alternatives: result.matches.slice(1).map(m => ({
        productId: m.productId,
        confidence: m.similarity,
        matchType: 'visual' as const,
      })),
    };
  }

  // State management
  private setState(newState: VisualState): void {
    this.state = newState;
    this.stateListeners.forEach(cb => cb(newState));
  }

  getState(): VisualState {
    return this.state;
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter(cb => cb !== callback);
    };
  }

  // Stats
  async getStats(): Promise<{
    totalEmbeddings: number;
    cacheStats: { count: number; lastUpdate: Date | null };
  }> {
    return {
      totalEmbeddings: await this.embeddingStore.count(),
      cacheStats: this.similarityEngine.getCacheStats(),
    };
  }
}

// Singleton
let instance: VisualRecognitionService | null = null;

export function getVisualRecognitionService(): VisualRecognitionService {
  if (!instance) {
    instance = new VisualRecognitionService();
  }
  return instance;
}
```

---

## 5. Hook React

```typescript
// src/hooks/useVisualRecognition.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  VisualRecognitionService, 
  getVisualRecognitionService 
} from '@/services/recognition/visual/VisualRecognitionService';
import { VisualState, VisualRecognitionResult } from '@/types/visual.types';
import { ProductMatch } from '@/types/recognition.types';

interface UseVisualRecognitionReturn {
  state: VisualState;
  isProcessing: boolean;
  error: string | null;
  recognize: (image: Blob | HTMLVideoElement) => Promise<ProductMatch | null>;
  enroll: (productId: string, image: Blob | HTMLVideoElement) => Promise<boolean>;
  stats: { totalEmbeddings: number } | null;
}

export function useVisualRecognition(): UseVisualRecognitionReturn {
  const serviceRef = useRef<VisualRecognitionService | null>(null);
  const [state, setState] = useState<VisualState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalEmbeddings: number } | null>(null);

  useEffect(() => {
    const service = getVisualRecognitionService();
    serviceRef.current = service;

    service.initialize().then(() => {
      service.getStats().then(setStats);
    });

    const unsubscribe = service.onStateChange(setState);
    
    return () => {
      unsubscribe();
    };
  }, []);

  const recognize = useCallback(async (
    image: Blob | HTMLVideoElement
  ): Promise<ProductMatch | null> => {
    if (!serviceRef.current) {
      setError('Service non initialisé');
      return null;
    }

    setError(null);

    try {
      const result = await serviceRef.current.recognize(image);
      
      // Update stats
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);
      
      return serviceRef.current.toProductMatch(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de reconnaissance');
      return null;
    }
  }, []);

  const enroll = useCallback(async (
    productId: string,
    image: Blob | HTMLVideoElement
  ): Promise<boolean> => {
    if (!serviceRef.current) {
      setError('Service non initialisé');
      return false;
    }

    setError(null);

    try {
      const success = await serviceRef.current.enroll(productId, image);
      
      // Update stats
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enrôlement");
      return false;
    }
  }, []);

  return {
    state,
    isProcessing: state === 'processing',
    error,
    recognize,
    enroll,
    stats,
  };
}
```

---

## 6. Composant caméra produit

```tsx
// src/components/ProductCamera/ProductCamera.tsx

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { useVisualRecognition } from '@/hooks/useVisualRecognition';
import { ProductMatch } from '@/types/recognition.types';
import { CameraPreview } from './CameraPreview';
import { MatchResults } from './MatchResults';

interface ProductCameraProps {
  mode: 'recognize' | 'enroll';
  productId?: string;  // Requis si mode = 'enroll'
  onResult: (match: ProductMatch | null) => void;
  onEnrolled?: () => void;
  onClose: () => void;
}

export function ProductCamera({
  mode,
  productId,
  onResult,
  onEnrolled,
  onClose,
}: ProductCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  const { 
    state, 
    isProcessing, 
    error, 
    recognize, 
    enroll,
    stats 
  } = useVisualRecognition();

  // Initialiser caméra
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  // Capturer image
  const captureImage = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(blob => {
      if (blob) {
        setCapturedImage(blob);
        processImage(blob);
      }
    }, 'image/jpeg', 0.9);
  }, []);

  // Traiter image
  const processImage = async (image: Blob) => {
    if (mode === 'recognize') {
      const match = await recognize(image);
      onResult(match);
    } else if (mode === 'enroll' && productId) {
      const success = await enroll(productId, image);
      if (success && onEnrolled) {
        onEnrolled();
      }
    }
  };

  // Reprendre photo
  const retake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  // Changer caméra
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <button onClick={onClose} className="text-white p-2">
          <X size={24} />
        </button>
        <span className="text-white font-medium">
          {mode === 'recognize' ? 'Scanner produit' : 'Enregistrer image'}
        </span>
        <button onClick={toggleCamera} className="text-white p-2">
          <RotateCcw size={24} />
        </button>
      </div>

      {/* Camera preview */}
      <div className="flex-1 relative">
        {capturedImage ? (
          <img
            src={URL.createObjectURL(capturedImage)}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Guide de cadrage */}
        {!capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg" />
          </div>
        )}

        {/* Loading overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 size={48} className="text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50 flex justify-center gap-4">
        {capturedImage ? (
          <>
            <button
              onClick={retake}
              className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
            >
              <RotateCcw size={24} className="text-white" />
            </button>
            <button
              onClick={() => processImage(capturedImage)}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center"
            >
              <Check size={24} className="text-white" />
            </button>
          </>
        ) : (
          <button
            onClick={captureImage}
            disabled={isProcessing}
            className="w-20 h-20 rounded-full bg-white border-4 border-white/50"
          />
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="absolute bottom-24 left-4 text-white/60 text-xs">
          {stats.totalEmbeddings} produits enregistrés
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute bottom-24 right-4 bg-destructive text-white px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
```

---

## 7. Configuration environnement

```typescript
// Ajouter à src/config/env.ts

export const ENV = {
  // ... existant ...
  
  // Replicate API (CLIP)
  REPLICATE_API_KEY: process.env.NEXT_PUBLIC_REPLICATE_API_KEY || '',
  
  // Feature flags
  VISUAL_RECOGNITION_ENABLED: process.env.NEXT_PUBLIC_VISUAL_ENABLED === 'true',
  
  // Configuration
  CLIP_PROVIDER: (process.env.NEXT_PUBLIC_CLIP_PROVIDER || 'replicate') as 'openai' | 'replicate',
};
```

---

## 8. Checklist d'implémentation

### Prérequis
- [ ] Clé API Replicate configurée (`REPLICATE_API_KEY`)
- [ ] IndexedDB schema étendu avec `product_embeddings`
- [ ] Permissions caméra configurées

### Implémentation
- [ ] `ImageProcessor.ts` - Prétraitement images
- [ ] `ClipClient.ts` - Client API CLIP
- [ ] `EmbeddingStore.ts` - Stockage IndexedDB
- [ ] `SimilarityEngine.ts` - Calcul similarités
- [ ] `VisualRecognitionService.ts` - Service principal
- [ ] `useVisualRecognition.ts` - Hook React
- [ ] `ProductCamera.tsx` - Composant UI

### Tests
- [ ] Tests unitaires ImageProcessor
- [ ] Tests unitaires SimilarityEngine
- [ ] Tests intégration reconnaissance
- [ ] Tests E2E enrôlement + reconnaissance

### Intégration
- [ ] Bouton photo sur fiche produit (enrôlement)
- [ ] Bouton photo sur écran recherche
- [ ] Intégration avec mode fallback

---

**Document suivant** : [03-SERVICE-BARCODE.md](./03-SERVICE-BARCODE.md)
