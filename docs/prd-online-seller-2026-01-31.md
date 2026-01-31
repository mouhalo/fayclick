# PRD - Online Seller : Vente en ligne via QR Code / Lien Public

**Version:** 1.0
**Date:** 31 janvier 2026
**Auteur:** Product Manager (BMAD)
**Projet:** FayClick V2
**Branche:** `online_seller`
**Statut:** Draft - En attente validation

---

## 1. Résumé Exécutif

La vente en ligne via réseaux sociaux (WhatsApp, TikTok, Facebook) explose au Sénégal. Les marchands partagent déjà leurs produits sur ces plateformes, mais sans moyen de paiement intégré. FayClick doit leur offrir la possibilité de générer un **lien public / QR code par produit**, permettant à leurs clients d'acheter et payer directement en ligne via Orange Money ou Wave, **sans aucune connexion requise**.

### Proposition de valeur
> Un marchand FayClick peut transformer chaque produit en point de vente en ligne en un seul clic : générer un QR code, le partager sur WhatsApp/TikTok, et encaisser automatiquement via mobile money.

---

## 2. Objectifs Business

| # | Objectif | Métrique de succès |
|---|----------|--------------------|
| OBJ-1 | Augmenter le volume de ventes des marchands via canaux sociaux | +20% de factures créées via canal "ONLINE" dans les 3 mois |
| OBJ-2 | Attirer de nouveaux marchands grâce à cette fonctionnalité différenciante | +15% de nouvelles inscriptions mentionnant "vente en ligne" |
| OBJ-3 | Réduire les frictions de paiement pour les acheteurs en ligne | Taux de conversion paiement > 60% sur les factures ONLINE |

---

## 3. Personas

### Persona 1 : Marchand Social Seller (Fatou)
- **Profil** : Commerçante 25-45 ans, vend vêtements/cosmétiques
- **Canaux** : WhatsApp (groupes), TikTok, Facebook
- **Besoin** : Partager ses produits avec un moyen de paiement intégré
- **Frustration** : Gère les commandes manuellement par messages, perd des ventes

### Persona 2 : Acheteur Mobile (Moussa)
- **Profil** : Consommateur 18-40 ans, smartphone Android
- **Canaux** : Scroll TikTok, groupes WhatsApp
- **Besoin** : Acheter rapidement ce qu'il voit en ligne
- **Frustration** : Trop d'étapes entre voir un produit et le payer

---

## 4. Flux Utilisateurs

### Flux 1 : Marchand - Générer et partager un lien produit

```
┌─────────────────────────────────────────────────────────┐
│  MARCHAND (authentifié dans FayClick)                   │
│                                                         │
│  1. Page Gestion Produits                               │
│     └─ Clic bouton QR sur carte produit                 │
│                                                         │
│  2. Modal "Partager ce produit"                         │
│     ├─ QR Code affiché (grand, scannable)               │
│     ├─ Lien copiable : v2.fayclick.net/produit?token=X  │
│     ├─ Bouton "Copier le lien" (clipboard)              │
│     ├─ Bouton "Partager sur WhatsApp"                   │
│     └─ Bouton "Télécharger QR" (image PNG)              │
│                                                         │
│  3. Marchand partage sur ses réseaux sociaux             │
└─────────────────────────────────────────────────────────┘
```

### Flux 2 : Acheteur - Acheter via lien public

