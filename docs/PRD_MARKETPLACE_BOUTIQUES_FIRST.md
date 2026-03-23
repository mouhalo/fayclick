# PRD - Marketplace "Boutiques-First" : Suppression Produits & Focus Boutiques

**Version:** 1.0
**Date:** 23 mars 2026
**Auteur:** Equipe PRD (Product Manager + UX Expert)
**Projet:** FayClick V2
**Statut:** En attente validation

---

## 1. Resume Executif

La page `/catalogues` charge actuellement **118K+ produits** via `get_all_produits_publics()`, ce qui provoque des temps de chargement inacceptables (5-10s+). Cette refonte elimine completement la grille de produits de la page marketplace et recentre l'experience sur la **decouverte des boutiques**.

### Changement strategique
> **Avant** : Marketplace = Hero + Carrousel boutiques + Grille 118K produits (lent)
> **Apres** : Marketplace = Hero + Boutiques Vedettes + Toutes les Boutiques (rapide)

Les produits restent accessibles uniquement via la page boutique individuelle (`/catalogue?id=X`), qui charge deja les produits d'une seule structure de maniere performante.

### Source de donnees
```sql
SELECT ls.id_structure, ls.code_structure, ls.nom_structure, ls.adresse,
       ls.mobile_om, ls.id_localite, ls.actif, ls.logo, ls.createdat,
       ls.id_type, ls.type_structure
FROM list_structures ls
```

---

## 2. Probleme & Motivation

### 2.1. Probleme de performance actuel

| Metrique | Valeur actuelle | Impact |
|----------|-----------------|--------|
| Fonction PostgreSQL appelee | `get_all_produits_publics()` | Charge **118K+ produits** avec photos, categories, stocks |
| Temps de reponse API | 3-8 secondes | Page bloquee pendant le chargement |
| Taille payload JSON | ~5-15 MB | Consommation data excessive (cible: Senegal, 4G intermittente) |
| Timeout configure | 120 secondes | Risque de timeout sur connexions lentes |
| Transformations client-side | Aplatissement + deduplication structures | CPU mobile mobilise pendant le parsing |

### 2.2. Constat UX

L'audit UX du 4 mars 2026 (note 5.5/10) a confirme que **95% des produits n'ont pas de photo**, rendant la grille produits visuellement pauvre. Le carrousel boutiques, lui, a un meilleur rendu car les logos sont plus distinctifs.

### 2.3. Logique metier

- Un visiteur vient sur `/catalogues` pour **trouver un marchand** (par nom ou telephone)
- Les produits sans photos nuisent a la credibilite de la marketplace
- Charger tous les produits pour afficher essentiellement des placeholders est un gaspillage de resources
- Rediriger vers la boutique individuelle permet un chargement cible et performant

---

## 3. Objectifs

| # | Objectif | Metrique de succes |
|---|----------|--------------------|
| OBJ-1 | Reduire drastiquement le temps de chargement de `/catalogues` | Temps < 1.5s (vs 5-10s actuel) |
| OBJ-2 | Afficher TOUTES les boutiques FayClick (pas seulement celles avec produits) | 100% des structures actives visibles |
| OBJ-3 | Mettre en avant les boutiques vedettes (avec produits publies) | Section distincte, position haute |
| OBJ-4 | Reduire la consommation data mobile | Payload < 100 KB (vs 5-15 MB actuel) |
| OBJ-5 | Conserver l'experience d'achat via boutique individuelle | Parcours clic boutique → produits → panier intact |

---

## 4. Scope

### 4.1. Dans le scope

| Element | Description |
|---------|-------------|
| Page `/catalogues` | Refonte : suppression grille produits, remplacement par grille boutiques |
| Service `catalogues-public.service.ts` | Nouveau endpoint : charger toutes les structures depuis `list_structures` |
| Composant `CataloguesGlobalClient.tsx` | Refonte du layout : 2 sections boutiques au lieu de grille produits |
| Hero & Stats | Adaptation : stats produits → stats boutiques |
| Recherche | Conservation recherche par nom/telephone (inchangee) |
| Filtres | Adaptation : filtres par type de structure au lieu de categories produits |
| Composants marketplace supprimables | `DesktopSidebar` (filtres prix/categories produits), `SortDropdown` (tri produits) |

### 4.2. Hors scope

