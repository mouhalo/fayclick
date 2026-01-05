/**
 * ClaudeVisionService
 * Service d'extraction OCR via Claude Vision API
 * Utilise l'API route locale pour éviter les problèmes CORS
 * FayClick V2 - Commerce
 */

interface ExtractionResult {
  success: boolean;
  nomProduit: string;
  confidence: 'high' | 'medium' | 'low';
  rawText?: string;
  error?: string;
}

// URL de l'API route locale
const OCR_API_URL = '/api/vision/ocr';

/**
 * Service d'extraction de nom de produit via Claude Vision
 * Appelle l'API route locale qui fait le proxy vers Anthropic
 */
export class ClaudeVisionService {
  constructor() {
    // Plus besoin de clé API côté client - gérée côté serveur
  }

  /**
   * Extrait le nom du produit depuis une image
   * @param imageBase64 Image en base64 (avec ou sans préfixe data:image/)
   * @param mimeType Type MIME de l'image (image/jpeg, image/png, etc.)
   */
  async extractProductName(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractionResult> {
    try {
      console.log('[ClaudeVision] Appel API route locale pour OCR...');

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64,
          mimeType
        })
      });

      const result: ExtractionResult = await response.json();

      if (!response.ok) {
        console.error('[ClaudeVision] Erreur API:', response.status, result);
        return {
          success: false,
          nomProduit: 'Produit non identifié',
          confidence: 'low',
          error: result.error || `Erreur API: ${response.status}`
        };
      }

      console.log('[ClaudeVision] OCR réussi:', result.nomProduit);
      return result;

    } catch (error) {
      console.error('[ClaudeVision] Erreur extraction:', error);
      return {
        success: false,
        nomProduit: 'Produit non identifié',
        confidence: 'low',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Extrait les noms de plusieurs produits en batch
   */
  async extractBatch(images: Array<{ base64: string; mimeType?: string }>): Promise<ExtractionResult[]> {
    // Traiter en parallèle (max 3 à la fois pour éviter rate limiting)
    const batchSize = 3;
    const results: ExtractionResult[] = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(img => this.extractProductName(img.base64, img.mimeType || 'image/jpeg'))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Vérifie que l'API est accessible
   * Note: Test simplifié car la vérification réelle se fait côté serveur
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test simple de l'API route locale
      const response = await fetch(OCR_API_URL, {
        method: 'OPTIONS'
      });
      return response.ok || response.status === 405; // 405 = méthode non autorisée mais route existe
    } catch {
      return false;
    }
  }
}

// Instance singleton
export const claudeVisionService = new ClaudeVisionService();

export default ClaudeVisionService;