```
┌─────────────────────────────────────────────────────────┐
│  ACHETEUR (aucune connexion requise)                    │
│                                                         │
│  1. Scan QR / Clic lien                                 │
│     └─ Ouverture v2.fayclick.net/produit?token=XXXX     │
│                                                         │
│  2. Page Produit Public                                 │
│     ├─ Photo produit (si disponible)                    │
│     ├─ Nom, prix, description                           │
│     ├─ Nom de la boutique (structure)                   │
│     ├─ Sélecteur quantité (1 par défaut)                │
│     ├─ Montant total calculé                            │
│     ├─ Champ Prénom (obligatoire)                       │
│     ├─ Champ Téléphone (obligatoire, 9 chiffres)        │
│     └─ 2 boutons paiement : [Orange Money] [Wave]      │
│                                                         │
│  3. Paiement Mobile                                     │
│     ├─ QR code wallet affiché                           │
│     ├─ Polling 2 min (même système existant)            │
│     └─ Confirmation paiement                            │
│                                                         │
│  4. Succès                                              │
│     ├─ Facture créée automatiquement                    │
│     ├─ Reçu affiché à l'écran                           │
│     └─ Option : "Voir mon reçu" (lien /recu)           │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Exigences Fonctionnelles (FRs)

### FR-001 : Génération de token produit

**Priorité :** Must Have

**Description :**
Le système doit générer un token encodé en Base64 URL-safe contenant `{id_structure}-{id_produit}` quand le marchand clique sur le bouton QR d'un produit. Le pattern existant de `lib/url-encoder.ts` (encodeFactureParams) doit être étendu avec une nouvelle fonction `encodeProduitParams(id_structure, id_produit)`.

**Acceptance Criteria :**
- [ ] Fonction `encodeProduitParams(id_structure, id_produit)` créée dans `lib/url-encoder.ts`
- [ ] Fonction `decodeProduitParams(token)` retourne `{ id_structure, id_produit }` ou `null`
- [ ] Token URL-safe (caractères alphanumériques + `-` `_` uniquement)
- [ ] Fonction `getProduitUrl(id_structure, id_produit)` dans `lib/url-config.ts`
- [ ] Fonction `getWhatsAppProduitUrl(id_structure, id_produit, nomProduit)` dans `lib/url-config.ts`

**Fichiers impactés :** `lib/url-encoder.ts`, `lib/url-config.ts`

---

### FR-002 : Modal partage produit (côté marchand)

**Priorité :** Must Have

**Description :**
Quand le marchand clique sur le bouton QR d'une carte produit, une modal s'ouvre affichant le QR code du produit, le lien copiable, et les options de partage. Le bouton QR existe déjà dans `CarteProduit` (page produits) mais n'a aucune action.

**Acceptance Criteria :**
- [ ] Clic sur bouton QR ouvre la modal `ModalPartagerProduit`
- [ ] QR code affiché en grand (utilisant `react-qr-code` déjà installé)
- [ ] Lien public affiché et copiable (bouton "Copier")
- [ ] Bouton "Partager sur WhatsApp" (ouvre lien wa.me avec message pré-rempli)
- [ ] Bouton "Télécharger QR" (export PNG du QR code)
- [ ] Nom du produit et prix affichés dans la modal
- [ ] Feedback visuel : "Lien copié !" après copie

**Fichiers impactés :**
- `app/dashboard/commerce/produits/page.tsx` (brancher le bouton QR)
- Nouveau : `components/produit/ModalPartagerProduit.tsx`

**Dépendances :** FR-001

---

### FR-003 : Route publique `/produit`

**Priorité :** Must Have

**Description :**
Créer une nouvelle route publique `/produit?token=XXXX` qui décode le token, récupère les données du produit et de la structure, et affiche la page d'achat. S'inspirer du pattern de `app/facture/page.tsx`.

**Acceptance Criteria :**
- [ ] Route `app/produit/page.tsx` créée (Suspense + composant client)
- [ ] Décodage du token et récupération `id_structure` + `id_produit`
- [ ] Gestion des erreurs : token invalide, produit introuvable, produit hors stock
- [ ] Page accessible sans authentification
- [ ] Métadonnées SEO/OG pour prévisualisation sur réseaux sociaux (titre, image, prix)

**Fichiers impactés :**
- Nouveau : `app/produit/page.tsx`
- Nouveau : `components/produit/ProduitPublicClient.tsx`

**Dépendances :** FR-001

---

### FR-004 : Page produit public - Affichage

**Priorité :** Must Have

**Description :**
La page publique affiche les informations du produit avec un design attractif mobile-first. Le client voit le produit, peut choisir la quantité, et renseigner ses informations.

**Acceptance Criteria :**
- [ ] Affichage : photo produit (placeholder si absente), nom, prix unitaire, description
- [ ] Nom de la boutique/structure affiché (branding marchand)
- [ ] Sélecteur de quantité (min 1, max = stock disponible)
- [ ] Montant total recalculé dynamiquement (prix × quantité)
- [ ] Champ "Prénom" obligatoire (validation : min 2 caractères)
- [ ] Champ "Téléphone" obligatoire (validation : 9 chiffres, commence par 77/78/76/70/75)
- [ ] Design responsive mobile-first (cible principale : smartphone)
- [ ] Branding FayClick discret en footer

**Fichiers impactés :** `components/produit/ProduitPublicClient.tsx`

**Dépendances :** FR-003

---

### FR-005 : Paiement mobile sur page produit public

**Priorité :** Must Have

**Description :**
Deux boutons de paiement (Orange Money et Wave) déclenchent le flux de paiement wallet existant. Réutiliser `paymentWalletService` avec un nouveau context type `ONLINE_SALE`. Le téléphone saisi par le client est utilisé comme `pClientTel`.

**Acceptance Criteria :**
- [ ] Bouton Orange Money (avec logo OM) + Bouton Wave (avec logo Wave)
- [ ] Boutons désactivés tant que prénom et téléphone ne sont pas remplis
- [ ] Clic déclenche `paymentWalletService.createPayment()` avec context adapté
- [ ] QR code paiement affiché dans une modal (même UX que facture publique)
- [ ] Polling 2 minutes avec timer visuel
- [ ] Gestion des états : PROCESSING → COMPLETED / FAILED / TIMEOUT
- [ ] Transaction ID format : `{WALLET}-ONLINE-{id_structure}-{timestamp}`
- [ ] pReference : `ONLINE-{id_produit}` (max 19 caractères)

**Fichiers impactés :**
- `components/produit/ProduitPublicClient.tsx`
- `services/payment-wallet.service.ts` (ajout context ONLINE_SALE si nécessaire)

**Dépendances :** FR-004

---

### FR-006 : Création automatique de facture après paiement

**Priorité :** Must Have

**Description :**
Une fois le paiement confirmé (COMPLETED), le système crée automatiquement une facture via la fonction PostgreSQL `create_facture_complete1` puis enregistre le paiement via `add_acompte_facture`. Tout en mode public (sans auth). S'inspirer du pattern VenteFlash.

**Acceptance Criteria :**
- [ ] Après paiement COMPLETED, appel API pour créer facture
- [ ] Facture créée avec : tel_client, nom_client (prénom saisi), produit, quantité, montant
- [ ] Acompte enregistré : `add_acompte_facture(id_structure, id_facture, montant, transaction_id, uuid)`
- [ ] Service dédié `services/online-seller.service.ts` (sans auth, pattern facture-publique)
- [ ] Gestion erreur : si création facture échoue après paiement, logger et afficher message support

**Fichiers impactés :**
- Nouveau : `services/online-seller.service.ts`
- Réutilisation : `services/database.service.ts`

**Dépendances :** FR-005

---

### FR-007 : Affichage reçu après paiement

**Priorité :** Must Have

**Description :**
Après paiement et création de facture réussis, un écran de succès affiche le reçu avec les détails de la transaction. L'acheteur peut le screenshoter ou le partager.

**Acceptance Criteria :**
- [ ] Écran succès avec animation (check vert)
- [ ] Détails affichés : produit, quantité, montant payé, méthode, date/heure
- [ ] Numéro de facture affiché
- [ ] Nom de la boutique affiché
- [ ] Bouton "Voir ma facture" (lien vers `/facture?token=...` existant)
- [ ] Design épuré, screenshotable

**Fichiers impactés :** `components/produit/ProduitPublicClient.tsx` (état SUCCESS)

**Dépendances :** FR-006

---

### FR-008 : Récupération données produit en mode public

**Priorité :** Must Have

**Description :**
Créer un endpoint/service pour récupérer les données d'un produit par `id_structure` + `id_produit` sans authentification. La fonction PostgreSQL `get_list_produits` filtre par structure (via session auth), il faut donc une requête directe ou une nouvelle fonction PostgreSQL publique.

**Acceptance Criteria :**
- [ ] Service capable de récupérer un produit par id_structure + id_produit sans auth
- [ ] Requête SQL : `SELECT * FROM get_produit_public(id_structure, id_produit)` ou requête directe
- [ ] Données retournées : nom_produit, prix_vente, description, niveau_stock, nom_categorie, image_url
- [ ] Données structure retournées : nom_structure (pour branding)
- [ ] Produit hors stock → message "Produit indisponible"

**Fichiers impactés :**
- `services/online-seller.service.ts`
- Potentiel : nouvelle fonction PostgreSQL `get_produit_public()`

**Dépendances :** FR-003

---

### FR-009 : Vérification stock avant paiement

**Priorité :** Should Have

**Description :**
Avant de lancer le paiement, vérifier que le produit est toujours en stock avec la quantité demandée. Empêcher la vente si stock insuffisant.

**Acceptance Criteria :**
- [ ] Vérification stock au chargement de la page
- [ ] Re-vérification stock juste avant le lancement du paiement
- [ ] Si stock insuffisant : message "Stock insuffisant, X disponible(s)"
- [ ] Quantité max = stock disponible dans le sélecteur

**Dépendances :** FR-008

---

### FR-010 : Métadonnées Open Graph pour partage social

**Priorité :** Should Have

**Description :**
Quand le lien produit est partagé sur WhatsApp/TikTok/Facebook, une prévisualisation riche s'affiche (image, titre, prix). Utiliser les balises Open Graph dans les métadonnées de la page.

**Acceptance Criteria :**
- [ ] `og:title` = Nom du produit + " - " + Nom de la boutique
- [ ] `og:description` = Description produit + Prix formaté
- [ ] `og:image` = Photo produit (ou image FayClick par défaut)
- [ ] `og:url` = URL du produit
- [ ] Métadonnées Twitter Card aussi

**Note technique :** Nécessite du rendu serveur (SSR) ou `generateMetadata` de Next.js pour que les crawlers sociaux voient les tags. Le token doit être décodé côté serveur pour injecter les métadonnées.

**Fichiers impactés :** `app/produit/page.tsx` (generateMetadata)

**Dépendances :** FR-003, FR-008

---

### FR-011 : Téléchargement QR code en image

**Priorité :** Should Have

**Description :**
Le marchand peut télécharger le QR code en format PNG pour l'intégrer dans ses visuels TikTok, stories WhatsApp, etc.

**Acceptance Criteria :**
- [ ] Bouton "Télécharger QR" dans la modal partage
- [ ] Export en PNG haute résolution (512x512 minimum)
- [ ] Nom du fichier : `FayClick-{nom_produit}-QR.png`
- [ ] QR code inclut le logo FayClick au centre (optionnel)

**Fichiers impactés :** `components/produit/ModalPartagerProduit.tsx`

**Dépendances :** FR-002

---

### FR-012 : Protection anti-abus

**Priorité :** Should Have

**Description :**
Limiter les abus potentiels sur la page publique (spam, tentatives multiples).

**Acceptance Criteria :**
- [ ] Rate limiting : max 5 tentatives de paiement par IP par heure (côté API existant)
- [ ] Désactiver bouton paiement pendant le polling (anti-double clic)
- [ ] Token produit invalide → page erreur propre (pas de stack trace)
- [ ] Produit supprimé/désactivé → message "Ce produit n'est plus disponible"

---

## 6. Exigences Non-Fonctionnelles (NFRs)

### NFR-001 : Performance - Temps de chargement page produit

**Priorité :** Must Have

**Description :**
La page produit public doit charger rapidement sur réseau mobile sénégalais (3G/4G).

**Acceptance Criteria :**
- [ ] First Contentful Paint < 2 secondes sur 3G rapide
- [ ] Image produit lazy-loaded avec placeholder
- [ ] Bundle JS minimal (pas de dépendances dashboard inutiles)

---

### NFR-002 : Sécurité - Tokens et accès public

**Priorité :** Must Have

**Description :**
Les tokens ne doivent pas permettre d'accéder à des données sensibles de la structure. Seules les données publiques du produit sont exposées.

**Acceptance Criteria :**
- [ ] Token ne contient que id_structure + id_produit (pas de données sensibles)
- [ ] L'API publique ne retourne que : nom, prix, description, stock, image (pas de coût de revient, marge, etc.)
- [ ] Pas d'exposition du mot de passe, email, ou données financières de la structure

---

### NFR-003 : Compatibilité mobile

**Priorité :** Must Have

**Description :**
La page produit public est optimisée pour l'écran principal d'utilisation : smartphone Android avec navigateur WhatsApp/Chrome.

**Acceptance Criteria :**
- [ ] Fonctionne dans le navigateur intégré de WhatsApp
- [ ] Fonctionne dans Chrome Android et Safari iOS
- [ ] Design responsive : 320px à 768px largeur
- [ ] Touch-friendly : zones de tap minimum 44x44px

---

### NFR-004 : Disponibilité

**Priorité :** Must Have

**Description :**
La page publique doit être disponible 24/7 car les partages sur réseaux sociaux n'ont pas d'horaires.

**Acceptance Criteria :**
- [ ] Même disponibilité que le reste de v2.fayclick.net
- [ ] Page erreur gracieuse si API down ("Réessayez dans quelques instants")

---

### NFR-005 : Maintenabilité - Réutilisation patterns existants

**Priorité :** Must Have

**Description :**
L'implémentation doit réutiliser au maximum les patterns et services existants pour minimiser la dette technique.

**Acceptance Criteria :**
- [ ] Réutilisation de `paymentWalletService` (pas de nouveau service paiement)
- [ ] Même pattern d'encodage URL que `url-encoder.ts`
- [ ] Même pattern de page publique que `FacturePubliqueClient.tsx`
- [ ] Même composants wallet (boutons OM/Wave) que l'existant

---

## 7. Epics

### EPIC-001 : Infrastructure Token & URL Produit

**Description :**
Mise en place du système d'encodage/décodage de tokens produit et des fonctions URL associées.

**Functional Requirements :**
- FR-001 (Génération token)

**Story Count Estimate :** 2

**Priorité :** Must Have

**Business Value :**
Fondation technique indispensable pour toute la fonctionnalité.

---

### EPIC-002 : Modal Partage Marchand

**Description :**
Interface marchand pour générer et partager le QR code / lien d'un produit.

**Functional Requirements :**
- FR-002 (Modal partage)
- FR-011 (Téléchargement QR PNG)

**Story Count Estimate :** 3

**Priorité :** Must Have

**Business Value :**
Point d'entrée marchand vers la vente en ligne. Doit être simple et rapide (1 clic).

---

### EPIC-003 : Page Produit Public & Achat

**Description :**
Page publique complète : affichage produit, formulaire client, paiement, reçu.

**Functional Requirements :**
- FR-003 (Route publique)
- FR-004 (Affichage produit)
- FR-005 (Paiement mobile)
- FR-006 (Création facture)
- FR-007 (Reçu)
- FR-008 (Récupération données publiques)
- FR-009 (Vérification stock)

**Story Count Estimate :** 7-8

**Priorité :** Must Have

**Business Value :**
Coeur de la fonctionnalité : c'est ici que l'acheteur devient client payant.

---

### EPIC-004 : Optimisations Partage Social

**Description :**
Métadonnées Open Graph et optimisations pour le partage sur réseaux sociaux.

**Functional Requirements :**
- FR-010 (Open Graph)
- FR-012 (Anti-abus)

**Story Count Estimate :** 2-3

**Priorité :** Should Have

**Business Value :**
Améliore le taux de clic sur les liens partagés grâce aux previews riches.

---

## 8. User Stories (haut niveau)

### EPIC-001 : Infrastructure Token
- **US-001** : En tant que système, je dois pouvoir encoder `id_structure + id_produit` en token URL-safe et le décoder, afin de générer des liens publics produit.
- **US-002** : En tant que système, je dois pouvoir générer l'URL publique et l'URL WhatsApp d'un produit.

### EPIC-002 : Modal Partage
- **US-003** : En tant que marchand, je veux cliquer sur le bouton QR d'un produit et voir le QR code + lien copiable, afin de le partager facilement.
- **US-004** : En tant que marchand, je veux partager directement sur WhatsApp depuis la modal, afin de gagner du temps.
- **US-005** : En tant que marchand, je veux télécharger le QR code en image PNG, afin de l'intégrer dans mes visuels.

### EPIC-003 : Page Produit Public
- **US-006** : En tant qu'acheteur, je veux voir les détails d'un produit quand je scanne un QR code, afin de décider si je l'achète.
- **US-007** : En tant qu'acheteur, je veux choisir une quantité et saisir mon prénom + téléphone, afin de passer commande.
- **US-008** : En tant qu'acheteur, je veux payer via Orange Money ou Wave directement sur la page, afin de finaliser mon achat.
- **US-009** : En tant que système, je dois créer une facture et enregistrer le paiement après confirmation, afin que le marchand ait la trace comptable.
- **US-010** : En tant qu'acheteur, je veux voir un reçu après paiement avec les détails de ma transaction.
- **US-011** : En tant que système, je dois récupérer les données produit + structure en mode public (sans auth).
- **US-012** : En tant que système, je dois vérifier le stock avant de lancer le paiement.

### EPIC-004 : Optimisations
- **US-013** : En tant que système, je dois injecter les métadonnées Open Graph pour les previews sur réseaux sociaux.
- **US-014** : En tant que système, je dois protéger la page publique contre les abus (rate limiting, anti-double clic).

---

## 9. Architecture Technique (Vue d'ensemble)

### Fichiers à créer

| Fichier | Rôle |
|---------|------|
| `app/produit/page.tsx` | Route publique + SSR metadata |
| `components/produit/ProduitPublicClient.tsx` | Page achat public (client component) |
| `components/produit/ModalPartagerProduit.tsx` | Modal QR + partage (marchand) |
| `services/online-seller.service.ts` | Service dédié (fetch produit public, create facture) |

### Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `lib/url-encoder.ts` | Ajouter `encodeProduitParams()` / `decodeProduitParams()` |
| `lib/url-config.ts` | Ajouter `getProduitUrl()` / `getWhatsAppProduitUrl()` |
| `app/dashboard/commerce/produits/page.tsx` | Brancher bouton QR → ModalPartagerProduit |

### Services réutilisés (sans modification)

| Service | Utilisation |
|---------|-------------|
| `services/payment-wallet.service.ts` | Paiement OM/Wave |
| `services/database.service.ts` | Requêtes BD |
| `lib/api-config.ts` | Config API |

### Flux de données

```
[Marchand]                          [Acheteur]
    │                                    │
    ▼                                    │