| Element | Raison |
|---------|--------|
| Page `/catalogue?id=X` | Reste inchangee, charge les produits d'une boutique |
| `PanierPublic` / `DesktopMiniCart` | Inutiles sur `/catalogues` sans produits (masques) |
| `CarteProduit` | Utilise uniquement dans `/catalogue?id=X` |
| Landing page `/` | Pas de modifications |
| Systeme de paiement | Inchange |

---

## 5. Directives UX & Design

### 5.1. Theme conserve (OBLIGATOIRE)

Le theme **dark glassmorphism emeraude** est strictement conserve :

```css
/* Background principal */
background: linear-gradient(from-slate-900 via-emerald-900 to-teal-900);

/* Surfaces glassmorphism */
bg-white/5 backdrop-blur-2xl border border-white/10

/* Accent principal */
text-emerald-400, bg-emerald-500

/* Typographie */
Headings: Montserrat Bold
Body: Inter Regular
Couleur texte: white, white/60, white/40
```

### 5.2. Principes UX conserves

| Principe | Application |
|----------|-------------|
| Mobile-First | Concevoir d'abord pour 360px |
| Touch-friendly | Zones tactiles >= 44px |
| Lisibilite | Taille min 12px mobile |
| Performance | Lazy loading images, skeleton loading |
| Feedback immediat | Reponse visuelle < 100ms |
| Glassmorphism | Cartes avec `backdrop-blur`, `border-white/10-20` |

### 5.3. Grille responsive boutiques

| Breakpoint | Colonnes | Gap |
|------------|----------|-----|
| Mobile < 480px | 2 colonnes | 12px |
| Mobile 480-639px | 2 colonnes | 14px |
| Tablette 640-767px | 3 colonnes | 16px |
| Tablette 768-1023px | 3-4 colonnes | 16px |
| Desktop 1024-1279px | 4 colonnes | 20px |
| Grand ecran >= 1280px | 5 colonnes | 20px |

---

## 6. Specifications Fonctionnelles

### 6.1. Architecture de la page `/catalogues` (NOUVELLE)

```
┌─────────────────────────────────────────────────────┐
│  HEADER STICKY (MarketplaceNavbar — desktop)        │
│  [Logo FayClick] [Barre Recherche] [Nav links]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HERO SECTION (adapte)                              │
│  ┌─────────────────────────────────────────────┐    │
│  │  Logo + FayClick (mobile)                    │    │
│  │  [Barre recherche unifiee nom/telephone]     │    │
│  │  Stats : [X boutiques] [Y actives] [Z villes]│   │
│  │  Hero banner desktop (inchange)              │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  SECTION 1 : BOUTIQUES VEDETTES ⭐                  │
│  "Nos marchands avec catalogue en ligne"            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ Logo   │ │ Logo   │ │ Logo   │ │ Logo   │      │
│  │ Nom    │ │ Nom    │ │ Nom    │ │ Nom    │      │
│  │ Ville  │ │ Ville  │ │ Ville  │ │ Ville  │      │
│  │ N prod │ │ N prod │ │ N prod │ │ N prod │      │
│  │[Voir →]│ │[Voir →]│ │[Voir →]│ │[Voir →]│      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│  (Grille complete, pas de carrousel)                │
│                                                     │
│  ──────────── SEPARATEUR ────────────               │
│                                                     │
│  SECTION 2 : TOUTES LES BOUTIQUES                  │
│  "Decouvrez tous nos marchands"                     │
│  [Filtre type ▼] [Rechercher...]                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ Logo   │ │ Logo   │ │ Logo   │ │ Logo   │      │
│  │ Nom    │ │ Nom    │ │ Nom    │ │ Nom    │      │
│  │ Type   │ │ Type   │ │ Type   │ │ Type   │      │
│  │ Ville  │ │ Ville  │ │ Ville  │ │ Ville  │      │
│  │[Voir →]│ │[Voir →]│ │[Voir →]│ │[Voir →]│      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│  [Charger plus (N restants)]                        │
│                                                     │
│  FOOTER                                             │
│  [A propos] [Contact] [CGU] [Reseaux]               │
└─────────────────────────────────────────────────────┘
```

### 6.2. Source de donnees : Requete SQL

**Requete principale** (TOUTES les structures) :

