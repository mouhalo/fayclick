# 📘 Guide Technique : Système d'Upload de Logo FayClick V2

## 🎯 Vue d'Ensemble

Ce guide documente **entièrement** notre système d'upload de logo utilisé dans FayClick V2. Il permet à votre équipe de **comprendre, maintenir et reproduire** la solution sans rien recréer.

### Architecture Globale

```
┌──────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE DU SYSTÈME                        │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Page Register  │  (app/register/page.tsx)
│                 │  - Formulaire d'inscription
│  ┌──────────┐   │  - State global (formData.logoUrl)
│  │LogoUpload│   │  - Callbacks (onUploadComplete)
│  └─────┬────┘   │
└────────┼─────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│              COMPOSANT LOGO UPLOAD                             │
│  (components/ui/LogoUpload.tsx)                                │
│                                                                │
│  ✓ Interface utilisateur (Drag & Drop)                        │
│  ✓ Preview immédiat                                           │
│  ✓ Validation côté client                                     │
│  ✓ Upload automatique                                         │
│  ✓ Gestion d'état (preview, progress, error)                  │
└────────┬──────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│            SERVICE LOGO UPLOAD                                 │
│  (services/logo-upload.service.ts)                             │
│                                                                │
│  ✓ Singleton Pattern                                          │
│  ✓ Validation avancée (dimensions, taille, format)            │
│  ✓ Compression d'image (browser-image-compression)            │
│  ✓ Génération nom unique                                      │
│  ✓ Appel API Route                                            │
└────────┬──────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│               API ROUTE NEXT.JS                                │
│  (app/api/upload-logo/route.ts)                                │
│                                                                │
│  ✓ Endpoint POST sécurisé                                     │
│  ✓ Validation serveur                                         │
│  ✓ Connexion FTP avec basic-ftp                               │
│  ✓ Upload vers serveur distant                                │
│  ✓ Retour URL publique                                        │
└────────┬──────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                SERVEUR FTP DISTANT                             │
│  (node260-eu.n0c.com)                                          │
│                                                                │
│  ✓ Stockage permanent                                         │
│  ✓ Accès HTTPS public                                         │
│  ✓ URL finale: https://fayclick.net/uploads/{filename}        │
└────────────────────────────────────────────────────────────────┘
```

### Technologies Utilisées

| Technologie | Version | Usage |
|------------|---------|-------|
| **Next.js** | 15.4.6 | Framework principal, API Routes |
| **React** | 19.1.0 | Composant UI |
| **TypeScript** | 5.x | Types et interfaces |
| **browser-image-compression** | 2.0.2 | Compression client-side |
| **basic-ftp** | 5.0.5 | Upload FTP serveur-side |
| **Tailwind CSS** | 3.4.1 | Styling responsive |

---

## 📁 Structure des Fichiers

### Arborescence Complète

```
D:\React_Prj\fayclick - Copie (2)/
│
├── types/
│   └── upload.types.ts                    # ⭐ Types TypeScript
│
├── components/ui/
│   └── LogoUpload.tsx                     # ⭐ Composant UI
│
├── services/
│   └── logo-upload.service.ts             # ⭐ Service métier
│
├── app/
│   ├── api/
│   │   └── upload-logo/
│   │       └── route.ts                   # ⭐ API Route
│   │
│   └── register/
│       └── page.tsx                       # ⭐ Intégration
│
├── lib/
│   └── api-config.ts                      # Configuration API
│
├── package.json                           # Dépendances npm
└── next.config.ts                         # Configuration Next.js
```

---

## 🔧 Détails Techniques par Couche

---

## 1️⃣ COUCHE TYPES - `types/upload.types.ts`

### Rôle
Définit **tous les types TypeScript** utilisés dans le système d'upload.

### Interfaces Principales

#### 📦 Configuration Upload
```typescript
export interface UploadConfig {
  MAX_FILE_SIZE: number;           // Taille max en octets
  ALLOWED_MIME_TYPES: string[];    // Types MIME acceptés
  IMAGE_QUALITY: number;            // Qualité compression (0-1)
  MAX_DIMENSIONS: {
    width: number;
    height: number;
  };
}
```

#### 🌐 Configuration FTP
```typescript
export interface FTPConfig {
  host: string;         // Hôte FTP
  user: string;         // Utilisateur
  password: string;     // Mot de passe
  secure: boolean;      // FTPS (true)
  timeout: number;      // Timeout en ms
  remoteDir: string;    // Répertoire distant
}
```

#### 📊 État d'Upload
```typescript
export type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'success' | 'error';

export interface UploadProgress {
  status: UploadStatus;
  progress: number;     // 0-100
  message: string;
  eta?: number;         // temps estimé restant (ms)
}
```

#### ✅ Résultat d'Upload
```typescript
export interface UploadResult {
  success: boolean;
  url?: string;         // URL publique du logo
  error?: string;       // Message d'erreur
  filename?: string;    // Nom du fichier uploadé
}
```

#### 🎨 État du Logo (Composant)
```typescript
export interface LogoState {
  file?: File;          // Fichier original
  preview?: string;     // Data URL pour preview
  url?: string;         // URL finale après upload
  uploading: boolean;
  progress: number;     // 0-100
  error?: string;
}
```

#### 🔌 Props du Composant
```typescript
export interface LogoUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onFileSelect?: (file: File) => void;
  initialPreview?: string;
  className?: string;
  disabled?: boolean;
}
```

### Constantes de Configuration

```typescript
export const UPLOAD_CONSTANTS: UploadConfig = {
  MAX_FILE_SIZE: 512 * 1024,              // 0.5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  IMAGE_QUALITY: 0.8,                     // 80%
  MAX_DIMENSIONS: {
    width: 800,
    height: 800
  }
};

export const FTP_CONSTANTS = {
  REMOTE_DIR: '/uploads/',
  BASE_URL: 'https://fayclick.net',
  FILENAME_PATTERN: 'logo-{timestamp}-{hash}.{ext}'
} as const;
```

### 📝 Points Clés

✅ **Typage strict** : Toutes les données sont typées
✅ **Constantes centralisées** : Facile à modifier
✅ **Réutilisable** : Types importables partout
✅ **Documentation** : Commentaires JSDoc

---

## 2️⃣ COUCHE COMPOSANT - `components/ui/LogoUpload.tsx`

### Rôle
Interface utilisateur **complète** pour l'upload de logo avec drag & drop, preview et upload automatique.

### Fonctionnalités

