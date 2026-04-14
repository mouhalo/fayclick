# Marketplace Boutiques-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 118K+ products grid on `/catalogues` with a fast-loading boutiques-focused marketplace (2 sections: vedettes + toutes les boutiques).

**Architecture:** Load all structures from `list_structures` SQL view via a new `getAllStructures()` service method with 5min cache. Split into "vedettes" (have public products) and "all" sections. Remove all product/cart related code from the marketplace page. Keep existing search, hero, navbar, and glassmorphism theme.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, PostgreSQL via database.service.ts

**PRD:** `docs/PRD_MARKETPLACE_BOUTIQUES_FIRST.md`

---

## File Structure

### Files to CREATE
| File | Responsibility |
|------|---------------|
| `components/marketplace/CarteBoutiqueVedette.tsx` | Premium shop card (logo, name, city, product count, badge "Catalogue actif") |
| `components/marketplace/CarteBoutiqueStandard.tsx` | Standard shop card (logo, name, type badge, city) |
| `components/marketplace/TypeStructureChips.tsx` | Horizontal filter chips for structure types (Commerce, Scolaire, etc.) |

### Files to MODIFY
| File | Changes |
|------|---------|
| `types/marketplace.ts` | Add `StructureListItem`, `AllStructuresResponse`, update `MarketplaceStats` |
| `services/catalogues-public.service.ts` | Add `getAllStructures()` method with SQL query + cache |
| `services/marketplace-search.service.ts` | Adapt `search()` and `getStats()` to work from `getAllStructures()` instead of products |
| `components/marketplace/MarketplaceHero.tsx` | Change stats pills from products to boutiques |
| `components/marketplace/BottomNavMarketplace.tsx` | Replace cart tab with search tab |
| `components/marketplace/SkeletonCards.tsx` | Add `SkeletonCarteBoutique` for grid loading state |
| `components/catalogue/CataloguesGlobalClient.tsx` | **Major refactor**: remove products grid, add 2 boutiques sections |

### Files NOT touched (important — no regressions)
- `components/catalogue/CataloguePublicClient.tsx` (individual shop page)
- `components/catalogue/CarteProduit.tsx` (used in individual shop)
- `components/catalogue/PanierPublic.tsx` (used in individual shop)
- `services/catalogue-public.service.ts` (loads products for one shop)
- `services/online-seller.service.ts` (payment)

---

## Task 1: Add Types

**Files:**
- Modify: `types/marketplace.ts`

- [ ] **Step 1: Add new types to marketplace.ts**

Add `StructureListItem` and `AllStructuresResponse` interfaces, update `MarketplaceStats`:

```typescript
// After existing StructurePublique interface, ADD:

/** Structure from list_structures SQL view — lightweight, no products loaded */
export interface StructureListItem {
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
  nb_produits_publics: number;
}

/** Response from getAllStructures() */
export interface AllStructuresResponse {
  success: boolean;
  total_structures: number;
  total_vedettes: number;
  structures: StructureListItem[];
}
```

Update `MarketplaceStats`:
```typescript
export interface MarketplaceStats {
  total_produits: number;      // keep for backward compat
  total_structures: number;
  total_categories: number;    // keep for backward compat
  total_vedettes?: number;     // NEW
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to marketplace.ts

- [ ] **Step 3: Commit**

```
feat: add StructureListItem types for boutiques-first marketplace
```

---

## Task 2: Add `getAllStructures()` Service Method

**Files:**
- Modify: `services/catalogues-public.service.ts`

- [ ] **Step 1: Add dedicated cache and method**

Add a second cache + the `getAllStructures()` method to the existing `CataloguesPublicService` class. Uses `database.service.ts` `query()` method with the SQL from the PRD:

```typescript
// New properties in the class:
private structuresCache: AllStructuresResponse | null = null;
private structuresCacheTimestamp: number = 0;

