# Sprint Plan : Online Seller - FayClick V2

**Date :** 31 janvier 2026
**Projet :** Online Seller (Vente en ligne via QR Code)
**Branche :** `online_seller`
**Niveau :** 2 (5-15 stories)
**Total Stories :** 10
**Total Points :** 29 points
**Sprint unique :** Oui (code estimé ~950 lignes)

---

## Résumé Exécutif

10 stories réparties en 4 phases séquentielles correspondant aux 4 Epics. Chaque story produit un livrable testable. L'ordre respecte les dépendances techniques : fondation → marchand → acheteur → optimisations.

---

## Inventaire des Stories

### EPIC-001 : Infrastructure Token & URL (Phase 1)

---

### STORY-001 : Encodage/décodage token produit

**Epic :** EPIC-001
**Priorité :** Must Have
**Points :** 2

**User Story :**
En tant que système, je dois pouvoir encoder `id_structure + id_produit` en token Base64 URL-safe et le décoder, afin de générer des liens publics produit.

**Acceptance Criteria :**
- [ ] Fonction `encodeProduitParams(id_structure, id_produit)` ajoutée dans `lib/url-encoder.ts`
- [ ] Fonction `decodeProduitParams(token)` retourne `{ id_structure, id_produit }` ou `null`
- [ ] Fonctionne côté client (btoa) et côté serveur (Buffer)
- [ ] Token URL-safe : caractères `A-Za-z0-9-_` uniquement
- [ ] Roundtrip : `decode(encode(183, 42))` === `{ id_structure: 183, id_produit: 42 }`

**Technical Notes :**
- Copier le pattern exact de `encodeFactureParams`/`decodeFactureParams` dans le même fichier
- Remplacer `id_facture` par `id_produit` dans les noms et la logique
- ~30 lignes à ajouter en fin de `lib/url-encoder.ts`

**Fichiers :** `lib/url-encoder.ts` (modifier)
**Dépendances :** Aucune
**FRs :** FR-001

---

### STORY-002 : Fonctions URL produit et WhatsApp

**Epic :** EPIC-001
**Priorité :** Must Have
**Points :** 2

**User Story :**
En tant que système, je dois pouvoir générer l'URL publique `/produit?token=XX` et l'URL de partage WhatsApp d'un produit.

**Acceptance Criteria :**
- [ ] Fonction `getProduitUrl(id_structure, id_produit)` ajoutée dans `lib/url-config.ts`
- [ ] Retourne `https://v2.fayclick.net/produit?token={encoded}`
- [ ] Fonction `getWhatsAppProduitUrl(id_structure, id_produit, nomProduit)` ajoutée
- [ ] Retourne `https://wa.me/?text={message_encodé}` avec nom produit et lien
- [ ] En DEV, utilise `localhost:3000` au lieu de `v2.fayclick.net`

**Technical Notes :**
- Copier le pattern de `getFactureUrl` et `getWhatsAppFactureUrl`
- Utiliser `getAppBaseUrl()` existant pour la détection d'environnement
- ~25 lignes à ajouter en fin de `lib/url-config.ts`

**Fichiers :** `lib/url-config.ts` (modifier)
**Dépendances :** STORY-001
**FRs :** FR-001

---

### EPIC-002 : Modal Partage Marchand (Phase 2)

---

### STORY-003 : Modal partage QR code produit

**Epic :** EPIC-002
**Priorité :** Must Have
**Points :** 5

**User Story :**
En tant que marchand, je veux cliquer sur le bouton QR d'un produit et voir le QR code avec le lien copiable, afin de le partager sur mes réseaux sociaux.

**Acceptance Criteria :**
- [ ] Composant `ModalPartagerProduit.tsx` créé dans `components/produit/`
- [ ] QR code affiché en grand (256x256) via `react-qr-code` (déjà installé)
- [ ] Lien public affiché en texte avec bouton "Copier le lien"
- [ ] `navigator.clipboard.writeText()` avec feedback "Lien copié !" (2s)
- [ ] Bouton "Partager sur WhatsApp" ouvre `wa.me` dans nouvel onglet
- [ ] Bouton "Télécharger QR" exporte PNG 512x512 via lib `qrcode` (toCanvas)
- [ ] Nom du produit et prix affichés en header de la modal
- [ ] Bouton fermer (X) en haut à droite
- [ ] Design cohérent avec les modals existantes (backdrop blur, Tailwind)

