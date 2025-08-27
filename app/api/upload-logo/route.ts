/**
 * API Route pour l'upload de logo FTP
 * Gère l'upload réel des logos vers le serveur FTP
 */

import { NextRequest, NextResponse } from 'next/server';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

// Configuration FTP
const FTP_CONFIG = {
  host: "node260-eu.n0c.com",
  user: "upload@fayclick.net",
  password: "Y@L@tif129*",
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};

const FTP_REMOTE_DIR = '/';
const BASE_URL = 'https://fayclick.net';

export async function POST(request: NextRequest) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  
  try {
    console.log('🚀 [API-UPLOAD] Début upload logo');
    
    // 1. Récupérer le fichier depuis la requête
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;
    
    if (!file || !filename) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      );
    }

    // 2. Validation basique
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 5MB)' },
        { status: 400 }
      );
    }

    // 3. Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log(`📤 [API-UPLOAD] Upload de ${filename} (${buffer.length} bytes)`);

    // 4. Connexion FTP
    await client.access(FTP_CONFIG);
    console.log('✅ [API-UPLOAD] Connexion FTP établie');
    
    // 5. Créer le répertoire si nécessaire
    try {
      await client.ensureDir(FTP_REMOTE_DIR);
    } catch (dirError) {
      console.log('📁 [API-UPLOAD] Dossier existe déjà ou création:', dirError);
    }
    
    // 6. Upload du fichier
    const stream = Readable.from(buffer);
    const remotePath = `${FTP_REMOTE_DIR}${filename}`;
    
    await client.uploadFrom(stream, remotePath);
    console.log(`✅ [API-UPLOAD] Fichier uploadé: ${remotePath}`);
    
    // 7. Construire l'URL finale
    const fileUrl = `${BASE_URL}${'/uploads/'}${filename}`;
    
    // 8. Fermer la connexion FTP
    client.close();
    
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

// Configurer la taille maximale du body
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 secondes timeout