// New method:
async getAllStructures(): Promise<AllStructuresResponse> {
  // Check cache
  const now = Date.now();
  if (this.structuresCache && (now - this.structuresCacheTimestamp) < this.CACHE_DURATION) {
    return this.structuresCache;
  }

  const database = (await import('./database.service')).default;

  const query = `
    SELECT ls.id_structure, ls.code_structure, ls.nom_structure, ls.adresse,
           ls.mobile_om, ls.id_localite, ls.actif, ls.logo, ls.createdat,
           ls.id_type, ls.type_structure,
           COALESCE(pp.nb_produits, 0) AS nb_produits_publics
    FROM list_structures ls
    LEFT JOIN (
      SELECT id_structure, COUNT(*) AS nb_produits
      FROM produits
      WHERE presente_au_public = true
      GROUP BY id_structure
    ) pp ON pp.id_structure = ls.id_structure
    WHERE ls.actif = true
    ORDER BY pp.nb_produits DESC NULLS LAST, ls.nom_structure ASC
  `;

  const rows = await database.query(query, 15000);

  // rows is an array of objects from the SQL view
  const structures: StructureListItem[] = (rows as any[]).map(row => ({
    id_structure: row.id_structure,
    code_structure: row.code_structure || '',
    nom_structure: row.nom_structure || '',
    adresse: row.adresse || null,
    mobile_om: row.mobile_om || null,
    id_localite: row.id_localite || null,
    actif: row.actif ?? true,
    logo: row.logo || null,
    createdat: row.createdat || '',
    id_type: row.id_type || null,
    type_structure: row.type_structure || null,
    a_des_produits: (row.nb_produits_publics || 0) > 0,
    nb_produits_publics: row.nb_produits_publics || 0,
  }));

  const vedettes = structures.filter(s => s.a_des_produits);

  const result: AllStructuresResponse = {
    success: true,
    total_structures: structures.length,
    total_vedettes: vedettes.length,
    structures,
  };

  this.structuresCache = result;
  this.structuresCacheTimestamp = now;

  return result;
}
```

Also add import at top of file:
```typescript
import { AllStructuresResponse, StructureListItem } from '@/types/marketplace';
```

Also update `invalidateCache()` to clear both caches:
```typescript
invalidateCache(): void {
  this.cache = null;
  this.cacheTimestamp = 0;
  this.structuresCache = null;
  this.structuresCacheTimestamp = 0;
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```
feat: add getAllStructures() to catalogues-public service
```

---

## Task 3: Adapt marketplace-search.service.ts

**Files:**
- Modify: `services/marketplace-search.service.ts`

- [ ] **Step 1: Add `getAllStructuresForSearch()` method and adapt `getStats()`**

The search service currently depends on `getAllProduitsPublics()` (118K products) to derive structures. Change it to use `getAllStructures()` for structure-based operations, keeping product-based search for backward compatibility.

Add method to get structures from the lightweight endpoint:
```typescript
async getStructuresFromList(): Promise<StructurePublique[]> {
  try {
    const response = await cataloguesPublicService.getAllStructures();
    return response.structures
      .filter(s => s.a_des_produits)
      .map(s => ({
        id_structure: s.id_structure,
        nom_structure: s.nom_structure,
        logo_structure: s.logo,
        type_structure: s.type_structure,
        telephone: s.mobile_om,
        adresse: s.adresse,
        total_produits: s.nb_produits_publics,
        categories: []  // Not available from list_structures, acceptable tradeoff
      }))
      .sort((a, b) => b.total_produits - a.total_produits);
  } catch (error) {
    console.error('[MARKETPLACE] Erreur getStructuresFromList:', error);
    return [];
  }
}
```

Update `getStats()` to use lightweight endpoint:
```typescript
async getStats(): Promise<MarketplaceStats> {
  try {
    const response = await cataloguesPublicService.getAllStructures();
    return {
      total_produits: 0,
      total_structures: response.total_structures,
      total_categories: 0,
      total_vedettes: response.total_vedettes,
    };
  } catch {
    return { total_produits: 0, total_structures: 0, total_categories: 0 };
  }
}
```

Update `search()` to use `getStructuresFromList()` instead of `getStructures()`:
```typescript
async search(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const structures = await this.getStructuresFromList();
  // ... rest stays the same
}
```

Add import:
```typescript
import { StructurePublique, SearchResult, MarketplaceStats } from '@/types/marketplace';
```

- [ ] **Step 2: Verify build compiles**

- [ ] **Step 3: Commit**

```
refactor: marketplace search uses lightweight getAllStructures instead of products
```

---

## Task 4: Create CarteBoutiqueVedette Component

**Files:**
- Create: `components/marketplace/CarteBoutiqueVedette.tsx`

- [ ] **Step 1: Create the component**

Premium boutique card with glassmorphism, logo, name, city, product count, and "Catalogue actif" badge. Follows existing `CarteStructure.tsx` patterns.

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin } from 'lucide-react';
import Image from 'next/image';
import { StructureListItem } from '@/types/marketplace';

const FALLBACK = '/images/mascotte.png';

interface CarteBoutiqueVedetteProps {
  structure: StructureListItem;
  index: number;
  onClick: (structure: StructureListItem) => void;
}

