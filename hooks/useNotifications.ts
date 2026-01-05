'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/notification.service';
import type {
  Notification,
  NotificationType,
  NotificationStats,
  NotificationsResponse
} from '@/types/notification';

interface UseNotificationsOptions {
  userId: number;
  autoFetch?: boolean;
  refreshInterval?: number; // En millisecondes, 0 = pas de refresh auto
  limit?: number;
  onlyUnread?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  stats: NotificationStats;
  loading: boolean;
  error: string | null;
  unreadCount: number;
  // Actions
  refresh: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: number) => Promise<boolean>;
  deleteAllNotifications: () => Promise<boolean>;
  addNotification: (titre: string, message: string, type: NotificationType) => Promise<boolean>;
}

/**
 * Hook personnalisé pour la gestion des notifications
 * Gère le chargement, le cache, les actions et le rafraîchissement automatique
 */
export function useNotifications({
  userId,
  autoFetch = true,
  refreshInterval = 30000, // 30 secondes par défaut
  limit = 50,
  onlyUnread = false
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, non_lues: 0, lues: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Rafraîchit la liste des notifications
   */
  const refresh = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await notificationService.getNotifications(
        userId,
        limit,
        0,
        onlyUnread
      );

      setNotifications(response.notifications);
      setStats(response.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement des notifications';
      setError(message);
      console.error('[useNotifications] Erreur:', message);
    } finally {
      setLoading(false);
    }
  }, [userId, limit, onlyUnread]);

  /**
   * Marque une notification comme lue
   */
  const markAsRead = useCallback(async (notificationId: number): Promise<boolean> => {
    try {
      const result = await notificationService.markAsRead(notificationId);

      if (result.success) {
        // Mise à jour optimiste locale
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, lue: true } : notif
          )
        );
        setStats(prev => ({
          ...prev,
          non_lues: Math.max(0, prev.non_lues - 1),
          lues: prev.lues + 1
        }));
      }

      return result.success;
    } catch (err) {
      console.error('[useNotifications] Erreur markAsRead:', err);
      return false;
    }
  }, []);

  /**
   * Marque toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await notificationService.markAllAsRead(userId);

      if (result.success) {
        // Mise à jour optimiste locale
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, lue: true }))
        );
        setStats(prev => ({
          ...prev,
          non_lues: 0,
          lues: prev.total
        }));
      }

      return result.success;
    } catch (err) {
      console.error('[useNotifications] Erreur markAllAsRead:', err);
      return false;
    }
  }, [userId]);

  /**
   * Supprime une notification
   */
  const deleteNotification = useCallback(async (notificationId: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await notificationService.deleteNotification(userId, notificationId);

      if (result.success) {
        // Mise à jour optimiste locale
        const deletedNotif = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

        if (deletedNotif) {
          setStats(prev => ({
            total: prev.total - 1,
            non_lues: deletedNotif.lue ? prev.non_lues : Math.max(0, prev.non_lues - 1),
            lues: deletedNotif.lue ? prev.lues - 1 : prev.lues
          }));
        }
      }

      return result.success;
    } catch (err) {
      console.error('[useNotifications] Erreur deleteNotification:', err);
      return false;
    }
  }, [userId, notifications]);

  /**
   * Supprime toutes les notifications
   */
  const deleteAllNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await notificationService.deleteAllNotifications(userId);

      if (result.success) {
        setNotifications([]);
        setStats({ total: 0, non_lues: 0, lues: 0 });
      }

      return result.success;
    } catch (err) {
      console.error('[useNotifications] Erreur deleteAllNotifications:', err);
      return false;
    }
  }, [userId]);

  /**
   * Ajoute une nouvelle notification
   */
  const addNotification = useCallback(async (
    titre: string,
    message: string,
    type: NotificationType
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const result = await notificationService.addNotification(userId, titre, message, type);

      if (result.success) {
        // Rafraîchir pour obtenir la nouvelle notification avec son ID
        await refresh();
      }

      return result.success;
    } catch (err) {
      console.error('[useNotifications] Erreur addNotification:', err);
      return false;
    }
  }, [userId, refresh]);

  // Chargement initial
  useEffect(() => {
    if (autoFetch && userId) {
      refresh();
    }
  }, [autoFetch, userId, refresh]);

  // Rafraîchissement automatique
  useEffect(() => {
    if (!refreshInterval || !userId) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, userId, refresh]);

  return {
    notifications,
    stats,
    loading,
    error,
    unreadCount: stats.non_lues,
    // Actions
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    addNotification
  };
}

export default useNotifications;
