/**
 * Service d'Upload Logo SIMPLE pour FayClick V2
 * Solution Senior Developer : Upload direct PostgreSQL sans API Route
 * Compatible avec Next.js export statique
 */

import imageCompression from 'browser-image-compression';
import databaseService from './database.service';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

interface UploadProgress {
  status: 'compressing' | 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
}

class LogoUploadSimpleService {
  private static instance: LogoUploadSimpleService;

  private constructor() {}

  public static getInstance(): LogoUploadSimpleService {
    if (!LogoUploadSimpleService.instance) {
      LogoUploadSimpleService.instance = new LogoUploadSimpleService();
    }
    return LogoUploadSimpleService.instance;
  }

  /**
   * Upload UNIQUEMENT FTP (pour Register - sans sauvegarde BD)
   * Retourne juste l'URL du logo uploadé
   */
  async uploadLogoOnly(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      console.log('🖼️ [LOGO-REGISTER] Début upload (mode Register):', file.name);

      // 1. Validation rapide
      this.updateProgress(onProgress, 'compressing', 10, 'Validation...');
      const validation = this.quickValidate(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Fichier invalide');
      }

      // 2. Compression agressive
      this.updateProgress(onProgress, 'compressing', 30, 'Compression...');
      const compressedFile = await this.compressImage(file);
      console.log('✅ [LOGO-REGISTER] Taille après compression:', {
        original: `${Math.round(file.size / 1024)}KB`,
        compressed: `${Math.round(compressedFile.size / 1024)}KB`,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
      });

      // 3. Génération nom de fichier unique
      const filename = this.generateFilename(file.name);

      // 4. Upload FTP uniquement (pas de sauvegarde BD)
      this.updateProgress(onProgress, 'uploading', 60, 'Upload serveur...');
      const logoUrl = await this.uploadToFTP(compressedFile, filename);

      this.updateProgress(onProgress, 'success', 100, 'Upload terminé!');

      console.log('🎉 [LOGO-REGISTER] Upload FTP réussi, URL:', logoUrl);

      return {
        success: true,
        url: logoUrl,
        filename: filename
      };

    } catch (error) {
      console.error('❌ [LOGO-REGISTER] Erreur upload:', error);
      this.updateProgress(onProgress, 'error', 0, `Erreur: ${error instanceof Error ? error.message : 'Upload échoué'}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Upload principal avec sauvegarde BD (pour Settings - user connecté)
   */
  async uploadLogo(
    file: File,
    id_structure: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      console.log('🖼️ [LOGO-SIMPLE] Début upload:', file.name);

      // 1. Validation rapide
      this.updateProgress(onProgress, 'compressing', 10, 'Validation...');
      const validation = this.quickValidate(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Fichier invalide');
      }

      // 2. Compression agressive
      this.updateProgress(onProgress, 'compressing', 30, 'Compression...');
      const compressedFile = await this.compressImage(file);
      console.log('✅ [LOGO-SIMPLE] Taille après compression:', {
        original: `${Math.round(file.size / 1024)}KB`,
        compressed: `${Math.round(compressedFile.size / 1024)}KB`,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
      });

      // 3. Génération nom de fichier unique
      const filename = this.generateFilename(file.name);

      // 4. Upload FTP via endpoint PHP
      this.updateProgress(onProgress, 'uploading', 50, 'Upload serveur...');
      const logoUrl = await this.uploadToFTP(compressedFile, filename);

      // 5. Sauvegarde URL en base de données
      this.updateProgress(onProgress, 'uploading', 80, 'Sauvegarde...');
      await this.saveLogoToDatabase(id_structure, logoUrl);

      this.updateProgress(onProgress, 'success', 100, 'Upload terminé!');

      console.log('🎉 [LOGO-SIMPLE] Upload réussi pour structure:', id_structure);

      return {
        success: true,
        url: logoUrl,
        filename: filename
      };

    } catch (error) {
      console.error('❌ [LOGO-SIMPLE] Erreur upload:', error);
      this.updateProgress(onProgress, 'error', 0, `Erreur: ${error instanceof Error ? error.message : 'Upload échoué'}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Validation rapide
   */
  private quickValidate(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Format non supporté (JPG, PNG, GIF, WEBP)' };
    }

    // Max 5MB avant compression
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: 'Fichier trop volumineux (max 5MB)' };
    }

