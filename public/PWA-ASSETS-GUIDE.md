# Guide des Assets PWA - FayClick

Ce guide documente les assets PWA requis pour une expérience optimale sur tous les navigateurs.

## Structure des Dossiers

```
public/
├── fayclick.ico           # Favicon principal (16x16, 32x32, 48x48)
├── apple-touch-icon.png   # Icône iOS (180x180) ✅ Existe
├── icon-192.png           # Icône PWA standard (192x192) ✅ Existe
├── icon-512.png           # Icône PWA haute résolution (512x512) ✅ Existe
├── icon-192-maskable.png  # Icône maskable (192x192) ❌ À créer
├── icon-512-maskable.png  # Icône maskable (512x512) ❌ À créer
├── manifest.json          # Web App Manifest ✅ Configuré
├── service-worker.js      # Service Worker v2.7.0 ✅ Configuré
└── screenshots/           # Screenshots pour Rich Install UI ❌ À créer
    ├── dashboard-wide.png   # Screenshot desktop (1280x720)
    └── dashboard-mobile.png # Screenshot mobile (750x1334)
```

---

## 1. Icônes Maskable (Priorité Haute)

### Qu'est-ce qu'une icône maskable ?

Les icônes maskable sont des icônes avec une "zone de sécurité" qui permet aux systèmes d'exploitation de les adapter à différentes formes (cercle, carré arrondi, squircle, etc.).

### Spécifications

| Fichier | Dimensions | Zone de sécurité |
|---------|------------|------------------|
| `icon-192-maskable.png` | 192x192 px | Centre 80% (153x153 px) |
| `icon-512-maskable.png` | 512x512 px | Centre 80% (410x410 px) |

### Comment créer une icône maskable

1. **Zone de sécurité** : Le contenu important doit être dans un cercle centré de 80% du diamètre
2. **Fond coloré** : Utiliser un fond plein (pas transparent)
3. **Padding** : Laisser 10% de marge de chaque côté

```
┌────────────────────┐
│                    │  ← 10% marge
│   ┌────────────┐   │
│   │            │   │
│   │   LOGO     │   │  ← Zone sécurisée (80%)
│   │            │   │
│   └────────────┘   │
│                    │  ← 10% marge
└────────────────────┘
```

### Outils recommandés

- **Maskable.app** : https://maskable.app/editor
  - Upload votre icône actuelle
  - Vérifiez la zone de sécurité
  - Exportez en PNG

- **PWA Asset Generator** : https://www.pwabuilder.com/imageGenerator
  - Génère toutes les tailles automatiquement

### Template Figma/Sketch

```
Canvas: 512x512 px
Fond: #0ea5e9 (theme_color FayClick)
Logo: Centré, max 400x400 px
Export: PNG 24-bit
```

---

## 2. Screenshots pour Rich Install UI (Priorité Haute)

### Pourquoi les screenshots sont importants ?

Chrome Android affiche une "Rich Install UI" avec des screenshots lorsqu'ils sont disponibles dans le manifest. Cela augmente le taux d'installation.

### Spécifications

| Fichier | Dimensions | Form Factor | Description |
|---------|------------|-------------|-------------|
| `dashboard-wide.png` | 1280x720 px | `wide` | Vue desktop du dashboard |
| `dashboard-mobile.png` | 750x1334 px | `narrow` | Vue mobile du dashboard |

### Comment créer les screenshots

1. **Desktop (wide)** :
   - Ouvrir FayClick en mode desktop (1280px largeur minimum)
   - Naviguer vers le dashboard
   - Prendre une capture d'écran
   - Recadrer à exactement 1280x720 px

2. **Mobile (narrow)** :
   - Ouvrir Chrome DevTools (F12)
   - Activer le mode responsive
   - Sélectionner iPhone 6/7/8 Plus (414x736) ou similaire
   - Prendre une capture d'écran
   - Redimensionner à 750x1334 px

### Script de capture (DevTools)

```javascript
// Ouvrir la console Chrome DevTools et exécuter :
// Pour mobile
await (async () => {
  const canvas = await html2canvas(document.body);
  const link = document.createElement('a');
  link.download = 'dashboard-mobile.png';
  link.href = canvas.toDataURL();
  link.click();
})();
```

### Recommandations de contenu

Les screenshots doivent montrer :
- L'interface principale (dashboard)
- Des données réalistes (pas de Lorem ipsum)
- Les couleurs de marque FayClick (bleu/orange)
- Une interface "clean" sans notifications ou popups

---

## 3. Vérification de la Configuration

### Checklist avant déploiement

- [ ] `fayclick.ico` présent et fonctionnel
- [ ] `icon-192.png` et `icon-512.png` présents
- [ ] `icon-192-maskable.png` créé
- [ ] `icon-512-maskable.png` créé
- [ ] `apple-touch-icon.png` présent (180x180)
- [ ] Dossier `screenshots/` créé
- [ ] `screenshots/dashboard-wide.png` (1280x720)
- [ ] `screenshots/dashboard-mobile.png` (750x1334)

### Test avec Lighthouse

1. Ouvrir Chrome DevTools (F12)
2. Aller dans l'onglet "Lighthouse"
3. Sélectionner "Progressive Web App"
4. Lancer l'audit
5. Vérifier que tous les critères PWA sont verts

### Test du Manifest

```bash
# Vérifier le manifest avec curl
curl -I https://v2.fayclick.net/manifest.json

# Ou avec Chrome DevTools :
# Application > Manifest > Vérifier les icônes et screenshots
```

---

## 4. Mise à jour du Service Worker

Après avoir ajouté de nouveaux assets, mettre à jour la version du cache :

```javascript
// Dans public/service-worker.js
const CACHE_NAME = 'fayclick-v2-cache-v2.7-YYYYMMDD';
```

---

## Contact

Pour toute question sur les assets PWA, contacter l'équipe technique FayClick.
