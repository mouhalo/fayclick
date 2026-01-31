# Architecture - Online Seller : Vente en ligne via QR Code / Lien Public

**Version :** 1.0
**Date :** 31 janvier 2026
**Auteur :** System Architect (BMAD)
**Projet :** FayClick V2
**Branche :** `online_seller`
**PRD :** `docs/prd-online-seller-2026-01-31.md`

---

## 1. Drivers Architecturaux

Les NFRs suivants ont un impact direct sur les décisions d'architecture :

| Driver | NFR | Impact architectural |
|--------|-----|---------------------|
| Performance mobile 3G/4G | NFR-001 | Bundle minimal, lazy loading, pas d'import dashboard |
| Sécurité données publiques | NFR-002 | Service dédié filtrant les champs sensibles (cout_revient, marge) |
| Navigateur intégré WhatsApp | NFR-003 | Pas de fonctionnalités avancées (WebGL, etc.), design 320px minimum |
| Disponibilité 24/7 | NFR-004 | Même infra que facture publique, gestion erreur gracieuse |
| Réutilisation patterns | NFR-005 | Extension des modules existants, pas de nouveau framework |

---

## 2. Pattern Architectural

**Pattern :** Extension du Monolithe Modulaire Next.js existant

**Justification :**
FayClick est un monolithe Next.js 15 App Router avec services singleton côté client. La fonctionnalité Online Seller est une **extension naturelle** du pattern facture publique existant. Créer un microservice ou un module séparé serait du sur-engineering pour ~4 fichiers nouveaux.