**Technical Notes :**
- Props : `{ isOpen, onClose, produit: { id_produit, nom_produit, prix_vente }, idStructure }`
- Utiliser `getProduitUrl()` de STORY-002 pour générer le lien
- Utiliser `getWhatsAppProduitUrl()` pour le bouton WhatsApp
- Export QR : `import QRCode from 'qrcode'; QRCode.toCanvas(canvas, url, { width: 512 })`
- Nom fichier téléchargé : `FayClick-{nom_produit}-QR.png`
- ~180 lignes

**Fichiers :** `components/produit/ModalPartagerProduit.tsx` (créer)
**Dépendances :** STORY-002
**FRs :** FR-002, FR-011

---

### STORY-004 : Brancher bouton QR sur carte produit

**Epic :** EPIC-002
**Priorité :** Must Have
**Points :** 2

**User Story :**
En tant que marchand, je veux que le bouton QR existant sur mes cartes produits ouvre la modal de partage.

**Acceptance Criteria :**
- [ ] Import `ModalPartagerProduit` dans `app/dashboard/commerce/produits/page.tsx`
- [ ] État `produitPartage` (Produit | null) ajouté au composant page
- [ ] Clic bouton QR → `setProduitPartage(produit)` avec `e.stopPropagation()`
- [ ] Modal affichée quand `produitPartage !== null`
- [ ] Fermeture modal → `setProduitPartage(null)`
- [ ] Bouton QR fonctionne sur `CarteProduit` ET `CarteProduitReduit` (si les deux ont le bouton)

**Technical Notes :**
- Le bouton QR avec icône `<QrCode>` de lucide-react existe déjà dans CarteProduit
- Il suffit d'ajouter le onClick et l'état
- `e.stopPropagation()` obligatoire car la carte parent est cliquable
- ~15 lignes de modifications

**Fichiers :** `app/dashboard/commerce/produits/page.tsx` (modifier)
**Dépendances :** STORY-003
**FRs :** FR-002

---

### EPIC-003 : Page Produit Public & Achat (Phase 3)

---

### STORY-005 : Service Online Seller (données publiques + création facture)

**Epic :** EPIC-003
**Priorité :** Must Have
**Points :** 5

**User Story :**
En tant que système, je dois récupérer les données publiques d'un produit et créer une facture après paiement, le tout sans authentification.

**Acceptance Criteria :**
- [ ] Service singleton `OnlineSellerService` créé dans `services/online-seller.service.ts`
- [ ] `getProduitPublic(idStructure, idProduit)` retourne `{ produit: ProduitPublic, nom_structure }`
- [ ] Requête SQL `SELECT` sur `list_produits_com JOIN list_structures` (colonnes publiques uniquement)
- [ ] `checkStock(idStructure, idProduit, quantite)` retourne `{ disponible, stock_actuel }`
- [ ] `createFactureOnline(params)` :
  - Appelle `create_facture_complete1()` avec articles_string format `"id-qty-prix#"`
  - Appelle `add_acompte_facture()` pour enregistrer le paiement
  - Retourne `{ success, id_facture, num_facture }`
- [ ] Aucune donnée sensible exposée (pas de cout_revient, marge)
- [ ] Gestion erreurs : produit introuvable, stock insuffisant, erreur création facture
- [ ] Parsing JSON PostgreSQL avec vérification `typeof === 'string'`

**Technical Notes :**
- Pattern identique à `services/facture-publique.service.ts`
- Utiliser `DatabaseService.query()` directement (fonctionne sans auth)
- Interface `ProduitPublic` : `{ id_produit, nom_produit, prix_vente, description, niveau_stock, nom_categorie, photo_url }`
- Transaction ID format : `{WALLET}-ONLINE-{id_structure}-{timestamp}`
- Échapper les apostrophes dans le prénom : `.replace(/'/g, "''")`
- mt_acompte = montant total (facture payée intégralement)
- ~200 lignes

**Fichiers :** `services/online-seller.service.ts` (créer)
**Dépendances :** Aucune (utilise DatabaseService existant)
**FRs :** FR-006, FR-008, FR-009

---

### STORY-006 : Route publique /produit + page wrapper

**Epic :** EPIC-003
**Priorité :** Must Have
**Points :** 2

**User Story :**
En tant qu'acheteur, je veux accéder à une page produit via un lien ou QR code sans me connecter.

