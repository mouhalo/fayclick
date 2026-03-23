# PRD - Live Shopping : Activation Vente en Ligne via Lives

**Version:** 1.0
**Date:** 23 mars 2026
**Projet:** FayClick V2
**Branche:** `feature/vente-en-ligne-promo`
**Statut:** En cours — DB en creation par DBA

---

## 1. Resume Executif

Les marchands FayClick font des lives sur les reseaux sociaux (Facebook, TikTok, Instagram) pour vendre leurs produits. Aujourd'hui, il n'y a aucun lien entre ces lives et la plateforme FayClick. Cette fonctionnalite permet aux marchands de **creer un live sur FayClick**, selectionner les produits a publier en ligne, et donner aux clients un moyen de **retrouver leur catalogue en cherchant le nom du live** sur la marketplace.

### Proposition de valeur
> Un marchand fait un live sur Facebook. Il dit a son audience : "Cherchez **PROMO TABASKI MODOU** sur FayClick pour acheter mes produits". Les clients vont sur `/catalogues`, tapent le nom du live, trouvent le catalogue du marchand, et achetent directement via mobile money.

---

## 2. Workflow Utilisateur

### 2.1. Cote Marchand (Dashboard Produits)

```
1. Marchand ouvre sa page Produits (/dashboard/commerce/produits)
2. Il voit un nouveau bouton "Creer un Live" dans le header
3. Clic → Modal "Creer un Live" s'ouvre
4. Il remplit :
   - Nom du live (ex: "PROMO TABASKI MODOU") — requis
   - Date/heure debut — requis
   - Date/heure fin — requis
   - Telephone contact 1 (WhatsApp) — optionnel
   - Telephone contact 2 — optionnel
5. Il selectionne les produits a publier (parmi ceux en stock > 0)
   - Liste avec checkbox multi-selection
   - Recherche/filtre dans la liste
   - Compteur de produits selectionnes
6. Validation → Appel create_live()
   - Les produits selectionnés passent a presente_au_public = true
   - Le live est cree en base
7. Succes → Le marchand voit un badge "Live actif" dans le header
   avec le nom du live et un bouton supprimer
```

### 2.2. Cote Client (Marketplace)

```
1. Client arrive sur /catalogues
2. Il voit le badge "X Lives" (nombre reel de lives actifs)
3. Dans la barre de recherche, il tape le nom du live
   (ex: "PROMO TABASKI" ou "MODOU")
4. La recherche detecte un match avec un live actif
5. Suggestion affichee : "🔴 PROMO TABASKI MODOU - Boutique MODOU SHOP"
6. Clic → Redirection vers /catalogue?id=X
7. Sur la page boutique, les contacts du live sont affiches
   (boutons WhatsApp/Appel)
8. Le client achete via le panier + paiement mobile money
```

---

## 3. Specifications Base de Donnees

### 3.1. Tables (creees par DBA)

**Table `active_live`** :
```sql
active_live (
  id_live SERIAL PRIMARY KEY,
  id_structure INTEGER NOT NULL,
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP NOT NULL,
  nom_du_live VARCHAR(255) NOT NULL,
  tel_contact1 VARCHAR(20),
  tel_contact2 VARCHAR(20),
  createdat TIMESTAMP DEFAULT NOW()
)
-- Contrainte : 1 seul live actif par structure (date_fin > NOW())
```

**Table `live_produits`** :
```sql
live_produits (
  id_live INTEGER REFERENCES active_live(id_live) ON DELETE CASCADE,
  id_produit INTEGER REFERENCES produits(id_produit),
  PRIMARY KEY (id_live, id_produit)
)
```

### 3.2. Fonctions PostgreSQL (creees par DBA)

| Fonction | Description |
|----------|-------------|
| `create_live(pid_structure, pnom, pdebut, pfin, ptel1, ptel2, pproduit_ids[])` | Cree le live + insere produits + met presente_au_public=true |
| `delete_live(pid_structure, pid_live)` | Supprime le live (produits restent publics) |
| `get_active_live(pid_structure)` | Retourne le live actif de la structure avec ses produits |
| `get_lives_actifs()` | Retourne tous les lives actifs (pour marketplace badge + recherche) |

---

## 4. Specifications Frontend

### 4.1. Nouveaux Types TypeScript

**Fichier** : `types/live.ts`

```typescript
export interface Live {
  id_live: number;
  id_structure: number;
  date_debut: string;
  date_fin: string;
  nom_du_live: string;
  tel_contact1: string | null;
  tel_contact2: string | null;
  createdat: string;
  // Enrichi par get_active_live
  produits?: LiveProduit[];
  // Enrichi par get_lives_actifs
  nom_structure?: string;
  logo?: string;
  nb_produits?: number;
}

export interface LiveProduit {
  id_produit: number;
  nom_produit: string;
  prix_vente: number;
  stock_disponible: number;
  photo_url?: string;
}

export interface CreateLiveParams {
  id_structure: number;
  nom_du_live: string;
  date_debut: string;
  date_fin: string;
  tel_contact1?: string;
  tel_contact2?: string;
  produit_ids: number[];
}

export interface LivesActifsResponse {
  success: boolean;
  total: number;
  lives: Live[];
}
```

