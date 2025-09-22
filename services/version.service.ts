/**
 * Service de gestion des versions pour FayClick PWA
 * Gestion des mises à jour automatiques et notifications utilisateur
 */

import { API_CONFIG } from '@/lib/api-config';

export interface VersionInfo {
  version: string;
  buildDate: string;
  environment: 'development' | 'production';
  features?: string[];
}

export interface RemoteVersionInfo extends VersionInfo {
  updateType: 'none' | 'minor' | 'major' | 'critical';
  changelog?: string;
  downloadUrl?: string;
  forceUpdate: boolean;
  minRequiredVersion?: string;
}

export interface UpdateAvailableInfo {
  currentVersion: string;
  latestVersion: string;
  updateType: 'minor' | 'major' | 'critical';
  changelog: string;
  forceUpdate: boolean;
  downloadUrl?: string;
}

class VersionService {
  private static instance: VersionService;
  private currentVersion: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date | null = null;
  private readonly CHECK_INTERVAL_HOURS = 2; // Vérifier toutes les 2 heures
  private readonly VERSION_STORAGE_KEY = 'fayclick_version_info';
  private readonly LAST_UPDATE_PROMPT_KEY = 'fayclick_last_update_prompt';
  private readonly CACHE_VERSION_KEY = 'fayclick_cache_version';
  private readonly CACHE_EXPIRY_HOURS = 6; // Cache valide 6 heures

  static getInstance(): VersionService {
    if (!this.instance) {
      this.instance = new VersionService();
    }
    return this.instance;
  }

  constructor() {
    this.currentVersion = this.getCurrentVersion();
    this.initializeVersionCheck();
  }

  /**
   * Récupère la version actuelle depuis package.json ou une variable d'environnement
   */
  private getCurrentVersion(): string {
    // En production, cette valeur pourrait être injectée lors du build
    return process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
  }

  /**
   * Récupère les informations de version actuelle
   */
  getCurrentVersionInfo(): VersionInfo {
    return {
      version: this.currentVersion,
      buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString(),
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      features: this.getCurrentFeatures()
    };
  }

  /**
   * Liste des fonctionnalités de la version actuelle
   */
  private getCurrentFeatures(): string[] {
    return [
      'Dashboard multi-segments',
      'Gestion des factures',
      'Système de paiement intégré',
      'Authentification sécurisée',
      'Interface responsive',
      'Mode PWA',
      'Édition de structure'
    ];
  }

  /**
   * Vérifie s'il y a une nouvelle version disponible (cache-first)
   */
  async checkForUpdates(forceCheck = false): Promise<RemoteVersionInfo | null> {
    try {
      // 1. Vérifier d'abord le cache localStorage
      if (!forceCheck) {
        const cachedVersion = this.getCachedVersionInfo();
        if (cachedVersion) {
          console.log('⚡ Using cached version info:', cachedVersion);
          return cachedVersion;
        }
      }

      // 2. Éviter les vérifications réseau trop fréquentes
      if (!forceCheck && this.lastCheckTime) {
        const timeSinceLastCheck = Date.now() - this.lastCheckTime.getTime();
        const checkIntervalMs = this.CHECK_INTERVAL_HOURS * 60 * 60 * 1000;

        if (timeSinceLastCheck < checkIntervalMs) {
          console.log('⏱️ Version check skipped - too recent');
          return null;
        }
      }

      this.lastCheckTime = new Date();

      console.log('🔍 Checking for app updates from network...', {
        currentVersion: this.currentVersion,
        environment: process.env.NODE_ENV,
        forceCheck
      });

      // 3. Fallback vers la vérification réseau seulement si nécessaire
      const remoteVersionInfo = await this.fetchRemoteVersion();

      if (remoteVersionInfo) {
        // Mettre en cache la nouvelle version
        this.setCachedVersionInfo(remoteVersionInfo);
        this.storeVersionInfo(remoteVersionInfo);
        return remoteVersionInfo;
      }

      return null;

    } catch (error) {
      console.error('❌ Error checking for updates:', error);

      // En cas d'erreur réseau, essayer de retourner la dernière version cachée
      const fallbackVersion = this.getCachedVersionInfo(true); // Force même si expiré
      if (fallbackVersion) {
        console.log('🔄 Using fallback cached version due to network error');
        return fallbackVersion;
      }

      return null;
    }
  }

  /**
   * Récupère les informations de version depuis le cache localStorage
   */
  private getCachedVersionInfo(ignoreExpiry = false): RemoteVersionInfo | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(this.CACHE_VERSION_KEY);
      if (!cached) return null;

      const { version, timestamp } = JSON.parse(cached);

      // Vérifier si le cache n'est pas expiré
      if (!ignoreExpiry) {
        const now = Date.now();
        const cacheAge = now - timestamp;
        const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

        if (cacheAge > maxAge) {
          console.log('🗑️ Cache expired, removing old version info');
          localStorage.removeItem(this.CACHE_VERSION_KEY);
          return null;
        }
      }

      // Vérifier si c'est vraiment une nouvelle version
      if (this.compareVersions(this.currentVersion, version)) {
        return version;
      }