**Acceptance Criteria :**
- [ ] Route `app/produit/page.tsx` créée
- [ ] Extraction token depuis `window.location.search` côté client
- [ ] Validation : token présent et longueur ≥ 4 caractères
- [ ] Si token invalide → écran erreur "Lien produit invalide"
- [ ] Si token OK → affiche `<ProduitPublicClient token={token} />`
- [ ] Suspense boundary avec loading spinner
- [ ] Page `'use client'` (même pattern que `app/facture/page.tsx`)

**Technical Notes :**
- Copier `app/facture/page.tsx` quasi à l'identique (45 lignes)
- Remplacer `FacturePubliqueClient` par `ProduitPublicClient`
- Changer le texte d'erreur et les couleurs (gradient vert/emerald au lieu de bleu/indigo)
- ~50 lignes

**Fichiers :** `app/produit/page.tsx` (créer)
**Dépendances :** Aucune (le composant ProduitPublicClient sera branché dans STORY-007)
**FRs :** FR-003

---

### STORY-007 : Page produit publique - Affichage + Formulaire

**Epic :** EPIC-003
**Priorité :** Must Have
**Points :** 5

**User Story :**
En tant qu'acheteur, je veux voir les détails d'un produit, choisir une quantité et saisir mes informations pour passer commande.

**Acceptance Criteria :**
- [ ] Composant `ProduitPublicClient.tsx` créé dans `components/produit/`
- [ ] Décode token via `decodeProduitParams(token)` → `{ id_structure, id_produit }`
- [ ] Appelle `onlineSellerService.getProduitPublic()` au chargement
- [ ] Affiche : image produit (ou placeholder), nom, prix, description, catégorie, nom boutique
- [ ] Sélecteur quantité : boutons [-] [+], min=1, max=stock disponible
- [ ] Montant total recalculé : `prix × quantité` formaté avec `toLocaleString('fr-FR') + ' FCFA'`
- [ ] Champ "Votre prénom" obligatoire (min 2 caractères)
- [ ] Champ "Votre téléphone" obligatoire, validation regex `/(77|78|76|70|75)\d{7}/`
- [ ] 2 boutons paiement (OM + Wave) désactivés tant que formulaire invalide
- [ ] États : LOADING → PRODUCT_VIEW → (paiement géré dans STORY-008)
- [ ] État ERROR : token invalide, produit introuvable, produit hors stock
- [ ] Design mobile-first, zones tap 44px minimum
- [ ] Header avec nom boutique, footer "Propulsé par FayClick"
- [ ] Image en `loading="lazy"` avec placeholder CSS

**Technical Notes :**
- Utiliser `decodeProduitParams` de STORY-001
- Utiliser `onlineSellerService.getProduitPublic()` de STORY-005
- Machine à états avec `useState<'LOADING' | 'PRODUCT_VIEW' | 'PAYMENT_QR' | 'CREATING_INVOICE' | 'SUCCESS' | 'ERROR'>`
- Cette story couvre l'affichage et le formulaire. STORY-008 ajoutera la logique de paiement
- ~250 lignes (partie affichage)

**Fichiers :** `components/produit/ProduitPublicClient.tsx` (créer)
**Dépendances :** STORY-001, STORY-005, STORY-006
**FRs :** FR-003, FR-004

---

### STORY-008 : Paiement mobile + création facture + reçu

**Epic :** EPIC-003
**Priorité :** Must Have
**Points :** 8

**User Story :**
En tant qu'acheteur, je veux payer via Orange Money ou Wave et recevoir un reçu immédiatement après paiement.

**Acceptance Criteria :**
- [ ] Clic bouton OM/Wave déclenche `paymentWalletService.createPayment()` avec PaymentContext adapté
- [ ] ⚠️ Passer `method`, `quantite`, `prenom`, `telephone` en paramètres directs (PAS via useState → closure stale)
- [ ] pReference : `ONLINE-{id_produit}` (≤ 19 caractères)
- [ ] `ModalPaiementQRCode` existant réutilisé (QR code + timer 2min + boutons OM/Wave)
- [ ] Re-vérification stock via `onlineSellerService.checkStock()` juste avant paiement
- [ ] Si stock insuffisant → message erreur, pas de paiement
- [ ] Callback `onPaymentComplete(statusResponse)` :
  - step = 'CREATING_INVOICE'
  - Appel `onlineSellerService.createFactureOnline()` avec tous les paramètres
  - Transaction ID : `{WALLET}-ONLINE-{id_structure}-{timestamp}`
  - Si succès → step = 'SUCCESS'
  - Si échec création facture → message "Paiement reçu, reçu en cours de traitement"