#### 🎯 État Local
```typescript
const [logoState, setLogoState] = useState<LogoState>({
  preview: initialPreview,
  uploading: false,
  progress: 0
});
const [isDragOver, setIsDragOver] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

#### 📥 Sélection de Fichier (avec Upload Auto)
```typescript
const handleFileSelect = useCallback(async (file: File) => {
  // 1. Validation rapide
  const quickValidation = logoUploadService.quickValidateFile(file);
  if (!quickValidation.isValid) {
    setLogoState(prev => ({ ...prev, error: quickValidation.error }));
    return;
  }

  // 2. Preview immédiat (Data URL)
  const preview = await logoUploadService.fileToDataUrl(file);
  setLogoState(prev => ({
    ...prev,
    file,
    preview,
    error: undefined,
    uploading: false,
    progress: 0
  }));

  // 3. Callback fichier sélectionné
  if (onFileSelect) {
    onFileSelect(file);
  }

  // 4. UPLOAD AUTOMATIQUE après 500ms (laisser le preview s'afficher)
  setTimeout(() => {
    handleUploadAuto(file);
  }, 500);
}, [disabled, logoState.uploading, onFileSelect, handleUploadAuto]);
```

#### 🚀 Upload Automatique
```typescript
const handleUploadAuto = useCallback(async (file: File) => {
  if (!file || logoState.uploading) return;

  setLogoState(prev => ({ ...prev, uploading: true, error: undefined, file }));

  const progressCallback = (progress: UploadProgress) => {
    setLogoState(prev => ({ ...prev, progress: progress.progress }));
    if (onUploadProgress) {
      onUploadProgress(progress);
    }
  };

  try {
    const result = await logoUploadService.uploadLogo(file, progressCallback);

    if (result.success) {
      setLogoState(prev => ({
        ...prev,
        url: result.url,
        uploading: false,
        progress: 100
      }));

      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } else {
      setLogoState(prev => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: result.error
      }));
    }
  } catch (error) {
    setLogoState(prev => ({
      ...prev,
      uploading: false,
      progress: 0,
      error: error instanceof Error ? error.message : 'Upload échoué'
    }));
  }
}, [logoState.uploading, onUploadComplete, onUploadProgress]);
```

#### 🎨 Interface Utilisateur

##### Zone Vide (Avant Sélection)
- Icône appareil photo SVG
- Texte "Ajouter un logo"
- Formats acceptés : JPG, PNG, GIF - Max 0.5MB
- Instruction drag & drop

##### Zone avec Preview
- Image preview en taille réelle
- Overlay hover avec boutons :
  - 🔄 Réessayer (si erreur)
  - 🗑️ Supprimer
- Progress bar pendant upload (position bottom avec animation pulse)
- Badge vert "✓ Uploadé" après succès

#### 🎯 Drag & Drop
```typescript
const handleDragOver = (e: React.DragEvent) => {
  if (disabled || logoState.uploading) return;
  e.preventDefault();
  setIsDragOver(true);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);

  if (disabled || logoState.uploading) return;

  const file = e.dataTransfer.files?.[0];
  if (file) {
    handleFileSelect(file);
  }
};
```

### 📝 Points Clés

✅ **Upload automatique** : Dès la sélection du fichier
✅ **Preview immédiat** : Avant upload (Data URL)
✅ **Drag & drop** : Interface intuitive
✅ **Progress en temps réel** : Barre de progression animée
✅ **Gestion d'erreurs** : Messages clairs et retry
✅ **Responsive** : Mobile-first design
✅ **Callbacks** : Intégration facile dans formulaires

---

## 3️⃣ COUCHE SERVICE - `services/logo-upload.service.ts`

### Rôle
**Service métier singleton** gérant toute la logique d'upload (validation, compression, appel API).

### Architecture

#### 🏗️ Singleton Pattern
```typescript
class LogoUploadService implements ILogoUploadService {
  private static instance: LogoUploadService;

  private constructor() {}

  public static getInstance(): LogoUploadService {
    if (!LogoUploadService.instance) {
      LogoUploadService.instance = new LogoUploadService();
    }
    return LogoUploadService.instance;
  }
}

// Export singleton
export const logoUploadService = LogoUploadService.getInstance();
export default logoUploadService;
```

### Méthodes Principales

#### 1️⃣ Upload Principal
```typescript
async uploadLogo(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult>
```

**Workflow complet :**

```typescript
// 1. Validation (10%)
this.updateProgress(onProgress, 'compressing', 10, 'Validation du fichier...');
const validation = await this.validateFile(file);
if (!validation.isValid) {
  throw new Error(validation.error);
}

// 2. Compression (30%)
this.updateProgress(onProgress, 'compressing', 30, 'Compression de l\'image...');
const compressedFile = await this.compressImage(file);

// 3. Génération nom unique
const filename = this.generateFilename(file.name);

// 4. Upload FTP via API (60% → 90% → 100%)
this.updateProgress(onProgress, 'uploading', 60, 'Upload vers le serveur...');
const finalUrl = await this.uploadToServer(compressedFile, filename, onProgress);

// 5. Succès
this.updateProgress(onProgress, 'success', 100, 'Upload terminé!');
return { success: true, url: finalUrl, filename };
```

#### 2️⃣ Validation Experte
```typescript
async validateFile(file: File): Promise<FileValidationResult>
```

**Validations effectuées :**

| Validation | Critère | Message d'erreur |
|-----------|---------|------------------|
| **Type MIME** | JPG, PNG, GIF | "Format non supporté..." |
| **Taille** | Max 2.5MB avant compression | "Fichier trop volumineux..." |
| **Nom** | Max 100 caractères | "Nom de fichier trop long" |
| **Dimensions** | Min: 100x100px, Max: 4000x4000px | "Image trop petite/grande" |

#### 3️⃣ Compression d'Image
```typescript
async compressImage(file: File): Promise<File>
```

**Configuration :**
```typescript
const options: CompressionOptions = {
  maxSizeMB: 0.5,              // 0.5MB max
  maxWidthOrHeight: 800,        // 800px max
  useWebWorker: true,           // Performance
  quality: 0.8                  // 80% qualité
};

// Compression avec browser-image-compression
const compressedFile = await imageCompression(file, options);

// Si pas assez compressé, retry avec qualité réduite
if (compressedFile.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
  const aggressiveOptions = { ...options, quality: 0.6, maxSizeMB: 0.3 };
  return await imageCompression(file, aggressiveOptions);
}
```

**Logs de performance :**
```typescript
console.log('✅ [LOGO-UPLOAD] Compression:', {
  originalSize: file.size,
  compressedSize: compressedFile.size,
  reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
});
```

#### 4️⃣ Génération Nom Unique
```typescript
generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomHash = Math.random().toString(36).substring(2, 10);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'png';
  const cleanExtension = ['png', 'jpg', 'jpeg', 'gif'].includes(extension) ? extension : 'png';

  return `logo-${timestamp}-${randomHash}.${cleanExtension}`;
}
```

**Exemple :** `logo-1733582904123-a8f9e2x1.png`

#### 5️⃣ Upload vers Serveur
```typescript
private async uploadToServer(
  file: File,
  filename: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string>
```

**Workflow :**
```typescript
// 1. Préparation FormData
const formData = new FormData();
formData.append('file', file);
formData.append('filename', filename);

// 2. Appel API Route Next.js
const response = await fetch('/api/upload-logo', {
  method: 'POST',
  body: formData
});

// 3. Vérification réponse
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || `Erreur HTTP: ${response.status}`);
}

