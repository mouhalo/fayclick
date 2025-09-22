import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface PopMessageProps {
  show: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const PopMessage: React.FC<PopMessageProps> = ({
  show,
  type = 'info',
  title,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000
}) => {
  // Auto fermeture
  React.useEffect(() => {
    if (show && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoClose, autoCloseDelay, onClose]);

  // Configuration des couleurs et icônes selon le type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-800',
          titleColor: 'text-green-900'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          titleColor: 'text-red-900'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-800',
          titleColor: 'text-yellow-900'
        };
      default: // info
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900'
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`
              relative max-w-md w-full mx-auto rounded-xl border shadow-xl
              ${config.bgColor} ${config.borderColor}
              backdrop-blur-md
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header avec icône et bouton fermer */}
            <div className="flex items-start justify-between p-4">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${config.iconColor}`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className={`text-sm font-medium ${config.titleColor} mb-1`}>
                      {title}
                    </h3>
                  )}
                  <p className={`text-sm ${config.textColor} leading-relaxed`}>
                    {message}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className={`
                  flex-shrink-0 ml-4 p-1 rounded-md transition-colors duration-200
                  ${config.textColor} hover:bg-black/10
                `}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Barre de progression pour l'auto-fermeture */}
            {autoClose && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-xl overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
                  className={`h-full ${
                    type === 'success' ? 'bg-green-600' :
                    type === 'error' ? 'bg-red-600' :
                    type === 'warning' ? 'bg-yellow-600' :
                    'bg-blue-600'
                  }`}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PopMessage;