export default function CarteBoutiqueVedette({ structure, index, onClick }: CarteBoutiqueVedetteProps) {
  const logoSrc = structure.logo && structure.logo.startsWith('http') ? structure.logo : FALLBACK;
  const [src, setSrc] = useState(logoSrc);

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      onClick={() => onClick(structure)}
      className="group text-left w-full"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 hover:bg-white/10 hover:border-emerald-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
        {/* Badge vedette */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/20 text-amber-300 text-[9px] font-bold">
            Catalogue actif
          </span>
        </div>

        {/* Logo */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl mx-auto mb-3 overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-white/20 group-hover:border-emerald-400/40 transition-colors flex items-center justify-center">
          {src !== FALLBACK ? (
            <Image
              src={src}
              alt={structure.nom_structure}
              width={80}
              height={80}
              className="object-cover w-full h-full"
              onError={() => setSrc(FALLBACK)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
              <span className="text-white font-bold text-2xl">
                {structure.nom_structure?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Nom */}
        <p className="text-white text-sm font-semibold text-center line-clamp-2 mb-1">
          {structure.nom_structure}
        </p>

        {/* Adresse */}
        {structure.adresse && (
          <p className="text-white/50 text-[11px] text-center line-clamp-1 mb-1.5 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{structure.adresse}</span>
          </p>
        )}

        {/* Nb produits */}
        <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs mb-3">
          <Package className="w-3.5 h-3.5" />
          <span>{structure.nb_produits_publics} produit{structure.nb_produits_publics > 1 ? 's' : ''} en ligne</span>
        </div>

        {/* Bouton CTA */}
        <div className="py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-400/20 text-emerald-200 text-xs font-medium text-center group-hover:bg-emerald-500/30 transition-colors">
          Voir la boutique
        </div>
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 2: Commit**

```
feat: add CarteBoutiqueVedette component
```

---

## Task 5: Create CarteBoutiqueStandard Component

**Files:**
- Create: `components/marketplace/CarteBoutiqueStandard.tsx`

- [ ] **Step 1: Create the component**

Standard (lighter) boutique card with type badge. More subtle styling than vedette.

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { StructureListItem } from '@/types/marketplace';

const FALLBACK = '/images/mascotte.png';

// Color mapping for structure types
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COMMERCIALE:  { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-400/20' },
  SCOLAIRE:     { bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-400/20' },
  IMMOBILIER:   { bg: 'bg-orange-500/10',   text: 'text-orange-300',  border: 'border-orange-400/20' },
  PRESTATAIRE:  { bg: 'bg-purple-500/10',   text: 'text-purple-300',  border: 'border-purple-400/20' },
};

function getTypeStyle(type: string | null) {
  if (!type) return { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-400/20' };
  const upper = type.toUpperCase();
  for (const [key, style] of Object.entries(TYPE_COLORS)) {
    if (upper.includes(key)) return style;
  }
  return { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-400/20' };
}

function getTypeLabel(type: string | null): string {
  if (!type) return 'Autre';
  const upper = type.toUpperCase();
  if (upper.includes('COMMERCIALE')) return 'Commerce';
  if (upper.includes('SCOLAIRE')) return 'Scolaire';
  if (upper.includes('IMMOBILIER')) return 'Immobilier';
  if (upper.includes('PRESTATAIRE')) return 'Prestataire';
  return type;
}

interface CarteBoutiqueStandardProps {
  structure: StructureListItem;
  index: number;
  onClick: (structure: StructureListItem) => void;
}

export default function CarteBoutiqueStandard({ structure, index, onClick }: CarteBoutiqueStandardProps) {
  const logoSrc = structure.logo && structure.logo.startsWith('http') ? structure.logo : FALLBACK;
  const [src, setSrc] = useState(logoSrc);
  const typeStyle = getTypeStyle(structure.type_structure);

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      onClick={() => onClick(structure)}
      className="group text-left w-full"
    >
      <div className="overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-300">
        {/* Logo */}
        <div className="w-14 h-14 rounded-lg mx-auto mb-2.5 overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-white/15 group-hover:border-white/25 transition-colors flex items-center justify-center">
          {src !== FALLBACK ? (
            <Image
              src={src}
              alt={structure.nom_structure}
              width={56}
              height={56}
              className="object-cover w-full h-full"
              onError={() => setSrc(FALLBACK)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700">
              <span className="text-white/70 font-bold text-lg">
                {structure.nom_structure?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Nom */}
        <p className="text-white text-[13px] font-semibold text-center line-clamp-2 mb-1.5">
          {structure.nom_structure}
        </p>

        {/* Badge type */}
        <div className="flex justify-center mb-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
            {getTypeLabel(structure.type_structure)}
          </span>
        </div>

        {/* Adresse */}
        {structure.adresse && (
          <p className="text-white/40 text-[10px] text-center line-clamp-1 mb-2 flex items-center justify-center gap-0.5">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span>{structure.adresse}</span>
          </p>
        )}

        {/* Bouton CTA */}
        <div className="py-1 px-2 rounded-lg border border-white/20 text-white/60 text-[11px] font-medium text-center group-hover:border-white/30 group-hover:text-white/80 transition-colors">
          Voir
        </div>
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 2: Commit**

```
feat: add CarteBoutiqueStandard component
```

---

## Task 6: Create TypeStructureChips Component

**Files:**
- Create: `components/marketplace/TypeStructureChips.tsx`

- [ ] **Step 1: Create the component**

Horizontal scrollable chips for filtering by structure type. Follows `CategoryChips.tsx` pattern.

```typescript
'use client';

import { motion } from 'framer-motion';

const TYPES = [
  { key: '', label: 'Tous' },
  { key: 'COMMERCIALE', label: 'Commerce' },
  { key: 'SCOLAIRE', label: 'Scolaire' },
  { key: 'IMMOBILIER', label: 'Immobilier' },
  { key: 'PRESTATAIRE', label: 'Prestataire' },
];

interface TypeStructureChipsProps {
  selected: string;
  onChange: (type: string) => void;
  counts?: Record<string, number>;
}

export default function TypeStructureChips({ selected, onChange, counts }: TypeStructureChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {TYPES.map(type => {
        const isActive = selected === type.key;
        const count = type.key ? counts?.[type.key] : undefined;
        return (
          <button
            key={type.key}
            onClick={() => onChange(type.key)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200
              ${isActive
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80'
              }
            `}
          >
            {type.label}
            {count !== undefined && (
              <span className={`ml-1 ${isActive ? 'text-white/70' : 'text-white/30'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
feat: add TypeStructureChips filter component
```

---

## Task 7: Add Skeleton for Boutique Cards

**Files:**
- Modify: `components/marketplace/SkeletonCards.tsx`

- [ ] **Step 1: Add SkeletonCarteBoutique export**

Add after existing exports:

```typescript
export function SkeletonCarteBoutique() {
  return (
    <div className="animate-pulse rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="w-16 h-16 rounded-xl bg-gray-300/20 mx-auto mb-3" />
      <div className="h-3.5 bg-gray-300/20 rounded w-3/4 mx-auto mb-2" />
      <div className="h-2.5 bg-gray-300/20 rounded w-1/2 mx-auto mb-2" />
      <div className="h-2.5 bg-gray-300/20 rounded w-2/3 mx-auto mb-3" />
      <div className="h-7 bg-gray-300/20 rounded-xl w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
feat: add SkeletonCarteBoutique for loading state
```

---

## Task 8: Adapt MarketplaceHero Stats

**Files:**
- Modify: `components/marketplace/MarketplaceHero.tsx`

- [ ] **Step 1: Change stats pills from products to boutiques**

In the stats section (around line 52-80), replace the 3 pills:

| Before | After |
|--------|-------|
| `{stats.total_produits}+ PRODUITS` (Package icon) | `{stats.total_structures} BOUTIQUES` (Store icon) |
| `{stats.total_structures} BOUTIQUES` (Store icon) | `{stats.total_vedettes || 0} AVEC CATALOGUE` (Package icon) |
| `{stats.total_categories} CATEGORIES` (Tags icon) | Remove or keep as optional |

Update the hero button scroll target from `#products-grid` to `#boutiques-vedettes`.

- [ ] **Step 2: Commit**

```
refactor: MarketplaceHero shows boutique stats instead of products
```

---

## Task 9: Adapt BottomNavMarketplace

**Files:**
- Modify: `components/marketplace/BottomNavMarketplace.tsx`

- [ ] **Step 1: Replace cart tab with search tab**

Change the tabs array:
```typescript
const tabs = [
  { id: 'home' as const, icon: Home, label: 'Accueil' },
  { id: 'boutiques' as const, icon: Store, label: 'Boutiques' },
  { id: 'search' as const, icon: Search, label: 'Recherche' },
];
```

Update the type from `'home' | 'boutiques' | 'cart' | 'profil'` to `'home' | 'boutiques' | 'search'`.

Remove the cart badge logic (the `tab.id === 'cart' && cartCount > 0` block).

Remove `cartCount` from props.

- [ ] **Step 2: Commit**

```
refactor: BottomNav removes cart tab, adds search tab
```

---

## Task 10: Refactor CataloguesGlobalClient — Major Rewrite

**Files:**
- Modify: `components/catalogue/CataloguesGlobalClient.tsx`

This is the largest task. The component goes from ~455 lines (products grid + cart) to a cleaner boutiques-focused layout.

- [ ] **Step 1: Replace imports**

Remove:
```typescript
import { CataloguesGlobalResponse, ProduitPublicGlobal } from '@/types/catalogues';
import { ArticlePanier } from '@/services/online-seller.service';
import CarteProduit from './CarteProduit';
import PanierPublic from './PanierPublic';
import MarketplaceFAB from '@/components/marketplace/MarketplaceFAB';
import BoutiqueFAB from '@/components/marketplace/BoutiqueFAB';
import ToastPanier from '@/components/marketplace/ToastPanier';
import { SkeletonCarteProduit } from '@/components/marketplace/SkeletonCards';
import { formatNomCategorie } from '@/lib/format-categorie';
import Pagination from '@/components/marketplace/Pagination';
import CategoryChips from '@/components/marketplace/CategoryChips';
import SortDropdown, { SortOption } from '@/components/marketplace/SortDropdown';
import DesktopSidebar from '@/components/marketplace/DesktopSidebar';
```

Add:
```typescript
import { AllStructuresResponse, StructureListItem } from '@/types/marketplace';
import CarteBoutiqueVedette from '@/components/marketplace/CarteBoutiqueVedette';
import CarteBoutiqueStandard from '@/components/marketplace/CarteBoutiqueStandard';
import TypeStructureChips from '@/components/marketplace/TypeStructureChips';
import { SkeletonCarteBoutique } from '@/components/marketplace/SkeletonCards';
```

Keep:
```typescript
import { StructurePublique, MarketplaceStats } from '@/types/marketplace';
import MarketplaceHero from '@/components/marketplace/MarketplaceHero';
import BoutiquesCarousel from '@/components/marketplace/BoutiquesCarousel';
import StickySearchNav from '@/components/marketplace/StickySearchNav';
import BottomNavMarketplace from '@/components/marketplace/BottomNavMarketplace';
import MarketplaceNavbar from '@/components/marketplace/MarketplaceNavbar';
```

- [ ] **Step 2: Replace state and data loading**

Remove all product/cart state. Replace with:
```typescript
// States
const [structuresData, setStructuresData] = useState<AllStructuresResponse | null>(null);
const [stats, setStats] = useState<MarketplaceStats>({ total_produits: 0, total_structures: 0, total_categories: 0 });
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Filters for "Toutes les boutiques"
const [typeFiltre, setTypeFiltre] = useState('');
const [visibleCount, setVisibleCount] = useState(24);

// Bottom nav
const [activeTab, setActiveTab] = useState<'home' | 'boutiques' | 'search'>('home');
```

Replace `loadData()`:
```typescript
const loadData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    const [allStructures, statsData] = await Promise.all([
      cataloguesPublicService.getAllStructures(),
      marketplaceSearchService.getStats()
    ]);
    setStructuresData(allStructures);
    setStats(statsData);
  } catch (err: unknown) {
    console.error('Erreur chargement marketplace:', err);
    setError(err instanceof Error ? err.message : 'Impossible de charger la marketplace');
  } finally {
    setLoading(false);
  }
}, []);
```

- [ ] **Step 3: Add computed data with useMemo**

```typescript
// Boutiques vedettes (have products)
const vedettes = useMemo(() => {
  if (!structuresData?.structures) return [];
  return structuresData.structures.filter(s => s.a_des_produits);
}, [structuresData]);

// All boutiques filtered by type
const toutesBoutiquesFiltrees = useMemo(() => {
  if (!structuresData?.structures) return [];
  if (!typeFiltre) return structuresData.structures;
  return structuresData.structures.filter(s =>
    s.type_structure?.toUpperCase().includes(typeFiltre)
  );
}, [structuresData, typeFiltre]);

// Visible slice for pagination
const boutiquesVisibles = toutesBoutiquesFiltrees.slice(0, visibleCount);
const hasMore = visibleCount < toutesBoutiquesFiltrees.length;

// Counts by type for chips
const countsByType = useMemo(() => {
  if (!structuresData?.structures) return {};
  const counts: Record<string, number> = {};
  structuresData.structures.forEach(s => {
    const type = s.type_structure?.toUpperCase() || '';
    if (type.includes('COMMERCIALE')) counts['COMMERCIALE'] = (counts['COMMERCIALE'] || 0) + 1;
    else if (type.includes('SCOLAIRE')) counts['SCOLAIRE'] = (counts['SCOLAIRE'] || 0) + 1;
    else if (type.includes('IMMOBILIER')) counts['IMMOBILIER'] = (counts['IMMOBILIER'] || 0) + 1;
    else if (type.includes('PRESTATAIRE')) counts['PRESTATAIRE'] = (counts['PRESTATAIRE'] || 0) + 1;
  });
  return counts;
}, [structuresData]);

// Structures for carousel (vedettes, max 15)
const structuresCarousel: StructurePublique[] = useMemo(() => {
  return vedettes.slice(0, 15).map(s => ({
    id_structure: s.id_structure,
    nom_structure: s.nom_structure,
    logo_structure: s.logo,
    type_structure: s.type_structure,
    telephone: s.mobile_om,
    adresse: s.adresse,
    total_produits: s.nb_produits_publics,
    categories: []
  }));
}, [vedettes]);
```

- [ ] **Step 4: Rewrite the JSX render**

Replace the entire return block. Keep: background gradient, MarketplaceNavbar, MarketplaceHero, BoutiquesCarousel, StickySearchNav, BottomNavMarketplace.

Remove: DesktopSidebar, products grid, CarteProduit, PanierPublic, all panier-related elements, toast elements.

Add: Section vedettes with `CarteBoutiqueVedette` grid, section "Toutes les boutiques" with `TypeStructureChips` + `CarteBoutiqueStandard` grid + "Charger plus" button.

Grid layout:
```
const gridCols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
```

The render structure should be:
```
div.min-h-screen (background + gradient)
  div.max-w-7xl (container)
    MarketplaceNavbar (no cart props)
    div.flex-1 (main content, NO sidebar)
      MarketplaceHero
      BoutiquesCarousel

      Section "Boutiques vedettes" (#boutiques-vedettes)
        Title + count
        Grid of CarteBoutiqueVedette

      Separator

      Section "Toutes les boutiques"
        Title + TypeStructureChips
        Grid of CarteBoutiqueStandard
        "Charger plus" button

  StickySearchNav
  BottomNavMarketplace (no cart)
```

- [ ] **Step 5: Update skeleton loading state**

Replace `SkeletonCarteProduit` with `SkeletonCarteBoutique` in the loading return block. Use the boutiques grid layout.

- [ ] **Step 6: Verify build compiles and renders**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Then: `npm run dev` and visually verify on localhost:3000/catalogues

- [ ] **Step 7: Commit**

```
feat: refactor marketplace to boutiques-first — remove products grid, add vedettes + all shops sections
```

---

## Task 11: Final Verification & Cleanup

- [ ] **Step 1: Test `/catalogues` page**

Verify:
- Page loads in < 2s (no products API call)
- Hero shows boutique stats
- Boutiques vedettes section shows shops with products
- Toutes les boutiques section shows all shops
- Type filter chips work
- "Charger plus" pagination works
- Search by name works
- Search by telephone works
- Click on any shop card → `/catalogue?id=X`
- Responsive: 360px, 768px, 1280px
- Glassmorphism theme intact

- [ ] **Step 2: Test `/catalogue?id=X` — no regressions**

Verify:
- Products load normally
- Cart works
- Payment flow works
- Search within shop works

- [ ] **Step 3: Test bottom nav (mobile)**

Verify:
- 3 tabs: Accueil, Boutiques, Recherche
- No cart tab
- Tabs navigate correctly

- [ ] **Step 4: Final commit**

```
test: verify boutiques-first marketplace — no regressions on individual shop pages
```

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Data loaded on `/catalogues` | 118K+ products (5-15 MB) | ~100-500 structures (< 100 KB) |
| Load time | 5-10 seconds | < 1.5 seconds |
| Main content | Products grid with cart | 2 boutiques sections |
| Sidebar | Product filters (categories, price) | None (type chips inline) |
| Cart on marketplace | Full cart + FAB + drawer | None (cart only on shop pages) |
| Bottom nav | 4 tabs (home, boutiques, cart, profil) | 3 tabs (home, boutiques, search) |
| Stats pills | Products, Boutiques, Categories | Boutiques, Avec catalogue |
