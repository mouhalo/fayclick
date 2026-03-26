# Landing Page Desktop — FayClick Commerce

**Date** : 2026-03-26
**Cible** : Marchands informels du Sénégal (Commerce uniquement)
**Scope** : Desktop uniquement (la page mobile existante reste inchangée)
**URL** : fayclick.com

---

## Vue d'ensemble

Nouvelle landing page desktop pour FayClick, ciblant exclusivement les marchands informels. Design Dark Premium identique au thème de `/catalogues` (slate-900/emerald-900/teal-900, glassmorphism, accents emerald). Approche hybride : Hero cinématique 100vh + scroll fluide avec navbar sticky glassmorphism.

**5 sections** : Accueil (Hero), Cibles, Fonctionnalités, Téléchargements, Support
**+ Footer** et **FloatingWhatsAppButton** (composant existant réutilisé)

---

## Thème visuel

### Palette couleurs (identique /catalogues)
- **Fond principal** : `from-slate-900 via-emerald-900 to-teal-900` avec overlays radial gradient animés
- **Cartes** : `bg-white/[0.03]` + `backdrop-blur-xl` + `border-white/[0.06]`
- **Texte primaire** : `white`
- **Texte secondaire** : `white/60`, `white/40`
- **Accent principal** : Emerald (`#10b981`, `#34d399`, `#6ee7b7`)
- **Accent secondaire** : Orange (`#f59e0b`) pour paiements, Violet (`#8b5cf6`) pour abonnements
- **CTA** : `bg-emerald-500` → hover `bg-emerald-400`, shadow `emerald-500/25`
- **Footer** : `#070d18` (plus sombre)

### Typographie
- **Headings landing** : Clash Display (via Fontshare, Google Fonts fallback) — géométrique, bold, moderne
- **Body text** : Inter (existant)
- **Hiérarchie** : H1 44px/800, H2 36px/800, H3 16-18px/700, body 13-16px/400

### Navbar
- **Liens** : Underline slide-in au hover + léger scale
- **Lien actif** : Pulse emerald subtil (glow animé)
- **Apparition** : Transparente sur le Hero, sticky glassmorphism (`bg-slate-900/95 backdrop-blur-xl`) après scroll passé le Hero

---

## Section 1 — Hero Cinématique (100vh)

### Layout
- **Hauteur** : 100vh (plein écran)
- **2 colonnes** : Texte + CTA (gauche, max-width 550px) | Phone mockup dashboard (droite, 350x380px)

### Contenu gauche
- **Badge** : `🇸🇳 La Super App des Marchands du Sénégal` — pill emerald
- **Titre H1** : "Gérez votre commerce" (white) + "depuis votre téléphone" (gradient emerald→teal)
- **Sous-titre** : "Stocks, ventes, clients, paiements mobile money — tout dans une seule app. Gratuit pour commencer, sans téléchargement obligatoire."
- **CTA primaire** : "Commencer gratuitement →" — bouton emerald rounded-full, shadow glow
- **CTA secondaire** : "Voir la démo" — bouton outline avec icône play ronde
- **Stats** : 3 compteurs — "500+ Marchands actifs" | "24/7 Support WhatsApp" | "100% Gratuit au départ" — séparés par dividers verticaux

### Contenu droite
- **Phone mockup** : Cadre smartphone (220x380px, rounded-32, border white/10) avec écran simulant le dashboard FayClick (logo FC, "Ventes du jour: 125 000 F", cards Clients/Produits)
- **Glow** : Radial gradient emerald derrière le phone

### Éléments de fond
- **Particules** : 15-20 points lumineux emerald/teal, tailles 3-8px, animation float en boucle (8-15s)
- **Radial glow** : Ellipse emerald à 30% 50%, opacity 0.15
- **Scroll indicator** : Capsule avec dot animé bounce en bas centre

### Animations d'entrée
| Élément | Animation | Durée | Delay |
|---------|-----------|-------|-------|
| Logo FC (navbar) | Scale-in spring (bounce 0.4) | 400ms | 0ms |
| Badge 🇸🇳 | Fade-in + slide-down | 300ms | 200ms |
| Titre H1 | Reveal mot par mot, stagger | 80ms/mot | 300ms |
| Sous-titre | Fade-in | 400ms | 500ms |
| CTA primaire | Scale-in + glow pulse continu après | 300ms | 700ms |
| CTA secondaire | Fade-in | 300ms | 800ms |
| Phone mockup | Slide-up + float lent continu | 600ms | 400ms |
| Stats compteurs | Counter 0→valeur (ease-out) | 1500ms | 900ms |
| Scroll indicator | Bounce infini | 2s loop | 1200ms |

