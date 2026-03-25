# Multi-Panier VenteFlash Desktop

**Date** : 2026-03-25
**Statut** : Approuvé
**Scope** : Page `/dashboard/commerce/venteflash` — desktop uniquement (≥ 1024px)

## Problème

Les marchands multi-guichets utilisant un PC ne peuvent pas servir le client suivant quand un client part compléter ses achats en rayon. Le panier actif bloque la file d'attente.

## Solution

Système d'onglets permettant jusqu'à 3 paniers simultanés sur la page VenteFlash desktop. Le marchand peut mettre un panier en attente et en créer un nouveau en un clic.

## Contraintes

- **Desktop uniquement** (≥ 1024px) — le mobile garde le comportement actuel
- **Max 3 paniers** simultanés — suffisant car les grands commerces ont plusieurs guichets
- **VenteFlash uniquement** — la page `/produits` n'est pas concernée
- **Zéro impact** sur le `panierStore` existant — isolation totale
- **Client toujours anonyme** — VenteFlash = CLIENT_ANONYME, pas de gestion client par panier

## Architecture

### Nouveau store : `panierVFMultiStore`

**Fichier** : `stores/panierVFMultiStore.ts`

```typescript
interface PanierVF {
  id: number;                // Date.now() à la création (sert aussi de createdAt)
  articles: ArticlePanier[];
  remise: number;
}
```

**Note** : `acompte` retiré de l'interface — VenteFlash passe toujours `acompte = 0` lors de l'encaissement. `infosClient` absent car VenteFlash utilise toujours CLIENT_ANONYME. L'heure d'affichage dans l'onglet est dérivée de `id` via `new Date(panier.id).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })`.

```typescript
interface PanierVFMultiState {
  paniers: PanierVF[];          // Max 3
  activePanierId: number | null;
}
```

**Actions :**
- `createPanier()` → crée un panier vide (id = Date.now()), l'active. Refuse si 3 paniers.
- `switchPanier(id)` → change `activePanierId`
- `closePanier(id)` → supprime le panier, active le suivant s'il existe. Fonctionne sur tout panier (actif ou inactif).
- `addArticle(produit, quantity, prixApplique)` → ajoute au panier actif (même logique que panierStore). Si aucun panier n'existe, en crée un automatiquement avant d'ajouter.
- `removeArticle(id_produit)` → retire du panier actif
- `updateQuantity(id_produit, quantity)` → met à jour dans le panier actif
- `updateRemise(remise)` / `updateRemiseArticle(id_produit, remise)` → sur panier actif
- `clearRemisesArticles()` → remet toutes les remises article à 0 sur le panier actif
- `getActivePanier()` → retourne le panier actif ou null
- `getMontantsFacture()` → calcul sur panier actif (sous_total, remise, montant_net, acompte=0, reste_a_payer)
- `getTotalItems()` → somme des quantités du panier actif
- `clearAll()` → supprime tous les paniers (cleanup navigation)

**Persistance** : localStorage clé `fayclick-paniers-vf`, persist `paniers` et `activePanierId`.

**Initialisation** : Au premier `addArticle`, si `paniers` est vide, crée automatiquement un premier panier avant d'ajouter l'article.

**`vf_remise_mode`** : Le mode remise (%/F) reste global dans localStorage (clé `vf_remise_mode`), partagé entre tous les paniers. C'est le comportement voulu — le mode de saisie est une préférence caissier, pas un état par panier.

### Nouveau composant : `PanierVFTabs`

**Fichier** : `components/venteflash/PanierVFTabs.tsx`

**Emplacement** : Au-dessus du panier inline, visible uniquement en desktop (≥ 1024px).

