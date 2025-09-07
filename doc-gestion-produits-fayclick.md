# 📋 Document Technique - Module Gestion Produits/Services FayClick V2

## 🎯 Vue d'ensemble

Ce document détaille l'implémentation complète du module de gestion des produits/services pour les structures commerciales et prestataires de services dans FayClick V2, en migrant depuis l'architecture React/Node.js vers Next.js 15 avec TypeScript.

---

## 🏗️ Architecture Technique

### Stack Technologique
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui, Lucide React (icônes)
- **State Management**: Zustand, TanStack Query
- **Animations**: Framer Motion
- **Backend**: API Routes Next.js, PostgreSQL (schéma existant)
- **Auth**: JWT avec middleware Next.js

### Structure des Fichiers
```
app/
├── (dashboard)/
│   ├── produits/
│   │   ├── page.tsx                 # Liste des produits
│   │   ├── [id]/
│   │   │   └── stock/
│   │   │       └── page.tsx         # Gestion stock produit
│   │   └── layout.tsx               # Layout produits
│   └── services/
│       └── produits.ts              # Service API produits
├── components/
│   └── produits/
│       ├── ListeProduits.tsx        # Composant principal
│       ├── CarteProduit.tsx         # Card produit
│       ├── ModalAjoutProduit.tsx    # Modal ajout/édition
│       ├── StatsProduits.tsx        # Stats cards
│       ├── Panier.tsx               # Panier d'achat
│       └── BarreStatutPanier.tsx   # Barre fixe panier
├── api/
│   └── produits/
│       ├── route.ts                 # CRUD produits
│       ├── [id]/
│       │   └── route.ts             # Operations produit unique
│       └── stock/
│           └── route.ts             # Gestion stock
└── types/
    └── produit.ts                   # Types TypeScript
```

---

## 📊 Modèle de Données

### Type TypeScript Principal
```typescript
// types/produit.ts
export interface Produit {
  id_produit: number;
  id_structure: number;
  nom_produit: string;
  cout_revient: number;
  prix_vente: number;
  niveau_stock?: number;
  // Champs calculés depuis la vue SQL
  marge?: number;
  valeur_stock?: number;
  revenu_potentiel?: number;
}

export interface MouvementStock {
  id: number;
  id_produit: number;
  id_structure: number;
  type_mouvement: 'ENTREE' | 'SORTIE';
  quantite: number;
  prix_unitaire: number;
  description?: string;
  tms_create: Date;
}

export interface ArticlePanier extends Produit {
  quantity: number;
}

export interface StatsStructure {
  totalProduits: number;
  valeurStock: number;
  margeGlobale: number;
  revenuPotentiel: number;
}
```

---

## 🎨 Design System & Composants UI

### 1. Palette de Couleurs (cohérent avec FayClick)
```css
/* globals.css - extension du design system */
:root {
  --primary: #0ea5e9;      /* Bleu FayClick */
  --secondary: #f59e0b;    /* Orange accent */
  --success: #10b981;      /* Vert validation */
  --danger: #ef4444;       /* Rouge suppression */
  --info: #3b82f6;         /* Bleu info */
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
}
```

### 2. Classes Utilitaires Responsive
```css
/* Conteneurs adaptatifs */
.container-produits {
  @apply w-full px-4 mx-auto;
  @apply sm:px-6 sm:max-w-2xl;
  @apply md:max-w-4xl;
  @apply lg:max-w-6xl lg:px-8;
  @apply xl:max-w-7xl;
}

/* Grille responsive produits */
.grid-produits {
  @apply grid gap-4;
  @apply grid-cols-1;          /* Mobile: 1 colonne */
  @apply sm:grid-cols-2;       /* Small: 2 colonnes */
  @apply lg:grid-cols-3;       /* Large: 3 colonnes */
  @apply xl:grid-cols-4;       /* Extra large: 4 colonnes */
}

/* Touch-friendly buttons */
.btn-produit {
  @apply min-h-[44px] px-4 py-2;
  @apply text-sm sm:text-base;
  @apply touch-manipulation;
  @apply transition-all duration-200;
}
```

---

## 🔧 Implémentation des Composants

