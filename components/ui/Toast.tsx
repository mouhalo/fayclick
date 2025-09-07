/**
 * Composant Toast pour les notifications
 * Utilise Framer Motion pour les animations
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  isVisible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
  className?: string;
}

const toastConfig = {
  success: {
    icon: Check,
    bgClass: 'bg-green-500',
    textClass: 'text-white',
    borderClass: 'border-green-600'
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-red-500',
    textClass: 'text-white',
    borderClass: 'border-red-600'
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-500',
    textClass: 'text-white',
    borderClass: 'border-blue-600'
  }
};

export function Toast({
  isVisible,
  type,
  title,
  message,
  duration = 4000,
  onClose,
  className = ''
}: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full mx-4 ${className}`}
        >
          <div className={`
            ${config.bgClass} ${config.textClass} border-2 ${config.borderClass}
            rounded-xl shadow-lg p-4 flex items-start gap-3
          `}>
            <div className="flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{title}</h4>
              {message && (
                <p className="text-sm opacity-90 mt-1 line-clamp-2">{message}</p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
          
          {/* Barre de progression */}
          {duration > 0 && (
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className="h-1 bg-white/30 rounded-b-xl"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook personnalisé pour gérer les toasts
export function useToast() {
  const [toast, setToast] = useState<{
    isVisible: boolean;
    type: ToastType;
    title: string;
    message?: string;
  }>({
    isVisible: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({
      isVisible: true,
      type,
      title,
      message
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const success = (title: string, message?: string) => showToast('success', title, message);
  const error = (title: string, message?: string) => showToast('error', title, message);
  const info = (title: string, message?: string) => showToast('info', title, message);

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    info,
    ToastComponent: () => (
      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    )
  };
}