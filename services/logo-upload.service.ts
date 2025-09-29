/**
 * Service d'Upload de Logo Expert pour FayClick V2
 * Implémentation senior avec compression, validation et upload FTP
 */

import imageCompression from 'browser-image-compression';
import {
  UploadResult,
  UploadProgress,
  FileValidationResult,
  UploadError,
  UPLOAD_CONSTANTS,
  FTP_CONSTANTS,
  CompressionOptions,
  ILogoUploadService
} from '@/types/upload.types';
import { getApiBaseUrl } from '@/lib/api-config';

class LogoUploadService implements ILogoUploadService {
  private static instance: LogoUploadService;

  // Configuration FTP (credentials depuis env ou constants)
  private readonly ftpConfig = {
    host: process.env.NEXT_PUBLIC_FTP_HOST || "node260-eu.n0c.com",
    user: process.env.NEXT_PUBLIC_FTP_USER || "upload@fayclick.net",
    password: process.env.NEXT_PUBLIC_FTP_PASSWORD || "Y@L@tif129*",
    secure: true,
    timeout: 30000
  };

  private constructor() {}

  // Singleton pattern
  public static getInstance(): LogoUploadService {
    if (!LogoUploadService.instance) {
      LogoUploadService.instance = new LogoUploadService();
    }
    return LogoUploadService.instance;
  }

  /**
   * Upload principal avec gestion complète
   */
  async uploadLogo(file: File, onProgress?: (progress: UploadProgress) => void): Promise<UploadResult> {
    try {
      console.log('🖼️ [LOGO-UPLOAD] Début upload:', file.name);

      // 1. Validation
      this.updateProgress(onProgress, 'compressing', 10, 'Validation du fichier...');
      const validation = await this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Fichier invalide');
      }

      // 2. Compression
      this.updateProgress(onProgress, 'compressing', 30, 'Compression de l\'image...');
      const compressedFile = await this.compressImage(file);
      console.log('✅ [LOGO-UPLOAD] Compression:', {
        originalSize: file.size,
        compressedSize: compressedFile.size,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
      });

      // 3. Génération nom de fichier unique
      const filename = this.generateFilename(file.name);
      
      // 4. Upload FTP réel via l'API route
      this.updateProgress(onProgress, 'uploading', 60, 'Upload vers le serveur...');
      const finalUrl = await this.uploadToServer(compressedFile, filename, onProgress);
      
      this.updateProgress(onProgress, 'success', 100, 'Upload terminé avec succès!');
      
      console.log('🎉 [LOGO-UPLOAD] Upload réussi:', finalUrl);
      
      return {
        success: true,
        url: finalUrl,
        filename: filename
      };

    } catch (error) {
      console.error('❌ [LOGO-UPLOAD] Erreur upload:', error);
      this.updateProgress(onProgress, 'error', 0, `Erreur: ${error instanceof Error ? error.message : 'Upload échoué'}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Validation experte du fichier
   */
  async validateFile(file: File): Promise<FileValidationResult> {
    const errors: string[] = [];

    // Validation type MIME
    if (!UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(`Format non supporté. Utilisez: ${UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validation taille (avant compression)
    const maxSizeBeforeCompression = UPLOAD_CONSTANTS.MAX_FILE_SIZE * 5; // 2.5MB max avant compression
    if (file.size > maxSizeBeforeCompression) {
      errors.push(`Fichier trop volumineux (${Math.round(file.size / 1024 / 1024 * 100) / 100}MB). Maximum autorisé: ${Math.round(maxSizeBeforeCompression / 1024 / 1024)}MB`);
    }

    // Validation nom de fichier
    if (file.name.length > 100) {
      errors.push('Nom de fichier trop long');
    }

    // Validation dimensions (si possible)
    try {
      const dimensions = await this.getImageDimensions(file);
      if (dimensions.width < 100 || dimensions.height < 100) {
        errors.push('Image trop petite (minimum 100x100px)');
      }
      if (dimensions.width > 4000 || dimensions.height > 4000) {
        errors.push('Image trop grande (maximum 4000x4000px)');
      }
    } catch (error) {
      console.warn('⚠️ [LOGO-UPLOAD] Impossible de lire les dimensions:', error);
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join('. ') : undefined,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };
  }

  /**
   * Compression d'image avec options optimisées
   */
  async compressImage(file: File): Promise<File> {
    const options: CompressionOptions = {
      maxSizeMB: UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024), // Convertir en MB
      maxWidthOrHeight: Math.max(UPLOAD_CONSTANTS.MAX_DIMENSIONS.width, UPLOAD_CONSTANTS.MAX_DIMENSIONS.height),
      useWebWorker: true,
      quality: UPLOAD_CONSTANTS.IMAGE_QUALITY
    };

    try {
      const compressedFile = await imageCompression(file, options);
      
      // Si la compression n'est pas assez efficace, on réessaie avec une qualité réduite
      if (compressedFile.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
        const aggressiveOptions = { ...options, quality: 0.6, maxSizeMB: 0.3 };
        return await imageCompression(file, aggressiveOptions);
      }
      
      return compressedFile;
    } catch (error) {
      console.error('❌ [LOGO-UPLOAD] Erreur compression:', error);
      throw new Error('Impossible de compresser l\'image');
    }
  }

  /**
   * Génération nom de fichier unique et sécurisé
   */
  generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 10);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'png';
    