// 4. Retour URL finale
const result = await response.json();
return result.url; // https://fayclick.net/uploads/logo-xxx.png
```

#### 6️⃣ Helpers Utilitaires

**Preview Data URL :**
```typescript
async fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsDataURL(file);
  });
}
```

**Validation Rapide (Synchrone) :**
```typescript
quickValidateFile(file: File): { isValid: boolean; error?: string } {
  if (!UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Format de fichier non supporté' };
  }

  if (file.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE * 10) { // 5MB max
    return { isValid: false, error: 'Fichier trop volumineux' };
  }

  return { isValid: true };
}
```

**Dimensions d'Image :**
```typescript
private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de charger l\'image'));
    };

    img.src = url;
  });
}
```

### 📝 Points Clés

✅ **Singleton** : Une seule instance réutilisable
✅ **Compression intelligente** : Retry avec qualité réduite si besoin
✅ **Progress détaillé** : Callbacks à chaque étape
✅ **Validation multi-niveaux** : Client + Serveur
✅ **Noms uniques** : Timestamp + hash aléatoire
✅ **Gestion d'erreurs** : Try/catch avec logs détaillés

---

## 4️⃣ COUCHE API ROUTE - `app/api/upload-logo/route.ts`

### Rôle
**Endpoint Next.js API Route** pour l'upload FTP serveur-side sécurisé.

### Configuration

#### 🔒 Configuration FTP
```typescript
const FTP_CONFIG = {
  host: "node260-eu.n0c.com",
  user: "upload@fayclick.net",
  password: "Y@L@tif129*",
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};

