# Spec — Notifications Dynamiques (Paiements)

**Date** : 2026-04-17
**Branche cible** : `gestion_multilangue_fr_et_en` → puis `main`
**Dashboards concernés** : Commerce, Prestataires de Services

---

## Problème

Le système de notifications actuel poll toutes les 30 secondes et n'affiche aucune alerte proactive. Les marchands ratent les paiements reçus en ligne, ce qui nuit à la réactivité du service (accueil client, confirmation de commande).

---

## Solution retenue

**Approche A — Polling amélioré + Drawer Framer Motion**

- Poll dédié toutes les **15 secondes** pour les types `paiement` et `commande`
- Détection des nouvelles notifs par comparaison d'IDs (`useRef<Set<number>>`)
- Cloche pulsante orange (2 anneaux CSS) quand nouveaux paiements
- Drawer latéral animé (slide depuis la droite, Framer Motion)
- Son discret généré via Web Audio API (aucun fichier externe)
- Zéro modification backend, zéro nouvelle dépendance

---

## Architecture

### Nouveau hook : `usePaymentNotifications`

```typescript
// hooks/usePaymentNotifications.ts
interface UsePaymentNotificationsReturn {
  newPayments: Notification[];   // paiements non encore vus
  hasNew: boolean;               // true si newPayments.length > 0
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  unreadCount: number;           // total non lus (badge cloche)
  markAsRead: (id: number) => Promise<boolean>;
  clearNew: () => void;
}
```

**Logique de détection :**
```typescript
const previousIds = useRef<Set<number>>(new Set());

const detectNew = (incoming: Notification[]) => {
  const paymentTypes = ['paiement', 'commande'];
  const payments = incoming.filter(n => paymentTypes.includes(n.type));
  const newOnes = payments.filter(n => !previousIds.current.has(n.id));

  if (newOnes.length > 0) {
    setNewPayments(prev => [...newOnes, ...prev].slice(0, 10));
    setDrawerOpen(true);
    playNotificationSound();
  }

  // IMPORTANT : initialisation silencieuse au premier poll (isFirstPoll ref)
  previousIds.current = new Set(payments.map(n => n.id));
};
```

**Son (Web Audio API, aucun fichier requis) :**
```typescript
const playNotificationSound = () => {
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
};
```

**Poll :**
```typescript
// Interval 15s, actif uniquement quand userId défini
useEffect(() => {
  if (!userId) return;
  fetchAndDetect(); // premier appel immédiat
  const interval = setInterval(fetchAndDetect, 15_000);
  return () => clearInterval(interval);
}, [userId]);
```

---

### Nouveau composant : `PaymentDrawer`

**Fichier** : `components/notifications/PaymentDrawer.tsx`

**Props :**
```typescript
interface PaymentDrawerProps {
  isOpen: boolean;
  payments: Notification[];
  onClose: () => void;
  onMarkRead: (id: number) => Promise<boolean>;
  onViewAll: () => void;
}
```

**UX :**
- Slide depuis la droite (Framer Motion `x: "100%" → 0`)
- Overlay semi-transparent derrière (backdrop-blur)
- Fermeture : clic overlay, touche Echap, bouton ✕
- Max 10 items listés (les plus récents en premier)
- Chaque item : montant · badge méthode coloré · 📞 numéro tél · temps écoulé · point vert si non lu
- Clic item → `markAsRead(id)` + supprime le point vert (mise à jour optimiste)
- Lien "Voir toutes les notifications →" → ferme drawer + ouvre `ModalNotifications`

**Couleurs par méthode :**
| Méthode | Badge couleur |
|---------|--------------|
| OM (Orange Money) | `#ea580c` orange |
| WAVE | `#2563eb` bleu |
| FREE | `#7c3aed` violet |
| CASH | `#16a34a` vert |

**Thème drawer** :
- Fond : `linear-gradient(160deg, #052e16, #0a1f15)` (vert très sombre)
- Bordure gauche : `rgba(74, 222, 128, 0.25)`
- Texte principal : blanc
- Texte secondaire : `#86efac`
- Point live : `#4ade80` avec `box-shadow: 0 0 8px #4ade80`

---

### Modification : `DashboardHeader`

**`usePaymentNotifications` est appelé au niveau page** — le header reçoit seulement des props dérivées, pas le userId ni le hook.