    // Nettoyage et sécurisation du nom
    const cleanExtension = ['png', 'jpg', 'jpeg', 'gif'].includes(extension) ? extension : 'png';
    
    return `logo-${timestamp}-${randomHash}.${cleanExtension}`;
  }

  /**
   * Upload réel vers le serveur via l'API backend
   */
  private async uploadToServer(
    file: File,
    filename: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Préparation du FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);

      this.updateProgress(onProgress, 'uploading', 70, 'Envoi vers le serveur...');

      // Déterminer quelle route utiliser selon l'environnement
      const apiUrl = getApiBaseUrl();
      let uploadUrl: string;

      // En production, utiliser directement l'API backend
      // En dev, utiliser la route proxy Next.js qui gère mieux CORS
      if (typeof window !== 'undefined' && window.location.hostname === 'v2.fayclick.net') {
        // Production : API backend directe
        uploadUrl = `${apiUrl}/upload/logo`;
      } else {
        // Développement : Route proxy Next.js
        uploadUrl = '/api/upload-logo';
      }

      console.log('📤 [LOGO-UPLOAD] Upload vers:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        // Pas de Content-Type, le browser le définit automatiquement avec boundary
      });

      this.updateProgress(onProgress, 'uploading', 90, 'Finalisation...');

      // Gestion améliorée des erreurs - vérifier le content-type
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        let errorMessage = `Erreur HTTP: ${response.status}`;

        // Essayer de parser la réponse selon le type
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          } catch (parseError) {
            console.error('❌ [LOGO-UPLOAD] Erreur parsing JSON:', parseError);
          }
        } else if (contentType && contentType.includes('text/html')) {
          // Si on reçoit du HTML (page d'erreur), on ne le parse pas
          errorMessage = `Erreur serveur ${response.status}. L'upload n'est pas disponible pour le moment.`;
        } else {
          // Essayer de lire comme texte
          try {
            const textError = await response.text();
            if (textError && textError.length < 200) {
              errorMessage = textError;
            }
          } catch (textError) {
            console.error('❌ [LOGO-UPLOAD] Erreur lecture texte:', textError);
          }
        }

        throw new Error(errorMessage);
      }

      // Parser la réponse JSON
      let result;
      try {
        // Vérifier que c'est bien du JSON
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Réponse non-JSON reçue du serveur');
        }
        result = await response.json();
      } catch (parseError) {
        console.error('❌ [LOGO-UPLOAD] Erreur parsing réponse:', parseError);
        throw new Error('Réponse invalide du serveur');
      }

      if (!result.success || !result.url) {
        throw new Error(result.error || result.message || 'Upload échoué');
      }

      this.updateProgress(onProgress, 'uploading', 100, 'Upload terminé!');

      console.log('✅ [LOGO-UPLOAD] Upload réussi:', {
        url: result.url,
        filename: result.filename || filename,
        size: result.size || file.size
      });

      return result.url;

    } catch (error) {
      console.error('❌ [LOGO-UPLOAD] Erreur upload serveur:', error);

      // Message d'erreur plus convivial
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Connexion au serveur impossible. Vérifiez votre connexion internet.');
        }
        throw error;
      }

      throw new Error('Erreur inattendue lors de l\'upload');
    }
  }

  /**
   * Obtenir les dimensions d'une image
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Impossible de charger l\'image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Helper pour mettre à jour le progress
   */
  private updateProgress(
    onProgress: ((progress: UploadProgress) => void) | undefined,
    status: UploadProgress['status'],
    progress: number,
    message: string
  ) {
    if (onProgress) {
      onProgress({ status, progress, message });
    }
  }

  /**
   * Convertir un fichier en data URL pour preview
   */
  async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validation rapide côté client (sans async)
   */
  quickValidateFile(file: File): { isValid: boolean; error?: string } {
    if (!UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Format de fichier non supporté' };
    }
    
    if (file.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE * 10) { // 5MB max avant compression
      return { isValid: false, error: 'Fichier trop volumineux' };
    }
    
    return { isValid: true };
  }
}

// Export singleton
export const logoUploadService = LogoUploadService.getInstance();
export default logoUploadService;