# Upload Logo Robuste - Plan d'Implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corriger le bug "Dossier temporaire manquant" sur fayclick.com et ajouter un modal de crop + redimensionnement pour les logos, en étendant le PhotoResizer existant.

**Architecture:** Étendre le composant `PhotoResizer.tsx` avec un mode `logo` qui ajoute une étape de crop (via `react-easy-crop`) avant l'étape de resize existante. Modifier `LogoUpload.tsx` pour ouvrir systématiquement le modal quel que soit le type d'upload. Corriger `upload-logo.php` pour gérer le dossier temp manquant et supporter `fayclick.com`.

**Tech Stack:** React 18.3.1, Next.js 14, TypeScript, react-easy-crop, Canvas HTML5, Tailwind CSS, Framer Motion

**Design doc:** `docs/plans/2026-02-26-logo-upload-robust-design.md`

---

## Task 1 : Fix PHP - Dossier temporaire + CORS + URL dynamique

**Files:**
- Modify: `public/upload-logo.php:1-17` (ajout fallback tmp)
- Modify: `public/upload-logo.php:234` (URL dynamique)

**Step 1: Ajouter le fallback dossier temporaire**

En haut du fichier `upload-logo.php`, juste après la ligne 14 (`ob_start();`), ajouter :

```php
// Fallback dossier temporaire si non configuré par le serveur
$tmpDir = sys_get_temp_dir();
if (empty($tmpDir) || !is_writable($tmpDir)) {
    $tmpDir = __DIR__ . '/tmp';
    if (!is_dir($tmpDir)) {
        @mkdir($tmpDir, 0755, true);
    }
    if (is_dir($tmpDir) && is_writable($tmpDir)) {
        ini_set('upload_tmp_dir', $tmpDir);
    }
}
```

**Step 2: Rendre l'URL de retour dynamique**

Remplacer la ligne 234 :
```php
// AVANT
$fileUrl = "https://fayclick.net/uploads/" . $filename;

// APRÈS - URL dynamique basée sur le domaine appelant
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'fayclick.net';
// Toujours utiliser fayclick.net pour les uploads (FTP pointe vers ce domaine)
$fileUrl = "https://fayclick.net/uploads/" . $filename;
```

Note : L'URL reste `fayclick.net/uploads/` car le FTP stocke sur ce domaine. Mais on ajoute un log du domaine appelant pour le debug.

Ajouter après la ligne 234 :
```php
$callerOrigin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? 'unknown';
logMessage("Appelé depuis: $callerOrigin");
```

**Step 3: Vérifier que les CORS sont bien permissifs**

La ligne 17 est déjà `header('Access-Control-Allow-Origin: *');` — c'est OK pour `fayclick.com`.

**Step 4: Commit**

```bash
git add public/upload-logo.php
git commit -m "fix: fallback dossier temporaire PHP + log domaine appelant"
```

---

## Task 2 : Installer react-easy-crop

**Files:**
- Modify: `package.json`

**Step 1: Installer la dépendance**

```bash
npm install react-easy-crop
```

**Step 2: Vérifier l'installation**

```bash
npm ls react-easy-crop
```

Expected: `react-easy-crop@x.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: ajout react-easy-crop pour crop logo"
```

---

## Task 3 : Étendre les types pour le crop

**Files:**
- Modify: `types/photo-resize.types.ts`

**Step 1: Ajouter les types crop à la fin du fichier**

Après la dernière ligne (76), ajouter :

```typescript
// === Types pour le mode Crop (Logo) ===

// Zone de crop retournée par react-easy-crop
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Point de crop (position)
export interface CropPoint {
  x: number;
  y: number;
}

// Forme du crop
export type CropShape = 'rect' | 'round';

// Mode du PhotoResizer
export type ResizerMode = 'photo' | 'logo';

// Props étendues du PhotoResizer avec crop
export interface PhotoResizerPropsExtended extends PhotoResizerProps {
  mode?: ResizerMode;           // 'photo' = resize seul, 'logo' = crop + resize
  initialCropShape?: CropShape; // Forme initiale du crop (défaut 'rect')
}

// Seuils de taille spécifiques au logo
export const LOGO_SIZE_THRESHOLDS = {
  PERFECT: 200 * 1024,    // 200 KB - Vert
  WARNING: 400 * 1024,    // 400 KB - Orange
  ERROR: 500 * 1024       // 500 KB - Rouge
} as const;
```