```
┌─────────────────────┬──────────────────────┬─────┐
│ ● 14h32 — 3 art.   │ ● 15h01 — 1 art.   │  +  │
│   4 750 FCFA        │   2 300 FCFA    ✕   │     │
├─────────────────────┴──────────────────────┴─────┤
│                                                   │
│          PanierVenteFlashInline (actif)           │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Comportement :**
- Chaque onglet : heure de création (HH:mm dérivée de `id`), nombre d'articles, montant total
- Onglet actif : style distinct (fond coloré, bordure basse)
- Bouton `✕` sur onglets inactifs pour fermer/abandonner
- Bouton `✕` sur l'onglet actif visible uniquement s'il y a d'autres paniers (permet d'abandonner le panier courant et basculer sur le suivant)
- Bouton `+` pour créer un nouveau panier (grisé si 3 paniers atteints, texte inline "Max 3" à côté du bouton)
- Clic onglet → `switchPanier(id)`
- Retourne `null` sous 1024px
- **Changement d'onglet pendant modal quantité** : le switch est bloqué tant qu'un modal est ouvert (le modal de quantité/scan doit être fermé avant de changer d'onglet)

### Fichiers modifiés

**`app/dashboard/commerce/venteflash/page.tsx`** :
- Desktop (≥ 1024px) → `panierVFMultiStore` ; Mobile → `panierStore` actuel inchangé
- Ajout de `PanierVFTabs` au-dessus du panier inline (desktop)
- Les callbacks `handleAddToPanier`, `handleConfirmQuantity` utilisent le store multi-panier en desktop
- Cleanup navigation : `clearAll()` du nouveau store en desktop
- Gestion de l'encaissement : voir section dédiée ci-dessous

**`components/venteflash/PanierVenteFlashInline.tsx`** :
- Refactoring pour recevoir les données et callbacks en **props** au lieu de lire `usePanierStore` directement
- Props : `articles`, `remise`, callbacks `onRemoveArticle`, `onUpdateQuantity`, `onUpdateRemise`, `onPaymentComplete`, etc.
- La page parente injecte les données depuis le store approprié (multi-panier en desktop, panierStore en mobile)
- Le composant devient agnostique de la source de données

**`components/venteflash/VenteFlashHeader.tsx`** :
- Le badge compteur panier reçoit `totalItems` en **prop** au lieu de lire `usePanierStore().getTotalItems()` directement
- La page parente passe `getTotalItems()` depuis le store actif

### Fichiers NON modifiés

- `stores/panierStore.ts` — intact
- `components/panier/*` — aucun impact
- Pages `/produits`, `ModalPanier`, `PanierSidePanel` — aucun impact

### Encaissement et reçu post-paiement

**Flux encaissement :**
1. `handlePaymentComplete` est géré par la **page** `venteflash/page.tsx` (pas par `PanierVenteFlashInline`)
2. La page crée la facture, enregistre le paiement
3. La page stocke les données du reçu dans un état local (`recuData`) **avant** de fermer le panier
4. Appelle `closePanier(activePanierId)` → le store active le panier suivant
5. Le modal reçu (`ModalRecuVenteFlash`) s'affiche depuis l'état local de la page — indépendant du cycle de vie du panier

Cela garantit que le reçu reste affiché même après fermeture du panier encaissé.

## Flux utilisateur

1. Marchand ouvre VenteFlash desktop → pas d'onglet visible tant que le panier est vide
2. Premier scan → Panier 1 créé automatiquement, onglet unique affiché
3. Client A part en rayon → Marchand clique `+` → Panier 2 actif, Panier 1 en attente
4. Sert Client B → Encaisse → Reçu affiché → Panier 2 fermé → Panier 1 redevient actif
5. Client A revient → Articles toujours là → Complète et encaisse

## Cas limites

- **3 paniers atteints** : bouton `+` grisé, texte "Max 3" affiché inline
- **Fermer panier inactif** : suppression directe sans confirmation (pas de facture créée)
- **Fermer panier actif** : possible s'il reste d'autres paniers, bascule sur le suivant
- **Encaisser dernier panier** : store vide, onglets masqués, nouveau panier créé au prochain ajout
- **Navigation hors page** : cleanup total, tous les paniers supprimés
- **Pas d'expiration** : paniers persistent jusqu'à fermeture manuelle ou navigation hors page
- **Rechargement page** : paniers restaurés depuis localStorage (pas de re-validation du stock — le stock est vérifié à l'encaissement, pas au chargement)
- **Modal quantité ouvert** : changement d'onglet bloqué tant que le modal est visible
