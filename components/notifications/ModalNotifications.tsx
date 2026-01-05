/**
 * Modal de gestion des notifications
 * Design glassmorphism optimisé mobile - FayClick
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, Trash2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types/notification';

interface ModalNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

// Types pour les confirmations
type ConfirmAction = {
  type: 'markRead' | 'markAllRead' | 'delete' | 'deleteAll';
  id?: number;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'blue' | 'red';
};

// Mini modal de confirmation compact
function ConfirmDialog({
  action,
  onConfirm,
  onCancel,
  loading
}: {
  action: ConfirmAction;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const isDestructive = action.variant === 'red';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl p-3 mx-3 w-full max-w-[280px]"
      >
        <div className="flex items-start gap-2.5">
          <div className={`p-1.5 rounded-lg ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertTriangle className={`w-4 h-4 ${isDestructive ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-xs text-gray-900">{action.title}</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">{action.message}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-1.5 px-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-1.5 px-2 text-xs font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-1 ${
              isDestructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            } disabled:opacity-50`}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              action.confirmLabel
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Icônes par type de notification
const notificationIcons: Record<NotificationType, string> = {
  abonnement: '💳',
  retrait: '💸',
  paiement: '✅',
  system: '⚙️',
  commande: '📦'
};

// Couleurs par type de notification
const notificationColors: Record<NotificationType, string> = {
  abonnement: 'from-purple-500 to-indigo-500',
  retrait: 'from-amber-500 to-orange-500',
  paiement: 'from-green-500 to-emerald-500',
  system: 'from-gray-500 to-slate-500',
  commande: 'from-blue-500 to-cyan-500'
};

// Composant pour une notification individuelle
function NotificationItem({
  notification,
  onMarkRead,
  onDelete
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const icon = notificationIcons[notification.type] || '🔔';
  const colorClass = notificationColors[notification.type] || 'from-blue-500 to-cyan-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`p-2.5 rounded-lg border transition-all ${
        notification.lue
          ? 'bg-gray-50 border-gray-200'
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Icône compacte */}
        <div className={`p-1.5 rounded-md bg-gradient-to-br ${colorClass} text-white text-sm flex-shrink-0`}>
          {icon}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className={`font-medium text-xs leading-tight truncate ${notification.lue ? 'text-gray-600' : 'text-gray-900'}`}>
              {notification.titre}
            </h4>
            {/* Indicateur non lu */}
            {!notification.lue && (
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </div>
          <p className={`text-[11px] mt-0.5 line-clamp-2 leading-snug ${notification.lue ? 'text-gray-400' : 'text-gray-600'}`}>
            {notification.message}
          </p>

          {/* Date + Actions icônes */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-400">
              {notification.temps_ecoule || 'Maintenant'}
            </span>
            <div className="flex items-center gap-1">
              {!notification.lue && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onMarkRead(notification.id)}
                  className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-md transition-colors"
                  title="Marquer comme lu"
                >
                  <Check className="w-3 h-3" />
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onDelete(notification.id)}
                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-md transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ModalNotifications({
  isOpen,
  onClose,
  userId
}: ModalNotificationsProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const {
    notifications,
    stats,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useNotifications({
    userId,
    autoFetch: isOpen,
    refreshInterval: isOpen ? 30000 : 0
  });

  // Handlers pour demander confirmation
  const askMarkRead = (id: number) => {
    setConfirmAction({
      type: 'markRead',
      id,
      title: 'Marquer comme lu',
      message: 'Cette notification sera marquée comme lue.',
      confirmLabel: 'Confirmer',
      variant: 'blue'
    });
  };

  const askMarkAllRead = () => {
    setConfirmAction({
      type: 'markAllRead',
      title: 'Tout marquer comme lu',
      message: `${stats.non_lues} notification${stats.non_lues > 1 ? 's' : ''} seront marquées comme lues.`,
      confirmLabel: 'Confirmer',
      variant: 'blue'
    });
  };

  const askDelete = (id: number) => {
    setConfirmAction({
      type: 'delete',
      id,
      title: 'Supprimer',
      message: 'Cette notification sera définitivement supprimée.',
      confirmLabel: 'Supprimer',
      variant: 'red'
    });
  };

  const askDeleteAll = () => {
    setConfirmAction({
      type: 'deleteAll',
      title: 'Tout supprimer',
      message: `${stats.total} notification${stats.total > 1 ? 's' : ''} seront définitivement supprimées.`,
      confirmLabel: 'Supprimer',
      variant: 'red'
    });
  };

  // Exécuter l'action après confirmation
  const handleConfirm = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    try {
      switch (confirmAction.type) {
        case 'markRead':
          if (confirmAction.id) await markAsRead(confirmAction.id);
          break;
        case 'markAllRead':
          await markAllAsRead();
          break;
        case 'delete':
          if (confirmAction.id) await deleteNotification(confirmAction.id);
          break;
        case 'deleteAll':
          await deleteAllNotifications();
          break;
      }
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-2 pt-8 sm:p-4 sm:pt-12 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm overflow-hidden relative"
        >
          {/* Header compact avec gradient */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-3 relative">
            <button
              onClick={onClose}
              className="absolute top-2.5 right-2.5 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="flex items-center gap-2.5">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="p-2 bg-white/20 backdrop-blur-lg rounded-xl relative"
              >
                <Bell className="w-5 h-5 text-white" />
                {stats.non_lues > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {stats.non_lues > 9 ? '9+' : stats.non_lues}
                  </div>
                )}
              </motion.div>

              <div>
                <h2 className="text-base font-bold text-white">Notifications</h2>
                <p className="text-white/90 text-[11px]">
                  {stats.non_lues} non lue{stats.non_lues !== 1 ? 's' : ''} • {stats.total} total
                </p>
              </div>
            </div>
          </div>

          {/* Actions rapides - boutons icônes uniquement */}
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={refresh}
              disabled={loading}
              className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>

            <div className="flex items-center gap-1.5">
              {stats.non_lues > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={askMarkAllRead}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                </motion.button>
              )}
              {stats.total > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={askDeleteAll}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                  title="Tout supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="p-2.5 max-h-[65vh] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                <p className="text-gray-500 text-xs">Chargement...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-2">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-gray-700 font-medium text-xs mb-0.5">Erreur</p>
                <p className="text-gray-500 text-[10px] text-center">{error}</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={refresh}
                  className="mt-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs"
                >
                  Réessayer
                </motion.button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <Bell className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-gray-700 font-medium text-xs">Aucune notification</p>
                <p className="text-gray-400 text-[10px]">Vous êtes à jour !</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={askMarkRead}
                      onDelete={askDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer décoratif compact */}
          <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Dialog de confirmation */}
          <AnimatePresence>
            {confirmAction && (
              <ConfirmDialog
                action={confirmAction}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
                loading={actionLoading}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalNotifications;