**Step 2: Mettre à jour l'interface PhotoResizerProps pour inclure mode**

Remplacer l'interface `PhotoResizerProps` existante (lignes 46-56) par :

```typescript
// Props du composant PhotoResizer
export interface PhotoResizerProps {
  file: File;
  onCancel: () => void;
  onValidate: (optimizedFile: File) => void;

  // Options optionnelles
  maxSizeMB?: number;              // Taille max recommandée (défaut 5MB)
  defaultScale?: number;           // Scale par défaut (défaut 0.8 = 80%)
  defaultQuality?: QualityLevel;   // Qualité par défaut (défaut 'medium')
  previewSize?: number;            // Taille preview canvas (défaut 400px)
  mode?: ResizerMode;              // 'photo' = resize seul, 'logo' = crop + resize
  initialCropShape?: CropShape;    // Forme initiale crop logo (défaut 'rect')
}
```

**Step 3: Commit**

```bash
git add types/photo-resize.types.ts
git commit -m "feat: types crop logo (CropArea, CropShape, ResizerMode)"
```

---

## Task 4 : Ajouter cropImage() au hook usePhotoResize

**Files:**
- Modify: `hooks/usePhotoResize.ts`

**Step 1: Ajouter l'import CropArea**

Modifier l'import (ligne 8-12) :

```typescript
import {
  ResizeOptions,
  ResizePreview,
  ResizeResult,
  ImageDimensions,
  CropArea
} from '@/types/photo-resize.types';
```

**Step 2: Ajouter la fonction cropImage avant le return (ligne 238)**

Insérer avant `return {` (ligne 240) :

```typescript
  /**
   * Recadrer une image selon une zone de crop
   * Utilise Canvas HTML5 pour découper la zone sélectionnée
   */
  const cropImage = useCallback(
    async (
      file: File,
      cropArea: CropArea,
      shape: 'rect' | 'round' = 'rect'
    ): Promise<File> => {
      const img = await loadImage(file);

      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Impossible de créer le contexte canvas');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Si forme ronde, appliquer un masque circulaire
      if (shape === 'round') {
        ctx.beginPath();
        ctx.arc(
          cropArea.width / 2,
          cropArea.height / 2,
          Math.min(cropArea.width, cropArea.height) / 2,
          0,
          2 * Math.PI
        );
        ctx.closePath();
        ctx.clip();
      }

      // Dessiner la zone croppée
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );

      // Convertir en File
      return new Promise<File>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erreur lors du crop'));
              return;
            }
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const croppedFile = new File(
              [blob],
              `${originalName}-cropped.jpg`,
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            resolve(croppedFile);
          },
          'image/jpeg',
          0.95 // Haute qualité pour le crop intermédiaire
        );
      });
    },
    [loadImage]
  );
```

**Step 3: Ajouter cropImage au return**

Modifier le return (ligne 240-248) :

```typescript
  return {
    processing,
    loadImage,
    loadImagePreview,
    calculateNewDimensions,
    estimateFileSize,
    generatePreview,
    resizeImage,
    cropImage
  };
```

**Step 4: Commit**

```bash
git add hooks/usePhotoResize.ts
git commit -m "feat: ajout cropImage() au hook usePhotoResize"
```

---

## Task 5 : Étendre PhotoResizer avec le mode crop

**Files:**
- Modify: `components/ui/PhotoResizer.tsx`

C'est la tâche la plus conséquente. Le composant doit gérer 2 étapes en mode `logo` :
- Étape 1 : Crop (react-easy-crop)
- Étape 2 : Resize + Qualité (existant)

**Step 1: Mettre à jour les imports**