      return null;
    } catch (error) {
      console.warn('Could not read cached version info:', error);
      return null;
    }
  }

  /**
   * Met en cache les informations de version dans localStorage
   */
  private setCachedVersionInfo(versionInfo: RemoteVersionInfo): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = {
        version: versionInfo,
        timestamp: Date.now(),
        currentVersion: this.currentVersion
      };

      localStorage.setItem(this.CACHE_VERSION_KEY, JSON.stringify(cacheData));
      console.log('💾 Version info cached successfully');
    } catch (error) {
      console.warn('Could not cache version info:', error);
    }
  }

  /**
   * Efface le cache de versions
   */
  clearVersionCache(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.CACHE_VERSION_KEY);
      localStorage.removeItem(this.VERSION_STORAGE_KEY);
      localStorage.removeItem(this.LAST_UPDATE_PROMPT_KEY);
      console.log('🗑️ All version cache cleared');
    } catch (error) {
      console.warn('Could not clear version cache:', error);
    }
  }

  /**
   * Récupère les informations de version depuis le réseau
   */
  private async fetchRemoteVersion(): Promise<RemoteVersionInfo | null> {
    try {
      // Construire l'URL de vérification des versions
      const versionCheckUrl = this.buildVersionCheckUrl();

      const response = await fetch(versionCheckUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Current-Version': this.currentVersion,
          'X-App-Name': 'fayclick'
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const remoteVersionInfo: RemoteVersionInfo = await response.json();
      console.log('📋 Remote version info fetched:', remoteVersionInfo);

      return remoteVersionInfo;
    } catch (error) {
      console.warn('⚠️ Network version check failed:', error);
      throw error;
    }
  }

  /**
   * Construit l'URL de vérification des versions selon l'environnement
   */
  private buildVersionCheckUrl(): string {
    // En développement, utiliser un fichier de test local
    if (process.env.NODE_ENV === 'development') {
      return '/version-test.json';
    }

    // En production, utiliser l'endpoint de production
    const baseUrl = API_CONFIG.baseUrl;
    return `${baseUrl.replace('/backend', '')}/api/version/latest`;
  }

  /**
   * Compare deux versions et détermine le type de mise à jour
   */
  private compareVersions(current: string, remote: RemoteVersionInfo): UpdateAvailableInfo | null {
    const currentParts = current.split('.').map(Number);
    const remoteParts = remote.version.split('.').map(Number);

    // Vérifier si la version distante est plus récente
    for (let i = 0; i < Math.max(currentParts.length, remoteParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const remotePart = remoteParts[i] || 0;

      if (remotePart > currentPart) {
        // Nouvelle version disponible
        return {
          currentVersion: current,
          latestVersion: remote.version,
          updateType: remote.updateType,
          changelog: remote.changelog || 'Nouvelle version disponible',
          forceUpdate: remote.forceUpdate,
          downloadUrl: remote.downloadUrl
        };
      }

      if (remotePart < currentPart) {
        // Version locale plus récente (développement)
        break;
      }
    }

    return null; // Pas de mise à jour nécessaire
  }

  /**
   * Démarre la vérification périodique des versions
   */
  startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Vérifier immédiatement puis périodiquement
    this.checkForUpdates(false);

    this.checkInterval = setInterval(() => {
      this.checkForUpdates(false);
    }, this.CHECK_INTERVAL_HOURS * 60 * 60 * 1000);

    console.log('⏰ Periodic version check started');
  }

  /**
   * Arrête la vérification périodique
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏸️ Periodic version check stopped');
    }
  }

  /**
   * Initialise la vérification des versions au démarrage
   */
  private initializeVersionCheck(): void {
    // Vérifier au démarrage si nous sommes dans le navigateur
    if (typeof window !== 'undefined') {
      // Démarrer les vérifications périodiques après un délai
      setTimeout(() => {
        this.startPeriodicCheck();
      }, 10000); // Attendre 10 secondes après le démarrage
    }
  }

  /**
   * Stocke les informations de version dans le localStorage
   */
  private storeVersionInfo(versionInfo: RemoteVersionInfo): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.VERSION_STORAGE_KEY, JSON.stringify({
          ...versionInfo,
          lastChecked: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Could not store version info:', error);
      }
    }
  }

  /**
   * Récupère les informations de version stockées
   */
  getStoredVersionInfo(): (RemoteVersionInfo & { lastChecked: string }) | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.VERSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Could not retrieve stored version info:', error);
      return null;
    }
  }

  /**
   * Marque qu'une notification de mise à jour a été affichée
   */
  markUpdatePromptShown(version: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.LAST_UPDATE_PROMPT_KEY, JSON.stringify({
          version,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Could not mark update prompt:', error);
      }
    }
  }

  /**
   * Vérifie si une notification de mise à jour a déjà été affichée pour cette version
   */
  wasUpdatePromptShown(version: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem(this.LAST_UPDATE_PROMPT_KEY);
      if (!stored) return false;

      const { version: shownVersion } = JSON.parse(stored);
      return shownVersion === version;
    } catch (error) {
      return false;
    }
  }

  /**
   * Force le rechargement de l'application pour appliquer les mises à jour
   */
  async applyUpdate(): Promise<void> {
    console.log('🔄 Applying app update...');

    // En contexte PWA, on peut forcer la mise à jour du Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // Forcer la mise à jour du Service Worker
          await registration.update();

          // Attendre que le nouveau SW soit activé
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      } catch (error) {
        console.warn('Service Worker update failed:', error);
      }
    }

    // Recharger la page pour appliquer les changements
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  /**
   * Nettoie les ressources du service
   */
  cleanup(): void {
    this.stopPeriodicCheck();
  }
}

// Export de l'instance singleton
export const versionService = VersionService.getInstance();

