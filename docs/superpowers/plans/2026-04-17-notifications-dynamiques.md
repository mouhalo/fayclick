# Notifications Dynamiques Paiements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alerter les marchands Commerce et Prestataires en temps réel quand un paiement est reçu, via une cloche pulsante orange et un drawer latéral animé.

**Architecture:** Hook dédié `usePaymentNotifications` poll l'API toutes les 15s, compare les IDs pour détecter les nouveaux paiements (`paiement` et `commande`), puis déclenche un son Web Audio et ouvre un `PaymentDrawer` (Framer Motion slide-in depuis la droite). Aucun changement backend.

**Tech Stack:** React hooks, Framer Motion (déjà installé), Web Audio API (natif), Tailwind CSS, i18n maison (`useTranslations`)

**Branche cible:** `feature/notifications-dynamiques-paiements`

---

## File Map

| Action | Fichier | Responsabilité |
|--------|---------|----------------|
| Créer | `hooks/usePaymentNotifications.ts` | Poll 15s, détection IDs, son, état drawer |
| Créer | `components/notifications/PaymentDrawer.tsx` | Drawer latéral animé, liste paiements |
| Modifier | `messages/fr.json` | Namespace `notifications` FR |
| Modifier | `messages/en.json` | Namespace `notifications` EN |
| Modifier | `app/dashboard/commerce/page.tsx` | Hook + cloche mobile + montage drawer |
| Modifier | `components/dashboard/CommerceDashboardDesktop.tsx` | Props cloche desktop + cloche pulsante |
| Modifier | `app/dashboard/services/page.tsx` | Hook + cloche + montage drawer |

---

## Task 1 — Hook `usePaymentNotifications`

**Files:**
- Create: `hooks/usePaymentNotifications.ts`

- [ ] **Créer le hook complet**

```typescript
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
```

- [ ] **Commit**

```bash
git add hooks/usePaymentNotifications.ts
git commit -m "✨ feat(notif): hook usePaymentNotifications — poll 15s + détection paiements"
```

---

## Task 2 — Composant `PaymentDrawer`

**Files:**
- Create: `components/notifications/PaymentDrawer.tsx`

- [ ] **Créer le composant complet**

```tsx
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
}: {
  notification: Notification;
  onMarkRead: (id: number) => Promise<boolean>;
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
          : 'bg-white/5 border border-white/8'
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
          <span className="text-white font-bold text-sm">{amount}</span>
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
          {!isNew && <span className="ml-1">• Lu</span>}
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
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                  <span className="text-2xl mb-2">🔔</span>
                  <span>Aucun paiement récent</span>
                </div>
              ) : (
                payments.map(p => (
                  <PaymentItem key={p.id} notification={p} onMarkRead={onMarkRead} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-green-900/40 text-center">
              <button
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
```

- [ ] **Commit**

```bash
git add components/notifications/PaymentDrawer.tsx
git commit -m "✨ feat(notif): composant PaymentDrawer — drawer latéral animé paiements"
```

---

## Task 3 — Clés i18n

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Ajouter le namespace `notifications` dans `messages/fr.json`**

Ouvrir `messages/fr.json`. Avant la dernière `}` du fichier, ajouter (après la virgule de la dernière clé existante) :

```json
  "notifications": {
    "drawerTitle": "Paiements reçus",
    "viewAll": "Voir toutes les notifications",
    "timeAgo": "Il y a {time}",
    "justNow": "À l'instant",
    "read": "Lu"
  }
```

- [ ] **Ajouter le namespace `notifications` dans `messages/en.json`**

Même emplacement dans `messages/en.json` :

```json
  "notifications": {
    "drawerTitle": "Payments received",
    "viewAll": "View all notifications",
    "timeAgo": "{time} ago",
    "justNow": "Just now",
    "read": "Read"
  }
```

- [ ] **Vérifier la parité des clés (obligatoire)**

```bash
node -e "
const fr = require('./messages/fr.json');
const en = require('./messages/en.json');
const frKeys = Object.keys(fr.notifications || {}).sort().join(',');
const enKeys = Object.keys(en.notifications || {}).sort().join(',');
console.log('FR:', frKeys);
console.log('EN:', enKeys);
console.log('Parité:', frKeys === enKeys ? 'OK ✅' : 'ERREUR ❌');
"
```

Résultat attendu : `Parité: OK ✅`

