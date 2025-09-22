'use client';

import React from 'react';
import { useVersionContext } from '@/contexts/VersionContext';
import { versionService } from '@/services/version.service';
import VersionStatus from '@/components/ui/VersionStatus';

const VersionTest: React.FC = () => {
  const {
    versionInfo,
    updateAvailable,
    isChecking,
    checkForUpdates
  } = useVersionContext();

  const handleForceCheck = () => {
    console.log('🔍 Force checking for updates...');
    checkForUpdates(true);
  };

  const clearStorage = () => {
    versionService.clearVersionCache();
    console.log('🗑️ All version cache cleared');
    window.location.reload(); // Rechargement pour re-tester
  };

  const checkCache = () => {
    const keys = ['fayclick_cache_version', 'fayclick_version_info', 'fayclick_last_update_prompt'];
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        console.log(`📦 ${key}:`, JSON.parse(value));
      } else {
        console.log(`📦 ${key}: not found`);
      }
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 max-w-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-2">🧪 Version Test</h3>

      <div className="space-y-2 text-xs">
        <div>
          <strong>Version actuelle:</strong> {versionInfo?.version || 'N/A'}
        </div>

        {updateAvailable && (
          <div className="text-orange-600">
            <strong>Mise à jour:</strong> {updateAvailable.latestVersion}
            <br />
            <strong>Type:</strong> {updateAvailable.updateType}
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 mt-3">
          <button
            onClick={handleForceCheck}
            disabled={isChecking}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Force Check'}
          </button>

          <button
            onClick={clearStorage}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            Clear Cache
          </button>

          <button
            onClick={checkCache}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            View Cache
          </button>

          <button
            onClick={() => checkForUpdates(false)}
            disabled={isChecking}
            className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 disabled:opacity-50"
          >
            Cache First
          </button>
        </div>
      </div>

      <div className="mt-3">
        <VersionStatus showDetails={true} compact={false} />
      </div>
    </div>
  );
};

export default VersionTest;