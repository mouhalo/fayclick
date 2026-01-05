/**
 * API Route: CLIP Embeddings
 * Proxy pour la génération d'embeddings via Replicate API
 * Évite les problèmes CORS en appelant Replicate depuis le serveur
 * FayClick V2 - Commerce
 */

import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const CLIP_MODEL_VERSION = 'openai/clip-vit-base-patch32';

interface ClipRequest {
  imageBase64: string;
}

interface ClipResponse {
  success: boolean;
  embedding: number[] | null;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ClipResponse>> {
  try {
    const body: ClipRequest = await request.json();
    const { imageBase64 } = body;

    // Vérifier la clé API
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      console.error('[API/CLIP] Clé API Replicate non configurée');
      return NextResponse.json({
        success: false,
        embedding: null,
        error: 'Clé API Replicate non configurée sur le serveur'
      }, { status: 500 });
    }

    // Préparer l'image avec préfixe data URI si nécessaire
    const imageData = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    // Créer la prédiction
    const createResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: CLIP_MODEL_VERSION,
        input: {
          image: imageData
        }
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      console.error('[API/CLIP] Erreur création prédiction:', createResponse.status, errorData);
      return NextResponse.json({
        success: false,
        embedding: null,
        error: `Erreur Replicate: ${createResponse.status}`
      }, { status: createResponse.status });
    }

    const prediction = await createResponse.json();

    // Attendre le résultat (polling)
    let result = prediction;
    const maxAttempts = 30;
    let attempts = 0;

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(result.urls?.get || `${REPLICATE_API_URL}/${result.id}`, {
        headers: {
          'Authorization': `Token ${apiKey}`
        }
      });

      if (statusResponse.ok) {
        result = await statusResponse.json();
      }
      attempts++;
    }

    if (result.status === 'failed') {
      return NextResponse.json({
        success: false,
        embedding: null,
        error: result.error || 'Génération d\'embedding échouée'
      }, { status: 500 });
    }

    if (result.status !== 'succeeded' || !result.output) {
      return NextResponse.json({
        success: false,
        embedding: null,
        error: 'Timeout ou résultat invalide'
      }, { status: 408 });
    }

    // Extraire l'embedding (format peut varier selon le modèle)
    const embedding = Array.isArray(result.output)
      ? result.output
      : result.output?.embedding || result.output;

    if (!Array.isArray(embedding)) {
      return NextResponse.json({
        success: false,
        embedding: null,
        error: 'Format d\'embedding invalide'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      embedding
    });

  } catch (error) {
    console.error('[API/CLIP] Erreur:', error);
    return NextResponse.json({
      success: false,
      embedding: null,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