const FTP_REMOTE_DIR = '/';
const BASE_URL = 'https://fayclick.net';
```

⚠️ **Important** : Les credentials sont en dur ici. En production, utilisez des **variables d'environnement** :
```typescript
host: process.env.FTP_HOST || "node260-eu.n0c.com",
user: process.env.FTP_USER || "upload@fayclick.net",
password: process.env.FTP_PASSWORD || "Y@L@tif129*",
```

#### ⚙️ Configuration Next.js
```typescript
export const runtime = 'nodejs';      // Runtime Node.js (requis pour basic-ftp)
export const maxDuration = 30;        // 30 secondes timeout
```

### Workflow API Route

```typescript
export async function POST(request: NextRequest) {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    // 1. Récupérer le fichier depuis FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file || !filename) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      );
    }

    // 2. Validation serveur
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 5MB)' },
        { status: 400 }
      );
    }

    // 3. Convertir File → Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Connexion FTP
    await client.access(FTP_CONFIG);
    console.log('✅ [API-UPLOAD] Connexion FTP établie');

    // 5. Créer le répertoire distant si nécessaire
    try {
      await client.ensureDir(FTP_REMOTE_DIR);
    } catch (dirError) {
      console.log('📁 [API-UPLOAD] Dossier existe déjà');
    }

    // 6. Upload du fichier
    const stream = Readable.from(buffer);
    const remotePath = `${FTP_REMOTE_DIR}${filename}`;

    await client.uploadFrom(stream, remotePath);
    console.log(`✅ [API-UPLOAD] Fichier uploadé: ${remotePath}`);

    // 7. Construire l'URL finale
    const fileUrl = `${BASE_URL}/uploads/${filename}`;

    // 8. Fermer la connexion
    client.close();

    // 9. Retourner le succès
    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: filename,
      size: buffer.length
    });

  } catch (error) {
    console.error('❌ [API-UPLOAD] Erreur:', error);
    client.close();

    return NextResponse.json(
      {
        error: 'Erreur lors de l\'upload',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
```

### 📊 Réponses API

#### ✅ Succès (200)
```json
{
  "success": true,
  "url": "https://fayclick.net/uploads/logo-1733582904123-a8f9e2x1.png",
  "filename": "logo-1733582904123-a8f9e2x1.png",
  "size": 45678
}
```

#### ❌ Erreur Client (400)
```json
{
  "error": "Fichier manquant"
}
```

#### ❌ Erreur Serveur (500)
```json
{
  "error": "Erreur lors de l'upload",
  "details": "Connection timeout"
}
```

### 🔐 Sécurité

✅ **Validation serveur** : Taille, format
✅ **Timeout** : 30 secondes max
✅ **Connexion sécurisée** : FTPS (secure: true)
✅ **Fermeture connexion** : Dans finally ou catch
✅ **Logs détaillés** : Pour debugging

⚠️ **À améliorer** :
- Variables d'environnement pour credentials
- Rate limiting
- Authentification utilisateur
- Validation MIME type serveur

---

## 5️⃣ INTÉGRATION DANS REGISTER PAGE

### Importations
```typescript
// app/register/page.tsx
import LogoUpload from '@/components/ui/LogoUpload';
import { UploadResult, UploadProgress } from '@/types/upload.types';
import registrationService from '@/services/registration.service';
```

### État du Formulaire
```typescript
const [formData, setFormData] = useState<RegistrationFormData>({
  // ... autres champs
  logoUrl: '',  // URL du logo uploadé
});

const [logoUploadState, setLogoUploadState] = useState({
  isUploaded: false,
  fileName: '',
  uploadProgress: 0
});
```

### Callbacks d'Upload

#### 1️⃣ Upload Complet
```typescript
const handleLogoUploadComplete = (result: UploadResult) => {
  if (result.success && result.url) {
    // Mettre à jour l'URL dans le formulaire
    setFormData(prev => ({ ...prev, logoUrl: result.url! }));

    // Mettre à jour l'état local
    setLogoUploadState({
      isUploaded: true,
      fileName: result.filename || 'logo.png',
      uploadProgress: 100
    });

    console.log('✅ [REGISTER] Logo uploadé:', result.url);
  }
};
```

#### 2️⃣ Progress
```typescript
const handleLogoUploadProgress = (progress: UploadProgress) => {
  setLogoUploadState(prev => ({
    ...prev,
    uploadProgress: progress.progress
  }));
};
```

#### 3️⃣ Sélection Fichier
```typescript
const handleLogoFileSelect = (file: File) => {
  console.log('📁 [REGISTER] Fichier sélectionné:', file.name);
  setLogoUploadState(prev => ({
    ...prev,
    fileName: file.name,
    isUploaded: false
  }));
};
```

### Utilisation dans le JSX

#### Étape 2 du Formulaire
```tsx
{/* Layout pour Logo et Services */}
<div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">
  {/* Colonne gauche : Logo */}
  <div>
    <LogoUpload
      onUploadComplete={handleLogoUploadComplete}
      onUploadProgress={handleLogoUploadProgress}
      onFileSelect={handleLogoFileSelect}
    />
  </div>

  {/* Colonne droite : Services */}
  <ServiceCarousel
    selectedService={formData.serviceType as ServiceType}
    onServiceSelect={handleServiceSelect}
    className="h-full"
  />
</div>
```

#### Étape 3 - Récapitulatif
```tsx
{/* Affichage du logo uploadé */}
{logoUploadState.isUploaded && formData.logoUrl && (
  <div className="flex justify-between items-center py-1.5 border-t border-gray-200 pt-2">
    <span className="text-xs font-medium text-gray-600">Logo :</span>
    <div className="flex items-center">
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-2">
        ✓ Uploadé
      </span>
      <span className="text-xs font-semibold text-gray-800">
        {logoUploadState.fileName}
      </span>
    </div>
  </div>
)}
```

### Soumission du Formulaire
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Préparation des données pour l'API
  const registrationData = {
    p_id_type: formData.structureTypeId,
    p_nom_structure: formData.businessName,
    p_adresse: formData.address,
    p_mobile_om: formData.phoneOM,
    p_mobile_wave: formData.phoneWave || '',
    p_nom_service: formData.serviceType || 'SERVICES',
    p_logo: formData.logoUrl || ''  // URL du logo uploadé (optionnel)
  };

  // Appel API inscription
  const result = await registrationService.registerMerchant(registrationData);

  // Gestion du résultat...
};
```

### Réinitialisation après Inscription
```typescript
const resetForm = () => {
  setFormData({
    businessName: '',
    // ... autres champs
    logoUrl: '',  // Réinitialiser l'URL du logo
  });

  setLogoUploadState({
    isUploaded: false,
    fileName: '',
    uploadProgress: 0
  });

  setStep(1);
  setError('');
  console.log('🔄 Formulaire réinitialisé');
};
```

---

## 📦 Configuration Requise

### 1️⃣ Variables d'Environnement

Créer `.env.local` :
```env
# Configuration FTP (Optionnel - si pas en dur dans le code)
FTP_HOST=node260-eu.n0c.com
FTP_USER=upload@fayclick.net
FTP_PASSWORD=Y@L@tif129*

# Configuration API
NEXT_PUBLIC_API_URL_PROD=https://api.icelabsoft.com/api/psql_request/api/psql_request
NEXT_PUBLIC_API_URL_DEV=https://api.icelabsoft.com/api/psql_request/api/psql_request
```

### 2️⃣ Dépendances npm

#### Installation
```bash
npm install browser-image-compression basic-ftp
```

#### `package.json`
```json
{
  "dependencies": {
    "basic-ftp": "^5.0.5",
    "browser-image-compression": "^2.0.2",
    "next": "15.4.6",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5"
  }
}
```

### 3️⃣ Configuration Next.js

#### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⚠️ IMPORTANT : L'upload ne fonctionne PAS avec output: 'export'
  // Il faut utiliser le mode standard pour les API Routes
  // output: 'export', // ❌ À désactiver pour l'upload

  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false, // ✅ Activer pour TypeScript strict
  },
};

export default nextConfig;
```

⚠️ **CRITIQUE** : Les API Routes Next.js **ne fonctionnent PAS** avec `output: 'export'`. Vous devez :
- **Développement** : `next dev` (API Routes fonctionnent)
- **Production** : Déployer sur Vercel, Netlify ou serveur Node.js

**Alternative pour static export :**
- Uploader directement depuis le client vers un service externe (AWS S3, Cloudinary, etc.)
- Ou utiliser une API backend séparée

### 4️⃣ TypeScript Configuration

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## 🚀 Workflow Complet d'Upload

### Diagramme de Séquence

```
┌─────────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  User   │     │ Component │     │ Service │     │   API    │     │   FTP    │
└────┬────┘     └─────┬─────┘     └────┬────┘     └────┬─────┘     └────┬─────┘
     │                │                 │                │                │
     │  1. Sélection  │                 │                │                │
     │   fichier      │                 │                │                │
     ├───────────────>│                 │                │                │
     │                │                 │                │                │
     │                │  2. Validation  │                │                │
     │                │    rapide       │                │                │
     │                ├────────────────>│                │                │
     │                │                 │                │                │
     │                │  3. Preview     │                │                │
     │                │    Data URL     │                │                │
     │                │<────────────────┤                │                │
     │                │                 │                │                │
     │  4. Affichage  │                 │                │                │
     │    preview     │                 │                │                │
     │<───────────────┤                 │                │                │
     │                │                 │                │                │
     │                │  5. Upload Auto │                │                │
     │                │    (500ms)      │                │                │
     │                ├────────────────>│                │                │
     │                │                 │                │                │
     │                │                 │  6. Validation │                │
     │                │                 │    complète    │                │
     │                │                 ├───────┐        │                │
     │                │                 │       │        │                │
     │                │                 │<──────┘        │                │
     │                │                 │                │                │
     │                │                 │  7. Compression│                │
     │                │                 │    (80% qual)  │                │
     │                │                 ├───────┐        │                │
     │                │                 │       │        │                │
     │                │                 │<──────┘        │                │
     │                │                 │                │                │
     │                │  Progress: 30%  │                │                │
     │                │<────────────────┤                │                │
     │                │                 │                │                │
     │                │                 │  8. POST       │                │
     │                │                 │    /api/upload │                │
     │                │                 ├───────────────>│                │
     │                │                 │                │                │
     │                │  Progress: 60%  │                │                │
     │                │<────────────────┤                │                │
     │                │                 │                │  9. FTP        │
     │                │                 │                │    Connect     │
     │                │                 │                ├───────────────>│
     │                │                 │                │                │
     │                │                 │                │  10. Upload    │
     │                │                 │                │     fichier    │
     │                │                 │                ├───────────────>│
     │                │                 │                │                │
     │                │                 │                │  11. Succès    │
     │                │                 │                │<───────────────┤
     │                │                 │                │                │
     │                │                 │  12. URL       │                │
     │                │                 │     publique   │                │
     │                │                 │<───────────────┤                │
     │                │                 │                │                │
     │                │  13. UploadResult                │                │
     │                │     (url: https://...)           │                │
     │                │<────────────────┤                │                │
     │                │                 │                │                │
     │  14. Callback  │                 │                │                │
     │   Complete     │                 │                │                │
     │<───────────────┤                 │                │                │
     │                │                 │                │                │
     │  15. Badge     │                 │                │                │
     │   "✓ Uploadé"  │                 │                │                │
     │<───────────────┤                 │                │                │
     │                │                 │                │                │
```

### Étapes Détaillées

| # | Étape | Durée | Description |
|---|-------|-------|-------------|
| 1 | **Sélection** | Instantané | Utilisateur clique ou drag & drop |
| 2 | **Validation rapide** | < 10ms | Vérification type MIME et taille |
| 3 | **Preview** | 50-200ms | Conversion en Data URL (FileReader) |
| 4 | **Affichage** | Instantané | Affichage preview dans l'UI |
| 5 | **Upload auto** | +500ms | Délai avant démarrage upload |
| 6 | **Validation** | 50-100ms | Validation complète (dimensions) |
| 7 | **Compression** | 200-2000ms | Compression avec Web Worker |
| 8 | **API Call** | 500-3000ms | POST vers /api/upload-logo |
| 9 | **FTP Connect** | 500-1500ms | Connexion FTPS au serveur |
| 10 | **FTP Upload** | 1000-5000ms | Upload du buffer |
| 11 | **Succès** | Instantané | Confirmation FTP |
| 12 | **URL Publique** | Instantané | Construction URL finale |
| 13 | **UploadResult** | Instantané | Retour au service |
| 14 | **Callback** | Instantané | Mise à jour formulaire |
| 15 | **UI Update** | Instantané | Badge de succès |

**Durée totale :** **2-12 secondes** (selon taille fichier et connexion réseau)

---

## 🎨 Diagrammes d'Architecture

### Vue Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js Client)                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         COMPOSANT LogoUpload.tsx                         │  │
│  │                                                          │  │
│  │  • Drag & Drop UI                                        │  │
│  │  • Preview immédiat (Data URL)                           │  │
│  │  • Progress bar animée                                   │  │
│  │  • Gestion d'état (LogoState)                            │  │
│  │  • Callbacks (onUploadComplete, onProgress, onSelect)    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         SERVICE logo-upload.service.ts                   │  │
│  │                                                          │  │
│  │  • Singleton Pattern                                     │  │
│  │  • Validation (dimensions, taille, format)               │  │
│  │  • Compression (browser-image-compression)               │  │
│  │  • Génération nom unique (timestamp + hash)              │  │
│  │  • Appel API POST /api/upload-logo                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTP POST
                        │ FormData
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Next.js API Route)                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         API ROUTE /api/upload-logo/route.ts              │  │
│  │                                                          │  │
│  │  • Endpoint POST sécurisé                                │  │
│  │  • Validation serveur (taille max 5MB)                   │  │
│  │  • Connexion FTP (basic-ftp)                             │  │
│  │  • Conversion File → Buffer → Stream                     │  │
│  │  • Upload vers serveur distant                           │  │
│  │  • Retour URL publique                                   │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │ FTPS
                        │ basic-ftp
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SERVEUR FTP DISTANT                           │
│                   (node260-eu.n0c.com)                          │
│                                                                 │
│  • Stockage permanent : /uploads/                              │
│  • Accès HTTPS : https://fayclick.net/uploads/{filename}       │
│  • Format : logo-{timestamp}-{hash}.{ext}                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### États du Composant

```
┌─────────────────────────────────────────────────────────────┐
│                  ÉTATS DU COMPOSANT LOGO UPLOAD             │
└─────────────────────────────────────────────────────────────┘

   ┌─────────────┐
   │    IDLE     │  État initial
   │             │  - Pas de fichier sélectionné
   │             │  - Affiche zone vide avec icône
   └──────┬──────┘
          │
          │ Sélection fichier
          ▼
   ┌─────────────┐
   │  PREVIEW    │  Fichier sélectionné
   │             │  - Affiche preview (Data URL)
   │             │  - Bouton Supprimer visible
   └──────┬──────┘
          │
          │ Auto-upload après 500ms
          ▼
   ┌─────────────┐
   │ UPLOADING   │  Upload en cours
   │             │  - Progress bar visible
   │             │  - Message "🚀 Upload automatique..."
   │             │  - Pourcentage (0-100%)
   └──────┬──────┘
          │
          │ Upload terminé
          ▼
   ┌─────────────┐
   │   SUCCESS   │  Upload réussi
   │             │  - Badge "✓ Uploadé"
   │             │  - URL disponible
   │             │  - Boutons Supprimer/Remplacer
   └──────┬──────┘
          │
          │ En cas d'erreur
          ▼
   ┌─────────────┐
   │    ERROR    │  Erreur upload
   │             │  - Message d'erreur affiché
   │             │  - Bouton "🔄 Réessayer"
   │             │  - Bouton "🗑️ Supprimer"
   └─────────────┘
```

---

## 📚 Exemples de Code

### Exemple 1 : Utilisation Standalone

```typescript
import LogoUpload from '@/components/ui/LogoUpload';
import { UploadResult, UploadProgress } from '@/types/upload.types';

function MyForm() {
  const [logoUrl, setLogoUrl] = useState('');

  const handleUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      setLogoUrl(result.url);
      console.log('Logo uploadé:', result.url);
    }
  };

  const handleProgress = (progress: UploadProgress) => {
    console.log(`Upload: ${progress.progress}% - ${progress.message}`);
  };

  return (
    <div>
      <LogoUpload
        onUploadComplete={handleUploadComplete}
        onUploadProgress={handleProgress}
      />

      {logoUrl && (
        <p>Logo disponible : <a href={logoUrl}>{logoUrl}</a></p>
      )}
    </div>
  );
}
```

### Exemple 2 : Avec Preview Initial

```typescript
function EditProfile() {
  const [currentLogo, setCurrentLogo] = useState('https://fayclick.net/uploads/logo-existing.png');

  return (
    <LogoUpload
      initialPreview={currentLogo}
      onUploadComplete={(result) => {
        if (result.success && result.url) {
          setCurrentLogo(result.url);
          // Mettre à jour le profil en base de données
          updateProfileLogo(result.url);
        }
      }}
    />
  );
}
```

### Exemple 3 : Avec Validation Custom

```typescript
function StrictLogoUpload() {
  const handleFileSelect = (file: File) => {
    // Validation custom avant upload
    if (file.size > 200 * 1024) { // 200KB max
      alert('Logo trop volumineux. Max 200KB');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.png')) {
      alert('Seul le format PNG est accepté');
      return;
    }

    console.log('Fichier validé:', file.name);
  };

  return (
    <LogoUpload
      onFileSelect={handleFileSelect}
      onUploadComplete={(result) => {
        if (!result.success) {
          alert(`Erreur : ${result.error}`);
        }
      }}
    />
  );
}
```

### Exemple 4 : Appel Direct du Service

```typescript
import logoUploadService from '@/services/logo-upload.service';