```sql
SELECT ls.id_structure,
       ls.code_structure,
       ls.nom_structure,
       ls.adresse,
       ls.mobile_om,
       ls.id_localite,
       ls.actif,
       ls.logo,
       ls.createdat,
       ls.id_type,
       ls.type_structure
FROM list_structures ls
WHERE ls.actif = true
ORDER BY ls.createdat DESC;
```

> **Note** : `list_structures` est une **vue** PostgreSQL qui retourne toutes les structures. Le filtre `actif = true` exclut les structures desactivees.

**Distinction Vedettes vs Autres** :
- **Vedettes** = structures presentes dans le cache `get_all_produits_publics()` OU marquees comme ayant au moins 1 produit public
- **Alternative legere** : Ajouter un champ calcule ou une sous-requete :
  ```sql
  SELECT ls.*,
    EXISTS (
      SELECT 1 FROM produits p
      WHERE p.id_structure = ls.id_structure
      AND p.presente_au_public = true
    ) AS a_des_produits
  FROM list_structures ls
  WHERE ls.actif = true
  ORDER BY a_des_produits DESC, ls.nom_structure ASC;
  ```
  Cette approche trie les vedettes en premier, puis les autres alphabetiquement.

### 6.3. Section Hero (adaptee)

**Changements par rapport a l'actuel** :

| Element | Avant | Apres |
|---------|-------|-------|
| Stats pilule 1 | `{N}+ PRODUITS` | `{N} BOUTIQUES` |
| Stats pilule 2 | `{N} BOUTIQUES` | `{N} AVEC CATALOGUE` (vedettes) |
| Stats pilule 3 | `{N} CATEGORIES` | `{N} VILLES` (ou garder categories) |
| Bouton desktop | "Explorer les boutiques" → scroll grille produits | "Explorer les boutiques" → scroll section vedettes |
| Barre recherche | Inchangee (recherche nom/telephone) | Inchangee |

### 6.4. Section Boutiques Vedettes

**Definition** : Structures ayant **au moins 1 produit public** (`presente_au_public = true`).

**Layout** : Grille (PAS un carrousel) pour afficher toutes les vedettes visiblement.

**Carte Boutique Vedette** :
```
┌────────────────────────────┐
│  ┌─────────┐               │
│  │  Logo    │               │
│  │  80x80   │               │
│  └─────────┘               │
│                             │
│  NOM STRUCTURE              │  ← Montserrat SemiBold 14px, white, line-clamp-2
│  📍 Adresse / Ville         │  ← Inter 11px, white/50, line-clamp-1
│  📦 N produits en ligne     │  ← Inter 11px, emerald-400
│                             │
│  [Voir la boutique →]       │  ← Bouton CTA emerald
│  ⭐ Badge "Catalogue actif" │  ← Badge doré/emeraude petit
└────────────────────────────┘
```

**Specifications carte** :

| Propriete | Valeur |
|-----------|--------|
| Background | `bg-white/5 backdrop-blur-xl border border-white/10` |
| Hover | `hover:bg-white/10 hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10` |
| Border radius | `rounded-2xl` |
| Padding | `p-4` |
| Logo | 80x80px, `rounded-xl`, fallback = initiale sur gradient emerald |
| Nom | `text-white font-semibold text-sm`, max 2 lignes |
| Adresse | `text-white/50 text-xs`, icone MapPin, 1 ligne max |
| Badge produits | `text-emerald-400 text-xs`, icone Package |
| Bouton CTA | `bg-emerald-500/20 border border-emerald-400/20 text-emerald-200 text-xs hover:bg-emerald-500/30` |
| Badge vedette | Petit badge `bg-amber-500/20 text-amber-300 text-[9px]` "Catalogue actif" |
| Clic | → `/catalogue?id={id_structure}` |
| Animation entree | Framer Motion: opacity 0→1, y: 15→0, stagger 0.03s |

**Titre section** :
```
"Boutiques avec catalogue en ligne" ou "Nos marchands vedettes ⭐"
Sous-titre : "{N} marchands proposent leurs produits"
```

### 6.5. Section Toutes les Boutiques

**Definition** : TOUTES les structures actives, y compris celles sans produits publies.

**Layout** : Grille paginee (24 par page).