**Principe directeur :** Copier le pattern exact de `/facture?token=` pour `/produit?token=`, en remplaçant "facture" par "produit+achat+facture" dans le flux.

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER                        │
├──────────────────────┬──────────────────────────────────────┤
│   PAGES PRIVÉES      │     PAGES PUBLIQUES (sans auth)      │
│   (dashboard/*)      │                                      │
│                      │  /facture?token=  (existant)         │
│  /commerce/produits  │  /produit?token=  (NOUVEAU)          │
│  → bouton QR         │  /recu?token=     (existant)         │
│  → ModalPartager     │  /catalogue       (existant)         │
├──────────────────────┴──────────────────────────────────────┤
│                   SERVICES (singletons)                      │
│  paymentWalletService │ onlineSellerService │ databaseService│
├─────────────────────────────────────────────────────────────┤
│                 API PROXY (/api/sql)                         │
├─────────────────────────────────────────────────────────────┤
│           PostgreSQL (fonctions stockées)                    │
│  create_facture_complete1 │ add_acompte_facture │ produits  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Technologique

Aucune nouvelle technologie à ajouter. Tout est déjà dans le projet :

| Couche | Technologie | Statut |
|--------|-------------|--------|
| Framework | Next.js 15 (App Router) | Existant |
| UI | React 19 + Tailwind CSS 3.4 | Existant |
| QR Code (génération) | `react-qr-code` 2.0.18 | Existant (installé, non utilisé dans produits) |
| QR Code (export PNG) | `qrcode` 1.5.4 (toCanvas) | Existant |
| Animations | `framer-motion` 12.23 | Existant |
| Icônes | `lucide-react` (QrCode icon) | Existant |
| Paiement | API icelabsoft.com/pay_services | Existant |
| BD | PostgreSQL via proxy /api/sql | Existant |
| Encodage URL | Base64 URL-safe (lib/url-encoder.ts) | Existant, à étendre |

---

## 4. Composants Système

### 4.1 Composants à créer (4 fichiers)

#### C1 : `app/produit/page.tsx` — Route publique produit

**Rôle :** Point d'entrée de la page publique produit. Extrait le token de l'URL et délègue au composant client.

**Pattern répliqué de :** `app/facture/page.tsx` (45 lignes)

**Structure :**
```typescript
'use client';

import { useEffect, useState, Suspense } from 'react';
import ProduitPublicClient from '@/components/produit/ProduitPublicClient';

function ProduitContent() {
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
  }, []);

  if (!isClient) return <LoadingScreen />;
  if (!token || token.length < 4) return <ErrorScreen message="Lien produit invalide" />;

  return <ProduitPublicClient token={token} />;
}

export default function ProduitPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ProduitContent />
    </Suspense>
  );
}
```

**FRs :** FR-003
**Estimation :** ~50 lignes

---

#### C2 : `components/produit/ProduitPublicClient.tsx` — Page achat public

**Rôle :** Composant principal de l'expérience acheteur. Gère tout le flux : affichage produit → formulaire client → paiement → création facture → reçu.

**Pattern répliqué de :** `components/facture/FacturePubliqueClient.tsx` (650 lignes)

**Machine à états :**
```
LOADING → PRODUCT_VIEW → PAYMENT_QR → CREATING_INVOICE → SUCCESS
                                    → PAYMENT_FAILED
         → ERROR (token invalide, produit introuvable, hors stock)
```

**Structure détaillée :**
```typescript
'use client';

interface ProduitPublicClientProps {
  token: string;
}

// État du composant
interface PageState {
  // Données
  produit: ProduitPublic | null;
  nomStructure: string;
  idStructure: number;

  // Formulaire client
  prenom: string;
  telephone: string;
  quantite: number;

  // Paiement
  step: 'LOADING' | 'PRODUCT_VIEW' | 'PAYMENT_QR' | 'CREATING_INVOICE' | 'SUCCESS' | 'ERROR';
  selectedMethod: 'OM' | 'WAVE' | null;
  showQRCode: boolean;

  // Résultat
  factureId: number | null;
  factureToken: string | null;  // Pour lien "Voir ma facture"
}
```

**Flux interne détaillé :**

```
1. useEffect → decodeProduitParams(token)
   → { id_structure, id_produit }

2. onlineSellerService.getProduitPublic(id_structure, id_produit)
   → { produit, nom_structure }
   → step = 'PRODUCT_VIEW'

3. Utilisateur remplit prénom + téléphone + quantité
   → Validation en temps réel
   → Boutons OM/Wave deviennent actifs

4. Clic sur bouton wallet → handlePayment(method)
   ⚠️ Passer method en paramètre (pas via useState → closure stale)
   → Re-vérifier stock via onlineSellerService.checkStock()
   → Construire PaymentContext :
     {
       facture: {
         id_facture: 0,              // Pas encore créée
         num_facture: `ONLINE-${id_produit}`,  // ≤19 chars
         nom_client: prenom,
         tel_client: telephone,
         nom_structure: nomStructure,
         montant_total: prix × quantite,
         montant_restant: prix × quantite
       },
       montant_acompte: prix × quantite
     }
   → setShowQRCode(true)

5. ModalPaiementQRCode (composant existant réutilisé)
   → paymentWalletService.createPayment(method, context)
   → Polling 2 min
   → onPaymentComplete(statusResponse)

6. handlePaymentComplete(statusResponse, method, quantite, prenom, telephone)
   ⚠️ Tous les paramètres passés explicitement (pas de closure)
   → step = 'CREATING_INVOICE'
   → onlineSellerService.createFactureOnline({
       id_structure, id_produit,
       quantite, prenom, telephone,
       transaction_id: `${method}-ONLINE-${id_structure}-${Date.now()}`,
       uuid: statusResponse.data.uuid,
       mode_paiement: method,
       montant: prix × quantite
     })
   → Retourne { id_facture, num_facture }

7. step = 'SUCCESS'
   → Afficher reçu inline
   → Bouton "Voir ma facture" → /facture?token=encodedToken
```

**Sections UI :**

```
┌──────────────────────────────────┐
│  🏪 NOM DE LA BOUTIQUE          │  ← Branding marchand
├──────────────────────────────────┤
│                                  │
│  [📷 Image produit / Placeholder]│  ← lazy-loaded
│                                  │
│  Nom du Produit                  │
│  12 500 FCFA                     │
│  "Description du produit..."     │
│  Catégorie: Vêtements            │
│                                  │
├──────────────────────────────────┤
│  Quantité:  [−] 1 [+]           │  ← max = stock
│  Total: 12 500 FCFA              │
├──────────────────────────────────┤
│  Votre prénom *                  │
│  [___________________________]   │
│                                  │
│  Votre téléphone *               │
│  [77_______________________]     │  ← Validation 9 chiffres
│                                  │
├──────────────────────────────────┤
│  [🟠 Payer avec Orange Money]    │  ← désactivé si form invalide
│  [🌊 Payer avec Wave        ]    │
├──────────────────────────────────┤
│  Propulsé par FayClick           │  ← Footer discret
└──────────────────────────────────┘
```

**FRs :** FR-003, FR-004, FR-005, FR-006, FR-007, FR-009
**Estimation :** ~400-500 lignes

---

#### C3 : `components/produit/ModalPartagerProduit.tsx` — Modal partage QR (marchand)

**Rôle :** Modal affichée dans le dashboard marchand pour partager un produit via QR code ou lien.

**Props :**
```typescript
interface ModalPartagerProduitProps {
  isOpen: boolean;
  onClose: () => void;
  produit: {
    id_produit: number;
    nom_produit: string;
    prix_vente: number;
  };
  idStructure: number;
}
```

**Structure UI :**
```
┌──────────────────────────────────┐
│  Partager ce produit        [✕]  │
├──────────────────────────────────┤
│  Robe Bazin - 15 000 FCFA       │
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │      [QR CODE 256x256]     │  │  ← react-qr-code
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  v2.fayclick.net/produit?tok..   │
│  [📋 Copier le lien]            │  ← navigator.clipboard
│                                  │
│  [📱 Partager sur WhatsApp]      │  ← wa.me link
│  [📥 Télécharger le QR code]     │  ← canvas → PNG
└──────────────────────────────────┘
```

**Fonctions clés :**
```typescript
// Copie dans le presse-papier
const handleCopy = async () => {
  await navigator.clipboard.writeText(produitUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// Partage WhatsApp
const handleWhatsApp = () => {
  const url = getWhatsAppProduitUrl(idStructure, produit.id_produit, produit.nom_produit);
  window.open(url, '_blank');
};

// Télécharger QR en PNG
const handleDownloadQR = async () => {
  // Utiliser la lib qrcode pour générer un canvas haute résolution
  const QRCode = await import('qrcode');
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, produitUrl, { width: 512, margin: 2 });

  const link = document.createElement('a');
  link.download = `FayClick-${produit.nom_produit}-QR.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
```

**FRs :** FR-002, FR-011
**Estimation :** ~180 lignes

---

#### C4 : `services/online-seller.service.ts` — Service métier Online Seller

**Rôle :** Service singleton dédié aux opérations publiques (sans auth) de vente en ligne. Isole la logique métier de la couche présentation.

**Pattern répliqué de :** `services/facture-publique.service.ts` (196 lignes)

**Interface publique :**
```typescript
class OnlineSellerService {
  private static instance: OnlineSellerService;
  static getInstance(): OnlineSellerService;

  /**
   * Récupère les données publiques d'un produit + structure
   * ⚠️ Ne retourne PAS cout_revient, marge, données financières
   */
  async getProduitPublic(
    idStructure: number,
    idProduit: number
  ): Promise<{
    produit: ProduitPublic;
    nom_structure: string;
  }>;

  /**
   * Vérifie la disponibilité du stock (juste avant paiement)
   */
  async checkStock(
    idStructure: number,
    idProduit: number,
    quantite: number
  ): Promise<{ disponible: boolean; stock_actuel: number }>;

  /**
   * Crée une facture + enregistre le paiement en une opération
   * Appelée APRÈS confirmation du paiement wallet
   */
  async createFactureOnline(params: {
    id_structure: number;
    id_produit: number;
    quantite: number;
    prenom: string;
    telephone: string;
    montant: number;
    transaction_id: string;
    uuid: string;
    mode_paiement: 'OM' | 'WAVE';
  }): Promise<{
    success: boolean;
    id_facture: number;
    num_facture: string;
  }>;
}
```

**Implémentation `getProduitPublic` :**
```typescript
async getProduitPublic(idStructure: number, idProduit: number) {
  // Requête directe filtrée (pas get_list_produits qui nécessite auth)
  const query = `
    SELECT
      p.id_produit,
      p.nom_produit,
      p.prix_vente,
      p.description,
      p.niveau_stock,
      p.nom_categorie,
      p.photo_url,
      s.nom_structure
    FROM list_produits_com p
    JOIN list_structures s ON s.id_structure = p.id_structure
    WHERE p.id_structure = ${idStructure}
      AND p.id_produit = ${idProduit}
  `;
  // ⚠️ PAS de cout_revient, PAS de marge → NFR-002

  const result = await DatabaseService.query(query);
  if (!result || result.length === 0) {
    throw new Error('Produit introuvable');
  }

  return {
    produit: {
      id_produit: result[0].id_produit,
      nom_produit: result[0].nom_produit,
      prix_vente: result[0].prix_vente,
      description: result[0].description,
      niveau_stock: result[0].niveau_stock,
      nom_categorie: result[0].nom_categorie,
      photo_url: result[0].photo_url
    },
    nom_structure: result[0].nom_structure
  };
}
```

**Implémentation `createFactureOnline` :**
```typescript
async createFactureOnline(params) {
  // Étape 1 : Créer la facture via create_facture_complete1
  // Format articles_string : "id_produit-quantite-prix#"
  const articlesString = `${params.id_produit}-${params.quantite}-${params.montant / params.quantite}#`;

  const createQuery = `
    SELECT * FROM create_facture_complete1(
      '${new Date().toISOString().split('T')[0]}',
      ${params.id_structure},
      '${params.telephone}',
      '${params.prenom.replace(/'/g, "''")}',
      ${params.montant},
      'Achat en ligne - ${params.prenom}',
      '${articlesString}',
      0,
      ${params.montant},
      false,
      false,
      0
    )
  `;

  const factureResult = await DatabaseService.query(createQuery);
  const facture = this.parseResult(factureResult[0]);

  if (!facture.success) {
    throw new Error(facture.message || 'Erreur création facture');
  }

  // Étape 2 : Enregistrer le paiement via add_acompte_facture
  const acompteQuery = `
    SELECT * FROM add_acompte_facture(
      ${params.id_structure},
      ${facture.id_facture},
      ${params.montant},
      '${params.transaction_id}',
      '${params.uuid}',
      '${params.mode_paiement}',
      '${params.telephone}'
    )
  `;

  await DatabaseService.query(acompteQuery);

  return {
    success: true,
    id_facture: facture.id_facture,
    num_facture: facture.num_facture || `FAC-${facture.id_facture}`
  };
}
```

**Utilitaire parsing (pattern existant) :**
```typescript
private parseResult(row: any): any {
  const key = Object.keys(row)[0];
  const data = row[key];
  return typeof data === 'string' ? JSON.parse(data) : data;
}
```

**FRs :** FR-006, FR-008, FR-009
**Estimation :** ~200 lignes

---

### 4.2 Fichiers à modifier (3 fichiers)

#### M1 : `lib/url-encoder.ts` — Ajout encodage produit

**Modification :** Ajouter 2 fonctions sur le même pattern que `encodeFactureParams`/`decodeFactureParams`.

```typescript
// ~30 lignes à ajouter en fin de fichier

