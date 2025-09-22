import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { useVersionContext } from '@/contexts/VersionContext';

interface VersionStatusProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const VersionStatus: React.FC<VersionStatusProps> = ({
  showDetails = false,
  compact = false,
  className = ''
}) => {
  const {
    versionInfo,
    updateAvailable,
    isChecking,
    checkForUpdates
  } = useVersionContext();

  const handleManualCheck = () => {
    checkForUpdates(true);
  };

  // Déterminer l'état et les couleurs
  const getStatusConfig = () => {
    if (isChecking) {
      return {
        icon: RefreshCw,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        status: 'Vérification en cours...',
        description: 'Recherche de nouvelles versions'
      };
    }

    if (updateAvailable) {
      const updateType = updateAvailable.updateType;

      if (updateType === 'critical') {
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          status: 'Mise à jour critique',
          description: `Version ${updateAvailable.latestVersion} disponible`
        };
      }

      if (updateType === 'major') {
        return {
          icon: Sparkles,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          status: 'Mise à jour majeure',
          description: `Version ${updateAvailable.latestVersion} disponible`
        };
      }

      // minor
      return {
        icon: RefreshCw,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        status: 'Mise à jour disponible',
        description: `Version ${updateAvailable.latestVersion} disponible`
      };
    }

    return {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      status: 'À jour',
      description: 'Application à jour'
    };
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1 ${config.color}`}>
          <IconComponent
            className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`}
          />
          {versionInfo && (
            <span className="text-xs font-medium">
              v{versionInfo.version}
            </span>
          )}
        </div>

        {updateAvailable && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          rounded-lg border p-4
          ${config.bgColor} ${config.borderColor}
          backdrop-blur-sm
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${config.color}`}>
              <IconComponent
                className={`h-5 w-5 ${isChecking ? 'animate-spin' : ''}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-medium ${config.color}`}>
                {config.status}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {config.description}
              </p>

              {showDetails && versionInfo && (
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Version actuelle:</span>
                    <span className="font-mono">{versionInfo.version}</span>
                  </div>
                  {versionInfo.buildDate && (
                    <div className="flex justify-between">
                      <span>Build:</span>
                      <span className="font-mono">
                        {new Date(versionInfo.buildDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Environnement:</span>
                    <span className={`
                      font-mono px-1 py-0.5 rounded text-xs
                      ${versionInfo.environment === 'production'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }
                    `}>
                      {versionInfo.environment}
                    </span>
                  </div>
                </div>
              )}

              {updateAvailable && (
                <div className="mt-3 p-3 bg-white/50 rounded-lg border border-white/30">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Nouvelle version:</span>
                    <span className="font-semibold text-gray-900">
                      {updateAvailable.latestVersion}
                    </span>
                  </div>
                  {updateAvailable.changelog && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {updateAvailable.changelog}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {!isChecking && (
            <button
              onClick={handleManualCheck}
              className={`
                flex-shrink-0 p-1 rounded-md transition-colors duration-200
                ${config.color} hover:bg-black/10
              `}
              title="Vérifier les mises à jour"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VersionStatus;