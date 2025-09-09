# Page d'Accueil Responsive FayClick

## 📱 Description

La page d'accueil de FayClick utilise un système de routing dynamique pour afficher automatiquement la version appropriée selon l'appareil :

- **Mobile/Tablette** (< 1024px) : Interface tactile optimisée avec animations fluides (sans status bar)
- **Desktop** (≥ 1024px) : Interface professionnelle avec carrousel d'images

## 🚀 Installation

1. **Installer les dépendances** :
```bash
npm install framer-motion
```

## 🖼️ Images du Carrousel

Pour la version desktop, ajoutez vos images dans le dossier `/public/images/` :

- `accueil1.png`
- `accueil2.png`
- `accueil3.png`
- `accueil4.png`

Les images doivent idéalement être :
- Format : PNG ou JPG
- Dimensions recommandées : 1200x600px
- Poids optimisé : < 200KB par image

## 🎨 Personnalisation

### Modifier les couleurs

Les couleurs principales sont définies dans les composants :
- Gradient principal : vert 
- Couleur principale : Vert (`bg-green-500 
- Couleur accent : Orange (`from-orange-500 to-orange-600`)

### Modifier les animations

Les particules et animations utilisent Framer Motion. Vous pouvez ajuster :
- Nombre de particules : Variable `particleCount`
- Vitesse d'animation : Propriété `duration` dans les transitions
- Délais : Propriété `delay` dans les animations

## 📂 Structure

```
components/home/
├── MobileHome.tsx    # Version mobile/tablette
└── DesktopHome.tsx   # Version desktop avec carrousel

hooks/
└── useMediaQuery.ts  # Hook de détection responsive

app/
└── page.tsx         # Page principale avec routing dynamique
```

## 🔧 Développement

Pour tester les différentes versions :
- **Mobile** : Utilisez les DevTools de Chrome (F12) et activez le mode responsive
- **Desktop** : Visualisez en plein écran sur un écran ≥ 1024px

## 📝 Notes

- Les animations sont désactivées côté serveur (SSR) pour éviter les problèmes d'hydratation
- Le carrousel passe automatiquement à la slide suivante toutes les 5 secondes
- Tous les boutons sont optimisés pour le tactile avec des zones de 44px minimum