async function directUpload(file: File) {
  console.log('🚀 Upload direct du fichier:', file.name);

  const result = await logoUploadService.uploadLogo(
    file,
    (progress) => {
      console.log(`Progress: ${progress.progress}% - ${progress.message}`);
    }
  );

  if (result.success) {
    console.log('✅ Upload réussi:', result.url);
    return result.url;
  } else {
    console.error('❌ Erreur:', result.error);
    throw new Error(result.error);
  }
}

// Usage
const fileInput = document.querySelector<HTMLInputElement>('#file-input');
fileInput?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    try {
      const url = await directUpload(file);
      console.log('URL finale:', url);
    } catch (error) {
      console.error('Upload échoué:', error);
    }
  }
});
```

---

## 🔄 Reproduction du Système

### Checklist Installation

#### ✅ **Étape 1 : Dépendances npm**
```bash
# Installer les packages requis
npm install browser-image-compression basic-ftp

# Vérifier l'installation
npm list browser-image-compression basic-ftp
```

#### ✅ **Étape 2 : Créer les Fichiers Types**

Créer `types/upload.types.ts` :
```bash
mkdir -p types
# Copier le contenu depuis notre fichier existant
```

#### ✅ **Étape 3 : Créer le Service**

Créer `services/logo-upload.service.ts` :
```bash
mkdir -p services
# Copier le contenu depuis notre fichier existant
```

#### ✅ **Étape 4 : Créer le Composant UI**

Créer `components/ui/LogoUpload.tsx` :
```bash
mkdir -p components/ui
# Copier le contenu depuis notre fichier existant
```

#### ✅ **Étape 5 : Créer l'API Route**

Créer `app/api/upload-logo/route.ts` :
```bash
mkdir -p app/api/upload-logo
# Copier le contenu depuis notre fichier existant
```

⚠️ **IMPORTANT** : Adapter la configuration FTP avec vos credentials :
```typescript
const FTP_CONFIG = {
  host: "VOTRE_SERVEUR_FTP",
  user: "VOTRE_UTILISATEUR",
  password: "VOTRE_MOT_DE_PASSE",
  secure: true,
};
```

#### ✅ **Étape 6 : Configuration Next.js**

Modifier `next.config.ts` :
```typescript
const nextConfig: NextConfig = {
  // ⚠️ Désactiver output: 'export' pour les API Routes
  // output: 'export', // ❌ À commenter

  images: {
    unoptimized: true,
  },
};
```

#### ✅ **Étape 7 : Variables d'Environnement**

Créer `.env.local` :
```env
FTP_HOST=node260-eu.n0c.com
FTP_USER=upload@fayclick.net
FTP_PASSWORD=VotreMotDePasseSecurise
```

Modifier `app/api/upload-logo/route.ts` :
```typescript
const FTP_CONFIG = {
  host: process.env.FTP_HOST || "fallback-host",
  user: process.env.FTP_USER || "fallback-user",
  password: process.env.FTP_PASSWORD || "fallback-password",
  secure: true,
};
```

#### ✅ **Étape 8 : Utilisation dans un Formulaire**

```typescript
import LogoUpload from '@/components/ui/LogoUpload';
import { UploadResult } from '@/types/upload.types';

