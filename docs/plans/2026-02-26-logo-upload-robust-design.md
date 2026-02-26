# PRD : Upload Logo Robuste avec Crop & Redimensionnement

**Date** : 2026-02-26
**Branche** : `fix/logo-upload-robust`
**Statut** : Validé

---

## 1. Contexte & Problème

### 1.1 Bug actuel
L'upload de logo lors de l'inscription sur `fayclick.com` échoue avec l'erreur :
```
❌ [LOGO-SIMPLE] Erreur API Route: Dossier temporaire manquant
```
**Cause** : Le fichier `upload-logo.php` est présent sur `fayclick.com` mais la configuration PHP du serveur ne définit pas de répertoire temporaire valide (`UPLOAD_ERR_NO_TMP_DIR`, code 5).

### 1.2 Fonctionnalité manquante
L'upload de logo (inscription + settings) ne propose aucun outil de recadrage/redimensionnement, contrairement à l'upload de photos produits qui dispose du modal `PhotoResizer`. L'utilisateur ne peut pas ajuster son image avant upload, ce qui entraîne des logos mal cadrés ou trop volumineux.

---

## 2. Objectifs

1. **Corriger le bug** : Faire fonctionner l'upload logo sur `fayclick.com` (fix PHP dossier temp)
2. **Ajouter le crop** : Permettre le recadrage carré ou rond du logo avant upload
3. **Unifier l'expérience** : Réutiliser et étendre le composant `PhotoResizer` existant
4. **Support caméra** : Permettre la prise de photo directe + ajustement

---

## 3. Approche technique retenue

**Approche A** : Étendre le `PhotoResizer` existant avec un mode `logo` qui ajoute le crop.

- **Librairie** : `react-easy-crop` (8KB gzip, pinch-to-zoom mobile, crop carré/rond)
- **Un seul composant** pour logo et photo, différencié par prop `mode`
- **Rétro-compatible** : le mode `photo` reste inchangé

---

## 4. Spécifications fonctionnelles

### 4.1 Fix PHP - upload-logo.php

- Ajouter un fallback dossier temporaire en haut du fichier :
  ```php
  if (!ini_get('upload_tmp_dir')) {
      $tmpDir = __DIR__ . '/tmp';
      if (!is_dir($tmpDir)) mkdir($tmpDir, 0755, true);
      ini_set('upload_tmp_dir', $tmpDir);
  }
  ```
- Ajouter `fayclick.com` dans les headers CORS autorisés
- Rendre l'URL de retour dynamique (basée sur le domaine appelant)

### 4.2 PhotoResizer - Mode Logo (crop + resize)

**Flux UX en 2 étapes** :

```
Étape 1 - CROP
┌─────────────────────────────────────┐
│  [Image avec zone de crop]          │
│  ┌───────────────────────┐          │
│  │                       │          │
│  │   Zone de crop        │          │
│  │   (drag + pinch)      │          │
│  │                       │          │
│  └───────────────────────┘          │
│                                     │
│  Forme:  [☐ Carré]  [○ Rond]       │
│  Zoom:   ────●──────── 1.5x        │
│                                     │
│  [Annuler]              [Suivant →] │
└─────────────────────────────────────┘

Étape 2 - RESIZE + QUALITÉ (existant)
┌─────────────────────────────────────┐
│  [Preview image croppée]            │
│                                     │
│  Taille: ────●──────── 80%          │
│  640 × 640 px                       │
│                                     │
│  Qualité: [Basse] [Moy] [●Haute]   │
│                                     │
│  ~85 KB ✅ Parfait pour le web!     │
│                                     │
│  [← Retour]            [Valider ✓]  │
└─────────────────────────────────────┘
```

**Props ajoutées au PhotoResizer** :
```typescript
interface PhotoResizerProps {
  // ... props existantes
  mode?: 'photo' | 'logo';       // défaut: 'photo'
  cropShape?: 'rect' | 'round';  // forme initiale du crop
}
```

