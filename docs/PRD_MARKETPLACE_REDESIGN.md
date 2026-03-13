# PRD - Redesign Marketplace : Pages d'Accueil & Catalogues

**Version:** 1.0
**Date:** 03 mars 2026
**Auteur:** Product Manager (BMAD)
**Projet:** FayClick V2
**Statut:** Draft - En attente validation

---

## 1. Résumé Exécutif

FayClick veut repositionner ses pages publiques comme une **marketplace de référence au Sénégal**, permettant aux visiteurs de découvrir facilement les marchands et leurs produits. La refonte concerne 3 pages : la **landing page** (`/`), le **marketplace global** (`/catalogues`), et la **boutique individuelle** (`/catalogue?id=X`).

L'objectif principal est de transformer `/catalogues` en une marketplace moderne inspirée de templates e-commerce premium (référence : Venezo), avec une **recherche intelligente par nom ou téléphone** pour retrouver un marchand instantanément.

### Proposition de valeur
> Chaque marchand FayClick dispose d'une vitrine en ligne accessible par son nom ou son numéro de téléphone. Les visiteurs naviguent dans un marketplace premium, trouvent leur marchand en 2 secondes, et achètent directement via mobile money.

---

## 2. Objectifs Business

| # | Objectif | Métrique de succès |
|---|----------|--------------------|
| OBJ-1 | Augmenter la visibilité des marchands auprès du grand public | +40% de visites sur /catalogues dans les 3 mois |
| OBJ-2 | Faciliter la recherche de marchands par téléphone | 80% des recherches aboutissent en < 3 secondes |
| OBJ-3 | Convertir les visiteurs en acheteurs | +25% de redirections /catalogues → /catalogue?id=X |
| OBJ-4 | Offrir une expérience mobile irréprochable | Score Lighthouse Mobile > 85, 0 problème UX sur écrans < 400px |
| OBJ-5 | Renforcer la crédibilité de FayClick comme plateforme marketplace | NPS visiteurs > 60 |

---

## 3. Personas

### Persona 1 : Le Visiteur Mobile (Awa, 28 ans)
- **Profil** : Consommatrice sénégalaise, smartphone Android entrée/milieu de gamme (écran 5.5"-6.5")
- **Connexion** : 4G intermittente, sensible à la consommation data
- **Besoin** : Trouver rapidement le marchand dont elle a le numéro (reçu via WhatsApp), voir ses produits, et commander
- **Frustration** : Pages trop lourdes, texte trop petit, champs de recherche mal placés
- **Parcours type** : Reçoit un numéro de marchand → va sur FayClick → recherche par téléphone → achète

### Persona 2 : Le Marchand Social (Modou, 35 ans)
- **Profil** : Commerçant, gère sa boutique depuis FayClick
- **Besoin** : Partager facilement le lien de sa boutique, être trouvable par ses clients
- **Frustration** : Ses clients ne retrouvent pas sa boutique sur FayClick
- **Parcours type** : Partage son numéro → le client le trouve sur /catalogues → visite sa boutique

### Persona 3 : Le Curieux Desktop (Ibrahima, 42 ans)
- **Profil** : Entrepreneur, navigue sur PC au bureau, cherche des fournisseurs
- **Besoin** : Explorer le marketplace, comparer les boutiques, trouver de nouveaux fournisseurs
- **Frustration** : Manque de visibilité sur l'étendue de l'offre FayClick

---

## 4. Scope de la Refonte

### 4.1. Pages concernées

| Page | URL | Niveau de refonte | Priorité |
|------|-----|-------------------|----------|
| **Marketplace Global** | `/catalogues` | Refonte totale (style Venezo) | P0 - Critique |
| **Boutique Individuelle** | `/catalogue?id=X` | Refonte style Venezo | P0 - Critique |
| **Landing Page** | `/` (MobileHome + DesktopHome) | Amélioration majeure | P1 - Haute |

### 4.2. Hors scope (V1)
- Système de notation/avis boutiques
- Système de promotions/deals avec countdown
- Paiement multi-structures (panier cross-boutique)
- Tableau de bord marchand pour gérer sa vitrine marketplace
- SEO avancé (meta tags dynamiques par boutique)

---

## 5. Design System & Directives UX

### 5.1. Palette de couleurs

La palette **vert émeraude glassmorphism** actuelle est conservée et enrichie :

| Usage | Couleur | Code | Variantes |
|-------|---------|------|-----------|
| **Primaire** | Émeraude | `#10B981` | 400: `#34D399`, 600: `#059669`, 700: `#047857` |
| **Secondaire** | Teal | `#14B8A6` | 400: `#2DD4BF`, 600: `#0D9488` |
| **Accent** | Orange FayClick | `#F59E0B` | Pour CTA prioritaires, badges promo |
| **Surface** | Blanc/Glass | `rgba(255,255,255,0.1)` | `backdrop-blur-2xl`, `border-white/20` |
| **Background** | Gradient sombre | `from-slate-900 via-emerald-900 to-teal-900` | Pages catalogue |
| **Background clair** | Gradient clair | `from-emerald-50 via-white to-teal-50` | Landing page, sections claires |
| **Texte primaire** | Blanc | `#FFFFFF` | Sur fonds sombres |
| **Texte secondaire** | Gris clair | `#E2E8F0` (slate-200) | Sous-titres, descriptions |