---

## Section 2 — Cibles

### Layout
- **Header** : Badge "À qui s'adresse FayClick ?" + titre "Pensé pour les marchands du Sénégal" + sous-titre
- **Grille 2x2** : 4 cartes glassmorphism Problème → Solution
- **Bandeau bas** : Pill listant les profils cibles avec dots emerald

### 4 cartes Problème → Solution

| # | Icône | Problème | Solution FayClick |
|---|-------|----------|-------------------|
| 1 | 📒 | "Je note tout dans un cahier" — Ventes perdues, stocks imprécis | Dashboard intelligent — tout automatique en temps réel |
| 2 | 💸 | "Les clients paient quand ils veulent" — Crédits non suivis | Suivi des impayés + relance SMS en un clic |
| 3 | 🏪 | "Je ne sais pas ce qui me reste en stock" — Ruptures imprévues | Gestion de stock en temps réel + alertes de rupture |
| 4 | 🌙 | "Je vends en ligne même quand je ferme" — Boutique fermée = 0 vente | Catalogue & Marketplace — FayClick expose vos produits 24/7 |

### Structure d'une carte
```
┌─────────────────────────────┐
│ ── ligne gradient emerald ──│ (2px top)
│ [Icône] (56x56, bg-red/10)  │
│ LE PROBLÈME (red label)     │
│ "Citation marchand" (h3)    │
│ Description problème        │
│         ↓ (pulse)           │
│ ┌─ bg emerald/8 ──────────┐│
│ │ LA SOLUTION FAYCLICK     ││
│ │ Titre solution (bold)    ││
│ │ Description solution     ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

### Bandeau bas profils
- Pill glassmorphism avec 4 items : Boutiquiers | Commerçants de marché | Vendeurs ambulants | Grossistes
- Chaque item précédé d'un dot emerald

### Animations au scroll
- Badge + titre : fade-in + slide-up (stagger 100ms)
- 4 cartes : stagger slide-up 150ms entre chaque
- Flèche ↓ : pulse 1 fois quand carte entre en viewport
- Bloc solution (vert) : fade-in 300ms delay après carte parente
- Hover carte : border emerald-500/30, lift -translate-y-1, glow subtil
- Bandeau : fade-in, dots pulse séquentiellement

---

## Section 3 — Fonctionnalités

### Layout
- **Header** : Badge "Tout-en-un" + titre "Tout ce dont votre commerce a besoin"
- **Grille 3x3** : 9 feature cards glassmorphism
- **CTA** : "Découvrir toutes les fonctionnalités →"
- **Fond** : Motif de points subtil (`radial-gradient` dot pattern 40x40px) pour différencier la section

### 9 Features

| # | Icône | Couleur accent | Titre | Description |
|---|-------|---------------|-------|-------------|
| 1 | ⚡ | Emerald | Vente Flash | Encaissez en 3 secondes. Client anonyme, CASH, reçu auto |
| 2 | 📱 | Orange | Wave, OM & Free Money | Paiements mobile money par QR code |
| 3 | 📦 | Bleu | Gestion des Stocks | Stock temps réel, inventaire, alertes rupture |
| 4 | 👥 | Violet | Fichier Clients | Historique achats, crédits, relance SMS |
| 5 | 📊 | Teal | Tableau de Bord | CA du jour, top produits/clients, graphiques |
| 6 | 🧾 | Rose | Factures & Reçus | Multi-format, impression, partage WhatsApp |
| 7 | 🛍️ | Jaune | Catalogue & Marketplace | Vente en ligne 24/7 |
| 8 | 🔐 | Emerald | Coffre-Fort KALPE | Soldes wallet centralisés, retraits |
| 9 | 📷 | Indigo | Scan Code-Barres | Caméra téléphone, ajout panier instantané |

### Structure d'une feature card
```
┌──────────────────────┐
│ [Icône] (48x48)      │  bg gradient couleur/20→couleur/05
│                      │  border couleur/20, rounded-14
│ Titre (16px bold)    │
│ Description (13px)   │  color white/40
└──────────────────────┘
bg: white/[0.03] backdrop-blur-16 border-white/[0.06] rounded-18
Hover: border-couleur/30, scale 1.02, shadow glow couleur
Icône: bounce léger au hover
```

### Animations au scroll
- Grille de points : fade-in avec la section
- Titre : fade-in + slide-up
- 9 cartes : stagger 3 par rangée, 100ms entre chaque
- CTA : fade-in après les cartes, pulse glow continu

---

## Section 4 — Téléchargements (PWA)

### Message clé
FayClick est une PWA. **Aucun téléchargement obligatoire** — on peut travailler depuis n'importe quel navigateur. L'installation sur l'écran d'accueil est **optionnelle** pour une expérience native.

### Layout
- **Header** : Badge "Aucun store requis" + titre "Utilisez FayClick de n'importe où"
- **2 colonnes** glassmorphism : Avantages (gauche) | Guide installation (droite)
- **Bandeau bas** : Message "Vous pouvez commencer à utiliser FayClick maintenant — sans rien installer"

### Colonne gauche — Pourquoi c'est mieux
Icône 🌐 + titre "Pourquoi c'est mieux"
4 avantages avec checkmark emerald :
1. **Pas de téléchargement** — Pas besoin de Play Store ni App Store. Ouvrez fayclick.com et travaillez.
2. **Toujours à jour** — Mises à jour automatiques. Pas de version obsolète.
3. **Zéro espace disque** — Idéal pour appareils avec peu de mémoire.
4. **Multi-appareil** — Téléphone, tablette, ordinateur — un seul compte, données synchronisées.

### Colonne droite — Installer sur votre écran (optionnel)
Icône 📲 + titre "Installer sur votre écran" + label "Optionnel — pour une expérience native"

3 guides navigateur (cartes internes) :
1. **Google Chrome** (badge "Recommandé") : fayclick.com → Menu ⋮ → "Ajouter à l'écran d'accueil" → Confirmer
2. **Safari (iPhone)** : fayclick.com → Bouton partage ⬆ → "Sur l'écran d'accueil" → Confirmer
3. **Samsung Internet** : fayclick.com → Menu ≡ → "Ajouter à l'écran d'accueil" → Confirmer

### Animations au scroll
- Titre + sous-titre : fade-in + slide-up
- Colonne gauche : slide-in depuis la gauche (300ms)
- Colonne droite : slide-in depuis la droite (300ms, delay 150ms)
- Checkmarks ✓ : stagger 100ms, scale-in spring
- Guides navigateur : stagger 150ms entre Chrome/Safari/Samsung
- Bandeau 💡 : fade-in final, icône pulse léger

---

## Section 5 — Support

### Layout
- **Header** : Badge "Jamais seul" + titre "Apprenez à votre rythme"
- **Grille 3x3** : 9 cartes vidéo avec thumbnail et bouton play
- **Bandeau WhatsApp H24** : CTA vert WhatsApp

### 9 Vidéos tutorielles

| # | Badge | Couleur | Titre | Sous-titre | Fichier |
|---|-------|---------|-------|------------|---------|
| 01 | Emerald | Emerald | Créer un compte gratuitement | Inscription en 2 minutes | /videos/1.mp4 |
| 02 | Emerald | Emerald | Démarrer avec FayClick | Premier pas dans l'application | /videos/2.mp4 |
| 03 | Emerald | Emerald | Ajouter vos produits et stocks | Catalogue et inventaire | /videos/3.mp4 |
| 04 | Emerald | Emerald | Effectuer une Vente | Panier et encaissement | /videos/4.mp4 |
| 05 | Emerald | Emerald | Fidéliser vos clients | Fichier clients et historique | /videos/5.mp4 |
| 06 | Orange | Orange | Accepter des Paiements Wave/OM/Free | Mobile money intégré | /videos/6.mp4 |
| 07 | Emerald | Emerald | Suivre vos clients et les impayés | Crédits et relances SMS | /videos/7.mp4 |
| 08 | Emerald | Emerald | Voir Stats et Inventaires | Dashboard et rapports | /videos/8.mp4 |
| 09 | Violet | Violet | Renouveler son abonnement | Gestion de l'abonnement | /videos/9.mp4 |

### Structure d'une carte vidéo
```
┌──────────────────────────┐
│ [Badge 01]               │
│                          │  aspect-ratio 16/9
│        [ ▶ ]             │  bg dark + radial glow
│                          │
├──────────────────────────┤
│ Titre vidéo (14px bold)  │  padding 14px 16px
│ Sous-titre (11px white/35)│
└──────────────────────────┘
Clic → Modal lightbox avec player vidéo
Hover → Border emerald-500/30, play button scale 1.15 + glow
```

### Bandeau WhatsApp H24
- **Fond** : Gradient `rgba(37,211,102,0.08)` → `rgba(37,211,102,0.02)`, border `rgba(37,211,102,0.2)`
- **Gauche** : Icône WhatsApp (60x60, gradient vert, shadow) + "Besoin d'aide ? On est là." + "Support WhatsApp disponible 24h/24, 7j/7. Réponse en moins de 5 minutes."
- **Droite** : Bouton "📲 Écrire sur WhatsApp" — gradient vert, rounded-full, shadow
- Le bouton ouvre le lien WhatsApp (même numéro que FloatingWhatsAppButton existant)

### Animations au scroll
- Titre : fade-in + slide-up
- 9 cartes vidéo : stagger 3 par rangée, 100ms entre chaque
- Boutons play : scale-in spring avec delay après carte
- Bandeau WhatsApp : slide-up final, icône pulse continu

---

## Footer

### Layout
- **Fond** : `#070d18` (plus sombre que les sections)
- **Séparation haut** : Ligne gradient `transparent → emerald/30 → transparent`
- **4 colonnes** (grid 1.5fr 1fr 1fr 1.2fr)

