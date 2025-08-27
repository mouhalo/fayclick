import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { LoginCredentials } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation des données
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur et mot de passe requis' },
        { status: 400 }
      );
    }

    // Mapper vers le format attendu par le service
    const credentials: LoginCredentials = {
      login: body.username,
      pwd: body.password
    };

    console.log('🔐 [API Route] Tentative de connexion pour:', credentials.login);

    // Utiliser le service existant qui utilise déjà dataExtractor
    const loginResponse = await authService.login(credentials);
    
    // NOTE: Ne pas sauvegarder côté serveur - localStorage n'existe que côté client
    // La sauvegarde se fait côté client dans login/page.tsx
    
    // Retourner la réponse avec le token et les données utilisateur
    return NextResponse.json(loginResponse, { status: 200 });
    
  } catch (error: any) {
    console.error('❌ [API Route] Erreur login:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Erreur lors de la connexion',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: error.status || 500 }
    );
  }
}

// OPTIONS pour CORS si nécessaire
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}