Remplacer les imports (lignes 1-20) :

```typescript
/**
 * Composant PhotoResizer - Modal de redimensionnement de photos
 * Mode photo : Slider taille + Boutons qualité + Preview temps réel
 * Mode logo : Étape Crop (react-easy-crop) + Étape Resize
 * Design glassmorphism thème FayClick (vert/orange)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, AlertCircle, Info, ImageIcon, Crop, ChevronRight, ChevronLeft, Circle, Square } from 'lucide-react';
import Cropper from 'react-easy-crop';
import {
  PhotoResizerProps,
  ResizePreview,
  QualityLevel,
  QUALITY_PRESETS,
  SIZE_THRESHOLDS,
  LOGO_SIZE_THRESHOLDS,
  CropArea,
  CropPoint,
  CropShape
} from '@/types/photo-resize.types';
import { usePhotoResize } from '@/hooks/usePhotoResize';
```

**Step 2: Mettre à jour la signature du composant et ajouter les états crop**

Modifier la signature (ligne 22-30) et ajouter les nouveaux états :

```typescript
export default function PhotoResizer({
  file,
  onCancel,
  onValidate,
  maxSizeMB = 5,
  defaultScale = 0.8,
  defaultQuality = 'medium',
  previewSize = 400,
  mode = 'photo',
  initialCropShape = 'rect'
}: PhotoResizerProps) {
  // Hook de redimensionnement
  const {
    processing,
    loadImagePreview,
    generatePreview,
    resizeImage,
    cropImage
  } = usePhotoResize();

  // Seuils de taille selon le mode
  const sizeThresholds = mode === 'logo' ? LOGO_SIZE_THRESHOLDS : SIZE_THRESHOLDS;

  // États communs
  const [scale, setScale] = useState<number>(defaultScale);
  const [quality, setQuality] = useState<QualityLevel>(defaultQuality);
  const [preview, setPreview] = useState<ResizePreview | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // États crop (mode logo uniquement)
  const [step, setStep] = useState<'crop' | 'resize'>(mode === 'logo' ? 'crop' : 'resize');
  const [crop, setCrop] = useState<CropPoint>({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropShape, setCropShape] = useState<CropShape>(initialCropShape);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
```

**Step 3: Ajouter le callback onCropComplete**

Après les états, ajouter :

```typescript
  // Callback quand le crop change
  const onCropComplete = useCallback((_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
```

**Step 4: Modifier le handler de validation pour gérer les 2 étapes**

Remplacer `handleValidate` (lignes 101-120) :

```typescript
  // Handler passage étape crop → resize
  const handleCropNext = useCallback(async () => {
    if (!file || !croppedAreaPixels || processing) return;

    try {
      setLoading(true);
      const cropped = await cropImage(file, croppedAreaPixels, cropShape);
      setCroppedFile(cropped);

      // Mettre à jour la preview avec le fichier croppé
      const url = await loadImagePreview(cropped);
      setPreviewUrl(url);

      const previewData = await generatePreview(cropped, scale, QUALITY_PRESETS[quality]);
      setPreview(previewData);

      setStep('resize');
    } catch (error) {
      console.error('❌ [PHOTO-RESIZER] Erreur crop:', error);
      alert('Erreur lors du recadrage');
    } finally {
      setLoading(false);
    }
  }, [file, croppedAreaPixels, cropShape, processing, cropImage, loadImagePreview, generatePreview, scale, quality]);

  // Handler retour resize → crop
  const handleBackToCrop = useCallback(() => {
    setCroppedFile(null);
    setStep('crop');
  }, []);

  // Handler validation finale (resize)
  const handleValidate = useCallback(async () => {
    const fileToResize = croppedFile || file;
    if (!fileToResize || processing) return;

    try {
      const result = await resizeImage(fileToResize, {
        scale,
        quality: QUALITY_PRESETS[quality],
        maxSizeMB
      });

      if (result.success && result.file) {
        onValidate(result.file);
      } else {
        alert(`Erreur de redimensionnement: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [PHOTO-RESIZER] Erreur validation:', error);
      alert('Erreur lors du redimensionnement');
    }
  }, [croppedFile, file, scale, quality, maxSizeMB, processing, resizeImage, onValidate]);