**Nouvelles props optionnelles :**
```typescript
interface DashboardHeaderProps {
  // ...existant...
  hasNewPayments?: boolean;       // true → cloche orange pulsante
  onBellAlertClick?: () => void;  // onClick cloche quand hasNewPayments
  onNotificationClick: () => void; // onClick cloche état normal
}
```

**Cloche — 2 états :**

*État normal (inchangé) :*
```tsx
<button onClick={onNotificationClick} className="...existing...">
  🔔
  {notificationCount > 0 && <Badge count={notificationCount} />}
</button>
```

*État alerte (nouveaux paiements) :*
```tsx
<button onClick={onBellAlertClick} className="...orange gradient...">
  {/* 2 anneaux CSS pulse */}
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
  🔔
  <Badge count={unreadCount} />
</button>
```

**PaymentDrawer et usePaymentNotifications montés au niveau page** — évite les problèmes de z-index/overflow et garde le header pur (presentational).

---

### Intégration par dashboard

**Commerce** (`app/dashboard/commerce/page.tsx`) :
```tsx
// Hook appelé au niveau page
const {
  newPayments, hasNew, drawerOpen, setDrawerOpen, unreadCount, markAsRead
} = usePaymentNotifications({ userId: user.id });

// Header reçoit les props dérivées
<DashboardHeader
  hasNewPayments={hasNew}
  onBellAlertClick={() => setDrawerOpen(true)}
  onNotificationClick={() => setShowNotifications(true)}
  notificationCount={unreadCount}
  // ...autres props existantes
/>

// Drawer monté hors du header
<PaymentDrawer
  isOpen={drawerOpen}
  payments={newPayments}
  onClose={() => setDrawerOpen(false)}
  onMarkRead={markAsRead}
  onViewAll={() => { setDrawerOpen(false); setShowNotifications(true); }}
/>
```

**Prestataires** (`app/dashboard/services/page.tsx`) : même pattern.

**Scolaire & Immobilier** : aucun changement — `enablePaymentAlerts` absent = comportement actuel.

---

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Créer | `hooks/usePaymentNotifications.ts` |
| Créer | `components/notifications/PaymentDrawer.tsx` |
| Modifier | `components/dashboard/DashboardHeader.tsx` |
| Modifier | `app/dashboard/commerce/page.tsx` |
| Modifier | `app/dashboard/services/page.tsx` |

**Non modifiés** :
- `services/notification.service.ts`
- `hooks/useNotifications.ts`
- `components/notifications/ModalNotifications.tsx`
- `types/notification.ts`
- Dashboards Scolaire & Immobilier

---

## Contraintes & garde-fous

- **Premier poll silencieux** : initialiser `previousIds` sans déclencher d'alerte au montage
- **AudioContext** : créer à la demande (pas au montage) pour respecter la politique autoplay navigateur
- **Drawer fermé** : le poll continue en arrière-plan, `newPayments` s'accumule, le drawer s'ouvre à la prochaine détection
- **Pas de doublon** : si le drawer est déjà ouvert, ajouter les nouveaux items en tête sans rouvrir
- **Cleanup** : `clearInterval` au démontage du composant
- **Types PostgreSQL** : `paiement` et `commande` sont les seuls types déclencheurs — `abonnement`, `retrait`, `system` sont ignorés par ce hook
- **i18n** : tous les textes du drawer doivent passer par `useTranslations('notifications')` — namespace à créer dans `fr.json` et `en.json`

---

## Clés i18n requises (namespace `notifications`)

```json
{
  "notifications": {
    "drawerTitle": "Paiements reçus",
    "viewAll": "Voir toutes les notifications",
    "timeAgo": "Il y a {time}",
    "justNow": "À l'instant",
    "read": "Lu"
  }
}
```

---

## Critères d'acceptation

- [ ] Nouveaux paiements détectés en ≤ 15s après confirmation
- [ ] Cloche pulse orange avec 2 anneaux animés dès qu'un paiement arrive
- [ ] Son discret joué une seule fois par groupe de nouveaux paiements
- [ ] Drawer s'ouvre automatiquement avec les items corrects (montant, méthode, tél, temps)
- [ ] Badge couleur correct par méthode (OM/WAVE/FREE/CASH)
- [ ] Clic item → point vert disparaît (markAsRead)
- [ ] Fermeture drawer : clic overlay, Echap, bouton ✕
- [ ] "Voir toutes" → ouvre ModalNotifications existant
- [ ] Premier poll silencieux (pas d'alerte au chargement initial)
- [ ] Dashboards Scolaire & Immobilier inchangés
- [ ] Textes drawer traduits FR/EN