- [ ] **Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "✨ feat(i18n): namespace notifications FR/EN pour PaymentDrawer"
```

---

## Task 4 — Intégration Commerce (mobile + desktop)

**Files:**
- Modify: `app/dashboard/commerce/page.tsx`
- Modify: `components/dashboard/CommerceDashboardDesktop.tsx`

### 4a — Page Commerce mobile

- [ ] **Ajouter les imports en haut de `app/dashboard/commerce/page.tsx`**

Après la ligne `import { useTranslations } from '@/hooks/useTranslations';` :

```tsx
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';
import { PaymentDrawer } from '@/components/notifications/PaymentDrawer';
```

- [ ] **Ajouter le hook après le hook `useNotifications` existant** (vers ligne 80)

Après le bloc `useNotifications` :

```tsx
// Hook notifications paiements (poll 15s, drawer automatique)
const {
  newPayments,
  hasNew,
  drawerOpen,
  setDrawerOpen,
  unreadCount: paymentUnreadCount,
  markAsRead: markPaymentAsRead,
} = usePaymentNotifications({ userId: user?.id || 0 });
```

- [ ] **Remplacer le bouton cloche mobile** (vers ligne 248-264 de `commerce/page.tsx`)

Remplacer le bloc `<motion.button ... 🔔 ...>` du header mobile par :

```tsx
{/* Bouton Notifications — pulse orange si nouveaux paiements */}
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all relative ${
    hasNew
      ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_0_16px_rgba(245,158,11,0.6)]'
      : 'bg-white/20 hover:bg-white/30'
  }`}
  onClick={() => hasNew ? setDrawerOpen(true) : setShowNotificationsModal(true)}
>
  {/* Anneaux de pulse (uniquement si nouveaux paiements) */}
  {hasNew && (
    <>
      <span className="absolute inset-0 rounded-full bg-amber-400 opacity-40 animate-ping" />
      <span className="absolute -inset-1 rounded-full border-2 border-amber-400/40 animate-ping [animation-delay:0.3s]" />
    </>
  )}
  <span className="text-xl relative z-10">🔔</span>
  {(paymentUnreadCount > 0 || notificationCount > 0) && (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold z-10"
    >
      {(paymentUnreadCount || notificationCount) > 9 ? '9+' : (paymentUnreadCount || notificationCount)}
    </motion.div>
  )}
</motion.button>
```

- [ ] **Monter le `PaymentDrawer` dans le JSX mobile**

Juste avant la dernière balise `</>` du bloc mobile (après le dernier `</ModalNotifications>`) :

```tsx
{/* Drawer paiements reçus */}
<PaymentDrawer
  isOpen={drawerOpen}
  payments={newPayments}
  onClose={() => setDrawerOpen(false)}
  onMarkRead={markPaymentAsRead}
  onViewAll={() => { setDrawerOpen(false); setShowNotificationsModal(true); }}
/>
```

- [ ] **Commit partiel (mobile uniquement)**

```bash
git add app/dashboard/commerce/page.tsx
git commit -m "✨ feat(notif): cloche pulsante + PaymentDrawer — dashboard Commerce mobile"
```

### 4b — Dashboard Commerce desktop

- [ ] **Ajouter les nouvelles props à l'interface dans `CommerceDashboardDesktop.tsx`**

Dans l'interface `CommerceDashboardDesktopProps` (vers le début du fichier) :

```tsx
hasNewPayments?: boolean;
onBellAlertClick?: () => void;
```

- [ ] **Déstructurer les nouvelles props dans la fonction composant**

Dans la signature de `CommerceDashboardDesktop(...)` :

```tsx
hasNewPayments = false,
onBellAlertClick,
```

- [ ] **Remplacer le bouton cloche desktop** (vers ligne 376)

Remplacer le bouton cloche existant dans `CommerceDashboardDesktop` par :

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onClick={hasNewPayments && onBellAlertClick ? onBellAlertClick : onShowNotificationsModal}
  className={`relative p-2 rounded-full transition-all ${
    hasNewPayments
      ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_0_16px_rgba(245,158,11,0.5)]'
      : 'bg-white/10 hover:bg-white/20'
  }`}
>
  {hasNewPayments && (
    <span className="absolute inset-0 rounded-full bg-amber-400 opacity-40 animate-ping" />
  )}
  <span className="text-xl relative z-10">🔔</span>
  {notificationCount > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold z-10">
      {notificationCount > 9 ? '9+' : notificationCount}
    </span>
  )}
</motion.button>
```

- [ ] **Passer les nouvelles props depuis `commerce/page.tsx`**

Dans le bloc desktop (où `<CommerceDashboardDesktop ... />` est rendu, vers ligne 163) :

```tsx
<CommerceDashboardDesktop
  user={user}
  notificationCount={paymentUnreadCount || notificationCount}
  canViewCA={canViewCA}
  canAccessFeature={canAccessFeature}
  showAbonnementModal={showAbonnementModal}
  onShowCoffreModal={() => setShowCoffreModal(true)}
  onShowLogoutModal={() => setShowLogoutModal(true)}
  onShowNotificationsModal={() => setShowNotificationsModal(true)}
  onShowProfilModal={() => window.dispatchEvent(new Event('openProfileModal'))}
  isTablet={!isDesktopLarge}
  hasNewPayments={hasNew}
  onBellAlertClick={() => setDrawerOpen(true)}