    return { isValid: true };
  }

  /**
   * Compression agressive pour minimiser la taille en BD
   */
  private async compressImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 0.2, // 200KB max - très agressif
      maxWidthOrHeight: 800, // Max 800px
      useWebWorker: true,
      quality: 0.8,
      fileType: 'image/jpeg' as const // Forcer JPEG pour meilleure compression
    };

    try {
      const compressed = await imageCompression(file, options);

      // Si encore trop gros, compression ultra-agressive
      if (compressed.size > 250 * 1024) {
        const ultraOptions = {
          maxSizeMB: 0.15,
          maxWidthOrHeight: 600,
          useWebWorker: true,
          quality: 0.6,
          fileType: 'image/jpeg' as const
        };
        return await imageCompression(file, ultraOptions);
      }

      return compressed;
    } catch (error) {
      console.error('❌ [LOGO-SIMPLE] Erreur compression:', error);
      throw new Error('Impossible de compresser l\'image');
    }
  }

  /**
   * Génération nom de fichier unique et sécurisé
   */
  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 10);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'png';

    // Nettoyage et sécurisation du nom
    const cleanExtension = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension) ? extension : 'jpg';

    return `logo-${timestamp}-${randomHash}.${cleanExtension}`;
  }

  /**
   * Upload vers serveur FTP
   * - DEV (localhost): API Route Next.js locale
   * - PROD (export): API Backend (api.icelabsoft.com/api/upload_logo)
   */
  private async uploadToFTP(file: File, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);

      // Détection environnement
      const isLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      // En dev : API Route Next.js locale
      // En prod : API Backend (TODO: créer endpoint)
      const uploadUrl = isLocalhost
        ? '/api/upload-logo'  // Next.js API Route (dev uniquement)
        : 'https://api.icelabsoft.com/api/upload_logo'; // API Backend (prod)

      console.log('📤 [LOGO-SIMPLE] Upload vers:', isLocalhost ? 'API Route locale' : 'API Backend', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      // Lire la réponse JSON même en cas d'erreur pour voir le message
      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('❌ [LOGO-SIMPLE] Réponse non-JSON:', await response.text());
        throw new Error(`Erreur serveur ${response.status}: Réponse invalide`);
      }

      if (!response.ok || !result.success) {
        const errorMsg = result.details || result.error || `Erreur serveur ${response.status}`;
        console.error('❌ [LOGO-SIMPLE] Erreur API Route:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!result.url) {
        throw new Error('URL manquante dans la réponse');
      }

      console.log('✅ [LOGO-SIMPLE] Upload FTP réussi:', result.url);

      return result.url;
    } catch (error) {
      console.error('❌ [LOGO-SIMPLE] Erreur upload FTP:', error);
      throw error; // Propager l'erreur originale avec le message détaillé
    }
  }

  /**
   * Sauvegarde URL en base de données PostgreSQL
   * Utilise la fonction save_my_logo(pid_structure, purl)
   */
  private async saveLogoToDatabase(id_structure: number, logoUrl: string): Promise<void> {
    try {
      const sql = `SELECT save_my_logo(${id_structure}, '${logoUrl}')`;

      console.log('💾 [LOGO-SIMPLE] Appel fonction PostgreSQL:', sql);
      const result = await databaseService.query(sql);

      console.log('✅ [LOGO-SIMPLE] Réponse PostgreSQL:', result);

      // Vérifier le résultat de la fonction
      if (result && result.length > 0) {
        const functionResult = result[0].save_my_logo;
        console.log('📊 [LOGO-SIMPLE] save_my_logo returned:', functionResult);

        // La fonction retourne un JSON string, on le parse
        if (typeof functionResult === 'string') {
          const parsed = JSON.parse(functionResult);
          if (!parsed.success) {
            throw new Error(parsed.message || 'Erreur lors de la sauvegarde');
          }
        }
      }

      console.log('✅ [LOGO-SIMPLE] URL sauvegardée en BD pour structure:', id_structure);
    } catch (error) {
      console.error('❌ [LOGO-SIMPLE] Erreur sauvegarde BD:', error);
      throw new Error('Impossible de sauvegarder le logo');
    }
  }

  /**
   * Récupérer le logo depuis la BD
   */
  async getLogoFromDatabase(id_structure: number): Promise<string | null> {
    try {
      const sql = `
        SELECT logo_structure
        FROM list_structures
        WHERE id_structure = ${id_structure}
      `;

      const result = await databaseService.query('APPFAYCLICK', sql);

      if (result && result.length > 0 && result[0].logo_structure) {
        return result[0].logo_structure;
      }

      return null;
    } catch (error) {
      console.error('❌ [LOGO-SIMPLE] Erreur récupération logo:', error);
      return null;
    }
  }

  /**
   * Convertir File en data URL pour preview
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
   * Validation rapide (pour le composant)
   */
  quickValidateFile(file: File): { isValid: boolean; error?: string } {
    return this.quickValidate(file);
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
}

// Export singleton
export const logoUploadSimpleService = LogoUploadSimpleService.getInstance();
export default logoUploadSimpleService;