**Carte Boutique Standard** :
```
┌────────────────────────────┐
│  ┌─────────┐               │
│  │  Logo    │               │
│  │  64x64   │               │
│  └─────────┘               │
│                             │
│  NOM STRUCTURE              │  ← Montserrat SemiBold 13px, white
│  🏷️ Type : Commerce         │  ← Inter 11px, white/40, badge type
│  📍 Adresse                 │  ← Inter 10px, white/40
│                             │
│  [Voir →]                   │  ← Bouton outline discret
└────────────────────────────┘
```

**Specifications carte** :

| Propriete | Valeur |
|-----------|--------|
| Background | `bg-white/[0.03] border border-white/[0.07]` (plus subtil que vedettes) |
| Hover | `hover:bg-white/[0.07] hover:border-white/15` |
| Border radius | `rounded-xl` |
| Padding | `p-3` |
| Logo | 64x64px, `rounded-lg`, fallback initiale |
| Badge type | Chip : `bg-{couleur}/10 text-{couleur} text-[10px] px-2 py-0.5 rounded-full` |
| Bouton CTA | Outline : `border border-white/20 text-white/60 text-xs hover:border-white/30` |
| Animation | Meme stagger que vedettes |

**Couleurs par type de structure** :

| Type | Couleur badge |
|------|---------------|
| COMMERCIALE | `emerald` (vert) |
| SCOLAIRE | `blue` (bleu) |
| IMMOBILIER | `orange` (orange) |
| PRESTATAIRE | `purple` (violet) |
| Autre/inconnu | `slate` (gris) |

**Filtres disponibles** :

| Filtre | Type | Options |
|--------|------|---------|
| Type de structure | Chips horizontales | Tous, Commerce, Scolaire, Immobilier, Prestataire |
| Recherche rapide | Input text | Filtre local par nom (debounce 200ms) |

**Pagination** :
- 24 boutiques par page
- Bouton "Charger plus ({N} restantes)"
- Skeleton loading pendant chargement

### 6.6. Elements supprimes de `/catalogues`

| Element | Raison |
|---------|--------|
| Grille produits | Remplacee par grille boutiques |
| `DesktopSidebar` | Filtres categories/prix produits inutiles |
| `SortDropdown` (tri produits) | Plus de produits a trier |
| `CategoryChips` (categories produits) | Remplacees par chips types structures |
| `Pagination` produits | Remplacee par pagination boutiques |
| `CarteProduit` dans `/catalogues` | Plus de produits affiches |
| `PanierPublic` / panier FAB | Pas d'achat direct sur `/catalogues` |
| `DesktopMiniCart` | Idem |
| `ToastPanier` | Idem |
| `BoutiqueFAB` / `MarketplaceFAB` | Remplacees par simple FAB scroll-top |
| `BottomNavMarketplace` onglet panier | Onglet panier supprime (remplace par onglet "Recherche" ou "Favoris") |

### 6.7. Elements conserves

| Element | Notes |
|---------|-------|
| `MarketplaceNavbar` | Desktop — conserve tel quel (retirer icone panier si elle existe) |
| `MarketplaceHero` | Adapter les stats (boutiques au lieu de produits) |
| `MarketplaceSearchBar` | Inchangee — recherche par nom/telephone → redirection boutique |
| `StickySearchNav` | Conservee mobile |
| `BoutiquesCarousel` | **Transforme** en section Vedettes (grille au lieu de carrousel) |
| `CarteStructure` | **Enrichie** pour les 2 variantes (vedette / standard) |
| `SkeletonCards` | Adapter skeleton pour cartes boutiques |
| `BottomNavMarketplace` | Adapter onglets : Accueil / Boutiques / Recherche |
| Footer | Inchange |

---

## 7. Specifications Techniques

### 7.1. Nouveau service / methode

**Fichier** : `services/catalogues-public.service.ts`

**Nouvelle methode** : `getAllStructures()`

```typescript
interface StructureListItem {
  id_structure: number;
  code_structure: string;
  nom_structure: string;
  adresse: string | null;
  mobile_om: string | null;
  id_localite: number | null;
  actif: boolean;
  logo: string | null;
  createdat: string;
  id_type: number | null;
  type_structure: string | null;
  a_des_produits?: boolean;  // Calcule cote client ou serveur
}

interface AllStructuresResponse {
  success: boolean;
  total_structures: number;
  total_vedettes: number;   // Nombre avec produits publics
  structures: StructureListItem[];
}

async getAllStructures(): Promise<AllStructuresResponse> {
  // Option 1 : Requete SQL directe via database.service
  // Option 2 : Nouvelle fonction PostgreSQL get_all_structures_marketplace()
  // Cache : 5 minutes
}
```

