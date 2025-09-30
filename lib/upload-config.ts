/**
 * Configuration centralisée pour les uploads de fichiers (logos, photos)
 * Endpoints séparés de l'API PostgreSQL
 */

// Type d'upload supportés
export type UploadType = 'logo' | 'photo';

// Endpoints upload (backend PHP dédié, pas via psql_request)
export const UPLOAD_ENDPOINTS = {
  BASE: 'https://api.icelabsoft.com/upload', // Sans /api/psql_request
  LOGO: '/logo',
  PHOTO: '/photo'
} as const;

// URL de base pour les fichiers uploadés
export const UPLOAD_BASE_URL = 'https://fayclick.net/uploads';

// Répertoires distants par type
export const UPLOAD_DIRECTORIES = {
  LOGOS: '/logos/',
  PHOTOS: '/photos/'
} as const;

// Patterns de nommage des fichiers
export const FILENAME_PATTERNS = {
  LOGO: 'logo-{timestamp}-{hash}.{ext}',
  PHOTO: 'photo-{timestamp}-{hash}.{ext}'
} as const;

/**
 * Obtient l'URL complète de l'endpoint d'upload selon le type
 */
export function getUploadEndpoint(type: UploadType): string {
  const endpoint = type === 'logo' ? UPLOAD_ENDPOINTS.LOGO : UPLOAD_ENDPOINTS.PHOTO;
  return `${UPLOAD_ENDPOINTS.BASE}${endpoint}`;
}

/**
 * Obtient le pattern de nom de fichier selon le type
 */
export function getFilenamePattern(type: UploadType): string {
  return type === 'logo' ? FILENAME_PATTERNS.LOGO : FILENAME_PATTERNS.PHOTO;
}

/**
 * Obtient le répertoire distant selon le type
 */
export function getUploadDirectory(type: UploadType): string {
  return type === 'logo' ? UPLOAD_DIRECTORIES.LOGOS : UPLOAD_DIRECTORIES.PHOTOS;
}

/**
 * Construit l'URL finale attendue d'un fichier uploadé
 * Exemple: https://fayclick.net/uploads/logos/logo-123.png
 */
export function buildUploadUrl(type: UploadType, filename: string): string {
  const directory = getUploadDirectory(type);
  return `${UPLOAD_BASE_URL}${directory}${filename}`;
}

// Logs de configuration
if (process.env.NODE_ENV === 'development') {
  console.log('📤 Configuration Upload FayClick');
  console.log('📍 Endpoint Logos:', getUploadEndpoint('logo'));
  console.log('📍 Endpoint Photos:', getUploadEndpoint('photo'));
  console.log('🌐 Base URL:', UPLOAD_BASE_URL);
}