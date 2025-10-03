/**
 * API Route Upload Logo - FayClick V2
 * Solution Senior : Copié du guide LOGO_UPLOAD_GUIDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

// Configuration Runtime
export const runtime = 'nodejs';
export const maxDuration = 30;

// Configuration FTP depuis .env
const FTP_CONFIG = {
  host: process.env.FTP_UPLOAD_HOST || "node260-eu.n0c.com",
  user: process.env.FTP_UPLOAD_USER || "uploadv2@fayclick.net",
  password: process.env.FTP_UPLOAD_PASSWORD || "",
  port: parseInt(process.env.FTP_UPLOAD_PORT || "21"),
  secure: process.env.FTP_UPLOAD_SECURE === 'true',
  secureOptions: { rejectUnauthorized: false }
};

const FTP_REMOTE_DIR = process.env.FTP_UPLOAD_PATH?.replace(/^\/|\/$/g, '') || 'uploads';
const BASE_URL = process.env.SITE_UPLOAD_URL || 'https://fayclick.net';

export async function POST(request: NextRequest) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('📤 [API-UPLOAD] Début upload...');
    console.log('🔧 [API-UPLOAD] Config FTP:', {
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure,
      remoteDir: FTP_REMOTE_DIR,
      baseUrl: BASE_URL
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file || !filename) {
      return NextResponse.json({ success: false, error: 'Fichier manquant' }, { status: 400 });
    }

    console.log('📁 [API-UPLOAD] Fichier:', filename, file.size, 'bytes');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('🔌 [API-UPLOAD] Connexion FTP...');
    await client.access(FTP_CONFIG);
    console.log('✅ [API-UPLOAD] Connecté');

    // La racine FTP de uploadv2@fayclick.net pointe déjà vers /public_html/uploads/
    // Donc on upload directement à la racine (pas besoin de ensureDir)
    console.log('📂 [API-UPLOAD] Répertoire racine FTP (déjà dans uploads/)');

    const stream = Readable.from(buffer);
    console.log('⬆️ [API-UPLOAD] Upload fichier:', filename);

    // Upload direct à la racine FTP (qui est déjà /public_html/uploads/)
    await client.uploadFrom(stream, filename);
    client.close();
    console.log('✅ [API-UPLOAD] Upload terminé');

    const fileUrl = `${BASE_URL}/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: filename,
      size: buffer.length
    });

  } catch (error) {
    client.close();
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ [API-UPLOAD]:', errorMessage);

    return NextResponse.json({
      success: false,
      error: 'Erreur upload',
      details: errorMessage
    }, { status: 500 });
  }
}