function MyForm() {
  const [logoUrl, setLogoUrl] = useState('');

  const handleUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      setLogoUrl(result.url);
    }
  };

  return (
    <form>
      <LogoUpload onUploadComplete={handleUploadComplete} />
      <input type="hidden" name="logo_url" value={logoUrl} />
      {/* Autres champs du formulaire */}
    </form>
  );
}
```

#### ✅ **Étape 9 : Tests de Validation**

```bash
# Démarrer le serveur de développement
npm run dev

# Naviguer vers votre page avec le composant
# Tester :
# 1. Sélection d'un fichier (< 5MB, PNG/JPG/GIF)
# 2. Drag & drop
# 3. Preview immédiat
# 4. Upload automatique
# 5. Vérification de l'URL finale
# 6. Accès public : https://fayclick.net/uploads/{filename}
```

### Configuration Serveur FTP

Si vous devez configurer votre propre serveur FTP :

#### Option 1 : Serveur FTP dédié (Recommandé)
```bash
# Exemple avec vsftpd (Linux)
sudo apt update
sudo apt install vsftpd

# Configuration
sudo nano /etc/vsftpd.conf
```

Configuration minimale :
```conf
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
ssl_enable=YES
allow_writeable_chroot=YES
```

#### Option 2 : Hébergement mutualisé
- Créer un compte FTP dans votre panneau d'hébergement (cPanel, Plesk, etc.)
- Activer FTPS (FTP over SSL/TLS)
- Créer un dossier `/uploads/` avec permissions d'écriture
- Configurer l'accès HTTPS public pour ce dossier

#### Option 3 : Service Cloud (Alternative)
Au lieu de FTP, vous pouvez utiliser :
- **AWS S3** : `npm install @aws-sdk/client-s3`
- **Cloudinary** : `npm install cloudinary`
- **DigitalOcean Spaces** : Compatible S3

---

## 🛠️ Personnalisation

### Modifier les Constantes d'Upload

#### Augmenter la Taille Max
```typescript
// types/upload.types.ts
export const UPLOAD_CONSTANTS: UploadConfig = {
  MAX_FILE_SIZE: 1024 * 1024,  // 1MB au lieu de 0.5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], // Ajouter WEBP
  IMAGE_QUALITY: 0.9,           // 90% au lieu de 80%
  MAX_DIMENSIONS: {
    width: 1200,                // 1200px au lieu de 800px
    height: 1200
  }
};
```

#### Changer le Répertoire FTP
```typescript
// app/api/upload-logo/route.ts
const FTP_REMOTE_DIR = '/images/logos/';  // Au lieu de '/'
const BASE_URL = 'https://cdn.votredomaine.com';  // CDN custom
```

### Styling Custom

#### Modifier les Couleurs
```typescript
// components/ui/LogoUpload.tsx
<div className={`
  border-2 border-dashed rounded-xl
  ${isDragOver
    ? 'border-blue-400 bg-blue-50/50'      // Bleu au lieu de primary
    : 'border-gray-300 hover:border-blue-300'
  }
`}>
```

#### Ajouter des Animations
```typescript
// Installer framer-motion
npm install framer-motion

