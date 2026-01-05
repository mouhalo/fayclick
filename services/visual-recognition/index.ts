/**
 * Visual Recognition Module
 * Exports pour le système de reconnaissance visuelle CLIP
 * FayClick V2 - Commerce
 */

// Services
export { ImageProcessor, imageProcessor } from './image-processor';
export type { ProcessedImage, ProcessingOptions } from './image-processor';

export { ClipClient, clipClient } from './clip-client';
export type { ClipEmbeddingResponse } from './clip-client';

export { EmbeddingStore, createEmbeddingStore } from './embedding-store';
export type { ProductEmbedding } from './embedding-store';

export { SimilarityEngine } from './similarity-engine';
export type { VisualMatch, MatchResult } from './similarity-engine';

export {
  VisualRecognitionService,
  getVisualRecognitionService
} from './visual-recognition.service';
export type {
  VisualState,
  VisualRecognitionResult,
  EnrollmentResult,
  VisualRecognitionStats
} from './visual-recognition.service';

// Claude Vision OCR
export { ClaudeVisionService, claudeVisionService } from './claude-vision.service';