### Colonnes

| Colonne | Contenu |
|---------|---------|
| **Marque** | Logo FC + "FayClick" + description + icônes réseaux sociaux (Facebook, Instagram, X, WhatsApp) |
| **Navigation** | Accueil, Fonctionnalités, Télécharger, Tutoriels, Marketplace |
| **Légal** | Conditions d'utilisation, Politique de confidentialité, Mentions légales |
| **Contact** | 📍 Dakar, Sénégal / 📧 contact@fayclick.com / 💬 WhatsApp 24/7 |

### Bottom bar
- Gauche : "© 2026 FayClick — Une solution **ICELABSOFT SARL**"
- Droite : "Fait avec 💚 au Sénégal"

### Animations
- Simple fade-in au scroll
- Hover liens : color → white + underline slide-in

---

## Composants réutilisés

| Composant existant | Usage |
|-------------------|-------|
| `FloatingWhatsAppButton` | Bouton flottant WhatsApp (déjà présent) |
| `LogoFayclick` | Logo SVG dans navbar et footer |

---

## Composants à créer

| Composant | Description |
|-----------|-------------|
| `DesktopLandingPage` | Composant principal orchestrateur de toutes les sections |
| `LandingNavbar` | Navbar sticky glassmorphism avec liens d'ancrage animés + lien actif pulse |
| `LandingHero` | Section Hero 100vh avec particules, texte reveal, phone mockup, stats counter |
| `LandingCibles` | Section 4 cartes Problème→Solution en grille 2x2 |
| `LandingFonctionnalites` | Grille 3x3 de 9 feature cards |
| `LandingTelechargements` | 2 colonnes avantages PWA + guide installation par navigateur |
| `LandingSupport` | Grille 3x3 vidéos + bandeau WhatsApp H24 |
| `LandingFooter` | Footer 4 colonnes |
| `VideoLightbox` | Modal lightbox pour lecture vidéo (player HTML5) |

