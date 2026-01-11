# Architecture Détaillée FayClick V2

Ce document contient les détails techniques approfondis des systèmes complexes de FayClick V2.

## Table des matières
- [Système de Paiement Wallet](#système-de-paiement-wallet-omwavefree)
- [Système d'Abonnements](#système-dabonnements-structures)
- [Système VenteFlash](#système-venteflash-ventes-rapides)
- [Composants Clés Panier & Vente](#composants-clés-panier--vente)
- [Système PWA](#système-pwa)
- [Gestion du Cache & Déploiement](#gestion-du-cache--déploiement)

---

## Système de Paiement Wallet (OM/WAVE/FREE)

### Architecture Séparée Factures vs Abonnements
**CRITIQUE** : Ne jamais mélanger les workflows factures et abonnements

- **`payment-wallet.service.ts`** contient **2 méthodes distinctes** :
  - `createPayment(method, context)` - Pour **factures** uniquement
  - `createSubscriptionPaymentDirect(params)` - Pour **abonnements** uniquement

### Spécificités Orange Money (OM)
- **2 liens de paiement** (vs 1 pour WAVE/FREE) :
  - `response.om` : Deeplink app Orange Money (Ouvrir Orange Money)
  - `response.maxit` : Lien web MaxIt (Payer via MaxIt Web)
- **UI** : Afficher **2 boutons orange** avec gradients différenciés
- **Validation stricte** : Numéro doit commencer par 77 ou 78

### Contraintes Techniques Paiements
- **Référence paiement** : Max **19 caractères** (ex: `ABO-139-1759523454`)
  - Format : `ABO-{id_structure}-{timestamp_10digits}`
  - Dépasser 19 caractères → HTTP 400 sur tous wallets
- **Timeout polling** : 90s pour abonnements, 120s pour factures
- **Endpoint API** : `/add_payement` (pas `/create_payment`)

### Workflow Paiement Abonnement
```typescript
1. Utilisateur sélectionne MENSUEL/ANNUEL
2. Sélection wallet (OM/WAVE/FREE)
3. createSubscriptionPaymentDirect({
     idStructure,
     typeAbonnement,
     montant,
     methode,
     nomStructure,    // Vrai nom depuis structure
     telStructure     // mobile_om ou mobile_wave
   })
4. Affichage QR Code + liens paiement
5. Polling statut (5s interval, 90s timeout)
6. Si COMPLETED → createSubscription(uuid_paiement)
7. Modal SUCCESS → callback onSuccess()
```

### Gestion QR Code & URLs
```typescript
// Extraction conditionnelle selon wallet
if (method === 'OM') {
  setOmDeeplink(response.om || null);
  setMaxitUrl(response.maxit || null);
  setPaymentUrl(null);
} else {
  setPaymentUrl(extractPaymentUrl(response, method));
  setOmDeeplink(null);
  setMaxitUrl(null);
}
```

### Composants Paiement Wallet
- **`ModalPaiementAbonnement.tsx`** : Paiement abonnements avec workflow complet
- **`ModalPaiementQRCode.tsx`** : Paiement factures avec QR + polling
- **QR Code dépliable** : Accordéon avec animation Framer Motion
- **Dual buttons OM** : App + Web pour Orange Money uniquement

---

## Système d'Abonnements Structures

### Formules Disponibles
- **MENSUEL** : Calcul dynamique selon jours du mois (28-31 jours × 100 FCFA)
- **ANNUEL** : Somme 12 mois - 120 FCFA de réduction (10 FCFA/mois économie)

### Workflow Abonnement Complet
```typescript
1. calculateAmount(type, date_debut?) → Montant en FCFA
2. Affichage formules avec montants calculés
3. Sélection formule + méthode paiement
4. Création paiement wallet (voir section Paiement Wallet)
5. Polling jusqu'à statut COMPLETED
6. createSubscription({
     id_structure,
     type_abonnement,
     methode,
     uuid_paiement  // OBLIGATOIRE après polling COMPLETED
   })
7. PostgreSQL crée abonnement + annule ancien si actif
```

### États Abonnement
- **ACTIF** : En cours, date_fin > aujourd'hui
- **EXPIRE** : Terminé, date_fin < aujourd'hui
- **EN_ATTENTE** : Paiement initié mais non complété
- **ANNULE** : Remplacé par nouveau (forcer_remplacement=true)

### Règles de Gestion PostgreSQL
- **1 seul abonnement ACTIF** par structure à la fois
- **Chevauchement interdit** : Nouveau annule automatiquement l'ancien
- **Renouvellement** : date_debut = date_fin ancien + 1 jour
- **Calcul montant** : 100 FCFA/jour (tarification dynamique)

---

## Système VenteFlash (Ventes Rapides)

### Architecture VenteFlash
Module dédié aux ventes ultra-rapides avec client anonyme et encaissement CASH immédiat.

**Composants** :
- `app/dashboard/commerce/venteflash/page.tsx` - Page principale VenteFlash
- `components/venteflash/VenteFlashHeader.tsx` - Header avec panier + actions
- `components/venteflash/PanierVenteFlash.tsx` - Panier simplifié client anonyme
- `components/venteflash/VenteFlashStatsCards.tsx` - Statistiques jour en 3×1
- `components/venteflash/VenteFlashListeVentes.tsx` - Liste ventes du jour
- `components/venteflash/VenteCarteVente.tsx` - Carte vente individuelle

### Workflow Vente Flash
```typescript
1. Scan/Recherche produits → Ajout panier (panierStore)
2. Clic panier → PanierVenteFlash s'ouvre (sidebar right)
3. Ajuster quantités + saisir remise optionnelle
4. Clic "Sauver" → 2 étapes séquentielles :

   // Étape 1 : Créer facture avec factureService
   const result = await factureService.createFacture(
     articles,
     {
       nom_client_payeur: 'CLIENT_ANONYME',
       tel_client: '000000000',
       description: 'Vente Flash'
     },
     { remise: remise || 0, acompte: 0 },
     false // Sans frais
   );

   // Étape 2 : Enregistrer encaissement CASH avec add_acompte_facture
   const transactionId = `CASH-${id_structure}-${Date.now()}`;
   await database.query(`
     SELECT * FROM add_acompte_facture(
       ${id_structure},
       ${id_facture},
       ${montant_total},
       '${transactionId}',
       'face2face'
     )
   `);

5. Panier se ferme → ModalRecuGenere s'affiche
6. Liste ventes se rafraîchit automatiquement
```

### Points Critiques VenteFlash
- **Ne PAS utiliser `ModalPanier`** standard (trop complexe avec client)
- **Toujours client anonyme** : `CLIENT_ANONYME` / `000000000`
- **Transaction ID format strict** : `CASH-{id_structure}-{timestamp}`
- **UUID fixe** : `'face2face'` pour paiements directs
- **2 étapes obligatoires** : createFacture() puis add_acompte_facture()
- **Afficher reçu** (pas facture) pour ventes flash
- **Auto-refresh** liste après chaque vente

---

## Composants Clés Panier & Vente

### ModalPanier.tsx
Modal panier avec section client redesignée :
- Label client avec bouton éditer
- Bouton Annuler (rouge) + Commander (bleu) en grille 2×1
- Réinitialisation auto si articles supprimés

### PanierVenteFlash.tsx
Panier simplifié pour ventes ultra-rapides :
- **Client anonyme par défaut** (pas de sélection client nécessaire)
- Affichage articles + contrôles quantité + remise
- Sous-total et total calculés automatiquement
- **Workflow 2 étapes** : `factureService.createFacture()` + `add_acompte_facture()` pour CASH
- Affiche reçu (`ModalRecuGenere`) au lieu de facture
- Sidebar avec animation slide-in (Framer Motion)
- Boutons : Annuler (rouge - vider + fermer) / Sauver (vert - créer vente)

### ModalRechercheClient.tsx
Recherche intelligente client :
- Auto-recherche à 9 chiffres saisis
- Badge vert (client trouvé) / bleu (nouveau)
- Nom verrouillé si client existant
- Formatage téléphone : 77 123 45 67

### CarteProduit.tsx
Carte produit cliquable :
- Clic sur carte → ouvre modal édition
- Boutons avec `e.stopPropagation()` pour actions spécifiques
- Contrôles quantité + stock disponible

---

## Système PWA

### Service Worker (`public/service-worker.js`)
- Version actuelle : **v2.7.0 (2026-01-02)**
- Cache : `fayclick-v2-cache-v2.7-20260102`
- **IMPORTANT** : Mettre à jour la version cache lors de changements majeurs
- Routes publiques exclues : `/facture`, `/fay`, `/login`, `/register`
- Icône : `/fayclick.ico` (plus `/favicon.ico`)

### Installation PWA (`components/pwa/PWAInstallProvider.tsx`)
- Prompt intelligent après 2s sur pages privées
- Badge permanent après 5s si non installé
- Max 3 fermetures, délai 7 jours entre prompts
- Exclusion automatique des pages publiques

### Background Sync (`hooks/useBackgroundSync.ts`)
- Synchronisation automatique des requêtes offline
- IndexedDB pour stockage des requêtes en attente
- Support factures et paiements
- Hook React : `useBackgroundSync()`
```typescript
const { saveForSync, triggerSync, status } = useBackgroundSync();
// Sauvegarder une requête pour sync ultérieure
await saveForSync(createFactureRequest(apiUrl, data));
```

### Headers de Sécurité (`.htaccess`)
- CSP (Content Security Policy) configuré
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy pour caméra, géolocalisation

### Assets PWA Requis (voir `public/PWA-ASSETS-GUIDE.md`)
- `icon-192-maskable.png` et `icon-512-maskable.png` (à créer)
- `screenshots/dashboard-wide.png` (1280x720) (à créer)
- `screenshots/dashboard-mobile.png` (750x1334) (à créer)

---

## Gestion du Cache & Déploiement

### Forcer mise à jour PWA
Quand les utilisateurs ne voient pas les changements après déploiement :

1. **Mettre à jour Service Worker version** :
```javascript
// public/service-worker.js
const CACHE_NAME = 'fayclick-v2-cache-v2.7-YYYYMMDD';
```

2. **Rebuild + déploiement** :
```bash
rm -rf .next && npm run deploy:build
```

3. **Côté utilisateur** :
   - DevTools (F12) → Application → Service Workers → Update
   - Ou désinstaller PWA + Clear site data + réinstaller

### Workflow Déploiement Standard
```bash
# 1. Nettoyage cache local
rm -rf .next

# 2. Build + déploiement complet
npm run deploy:build

# 3. Vérifier sur https://v2.fayclick.net
# 4. Hard refresh : Ctrl + Shift + R
```
