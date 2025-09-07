# 🎉 Format uniforme des modals de l'application

## ✅ Modèle à implémenter toujours

### 📱 Responsive Design Complet
- **Mobile (< 480px)** : max-w-xs, padding réduit, polices petites, QR 120px
- **Mobile Large (480-768px)** : max-w-sm, tailles intermédiaires, QR 150px  
- **Desktop (768px+)** : max-w-md, design original préservé, QR 200px

### 🔀 QR Code Repliable
- Fermé par défaut avec instruction "Appuyez pour afficher le QR code"
- Animation smooth expand/collapse avec Framer Motion
- Bouton toggle avec icône ChevronDown qui tourne
- Téléchargement disponible seulement quand ouvert

### 📏 Optimisations Spécifiques
- **Espacements adaptatifs** : p-3 mobile → p-6 desktop
- **Polices responsives** : text-sm mobile → text-xl desktop
- **Boutons optimisés** : Textes raccourcis sur mobile
- **Icônes adaptées** : w-4 h-4 mobile → w-5 h-5 desktop
- **Scroll interne** : max-h-[90vh] overflow-y-auto

### 🎨 Préservation du Design
- Glassmorphisme maintenu à tous les niveaux
- Animations optimisées (moins sur mobile)
- Couleurs et gradients identiques
- Accessibilité améliorée

---

## 💡 Exemple d'implémentation

Référez-vous à `components/panier/ModalFactureSuccess.tsx` pour un exemple complet d'implémentation de ces standards.

### Pattern de base pour les breakpoints

```typescript
const { isMobile, isMobileLarge, isDesktop } = useBreakpoint();

const getModalStyles = () => {
  if (isMobile) {
    return {
      container: 'max-w-xs p-3',
      title: 'text-sm',
      qrSize: 120
    };
  } else if (isMobileLarge) {
    return {
      container: 'max-w-sm p-4', 
      title: 'text-base',
      qrSize: 150
    };
  } else {
    return {
      container: 'max-w-md p-6',
      title: 'text-xl',
      qrSize: 200
    };
  }
};
```

### Pattern QR Code repliable

```typescript
const [isQrExpanded, setIsQrExpanded] = useState(false);

// Animation avec Framer Motion
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ 
    height: isQrExpanded ? 'auto' : 0,
    opacity: isQrExpanded ? 1 : 0
  }}
  transition={{ duration: 0.3 }}
>
  {/* Contenu QR Code */}
</motion.div>
```

## 🚀 Checklist d'implémentation

- [ ] Responsive design avec 3 breakpoints
- [ ] QR Code repliable par défaut
- [ ] Animations Framer Motion
- [ ] Glassmorphisme préservé
- [ ] Scroll interne si nécessaire
- [ ] Tests sur tous les breakpoints
- [ ] Accessibilité validée