/**
 * API Route Proxy pour l'upload de logo
 * Redirige vers l'API backend pour l'upload réel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-config';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [API-PROXY] Redirection upload logo vers backend');

    // 1. Récupérer le FormData de la requête
    const formData = await request.formData();

    // 2. Obtenir l'URL de l'API backend
    const apiUrl = getApiBaseUrl();
    const uploadUrl = `${apiUrl}/upload/logo`;

    console.log(`📤 [API-PROXY] Proxy vers: ${uploadUrl}`);

    // 3. Transférer la requête vers le backend
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // Le FormData définit automatiquement le bon Content-Type avec boundary
    });

    // 4. Obtenir le content-type de la réponse
    const contentType = response.headers.get('content-type');

    // 5. Si erreur, gérer proprement
    if (!response.ok) {
      console.error(`❌ [API-PROXY] Erreur backend: ${response.status}`);

      // Essayer de parser selon le type de contenu
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        return NextResponse.json(
          {
            error: error.error || error.message || 'Erreur upload',
            success: false
          },
          { status: response.status }
        );
      } else {
        // Si HTML ou autre, retourner une erreur générique JSON
        return NextResponse.json(
          {
            error: `Erreur serveur ${response.status}. L'upload n'est pas disponible pour le moment.`,
            success: false
          },
          { status: response.status }
        );
      }
    }

    // 6. Parser et retourner la réponse du backend
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('✅ [API-PROXY] Upload réussi via backend');
      return NextResponse.json(result);
    } else {
      // Si la réponse n'est pas du JSON alors que le statut est OK
      console.error('❌ [API-PROXY] Réponse non-JSON du backend');
      return NextResponse.json(
        {
          error: 'Réponse invalide du serveur',
          success: false
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [API-PROXY] Erreur proxy:', error);

    // Gérer les erreurs de connexion
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED'))) {
      return NextResponse.json(
        {
          error: 'Impossible de contacter le serveur d\'upload. Veuillez réessayer plus tard.',
          success: false
        },
        { status: 503 }
      );
    }

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

// Utiliser Edge Runtime pour éviter les problèmes de compatibilité
export const runtime = 'edge';
export const maxDuration = 30; // 30 secondes timeout