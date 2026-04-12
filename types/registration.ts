/**
 * Types TypeScript pour l'inscription marchand FayClick V2
 * Correspondance avec la fonction PostgreSQL add_edit_inscription
 */

// Interface pour les types de structure disponibles
export interface StructureType {
  id_type: number;
  nom_type: string;
}

// Interface pour les données d'inscription (paramètres de la fonction add_edit_inscription)
export interface RegistrationData {
  // Champs obligatoires
  p_id_type: number;           // Type de structure
  p_nom_structure: string;     // Nom de la structure (sera transformé en majuscules)
  p_adresse: string;           // Adresse complète (max 255 caractères)
  p_mobile_om: string;         // Téléphone Orange Money (9 chiffres)

  // Champs optionnels avec valeurs par défaut
  p_mobile_wave?: string;      // Téléphone Wave Money (optionnel)
  p_numautorisatioon?: string; // Numéro d'autorisation (optionnel)
  p_nummarchand?: string;      // Numéro marchand (optionnel, généré automatiquement si vide)
  p_email?: string;            // Email (optionnel)
  p_logo?: string;             // Logo en base64 (optionnel)
  p_nom_service?: string;      // Type de service (OPTIONNEL, défaut: "SERVICES")
  p_code_promo?: string;       // Code promo partenaire (OPTIONNEL, défaut: "FAYCLICK")
  p_id_structure?: number;     // ID structure (0 pour nouvelle inscription)

  // Multi-pays CEDEAO (Sprint 2)
  p_code_iso_pays?: string;    // Code ISO alpha-2 (défaut 'SN') — obligatoire côté caller
  p_email_gmail?: string;      // Email Gmail (obligatoire si p_code_iso_pays !== 'SN')
}

// Interface pour le résultat de la fonction PostgreSQL add_edit_inscription
export interface RegistrationResult {
  message: string; // Message retourné par la fonction (contient login et mot de passe)
}

// Interface pour la réponse du service d'inscription
export interface RegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    nom_structure: string;
    mobile_om: string;
    adresse: string;
    login?: string;      // Extrait du message si disponible
    password?: string;   // Extrait du message si disponible
  };
  error?: string;
}

// Interface pour les données du formulaire en 3 étapes (refonte)
export interface RegistrationFormData {
  // Étape 1: Bienvenue et nom du business
  businessName: string;        // Nom du business/entreprise/commerce

  // Étape 2: Configuration détaillée
  structureTypeId: number;     // Type de structure depuis la base (OBLIGATOIRE)
  serviceType: string;         // Type de service indépendant (OPTIONNEL, défaut: SERVICES)
  phoneOM: string;             // Téléphone Orange Money (obligatoire)
  phoneWave?: string;          // Téléphone Wave Money (optionnel)
  address: string;             // Adresse complète
  logoUrl?: string;            // URL du logo uploadé (optionnel)
  codePromo?: string;          // Code parrainage partenaire (optionnel)

  // Multi-pays CEDEAO (Sprint 2)
  countryCode: string;         // Code ISO pays sélectionné (défaut 'SN')
  email?: string;              // Email de contact (si Gmail → utilisé pour OTP pays ≠ SN)
  emailGmail?: string;         // Email Gmail dédié OTP (si countryCode !== 'SN')

  // Étape 3: Récapitulatif et validation
  acceptTerms: boolean;        // Acceptation CGU
}

// Mapping des types d'activité vers les IDs de base de données
export interface BusinessTypeMapping {
  [key: string]: {
    id: number;
    name: string;
    icon: string;
    desc: string;
    dbTypeId: number; // ID correspondant dans type_structure
  };
}

// Types d'activité disponibles (correspondance avec l'interface existante)
export const BUSINESS_TYPES: BusinessTypeMapping = {
  'services': {
    id: 1,
    name: 'Prestataires de Services',
    icon: '🛠️',
    desc: 'Tailleurs, menuisiers, plombiers...',
    dbTypeId: 1 // À ajuster selon la base de données
  },
  'commerce': {
    id: 2,
    name: 'Commerce',
    icon: '🏪',
    desc: 'Boutiques, magasins, ateliers...',
    dbTypeId: 2 // À ajuster selon la base de données
  },
  'education': {
    id: 3,
    name: 'Scolaire',
    icon: '🎓',
    desc: 'Écoles, instituts, formation...',
    dbTypeId: 3 // À ajuster selon la base de données
  },
  'real-estate': {
    id: 4,
    name: 'Immobilier',
    icon: '🏢',
    desc: 'Location, gestion immobilière...',
    dbTypeId: 4 // À ajuster selon la base de données
  }
};

