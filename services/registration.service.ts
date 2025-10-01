/**
 * Service d'inscription marchand pour FayClick V2
 * Intégration avec la fonction PostgreSQL add_edit_inscription
 */

import DatabaseService from './database.service';
import SecurityService from './security.service';
import { RegistrationData, RegistrationResponse, StructureType, RegistrationResult } from '@/types/registration';
import { ApiException } from './auth.service';

export class RegistrationService {
  private static instance: RegistrationService;
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): RegistrationService {
    if (!RegistrationService.instance) {
      RegistrationService.instance = new RegistrationService();
    }
    return RegistrationService.instance;
  }

  /**
   * Récupère la liste des types de structure disponibles
   * SELECT id_type, nom_type FROM type_structure WHERE id_type != 0
   */
  async getStructureTypes(): Promise<StructureType[]> {
    try {
      console.log('📋 [REGISTRATION] Récupération types de structure');

      const results = await DatabaseService.query(
        'SELECT id_type, nom_type FROM type_structure WHERE id_type != 0 ORDER BY nom_type'
      );

      if (!results || results.length === 0) {
        throw new ApiException('Aucun type de structure trouvé', 404);
      }

      const structureTypes: StructureType[] = results.map((item: any) => ({
        id_type: item.id_type,
        nom_type: item.nom_type
      }));

      console.log(`✅ [REGISTRATION] ${structureTypes.length} types de structure récupérés`);
      return structureTypes;

    } catch (error) {
      console.error('❌ [REGISTRATION] Erreur récupération types structure:', error);
      throw error instanceof ApiException ? error :
        new ApiException('Impossible de récupérer les types de structure', 500);
    }
  }

  /**
   * Vérifie si un nom de structure existe déjà dans la base de données
   * @param nom_structure - Nom de la structure à vérifier
   * @returns true si le nom existe déjà, false sinon
   */
  async checkStructureNameExists(nom_structure: string): Promise<boolean> {
    try {
      // Échapper les quotes et mettre en majuscules (comme lors de l'insertion)
      const escapedName = nom_structure.toUpperCase().trim().replace(/'/g, "''");

      const query = `SELECT 1 FROM structures WHERE UPPER(nom_structure) = '${escapedName}' LIMIT 1;`;

      console.log('🔍 [REGISTRATION] Vérification nom structure:', nom_structure);

      const result = await DatabaseService.query(query);

      // Si on a un résultat, le nom existe déjà
      const exists = Array.isArray(result) && result.length > 0;

      console.log(exists ? '⚠️ [REGISTRATION] Nom de structure déjà pris' : '✅ [REGISTRATION] Nom de structure disponible');

      return exists;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur vérification nom structure', error);
      // En cas d'erreur, on considère que le nom n'est pas pris
      // pour ne pas bloquer l'utilisateur
      return false;
    }
  }

  /**
   * Valide les données d'inscription avant soumission
   */
  private validateRegistrationData(data: RegistrationData): void {
    const errors: string[] = [];

    // Validation type de structure
    if (!data.p_id_type || data.p_id_type <= 0) {
      errors.push('Type de structure requis');
    }

    // Validation nom structure (obligatoire, min 5 caractères)
    if (!data.p_nom_structure || data.p_nom_structure.trim().length < 5) {
      errors.push('Nom de structure requis (minimum 5 caractères)');
    }

    // Validation adresse (obligatoire, max 255 caractères)
    if (!data.p_adresse || data.p_adresse.trim().length === 0) {
      errors.push('Adresse requise');
    } else if (data.p_adresse.length > 255) {
      errors.push('Adresse trop longue (maximum 255 caractères)');
    }

    // Validation téléphone Orange Money (obligatoire, 9 chiffres)
    if (!data.p_mobile_om || !/^[0-9]{9}$/.test(data.p_mobile_om)) {
      errors.push('Téléphone Orange Money requis (9 chiffres)');
    }

    if (errors.length > 0) {
      throw new ApiException(`Erreurs de validation: ${errors.join(', ')}`, 400);
    }
  }

  /**
   * Formate les données avant soumission
   */
  private formatRegistrationData(data: RegistrationData): RegistrationData {
    return {
      ...data,
      // Nom structure en majuscules
      p_nom_structure: data.p_nom_structure.toUpperCase().trim(),
      // Adresse nettoyée
      p_adresse: data.p_adresse.trim(),
      // Téléphone nettoyé (uniquement les chiffres)
      p_mobile_om: data.p_mobile_om.replace(/\D/g, ''),
      // Autres champs optionnels avec valeurs par défaut
      p_mobile_wave: data.p_mobile_wave || '',
      p_numautorisatioon: data.p_numautorisatioon || '',
      p_nummarchand: data.p_nummarchand || '',
      p_email: data.p_email || '',
      p_logo: data.p_logo || '',
      p_nom_service: data.p_nom_service || 'SERVICES',
      p_id_structure: 0 // Toujours 0 pour une nouvelle inscription
    };
  }

  /**
   * Inscrit un nouveau marchand via la fonction add_edit_inscription
   */
  async registerMerchant(registrationData: RegistrationData): Promise<RegistrationResponse> {
    try {
      console.log('🎯 [REGISTRATION] Début inscription marchand:', {
        nom_structure: registrationData.p_nom_structure,
        id_type: registrationData.p_id_type
      });

      // 1. Validation des données
      this.validateRegistrationData(registrationData);

      // 2. Formatage des données
      const formattedData = this.formatRegistrationData(registrationData);

      // 3. Construction de la requête SQL pour add_edit_inscription
      const query = `SELECT add_edit_inscription(
        ${formattedData.p_id_type}::integer,
        '${formattedData.p_nom_structure}'::varchar,
        '${formattedData.p_adresse}'::varchar,
        '${formattedData.p_mobile_om}'::varchar,
        '${formattedData.p_mobile_wave}'::varchar,
        '${formattedData.p_numautorisatioon}'::varchar,
        '${formattedData.p_nummarchand}'::varchar,
        '${formattedData.p_email}'::varchar,
        '${formattedData.p_logo}'::varchar,
        '${formattedData.p_nom_service}'::varchar,
        ${formattedData.p_id_structure}::integer
      ) AS message;`;

      console.log('📤 [REGISTRATION] Exécution requête inscription');
      console.log('📋 [REGISTRATION] Requête SQL générée:', query);

      // 4. Exécution de la requête
      const results = await DatabaseService.query(query);

      if (!results || results.length === 0) {
        throw new ApiException('Aucune réponse de la fonction d\'inscription', 500);
      }

      // 5. Traitement de la réponse
      const result = results[0] as RegistrationResult;
      
      if (!result.message) {
        throw new ApiException('Réponse invalide de la fonction d\'inscription', 500);
      }

      console.log('✅ [REGISTRATION] Inscription réussie:', result.message);

      // 6. Extraction des informations de connexion du message
      const response: RegistrationResponse = {
        success: true,
        message: result.message,
        data: {
          nom_structure: formattedData.p_nom_structure,
          mobile_om: formattedData.p_mobile_om,
          adresse: formattedData.p_adresse
        }
      };

      // Log sécurisé
      SecurityService.secureLog('log', 'Inscription marchand réussie', {
        nom_structure: formattedData.p_nom_structure,
        id_type: formattedData.p_id_type,
        hasLogin: result.message.includes('login:'),
        messageLength: result.message.length
      });

      return response;

    } catch (error) {
      console.error('❌ [REGISTRATION] Erreur inscription marchand:', error);
      
      SecurityService.secureLog('error', 'Erreur inscription marchand', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        nom_structure: registrationData.p_nom_structure
      });

      if (error instanceof ApiException) {
        throw error;
      }

      // Gestion des erreurs spécifiques PostgreSQL
      if (error instanceof Error) {
        if (error.message.includes('n\'existe pas dans la table type_structure')) {
          throw new ApiException('Type de structure invalide', 400);
        }
        
        if (error.message.includes('n\'existe pas dans la table type_service')) {
          throw new ApiException('Type de service invalide', 400);
        }

        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          throw new ApiException('Une structure avec ces informations existe déjà', 409);
        }
      }

      throw new ApiException(
        error instanceof Error ? error.message : 'Erreur lors de l\'inscription',
        500
      );
    }
  }

  /**
   * Valide un téléphone Orange Money sénégalais
   */
  validateSenegalMobileOM(phone: string): boolean {
    // Format: 9 chiffres commençant par 77, 78, 70, 76, 75
    const cleanPhone = phone.replace(/\D/g, '');
    const validPrefixes = ['77', '78', '70', '76', '75'];
    
    if (cleanPhone.length !== 9) {
      return false;
    }

    const prefix = cleanPhone.substring(0, 2);
    return validPrefixes.includes(prefix);
  }

  /**
   * Formate un numéro de téléphone sénégalais pour affichage
   */
  formatSenegalPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 9) {
      return `+221 ${cleanPhone.substring(0, 2)} ${cleanPhone.substring(2, 5)} ${cleanPhone.substring(5, 7)} ${cleanPhone.substring(7)}`;
    }
    return phone;
  }

  /**
   * Extrait les informations de login depuis le message de réponse
   */
  extractLoginInfo(message: string): { login?: string; password?: string } {
    const loginMatch = message.match(/login:\s*([^\s]+)/);
    const passwordMatch = message.match(/mot de passe:\s*([^\s.]+)/);
    
    return {
      login: loginMatch ? loginMatch[1] : undefined,
      password: passwordMatch ? passwordMatch[1] : undefined
    };
  }

  /**
   * Convertit un fichier en base64 (préparation pour fonctionnalité future)
   */
  async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // TODO: Implémenter la conversion en base64
      console.log('Conversion fichier vers base64 - Fonctionnalité à implémenter', file.name);
      resolve(''); // Retourne vide pour le moment
    });
  }

  /**
   * Valide un fichier logo (préparation pour fonctionnalité future)
   */
  validateLogoFile(file: File): { isValid: boolean; error?: string } {
    // TODO: Implémenter la validation du fichier logo
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    
    if (file.size > maxSize) {
      return { isValid: false, error: 'Le fichier est trop volumineux (maximum 5MB)' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Format non supporté (JPG, PNG uniquement)' };
    }
    
    return { isValid: true };
  }
}

// Export instance unique
export const registrationService = RegistrationService.getInstance();
export default registrationService;