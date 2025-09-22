import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  RefreshCw,
  X,
  AlertTriangle,
  Sparkles,
  Clock,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { UpdateAvailableInfo } from '@/services/version.service';

interface UpdateNotificationProps {
  updateInfo: UpdateAvailableInfo;
  onUpdate: () => void;
  onDismiss: () => void;
  onViewChangelog?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  updateInfo,
  onUpdate,
  onDismiss,
  onViewChangelog
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Configuration des couleurs et icônes selon le type de mise à jour
  const getUpdateConfig = () => {
    switch (updateInfo.updateType) {
      case 'critical':
        return {
          icon: AlertTriangle,
          bgGradient: 'from-red-500/20 via-red-600/10 to-orange-500/20',
          borderColor: 'border-red-300/50',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          textColor: 'text-red-800',
          buttonBg: 'bg-gradient-to-r from-red-600 to-red-700',
          buttonHover: 'hover:from-red-700 hover:to-red-800',
          title: 'Mise à jour critique requise',
          priority: 'Critique'
        };
      case 'major':
        return {
          icon: Sparkles,
          bgGradient: 'from-yellow-500/20 via-orange-600/10 to-yellow-500/20',
          borderColor: 'border-yellow-300/50',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          textColor: 'text-yellow-800',
          buttonBg: 'bg-gradient-to-r from-yellow-600 to-orange-600',
          buttonHover: 'hover:from-yellow-700 hover:to-orange-700',
          title: 'Nouvelle version majeure disponible',
          priority: 'Recommandée'
        };
      default: // minor
        return {
          icon: RefreshCw,
          bgGradient: 'from-green-500/20 via-emerald-600/10 to-green-500/20',
          borderColor: 'border-green-300/50',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900',
          textColor: 'text-green-800',
          buttonBg: 'bg-gradient-to-r from-green-600 to-emerald-600',
          buttonHover: 'hover:from-green-700 hover:to-emerald-700',
          title: 'Mise à jour disponible',
          priority: 'Optionnelle'
        };
    }
  };

  const config = getUpdateConfig();
  const IconComponent = config.icon;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate();
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    if (!updateInfo.forceUpdate && !isUpdating) {
      onDismiss();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        onClick={updateInfo.forceUpdate ? undefined : handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className={`
            relative max-w-lg w-full mx-auto rounded-2xl border shadow-2xl
            bg-gradient-to-br ${config.bgGradient}
            ${config.borderColor}
            backdrop-blur-xl
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-4">
            {/* Badge priorité */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full
                ${updateInfo.updateType === 'critical' ? 'bg-red-100 text-red-700' :
                  updateInfo.updateType === 'major' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }
              `}>
                {config.priority}
              </span>
              {!updateInfo.forceUpdate && (
                <button
                  onClick={handleDismiss}
                  className={`
                    p-1 rounded-md transition-colors duration-200
                    ${config.textColor} hover:bg-black/10
                  `}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Icône et titre */}
            <div className="flex items-start gap-4">
              <div className={`
                flex-shrink-0 p-3 rounded-xl bg-white/20 backdrop-blur-sm
                ${config.iconColor}
              `}>
                <IconComponent className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold ${config.titleColor} mb-2`}>
                  {config.title}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className={config.textColor}>
                    Version {updateInfo.currentVersion}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className={`font-semibold ${config.titleColor}`}>
                    Version {updateInfo.latestVersion}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-6 pb-6">
            {/* Changelog */}
            {updateInfo.changelog && (
              <div className="mb-6">
                <h4 className={`text-sm font-medium ${config.titleColor} mb-2`}>
                  Nouveautés :
                </h4>
                <div className={`
                  text-sm ${config.textColor} leading-relaxed
                  bg-white/10 backdrop-blur-sm rounded-lg p-3
                `}>
                  {updateInfo.changelog}
                </div>
              </div>
            )}

            {/* Message de mise à jour forcée */}
            {updateInfo.forceUpdate && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Mise à jour obligatoire
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Cette mise à jour est requise pour continuer à utiliser l'application.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                  text-white font-medium transition-all duration-200
                  ${config.buttonBg} ${config.buttonHover}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg hover:shadow-xl
                `}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Mise à jour en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {updateInfo.forceUpdate ? 'Mettre à jour maintenant' : 'Mettre à jour'}
                  </>
                )}
              </button>

              {!updateInfo.forceUpdate && (
                <button
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className={`
                    px-4 py-3 rounded-lg border transition-all duration-200
                    ${config.borderColor} ${config.textColor}
                    bg-white/20 backdrop-blur-sm
                    hover:bg-white/30 disabled:opacity-50
                  `}
                >
                  Plus tard
                </button>
              )}
            </div>

            {/* Liens supplémentaires */}
            {(onViewChangelog || updateInfo.downloadUrl) && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-center gap-4 text-xs">
                  {onViewChangelog && (
                    <button
                      onClick={onViewChangelog}
                      className={`
                        flex items-center gap-1 ${config.textColor} hover:underline
                      `}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Voir les détails
                    </button>
                  )}

                  {updateInfo.downloadUrl && (
                    <a
                      href={updateInfo.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        flex items-center gap-1 ${config.textColor} hover:underline
                      `}
                    >
                      <Download className="h-3 w-3" />
                      Téléchargement manuel
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Animation de progression pour mise à jour en cours */}
          {isUpdating && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-2xl overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                className={`h-full ${
                  updateInfo.updateType === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  updateInfo.updateType === 'major' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}
              />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateNotification;