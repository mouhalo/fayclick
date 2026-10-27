import { NextRequest, NextResponse } from 'next/server';
import { validateQuery, ALLOWED_APPLICATIONS } from '@/lib/sql-whitelist.mjs';

const SQL_JSONPRO_URL = 'https://api.icelabsoft.com/api/sql_jsonpro';
const TIMEOUT_MS = 35000; // Legèrement plus que le timeout client (30s)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation minimale
    if (!body.query) {
      return NextResponse.json(
        { status: 'error', message: 'Le champ query est requis' },
        { status: 400 }
      );
    }

    // VAGUE 2 (Evolution/Securisation.md) — liste blanche SQL.
    // Defense-in-depth : ce filtre protège le dev ; en prod (export statique),
    // c'est sql_jsonpro qui doit appliquer la même liste (cf. lib/sql-whitelist.mjs).
    const verdict = validateQuery(body.query);
    if (!verdict.ok) {
      console.error(
        '[PROXY SQL] Requête refusée (liste blanche):', verdict.reason,
        String(body.query).substring(0, 200)
      );
      return NextResponse.json(
        { status: 'error', message: 'Requête non autorisée (liste blanche SQL)' },
        { status: 403 }
      );
    }

    // L'application doit faire partie des applications déclarées (config/env.ts)
    const application = body.application || 'fayclick';
    if (!ALLOWED_APPLICATIONS.has(application)) {
      return NextResponse.json(
        { status: 'error', message: 'Application non autorisée' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(SQL_JSONPRO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Sécurisation sql_jsonpro : clé X-App-Key injectée si disponible.
        // Clé absente => appel sans en-tête (serveur en tuilage), jamais d'exception.
        ...(process.env.SQL_APP_KEY ? { 'X-App-Key': process.env.SQL_APP_KEY } : {}),
      },
      body: JSON.stringify({
        application,
        query: body.query,
        params: body.params || [],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Valider que la reponse est du JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[PROXY SQL] Reponse non-JSON:', text.substring(0, 200));
      return NextResponse.json(
        { status: 'error', message: `API externe a retourne du ${contentType || 'inconnu'} au lieu de JSON` },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { status: 'error', message: `Timeout de la requete (${TIMEOUT_MS}ms)` },
        { status: 504 }
      );
    }

    console.error('[PROXY SQL] Erreur:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Erreur proxy SQL' },
      { status: 500 }
    );
  }
}