export function encodeProduitParams(id_structure: number, id_produit: number): string {
  // Même logique que encodeFactureParams
  const dataToEncode = `${id_structure}-${id_produit}`;
  const encoded = typeof window !== 'undefined'
    ? btoa(dataToEncode)
    : Buffer.from(dataToEncode).toString('base64');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function decodeProduitParams(encoded: string): { id_structure: number; id_produit: number } | null {
  // Même logique que decodeFactureParams
  // Parse "id_structure-id_produit" depuis Base64 URL-safe
  try {
    let restored = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (restored.length % 4)) % 4;
    restored += '='.repeat(padding);
    const decoded = typeof window !== 'undefined' ? atob(restored) : Buffer.from(restored, 'base64').toString('utf-8');
    const parts = decoded.split('-');
    if (parts.length !== 2) return null;
    const id_structure = parseInt(parts[0]);
    const id_produit = parseInt(parts[1]);
    if (isNaN(id_structure) || isNaN(id_produit) || id_structure <= 0 || id_produit <= 0) return null;
    return { id_structure, id_produit };
  } catch { return null; }
}
```

**FRs :** FR-001

---

#### M2 : `lib/url-config.ts` — Ajout URL produit + WhatsApp

**Modification :** Ajouter 2 fonctions en fin de fichier.

```typescript
// ~25 lignes à ajouter