// Interface pour la validation du formulaire par étape (refonte)
export interface StepValidation {
  step1: {
    businessName: boolean;
  };
  step2: {
    structureTypeId: boolean;  // SEUL CHAMP OBLIGATOIRE
    phoneOM: boolean;
    address: boolean;
    // serviceType OPTIONNEL - pas de validation
  };
  step3: {
    acceptTerms: boolean;
  };
}

// Interface pour les erreurs de validation
export interface ValidationError {
  field: string;
  message: string;
}

// Interface pour l'état du wizard d'inscription
export interface RegistrationWizardState {
  currentStep: number;
  totalSteps: number;
  formData: RegistrationFormData;
  validation: StepValidation;
  errors: ValidationError[];
  isLoading: boolean;
  isSubmitted: boolean;
}

// Interface pour les options de téléphone sénégalais
export interface SenegalPhoneValidation {
  isValid: boolean;
  formatted: string;
  operator: 'Orange' | 'Free' | 'Expresso' | 'Unknown';
  prefix: string;
}

// Constants pour la validation (refonte)
export const VALIDATION_RULES = {
  BUSINESS_NAME_MIN_LENGTH: 5,
  BUSINESS_NAME_MAX_LENGTH: 100,
  ADDRESS_MAX_LENGTH: 255,
  PHONE_MIN_LENGTH: 7,   // Mali: 7 chiffres
  PHONE_MAX_LENGTH: 10,  // Côte d'Ivoire: 10 chiffres
  PHONE_LENGTH: 10,      // Max pour le champ input
  LOGO_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  LOGO_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg']
} as const;

// Interface pour les messages de succès/erreur
export interface RegistrationMessages {
  success: {
    title: string;
    description: string;
    loginInfo?: {
      login: string;
      password: string;
    };
  };
  error: {
    title: string;
    description: string;
    code?: string;
  };
}

// Interface pour les données du modal de succès
export interface SuccessModalData {
  isOpen: boolean;
  message: string;
  login?: string;
  password?: string;
  structureName: string;
}

// Interface pour l'upload de logo
export interface LogoUploadData {
  file?: File;
  preview?: string;
  isUploading: boolean;
  error?: string;
}

// Interface pour les cartes d'avantages
export interface AdvantageItem {
  icon: string;
  text: string;
}

export interface WelcomeCardProps {
  title: string;
  description: string;
  icon: string;
}

export interface AdvantageCardProps {
  title: string;
  advantages: AdvantageItem[];
  icon: string;
}

// Constants pour les types de services (indépendants des structures)
export const SERVICE_ICONS = {
  'COMMERCE GENERAL': '🏪',
  'ALIMENTATION': '🍽️',
  'TEXTILE - MODE': '👕',
  'ELECTRONIQUE': '📱',
  'SERVICES': '🔧',
  'ARTISANAT': '🎨',
  'AGRO-PRODUCT': '🌾'
} as const;

export const SERVICE_TYPES = Object.keys(SERVICE_ICONS) as Array<keyof typeof SERVICE_ICONS>;

// Type pour les services disponibles
export type ServiceType = keyof typeof SERVICE_ICONS;

// Interface pour les données du carrousel de services
export interface ServiceCarouselItem {
  key: ServiceType;
  label: string;
  icon: string;
  isSelected: boolean;
}

// Interface pour le carrousel de services
export interface ServiceCarouselProps {
  selectedService: ServiceType;
  onServiceSelect: (service: ServiceType) => void;
  className?: string;
}

// Type pour les étapes du wizard
export type WizardStep = 1 | 2 | 3;

// Type pour les statuts de soumission
export type SubmissionStatus = 'idle' | 'loading' | 'success' | 'error';

// Export des types pour l'utilisation dans les composants
export type {
  RegistrationFormData as FormData,
  RegistrationWizardState as WizardState,
  ValidationError as FormError
};