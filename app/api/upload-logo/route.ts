/**
 * API Route pour l'upload de logo
 * Solution hybride : upload local simulé ou proxy vers backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-config';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [API-UPLOAD] Début upload logo');

    // 1. Récupérer le FormData de la requête
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file || !filename) {
      return NextResponse.json(
        {
          error: 'Fichier manquant',
          success: false
        },
        { status: 400 }
      );
    }

    // 2. Validation basique
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'Fichier trop volumineux (max 5MB)',
          success: false
        },
        { status: 400 }
      );
    }

    // 3. En développement : simuler un upload réussi
    // En production : essayer de proxy vers le backend
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
      console.log(`📤 [API-UPLOAD] Mode développement - Upload simulé de ${filename}`);

      // Créer une URL temporaire pour le preview (en dev seulement)
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const mimeType = file.type || 'image/png';
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Retourner une réponse simulée
      return NextResponse.json({
        success: true,
        url: dataUrl, // En dev, on utilise une data URL
        filename: filename,
        size: file.size,
        message: 'Upload simulé en mode développement'
      });

    } else {
      // En production : essayer de proxy vers le backend
      try {
        console.log('📤 [API-UPLOAD] Mode production - Proxy vers backend');

        const apiUrl = getApiBaseUrl();
        const uploadUrl = `${apiUrl}/upload/logo`;

        console.log(`📤 [API-UPLOAD] Tentative upload vers: ${uploadUrl}`);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        const contentType = response.headers.get('content-type');

        if (!response.ok) {
          // En cas d'erreur backend, retourner une data URL comme fallback
          console.warn(`⚠️ [API-UPLOAD] Backend indisponible (${response.status}), utilisation fallback`);

          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64 = buffer.toString('base64');
          const mimeType = file.type || 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64}`;

          return NextResponse.json({
            success: true,
            url: dataUrl,
            filename: filename,
            size: file.size,
            message: 'Upload local (backend temporairement indisponible)',
            warning: 'Le logo sera visible uniquement dans cette session'
          });
        }

        // Parser et retourner la réponse du backend
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          console.log('✅ [API-UPLOAD] Upload backend réussi');
          return NextResponse.json(result);
        } else {
          throw new Error('Réponse non-JSON du backend');
        }

      } catch (backendError) {
        // Si le backend échoue, utiliser le fallback data URL
        console.error('❌ [API-UPLOAD] Erreur backend:', backendError);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const mimeType = file.type || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return NextResponse.json({
          success: true,
          url: dataUrl,
          filename: filename,
          size: file.size,
          message: 'Upload local (connexion backend impossible)',
          warning: 'Le logo sera visible uniquement dans cette session'
        });
      }
    }

  } catch (error) {
    console.error('❌ [API-UPLOAD] Erreur générale:', error);

    return NextResponse.json(
      {
        error: 'Erreur lors de l\'upload',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      },
      { status: 500 }
    );
  }
}

// Ne pas utiliser edge runtime pour avoir accès à Buffer
export const maxDuration = 30;