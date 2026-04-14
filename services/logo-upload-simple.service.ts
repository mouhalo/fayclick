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
   * Retourne juste l'URL du logo/photo uploadé
   * @param file - Fichier à uploader
   * @param onProgress - Callback de progression
   * @param uploadType - Type d'upload: 'logo' (défaut) ou 'photo'
   */
  async uploadLogoOnly(
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    uploadType: 'logo' | 'photo' = 'logo',
    structureName: string = 'fayclick'
  ): Promise<UploadResult> {
    try {
      const typeLabel = uploadType === 'photo' ? 'PHOTO-PRODUIT' : 'LOGO-REGISTER';
      console.log(`🖼️ [${typeLabel}] Début upload (mode sans BD):`, file.name);

      // 1. Validation rapide
      this.updateProgress(onProgress, 'compressing', 10, 'Validation...');
      const validation = this.quickValidate(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Fichier invalide');
      }

      // 2. Compression agressive
      this.updateProgress(onProgress, 'compressing', 30, 'Compression...');
      const compressedFile = await this.compressImage(file);
      console.log(`✅ [${typeLabel}] Taille après compression:`, {
        original: `${Math.round(file.size / 1024)}KB`,
        compressed: `${Math.round(compressedFile.size / 1024)}KB`,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
      });

      // 3. Génération nom de fichier unique avec préfixe approprié
      const filename = this.generateFilename(file.name, uploadType);

      // 4. Upload FTP uniquement (pas de sauvegarde BD)
      this.updateProgress(onProgress, 'uploading', 60, 'Upload serveur...');
      const fileUrl = await this.uploadToFTP(compressedFile, filename, structureName);

      this.updateProgress(onProgress, 'success', 100, 'Upload terminé!');

      console.log(`🎉 [${typeLabel}] Upload FTP réussi, URL:`, fileUrl);

      return {
        success: true,
        url: fileUrl,
        filename: filename
      };

    } catch (error) {
      const typeLabel = uploadType === 'photo' ? 'PHOTO-PRODUIT' : 'LOGO-REGISTER';
      console.error(`❌ [${typeLabel}] Erreur upload:`, error);
      this.updateProgress(onProgress, 'error', 0, `Erreur: ${error instanceof Error ? error.message : 'Upload échoué'}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Upload principal avec sauvegarde BD (pour Settings - user connecté)
   * NOTE: Pour les photos produits, utiliser uploadLogoOnly() car la sauvegarde
   * BD se fait via produitsService.addEditPhoto() dans le composant
   * @param file - Fichier à uploader
   * @param id_structure - ID de la structure
   * @param onProgress - Callback de progression
   * @param uploadType - Type d'upload: 'logo' (défaut) ou 'photo'
   */
  async uploadLogo(
    file: File,
    id_structure: number,
    onProgress?: (progress: UploadProgress) => void,
    uploadType: 'logo' | 'photo' = 'logo',
    structureName: string = 'fayclick'
  ): Promise<UploadResult> {
    try {
      const typeLabel = uploadType === 'photo' ? 'PHOTO-PRODUIT' : 'LOGO-SIMPLE';
      console.log(`🖼️ [${typeLabel}] Début upload:`, file.name);

      // 1. Validation rapide
      this.updateProgress(onProgress, 'compressing', 10, 'Validation...');
      const validation = this.quickValidate(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Fichier invalide');
      }

      // 2. Compression agressive
      this.updateProgress(onProgress, 'compressing', 30, 'Compression...');
      const compressedFile = await this.compressImage(file);
      console.log(`✅ [${typeLabel}] Taille après compression:`, {
        original: `${Math.round(file.size / 1024)}KB`,
        compressed: `${Math.round(compressedFile.size / 1024)}KB`,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
      });

      // 3. Génération nom de fichier unique avec préfixe approprié
      const filename = this.generateFilename(file.name, uploadType);

      // 4. Upload FTP via endpoint PHP
      this.updateProgress(onProgress, 'uploading', 50, 'Upload serveur...');
      const fileUrl = await this.uploadToFTP(compressedFile, filename, structureName);

      // 5. Sauvegarde URL en base de données (uniquement pour les logos)
      // Pour les photos produits, la sauvegarde se fait via produitsService.addEditPhoto()
      if (uploadType === 'logo') {
        this.updateProgress(onProgress, 'uploading', 80, 'Sauvegarde...');
        await this.saveLogoToDatabase(id_structure, fileUrl);
      }

      this.updateProgress(onProgress, 'success', 100, 'Upload terminé!');

      console.log(`🎉 [${typeLabel}] Upload réussi pour structure:`, id_structure);

      return {
        success: true,
        url: fileUrl,
        filename: filename
      };

    } catch (error) {
      const typeLabel = uploadType === 'photo' ? 'PHOTO-PRODUIT' : 'LOGO-SIMPLE';
      console.error(`❌ [${typeLabel}] Erreur upload:`, error);
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
   * @param originalName - Nom original du fichier
   * @param uploadType - Type d'upload: 'logo' ou 'photo'
   */
  private generateFilename(originalName: string, uploadType: 'logo' | 'photo' = 'logo'): string {
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 10);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'png';

    // Nettoyage et sécurisation du nom
    const cleanExtension = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension) ? extension : 'jpg';

    // Préfixe selon le type d'upload
    const prefix = uploadType === 'photo' ? 'produit' : 'logo';

    return `${prefix}-${timestamp}-${randomHash}.${cleanExtension}`;
  }

  /**
   * Upload vers backend dédié api.icelabsoft.com
   * Endpoint: POST https://api.icelabsoft.com/pay_services/api/upload_logo
   * Multipart/form-data: logo (File) + structure_name (string)
   * Réponse: { success, url, filename, size } ou { success:false, code, error }
   */
  private async uploadToFTP(file: File, _filename: string, structureName: string): Promise<string> {
    const uploadUrl = 'https://api.icelabsoft.com/pay_services/api/upload_logo';

    console.log('📤 [LOGO-UPLOAD] Upload vers backend dédié:', uploadUrl, `(${Math.round(file.size / 1024)} KB)`);

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('structure_name', structureName || 'fayclick');

    let response: Response;
    try {
      response = await fetch(uploadUrl, { method: 'POST', body: formData });
    } catch (err) {
      console.error('❌ [LOGO-UPLOAD] Erreur réseau:', err);
      throw new Error('Impossible de joindre le serveur d\'upload. Vérifiez votre connexion.');
    }

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('❌ [LOGO-UPLOAD] Réponse non-JSON:', response.status, responseText.slice(0, 200));
      throw new Error(`Erreur serveur ${response.status}. Veuillez réessayer.`);
    }

    if (!result.success || !result.url) {
      const code = result.code || 'UNKNOWN';
      const msg = result.error || 'Erreur upload';
      console.error('❌ [LOGO-UPLOAD] Échec upload:', code, msg);
      throw new Error(`${msg}`);
    }

    console.log('✅ [LOGO-UPLOAD] Upload réussi:', result.url, `(${result.size} bytes)`);
    return result.url;
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
