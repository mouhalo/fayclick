/**
 * Configuration des URLs pour FayClick V2
 * Gestion centralisée des liens de factures, paiements et partage
 */

/**
 * Obtient l'URL de base de l'application selon l'environnement
 * Utilise la variable d'environnement NEXT_PUBLIC_APP_BASE_URL ou fallback
 */
export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://v2.fayclick.net';
}

/**
 * Génère l'URL publique d'une facture avec encodage sécurisé
 * Format: https://v2.fayclick.net/fay_{token_crypté}
 * Exemple: https://v2.fayclick.net/fay_xdmfdld5626dfdf
 * 
 * @param id_structure - ID de la structure (commerce, école, etc.)
 * @param id_facture - ID de la facture générée
 * @returns URL publique de la facture avec token crypté
 */
export function getFactureUrl(id_structure: number, id_facture: number): string {
  // Import dynamique pour éviter les erreurs côté serveur
  const { encodeFactureParams } = require('./url-encoder');
  
  const baseUrl = getAppBaseUrl();
  const encodedToken = encodeFactureParams(id_structure, id_facture);
  
  return `${baseUrl}/facture?token=${encodedToken}`;
}

/**
 * Génère un lien WhatsApp pour envoyer une facture au client
 * 
 * @param phoneNumber - Numéro de téléphone du client (ex: "221771234567")
 * @param id_structure - ID de la structure
 * @param id_facture - ID de la facture
 * @param clientName - Nom du client (optionnel)
 * @returns URL WhatsApp complète
 */
export function getWhatsAppFactureUrl(
  phoneNumber: string,
  id_structure: number,
  id_facture: number,
  clientName?: string
): string {
  const factureUrl = getFactureUrl(id_structure, id_facture);
  
  // Nettoyer le numéro de téléphone (retirer espaces, tirets, etc.)
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  // Construire le message personnalisé
  const message = clientName 
    ? `Bonjour ${clientName}, voici votre facture FayClick: ${factureUrl}`
    : `Voici votre facture FayClick: ${factureUrl}`;
  
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Formate un numéro de téléphone pour WhatsApp
 * Ajoute le code pays du Sénégal si nécessaire
 * 
 * @param phone - Numéro de téléphone brut
 * @returns Numéro formaté pour WhatsApp
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Nettoyer le numéro
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Si le numéro commence par 77, 78, 70, etc. (format local sénégalais)
  if (cleanPhone.length === 9 && ['77', '78', '70', '75', '76'].some(prefix => cleanPhone.startsWith(prefix))) {
    return `221${cleanPhone}`;
  }
  
  // Si déjà au format international
  if (cleanPhone.startsWith('221')) {
    return cleanPhone;
  }
  
  // Sinon, retourner tel quel
  return cleanPhone;
}

/**
 * Valide qu'un numéro de téléphone est compatible WhatsApp
 * 
 * @param phone - Numéro de téléphone à valider
 * @returns true si le numéro semble valide
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  const formatted = formatPhoneForWhatsApp(phone);
  
  // Doit avoir au moins 8 caractères et commencer par des chiffres
  return formatted.length >= 8 && /^\d+$/.test(formatted);
}