### 7.2. Strategie "Vedettes" : detection des boutiques avec produits

**Option A — Sous-requete SQL (recommandee pour V1)** :
```sql
SELECT ls.*,
  EXISTS (
    SELECT 1 FROM produits p
    WHERE p.id_structure = ls.id_structure
    AND p.presente_au_public = true
  ) AS a_des_produits
FROM list_structures ls
WHERE ls.actif = true
ORDER BY a_des_produits DESC, ls.nom_structure ASC;
```

**Option B — Comptage produits (plus riche mais plus lourd)** :
```sql
SELECT ls.*,
  COALESCE(pp.nb_produits, 0) AS nb_produits_publics
FROM list_structures ls
LEFT JOIN (
  SELECT id_structure, COUNT(*) AS nb_produits
  FROM produits
  WHERE presente_au_public = true
  GROUP BY id_structure
) pp ON pp.id_structure = ls.id_structure
WHERE ls.actif = true
ORDER BY pp.nb_produits DESC NULLS LAST, ls.nom_structure ASC;
```

**Option C — Reutiliser le cache existant (zero requete supplementaire)** :
Le service `marketplace-search.service.ts` extrait deja les structures depuis `get_all_produits_publics()`. On peut croiser cote client :
```typescript
const allStructures = await getAllStructures();    // Requete legere list_structures
const vedettes = await getStructuresFromCache();   // Structures extraites du cache produits
// Marquer a_des_produits = vedettes.has(id_structure)
```

> **Recommandation** : Option A pour simplicite. La sous-requete EXISTS est tres performante avec un index sur `produits(id_structure, presente_au_public)`.

### 7.3. Types TypeScript (additions/modifications)

**Fichier** : `types/marketplace.ts`

```typescript
// NOUVEAU
interface StructureListItem {
  id_structure: number;
  code_structure: string;
  nom_structure: string;
  adresse: string | null;
  mobile_om: string | null;
  id_localite: number | null;
  actif: boolean;
  logo: string | null;
  createdat: string;
  id_type: number | null;
  type_structure: string | null;
  a_des_produits: boolean;
  nb_produits_publics?: number;
}

// NOUVEAU
interface AllStructuresResponse {
  success: boolean;
  total_structures: number;
  total_vedettes: number;
  structures: StructureListItem[];
}

// EXISTANT — modifier
interface MarketplaceStats {
  total_structures: number;
  total_vedettes: number;      // NOUVEAU
  total_villes?: number;       // NOUVEAU (optionnel)
  // Supprimer ou garder pour reference :
  total_produits?: number;     // Optionnel maintenant
  total_categories?: number;   // Optionnel maintenant
}
```

### 7.4. Composants a creer

| # | Composant | Fichier | Description |
|---|-----------|---------|-------------|
| C-1 | `CarteBoutiqueVedette` | `components/marketplace/CarteBoutiqueVedette.tsx` | Carte boutique premium (vedette avec produits) |
| C-2 | `CarteBoutiqueStandard` | `components/marketplace/CarteBoutiqueStandard.tsx` | Carte boutique standard (toutes structures) |
| C-3 | `TypeStructureChips` | `components/marketplace/TypeStructureChips.tsx` | Chips filtres par type de structure |

### 7.5. Composants a modifier

| Composant | Fichier | Modifications |
|-----------|---------|---------------|
| `CataloguesGlobalClient` | `components/catalogue/CataloguesGlobalClient.tsx` | Refonte majeure : supprimer grille produits, ajouter 2 sections boutiques |
| `MarketplaceHero` | `components/marketplace/MarketplaceHero.tsx` | Adapter stats (boutiques au lieu de produits) |
| `SkeletonCards` | `components/marketplace/SkeletonCards.tsx` | Ajouter skeleton pour cartes boutiques |
| `BottomNavMarketplace` | `components/marketplace/BottomNavMarketplace.tsx` | Supprimer onglet panier |

### 7.6. Composants a supprimer ou desactiver sur `/catalogues`

Ces composants ne sont plus importes dans `CataloguesGlobalClient` mais restent dans le codebase car utilises par `/catalogue?id=X` :

