// Types pour l'authentification et les structures
export interface LoginCredentials {
  login: string;
  pwd: string;
}

export interface User {
  id: number;
  username?: string;
  login: string;
  nom?: string;
  prenom?: string;
  email?: string;
  nom_groupe: string;
  id_structure: number;
  nom_structure: string;
  pwd_changed: boolean;
  actif: boolean;
  type_structure: 'SCOLAIRE' | 'COMMERCIALE' | 'IMMOBILIER' | 'PRESTATAIRE DE SERVICES' | 'FORMATION PRO';
  logo: string;
  pwd: string;
  telephone: string;
  nom_profil: string;
  id_groupe: number;
  id_profil: number;
  // Propriétés étendues pour compatibilité avec l'ancien système
  profil?: {
    id: number;
    nom: string;
    id_profil?: number;
    nom_profil?: string;
    [key: string]: unknown;
  };
  zone?: {
    id: number;
    nom: string;
    [key: string]: unknown;
  };
  mode?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Structure {
  id_structure: number;
  code_structure: string;
  nom_structure: string;
  adresse: string;
  mobile_om: string;
  mobile_wave: string;
  numautorisatioon: string;
  nummarchand: string;
  email: string;
  id_localite: number;
  actif: boolean;
  logo: string;
  createdat: string;
  updatedat: string;
  id_type: number;
  type_structure: string;
  num_unik_reversement: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

// Routes de redirection selon le groupe utilisateur
export const USER_ROUTES = {
  SCOLAIRE: '/dashboard/scolaire',
  COMMERCE: '/dashboard/commerce',
  COMMERCIALE: '/dashboard/commerce', // Alias pour COMMERCIALE
  IMMOBILIER: '/dashboard/immobilier',
  'PRESTATAIRE DE SERVICES': '/dashboard/services',
  'FORMATION PRO': '/dashboard/formation',
  CLIENT: '/dashboard/client',
  ADMIN: '/dashboard/admin',
  SYSTEM: '/dashboard/system'
} as const;

// Fonction pour obtenir la route de redirection
export function getUserRedirectRoute(user: User): string {
  // Log pour debug
  console.log('getUserRedirectRoute - User data:', {
    nom_groupe: user.nom_groupe,
    type_structure: user.type_structure,
    nom_profil: user.nom_profil
  });
  
  // PRIORITÉ 1: Toujours vérifier d'abord le type_structure pour la redirection
  if (user.type_structure) {
    const route = USER_ROUTES[user.type_structure as keyof typeof USER_ROUTES];
    if (route) {
      console.log(`Redirecting to ${route} based on type_structure: ${user.type_structure}`);
      return route;
    }
  }
  
  // PRIORITÉ 2: Si pas de type_structure ou pas de route trouvée, utiliser nom_groupe
  if (user.nom_groupe) {
    const groupRoute = USER_ROUTES[user.nom_groupe as keyof typeof USER_ROUTES];
    if (groupRoute) {
      console.log(`Redirecting to ${groupRoute} based on nom_groupe: ${user.nom_groupe}`);
      return groupRoute;
    }
  }
  
  // PRIORITÉ 3: Si c'est un admin système global (sans structure spécifique)
  if ((user.nom_profil === 'ADMIN' || user.nom_profil === 'SYSTEM') && !user.type_structure) {
    console.log('Redirecting to admin dashboard (system admin)');
    return USER_ROUTES.ADMIN;
  }
  
  // Fallback par défaut
  console.log('Fallback redirect to /dashboard');
  return '/dashboard';
}