// Modifier le composant
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <LogoUpload />
</motion.div>
```

### Callbacks Supplémentaires

#### Validation Custom
```typescript
// services/logo-upload.service.ts
async validateFile(file: File): Promise<FileValidationResult> {
  const errors: string[] = [];

  // Validation existante...

  // Validation custom supplémentaire
  if (file.name.includes(' ')) {
    errors.push('Le nom du fichier ne doit pas contenir d\'espaces');
  }

  // Validation de ratio d'aspect
  const dimensions = await this.getImageDimensions(file);
  const ratio = dimensions.width / dimensions.height;
  if (ratio < 0.5 || ratio > 2) {
    errors.push('Le ratio d\'aspect doit être entre 0.5 et 2');
  }

  return {
    isValid: errors.length === 0,
    error: errors.join('. ')
  };
}
```

---

## 🐛 Debugging

### Logs Détaillés

Tous les logs sont préfixés pour faciliter le debugging :

| Préfixe | Localisation | Utilité |
|---------|-------------|----------|
| `[LOGO-UPLOAD]` | Service | Suivi du workflow d'upload |
| `[API-UPLOAD]` | API Route | Suivi des opérations FTP |
| `[REGISTER]` | Page Register | Intégration dans le formulaire |

### Activer les Logs Verbeux

#### Service
```typescript
// services/logo-upload.service.ts
console.log('🖼️ [LOGO-UPLOAD] Début upload:', file.name);
console.log('✅ [LOGO-UPLOAD] Compression:', {
  originalSize: file.size,
  compressedSize: compressedFile.size,
  reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
});
console.log('🎉 [LOGO-UPLOAD] Upload réussi:', finalUrl);
```

#### API Route
```typescript
// app/api/upload-logo/route.ts
client.ftp.verbose = true;  // Activer les logs FTP détaillés
```

### Erreurs Courantes

#### ❌ "Connection timeout"
**Cause** : Serveur FTP inaccessible ou credentials incorrects
**Solution** :
```typescript
// Vérifier la connexion manuellement
const testConnection = async () => {
  const client = new ftp.Client();
  try {
    await client.access({
      host: "node260-eu.n0c.com",
      user: "upload@fayclick.net",
      password: "VotreMotDePasse",
      secure: true,
      timeout: 10000
    });
    console.log('✅ Connexion FTP OK');
    client.close();
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
  }
};
```

#### ❌ "API Route not found (404)"
**Cause** : Next.js en mode `output: 'export'`
**Solution** : Désactiver `output: 'export'` dans `next.config.ts`

#### ❌ "Compression failed"
**Cause** : Fichier corrompu ou format non supporté
**Solution** :
```typescript
// Ajouter une validation du fichier avant compression
const isValidImage = await new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(true);
  img.onerror = () => resolve(false);
  img.src = URL.createObjectURL(file);
});

if (!isValidImage) {
  throw new Error('Fichier image invalide ou corrompu');
}
```

#### ❌ "Upload progress stuck"
**Cause** : Timeout réseau ou connexion lente
**Solution** :
```typescript
// Augmenter le timeout
export const maxDuration = 60; // 60 secondes au lieu de 30
```

---

## 📈 Optimisations Possibles

### 1️⃣ Upload Direct S3 (Meilleure Performance)

Au lieu de passer par votre serveur, uploadez directement vers S3 avec des signed URLs :

```typescript
// Installer AWS SDK
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

// Créer une API Route pour générer des signed URLs
// app/api/get-upload-url/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get('filename');

  const client = new S3Client({ region: 'us-east-1' });
  const command = new PutObjectCommand({
    Bucket: 'fayclick-logos',
    Key: `uploads/${filename}`,
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  return NextResponse.json({ uploadUrl: signedUrl });
}

// Modifier le service pour uploader directement
private async uploadToS3(file: File, signedUrl: string): Promise<string> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });

  if (!response.ok) {
    throw new Error('Upload S3 échoué');
  }

  // Retourner l'URL publique
  return signedUrl.split('?')[0];
}
```

### 2️⃣ Compression Progressive

Compresser progressivement jusqu'à atteindre la taille cible :

```typescript
async compressImageProgressive(file: File): Promise<File> {
  let quality = 0.9;
  let compressedFile = file;

  while (compressedFile.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE && quality > 0.3) {
    compressedFile = await imageCompression(file, {
      maxSizeMB: UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024),
      maxWidthOrHeight: UPLOAD_CONSTANTS.MAX_DIMENSIONS.width,
      quality: quality
    });

    console.log(`Compression à ${quality * 100}%: ${compressedFile.size} bytes`);
    quality -= 0.1;
  }

  return compressedFile;
}
```

### 3️⃣ Retry Automatique

Réessayer automatiquement en cas d'échec :

```typescript
async uploadWithRetry(
  file: File,
  maxRetries = 3
): Promise<UploadResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt}/${maxRetries}`);
      return await this.uploadLogo(file);
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Tentative ${attempt} échouée:`, error);

      if (attempt < maxRetries) {
        // Attendre avant de réessayer (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError;
}
```

### 4️⃣ Cache des Uploads

Éviter les uploads redondants avec un cache :

```typescript
// Cache localStorage
private uploadCache = new Map<string, string>();

