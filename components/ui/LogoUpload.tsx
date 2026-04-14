//components\ui\LogoUpload.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { LogoUploadProps, UploadProgress, LogoState } from '@/types/upload.types';
import logoUploadSimpleService from '@/services/logo-upload-simple.service';
import { useAuth } from '@/contexts/AuthContext';
import PhotoResizer from './PhotoResizer';

export default function LogoUpload({
  onUploadComplete,
  onUploadProgress,
  onFileSelect,
  initialPreview,
  className = '',
  disabled = false,
  label,
  uploadType = 'logo',
  registerMode = false,
  structureName
}: LogoUploadProps) {
  const { structure } = useAuth(); // Récupérer id_structure (optionnel en mode Register)
  const [logoState, setLogoState] = useState<LogoState>({
    preview: initialPreview,
    uploading: false,
    progress: 0
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // États pour PhotoResizer
  const [showPhotoResizer, setShowPhotoResizer] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Fonction d'upload automatique (définie en premier)
  const handleUploadAuto = useCallback(async (file: File) => {
    if (!file || logoState.uploading) return;

    // En mode Register, pas besoin de structure
    if (!registerMode && !structure?.id_structure) {
      setLogoState(prev => ({
        ...prev,
        error: 'Structure non trouvée. Veuillez vous reconnecter.'
      }));
      return;
    }

    setLogoState(prev => ({ ...prev, uploading: true, error: undefined, file }));

    const progressCallback = (progress: UploadProgress) => {
      setLogoState(prev => ({ ...prev, progress: progress.progress }));
      if (onUploadProgress) {
        onUploadProgress(progress);
      }
    };

    try {
      // Mode Register : Upload FTP uniquement (sans sauvegarde BD)
      // Mode normal : Upload FTP + Sauvegarde BD (seulement pour les logos)
      // Pour les photos produits : uploadLogoOnly car la sauvegarde BD se fait via produitsService.addEditPhoto()
      const effectiveStructureName = structureName || structure?.nom_structure || 'fayclick';
      const result = registerMode
        ? await logoUploadSimpleService.uploadLogoOnly(file, progressCallback, uploadType, effectiveStructureName)
        : await logoUploadSimpleService.uploadLogo(
            file,
            structure!.id_structure,
            progressCallback,
            uploadType,
            effectiveStructureName
          );

      if (result.success) {
        setLogoState(prev => ({
          ...prev,
          url: result.url,
          uploading: false,
          progress: 100
        }));

        console.log('✅ [LOGO-UPLOAD] Upload automatique réussi:', result.url);

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
      console.error('❌ [LOGO-UPLOAD] Erreur upload automatique:', error);
      setLogoState(prev => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload échoué'
      }));
    }
  }, [logoState.uploading, registerMode, structure, onUploadComplete, onUploadProgress, uploadType]);

  // Callback validation photo après redimensionnement
  const handlePhotoValidated = useCallback(async (optimizedFile: File) => {
    console.log('✅ [LOGO-UPLOAD] Photo redimensionnée validée:', optimizedFile.name);
    setShowPhotoResizer(false);
    setPendingFile(null);
    await handleUploadAuto(optimizedFile);
  }, [handleUploadAuto]);

  // Callback pour la sélection de fichier avec upload automatique ou redimensionnement
  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || logoState.uploading) return;

    console.log('📁 [LOGO-UPLOAD] Fichier sélectionné:', file.name);

    // Validation rapide
    const quickValidation = logoUploadSimpleService.quickValidateFile(file);
    if (!quickValidation.isValid) {
      setLogoState(prev => ({ ...prev, error: quickValidation.error }));
      return;
    }

    // Callback fichier sélectionné
    if (onFileSelect) {
      onFileSelect(file);
    }

    // 🆕 Ouvrir PhotoResizer pour TOUS les types d'upload (logo = crop+resize, photo = resize)
    console.log('🖼️ [LOGO-UPLOAD] Ouverture PhotoResizer mode:', uploadType);

    // Générer preview pour le composant
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
  }, [disabled, logoState.uploading, onFileSelect]);

  // Fonction d'upload manuel (pour le bouton de retry si nécessaire)
  const handleUpload = useCallback(async () => {
    if (!logoState.file || logoState.uploading) return;
    await handleUploadAuto(logoState.file);
  }, [logoState.file, logoState.uploading, handleUploadAuto]);

  // Handlers pour drag & drop
  const handleClick = () => {
    if (disabled || logoState.uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled || logoState.uploading) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
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

  // Handler pour supprimer/remplacer
  const handleRemove = () => {
    if (logoState.uploading) return;

    setLogoState({
      uploading: false,
      progress: 0
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-5 lg:p-6 shadow-lg border border-gray-100 ${className}`}>
      {/* Header avec icône */}
      <div className="flex items-center mb-3 md:mb-4">
        <div className="w-7 h-7 md:w-8 md:h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-2 md:mr-3">
          <span className="text-pink-500 text-base md:text-lg">
            {uploadType === 'photo' ? '📷' : '🎨'}
          </span>
        </div>
        <h3 className="text-base md:text-lg font-semibold text-gray-800">
          {label || 'Logo de votre business'}
        </h3>
        {logoState.url && (
          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            ✓ Uploadé
          </span>
        )}
      </div>

      {/* Sous-titre */}
      <p className="text-gray-600 text-xs md:text-sm mb-4 md:mb-6">
        {uploadType === 'photo'
          ? 'Image du produit (optionnel)'
          : 'Photo/Logo du commerce (optionnel)'
        }
      </p>

      {/* Zone d'upload/preview */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full h-40 md:h-48 border-2 border-dashed rounded-xl cursor-pointer
          transition-all duration-200 bg-gray-50/50
          ${isDragOver
            ? 'border-primary-400 bg-primary-50/50 scale-[1.02]'
            : 'border-gray-300 hover:border-primary-300 hover:bg-primary-50/30'
          }
          ${logoState.error ? 'border-red-300 bg-red-50/30' : ''}
          ${disabled || logoState.uploading ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        {logoState.preview ? (
          // Preview du logo avec contrôles
          <div className="w-full h-full flex items-center justify-center relative group">
            <img
              src={logoState.preview}
              alt="Preview logo"
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {/* Overlay avec contrôles */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                {/* Bouton Réessayer si erreur */}
                {!logoState.uploading && logoState.error && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpload();
                    }}
                    className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    🔄 Réessayer
                  </button>
                )}
                {/* Bouton Supprimer toujours disponible */}
                {!logoState.uploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    🗑️ Supprimer
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar d'upload automatique */}
            {logoState.uploading && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">🚀 Upload automatique...</span>
                    <span className="font-bold">{logoState.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-primary-500 h-2 rounded-full transition-all duration-300 animate-pulse"
                      style={{ width: `${logoState.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Badge de succès après upload */}
            {!logoState.uploading && logoState.url && (
              <div className="absolute top-2 right-2">
                <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-lg">
                  ✓ Uploadé
                </div>
              </div>
            )}
          </div>
        ) : (
          // Interface d'upload vide
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 md:p-6">
            {/* Icône appareil photo */}
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-200 rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <svg
                className="w-6 h-6 md:w-8 md:h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            {/* Texte principal */}
            <h4 className="text-base md:text-lg font-medium text-gray-700 mb-2">
              {uploadType === 'photo' ? 'Cliquer' : 'Cliquer'}
            </h4>

            {/* Formats acceptés */}
            <p className="text-xs md:text-sm text-gray-500 mb-4">
              JPG, PNG, GIF - Max 5MB
            </p>

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
                Galerie
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 md:hidden"
              >
                Photo
              </button>
            </div>
          </div>
        )}

        {/* Overlay de drag */}
        {isDragOver && (
          <div className="absolute inset-0 bg-primary-500/10 border-2 border-primary-400 rounded-xl flex items-center justify-center">
            <div className="text-primary-600 font-medium text-sm md:text-base">
              Relâchez pour ajouter votre logo
            </div>
          </div>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Input caméra pour mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Message d'erreur */}
      {logoState.error && (
        <div className="mt-3 text-red-600 text-xs md:text-sm flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {logoState.error}
        </div>
      )}

      {/* Statut d'upload */}
      {logoState.url && (
        <div className="mt-3 text-green-600 text-xs md:text-sm flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {uploadType === 'photo' ? 'Photo uploadée avec succès !' : 'Logo uploadé avec succès !'}
        </div>
      )}

      {/* Note informative */}
      <div className="mt-3 md:mt-4 text-xs text-gray-500 italic text-center">
        {uploadType === 'photo'
          ? '💡 Optionnel : Ajoutez des photos'
          : '💡 Optionnel : Ajoutez le logo de votre commerce pour personnaliser vos factures'
        }
      </div>

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
    </div>
  );
}