export function getProduitUrl(id_structure: number, id_produit: number): string {
  const { encodeProduitParams } = require('./url-encoder');
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/produit?token=${encodeProduitParams(id_structure, id_produit)}`;
}

export function getWhatsAppProduitUrl(
  id_structure: number,
  id_produit: number,
  nomProduit: string
): string {
  const produitUrl = getProduitUrl(id_structure, id_produit);
  const message = `Découvrez ${nomProduit} sur FayClick !\n${produitUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
```

**FRs :** FR-001

---

#### M3 : `app/dashboard/commerce/produits/page.tsx` — Brancher bouton QR

**Modification :** Ajouter l'état `produitPartage` et l'import de `ModalPartagerProduit`. Brancher le `onClick` du bouton QR existant dans `CarteProduit`.

**Changements :**
```typescript
// 1. Import
import ModalPartagerProduit from '@/components/produit/ModalPartagerProduit';

// 2. État
const [produitPartage, setProduitPartage] = useState<Produit | null>(null);

// 3. Dans CarteProduit, brancher le bouton QR existant
<button onClick={(e) => { e.stopPropagation(); setProduitPartage(produit); }}>
  <QrCode size={16} />
</button>

// 4. Modal en bas de page
{produitPartage && (
  <ModalPartagerProduit
    isOpen={!!produitPartage}
    onClose={() => setProduitPartage(null)}
    produit={produitPartage}
    idStructure={user.id_structure}
  />
)}
```

**FRs :** FR-002

---

### 4.3 Services réutilisés sans modification

| Service | Fichier | Utilisation |
|---------|---------|-------------|
| `paymentWalletService` | `services/payment-wallet.service.ts` | `createPayment()`, `startPolling()` — Aucune modification nécessaire, le `PaymentContext` est suffisamment flexible |
| `DatabaseService` | `services/database.service.ts` | `query()` — Proxy SQL existant, fonctionne sans auth |
| `ModalPaiementQRCode` | `components/factures/ModalPaiementQRCode.tsx` | Composant modal QR réutilisé tel quel |

---

## 5. Modèle de Données

### 5.1 Type nouveau : `ProduitPublic`

```typescript
// À ajouter dans types/produit.ts ou dans online-seller.service.ts

interface ProduitPublic {
  id_produit: number;
  nom_produit: string;
  prix_vente: number;        // Prix affiché au client
  description: string;
  niveau_stock: number;      // Pour limiter quantité
  nom_categorie: string;
  photo_url: string | null;  // Image produit (peut être null)
  // ⚠️ PAS de cout_revient, PAS de marge
}
```

### 5.2 Tables/Vues PostgreSQL utilisées

| Objet | Type | Utilisation | Auth requise |
|-------|------|-------------|-------------|
| `list_produits_com` | Vue | Récupérer données produit | Non (via proxy SQL) |
| `list_structures` | Vue | Récupérer nom_structure | Non |
| `create_facture_complete1()` | Fonction | Créer facture + détails | Non (via proxy SQL) |
| `add_acompte_facture()` | Fonction | Enregistrer paiement | Non |

### 5.3 Flux de données

```
Décodage token
    │
    ▼
SELECT produit + structure
(list_produits_com JOIN list_structures)
    │
    ▼
Affichage page publique
    │
    ▼ (après paiement COMPLETED)
    │
create_facture_complete1(
  date, id_structure, tel, prenom,
  montant, description,
  "id_produit-quantite-prix#",
  remise=0, acompte=montant, frais=false, devis=false, user=0
)
    │
    ▼
add_acompte_facture(
  id_structure, id_facture, montant,
  transaction_id, uuid, mode_paiement, telephone
)
    │
    ▼
Facture PAYÉE visible dans dashboard marchand
```

---

## 6. Contrats API

### 6.1 Paiement — Endpoints existants (aucun changement)

| Endpoint | Méthode | Payload Online Seller |
|----------|---------|-----------------------|
| `/pay_services/api/add_payement` | POST | `{ pAppName: 'FAYCLICK', pMethode: 'OM'│'WAVE', pReference: 'ONLINE-{id_produit}', pClientTel: '{telephone_saisi}', pMontant: {montant_total}, pServiceName: 'OFMS'│'INTOUCH', pNomClient: '{prenom_saisi}', pnom_structure: '{nom_structure}' }` |
| `/pay_services/api/payment_status/{uuid}` | GET | (inchangé) |

### 6.2 BD — Requêtes SQL exécutées

**Récupération produit public :**
```sql
SELECT
  p.id_produit, p.nom_produit, p.prix_vente,
  p.description, p.niveau_stock, p.nom_categorie, p.photo_url,
  s.nom_structure
FROM list_produits_com p
JOIN list_structures s ON s.id_structure = p.id_structure
WHERE p.id_structure = $1 AND p.id_produit = $2
```

**Création facture (post-paiement) :**
```sql
SELECT * FROM create_facture_complete1(
  '{date}', {id_structure}, '{tel}', '{prenom}',
  {montant}, 'Achat en ligne - {prenom}',
  '{id_produit}-{quantite}-{prix_unitaire}#',
  0, {montant}, false, false, 0
)
```

**Enregistrement paiement :**
```sql
SELECT * FROM add_acompte_facture(
  {id_structure}, {id_facture}, {montant},
  '{WALLET}-ONLINE-{id_structure}-{timestamp}',
  '{uuid}', '{mode_paiement}', '{telephone}'
)
```

### 6.3 Convention Transaction ID

Format : `{WALLET}-ONLINE-{id_structure}-{timestamp}`

Exemples :
- `OM-ONLINE-183-1738345200000`
- `WAVE-ONLINE-183-1738345200000`

Respect de la limite 19 caractères pour `pReference` : `ONLINE-{id_produit}` (ex: `ONLINE-42` = 9 chars).

---

## 7. Couverture NFRs

### NFR-001 : Performance mobile 3G/4G

**Solution :**
- `app/produit/page.tsx` est une page `'use client'` légère (~50 lignes) sans imports dashboard
- `ProduitPublicClient.tsx` n'importe que : `react-qr-code` (14KB gzipped), `payment-wallet.service`, `online-seller.service`, `ModalPaiementQRCode`
- Image produit en `loading="lazy"` avec placeholder CSS
- Pas d'import de `framer-motion` dans la page publique (réservé à la modal marchand)

**Validation :** Tester avec Chrome DevTools > Network > Slow 3G. FCP cible < 2s.

### NFR-002 : Sécurité données publiques

**Solution :**
- `onlineSellerService.getProduitPublic()` fait un SELECT explicite des colonnes publiques uniquement
- Colonnes **exclues** : `cout_revient`, `marge`, `code_barre`, données financières structure
- Le token ne contient que `id_structure` + `id_produit` (pas de donnée sensible)
- Validation des IDs (entiers positifs) avant toute requête SQL
- Échappement des chaînes utilisateur (prénom) avec `.replace(/'/g, "''")`

**Validation :** Vérifier que la réponse SQL ne contient pas de champs sensibles.

### NFR-003 : Compatibilité mobile / WhatsApp

**Solution :**
- Design mobile-first avec Tailwind : `min-w-[320px]`, tailles de tap `min-h-[44px]`
- Pas de fonctionnalités avancées (pas de WebGL, pas de WebSocket)
- Boutons pleine largeur sur mobile
- Police Inter (déjà chargée globalement)
- Test dans navigateur intégré WhatsApp (WebView Android)

**Validation :** Tester le lien dans WhatsApp sur Android (ouvrir dans navigateur intégré).

### NFR-004 : Disponibilité 24/7

**Solution :**
- Même infrastructure que `/facture` (déjà en production 24/7)
- Gestion erreur gracieuse dans `ProduitPublicClient` : try/catch avec messages utilisateur
- Si API down : "Ce produit est temporairement indisponible. Réessayez dans quelques instants."
- Pas de dépendance à un service supplémentaire

### NFR-005 : Réutilisation patterns

**Solution :**
- `paymentWalletService` réutilisé sans modification
- `ModalPaiementQRCode` réutilisé sans modification
- `DatabaseService.query()` réutilisé sans modification
- Pattern d'encodage URL identique à celui des factures
- Pattern de page publique identique à `app/facture/page.tsx`
- Pattern de service identique à `facture-publique.service.ts`

---

## 8. Sécurité

### Authentification
- **Page publique** (`/produit?token=`) : Aucune auth requise (par design)
- **Modal marchand** (`ModalPartagerProduit`) : Dans le dashboard, protégée par AuthGuard existant

### Validation des entrées
| Champ | Validation | Risque mitigé |
|-------|-----------|---------------|
| Token | Base64 URL-safe, décodage → 2 entiers positifs | Injection token |
| Prénom | Min 2 chars, échappement `'` | SQL injection |
| Téléphone | Regex `/(77\|78\|76\|70\|75)\d{7}/` exactement 9 chiffres | Format invalide |
| Quantité | Entier ≥ 1, ≤ stock disponible | Achat impossible |

### Données exposées publiquement
- Nom, prix, description, stock, catégorie, image du produit
- Nom de la structure (boutique)

### Données protégées (jamais exposées)
- Coût de revient, marge bénéficiaire
- Email, mot de passe, données financières du marchand
- Autres produits de la structure (seulement celui du token)

---

## 9. Diagramme de séquence complet

```
Marchand                 FayClick                    Acheteur
   │                        │                            │
   │  Clic QR produit       │                            │
   │───────────────────────>│                            │
   │                        │                            │
   │  ModalPartagerProduit  │                            │
   │<───────────────────────│                            │
   │                        │                            │
   │  Copie lien / WhatsApp │                            │
   │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ >│
   │                        │                            │
   │                        │  GET /produit?token=XX     │
   │                        │<───────────────────────────│
   │                        │                            │
   │                        │  SELECT produit+structure  │
   │                        │──> PostgreSQL              │
   │                        │<── { produit, nom_struct } │
   │                        │                            │
   │                        │  Page produit HTML         │
   │                        │───────────────────────────>│
   │                        │                            │
   │                        │  Saisie prénom+tel+qty     │
   │                        │<───────────────────────────│
   │                        │                            │
   │                        │  Clic "Payer OM"           │
   │                        │<───────────────────────────│
   │                        │                            │
   │                        │  POST add_payement         │
   │                        │──> API icelabsoft          │
   │                        │<── { uuid, qrCode }       │
   │                        │                            │
   │                        │  QR code affiché           │
   │                        │───────────────────────────>│
   │                        │                            │
   │                        │  Client paie via app OM    │
   │                        │                    OM ←────│
   │                        │                            │
   │                        │  Polling payment_status    │
   │                        │──> API (toutes les 5s)     │
   │                        │<── COMPLETED               │
   │                        │                            │
   │                        │  create_facture_complete1  │
   │                        │──> PostgreSQL              │
   │                        │<── { id_facture }          │
   │                        │                            │
   │                        │  add_acompte_facture       │
   │                        │──> PostgreSQL              │
   │                        │<── { success }             │
   │                        │                            │
   │                        │  Écran reçu ✓              │
   │                        │───────────────────────────>│
   │                        │                            │
   │  Facture visible       │                            │
   │  dans dashboard        │                            │
   │<───────────────────────│                            │
```

---

## 10. Traçabilité FR → Composants

| FR | Titre | Composants |
|----|-------|------------|
| FR-001 | Token produit | `url-encoder.ts`, `url-config.ts` |
| FR-002 | Modal partage | `ModalPartagerProduit.tsx`, `produits/page.tsx` |
| FR-003 | Route publique | `app/produit/page.tsx`, `ProduitPublicClient.tsx` |
| FR-004 | Affichage produit | `ProduitPublicClient.tsx` |
| FR-005 | Paiement mobile | `ProduitPublicClient.tsx`, `ModalPaiementQRCode` (existant) |
| FR-006 | Création facture | `online-seller.service.ts` |
| FR-007 | Reçu | `ProduitPublicClient.tsx` (état SUCCESS) |
| FR-008 | Données publiques | `online-seller.service.ts` |
| FR-009 | Vérification stock | `online-seller.service.ts`, `ProduitPublicClient.tsx` |
| FR-010 | Open Graph | `app/produit/page.tsx` (generateMetadata - Phase 4) |
| FR-011 | Téléchargement QR | `ModalPartagerProduit.tsx` |
| FR-012 | Anti-abus | `ProduitPublicClient.tsx` (disable buttons pendant polling) |

---

## 11. Traçabilité NFR → Solutions

| NFR | Titre | Solution | Validation |
|-----|-------|----------|------------|
| NFR-001 | Performance 3G | Bundle minimal, lazy loading images | Chrome DevTools Slow 3G, FCP < 2s |
| NFR-002 | Sécurité données | SELECT explicite sans champs sensibles | Inspecter réponse SQL |
| NFR-003 | Compatibilité mobile | Mobile-first, tap 44px, test WebView WhatsApp | Test WhatsApp Android |
| NFR-004 | Disponibilité | Même infra, gestion erreurs gracieuse | Test avec API down |
| NFR-005 | Réutilisation | 0 nouveau service paiement, patterns identiques | Code review |

---

## 12. Trade-offs documentés

### T1 : Requête SQL directe vs Fonction PostgreSQL dédiée

**Décision :** Utiliser un SELECT direct sur `list_produits_com JOIN list_structures` au lieu de créer une nouvelle fonction PostgreSQL `get_produit_public()`.

**Avantages :**
- Pas de dépendance côté DBA pour créer/déployer une fonction PG
- Implémentation immédiate côté frontend
- Contrôle explicite des colonnes retournées (sécurité)

**Inconvénients :**
- Requête SQL dans le code JS (moins élégant)
- Si la vue `list_produits_com` change, il faut ajuster le SELECT

**Justification :** Pour la V1, la simplicité prime. On pourra migrer vers une fonction PG dédiée en V2 si nécessaire.

---

### T2 : Facture créée APRÈS paiement vs AVANT paiement

**Décision :** Créer la facture **après** confirmation du paiement (pas avant).

**Avantages :**
- Pas de factures orphelines (créées mais jamais payées)
- Pas de nettoyage nécessaire
- Le marchand ne voit que des factures réellement payées

**Inconvénients :**
- Si la création de facture échoue après paiement, le client a payé mais pas de facture
- Nécessite un mécanisme de retry/support

**Mitigation :** Logger les paiements réussis sans facture. Afficher message "Paiement reçu, votre reçu sera disponible sous peu" en cas d'erreur facture. Le marchand peut vérifier dans son wallet.

---

### T3 : Page 'use client' vs SSR avec generateMetadata

**Décision :** V1 en `'use client'` pur (comme `/facture`). Open Graph (FR-010) reporté en Phase 4 car nécessite SSR.

**Avantages :**
- Pattern identique à `/facture` (cohérence)
- Implémentation rapide
- Pas de complexité SSR

**Inconvénients :**
- Pas de preview riche sur WhatsApp/TikTok en V1
- Les crawlers sociaux verront une page blanche

**Mitigation :** Phase 4 ajoutera `generateMetadata` côté serveur pour décoder le token et injecter les OG tags. L'impact fonctionnel est limité car les marchands partagent le lien avec un message explicite.

---

## 13. Organisation du code & Ordre d'implémentation

### Phase 1 : Fondation (EPIC-001)
```
lib/url-encoder.ts        → +encodeProduitParams, +decodeProduitParams
lib/url-config.ts          → +getProduitUrl, +getWhatsAppProduitUrl
```

### Phase 2 : Modal Marchand (EPIC-002)
```
components/produit/ModalPartagerProduit.tsx   → Nouveau
app/dashboard/commerce/produits/page.tsx       → Brancher bouton QR
```

### Phase 3 : Page Publique (EPIC-003)
```
services/online-seller.service.ts             → Nouveau
app/produit/page.tsx                           → Nouveau
components/produit/ProduitPublicClient.tsx     → Nouveau
```

### Phase 4 : Optimisations (EPIC-004)
```
app/produit/page.tsx                           → Ajouter generateMetadata (SSR)
components/produit/ProduitPublicClient.tsx     → Anti-abus
```

### Estimation taille du code

| Fichier | Lignes estimées | Complexité |
|---------|----------------|------------|
| `url-encoder.ts` (ajouts) | ~30 | Faible |
| `url-config.ts` (ajouts) | ~25 | Faible |
| `ModalPartagerProduit.tsx` | ~180 | Moyenne |
| `produits/page.tsx` (modif) | ~15 | Faible |
| `online-seller.service.ts` | ~200 | Moyenne |
| `app/produit/page.tsx` | ~50 | Faible |
| `ProduitPublicClient.tsx` | ~450 | Haute |
| **TOTAL** | **~950 lignes** | |

---

## 14. Checklist de validation

- [x] Tous les 12 FRs ont des composants assignés
- [x] Tous les 5 NFRs ont des solutions architecturales
- [x] Stack technologique : aucun ajout, tout existant
- [x] Trade-offs documentés (3)
- [x] Sécurité : données sensibles protégées, validation inputs
- [x] Modèle de données défini (ProduitPublic)
- [x] Contrats API/SQL spécifiés
- [x] Réutilisation maximale : `paymentWalletService`, `ModalPaiementQRCode`, `DatabaseService`, patterns URL
- [x] Ordre d'implémentation en 4 phases
- [x] Estimation : ~950 lignes de code nouveau, 3 fichiers modifiés, 4 fichiers créés

---

## 15. Prochaine étape

L'architecture est complète. Documentation disponible :
- PRD : `docs/prd-online-seller-2026-01-31.md`
- Architecture : `docs/architecture-online-seller-2026-01-31.md`

**Recommandation :** Lancer `/bmad-story` ou `/sprint-planning` pour découper les Epics en stories détaillées et commencer l'implémentation sur la branche `online_seller`.

---

*Document généré par BMAD Method - FayClick V2*
*Branche : `online_seller`*