### 4.2. Nouveau Service

**Fichier** : `services/live.service.ts`

| Methode | Description |
|---------|-------------|
| `createLive(params: CreateLiveParams)` | Appelle `create_live()` |
| `deleteLive(id_structure, id_live)` | Appelle `delete_live()` |
| `getActiveLive(id_structure)` | Appelle `get_active_live()` |
| `getLivesActifs()` | Appelle `get_lives_actifs()` — cache 2min |

### 4.3. Nouveaux Composants

| # | Composant | Fichier | Description |
|---|-----------|---------|-------------|
| C-1 | `ModalCreerLive` | `components/live/ModalCreerLive.tsx` | Modal creation live avec formulaire + selection produits |
| C-2 | `LiveBadgeHeader` | `components/live/LiveBadgeHeader.tsx` | Badge "Live actif" dans le header produits avec nom + bouton supprimer |
| C-3 | `ProduitCheckList` | `components/live/ProduitCheckList.tsx` | Liste de produits avec checkbox pour selection (recherche + filtre stock > 0) |

### 4.4. Composants Modifies

| Composant | Fichier | Modifications |
|-----------|---------|---------------|
| Page Produits | `app/dashboard/commerce/produits/page.tsx` | Ajout bouton "Creer Live" dans header + badge live actif |
| `MarketplaceSearchBar` | `components/marketplace/MarketplaceSearchBar.tsx` | Recherche dans les noms de lives actifs |
| `MarketplaceHero` | `components/marketplace/MarketplaceHero.tsx` | Badge "X Lives" connecte aux donnees reelles |
| `marketplace-search.service.ts` | `services/marketplace-search.service.ts` | Ajout recherche par nom de live |

---

## 5. Specifications Detaillees

### 5.1. Modal Creer Live (`ModalCreerLive`)

**Declenchement** : Bouton dans le header de la page Produits.

**Etape 1 — Formulaire** :
```
┌─────────────────────────────────────────┐
│  ✕                 Creer un Live        │
├─────────────────────────────────────────┤
│                                         │
│  Nom du live *                          │
│  [PROMO TABASKI MODOU              ]    │
│                                         │
│  Date et heure debut *                  │
│  [23/03/2026]  [14:00]                  │
│                                         │
│  Date et heure fin *                    │
│  [23/03/2026]  [18:00]                  │
│                                         │
│  Telephone WhatsApp (optionnel)         │
│  [77 XXX XX XX]                         │
│                                         │
│  Telephone 2 (optionnel)               │
│  [78 XXX XX XX]                         │
│                                         │
│            [Suivant →]                  │
└─────────────────────────────────────────┘
```

**Validations formulaire** :
- Nom du live : requis, 3-100 caracteres
- Date debut : requis, >= maintenant
- Date fin : requis, > date debut, max 7 jours apres debut
- Telephones : format senegalais (7XXXXXXXX) si renseigne

**Etape 2 — Selection produits** :
```
┌─────────────────────────────────────────┐
│  ← Retour       Selectionner produits   │
├─────────────────────────────────────────┤
│  [🔍 Rechercher un produit...]          │
│  ☑ 12 produits selectionnes             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ☑ Savon Dove 250ml    500 FCFA │    │
│  │   Stock: 45                     │    │
│  ├─────────────────────────────────┤    │
│  │ ☑ Lait Nido 400g    2500 FCFA  │    │
│  │   Stock: 12                     │    │
│  ├─────────────────────────────────┤    │
│  │ ☐ Sucre 1kg          800 FCFA  │    │
│  │   Stock: 30                     │    │
│  ├─────────────────────────────────┤    │
│  │ ☐ Riz Oncle Sam      1200 FCFA │    │
│  │   Stock: 0  ⚠️ Epuise          │    │ ← disabled
│  └─────────────────────────────────┘    │
│                                         │
│  [Tout selectionner]  [Deselectioner]   │
│                                         │
│  [Creer le live (12 produits) ✓]        │
└─────────────────────────────────────────┘
```

**Comportement** :
- Seuls les produits avec `stock > 0` sont selectionnables
- Produits a stock 0 affiches en grise avec badge "Epuise"
- Bouton "Tout selectionner" selectionne tous les produits en stock
- Recherche locale par nom de produit (debounce 200ms)
- Minimum 1 produit requis pour creer le live

### 5.2. Badge Live Actif (`LiveBadgeHeader`)

Affiche dans le header de la page Produits quand un live est actif :