**Comportement par mode** :
| Fonctionnalité | mode='photo' | mode='logo' |
|---------------|-------------|-------------|
| Crop | Non | Oui (étape 1) |
| Forme crop | - | Carré / Rond (toggle) |
| Zoom crop | - | 1x → 3x |
| Slider taille | Oui | Oui (étape 2) |
| Boutons qualité | Oui | Oui (étape 2) |
| Taille max recommandée | 5MB | 200KB |

### 4.3 LogoUpload.tsx - Ouverture systématique du modal

**Avant** : PhotoResizer ouvert uniquement pour `uploadType === 'photo'`
**Après** : PhotoResizer ouvert pour TOUS les types d'upload

```typescript
// Toujours ouvrir le modal
setPendingFile(file);
setShowPhotoResizer(true);
```

Passer le mode au composant :
```typescript
<PhotoResizer
  mode={uploadType === 'photo' ? 'photo' : 'logo'}
  // ... autres props
/>
```

### 4.4 Support caméra

Ajouter dans `LogoUpload.tsx` un bouton "Prendre une photo" :
```html
<input type="file" accept="image/*" capture="environment" />
```
- **Mobile** : Ouvre la caméra directement
- **Desktop** : Bouton masqué (seul "Choisir un fichier" visible)
- L'image capturée passe dans le même modal crop+resize

### 4.5 Hook usePhotoResize - Nouvelle fonction cropImage

```typescript
async function cropImage(
  file: File,
  cropArea: { x: number; y: number; width: number; height: number },
  shape: 'rect' | 'round'
): Promise<File>
```

- Utilise Canvas HTML5 pour découper la zone
- Si `shape === 'round'` : applique un masque circulaire (clip arc)
- Retourne un nouveau File prêt pour l'étape resize

---

## 5. Fichiers impactés

| Fichier | Action | Description |
|---------|--------|-------------|
| `public/upload-logo.php` | Modifier | Fix dossier temp + CORS + URL dynamique |
| `components/ui/PhotoResizer.tsx` | Modifier | Ajout mode crop 2 étapes + toggle forme |
| `hooks/usePhotoResize.ts` | Modifier | Ajout `cropImage()` |
| `components/ui/LogoUpload.tsx` | Modifier | Ouvrir modal pour tous types + bouton caméra |
| `types/photo-resize.types.ts` | Modifier | Ajout types CropArea, CropShape, mode |
| `package.json` | Modifier | Ajout `react-easy-crop` |

**Pages consommatrices (pas de modification directe)** :
- `app/register/page.tsx` — bénéficie automatiquement du modal via LogoUpload
- `app/settings/page.tsx` — idem

---

## 6. Critères d'acceptation

- [ ] Upload logo fonctionne sur `fayclick.com` sans erreur "Dossier temporaire manquant"
- [ ] Modal crop s'ouvre quand on sélectionne un logo (inscription + settings)
- [ ] Toggle carré/rond fonctionne avec preview temps réel
- [ ] Pinch-to-zoom fonctionne sur mobile
- [ ] Étape 2 (resize + qualité) affiche la taille estimée
- [ ] Upload photos produits inchangé (rétro-compatibilité mode photo)
- [ ] Prise de photo caméra fonctionne sur mobile
- [ ] Logo uploadé < 200KB après optimisation
- [ ] CORS fonctionne depuis `fayclick.com` et `v2.fayclick.net`

---

## 7. Hors scope

- Upload logo dans la page `/structure/gestion` (futur)
- Filtres image (luminosité, contraste, etc.)
- Upload batch (plusieurs logos)
- Thumbnails multiples tailles
- Migration des credentials FTP vers variables d'environnement (sécurité — ticket séparé)

---

## 8. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| `react-easy-crop` incompatible React 19 | Bloquant | Vérifier compatibilité avant install, fallback sur implémentation Canvas pure |
| Performance crop sur vieux mobiles | UX dégradée | Limiter la résolution d'entrée à 2000px avant crop |
| Régression photos produits | Fonctionnel | Tests manuels mode photo après modification |
| PHP `ini_set` interdit sur fayclick.com | Bloquant fix | Alternative : créer manuellement `/tmp` et configurer via `.htaccess` |