CarteProduit                             │
    │ clic QR                            │
    ▼                                    │
encodeProduitParams(183, 42)             │
    │ → token "MTgzLTQy"                 │
    ▼                                    │
ModalPartagerProduit                     │
    │ affiche QR + lien                  │
    │ partage WhatsApp ──────────────────▶ scan/clic
    │                                    │
    │                                    ▼
    │                           /produit?token=MTgzLTQy
    │                                    │
    │                           decodeProduitParams()
    │                           → {id_structure:183, id_produit:42}
    │                                    │
    │                           onlineSellerService
    │                           .getProduitPublic(183, 42)
    │                                    │
    │                           Affichage produit
    │                           + formulaire (prénom, tel, quantité)
    │                                    │
    │                           paymentWalletService
    │                           .createPayment('OM', context)
    │                                    │
    │                           Polling → COMPLETED
    │                                    │
    │                           onlineSellerService
    │                           .createFactureOnline(...)
    │                                    │
    │                           add_acompte_facture(...)
    │                                    │
    │                                    ▼
    │                              Reçu affiché ✓
    │
    ▼
Facture visible dans
son dashboard FayClick
```

---

## 10. Matrice de Traçabilité

| Epic | FRs | Stories | Priorité |
|------|-----|---------|----------|
| EPIC-001 : Infrastructure Token | FR-001 | US-001, US-002 | Must Have |
| EPIC-002 : Modal Partage | FR-002, FR-011 | US-003, US-004, US-005 | Must Have |
| EPIC-003 : Page Produit Public | FR-003→FR-009 | US-006→US-012 | Must Have |
| EPIC-004 : Optimisations Social | FR-010, FR-012 | US-013, US-014 | Should Have |

---

## 11. Priorisation

| Priorité | FRs | NFRs |
|----------|-----|------|
| Must Have | FR-001→FR-008 (8) | NFR-001→NFR-005 (5) |
| Should Have | FR-009→FR-012 (4) | - |
| Could Have | - | - |

---

## 12. Dépendances

### Internes (FayClick)
- Système de paiement wallet existant (`payment-wallet.service.ts`)
- Pattern facture publique existant (`/facture?token=`)
- Service produits existant
- Bibliothèques QR (`react-qr-code`, `qrcode`) déjà installées

### Externes
- API paiement : `api.icelabsoft.com/pay_services`
- PostgreSQL : fonctions `create_facture_complete1`, `add_acompte_facture`
- Potentiellement : nouvelle fonction PostgreSQL `get_produit_public(id_structure, id_produit)`

---

## 13. Hypothèses

1. Les marchands ont déjà des produits enregistrés dans FayClick
2. Le navigateur intégré WhatsApp supporte les QR codes de paiement wallet
3. Les fonctions PostgreSQL existantes (`create_facture_complete1`, `add_acompte_facture`) peuvent être appelées sans session utilisateur authentifié
4. Le stock produit est mis à jour automatiquement lors de la création de facture (via la BD)
5. Les images produits ne sont pas encore gérées (à confirmer) - un placeholder sera utilisé

---

## 14. Hors Scope (V1)

- Panier multi-produits (acheter plusieurs produits d'un coup)
- Paiement FREE Money (uniquement OM et Wave en V1)
- Suivi de livraison
- Système d'avis/commentaires
- Catalogue public multi-produits (déjà géré par `/catalogue`)
- Notifications push au marchand lors d'une vente
- Analytics des ventes par canal social

---

## 15. Questions Ouvertes

| # | Question | Impact |
|---|----------|--------|
| Q1 | Les images produits sont-elles déjà gérées dans la BD ? | FR-004 : affichage image ou placeholder |
| Q2 | Faut-il créer une nouvelle fonction PostgreSQL `get_produit_public()` ou peut-on réutiliser `get_list_produits` avec filtre ? | FR-008 : sécurité des données exposées |
| Q3 | Le stock est-il décrémenté automatiquement par `create_facture_complete1` ? | FR-009 : vérification stock |
| Q4 | Veut-on envoyer un SMS de confirmation à l'acheteur après paiement ? | UX post-achat |

---

## 16. Ordre d'implémentation recommandé

```
Phase 1 (Fondation)     : EPIC-001 → Token & URL encoding
Phase 2 (Marchand)      : EPIC-002 → Modal partage QR
Phase 3 (Acheteur)      : EPIC-003 → Page publique complète
Phase 4 (Optimisations) : EPIC-004 → Open Graph + anti-abus
```

---

*Document généré par BMAD Method - FayClick V2*
*Branche : `online_seller`*
