/**
 * Script de Nettoyage Complet du Serveur FTP
 * Supprime TOUS les fichiers sur le serveur avant un redéploiement frais
 *
 * ⚠️  ATTENTION: Ce script supprime TOUT le contenu du serveur !
 *
 * Utilisation: node scripts/clean-server.mjs
 */

import { Client } from 'basic-ftp';
import { config } from 'dotenv';

// Charger variables d'environnement
config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(emoji, message, color = colors.blue) {
  console.log(`${color}${emoji}${colors.reset} ${message}`);
}

function logSuccess(message) {
  log('✅', message, colors.green);
}

function logError(message) {
  log('❌', message, colors.red);
}

function logWarning(message) {
  log('⚠️ ', message, colors.yellow);
}

function logInfo(message) {
  log('ℹ️ ', message, colors.blue);
}

async function deleteDirectory(client, path) {
  try {
    const list = await client.list(path);

    for (const item of list) {
      const fullPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`;

      if (item.isDirectory) {
        // Récursion pour les sous-dossiers
        await deleteDirectory(client, fullPath);
        await client.removeDir(fullPath);
        logInfo(`📁 Dossier supprimé: ${fullPath}`);
      } else {
        // Supprimer fichier
        await client.remove(fullPath);
        logInfo(`🗑️  Fichier supprimé: ${fullPath}`);
      }
    }
  } catch (error) {
    if (error.code !== 550) { // 550 = Directory not found (OK)
      throw error;
    }
  }
}

async function cleanServer() {
  const client = new Client();
  client.ftp.verbose = false;

  try {
    console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset);
    console.log(colors.cyan + colors.bright + ' 🧹 Nettoyage Complet du Serveur FTP' + colors.reset);
    console.log(colors.cyan + '═'.repeat(60) + colors.reset + '\n');

    // Configuration FTP pour NETTOYAGE du SITE (utilise FTP_* = userv2)
    // ⚠️  Nettoie uniquement v2.fayclick.net (PAS fayclick.net/uploads)
    const ftpConfig = {
      host: process.env.FTP_HOST || 'node260-eu.n0c.com',
      user: process.env.FTP_USER || 'userv2@fayclick.net',  // userv2 (site)
      password: process.env.FTP_PASSWORD,
      port: parseInt(process.env.FTP_PORT || '21'),
      secure: false,
    };

    logWarning('ATTENTION: Ce script va supprimer TOUS les fichiers du serveur !');
    logWarning('Cible: Site v2.fayclick.net (PAS les uploads sur fayclick.net)');
    logInfo('Configuration FTP:');
    logInfo(`  Host: ${ftpConfig.host}:${ftpConfig.port}`);
    logInfo(`  User: ${ftpConfig.user}`);
    logInfo(`  Remote: ${process.env.FTP_SITE_PATH || '/'}`);

    console.log('');
    logInfo('Connexion au serveur FTP...');

    // Connexion
    await client.access(ftpConfig);
    logSuccess('Connecté au serveur FTP');

    // Changer vers le dossier remote root (site v2.fayclick.net)
    const remoteRoot = process.env.FTP_SITE_PATH || '/';
    if (remoteRoot !== '/') {
      await client.cd(remoteRoot);
      logInfo(`Dossier actif: ${remoteRoot}`);
    }

    // Lister le contenu actuel
    logInfo('Analyse du contenu actuel...');
    const list = await client.list();

    if (list.length === 0) {
      logWarning('Le serveur est déjà vide !');
      await client.close();
      return;
    }

    logInfo(`${list.length} éléments trouvés à supprimer`);
    console.log('');

    // Supprimer tout le contenu
    logInfo('🗑️  Suppression en cours...');
    let fileCount = 0;
    let dirCount = 0;

    for (const item of list) {
      const fullPath = `/${item.name}`;

      if (item.isDirectory) {
        await deleteDirectory(client, fullPath);
        await client.removeDir(fullPath);
        dirCount++;
        logInfo(`📁 Dossier principal supprimé: ${fullPath}`);
      } else {
        await client.remove(fullPath);
        fileCount++;
        logInfo(`🗑️  Fichier supprimé: ${fullPath}`);
      }
    }

    console.log('');
    logSuccess('Nettoyage terminé !');
    logInfo(`Statistiques:`);
    logInfo(`  Fichiers supprimés: ${fileCount}`);
    logInfo(`  Dossiers supprimés: ${dirCount}`);

    await client.close();

    console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset);
    console.log(colors.cyan + colors.bright + ' ✅ Serveur nettoyé avec succès !' + colors.reset);
    console.log(colors.cyan + '═'.repeat(60) + colors.reset + '\n');

    logInfo('Prochaine étape: npm run deploy:build');

  } catch (error) {
    logError('Erreur lors du nettoyage:');
    console.error(error);
    process.exit(1);
  }
}

// Exécution
cleanServer().catch((error) => {
  logError('Erreur fatale:');
  console.error(error);
  process.exit(1);
});