```

**Step 5: Modifier getSizeIndicator pour utiliser les seuils dynamiques**

Remplacer `getSizeIndicator` (lignes 134-163) :

```typescript
  const getSizeIndicator = (size: number) => {
    if (size <= sizeThresholds.PERFECT) {
      return {
        color: 'emerald',
        icon: '🟢',
        message: mode === 'logo' ? 'Taille optimale pour un logo!' : 'Parfait pour le web!',
        bgClass: 'bg-emerald-50/60',
        borderClass: 'border-emerald-200/50',
        textClass: 'text-emerald-900'
      };
    } else if (size <= sizeThresholds.WARNING) {
      return {
        color: 'orange',
        icon: '🟠',
        message: 'Attention: Fichier volumineux',
        bgClass: 'bg-orange-50/60',
        borderClass: 'border-orange-200/50',
        textClass: 'text-orange-900'
      };
    } else {
      return {
        color: 'red',
        icon: '🔴',
        message: 'Réduisez davantage la taille',
        bgClass: 'bg-red-50/60',
        borderClass: 'border-red-200/50',
        textClass: 'text-red-900'
      };
    }
  };
```

**Step 6: Modifier le useEffect de preview pour utiliser croppedFile**

Remplacer le useEffect de mise à jour (lignes 81-98) :

```typescript
  // Mettre à jour preview quand scale/quality change (étape resize)
  useEffect(() => {
    const activeFile = croppedFile || file;
    if (!activeFile || step !== 'resize') return;

    const updatePreview = async () => {
      try {
        const previewData = await generatePreview(
          activeFile,
          scale,
          QUALITY_PRESETS[quality]
        );
        setPreview(previewData);
      } catch (error) {
        console.error('❌ [PHOTO-RESIZER] Erreur mise à jour preview:', error);
      }
    };

    updatePreview();
  }, [scale, quality, croppedFile, file, step, generatePreview]);
