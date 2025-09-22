'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { versionService, VersionInfo, UpdateAvailableInfo } from '@/services/version.service';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useVersion } from '@/hooks/useVersion';
import UpdateNotification from '@/components/ui/UpdateNotification';

interface VersionContextType {
  versionInfo: VersionInfo | null;
  updateAvailable: UpdateAvailableInfo | null;
  isChecking: boolean;
  checkForUpdates: (forceCheck?: boolean) => Promise<void>;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  showUpdateNotification: boolean;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

interface VersionProviderProps {
  children: React.ReactNode;
  autoCheck?: boolean;
  checkInterval?: number;
}

export const VersionProvider: React.FC<VersionProviderProps> = ({
  children,
  autoCheck = true,
  checkInterval = 2
}) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateAvailableInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  // Intégration Service Worker
  const serviceWorker = useServiceWorker();

  // Initialisation au montage du composant
  useEffect(() => {
    // Charger les informations de version actuelles
    setVersionInfo(versionService.getCurrentVersionInfo());

    // Vérifier s'il y a une mise à jour stockée non affichée
    const checkStoredUpdate = () => {
      const storedUpdate = versionService.getStoredVersionInfo();
      if (storedUpdate && !versionService.wasUpdatePromptShown(storedUpdate.version)) {
        // Simuler la comparaison pour créer UpdateAvailableInfo
        const currentVersion = versionService.getCurrentVersionInfo().version;
        if (storedUpdate.version !== currentVersion) {
          setUpdateAvailable({
            currentVersion,
            latestVersion: storedUpdate.version,
            updateType: storedUpdate.updateType,
            changelog: storedUpdate.changelog || 'Nouvelle version disponible',
            forceUpdate: storedUpdate.forceUpdate,
            downloadUrl: storedUpdate.downloadUrl
          });
          setShowUpdateNotification(true);
        }
      }
    };

    checkStoredUpdate();

    // Démarrer la vérification automatique si activée
    if (autoCheck) {
      versionService.startPeriodicCheck();
    }

    // Cleanup à la destruction
    return () => {
      versionService.cleanup();
    };
  }, [autoCheck]);

  // Fonction pour vérifier les mises à jour
  const checkForUpdates = async (forceCheck = false) => {
    setIsChecking(true);
    try {
      const remoteVersion = await versionService.checkForUpdates(forceCheck);
      if (remoteVersion) {
        const currentVersion = versionService.getCurrentVersionInfo().version;

        // Créer l'objet UpdateAvailableInfo
        const updateInfo: UpdateAvailableInfo = {
          currentVersion,
          latestVersion: remoteVersion.version,
          updateType: remoteVersion.updateType,
          changelog: remoteVersion.changelog || 'Nouvelle version disponible',
          forceUpdate: remoteVersion.forceUpdate,
          downloadUrl: remoteVersion.downloadUrl
        };

        setUpdateAvailable(updateInfo);

        // Afficher la notification seulement si pas déjà montrée
        if (!versionService.wasUpdatePromptShown(remoteVersion.version)) {
          setShowUpdateNotification(true);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Fonction pour appliquer la mise à jour
  const applyUpdate = async () => {
    try {
      // Utiliser le Service Worker en priorité si disponible
      if (serviceWorker.status.isRegistered) {
        await serviceWorker.applyUpdate();
      } else {
        // Fallback vers le service de version classique
        await versionService.applyUpdate();
      }
    } catch (error) {
      console.error('Error applying update:', error);
      throw error;
    }
  };

  // Fonction pour ignorer la mise à jour
  const dismissUpdate = () => {
    if (updateAvailable) {
      versionService.markUpdatePromptShown(updateAvailable.latestVersion);
      setUpdateAvailable(null);
      setShowUpdateNotification(false);
    }
  };

  // Gestion de la fermeture de la notification
  const handleCloseNotification = () => {
    setShowUpdateNotification(false);
    dismissUpdate();
  };

  // Gestion de l'application de la mise à jour depuis la notification
  const handleApplyUpdate = async () => {
    try {
      await applyUpdate();
    } catch (error) {
      console.error('Failed to apply update:', error);
      // En cas d'erreur, on peut essayer de rediriger vers le téléchargement manuel
      if (updateAvailable?.downloadUrl) {
        window.open(updateAvailable.downloadUrl, '_blank');
      }
    }
  };

  const contextValue: VersionContextType = {
    versionInfo,
    updateAvailable,
    isChecking,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
    showUpdateNotification
  };

  return (
    <VersionContext.Provider value={contextValue}>
      {children}

      {/* Notification de mise à jour */}
      {showUpdateNotification && updateAvailable && (
        <UpdateNotification
          updateInfo={updateAvailable}
          onUpdate={handleApplyUpdate}
          onDismiss={handleCloseNotification}
          onViewChangelog={() => {
            // TODO: Implémenter l'affichage détaillé du changelog
            console.log('View changelog:', updateAvailable.changelog);
          }}
        />
      )}
    </VersionContext.Provider>
  );
};

// Hook pour utiliser le contexte des versions
export const useVersionContext = (): VersionContextType => {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersionContext must be used within a VersionProvider');
  }
  return context;
};

// Hook simplifié pour les informations de version uniquement
export const useVersionInfo = () => {
  const { versionInfo } = useVersionContext();
  return versionInfo;
};

// Hook pour les mises à jour uniquement
export const useUpdateCheck = () => {
  const {
    updateAvailable,
    isChecking,
    checkForUpdates,
    applyUpdate,
    dismissUpdate
  } = useVersionContext();

  return {
    updateAvailable,
    isChecking,
    checkForUpdates,
    applyUpdate,
    dismissUpdate
  };
};