### 1. StatsProduits Component
```typescript
// components/produits/StatsProduits.tsx
'use client';

import { ShoppingBag, TrendingUp, DollarSign, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatMontant } from '@/lib/utils';

interface StatsProp {
  stats: StatsStructure;
}

export function StatsProduits({ stats }: StatsProp) {
  const statCards = [
    {
      title: 'Total Produits',
      value: stats.totalProduits,
      icon: ShoppingBag,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
    },
    {
      title: 'Valeur Stock',
      value: formatMontant(stats.valeurStock),
      icon: Package,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
    },
    {
      title: 'Marge Globale',
      value: `${stats.margeGlobale}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
    },
    {
      title: 'Revenu Potentiel',
      value: formatMontant(stats.revenuPotentiel),
      icon: DollarSign,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {statCards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">{card.title}</p>
              <p className="text-lg sm:text-xl font-bold mt-1">{card.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${card.bgLight}`}>
              <card.icon className={`w-5 h-5 ${card.color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

### 2. CarteProduit Component
```typescript
// components/produits/CarteProduit.tsx
'use client';

import { motion } from 'framer-motion';
import { 
  Edit2, Trash2, ShoppingCart, Tag, 
  TrendingUp, Package, DollarSign, Receipt 
} from 'lucide-react';
import { formatMontant } from '@/lib/utils';

interface CarteProduitProps {
  produit: Produit;
  onEdit: (produit: Produit) => void;
  onDelete: (id: number) => void;
  onAddToCart: (produit: Produit) => void;
}

export function CarteProduit({ produit, onEdit, onDelete, onAddToCart }: CarteProduitProps) {
  const stats = [
    { icon: Tag, label: 'PV', value: formatMontant(produit.prix_vente) },
    { icon: TrendingUp, label: 'Marge', value: formatMontant(produit.marge || 0) },
    { icon: Package, label: 'Stock', value: produit.niveau_stock || 0 },
    { icon: DollarSign, label: 'Revenu', value: formatMontant(produit.revenu_potentiel || 0) },
  ];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all"
    >
      {/* Header avec nom et bouton panier */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-base sm:text-lg flex-1 pr-2">
          {produit.nom_produit}
        </h3>
        <button
          onClick={() => onAddToCart(produit)}
          className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
        </button>
      </div>

      {/* Grid des stats - 2x2 sur mobile, 1x4 sur desktop */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <stat.icon className="w-4 h-4 text-gray-500" />
            <div className="text-sm">
              <span className="text-gray-600">{stat.label}: </span>
              <span className="font-medium">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions - responsive */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(produit)}
          className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          <span className="hidden sm:inline">Modifier</span>
        </button>
        <button
          onClick={() => onDelete(produit.id_produit)}
          className="flex-1 py-2 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Supprimer</span>
        </button>
      </div>
    </motion.div>
  );
}
```

### 3. API Routes Next.js
```typescript
// app/api/produits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Utilisation de la vue SQL list_produits
    const produits = await prisma.$queryRaw`
      SELECT * FROM public.list_produits 
      WHERE id_structure = ${user.id_structure}
      ORDER BY nom_produit ASC
    `;

    return NextResponse.json({ success: true, data: produits });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { nom_produit, cout_revient, prix_vente } = body;

    // Validations
    if (!nom_produit?.trim()) {
      return NextResponse.json({ error: 'Nom du produit requis' }, { status: 400 });
    }

    if (prix_vente < cout_revient) {
      return NextResponse.json({ 
        error: 'Le prix de vente doit être supérieur au coût de revient' 
      }, { status: 400 });
    }

    const produit = await prisma.produit_service.create({
      data: {
        id_structure: user.id_structure,
        nom_produit: nom_produit.trim(),
        cout_revient: parseFloat(cout_revient) || 0,
        prix_vente: parseFloat(prix_vente) || 0,
      },
    });

    return NextResponse.json({ success: true, data: produit });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
```

---

## 📱 Optimisations Mobile & Performance

### 1. Stratégies Responsive
```typescript
// hooks/useResponsive.ts
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 640);
      setIsTablet(window.innerWidth > 640 && window.innerWidth <= 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
}
```

### 2. Optimisation Panier Mobile
```typescript
// components/produits/BarreStatutPanier.tsx
export function BarreStatutPanier({ cartItems, totalAmount, onToggleCart }) {
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 sm:p-5 z-40"
    >
      <div className="container-produits flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-primary" />
          <span className="font-medium">
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold">
            {formatMontant(totalAmount)} FCFA
          </span>
          <button
            onClick={onToggleCart}
            className="btn-gradient px-4 py-2 rounded-lg"
          >
            Voir panier
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## 🔄 Gestion d'État avec Zustand

```typescript
// stores/produitsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProduitsState {
  produits: Produit[];
  panier: ArticlePanier[];
  searchTerm: string;
  isLoading: boolean;
  
  // Actions
  setProduits: (produits: Produit[]) => void;
  addToCart: (produit: Produit) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  setSearchTerm: (term: string) => void;
}

export const useProduitsStore = create<ProduitsState>()(
  persist(
    (set, get) => ({
      produits: [],
      panier: [],
      searchTerm: '',
      isLoading: false,

      setProduits: (produits) => set({ produits }),
      
      addToCart: (produit) => set((state) => {
        const existing = state.panier.find(item => item.id_produit === produit.id_produit);
        if (existing) {
          return {
            panier: state.panier.map(item =>
              item.id_produit === produit.id_produit
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          };
        }
        return { panier: [...state.panier, { ...produit, quantity: 1 }] };
      }),

      updateQuantity: (id, quantity) => set((state) => ({
        panier: quantity > 0
          ? state.panier.map(item =>
              item.id_produit === id ? { ...item, quantity } : item
            )
          : state.panier.filter(item => item.id_produit !== id),
      })),

      clearCart: () => set({ panier: [] }),
      setSearchTerm: (term) => set({ searchTerm: term }),
    }),
    {
      name: 'fayclick-panier',
      partialize: (state) => ({ panier: state.panier }),
    }
  )
);
```

---

## 🎯 Guide d'Implémentation Étape par Étape

### Phase 1: Infrastructure (2 jours)
1. **Créer la structure de dossiers** selon l'architecture définie
2. **Implémenter les types TypeScript** dans `types/produit.ts`
3. **Configurer les API routes** pour CRUD produits
4. **Adapter les requêtes SQL** depuis l'ancien contrôleur

### Phase 2: Composants UI (3 jours)
1. **StatsProduits**: Implémenter avec animations Framer Motion
2. **CarteProduit**: Design card responsive avec actions
3. **ModalAjoutProduit**: Formulaire avec validation Zod
4. **Panier & BarreStatut**: Interface mobile-first

### Phase 3: Logique Métier (2 jours)
1. **Store Zustand**: État global produits et panier
2. **Hooks personnalisés**: useResponsive, useProduits
3. **Service API**: Couche d'abstraction pour les appels
4. **Gestion stock**: Modal et logique de mouvement

### Phase 4: Optimisations (1 jour)
1. **Performance**: React Query pour cache et synchronisation
2. **PWA**: Service Worker pour offline
3. **Tests**: Responsive sur 4 tailles d'écran
4. **Animations**: GPU-accelerated avec Framer Motion

---

## 📐 Breakpoints & Tests Responsive

### Appareils de Test Obligatoires
```css
/* Breakpoints critiques */
@media (max-width: 320px) { /* iPhone SE */ }
@media (max-width: 375px) { /* iPhone standard */ }
@media (max-width: 640px) { /* Smartphones */ }
@media (min-width: 641px) and (max-width: 1024px) { /* Tablettes */ }
@media (min-width: 1025px) { /* Desktop */ }
```

### Checklist Mobile
- [ ] Touch targets minimum 44x44px
- [ ] Texte minimum 16px sur mobile
- [ ] Pas de scroll horizontal
- [ ] Animations 60fps
- [ ] Panier accessible avec le pouce
- [ ] Modal plein écran sur mobile

---

## 🔒 Sécurité & Validation

### Validation Côté Client (Zod)
```typescript
import { z } from 'zod';

export const produitSchema = z.object({
  nom_produit: z.string().min(1, 'Nom requis').max(125),
  cout_revient: z.number().min(0, 'Coût positif requis'),
  prix_vente: z.number().min(0, 'Prix positif requis'),
}).refine(data => data.prix_vente >= data.cout_revient, {
  message: 'Prix de vente doit être ≥ au coût',
  path: ['prix_vente'],
});
```

### Middleware Auth
```typescript
// middleware/auth.ts
export async function verifyToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) throw new Error('Token manquant');
  
  const payload = await jose.jwtVerify(token, secret);
  return payload.payload as User;
}
```

---

## 🚀 Scripts de Migration

### Migration Base de Données
```sql
-- Vérifier l'existence de la vue list_produits
CREATE OR REPLACE VIEW public.list_produits AS
SELECT 
    p.id_produit,
    p.id_structure,
    p.nom_produit,
    p.cout_revient,
    p.prix_vente,
    COALESCE(s.stock_actuel, 0) as niveau_stock,
    (p.prix_vente - p.cout_revient) as marge,
    (p.prix_vente * COALESCE(s.stock_actuel, 0)) as valeur_stock,
    ((p.prix_vente - p.cout_revient) * COALESCE(s.stock_actuel, 0)) as revenu_potentiel
FROM produit_service p
LEFT JOIN (
    SELECT 
        id_produit,
        id_structure,
        SUM(CASE 
            WHEN type_mouvement = 'ENTREE' THEN quantite 
            WHEN type_mouvement = 'SORTIE' THEN -quantite 
        END) as stock_actuel
    FROM mouvement_stock
    GROUP BY id_produit, id_structure
) s ON p.id_produit = s.id_produit AND p.id_structure = s.id_structure;
```

---

## 📝 Conventions de Code

### Naming Conventions
- **Composants**: PascalCase (`CarteProduit.tsx`)
- **Hooks**: camelCase avec préfixe use (`useProduits`)
- **API Routes**: kebab-case (`/api/produits/stock`)
- **Types**: PascalCase avec suffixe si nécessaire (`ProduitFormData`)

### Structure Composant Type
```typescript
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  // autres props
}

export function Component({ className, ...props }: ComponentProps) {
  // Hooks en premier
  const { isMobile } = useResponsive();
  
  // État local
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {}, []);
  
  // Handlers
  const handleAction = () => {};
  
  // Render
  return (
    <motion.div className={cn('base-classes', className)}>
      {/* Contenu */}
    </motion.div>
  );
}
```

---

## 🎉 Résultat Attendu

Une interface de gestion des produits/services qui:
- **S'adapte parfaitement** du mobile 320px au desktop 4K
- **Charge en <2s** même sur 3G
- **Fonctionne offline** grâce au Service Worker
- **Anime à 60fps** sur tous les appareils
- **Respecte le design** glassmorphism FayClick
- **Simplifie l'usage** pour le secteur informel

Ce module servira de référence pour les autres modules métier de FayClick V2.

---

*Document créé le 18 Août 2025 - Version 1.0*