```

**Step 7: Réécrire le contenu du modal pour gérer les 2 étapes**

Le contenu de `modalContent` (à partir de la ligne 171) doit être remplacé. Voici la structure complète :

```typescript
  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[95vw] max-w-lg mx-auto my-4 max-h-[95vh] overflow-y-auto rounded-2xl md:rounded-3xl shadow-2xl"
        >
          {/* Background glassmorphism */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/92 to-white/88 backdrop-blur-2xl rounded-2xl md:rounded-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-orange-500/8 rounded-2xl md:rounded-3xl" />
          <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-white/60 shadow-inner" />

          <div className="relative z-10 p-3 md:p-5 space-y-2.5 md:space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                <div className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br ${step === 'crop' ? 'from-indigo-500 to-indigo-600' : 'from-emerald-500 to-emerald-600'} rounded-lg shadow-lg flex-shrink-0`}>
                  {step === 'crop' ? (
                    <Crop className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  ) : (
                    <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                    {step === 'crop' ? 'Recadrer votre logo' : 'Ajuster la taille'}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600 mt-0.5 leading-tight">
                    {step === 'crop'
                      ? 'Déplacez et zoomez pour cadrer votre logo'
                      : 'Ajustez la taille et la qualité'
                    }
                  </p>
                  {/* Indicateur d'étape en mode logo */}
                  {mode === 'logo' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-2 h-2 rounded-full ${step === 'crop' ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                      <div className={`w-2 h-2 rounded-full ${step === 'resize' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-[10px] text-gray-500 ml-1">
                        Étape {step === 'crop' ? '1/2' : '2/2'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={onCancel}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                disabled={processing}
              >
                <X className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </button>
            </div>

            {/* === ÉTAPE CROP (mode logo uniquement) === */}
            {step === 'crop' && (
              <>
                {/* Zone de crop */}
                <div className="relative w-full aspect-square bg-gray-900 rounded-xl overflow-hidden">
                  {previewUrl ? (
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={cropZoom}
                      aspect={1}
                      cropShape={cropShape}
                      showGrid={cropShape === 'rect'}
                      onCropChange={setCrop}
                      onZoomChange={setCropZoom}
                      onCropComplete={onCropComplete}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Toggle forme : Carré / Rond */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Forme :</span>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setCropShape('rect')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        cropShape === 'rect'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Square className="w-3.5 h-3.5" />
                      Carré
                    </button>
                    <button
                      onClick={() => setCropShape('round')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        cropShape === 'round'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Circle className="w-3.5 h-3.5" />
                      Rond
                    </button>
                  </div>
                </div>

                {/* Slider Zoom */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs md:text-sm font-semibold text-gray-900">
                      🔍 Zoom
                    </label>
                    <span className="text-sm font-bold text-indigo-600">
                      {cropZoom.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer touch-none
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 md:[&::-webkit-slider-thumb]:w-6 md:[&::-webkit-slider-thumb]:h-6
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-indigo-500
                      [&::-webkit-slider-thumb]:to-indigo-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                      [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 md:[&::-moz-range-thumb]:w-6 md:[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-indigo-500 [&::-moz-range-thumb]:to-indigo-600
                      [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:border-none"
                  />
                </div>

                {/* Boutons étape crop */}
                <div className="flex gap-2">
                  <button
                    onClick={onCancel}
                    disabled={processing}
                    className="flex-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCropNext}
                    disabled={processing || loading || !croppedAreaPixels}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                  >
                    {processing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Suivant
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* === ÉTAPE RESIZE (photo et logo) === */}
            {step === 'resize' && (
              <>
                {/* Preview Image */}
                <div className="flex justify-center">
                  <div className="relative w-full max-w-[200px] md:max-w-[280px] aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg md:rounded-xl overflow-hidden shadow-lg border border-gray-200">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-10 h-10 md:w-12 md:h-12" />
                      </div>
                    )}

                    {preview && (
                      <div className="absolute bottom-1 md:bottom-1.5 right-1 md:right-1.5 px-1.5 md:px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9px] md:text-[10px] text-white font-medium">
                        {preview.newDimensions.width} × {preview.newDimensions.height} px
                      </div>
                    )}
                  </div>
                </div>

                {/* Slider Taille */}
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs md:text-sm font-semibold text-gray-900">
                      📏 Taille
                    </label>
                    <span className="text-sm md:text-base font-bold text-emerald-600">
                      {Math.round(scale * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="25"
                    max="100"
                    step="5"
                    value={scale * 100}
                    onChange={(e) => setScale(Number(e.target.value) / 100)}
                    disabled={processing || loading}
                    className="w-full h-2 bg-gradient-to-r from-emerald-200 to-orange-200 rounded-lg appearance-none cursor-pointer touch-none
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 md:[&::-webkit-slider-thumb]:w-6 md:[&::-webkit-slider-thumb]:h-6
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-emerald-500
                      [&::-webkit-slider-thumb]:to-emerald-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                      [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 md:[&::-moz-range-thumb]:w-6 md:[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-emerald-500 [&::-moz-range-thumb]:to-emerald-600
                      [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:border-none"
                  />

                  <div className="flex justify-between text-[10px] md:text-xs text-gray-500">
                    <span>25%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Informations tailles */}
                {preview && (
                  <div className="p-2 md:p-2.5 bg-blue-50/60 backdrop-blur-sm rounded-lg border border-blue-200/50 space-y-0.5 md:space-y-1">
                    <div className="text-[10px] md:text-xs text-blue-900 space-y-0.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-medium">Original:</span>
                        <span className="font-bold text-right">
                          {preview.originalDimensions.width}×{preview.originalDimensions.height} ({formatSize(preview.originalSize)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-medium">Nouveau:</span>
                        <span className="font-bold text-right">
                          {preview.newDimensions.width}×{preview.newDimensions.height} ({formatSize(preview.newSize)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Boutons Qualité */}
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-900">
                    🎨 Qualité JPEG
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                    {(['low', 'medium', 'high'] as QualityLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setQuality(level)}
                        disabled={processing || loading}
                        className={`px-2 md:px-3 py-2 md:py-2.5 rounded-lg text-[11px] md:text-sm font-semibold transition-all ${
                          quality === level
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg scale-[1.02] md:scale-105'
                            : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200'
                        }`}
                      >
                        <span className="hidden md:inline">
                          {level === 'low' && 'Basse (60%)'}
                          {level === 'medium' && 'Moyenne (80%)'}
                          {level === 'high' && 'Haute (90%)'}
                        </span>
                        <span className="md:hidden">
                          {level === 'low' && 'Basse'}
                          {level === 'medium' && 'Moy.'}
                          {level === 'high' && 'Haute'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Indicateur Taille */}
                {indicator && preview && (
                  <div className={`flex items-center gap-1.5 p-2 md:p-2.5 ${indicator.bgClass} backdrop-blur-sm rounded-lg border ${indicator.borderClass}`}>
                    <span className="text-sm md:text-base flex-shrink-0">{indicator.icon}</span>
                    <div className={`flex-1 min-w-0 text-[10px] md:text-xs ${indicator.textClass}`}>
                      <strong>{indicator.message}</strong>
                      <span className="ml-1">{formatSize(preview.newSize)}</span>
                    </div>
                  </div>
                )}

                {/* Note d'aide */}
                <div className="flex items-center gap-1.5 p-1.5 md:p-2 bg-amber-50/60 backdrop-blur-sm rounded-lg border border-amber-200/50">
                  <Info className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-[9px] md:text-[10px] text-amber-900 leading-tight">
                    {mode === 'logo'
                      ? 'Un logo de 100-200 KB est idéal pour vos factures et votre profil.'
                      : 'Réduisez la taille à 50-80% pour un bon compromis qualité/poids.'
                    }
                  </p>
                </div>

                {/* Boutons Actions */}
                <div className="flex gap-2">
                  {/* Bouton Retour (mode logo) ou Reset (mode photo) */}
                  {mode === 'logo' ? (
                    <button
                      onClick={handleBackToCrop}
                      disabled={processing}
                      className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden md:inline">Retour</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleReset}
                      disabled={processing || loading}
                      className="hidden md:flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/80 hover:bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}

                  <div className="flex gap-2 flex-1">
                    <button
                      onClick={onCancel}
                      disabled={processing}
                      className="flex-1 md:flex-none md:min-w-[100px] px-3 md:px-4 py-2.5 md:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm md:text-base font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>

                    <button
                      onClick={handleValidate}
                      disabled={processing || loading}
                      className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm md:text-base font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                    >
                      {processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="hidden md:inline">Traitement...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 md:w-5 md:h-5" />
                          <span>Valider</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
```

**Step 8: Commit**

```bash
git add components/ui/PhotoResizer.tsx
git commit -m "feat: PhotoResizer mode crop logo (react-easy-crop) + 2 étapes"
```

---

## Task 6 : Modifier LogoUpload pour ouvrir le modal systématiquement + bouton caméra

**Files:**
- Modify: `components/ui/LogoUpload.tsx`

**Step 1: Modifier handleFileSelect pour ouvrir le modal sur tous les types**

Remplacer les lignes 127-133 (condition `uploadType === 'photo'`) et les lignes 135-159 (upload direct logo) par :

```typescript
    // 🆕 Ouvrir PhotoResizer pour TOUS les types d'upload
    console.log('🖼️ [LOGO-UPLOAD] Ouverture PhotoResizer mode:', uploadType);

    // Générer preview pour le crop
    try {
      const preview = await logoUploadSimpleService.fileToDataUrl(file);
      setLogoState(prev => ({
        ...prev,
        file,
        preview,
        error: undefined,
        uploading: false,
        progress: 0
      }));
    } catch (error) {
      console.error('❌ [LOGO-UPLOAD] Erreur preview:', error);
    }

    setPendingFile(file);
    setShowPhotoResizer(true);
```

**Step 2: Ajouter un input caméra pour mobile**

Après l'input file existant (ligne 380-386), ajouter un second ref et input :

Ajouter dans les state declarations (après ligne 28) :
```typescript
  const cameraInputRef = useRef<HTMLInputElement>(null);
```

Ajouter sous l'input file existant (après ligne 386) :
```typescript
      {/* Input caméra pour mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />
```

**Step 3: Ajouter un bouton caméra dans la zone d'upload vide**

Dans la section "Interface d'upload vide" (lignes 329-366), après le texte "Formats acceptés" (ligne 362), ajouter :

```typescript
            {/* Boutons sélection */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg hover:bg-primary-100 transition-colors border border-primary-200"
              >
                📁 Galerie
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 md:hidden"
              >
                📷 Photo
              </button>
            </div>
```

**Step 4: Mettre à jour le PhotoResizer dans le render avec les props mode**

Remplacer le bloc PhotoResizer (lignes 417-429) :

```typescript
      {/* Modal PhotoResizer pour logos ET photos */}
      {showPhotoResizer && pendingFile && (
        <PhotoResizer
          file={pendingFile}
          onCancel={() => {
            setShowPhotoResizer(false);
            setPendingFile(null);
          }}
          onValidate={handlePhotoValidated}
          maxSizeMB={uploadType === 'logo' ? 0.5 : 5}
          defaultScale={uploadType === 'logo' ? 1.0 : 0.8}
          defaultQuality="medium"
          mode={uploadType === 'photo' ? 'photo' : 'logo'}
          initialCropShape="rect"
        />
      )}
```

**Step 5: Commit**

```bash
git add components/ui/LogoUpload.tsx
git commit -m "feat: LogoUpload ouvre modal pour tous types + bouton caméra mobile"
```

---

## Task 7 : Test de build et vérification rétro-compatibilité

**Files:** Aucune modification

**Step 1: Vérifier le build**

```bash
npm run build
```

Expected: Build réussi sans erreurs TypeScript

**Step 2: Vérifier les imports non utilisés**

Si le build échoue, corriger les erreurs TypeScript signalées.

**Step 3: Test fonctionnel manuel**

Lancer le dev server :
```bash
npm run dev
```

Vérifier :
- [ ] Page `/register` : sélection logo → modal crop s'ouvre (étape 1 crop, étape 2 resize)
- [ ] Page produits : sélection photo → modal resize s'ouvre (PAS de crop, comme avant)
- [ ] Bouton caméra visible sur mobile, masqué sur desktop
- [ ] Toggle carré/rond fonctionne dans le crop

**Step 4: Commit final si corrections nécessaires**

```bash
git add -A
git commit -m "fix: corrections post-build PhotoResizer crop + LogoUpload"
```

---

## Résumé des fichiers modifiés

| # | Fichier | Action | Task |
|---|---------|--------|------|
| 1 | `public/upload-logo.php` | Fix tmp + log | Task 1 |
| 2 | `package.json` | +react-easy-crop | Task 2 |
| 3 | `types/photo-resize.types.ts` | +types crop | Task 3 |
| 4 | `hooks/usePhotoResize.ts` | +cropImage() | Task 4 |
| 5 | `components/ui/PhotoResizer.tsx` | Réécriture mode crop | Task 5 |
| 6 | `components/ui/LogoUpload.tsx` | Modal systématique + caméra | Task 6 |

## Ordre d'exécution

```
Task 1 (PHP fix) ─────────────────┐
Task 2 (npm install) ─────────────┤
Task 3 (types) ────────────────────┼──→ Task 5 (PhotoResizer) ──→ Task 6 (LogoUpload) ──→ Task 7 (Build)
Task 4 (hook cropImage) ──────────┘
```

Tasks 1-4 sont indépendantes et peuvent être exécutées en parallèle.
Task 5 dépend de Tasks 2, 3, 4.
Task 6 dépend de Task 5.
Task 7 dépend de Task 6.