async uploadLogo(file: File): Promise<UploadResult> {
  // Calculer un hash du fichier
  const fileHash = await this.calculateFileHash(file);

  // Vérifier le cache
  const cachedUrl = this.uploadCache.get(fileHash);
  if (cachedUrl) {
    console.log('✅ URL trouvée dans le cache:', cachedUrl);
    return { success: true, url: cachedUrl };
  }

  // Upload réel
  const result = await this.uploadLogoReal(file);

  // Mettre en cache
  if (result.success && result.url) {
    this.uploadCache.set(fileHash, result.url);
  }

  return result;
}

private async calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

## 🔐 Sécurité

### Recommandations

#### ✅ **1. Variables d'Environnement**
Ne jamais commiter les credentials FTP dans le code :
```typescript
// ❌ MAUVAIS
const FTP_CONFIG = {
  password: "Y@L@tif129*"
};

// ✅ BON
const FTP_CONFIG = {
  password: process.env.FTP_PASSWORD || ""
};
```

#### ✅ **2. Validation Serveur**
Toujours valider côté serveur (même si validation client) :
```typescript
// app/api/upload-logo/route.ts
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif'];
if (!ALLOWED_MIME.includes(file.type)) {
  return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
}
```

#### ✅ **3. Rate Limiting**
Limiter le nombre d'uploads par utilisateur :
```typescript
// Installer rate-limiter
npm install rate-limiter-flexible

// app/api/upload-logo/route.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 5,        // 5 uploads
  duration: 60,     // par minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';

  try {
    await rateLimiter.consume(ip);
  } catch (error) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer dans 1 minute.' },
      { status: 429 }
    );
  }

  // Upload...
}
```

#### ✅ **4. Authentification**
Vérifier que l'utilisateur est authentifié :
```typescript
// app/api/upload-logo/route.ts
import { getServerSession } from 'next-auth/next';

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  // Upload...
}
```

#### ✅ **5. Scan Antivirus**
Scanner les fichiers uploadés (optionnel mais recommandé) :
```typescript
// Installer ClamAV pour Node.js
npm install clamscan

// app/api/upload-logo/route.ts
import NodeClam from 'clamscan';

const clamscan = await new NodeClam().init();

export async function POST(request: NextRequest) {
  // ... récupérer le fichier

  // Scanner le fichier
  const { isInfected, viruses } = await clamscan.isInfected(buffer);

  if (isInfected) {
    return NextResponse.json(
      { error: `Fichier infecté: ${viruses.join(', ')}` },
      { status: 400 }
    );
  }

  // Upload...
}
```

---

## 📊 Métriques et Monitoring

### Tracking des Uploads

```typescript
// services/logo-upload.service.ts
private trackUpload(filename: string, size: number, duration: number) {
  // Envoyer à Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'logo_upload', {
      event_category: 'Upload',
      event_label: filename,
      value: Math.round(duration / 1000), // durée en secondes
      custom_dimension: size
    });
  }

  // Ou envoyer à votre API d'analytics
  fetch('/api/analytics/track', {
    method: 'POST',
    body: JSON.stringify({
      event: 'logo_upload',
      filename,
      size,
      duration
    })
  }).catch(console.error);
}

async uploadLogo(file: File): Promise<UploadResult> {
  const startTime = Date.now();

  try {
    const result = await this.uploadLogoReal(file);

    const duration = Date.now() - startTime;
    this.trackUpload(file.name, file.size, duration);

    return result;
  } catch (error) {
    // Track les erreurs aussi
    this.trackUpload(file.name, file.size, Date.now() - startTime);
    throw error;
  }
}
```

### Dashboard de Monitoring

Créer une page admin pour visualiser les uploads :

```typescript
// app/admin/uploads/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function UploadsMonitoring() {
  const [stats, setStats] = useState({
    totalUploads: 0,
    avgSize: 0,
    avgDuration: 0,
    successRate: 0
  });

  useEffect(() => {
    fetch('/api/analytics/uploads')
      .then(res => res.json())
      .then(setStats);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Statistiques d'Upload</h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm">Total Uploads</h3>
          <p className="text-2xl font-bold">{stats.totalUploads}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm">Taille Moyenne</h3>
          <p className="text-2xl font-bold">{Math.round(stats.avgSize / 1024)} KB</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm">Durée Moyenne</h3>
          <p className="text-2xl font-bold">{(stats.avgDuration / 1000).toFixed(1)}s</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm">Taux de Succès</h3>
          <p className="text-2xl font-bold">{stats.successRate}%</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎓 Conclusion

### Points Clés à Retenir

✅ **Architecture en 4 couches** : Types → Composant → Service → API Route → FTP
✅ **Upload automatique** : Dès la sélection du fichier
✅ **Compression intelligente** : Réduction de 50-80% de la taille
✅ **Validation multi-niveaux** : Client + Serveur
✅ **Gestion d'erreurs** : Try/catch avec retry
✅ **Progress en temps réel** : Callbacks à chaque étape
✅ **Sécurité** : Validation, rate limiting, authentification

### Ressources Supplémentaires

- **browser-image-compression** : https://github.com/Donaldcwl/browser-image-compression
- **basic-ftp** : https://github.com/patrickjuchli/basic-ftp
- **Next.js API Routes** : https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **TypeScript Handbook** : https://www.typescriptlang.org/docs/

### Support

Pour toute question ou problème :
1. Vérifier les logs (préfixes `[LOGO-UPLOAD]`, `[API-UPLOAD]`)
2. Consulter la section Debugging de ce guide
3. Vérifier la configuration FTP et Next.js
4. Contacter l'équipe technique : support@fayclick.net

---

## 📝 Changelog

| Version | Date | Changements |
|---------|------|-------------|
| 1.0.0 | 2024-01 | Version initiale du système d'upload |
| 1.1.0 | 2024-02 | Ajout upload automatique après sélection |
| 1.2.0 | 2024-03 | Amélioration compression avec retry |
| 1.3.0 | 2024-12 | Documentation complète et guide technique |

---

**Document créé le :** 2024-12-07
**Dernière mise à jour :** 2024-12-07
**Auteur :** Équipe Technique FayClick V2
**Version du guide :** 1.0.0

---

© 2024 FayClick - Tous droits réservés