| Composant | Status |
|-----------|--------|
| `CarteProduit` | Supprime de `/catalogues`, conserve pour `/catalogue?id=X` |
| `DesktopSidebar` | Supprime (filtres produits) |
| `SortDropdown` | Supprime de `/catalogues` |
| `CategoryChips` | Supprime de `/catalogues` (remplace par `TypeStructureChips`) |
| `PanierPublic` | Supprime de `/catalogues` |
| `DesktopMiniCart` | Supprime de `/catalogues` |
| `ToastPanier` | Supprime de `/catalogues` |
| `BoutiqueFAB` | Supprime de `/catalogues` |
| `MarketplaceFAB` | Simplifie en FAB scroll-top |

---

## 8. Wireframes

### 8.1. Mobile (360px)

```
┌────────────────────────────────┐
│ [FC] FayClick        [● 3 Live]│ ← Top bar mobile
├────────────────────────────────┤
│ [🔍 Nom ou telephone...]      │ ← Recherche
│                                │
│ [🏪 85 boutiques] [⭐ 42 act.]│ ← Stats pilules
│ [📍 12 villes]                 │
│                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Boutiques avec catalogue ⭐    │
│ 42 marchands en ligne          │
│                                │
│ ┌──────────┐ ┌──────────┐     │ ← Grille 2 colonnes
│ │  [Logo]  │ │  [Logo]  │     │
│ │ KELEFA   │ │ SYLVIA   │     │
│ │ 📍 Dakar │ │ 📍 Thies │     │
│ │ 📦 5150  │ │ 📦 230   │     │
│ │[Voir →]  │ │[Voir →]  │     │
│ │ ⭐ Actif │ │ ⭐ Actif │     │
│ └──────────┘ └──────────┘     │
│ ┌──────────┐ ┌──────────┐     │
│ │  ...     │ │  ...     │     │
│ └──────────┘ └──────────┘     │
│                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Toutes les boutiques           │
│ 85 marchands inscrits          │
│                                │
│ [Tous] [Commerce] [Scolaire]  │ ← Chips types
│ [Immobilier] [Prestataire]    │
│                                │
│ ┌──────────┐ ┌──────────┐     │
│ │  [Logo]  │ │  [Logo]  │     │
│ │ BOUTIK A │ │ ECOLE B  │     │
│ │ Commerce │ │ Scolaire │     │
│ │ 📍 Dakar │ │ 📍 Kaol. │     │
│ │ [Voir →] │ │ [Voir →] │     │
│ └──────────┘ └──────────┘     │
│ ┌──────────┐ ┌──────────┐     │
│ │  ...     │ │  ...     │     │
│ └──────────┘ └──────────┘     │
│                                │
│ [Charger plus (61 restantes)] │
│                                │
│ ┌────────────────────────┐    │
│ │ Footer FayClick        │    │
│ └────────────────────────┘    │
│                                │
│ [🏠] [🏪] [🔍]              │ ← Bottom nav (3 onglets)
└────────────────────────────────┘
```

### 8.2. Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo FC]  [Accueil] [Marketplace] [A propos]  [🔍 Rech.] │ ← Navbar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  bg-gradient-emerald                                   │  │
│  │  badge: Marketplace Premium                            │  │
│  │  "Les meilleurs commercants du Senegal"                │  │ ← Hero banner
│  │  "Decouvrez toutes les boutiques FayClick"             │  │
│  │  [Explorer les boutiques ⚡]                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [🏪 85 boutiques]  [⭐ 42 avec catalogue]  [📍 12 villes] │ ← Stats
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  Boutiques avec catalogue en ligne ⭐         "42 marchands" │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │  Logo   │ │  Logo   │ │  Logo   │ │  Logo   │ │  Logo  ││ ← 5 cols
│  │ KELEFA  │ │ SYLVIA  │ │ BONCO.. │ │ SALIH  │ │ MOUSS. ││
│  │ Dakar   │ │ Thies   │ │ Dakar   │ │ Mbour  │ │ Kaolack││
│  │ 5150 pr │ │ 230 pr  │ │ 160 pr  │ │ 89 pr  │ │ 45 pr  ││
│  │[Voir →] │ │[Voir →] │ │[Voir →] │ │[Voir →] │ │[Voir →]││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘│
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ...                    │
│  │  ...    │ │  ...    │ │  ...    │                         │
│  └─────────┘ └─────────┘ └─────────┘                         │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  Toutes les boutiques                  [🔍 Filtrer...]      │
│  [Tous] [Commerce] [Scolaire] [Immo.] [Prestataire]        │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │  Logo   │ │  Logo   │ │  Logo   │ │  Logo   │ │  Logo  ││
│  │  Nom    │ │  Nom    │ │  Nom    │ │  Nom    │ │  Nom   ││
│  │ Commerce│ │ Scolaire│ │ Commerce│ │ Immo.   │ │ Presta.││
│  │ Adresse │ │ Adresse │ │ Adresse │ │ Adresse │ │ Adresse││
│  │[Voir →] │ │[Voir →] │ │[Voir →] │ │[Voir →] │ │[Voir →]││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘│
│  ...                                                         │
│  [Charger plus (61 restantes)]                               │
│                                                              │
│  Footer                                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Parcours Utilisateurs

