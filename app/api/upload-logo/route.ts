/**
 * API Route pour l'upload de logo avec FTP Direct
 * Solution conforme au guide LOGO_UPLOAD_GUIDE.md
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
  client.ftp.verbose = true;  // ✅ ACTIVER LES LOGS FTP DÉTAILLÉS

  try {
    console.log('🚀 [API-UPLOAD] ========== DÉBUT UPLOAD LOGO ==========');

    // 1. Récupérer le fichier depuis FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    console.log('📋 [API-UPLOAD] Configuration FTP:', {
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      secure: FTP_CONFIG.secure,
      remoteDir: FTP_REMOTE_DIR
    });

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
      console.error(`❌ [API-UPLOAD] Fichier trop volumineux: ${file.size} bytes (max: ${maxSize})`);
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
    console.log(`🔌 [API-UPLOAD] Tentative de connexion FTP...`);
    console.log(`   → Host: ${FTP_CONFIG.host}`);
    console.log(`   → User: ${FTP_CONFIG.user}`);
    console.log(`   → Secure: ${FTP_CONFIG.secure}`);

    await client.access(FTP_CONFIG);
    console.log('✅ [API-UPLOAD] ✓✓✓ CONNEXION FTP ÉTABLIE ✓✓✓');

    // Lister le répertoire courant
    console.log('📂 [API-UPLOAD] Vérification du répertoire courant...');
    const currentDir = await client.pwd();
    console.log(`📍 [API-UPLOAD] Répertoire actuel: ${currentDir}`);

    // 5. Créer/Vérifier le répertoire distant
    console.log(`📁 [API-UPLOAD] Vérification du répertoire distant: ${FTP_REMOTE_DIR}`);
    try {
      await client.ensureDir(FTP_REMOTE_DIR);
      console.log(`✅ [API-UPLOAD] Répertoire ${FTP_REMOTE_DIR} OK`);
    } catch (dirError) {
      console.log(`⚠️ [API-UPLOAD] Répertoire existe déjà ou créé:`, dirError);
    }

    // Vérifier à nouveau le répertoire après ensureDir
    const afterDir = await client.pwd();
    console.log(`📍 [API-UPLOAD] Répertoire après ensureDir: ${afterDir}`);

    // 6. Upload du fichier
    const stream = Readable.from(buffer);
    const remotePath = `${FTP_REMOTE_DIR}${filename}`;

    console.log('⬆️ [API-UPLOAD] ========== UPLOAD EN COURS ==========');
    console.log(`   → Chemin distant complet: ${remotePath}`);
    console.log(`   → Taille du buffer: ${buffer.length} bytes`);
    console.log(`   → Type MIME: ${file.type}`);

    await client.uploadFrom(stream, remotePath);

    console.log('✅ [API-UPLOAD] ✓✓✓ FICHIER UPLOADÉ AVEC SUCCÈS ✓✓✓');

    // Vérifier que le fichier existe sur le serveur
    console.log('🔍 [API-UPLOAD] Vérification de l\'existence du fichier...');
    try {
      const fileList = await client.list(FTP_REMOTE_DIR);
      console.log('📋 [API-UPLOAD] Fichiers dans le répertoire distant:');
      fileList.forEach(item => {
        console.log(`   - ${item.name} (${item.size} bytes) [${item.type === 1 ? 'FILE' : 'DIR'}]`);
      });

      const uploadedFile = fileList.find(item => item.name === filename);
      if (uploadedFile) {
        console.log('✅ [API-UPLOAD] ✓ Fichier trouvé sur le serveur:', {
          name: uploadedFile.name,
          size: uploadedFile.size,
          date: uploadedFile.modifiedAt
        });
      } else {
        console.warn('⚠️ [API-UPLOAD] Fichier NON trouvé dans la liste du répertoire distant!');
      }
    } catch (listError) {
      console.error('❌ [API-UPLOAD] Erreur lors de la vérification du fichier:', listError);
    }

    // 7. Construire l'URL finale
    const fileUrl = `${BASE_URL}/uploads/${filename}`;
    console.log('🌐 [API-UPLOAD] ========== URL PUBLIQUE ==========');
    console.log(`   → URL complète: ${fileUrl}`);
    console.log(`   → Base URL: ${BASE_URL}`);
    console.log(`   → Chemin: /uploads/${filename}`);

    // 8. Fermer la connexion
    console.log('🔌 [API-UPLOAD] Fermeture de la connexion FTP...');
    client.close();
    console.log('✅ [API-UPLOAD] Connexion fermée');

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
    console.error('❌ [API-UPLOAD] Type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ [API-UPLOAD] Message:', error instanceof Error ? error.message : String(error));
    console.error('❌ [API-UPLOAD] Stack:', error instanceof Error ? error.stack : 'N/A');

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