```
┌──────────────────────────────────────────┐
│ 🔴 Live actif : PROMO TABASKI MODOU     │
│    Jusqu'a 18:00 · 12 produits  [✕ Fin] │
└──────────────────────────────────────────┘
```

- Pulse rouge animation sur le dot
- Nom du live en bold
- Heure de fin
- Nombre de produits
- Bouton "Fin" (supprimer) avec confirmation

### 5.3. Recherche Lives sur Marketplace

**Dans `MarketplaceSearchBar`** :

Quand le client tape dans la barre de recherche :
1. On cherche d'abord dans les **noms de lives actifs** (priorite)
2. Puis dans les **noms de structures** (existant)

**Affichage suggestion live** :
```
┌──────────────────────────────────────────┐
│ 🔴 PROMO TABASKI MODOU                  │
│    MODOU SHOP · Jusqu'a 18:00 · 12 prod.│
├──────────────────────────────────────────┤
│ 🏪 MODOU SHOP                           │
│    📱 777301221 · 150 produits           │
└──────────────────────────────────────────┘
```

Les resultats de lives apparaissent en premier avec un indicateur 🔴 rouge.

### 5.4. Badge Lives Actifs sur Hero

Le badge "3 Lives" existant dans `MarketplaceHero` sera connecte aux donnees reelles :
- Appel `get_lives_actifs()` via le service
- Affiche le nombre reel de lives en cours
- Si 0 lives → badge masque

---

## 6. Plan de Livraison

### Phase 1 : Base de donnees (DBA — en cours)
- [x] Creer table `active_live`
- [x] Creer table `live_produits`
- [x] Creer fonctions PostgreSQL (create, delete, get_active, get_actifs)
- [x] Index de performance

### Phase 2 : Types + Service (Jour 1)
- [ ] Creer `types/live.ts`
- [ ] Creer `services/live.service.ts` (CRUD + cache)

### Phase 3 : Composants Live (Jours 2-3)
- [ ] Creer `ModalCreerLive.tsx` (formulaire 2 etapes + selection produits)
- [ ] Creer `LiveBadgeHeader.tsx` (badge live actif + suppression)
- [ ] Creer `ProduitCheckList.tsx` (liste checkboxes produits)
- [ ] Integrer dans `page.tsx` produits (bouton header + badge)

### Phase 4 : Integration Marketplace (Jour 4)
- [ ] Adapter `MarketplaceSearchBar` (recherche par nom de live)
- [ ] Adapter `MarketplaceHero` (badge Lives reel)
- [ ] Adapter `marketplace-search.service.ts` (inclure lives dans recherche)

### Phase 5 : Tests & Polish (Jour 5)
- [ ] Test creation live (formulaire + selection produits)
- [ ] Test suppression live
- [ ] Test recherche live sur marketplace
- [ ] Test badge Lives temps reel
- [ ] Test redirection vers catalogue
- [ ] Verifier que `presente_au_public` passe bien a true
- [ ] Test responsive mobile

---

## 7. Criteres d'Acceptation

### Cote Marchand

| # | Critere | Verification |
|---|---------|--------------|
| AC-1 | Le bouton "Creer Live" est visible dans le header produits | Visuellement |
| AC-2 | Le modal s'ouvre avec formulaire + selection produits | Clic bouton |
| AC-3 | Seuls les produits avec stock > 0 sont selectionnables | Verifier disabled sur stock 0 |
| AC-4 | Le live est cree en base avec les produits | Verifier BD |
| AC-5 | Les produits selectionnés passent a presente_au_public=true | Verifier BD |
| AC-6 | Le badge "Live actif" apparait dans le header | Apres creation |
| AC-7 | Le marchand peut supprimer le live | Clic "Fin" + confirmation |
| AC-8 | Un seul live actif par structure | Tenter de creer un 2e → erreur |

### Cote Marketplace

| # | Critere | Verification |
|---|---------|--------------|
| AC-9 | Le badge "X Lives" affiche le nombre reel | Comparer avec BD |
| AC-10 | La recherche par nom de live fonctionne | Taper nom du live |
| AC-11 | Suggestion avec 🔴 et nom du live | Observer dropdown |
| AC-12 | Clic suggestion → redirection /catalogue?id=X | Verifier URL |
| AC-13 | Les produits du live sont visibles sur le catalogue | Verifier visuellement |

---

## 8. Risques & Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Marchand cree un live sans produits | Bloque | Minimum 1 produit requis (validation frontend + backend) |
| Live expire mais produits restent publics | Attendu | Par design — les produits restent visibles apres le live |
| Nom de live non unique entre structures | Faible | Pas de contrainte — la recherche retourne plusieurs resultats |
| Marchand supprime live par erreur | Moyen | Confirmation modale avant suppression |
| Performance get_lives_actifs() | Faible | Cache 2 min + index sur date_fin |

---

*PRD redige le 23 mars 2026 — En attente finalisation DBA pour demarrer l'implementation.*
