/**
 * API Route pour l'upload de logo avec FTP Direct
 * Solution compatible avec output: 'standalone'
 */

import { NextRequest, NextResponse } from 'next/server';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

// Configuration FTP pour UPLOAD de logos/photos (utilise FTP_UPLOAD_*)
const FTP_CONFIG = {
  host: process.env.FTP_UPLOAD_HOST || "node260-eu.n0c.com",
  user: process.env.FTP_UPLOAD_USER || "uploadv2@fayclick.net",
  password: process.env.FTP_UPLOAD_PASSWORD,
  port: parseInt(process.env.FTP_UPLOAD_PORT || '21'),
  secure: process.env.FTP_UPLOAD_SECURE === 'true',
  secureOptions: { rejectUnauthorized: false }
};

const FTP_REMOTE_DIR = process.env.FTP_UPLOAD_PATH || '/uploads/';
const BASE_URL = process.env.SITE_UPLOAD_URL || 'https://fayclick.net';

// Configuration Next.js
export const runtime = 'nodejs';      // Runtime Node.js (requis pour basic-ftp)
export const maxDuration = 30;        // 30 secondes timeout

export async function POST(request: NextRequest) {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log('🚀 [API-UPLOAD] ========== DÉBUT UPLOAD LOGO ==========');

    // 1. Récupérer le fichier depuis FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file || !filename) {
      console.error('❌ [API-UPLOAD] Fichier ou nom de fichier manquant');
      return NextResponse.json(
        {
          error: 'Fichier manquant',
          success: false
        },
        { status: 400 }
      );
    }

    console.log(`📤 [API-UPLOAD] Fichier reçu:`, {
      filename,
      size: file.size,
      type: file.type
    });

    // 2. Validation serveur
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error(`❌ [API-UPLOAD] Fichier trop volumineux: ${file.size} bytes`);
      return NextResponse.json(
        {
          error: 'Fichier trop volumineux (max 5MB)',
          success: false
        },
        { status: 400 }
      );
    }

    // 3. Convertir File → Buffer
    console.log('🔄 [API-UPLOAD] Conversion File → Buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`✅ [API-UPLOAD] Buffer créé: ${buffer.length} bytes`);

    // 4. Connexion FTP
    console.log(`🔌 [API-UPLOAD] Connexion FTP à ${FTP_CONFIG.host}...`);
    await client.access(FTP_CONFIG);
    console.log('✅ [API-UPLOAD] Connexion FTP établie');

    // 5. Créer/Vérifier le répertoire distant
    console.log(`📁 [API-UPLOAD] Vérification du répertoire: ${FTP_REMOTE_DIR}`);
    try {
      await client.ensureDir(FTP_REMOTE_DIR);
      console.log(`✅ [API-UPLOAD] Répertoire ${FTP_REMOTE_DIR} OK`);
    } catch (dirError) {
      console.log(`⚠️ [API-UPLOAD] Répertoire existe déjà`);
    }

    // 6. Upload du fichier
    const stream = Readable.from(buffer);
    const remotePath = `${FTP_REMOTE_DIR}${filename}`;

    console.log('⬆️ [API-UPLOAD] Upload en cours...');
    console.log(`   → Chemin distant: ${remotePath}`);

    await client.uploadFrom(stream, remotePath);
    console.log('✅ [API-UPLOAD] Fichier uploadé avec succès');

    // 7. Construire l'URL finale
    const fileUrl = `${BASE_URL}/uploads/${filename}`;
    console.log(`🌐 [API-UPLOAD] URL publique: ${fileUrl}`);

    // 8. Fermer la connexion
    client.close();
    console.log('🎉 [API-UPLOAD] ========== UPLOAD TERMINÉ ==========');

    // 9. Retourner le succès
    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: filename,
      size: buffer.length
    });

  } catch (error) {
    console.error('❌ [API-UPLOAD] ========== ERREUR CRITIQUE ==========');
    console.error('❌ [API-UPLOAD] Message:', error instanceof Error ? error.message : String(error));

    client.close();

    return NextResponse.json(
      {
        error: 'Erreur lors de l\'upload FTP',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      },
      { status: 500 }
    );
  }
}
