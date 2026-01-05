/**
 * API Route: Claude Vision OCR
 * Proxy pour l'extraction de nom de produit via Claude Vision API
 * Évite les problèmes CORS en appelant Anthropic depuis le serveur
 * FayClick V2 - Commerce
 */

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface OcrRequest {
  imageBase64: string;
  mimeType?: string;
}

interface ExtractionResult {
  success: boolean;
  nomProduit: string;
  confidence: 'high' | 'medium' | 'low';
  rawText?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractionResult>> {
  try {
    const body: OcrRequest = await request.json();
    const { imageBase64, mimeType = 'image/jpeg' } = body;

    // Vérifier la clé API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[API/OCR] Clé API Anthropic non configurée');
      return NextResponse.json({
        success: false,
        nomProduit: 'Produit non identifié',
        confidence: 'low',
        error: 'Clé API Anthropic non configurée sur le serveur'
      }, { status: 500 });
    }

    // Nettoyer le base64 si nécessaire
    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    // Appel à l'API Anthropic
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: cleanBase64
                }
              },
              {
                type: 'text',
                text: `Analyse cette image d'un produit (emballage, étiquette, ou article).

TÂCHE: Extraire UNIQUEMENT le nom commercial du produit.

RÈGLES:
- Retourne SEULEMENT le nom du produit, rien d'autre
- Inclus la marque si visible (ex: "Lait Nido 400g", "Coca-Cola 1.5L")
- Inclus le format/poids si visible
- Si plusieurs produits, prends le plus visible/central
- Si aucun nom lisible, retourne "Produit non identifié"
- Ne mets PAS de guillemets autour du nom
- Pas d'explication, juste le nom

EXEMPLES de réponses attendues:
- Lait Nido 400g
- Coca-Cola 1.5L
- Savon Palmolive Original
- Riz Uncle Bens 1kg
- Produit non identifié

Nom du produit:`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API/OCR] Erreur Anthropic:', response.status, errorData);
      return NextResponse.json({
        success: false,
        nomProduit: 'Produit non identifié',
        confidence: 'low',
        error: `Erreur API Anthropic: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    const extractedText = data.content?.[0]?.text?.trim() || '';

    // Nettoyer le résultat
    let nomProduit = extractedText
      .replace(/^["']|["']$/g, '') // Enlever guillemets
      .replace(/^Nom du produit:\s*/i, '') // Enlever préfixe si présent
      .trim();

    // Déterminer la confiance
    let confidence: 'high' | 'medium' | 'low' = 'high';

    if (!nomProduit || nomProduit.toLowerCase().includes('non identifié')) {
      confidence = 'low';
      nomProduit = 'Produit non identifié';
    } else if (nomProduit.length < 3) {
      confidence = 'low';
    } else if (nomProduit.length < 8) {
      confidence = 'medium';
    }

    return NextResponse.json({
      success: true,
      nomProduit,
      confidence,
      rawText: extractedText
    });

  } catch (error) {
    console.error('[API/OCR] Erreur:', error);
    return NextResponse.json({
      success: false,
      nomProduit: 'Produit non identifié',
      confidence: 'low',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
