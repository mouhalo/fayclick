/**
 * Types généraux pour FayClick V2 
 * Compatible avec l'architecture old_services
 */

// Type pour le résultat de connexion_agent (fonction PostgreSQL)
export interface ConnexionAgent {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    login: string;
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    actif: boolean;
    [key: string]: unknown;
  };
  profil?: {
    id_profil: number;
    nom_profil: string;
    [key: string]: unknown;
  };
  zone?: {
    id: number;
    nom: string;
    [key: string]: unknown;
  };
  mode?: string;
}

// Interface pour le résultat de check_user_credentials (fonction PostgreSQL moderne)
export interface UserCredentialsResult {
  id: number;
  username: string;
  nom_groupe: string;
  id_structure: number;
  nom_structure: string;
  pwd_changed: boolean;
  actif: boolean;
  type_structure: 'SCOLAIRE' | 'COMMERCIALE' | 'IMMOBILIER' | 'PRESTATAIRE DE SERVICES' | 'FORMATION PRO';
  logo: string;
  login: string;
  pwd: string;
  telephone: string;
  nom_profil: string;
  id_groupe: number;
  id_profil: number;
}

// Les types sont déjà exportés individuellement ci-dessus