- [ ] Écran SUCCESS :
  - Animation check vert
  - Produit acheté, quantité, montant payé
  - Méthode de paiement (OM/Wave)
  - Date/heure
  - Numéro de facture
  - Nom de la boutique
  - Bouton "Voir ma facture" → `/facture?token={encodeFactureParams(id_structure, id_facture)}`
- [ ] Gestion timeout paiement (2 min) → message "Paiement non confirmé"
- [ ] Boutons paiement désactivés pendant le polling (anti-double clic)

**Technical Notes :**
- Réutiliser `ModalPaiementQRCode` existant (`components/factures/ModalPaiementQRCode.tsx`) tel quel
- PaymentContext.facture.num_facture = `ONLINE-{id_produit}` (la vraie facture n'existe pas encore)
- PaymentContext.facture.id_facture = 0 (sera créée après paiement)
- Pour le lien "Voir ma facture" post-succès, utiliser `encodeFactureParams` existant
- Pattern callback : passer toutes les valeurs en paramètres pour éviter closures stale
- ~200 lignes supplémentaires dans ProduitPublicClient.tsx (total composant ~450 lignes)

**Fichiers :** `components/produit/ProduitPublicClient.tsx` (compléter)
**Dépendances :** STORY-005, STORY-007
**FRs :** FR-005, FR-006, FR-007, FR-009, FR-012 (anti-double clic)

---

### EPIC-004 : Optimisations (Phase 4)

---

### STORY-009 : Métadonnées Open Graph pour réseaux sociaux

**Epic :** EPIC-004
**Priorité :** Should Have
**Points :** 3

**User Story :**
En tant que système, je dois injecter les métadonnées Open Graph pour que les liens partagés sur WhatsApp/TikTok/Facebook affichent une preview riche.

**Acceptance Criteria :**
- [ ] `og:title` = "{Nom produit} - {Nom boutique}"
- [ ] `og:description` = "{Description} | {Prix} FCFA"
- [ ] `og:image` = Photo produit (ou image FayClick par défaut)
- [ ] `og:url` = URL du produit
- [ ] Twitter Card meta tags ajoutés
- [ ] Tags visibles par les crawlers sociaux (nécessite SSR ou `generateMetadata`)

**Technical Notes :**
- Nécessite de transformer `app/produit/page.tsx` en page hybride : partie serveur pour metadata + partie client pour l'UI
- Utiliser `generateMetadata()` de Next.js 15 : décoder token côté serveur, requêter produit, retourner metadata
- Le décodage token côté serveur utilise `Buffer.from()` (pas `atob`)
- Image par défaut si pas de photo_url : `/images/fayclick-product-default.png`
- ~50 lignes de code serveur ajoutées

**Fichiers :** `app/produit/page.tsx` (modifier : ajouter generateMetadata)
**Dépendances :** STORY-006
**FRs :** FR-010

---

### STORY-010 : Protection anti-abus

**Epic :** EPIC-004
**Priorité :** Should Have
**Points :** 2 (partiel — le rate limiting API est géré côté serveur existant)

**User Story :**
En tant que système, je dois protéger la page publique contre les abus.

**Acceptance Criteria :**
- [ ] Token invalide → page erreur propre "Ce lien ne fonctionne pas" (pas de stack trace)
- [ ] Produit supprimé/désactivé → message "Ce produit n'est plus disponible"
- [ ] Produit hors stock → message "Produit épuisé" avec nom boutique
- [ ] Boutons paiement désactivés pendant polling (déjà dans STORY-008)
- [ ] Pas de double-clic possible sur boutons paiement (disable immédiat au clic)
- [ ] Quantité > stock impossible (déjà dans STORY-007)

**Technical Notes :**
- La plupart de ces protections sont déjà couvertes dans STORY-007 et STORY-008
- Cette story vérifie la couverture complète et ajoute les cas limites manquants
- Le rate limiting côté API (5 tentatives/IP/heure) est géré par le serveur existant

**Fichiers :** `components/produit/ProduitPublicClient.tsx` (vérifier/compléter)
**Dépendances :** STORY-007, STORY-008
**FRs :** FR-012

---

## Allocation Sprint

### Sprint unique — "Online Seller MVP"

**Objectif :** Livrer la fonctionnalité complète de vente en ligne via QR Code / lien public, de la génération du lien par le marchand jusqu'au paiement et reçu pour l'acheteur.

**Capacité :** 29 points engagés

| # | Story | Points | Priorité | Phase |
|---|-------|--------|----------|-------|
| 1 | STORY-001 : Encodage token produit | 2 | Must | Phase 1 |
| 2 | STORY-002 : URL produit + WhatsApp | 2 | Must | Phase 1 |
| 3 | STORY-003 : Modal partage QR | 5 | Must | Phase 2 |
| 4 | STORY-004 : Brancher bouton QR | 2 | Must | Phase 2 |
| 5 | STORY-005 : Service Online Seller | 5 | Must | Phase 3 |
| 6 | STORY-006 : Route /produit | 2 | Must | Phase 3 |
| 7 | STORY-007 : Page publique affichage | 5 | Must | Phase 3 |
| 8 | STORY-008 : Paiement + facture + reçu | 8 | Must | Phase 3 |
| 9 | STORY-009 : Open Graph metadata | 3 | Should | Phase 4 |
| 10 | STORY-010 : Anti-abus | 2 | Should | Phase 4 |
| | **TOTAL** | **29** | | |

### Ordre d'implémentation (respecte les dépendances)

```
STORY-001 ──→ STORY-002 ──→ STORY-003 ──→ STORY-004
                                              │
STORY-005 ─────────────────→ STORY-006        │
     │                          │              │
     └──────→ STORY-007 ←──────┘              │
                  │                            │
                  └──→ STORY-008               │
                          │                    │
                          ├──→ STORY-009       │
                          └──→ STORY-010       │
```

**Parallélisation possible :**
- STORY-001+002 (Phase 1) et STORY-005 (service) peuvent être développés en parallèle
- STORY-009 et STORY-010 (Phase 4) sont indépendants entre eux

---

## Traçabilité Epic → Stories

| Epic | Stories | Points | Sprint |
|------|---------|--------|--------|
| EPIC-001 : Infrastructure Token | STORY-001, STORY-002 | 4 | Phase 1 |
| EPIC-002 : Modal Partage | STORY-003, STORY-004 | 7 | Phase 2 |
| EPIC-003 : Page Produit Public | STORY-005→008 | 20 | Phase 3 |
| EPIC-004 : Optimisations | STORY-009, STORY-010 | 5 | Phase 4 |

## Traçabilité FR → Stories

| FR | Titre | Story |
|----|-------|-------|
| FR-001 | Token produit | STORY-001, STORY-002 |
| FR-002 | Modal partage | STORY-003, STORY-004 |
| FR-003 | Route publique | STORY-006, STORY-007 |
| FR-004 | Affichage produit | STORY-007 |
| FR-005 | Paiement mobile | STORY-008 |
| FR-006 | Création facture | STORY-005, STORY-008 |
| FR-007 | Reçu | STORY-008 |
| FR-008 | Données publiques | STORY-005 |
| FR-009 | Vérification stock | STORY-005, STORY-008 |
| FR-010 | Open Graph | STORY-009 |
| FR-011 | Téléchargement QR | STORY-003 |
| FR-012 | Anti-abus | STORY-008, STORY-010 |

**Couverture : 12/12 FRs → 100%**

---

## Risques et Mitigation

| Risque | Impact | Mitigation |
|--------|--------|------------|
| `list_produits_com` ne contient pas `photo_url` | Moyen | Utiliser placeholder, vérifier la vue en BD |
| `create_facture_complete1` nécessite `id_utilisateur` valide | Haut | Tester avec `id_utilisateur = 0` en mode public |
| Navigateur WhatsApp bloque certains comportements JS | Moyen | Tester dans WebView WhatsApp Android dès STORY-007 |
| Stock non décrémenté automatiquement par `create_facture_complete1` | Bas | Vérifier le comportement, si besoin ajouter un UPDATE manuellement |

---

## Definition of Done

Pour qu'une story soit considérée comme terminée :
- [ ] Code implémenté et committé sur branche `online_seller`
- [ ] Pas d'erreurs TypeScript (`npm run build` passe)
- [ ] Testé manuellement en DEV (localhost:3000)
- [ ] Pas de régression sur les fonctionnalités existantes
- [ ] Patterns existants respectés (pas de nouvelle dépendance, même conventions)

---

## Prochaine étape

Lancer l'implémentation avec `/bmad-dev-story STORY-001` ou directement coder les stories dans l'ordre.

**Commande recommandée :** Commencer par STORY-001 (2 points, ~30 lignes, fondation pour tout le reste).

---

*Document généré par BMAD Method - FayClick V2*
*Branche : `online_seller`*
