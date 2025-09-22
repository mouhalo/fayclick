'use client';

import React from 'react';
import { versionService, VersionInfo, UpdateAvailableInfo } from '@/services/version.service';

// Hook React pour utiliser le service de versions
export function useVersion() {
  const [versionInfo, setVersionInfo] = React.useState<VersionInfo | null>(null);
  const [updateAvailable, setUpdateAvailable] = React.useState<UpdateAvailableInfo | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);

  React.useEffect(() => {
    // Charger les informations de version actuelles
    setVersionInfo(versionService.getCurrentVersionInfo());

    // Vérifier les mises à jour stockées
    const storedUpdate = versionService.getStoredVersionInfo();
    if (storedUpdate && !versionService.wasUpdatePromptShown(storedUpdate.version)) {
      const currentVersion = versionService.getCurrentVersionInfo().version;
      if (storedUpdate.version !== currentVersion) {
        const updateInfo: UpdateAvailableInfo = {
          currentVersion,
          latestVersion: storedUpdate.version,
          updateType: storedUpdate.updateType,
          changelog: storedUpdate.changelog || 'Nouvelle version disponible',
          forceUpdate: storedUpdate.forceUpdate,
          downloadUrl: storedUpdate.downloadUrl
        };
        setUpdateAvailable(updateInfo);
      }
    }

    return () => {
      versionService.cleanup();
    };
  }, []);

  const checkForUpdates = React.useCallback(async (forceCheck = false) => {
    setIsChecking(true);
    try {
      const update = await versionService.checkForUpdates(forceCheck);
      if (update) {
        const currentVersion = versionService.getCurrentVersionInfo().version;
        if (update.version !== currentVersion) {
          const updateInfo: UpdateAvailableInfo = {
            currentVersion,
            latestVersion: update.version,
            updateType: update.updateType,
            changelog: update.changelog || 'Nouvelle version disponible',
            forceUpdate: update.forceUpdate,
            downloadUrl: update.downloadUrl
          };
          setUpdateAvailable(updateInfo);
        }
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  const applyUpdate = React.useCallback(async () => {
    await versionService.applyUpdate();
  }, []);

  const dismissUpdate = React.useCallback((version: string) => {
    versionService.markUpdatePromptShown(version);
    setUpdateAvailable(null);
  }, []);

  return {
    versionInfo,
    updateAvailable,
    isChecking,
    checkForUpdates,
    applyUpdate,
    dismissUpdate
  };
}