### 5.2. Typographie
- **Headings** : Montserrat Bold/ExtraBold
- **Body** : Inter Regular/Medium
- **Chiffres** : Montserrat SemiBold (prix, stats)

### 5.3. Principes UX fondamentaux

| # | Principe | Application |
|---|----------|-------------|
| UX-1 | **Mobile-First absolu** | Concevoir d'abord pour un écran 360px, puis adapter vers le haut |
| UX-2 | **Touch-friendly** | Minimum 44px pour toute zone tactile, espacement 8px entre éléments cliquables |
| UX-3 | **Lisibilité** | Taille de police minimum 14px sur mobile, contraste WCAG AA |
| UX-4 | **Performance** | Lazy loading images, pagination, skeleton loading, pas de JS bloquant |
| UX-5 | **Feedback immédiat** | Chaque action utilisateur a une réponse visuelle < 100ms |
| UX-6 | **Navigation intuitive** | Max 2 taps pour atteindre n'importe quel contenu |

### 5.4. Breakpoints responsifs

| Nom | Largeur | Cible |
|-----|---------|-------|
| `xs` | < 480px | Petits smartphones (priorité #1) |
| `sm` | 480-639px | Smartphones standards |
| `md` | 640-767px | Grands smartphones / petites tablettes |
| `lg` | 768-1023px | Tablettes |
| `xl` | 1024-1279px | Desktop |
| `2xl` | ≥ 1280px | Grands écrans |

---

## 6. Spécifications Fonctionnelles

---

### 6.1. PAGE `/catalogues` - MARKETPLACE GLOBAL (Refonte Totale)

#### 6.1.1. Architecture de la page

```
┌─────────────────────────────────────────────────┐
│  HEADER STICKY                                  │
│  [Logo FayClick] [Barre Recherche Unifiée] [☰]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  HERO SECTION                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  Slogan + Stats Live + CTA              │    │
│  │  "Le plus grand marketplace du Sénégal" │    │
│  │  [X marchands] [Y produits]             │    │
│  │  [Barre de recherche intégrée]          │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  SECTION : BOUTIQUES VEDETTES                   │
│  ┌────────────────────────────────────────┐     │
│  │  ◀ [Boutique][Boutique][Boutique] ▶    │     │
│  │    (Carrousel horizontal scrollable)   │     │
│  └────────────────────────────────────────┘     │
│                                                 │
│  SECTION : TOUS LES PRODUITS                    │
│  ┌─────────────────────────────────────┐        │
│  │ Filtres : [Catégorie ▼] [Trier ▼]  │        │
│  ├─────────────────────────────────────┤        │
│  │ [Produit] [Produit] [Produit]       │        │
│  │ [Produit] [Produit] [Produit]       │        │
│  │ [Produit] [Produit] [Produit]       │        │
│  │       [Charger plus...]             │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  FOOTER                                         │
│  [À propos] [Contact] [Mentions] [Réseaux]      │
└─────────────────────────────────────────────────┘

  📱 FAB (Floating Action Button) - Mobile only
  [↑ Haut de page]
```

#### 6.1.2. Header Sticky

**Comportement** :
- Fixé en haut de l'écran au scroll
- Contient la barre de recherche toujours accessible
- Hauteur : 56px mobile, 64px desktop
- Background : `bg-white/90 backdrop-blur-xl border-b border-emerald-200/50`
- Z-index élevé (50+)

**Contenu** :
| Élément | Mobile | Desktop |
|---------|--------|---------|
| Logo FayClick | Icône compacte 32px | Logo complet + texte |
| Barre de recherche | Pleine largeur | Centrée, max 600px |
| Menu | Icône hamburger `☰` | Navigation textuelle inline |

#### 6.1.3. Barre de Recherche Unifiée Intelligente

C'est le composant **central** de la page. Un seul champ de saisie qui détecte automatiquement le type de recherche.

**Logique de détection** :
```
SI input commence par 7 ET longueur >= 6 ET que des chiffres
  → Recherche par TÉLÉPHONE
SINON
  → Recherche par NOM de structure
```

**Spécifications** :
| Propriété | Valeur |
|-----------|--------|
| Placeholder | `"Rechercher un marchand par nom ou téléphone..."` |
| Icône gauche | `Search` (loupe) |
| Icône droite | Indicateur dynamique : `📱` si mode tél, `🏪` si mode nom |
| Debounce | 300ms avant recherche |
| Résultats | Dropdown avec max 5 suggestions (autocomplétion) |
| Action sur sélection | Redirection vers `/catalogue?id=X` |
| Taille mobile | Hauteur 48px, border-radius 24px (pill shape) |
| Taille desktop | Hauteur 52px, border-radius 26px |
| Style | `bg-white/95 backdrop-blur-sm shadow-lg border border-emerald-200` |

**Dropdown de suggestions** :
```
┌──────────────────────────────────────┐
│ 🏪 LIBRAIRIE CHEZ KELEFA SCAT URBAM │
│    📱 777301221 · 5150 produits      │
├──────────────────────────────────────┤
│ 🏪 KELEFA BOUTIQUE DAKAR            │
│    📱 781234567 · 230 produits       │
├──────────────────────────────────────┤
│ Voir tous les résultats (3) →        │
└──────────────────────────────────────┘
```

**Chaque suggestion affiche** :
- Logo miniature (32px) ou icône boutique par défaut
- Nom de la structure (bold)
- Numéro de téléphone + nombre de produits (texte secondaire)
- Clic → redirection `/catalogue?id=X`

**Recherche par téléphone** :
- Dès que l'utilisateur tape un numéro commençant par 7
- L'indicateur passe en mode `📱`
- Le placeholder change : `"Entrez le numéro du marchand..."`
- Recherche dans le champ `telephone` des structures
- Format accepté : 7XXXXXXXX (9 chiffres) ou partiel (min 6 chiffres)

#### 6.1.4. Hero Section

**Contenu** :
- **Titre principal** : "Trouvez tout ce dont vous avez besoin" (Montserrat ExtraBold)
- **Sous-titre** : "Le marketplace de référence au Sénégal" (Inter Regular)
- **Statistiques live** (animées au scroll-in) :
  - `{N} marchands` (icône Building2)
  - `{N} produits` (icône Package)
- **CTA** : Barre de recherche dupliquée/intégrée dans le hero (celle du header se masque quand le hero est visible)
- **Background** : Gradient animé `from-emerald-600 via-teal-600 to-emerald-700` avec overlay pattern subtil

**Dimensions** :
- Mobile : 280px de hauteur, padding 24px
- Tablette : 320px
- Desktop : 380px

**Animations** :
- Stats : Counter animation (0 → N) au premier affichage
- Background : Gradient shift lent (10s cycle)
- Apparition : fade-in + slide-up avec stagger

#### 6.1.5. Section Boutiques Vedettes

**Layout** : Carrousel horizontal scrollable (swipe mobile, flèches desktop)

**Carte Boutique** :
```
┌──────────────────────┐
│  ┌────┐              │
│  │Logo│  NOM STRUCT.  │
│  └────┘  📦 N produits│
│         [Voir →]      │
└──────────────────────┘
```

| Propriété | Valeur |
|-----------|--------|
| Taille carte | 200px × 100px mobile, 280px × 120px desktop |
| Logo | 48px × 48px, arrondi 12px, placeholder si absent |
| Nom | Montserrat SemiBold, 14px mobile, 16px desktop, max 2 lignes |
| Badge produits | `📦 {N} produits`, Inter 12px, text-emerald-300 |
| Bouton | "Voir →", compact, outline emerald |
| Background carte | `bg-white/10 backdrop-blur-xl border border-white/20` |
| Hover | Scale 1.03, shadow glow emerald |
| Clic | Redirection vers `/catalogue?id=X` |

**Comportement carrousel** :
- Affichage : 2 cartes visibles mobile, 3 tablette, 4-5 desktop
- Navigation : Swipe tactile + flèches prev/next
- Auto-scroll désactivé (contrôle utilisateur uniquement)
- Indicateurs : Dots de pagination en bas

**Données** : Toutes les structures ayant des produits publics, triées par nombre de produits décroissant.

#### 6.1.6. Section Tous les Produits

**Header de section** :
```
┌──────────────────────────────────────────┐
│ Tous les produits    [Catégorie ▼] [Tri ▼]│
│ {N} résultats                             │
└──────────────────────────────────────────┘
```

**Filtres** :
| Filtre | Type | Options |
|--------|------|---------|
| Catégorie | Select/Dropdown | Toutes + catégories dynamiques (LIVRE, PAPETERIE, etc.) |
| Tri | Select/Dropdown | Pertinence, Prix croissant, Prix décroissant, Plus récent |

**Grille de produits** :
- Mobile : 2 colonnes, gap 12px
- Tablette : 3 colonnes, gap 16px
- Desktop : 4 colonnes, gap 20px

**Carte Produit (marketplace)** :

```
┌─────────────────────┐
│  [Image produit]    │  ← Aspect ratio 1:1, lazy loaded
│  ┌─CATÉGORIE─┐      │  ← Badge catégorie (top-right)
│                     │
├─────────────────────┤
│  NOM DU PRODUIT     │  ← Max 2 lignes, Montserrat SemiBold 14px
│  🏪 Nom Structure   │  ← Inter 12px, text-emerald-400, cliquable
│                     │
│  12 500 F CFA       │  ← Montserrat Bold 16px, text-emerald-400
│  Stock: 47          │  ← Inter 12px, vert si >5, orange si ≤5, rouge si 0
│                     │
│  [Voir Boutique →]  │  ← Bouton CTA → /catalogue?id=X
└─────────────────────┘
```

| Propriété | Valeur |
|-----------|--------|
| Background | `bg-white` (mode clair) ou `bg-white/10 backdrop-blur` (mode sombre) |
| Border radius | 16px |
| Shadow | `shadow-md`, hover: `shadow-xl` |
| Transition | Scale 1.02 + shadow sur hover, 200ms ease |
| Image fallback | Logo FayClick en placeholder (comme actuellement) |
| Nom structure | Cliquable → redirige vers `/catalogue?id=X` |
| Bouton CTA | `bg-emerald-500 hover:bg-emerald-600 text-white`, border-radius 12px |

**Pagination** :
- Type : "Charger plus" (infinite scroll button) plutôt que pagination numérotée
- Batch : 24 produits par chargement (2 pages de 12)
- Texte : "Afficher plus de produits ({N} restants)"
- Animation : Skeleton loading pendant le chargement

#### 6.1.7. Footer

**Contenu** :
- Logo FayClick compact
- Liens : À propos, Contact, CGU, Politique de confidentialité
- Réseaux sociaux : WhatsApp, Facebook, Instagram
- Copyright : "© 2026 FayClick - La Super App du Sénégal"

**Style** : `bg-slate-900 text-white/70`, padding 48px mobile, 64px desktop

#### 6.1.8. FAB (Floating Action Button) - Mobile uniquement

- **Position** : Bottom-right, 16px du bord
- **Icône** : Flèche vers le haut (↑)
- **Apparition** : Visible uniquement après 300px de scroll
- **Action** : Smooth scroll vers le haut de page
- **Style** : `bg-emerald-500 text-white shadow-lg`, 48px rond
- **Animation** : Fade-in/out avec scale

---

### 6.2. PAGE `/catalogue?id=X` - BOUTIQUE INDIVIDUELLE (Refonte Venezo)

#### 6.2.1. Architecture de la page

```
┌─────────────────────────────────────────────────┐
│  HEADER BOUTIQUE                                │
│  [← Retour] [Logo] NOM STRUCTURE [🛒 Panier(N)]│
├─────────────────────────────────────────────────┤
│                                                 │
│  BANNIÈRE BOUTIQUE                              │
│  ┌─────────────────────────────────────────┐    │
│  │  [Logo]  NOM COMPLET                    │    │
│  │          📱 Téléphone                    │    │
│  │          📦 N produits · N catégories    │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  NAVIGATION CATÉGORIES (horizontal scroll)      │
│  [Tout] [LIVRE] [PAPETERIE] [LECTURE] [...]     │
│                                                 │
│  BARRE RECHERCHE PRODUIT                        │
│  [🔍 Rechercher un produit...]                  │
│                                                 │
│  GRILLE PRODUITS                                │
│  ┌────────┐ ┌────────┐ ┌────────┐              │
│  │Produit │ │Produit │ │Produit │              │
│  │  Card  │ │  Card  │ │  Card  │              │
│  └────────┘ └────────┘ └────────┘              │
│  ┌────────┐ ┌────────┐ ┌────────┐              │
│  │Produit │ │Produit │ │Produit │              │
│  │  Card  │ │  Card  │ │  Card  │              │
│  └────────┘ └────────┘ └────────┘              │
│                                                 │
│  [Charger plus...]                              │
│                                                 │
│  FOOTER (identique /catalogues)                 │
└─────────────────────────────────────────────────┘

  📱 FAB Mobile : [🛒 Panier (N)]
```

#### 6.2.2. Header Boutique (Sticky)

| Élément | Mobile | Desktop |
|---------|--------|---------|
| Bouton retour | `← Marketplace` → `/catalogues` | Idem |
| Logo structure | 28px mini-logo | 32px mini-logo |
| Nom structure | Tronqué si > 20 chars | Complet |
| Panier | Icône `🛒` + badge count | Icône + texte "Panier (N)" |
| Hauteur | 52px | 60px |
| Style | `bg-white/90 backdrop-blur-xl` | Idem |

#### 6.2.3. Bannière Boutique

**Contenu** :
- Logo structure (80px mobile, 100px desktop), border-radius 16px
- Nom complet de la structure (Montserrat Bold 24px mobile, 32px desktop)
- Numéro de téléphone (cliquable → appel sur mobile)
- Stats : `📦 {N} produits · 📂 {N} catégories`
- Background : Gradient emerald adaptatif

#### 6.2.4. Navigation Catégories

**Type** : Tabs horizontales scrollables (pills)

```
[Tout (150)] [LIVRE (80)] [PAPETERIE (45)] [LECTURE (25)]
```

| Propriété | Valeur |
|-----------|--------|
| Style inactif | `bg-white/10 text-white/70 border border-white/20` |
| Style actif | `bg-emerald-500 text-white shadow-lg` |
| Taille | Hauteur 36px mobile, 40px desktop |
| Scroll | Horizontal, snap-x, indicateurs masqués |
| Count | Nombre de produits entre parenthèses |

#### 6.2.5. Barre Recherche Produit

- Champ unique : "Rechercher un produit dans cette boutique..."
- Filtre instantané (debounce 200ms)
- Reset avec bouton ✕
- Style cohérent avec la barre de recherche marketplace

#### 6.2.6. Carte Produit Boutique

Identique à la carte marketplace (section 6.1.6) MAIS :
- **Pas de nom de structure** (on est déjà dans la boutique)
- **Bouton "Acheter"** au lieu de "Voir Boutique" → ajoute au panier
- **Badge stock** plus visible
- **Carrousel photos** au clic sur l'image (modal existant ModalCarrouselProduit)

#### 6.2.7. Panier (existant, à harmoniser)

Le composant `PanierPublic` existant est conservé mais harmonisé visuellement :
- Drawer slide-in depuis la droite (desktop) ou bottom sheet (mobile)
- Style adapté au nouveau design (mêmes couleurs, border-radius, shadows)
- FAB mobile : Bouton flottant `🛒 Panier (N)` en bas à droite, remplace le FAB scroll-top

---

### 6.3. PAGE `/` - LANDING PAGE (Amélioration Majeure)

#### 6.3.1. Modifications sur MobileHome

**Ajouts** :
1. **Section "Marketplace" avant les features** :
   ```
   ┌─────────────────────────────┐
   │  🛍️ Découvrez nos marchands │
   │                             │
   │  Plus de N marchands et     │
   │  N produits disponibles     │
   │                             │
   │  [Explorer le marketplace →]│
   │       (bouton CTA orange)   │
   └─────────────────────────────┘
   ```
   - Position : Après le hero, avant les features
   - Style : Carte glassmorphism avec gradient emerald/teal
   - Bouton : `bg-orange-500 hover:bg-orange-600 text-white`, taille large (48px hauteur)
   - Lien : `/catalogues`
   - Animation : Pulse subtil sur le bouton pour attirer l'attention

2. **Stats dynamiques** : Appel API pour récupérer le nombre réel de marchands/produits

**Ajustements responsive** :
- Vérifier que tous les textes sont lisibles à 360px
- Espacement suffisant entre éléments tactiles (min 44px)

#### 6.3.2. Modifications sur DesktopHome

**Ajouts** :
1. **Même section "Marketplace"** que mobile, adaptée desktop :
   - Layout horizontal : Texte à gauche, illustration/preview à droite
   - Preview : Mini-grille de 3-4 cartes produit en aperçu (données réelles)
   - Bouton CTA plus large, centré sous le texte

2. **Lien dans le header** : Ajout d'un item "Marketplace" dans la navigation desktop

---

## 7. Spécifications Techniques

### 7.1. Nouvelles API/Requêtes nécessaires

| # | Endpoint/Fonction | Description | Priorité |
|---|-------------------|-------------|----------|
| API-1 | `search_structures(query, type)` | Recherche structures par nom ou téléphone avec autocomplétion | P0 |
| API-2 | `get_all_produits_publics()` (existant) | Déjà implémenté, à optimiser si nécessaire | - |
| API-3 | `get_produits_by_structure_name()` (existant) | Déjà implémenté | - |
| API-4 | `get_structures_publiques()` | Liste toutes les structures ayant des produits publics (pour carrousel boutiques) | P1 |

#### API-1 : Recherche de structures (NOUVEAU)

**Besoin** : Recherche intelligente par nom OU téléphone avec résultats instantanés.

**Option A - Requête SQL directe** (recommandé pour V1) :
```sql
-- Recherche par nom (ILIKE pour insensible à la casse)
SELECT id_structure, nom_structure, telephone, logo,
  (SELECT COUNT(*) FROM produits WHERE id_structure = s.id_structure AND presente_au_public = true) as nb_produits
FROM structures s
WHERE nom_structure ILIKE '%{query}%'
  AND EXISTS (SELECT 1 FROM produits WHERE id_structure = s.id_structure AND presente_au_public = true)
LIMIT 5;

-- Recherche par téléphone
SELECT id_structure, nom_structure, telephone, logo,
  (SELECT COUNT(*) FROM produits WHERE id_structure = s.id_structure AND presente_au_public = true) as nb_produits
FROM structures s
WHERE telephone LIKE '%{query}%'
  AND EXISTS (SELECT 1 FROM produits WHERE id_structure = s.id_structure AND presente_au_public = true)
LIMIT 5;
```

**Option B - Fonction PostgreSQL dédiée** (recommandé pour la suite) :
```sql
CREATE OR REPLACE FUNCTION search_structures_publiques(p_query TEXT)
RETURNS JSON AS $$
  -- Détecte auto si téléphone (commence par 7 + que des chiffres)
  -- Retourne JSON { success, data: [{id_structure, nom_structure, telephone, logo, nb_produits}] }
$$;
```

### 7.2. Nouveaux composants à créer

| # | Composant | Fichier | Description |
|---|-----------|---------|-------------|
| C-1 | `SearchBarUnified` | `components/catalogue/SearchBarUnified.tsx` | Barre de recherche intelligente avec autocomplétion |
| C-2 | `HeroMarketplace` | `components/catalogue/HeroMarketplace.tsx` | Section hero avec stats et recherche |
| C-3 | `BoutiquesCarousel` | `components/catalogue/BoutiquesCarousel.tsx` | Carrousel horizontal de fiches boutiques |
| C-4 | `CarteBoutique` | `components/catalogue/CarteBoutique.tsx` | Fiche boutique (logo, nom, nb produits) |
| C-5 | `FilterBar` | `components/catalogue/FilterBar.tsx` | Barre de filtres (catégorie, tri) |
| C-6 | `MarketplaceFooter` | `components/catalogue/MarketplaceFooter.tsx` | Footer marketplace |
| C-7 | `FABButton` | `components/ui/FABButton.tsx` | Floating Action Button réutilisable |
| C-8 | `BoutiqueHeader` | `components/catalogue/BoutiqueHeader.tsx` | Header sticky de la page boutique |
| C-9 | `BoutiqueBanner` | `components/catalogue/BoutiqueBanner.tsx` | Bannière profil boutique |
| C-10 | `CategoryTabs` | `components/catalogue/CategoryTabs.tsx` | Navigation catégories horizontale |
| C-11 | `MarketplaceSection` | `components/home/MarketplaceSection.tsx` | Section CTA marketplace pour landing page |

### 7.3. Composants existants à modifier

| Composant | Fichier | Modifications |
|-----------|---------|---------------|
| `CataloguesGlobalClient` | `components/catalogue/CataloguesGlobalClient.tsx` | Refonte complète du layout |
| `CataloguePublicClient` | `components/catalogue/CataloguePublicClient.tsx` | Refonte complète du layout |
| `CarteProduit` | `components/catalogue/CarteProduit.tsx` | Nouveau design de carte produit |
| `PanierPublic` | `components/catalogue/PanierPublic.tsx` | Harmonisation visuelle |
| `MobileHome` | `components/home/MobileHome.tsx` | Ajout section marketplace |
| `DesktopHome` | `components/home/DesktopHome.tsx` | Ajout section marketplace + lien nav |

### 7.4. Nouveau service

| Service | Fichier | Méthodes |
|---------|---------|----------|
| `search.service.ts` | `services/search.service.ts` | `searchStructures(query: string): Promise<StructureSearchResult[]>` |

### 7.5. Nouveaux types TypeScript

```typescript
// types/marketplace.ts

interface StructureSearchResult {
  id_structure: number;
  nom_structure: string;
  telephone: string;
  logo: string | null;
  nb_produits: number;
}

interface SearchType {
  type: 'nom' | 'telephone';
  query: string;
}

interface MarketplaceStats {
  total_structures: number;
  total_produits: number;
}
```

---

## 8. Wireframes Mobile (ASCII)

### 8.1. `/catalogues` - Mobile (360px)

```
┌────────────────────────────────┐
│ [FC] [🔍 Rechercher...]   [☰] │ ← Header sticky 56px
├────────────────────────────────┤
│                                │
│  ╔════════════════════════╗    │
│  ║  Trouvez tout ce dont  ║    │ ← Hero 280px
│  ║  vous avez besoin      ║    │
│  ║                        ║    │
│  ║  🏪 42 marchands       ║    │
│  ║  📦 12,350 produits    ║    │
│  ║                        ║    │
│  ║  [🔍 Nom ou tél...]   ║    │ ← Recherche dans hero
│  ╚════════════════════════╝    │
│                                │
│  Boutiques populaires     >    │
│  ┌──────┐ ┌──────┐ ┌──────┐   │ ← Carrousel scroll
│  │ Logo │ │ Logo │ │ Logo │   │
│  │ Nom  │ │ Nom  │ │ Nom  │   │
│  │ 150p │ │ 80p  │ │ 200p │   │
│  │[Voir]│ │[Voir]│ │[Voir]│   │
│  └──────┘ └──────┘ └──────┘   │
│  ● ○ ○ ○                      │
│                                │
│  Tous les produits             │
│  [Catégorie ▼]  [Trier ▼]     │
│  12,350 résultats              │
│                                │
│  ┌────────┐ ┌────────┐        │
│  │ [img]  │ │ [img]  │        │ ← Grille 2 colonnes
│  │ Nom    │ │ Nom    │        │
│  │ 🏪 Str │ │ 🏪 Str │        │
│  │ 1200 F │ │ 7500 F │        │
│  │[Voir →]│ │[Voir →]│        │
│  └────────┘ └────────┘        │
│  ┌────────┐ ┌────────┐        │
│  │ [img]  │ │ [img]  │        │
│  │ ...    │ │ ...    │        │
│  └────────┘ └────────┘        │
│                                │
│  [Afficher plus (12,326) ↓]   │
│                                │
│  ┌────────────────────────┐   │
│  │ Footer                 │   │
│  │ © 2026 FayClick        │   │
│  └────────────────────────┘   │
│                           [↑] │ ← FAB scroll-top
└────────────────────────────────┘
```

### 8.2. `/catalogue?id=218` - Mobile (360px)

```
┌────────────────────────────────┐
│ [←] [Logo] LIBRAIRIE..  [🛒3] │ ← Header sticky 52px
├────────────────────────────────┤
│                                │
│  ╔════════════════════════╗    │
│  ║  [Logo 80px]           ║    │ ← Bannière boutique
│  ║  LIBRAIRIE CHEZ KELEFA ║    │
│  ║  SCAT URBAM            ║    │
│  ║  📱 777301221          ║    │
│  ║  📦 5150 · 📂 12 cat.  ║    │
│  ╚════════════════════════╝    │
│                                │
│  [Tout][LIVRE][PAPETERIE][...] │ ← Catégories scroll
│                                │
│  [🔍 Rechercher un produit...] │ ← Recherche produit
│                                │
│  ┌────────┐ ┌────────┐        │
│  │ [img]  │ │ [img]  │        │ ← Grille 2 colonnes
│  │ Nom    │ │ Nom    │        │
│  │ 1200 F │ │ 7500 F │        │
│  │[Acheter│ │[Acheter│        │
│  └────────┘ └────────┘        │
│  ...                          │
│                                │
│  [Afficher plus (5126) ↓]     │
│                           [🛒]│ ← FAB panier
└────────────────────────────────┘
```

---

## 9. Parcours Utilisateurs Clés

### Parcours 1 : Recherche par téléphone (Awa)

```
1. Awa ouvre fayclick.com/catalogues sur son mobile
2. Elle voit le hero avec la barre de recherche
3. Elle tape "777301221" (numéro reçu via WhatsApp)
4. La barre détecte un téléphone → affiche l'indicateur 📱
5. Après 300ms, dropdown apparaît avec la suggestion :
   "🏪 LIBRAIRIE CHEZ KELEFA SCAT URBAM - 📱 777301221 - 5150 produits"
6. Elle tapote la suggestion
7. → Redirection vers /catalogue?id=218
8. Elle voit la boutique avec tous les produits
9. Elle filtre par catégorie "LIVRE"
10. Elle trouve son produit, clique "Acheter"
11. → Ajouté au panier, FAB 🛒 montre (1)
```

### Parcours 2 : Exploration marketplace (Ibrahima)

```
1. Ibrahima arrive sur fayclick.com sur PC
2. Il voit la section "Découvrez nos marchands" sur la landing
3. Il clique "Explorer le marketplace →"
4. → Redirection vers /catalogues
5. Il scroll le carrousel des boutiques vedettes
6. Il voit "LIBRAIRIE CHEZ KELEFA" avec 5150 produits
7. Il clique "Voir →"
8. → Redirection vers /catalogue?id=218
9. Il explore les produits avec les filtres par catégorie
```

### Parcours 3 : Depuis la landing page (Modou le marchand)

```
1. Modou partage le lien fayclick.com à un client
2. Le client arrive sur la landing mobile
3. Il voit la section "Découvrez nos marchands"
4. Il clique "Explorer le marketplace →"
5. → Sur /catalogues, il tape le nom du marchand
6. Il sélectionne le bon résultat dans le dropdown
7. → Redirigé vers la boutique du marchand
```

---

## 10. Critères d'Acceptation

### 10.1. Page `/catalogues`

| # | Critère | Vérification |
|---|---------|--------------|
| AC-1 | La barre de recherche détecte automatiquement nom vs téléphone | Taper "77" → mode tél, taper "LIB" → mode nom |
| AC-2 | Les suggestions apparaissent en < 500ms | Mesurer avec DevTools |
| AC-3 | Clic sur suggestion → redirection vers boutique | URL = /catalogue?id=X |
| AC-4 | Les stats live reflètent les données réelles | Comparer avec la BD |
| AC-5 | Le carrousel boutiques affiche toutes les structures avec produits | Vérifier exhaustivité |
| AC-6 | La grille produits se charge en < 2s | Mesurer First Contentful Paint |
| AC-7 | Le filtre catégorie fonctionne correctement | Sélectionner → produits filtrés |
| AC-8 | "Charger plus" ajoute 24 produits | Compter les éléments DOM |
| AC-9 | Le FAB apparaît après 300px de scroll | Scroller et vérifier |
| AC-10 | Le header sticky reste visible au scroll | Scroller et vérifier |

### 10.2. Page `/catalogue?id=X`

| # | Critère | Vérification |
|---|---------|--------------|
| AC-11 | La bannière affiche le bon nom, tél et stats | Comparer avec BD |
| AC-12 | Les catégories filtrent correctement | Clic catégorie → produits filtrés |
| AC-13 | La recherche produit filtre en temps réel | Taper → résultats instantanés |
| AC-14 | "Acheter" ajoute au panier avec feedback visuel | Clic → badge panier +1 |
| AC-15 | Le bouton retour mène à /catalogues | Clic ← → URL correcte |
| AC-16 | Le panier fonctionne (ajout, modif quantité, paiement) | Test E2E complet |

### 10.3. Page `/`

| # | Critère | Vérification |
|---|---------|--------------|
| AC-17 | La section marketplace est visible sur mobile ET desktop | Tester les 2 |
| AC-18 | Le bouton "Explorer le marketplace" redirige vers /catalogues | Clic → URL correcte |
| AC-19 | Les stats affichées sont dynamiques (pas hardcodées) | Modifier BD → vérifier mise à jour |

### 10.4. Responsive & Performance

| # | Critère | Vérification |
|---|---------|--------------|
| AC-20 | Aucun overflow horizontal sur 360px | Tester sur device réel ou DevTools |
| AC-21 | Tous les textes lisibles sans zoom | Taille ≥ 14px sur mobile |
| AC-22 | Toutes les zones tactiles ≥ 44px | Inspecter avec DevTools |
| AC-23 | Lighthouse Performance Mobile ≥ 75 | Audit Lighthouse |
| AC-24 | Lighthouse Accessibility ≥ 90 | Audit Lighthouse |
| AC-25 | Temps de chargement initial < 3s en 4G | Mesurer avec throttling |

---

## 11. Plan de Livraison

### Phase 1 : Fondations (Semaine 1)
- [ ] Créer le service de recherche (`search.service.ts`)
- [ ] Créer la barre de recherche unifiée (`SearchBarUnified`)
- [ ] Créer les types TypeScript marketplace
- [ ] Tester la requête SQL de recherche par nom + téléphone

### Phase 2 : Page `/catalogues` (Semaines 2-3)
- [ ] Créer le hero section (`HeroMarketplace`)
- [ ] Créer le carrousel boutiques (`BoutiquesCarousel` + `CarteBoutique`)
- [ ] Refondre la grille produits avec nouveau design cartes
- [ ] Implémenter filtres (catégorie, tri) + "Charger plus"
- [ ] Créer le footer marketplace
- [ ] Ajouter le FAB scroll-top
- [ ] Intégrer la recherche dans le header sticky
- [ ] Tests responsive sur tous les breakpoints

### Phase 3 : Page `/catalogue?id=X` (Semaines 3-4)
- [ ] Créer le header boutique sticky
- [ ] Créer la bannière boutique
- [ ] Implémenter la navigation catégories (tabs)
- [ ] Harmoniser les cartes produit avec le marketplace
- [ ] Harmoniser le panier public
- [ ] Ajouter le FAB panier mobile
- [ ] Tests responsive

### Phase 4 : Landing page + Polish (Semaine 4-5)
- [ ] Créer la section marketplace pour MobileHome
- [ ] Créer la section marketplace pour DesktopHome
- [ ] Ajouter le lien navigation desktop
- [ ] Polish animations (Framer Motion)
- [ ] Tests cross-device finaux
- [ ] Optimisation performance (lazy loading, skeleton)
- [ ] Déploiement production

---

## 12. Risques & Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Performance dégradée avec beaucoup de produits (12k+) | Élevé | Moyenne | Pagination "Charger plus" + lazy loading images + cache 5min |
| Recherche par téléphone lente | Moyen | Faible | Index SQL sur champ telephone + LIMIT 5 |
| Incompatibilité écrans très petits (< 320px) | Faible | Faible | Min-width 320px, tests sur devices réels |
| Régression sur le panier existant | Élevé | Moyenne | Tests E2E panier avant/après refonte |
| API search_structures inexistante côté serveur | Bloquant | Certaine | Commencer par requête SQL directe via database.service |

---

## 13. Métriques de Succès Post-Lancement

| Métrique | Baseline actuelle | Objectif 3 mois |
|----------|-------------------|-----------------|
| Visites /catalogues par jour | À mesurer | +40% |
| Taux de rebond /catalogues | À mesurer | < 50% |
| Recherches par téléphone réussies | 0 (n'existe pas) | > 80% de succès |
| Redirections /catalogues → /catalogue?id=X | À mesurer | > 30% des visiteurs |
| Score Lighthouse Mobile | À mesurer | ≥ 75 Performance |
| Temps moyen sur /catalogues | À mesurer | > 2 min |

---

*Document rédigé par le Product Manager FayClick. En attente de validation pour démarrage de l'implémentation.*
