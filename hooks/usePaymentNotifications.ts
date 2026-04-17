// hooks/usePaymentNotifications.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/types/notification';

interface UsePaymentNotificationsOptions {
  userId: number;
}

interface UsePaymentNotificationsReturn {
  newPayments: Notification[];
  hasNew: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  unreadCount: number;
  markAsRead: (id: number) => Promise<boolean>;
  clearNew: () => void;
}

const PAYMENT_TYPES = ['paiement', 'commande'] as const;
const POLL_INTERVAL_MS = 15_000;

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext non disponible (SSR, navigateur restreint)
  }
}

export function usePaymentNotifications({
  userId
}: UsePaymentNotificationsOptions): UsePaymentNotificationsReturn {
  const [newPayments, setNewPayments] = useState<Notification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousIds = useRef<Set<number>>(new Set());
  const isFirstPoll = useRef(true);

  const fetchAndDetect = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await notificationService.getNotifications(userId, 50, 0, false);

      // Mettre à jour le badge total non lus
      setUnreadCount(response.stats.non_lues);

      // Filtrer uniquement les types paiement/commande
      const payments = response.notifications.filter(n =>
        PAYMENT_TYPES.includes(n.type as typeof PAYMENT_TYPES[number])
      );

      if (isFirstPoll.current) {
        // Premier poll : initialiser silencieusement sans déclencher d'alerte
        previousIds.current = new Set(payments.map(n => n.id));
        isFirstPoll.current = false;
        return;
      }

      const newOnes = payments.filter(n => !previousIds.current.has(n.id));

      if (newOnes.length > 0) {
        setNewPayments(prev => [...newOnes, ...prev].slice(0, 10));
        setDrawerOpen(true);
        playNotificationSound();
      }

      previousIds.current = new Set(payments.map(n => n.id));
    } catch {
      // Erreur réseau : on attend le prochain poll
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: number): Promise<boolean> => {
    try {
      const result = await notificationService.markAsRead(notificationId);
      if (result.success) {
        setNewPayments(prev =>
          prev.map(n => n.id === notificationId ? { ...n, lue: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const clearNew = useCallback(() => {
    setNewPayments([]);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchAndDetect();
    const interval = setInterval(fetchAndDetect, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, fetchAndDetect]);

  return {
    newPayments,
    hasNew: newPayments.some(n => !n.lue),
    drawerOpen,
    setDrawerOpen,
    unreadCount,
    markAsRead,
    clearNew,
  };
}

export default usePaymentNotifications;