---

## Fichiers vidéo

Emplacement : `public/videos/1.mp4` à `public/videos/9.mp4`
Format attendu : MP4, résolution adaptée web (720p recommandé)

---

## Navigation & Scroll

- **Navbar** : Transparente sur le Hero. Devient sticky glassmorphism (`bg-slate-900/95 backdrop-blur-xl border-b border-white/10`) dès que l'utilisateur scrolle passé le Hero.
- **Liens d'ancrage** : Accueil (#hero), Cibles (#cibles), Fonctionnalités (#fonctionnalites), Télécharger (#telechargements), Support (#support)
- **Scroll smooth** : `scroll-behavior: smooth` sur le container
- **Active link tracking** : IntersectionObserver sur chaque section pour mettre à jour le lien actif dans la navbar

---

## Intégration dans le routing existant

- La page mobile existante (`MobileHome.tsx`) reste **inchangée**
- Le composant `DesktopHome.tsx` existant sera **remplacé** par `DesktopLandingPage`
- La détection desktop/mobile dans `app/page.tsx` via `useBreakpoint()` reste en place
- Breakpoint : `lg` (1024px+) → `DesktopLandingPage`, sinon → `MobileHome`

---

## Performance

- **Font** : Clash Display chargée via `next/font` ou Fontshare CDN avec `display: swap`
- **Vidéos** : Lazy load (pas de preload), lecture uniquement dans le modal lightbox
- **Particules** : Limiter à 15-20 éléments avec `will-change: transform` pour GPU acceleration
- **Images** : Phone mockup construit en CSS/HTML (pas d'image), logo SVG existant
- **Animations** : Framer Motion avec `whileInView` + `viewport={{ once: true }}` pour éviter les re-triggers