### Parcours 1 : Recherche par telephone (Awa)

```
1. Awa ouvre fayclick.com/catalogues sur son mobile
2. Elle tape "777301221" dans la barre de recherche
3. Dropdown affiche : "LIBRAIRIE CHEZ KELEFA - 📱 777301221"
4. Elle tapote → Redirection vers /catalogue?id=218
5. Elle voit les produits de la boutique, fait ses achats
```
> **Inchange** par rapport a l'actuel. La recherche fonctionne toujours.

### Parcours 2 : Exploration boutiques (Ibrahima)

```
1. Ibrahima arrive sur /catalogues en desktop
2. Il voit le hero "Les meilleurs commercants du Senegal"
3. Il scrolle et voit les Boutiques Vedettes avec catalogues actifs
4. Il clique sur "LIBRAIRIE CHEZ KELEFA" (5150 produits)
5. → Redirection vers /catalogue?id=218
6. Il explore les produits, fait ses achats
```
> **Ameliore** : plus besoin d'attendre 5-10s de chargement produits.

### Parcours 3 : Decouverte d'un nouveau marchand (Modou)

```
1. Modou s'inscrit sur FayClick, cree sa structure
2. Meme sans avoir publie de produits, sa boutique apparait dans "Toutes les boutiques"
3. Un client potentiel voit sa boutique avec le badge "Commerce" et son adresse
4. Le client clique → /catalogue?id=X (page vide mais avec le header boutique)
5. Modou est motive a publier ses produits pour apparaitre dans "Vedettes"
```
> **Nouveau** : visibilite immediate pour les nouveaux marchands.

---

## 10. Criteres d'Acceptation

### 10.1. Performance (CRITIQUE)

| # | Critere | Verification |
|---|---------|--------------|
| AC-1 | La page `/catalogues` charge en < 1.5s | Mesurer avec DevTools Network |
| AC-2 | Le payload JSON < 100 KB | Verifier taille reponse |
| AC-3 | Aucun appel a `get_all_produits_publics()` depuis `/catalogues` | Verifier Network tab |
| AC-4 | Skeleton loading visible pendant le chargement | Observer visuellement |

### 10.2. Boutiques Vedettes

| # | Critere | Verification |
|---|---------|--------------|
| AC-5 | Seules les structures avec au moins 1 produit public apparaissent en vedette | Comparer avec BD |
| AC-6 | Les vedettes sont triees par nombre de produits decroissant | Verifier l'ordre |
| AC-7 | Chaque carte affiche : logo, nom, adresse, nb produits, bouton Voir | Inspecter visuellement |
| AC-8 | Clic sur une carte → `/catalogue?id=X` | Verifier la redirection |

### 10.3. Toutes les Boutiques

| # | Critere | Verification |
|---|---------|--------------|
| AC-9 | TOUTES les structures actives apparaissent | Comparer avec `SELECT COUNT(*) FROM list_structures WHERE actif = true` |
| AC-10 | Les chips de filtre par type fonctionnent | Cliquer chaque chip |
| AC-11 | La pagination "Charger plus" fonctionne (24 par batch) | Cliquer et compter |
| AC-12 | Le badge type de structure est correct et colore | Verifier visuellement |

### 10.4. Elements supprimes

| # | Critere | Verification |
|---|---------|--------------|
| AC-13 | Aucun produit affiche sur `/catalogues` | Verifier visuellement |
| AC-14 | Pas de panier / FAB panier sur `/catalogues` | Verifier visuellement |
| AC-15 | Pas de sidebar filtres produits sur `/catalogues` | Verifier visuellement |