/>
```

- [ ] **Monter le `PaymentDrawer` dans le bloc desktop** (dans le `<>...</>` desktop, après `</ModalCoffreFort>`) :

```tsx
{/* Drawer paiements reçus (desktop) */}
<PaymentDrawer
  isOpen={drawerOpen}
  payments={newPayments}
  onClose={() => setDrawerOpen(false)}
  onMarkRead={markPaymentAsRead}
  onViewAll={() => { setDrawerOpen(false); setShowNotificationsModal(true); }}
/>
```

- [ ] **Commit**

```bash
git add app/dashboard/commerce/page.tsx components/dashboard/CommerceDashboardDesktop.tsx
git commit -m "✨ feat(notif): cloche pulsante + PaymentDrawer — dashboard Commerce desktop"
```

---

## Task 5 — Intégration Prestataires

**Files:**
- Modify: `app/dashboard/services/page.tsx`

- [ ] **Ajouter les imports dans `app/dashboard/services/page.tsx`**

Après la ligne `import { useNotifications } from '@/hooks/useNotifications';` :

```tsx
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';
import { PaymentDrawer } from '@/components/notifications/PaymentDrawer';
```

- [ ] **Ajouter le hook après le hook `useNotifications` existant** (vers ligne 42)

```tsx
// Hook notifications paiements (poll 15s, drawer automatique)
const {
  newPayments,
  hasNew,
  drawerOpen,
  setDrawerOpen,
  unreadCount: paymentUnreadCount,
  markAsRead: markPaymentAsRead,
} = usePaymentNotifications({ userId: user?.id || 0 });
```

- [ ] **Remplacer le bouton cloche** (vers ligne 178-194 de `services/page.tsx`)

Remplacer le bloc `<motion.button ... 🔔 ...>` par :

```tsx
{/* Bouton Notifications — pulse orange si nouveaux paiements */}
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all relative ${
    hasNew
      ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_0_16px_rgba(245,158,11,0.6)]'
      : 'bg-white/20 hover:bg-white/30'
  }`}
  onClick={() => hasNew ? setDrawerOpen(true) : handleNotifications()}
>
  {hasNew && (
    <>
      <span className="absolute inset-0 rounded-full bg-amber-400 opacity-40 animate-ping" />
      <span className="absolute -inset-1 rounded-full border-2 border-amber-400/40 animate-ping [animation-delay:0.3s]" />
    </>
  )}
  <span className="text-xl relative z-10">🔔</span>
  {(paymentUnreadCount > 0 || notificationCount > 0) && (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold z-10"
    >
      {(paymentUnreadCount || notificationCount) > 9 ? '9+' : (paymentUnreadCount || notificationCount)}
    </motion.div>
  )}
</motion.button>
```

- [ ] **Monter le `PaymentDrawer`** (juste avant la dernière `</>` du JSX principal) :

```tsx
{/* Drawer paiements reçus */}
<PaymentDrawer
  isOpen={drawerOpen}
  payments={newPayments}
  onClose={() => setDrawerOpen(false)}
  onMarkRead={markPaymentAsRead}
  onViewAll={() => { setDrawerOpen(false); setShowNotificationsModal(true); }}
/>
```

- [ ] **Commit**

```bash
git add app/dashboard/services/page.tsx
git commit -m "✨ feat(notif): cloche pulsante + PaymentDrawer — dashboard Prestataires"
```

---

## Task 6 — Vérification build TypeScript

- [ ] **Lancer le check TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Résultat attendu : aucune erreur TypeScript sur les fichiers modifiés.

Si erreur sur `CommerceDashboardDesktopProps` → vérifier que les nouvelles props sont bien dans l'interface ET la déstructuration.

Si erreur sur `Notification.type` → vérifier que `'paiement' | 'commande'` sont dans `NotificationType` dans `types/notification.ts` (ils y sont déjà).

- [ ] **Vérifier le lint**

```bash
npm run lint 2>&1 | grep -E "error|warning" | head -20
```

Résultat attendu : 0 erreur.

- [ ] **Commit fix si nécessaire**

```bash
git add -A
git commit -m "🐛 fix(notif): correction erreurs TypeScript/lint"
```

---

## Critères d'acceptation

- [ ] Nouveaux paiements détectés en ≤ 15s
- [ ] Cloche pulse orange (2 anneaux animés) dès détection
- [ ] Son discret joué une fois par groupe de nouveaux paiements
- [ ] Drawer slide-in depuis la droite avec thème vert sombre
- [ ] Items : montant · badge méthode coloré (OM orange, WAVE bleu, FREE violet) · 📞 n° tél · temps écoulé
- [ ] Point vert sur items non lus, disparaît au clic (markAsRead optimiste)
- [ ] Fermeture : clic overlay, touche Echap, bouton ✕
- [ ] "Voir toutes" → ferme drawer + ouvre ModalNotifications existant
- [ ] Premier poll silencieux (pas d'alerte au chargement)
- [ ] Dashboards Scolaire & Immobilier inchangés
- [ ] Textes drawer traduits FR/EN via `useTranslations('notifications')`
- [ ] Build TypeScript sans erreur
