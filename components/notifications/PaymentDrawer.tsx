// components/notifications/PaymentDrawer.tsx
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import type { Notification } from '@/types/notification';

interface PaymentDrawerProps {
  isOpen: boolean;
  payments: Notification[];
  onClose: () => void;
  onMarkRead: (id: number) => Promise<boolean>;
  onViewAll: () => void;
}

// Couleurs par méthode extraite du message
const METHOD_COLORS: Record<string, { bg: string; label: string }> = {
  OM:   { bg: '#ea580c', label: 'OM' },
  WAVE: { bg: '#2563eb', label: 'WAVE' },
  FREE: { bg: '#7c3aed', label: 'FREE' },
  CASH: { bg: '#16a34a', label: 'CASH' },
};

function extractMethod(message: string): { bg: string; label: string } {
  const upper = message.toUpperCase();
  if (upper.includes('ORANGE') || upper.includes(' OM')) return METHOD_COLORS.OM;
  if (upper.includes('WAVE')) return METHOD_COLORS.WAVE;
  if (upper.includes('FREE')) return METHOD_COLORS.FREE;
  return METHOD_COLORS.CASH;
}

function extractPhone(message: string): string {
  const match = message.match(/\b(7[0-9]{8})\b/);
  return match ? match[1] : '—';
}

function extractAmount(message: string): string {
  const match = message.match(/(\d[\d\s]+)\s*FCFA/i);
  return match ? match[1].trim() + ' FCFA' : '';
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `Il y a ${diff}s`;
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  return `Il y a ${Math.floor(diff / 3600)}h`;
}

function PaymentItem({
  notification,
  onMarkRead,
  readLabel,
}: {
  notification: Notification;
  onMarkRead: (id: number) => Promise<boolean>;
  readLabel: string;
}) {
  const method = extractMethod(notification.message);
  const phone = extractPhone(notification.message);
  const amount = extractAmount(notification.message);
  const isNew = !notification.lue;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl p-3 mb-2 flex items-center gap-3 cursor-pointer transition-all ${
        isNew
          ? 'bg-green-900/40 border border-green-500/30'
          : 'bg-white/5 border border-white/10'
      }`}
      onClick={() => isNew && onMarkRead(notification.id)}
    >
      {/* Icône méthode */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${method.bg}cc, ${method.bg})` }}
      >
        💸
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white font-bold text-sm">{amount || '—'}</span>
          <span
            className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: method.bg }}
          >
            {method.label}
          </span>
        </div>
        <div className="text-green-300 text-xs">📞 {phone}</div>
        <div className="text-slate-500 text-[10px] mt-0.5">
          {timeAgo(notification.date_creation)}
          {!isNew && <span className="ml-1">• {readLabel}</span>}
        </div>
      </div>

      {/* Point non lu */}
      {isNew && (
        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 shadow-[0_0_8px_#4ade80]" />
      )}
    </motion.div>
  );
}

export function PaymentDrawer({
  isOpen,
  payments,
  onClose,
  onMarkRead,
  onViewAll,
}: PaymentDrawerProps) {
  const t = useTranslations('notifications');

  // Fermeture au clavier Echap
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] z-50 flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #052e16 0%, #0a1f15 100%)',
              borderLeft: '1px solid rgba(74, 222, 128, 0.25)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Paiements reçus"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-green-900/40">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_#4ade80] animate-pulse" />
                <span className="text-green-400 font-bold text-sm">
                  {t('drawerTitle')}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                  <span className="text-2xl mb-2">🔔</span>
                  <span>{t('empty')}</span>
                </div>
              ) : (
                <AnimatePresence>
                  {payments.map(p => (
                    <PaymentItem key={p.id} notification={p} onMarkRead={onMarkRead} readLabel={t('read')} />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-green-900/40 text-center">
              <button
                type="button"
                onClick={onViewAll}
                className="text-green-400 text-xs font-semibold hover:text-green-300 transition-colors"
              >
                {t('viewAll')} →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PaymentDrawer;