### 10.5. Elements conserves

| # | Critere | Verification |
|---|---------|--------------|
| AC-16 | La recherche par nom fonctionne | Taper un nom de structure |
| AC-17 | La recherche par telephone fonctionne | Taper un numero commencant par 7 |
| AC-18 | Le theme glassmorphism emeraude est conserve | Verifier visuellement |
| AC-19 | Le design responsive fonctionne sur 360px, 768px, 1280px | Tester 3 tailles |
| AC-20 | La page `/catalogue?id=X` fonctionne normalement (produits + panier) | Test E2E |

---

## 11. Plan de Livraison

### Phase 1 : Backend & Types (Jour 1)
- [ ] Ajouter requete SQL `list_structures` dans `catalogues-public.service.ts`
- [ ] Creer types `StructureListItem`, `AllStructuresResponse` dans `types/marketplace.ts`
- [ ] Implementer cache 5 min pour la nouvelle requete
- [ ] Tester la requete (performance, completude)

### Phase 2 : Composants Boutiques (Jours 2-3)
- [ ] Creer `CarteBoutiqueVedette.tsx` (carte premium avec badge)
- [ ] Creer `CarteBoutiqueStandard.tsx` (carte standard avec type)
- [ ] Creer `TypeStructureChips.tsx` (chips filtres par type)
- [ ] Adapter `SkeletonCards.tsx` (skeleton boutiques)

### Phase 3 : Refonte CataloguesGlobalClient (Jours 3-4)
- [ ] Supprimer import/utilisation de `CarteProduit`, `DesktopSidebar`, `PanierPublic`, etc.
- [ ] Remplacer la grille produits par 2 sections boutiques
- [ ] Integrer les nouveaux composants
- [ ] Adapter `MarketplaceHero` (stats boutiques)
- [ ] Adapter `BottomNavMarketplace` (supprimer onglet panier)
- [ ] Implementer pagination "Charger plus" pour la section "Toutes les boutiques"

### Phase 4 : Tests & Polish (Jour 5)
- [ ] Tests responsive : 360px, 480px, 768px, 1024px, 1280px
- [ ] Verifier que `/catalogue?id=X` fonctionne toujours (regression)
- [ ] Verifier performances (< 1.5s chargement)
- [ ] Verifier theme glassmorphism coherent
- [ ] Tester recherche nom + telephone
- [ ] Deploiement staging puis production

---

## 12. Risques & Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| La vue `list_structures` ne contient pas assez d'infos | Moyen | Requete enrichie avec LEFT JOIN produits pour le comptage |
| Regression sur `/catalogue?id=X` | Eleve | Ne pas toucher aux composants catalogue individuel |
| Performance de la sous-requete EXISTS | Faible | Tres performant avec index existant sur produits |
| Boutiques sans logo ni adresse | Moyen | Fallback initiale elegant (gradient + 1ere lettre du nom) |
| Le service `marketplace-search.service.ts` casse | Moyen | Il reutilise le cache produits ; adapter pour fonctionner sans |

---

## 13. Impact sur le Codebase Existant

### Fichiers modifies
1. `components/catalogue/CataloguesGlobalClient.tsx` — Refonte majeure
2. `components/marketplace/MarketplaceHero.tsx` — Adaptation stats
3. `components/marketplace/SkeletonCards.tsx` — Ajout skeleton boutiques
4. `components/marketplace/BottomNavMarketplace.tsx` — Supprimer onglet panier
5. `services/catalogues-public.service.ts` — Nouvelle methode `getAllStructures()`
6. `types/marketplace.ts` — Nouveaux types

### Fichiers crees
1. `components/marketplace/CarteBoutiqueVedette.tsx`
2. `components/marketplace/CarteBoutiqueStandard.tsx`
3. `components/marketplace/TypeStructureChips.tsx`

### Fichiers NON modifies (important)
- `components/catalogue/CataloguePublicClient.tsx` (boutique individuelle)
- `components/catalogue/CarteProduit.tsx` (utilise dans boutique individuelle)
- `components/catalogue/PanierPublic.tsx` (utilise dans boutique individuelle)
- `services/catalogue-public.service.ts` (chargement produits d'une boutique)
- `services/online-seller.service.ts` (paiement)

---

*PRD redige le 23 mars 2026 — En attente de validation pour demarrer l'implementation.*
