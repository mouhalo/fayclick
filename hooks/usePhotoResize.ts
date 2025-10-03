/**
 * Hook personnalisé pour le redimensionnement de photos
 * Utilise Canvas HTML5 pour manipuler les images
 */

import { useState, useCallback } from 'react';
import {
  ResizeOptions,
  ResizePreview,
  ResizeResult,
  ImageDimensions
} from '@/types/photo-resize.types';

export function usePhotoResize() {
  const [processing, setProcessing] = useState(false);

  /**
   * Charger une image depuis un File
   */
  const loadImage = useCallback((file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Erreur lors du chargement de l\'image'));
      };

      img.src = objectUrl;
    });
  }, []);

  /**
   * Charger preview depuis un File (data URL)
   */
  const loadImagePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result as string);
      };

      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Calculer nouvelles dimensions selon le scale
   */
  const calculateNewDimensions = useCallback(
    (original: ImageDimensions, scale: number): ImageDimensions => {
      return {
        width: Math.round(original.width * scale),
        height: Math.round(original.height * scale)
      };
    },
    []
  );

  /**
   * Estimer la taille du fichier redimensionné
   * Formule approximative : (nouvelleSurface / surfaceOriginale) * tailleOriginale * facteurQualité
   */
  const estimateFileSize = useCallback(
    (
      originalSize: number,
      originalDimensions: ImageDimensions,
      newDimensions: ImageDimensions,
      quality: number
    ): number => {
      const originalArea = originalDimensions.width * originalDimensions.height;
      const newArea = newDimensions.width * newDimensions.height;
      const areaRatio = newArea / originalArea;

      // Facteur de qualité JPEG (approximation)
      const qualityFactor = quality;

      return Math.round(originalSize * areaRatio * qualityFactor);
    },
    []
  );

  /**
   * Générer preview des dimensions et tailles
   */
  const generatePreview = useCallback(
    async (
      file: File,
      scale: number,
      quality: number
    ): Promise<ResizePreview> => {
      const img = await loadImage(file);

      const originalDimensions: ImageDimensions = {
        width: img.width,
        height: img.height
      };

      const newDimensions = calculateNewDimensions(originalDimensions, scale);
      const estimatedSize = estimateFileSize(
        file.size,
        originalDimensions,
        newDimensions,
        quality
      );

      return {
        originalSize: file.size,
        newSize: estimatedSize,
        originalDimensions,
        newDimensions,
        scale,
        quality
      };
    },
    [loadImage, calculateNewDimensions, estimateFileSize]
  );

  /**
   * Redimensionner une image avec Canvas
   */
  const resizeImage = useCallback(
    async (
      file: File,
      options: ResizeOptions
    ): Promise<ResizeResult> => {
      setProcessing(true);

      try {
        console.log('🖼️ [PHOTO-RESIZE] Début redimensionnement:', {
          fileName: file.name,
          originalSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          scale: options.scale,
          quality: options.quality
        });

        // Charger l'image
        const img = await loadImage(file);

        // Calculer nouvelles dimensions
        const newWidth = Math.round(img.width * options.scale);
        const newHeight = Math.round(img.height * options.scale);

        console.log('📐 [PHOTO-RESIZE] Dimensions:', {
          original: `${img.width}×${img.height}`,
          new: `${newWidth}×${newHeight}`
        });

        // Créer canvas pour redimensionnement
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Impossible de créer le contexte canvas');
        }

        // Activer le lissage pour meilleure qualité
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Conversion en Blob puis File
        const resizedFile = await new Promise<File>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erreur lors de la génération du blob'));
                return;
              }

              // Générer nom de fichier avec suffixe
              const originalName = file.name.replace(/\.[^/.]+$/, '');
              const extension = 'jpg'; // Toujours JPEG pour compression
              const newName = `${originalName}-resized.${extension}`;

              const resizedFile = new File([blob], newName, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });

              resolve(resizedFile);
            },
            'image/jpeg',
            options.quality
          );
        });

        const compressionRatio =
          ((file.size - resizedFile.size) / file.size) * 100;

        console.log('✅ [PHOTO-RESIZE] Redimensionnement réussi:', {
          originalSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          newSize: `${(resizedFile.size / 1024 / 1024).toFixed(2)} MB`,
          compressionRatio: `${compressionRatio.toFixed(1)}%`
        });

        setProcessing(false);

        return {
          success: true,
          file: resizedFile,
          originalSize: file.size,
          newSize: resizedFile.size,
          compressionRatio
        };
      } catch (error) {
        console.error('❌ [PHOTO-RESIZE] Erreur:', error);
        setProcessing(false);

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Erreur lors du redimensionnement',
          originalSize: file.size,
          newSize: 0,
          compressionRatio: 0
        };
      }
    },
    [loadImage]
  );

  return {
    processing,
    loadImage,
    loadImagePreview,
    calculateNewDimensions,
    estimateFileSize,
    generatePreview,
    resizeImage
  };
}
