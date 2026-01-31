/**
 * Utilitaire d'encodage/décodage sécurisé pour les URLs FayClick
 * Encode {id_structure}-{id} en Base64 URL-safe
 * Utilisé pour les factures publiques et les produits Online Seller
 */

// Clé secrète pour le salt (en production, utiliser une vraie variable d'environnement)
const SECRET_SALT = 'FayClick2024_SecureEncode_v2';

/**
 * Encode les paramètres de facture en une chaîne sécurisée
 * 
 * @param id_structure - ID de la structure
 * @param id_facture - ID de la facture
 * @returns Chaîne encodée (ex: "aB3xZ9mN4p2Q")
 */
export function encodeFactureParams(id_structure: number, id_facture: number): string {
  try {
    // Validation des entrées
    if (!id_structure || !id_facture || isNaN(id_structure) || isNaN(id_facture)) {
      throw new Error('Paramètres invalides pour l\'encodage');
    }

    // Créer la chaîne de base : "structure-facture" (simple, sans timestamp)
    const dataToEncode = `${id_structure}-${id_facture}`;
    
    // Encoder en Base64
    let encoded = '';
    if (typeof window !== 'undefined') {
      // Côté client
      encoded = btoa(dataToEncode);
    } else {
      // Côté serveur (Node.js)
      encoded = Buffer.from(dataToEncode).toString('base64');
    }
    
    // Nettoyer et transformer pour URL-safe
    // Utiliser des caractères qui ne peuvent pas apparaître dans Base64 standard
    const urlSafe = encoded
      .replace(/\+/g, '-')     // Remplacer + par - (standard URL-safe Base64)
      .replace(/\//g, '_')     // Remplacer / par _ (standard URL-safe Base64)
      .replace(/=/g, '');      // Supprimer les = (padding)
    
    console.log('🔐 Encodage facture:', { 
      original: dataToEncode, 
      encoded: urlSafe 
    });
    
    return urlSafe;
    
  } catch (error) {
    console.error('❌ Erreur encodage facture:', error);
    throw new Error('Impossible d\'encoder les paramètres de facture');
  }
}

/**
 * Décode une chaîne pour récupérer les paramètres de facture
 * 
 * @param encoded - Chaîne encodée (ex: "aB3xZ9mN4p2Q")  
 * @returns {id_structure: number, id_facture: number} ou null si erreur
 */
export function decodeFactureParams(encoded: string): { id_structure: number; id_facture: number } | null {
  try {
    // Validation de l'entrée
    if (!encoded || typeof encoded !== 'string' || encoded.length < 8) {
      console.warn('⚠️ Chaîne d\'encodage invalide:', encoded);
      return null;
    }
    
    // Restaurer le format Base64 original depuis URL-safe
    let restored = encoded
      .replace(/-/g, '+')    // Restaurer + depuis -
      .replace(/_/g, '/');   // Restaurer / depuis _
    
    // Ajouter le padding Base64 correct
    const padding = (4 - (restored.length % 4)) % 4;
    restored = restored + '='.repeat(padding);
    
    // Décoder depuis Base64
    let decoded = '';
    if (typeof window !== 'undefined') {
      // Côté client
      try {
        decoded = atob(restored);
      } catch (e) {
        console.warn('⚠️ Erreur décodage Base64 côté client:', e);
        return null;
      }
    } else {
      // Côté serveur (Node.js)
      try {
        decoded = Buffer.from(restored, 'base64').toString('utf-8');
      } catch (e) {
        console.warn('⚠️ Erreur décodage Base64 côté serveur:', e);
        return null;
      }
    }
    
    // Parser le format "structure-facture" ou "structure:facture" (legacy)
    let parts = decoded.split('-');
    if (parts.length !== 2) {
      // Essayer avec le format legacy utilisant ":"
      parts = decoded.split(':');
      if (parts.length !== 2) {
        console.warn('⚠️ Format décodé invalide:', decoded);
        return null;
      }
      console.log('📅 Format legacy détecté (avec :):', decoded);
    }
    
    // Valider et convertir les IDs
    const id_structure = parseInt(parts[0]);
    const id_facture = parseInt(parts[1]);
    
    // Validation finale
    if (isNaN(id_structure) || isNaN(id_facture) || id_structure <= 0 || id_facture <= 0) {
      console.warn('⚠️ IDs invalides:', { id_structure, id_facture });
      return null;
    }
    
    console.log('🔓 Décodage facture réussi:', { 
      encoded, 
      id_structure, 
      id_facture
    });
    
    return { id_structure, id_facture };
    
  } catch (error) {
    console.error('❌ Erreur décodage facture:', error);
    return null;
  }
}

/**
 * Valide qu'une chaîne encodée a un format acceptable
 * 
 * @param encoded - Chaîne à valider
 * @returns true si le format semble correct
 */
export function isValidEncodedToken(encoded: string): boolean {
  if (!encoded || typeof encoded !== 'string') {
    return false;
  }
  
  // Vérifier la longueur (entre 8 et 20 caractères)
  if (encoded.length < 8 || encoded.length > 20) {
    return false;
  }
  
  // Vérifier que ce sont des caractères alphanumériques + x,z
  const validPattern = /^[A-Za-z0-9xz]+$/;
  return validPattern.test(encoded);
}

/**
 * Génère un token d'exemple pour les tests
 */
export function generateTestToken(): { token: string; id_structure: number; id_facture: number } {
  const id_structure = Math.floor(Math.random() * 999) + 1; // 1-999
  const id_facture = Math.floor(Math.random() * 9999) + 1;  // 1-9999

  const token = encodeFactureParams(id_structure, id_facture);

  return { token, id_structure, id_facture };
}

// ============================================================
// ONLINE SELLER - Encodage/décodage produit
// ============================================================

/**
 * Encode les paramètres d'un produit en token Base64 URL-safe
 * Format interne : "{id_structure}-{id_produit}" encodé en Base64
 *
 * @param id_structure - ID de la structure (marchand)
 * @param id_produit - ID du produit
 * @returns Token URL-safe (ex: "MTgzLTQy")
 */
export function encodeProduitParams(id_structure: number, id_produit: number): string {
  try {
    if (!id_structure || !id_produit || isNaN(id_structure) || isNaN(id_produit)) {
      throw new Error('Paramètres invalides pour l\'encodage produit');
    }

    const dataToEncode = `${id_structure}-${id_produit}`;

    let encoded = '';
    if (typeof window !== 'undefined') {
      encoded = btoa(dataToEncode);
    } else {
      encoded = Buffer.from(dataToEncode).toString('base64');
    }

    const urlSafe = encoded
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    console.log('🔐 Encodage produit:', { original: dataToEncode, encoded: urlSafe });

    return urlSafe;

  } catch (error) {
    console.error('❌ Erreur encodage produit:', error);
    throw new Error('Impossible d\'encoder les paramètres du produit');
  }
}

/**
 * Décode un token pour récupérer id_structure et id_produit
 *
 * @param encoded - Token URL-safe (ex: "MTgzLTQy")
 * @returns { id_structure, id_produit } ou null si invalide
 */
export function decodeProduitParams(encoded: string): { id_structure: number; id_produit: number } | null {
  try {
    if (!encoded || typeof encoded !== 'string' || encoded.length < 4) {
      console.warn('⚠️ Token produit invalide:', encoded);
      return null;
    }

    let restored = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padding = (4 - (restored.length % 4)) % 4;
    restored = restored + '='.repeat(padding);

    let decoded = '';
    if (typeof window !== 'undefined') {
      try {
        decoded = atob(restored);
      } catch {
        console.warn('⚠️ Erreur décodage Base64 produit côté client');
        return null;
      }
    } else {
      try {
        decoded = Buffer.from(restored, 'base64').toString('utf-8');
      } catch {
        console.warn('⚠️ Erreur décodage Base64 produit côté serveur');
        return null;
      }
    }

    const parts = decoded.split('-');
    if (parts.length !== 2) {
      console.warn('⚠️ Format token produit invalide:', decoded);
      return null;
    }

    const id_structure = parseInt(parts[0]);
    const id_produit = parseInt(parts[1]);

    if (isNaN(id_structure) || isNaN(id_produit) || id_structure <= 0 || id_produit <= 0) {
      console.warn('⚠️ IDs produit invalides:', { id_structure, id_produit });
      return null;
    }

    console.log('🔓 Décodage produit réussi:', { encoded, id_structure, id_produit });

    return { id_structure, id_produit };

  } catch (error) {
    console.error('❌ Erreur décodage produit:', error);
    return null;
  }
}