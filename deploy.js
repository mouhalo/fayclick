import FtpDeploy from 'ftp-deploy';
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig();

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force') || args.includes('-f');
const verboseMode = args.includes('--verbose') || args.includes('-v');
const buildFirst = args.includes('--build') || args.includes('-b');

console.log('🚀 eTicket Deployment Script v2.0');
console.log('🔧 Options de déploiement:');
console.log(`   - Mode forcé: ${forceMode ? '✅ Activé' : '❌ Désactivé'}`);
console.log(`   - Mode verbose: ${verboseMode ? '✅ Activé' : '❌ Désactivé'}`);
console.log(`   - Build automatique: ${buildFirst ? '✅ Activé' : '❌ Désactivé'}`);
console.log('');

const ftpDeploy = new FtpDeploy();

// Configuration dynamique basée sur les options
const config = {
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    host: process.env.FTP_HOST,
    port: parseInt(process.env.FTP_PORT) || 21,
    localRoot: __dirname + '/out',
    remoteRoot: process.env.FTP_PATH || '/public_html/',
    include: ['*', '**/*'],
    
    // Options de comparaison et de synchronisation
    compareSize: forceMode ? false : true, // En mode forcé, ne pas comparer
    continueOnError: forceMode, // En mode forcé, continuer même en cas d'erreur
    deleteRemote: forceMode, // En mode forcé, supprimer les anciens fichiers
    
    // Exclure les fichiers non nécessaires en production
    exclude: [
        '**/*.map', 
        'node_modules/**',
        '.git/**',
        '.gitignore',
        '.env',
        '.env.*',
        'deploy.js',
        'package*.json',
        'vite.config.*',
        'tsconfig.*',
        'eslint.config.*',
        'postcss.config.*',
        'tailwind.config.*',
        'src/**',
        'public/**', // Déjà dans dist après build
        '**/*.md',
        'docs/**',
        'exemples/**',
        '**/*test*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/test-*.html'
    ],
    
    // Options de connexion
    forcePasv: true,
    secure: process.env.FTP_SECURE === 'true', // Configurable via .env
    sftp: process.env.FTP_SFTP === 'true' || false, // Support SFTP si configuré
    
    // Timeouts
    timeout: 30000,
    keepalive: 60000
};

// Fonctions utilitaires
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function countFiles(dir) {
    let count = 0;
    let totalSize = 0;
    
    if (!existsSync(dir)) return { count: 0, size: 0 };
    
    const files = readdirSync(dir, { withFileTypes: true, recursive: true });
    
    for (const file of files) {
        if (file.isFile()) {
            count++;
            try {
                const filePath = join(dir, file.name);
                totalSize += statSync(filePath).size;
            } catch (e) {
                // Ignorer les erreurs de lecture de fichier
            }
        }
    }
    
    return { count, size: totalSize };
}

// Étape 1: Build automatique si demandé
if (buildFirst) {
    console.log('🏗️ Build et export automatique en cours...');
    try {
        execSync('npm run export', { stdio: 'inherit' });
        console.log('✅ Build et export terminés avec succès');
    } catch (error) {
        console.error('❌ Erreur lors du build/export:', error.message);
        process.exit(1);
    }
}

console.log('🚀 Démarrage du déploiement eTicket v2.0...');
console.log('📋 Configuration de connexion:');
console.log('   Host:', config.host);
console.log('   User:', config.user);
console.log('   Port:', config.port);
console.log('   Local Root:', config.localRoot);
console.log('   Remote Root:', config.remoteRoot);
console.log('   FTPS/SSL:', config.secure ? '✅' : '❌');
console.log('   SFTP:', config.sftp ? '✅' : '❌');

// Vérification et analyse du dossier out
if (!existsSync(config.localRoot)) {
    console.error('❌ Erreur: Le dossier /out n\'existe pas.');
    console.log('💡 Solutions possibles:');
    console.log('   - Exécutez: npm run export');
    console.log('   - Ou utilisez: node deploy.js --build');
    process.exit(1);
}

// Analyse des fichiers à déployer
const { count: fileCount, size: totalSize } = countFiles(config.localRoot);
console.log('📊 Analyse des fichiers à déployer:');
console.log(`   - Nombre de fichiers: ${fileCount}`);
console.log(`   - Taille totale: ${formatBytes(totalSize)}`);

if (forceMode) {
    console.log('⚠️  MODE FORCÉ ACTIVÉ - Tous les fichiers seront retransférés');
}

console.log('');

// Variables de suivi
let startTime = Date.now();
let uploadedFiles = 0;
let totalFiles = 0;
let uploadedSize = 0;
let errors = [];

ftpDeploy.deploy(config)
    .then(res => {
        const duration = (Date.now() - startTime) / 1000;
        console.log('');
        console.log('🎉 Déploiement terminé avec succès!');
        console.log('📊 Statistiques finales:');
        console.log(`   - Fichiers transférés: ${uploadedFiles}/${totalFiles}`);
        console.log(`   - Taille transférée: ${formatBytes(uploadedSize)}`);
        console.log(`   - Durée: ${duration.toFixed(2)}s`);
        console.log(`   - Vitesse moyenne: ${formatBytes(uploadedSize / duration)}/s`);
        
        if (errors.length > 0) {
            console.log(`   - Erreurs rencontrées: ${errors.length}`);
            if (verboseMode) {
                console.log('📝 Détail des erreurs:');
                errors.forEach((err, i) => {
                    console.log(`   ${i + 1}. ${err}`);
                });
            }
        }
        
        console.log('');
        console.log('🌐 Votre application eTicket est maintenant en ligne!');
        console.log(`🔗 URL: ${process.env.SITE_URL || 'https://votre-domaine.com'}`);
        
        // Suggestions post-déploiement
        console.log('💡 Actions recommandées:');
        console.log('   - Testez votre application');
        console.log('   - Vérifiez les fonctionnalités critiques');
        console.log('   - Contrôlez les logs du serveur');
    })
    .catch(err => {
        console.log('');
        console.log('❌ Erreur critique lors du déploiement:');
        console.error('   Message:', err.message || err);
        console.error('   Code:', err.code || 'UNKNOWN');
        
        // Diagnostics détaillés selon le type d'erreur
        console.log('');
        console.log('🔍 Diagnostic et solutions:');
        
        if (err.code === 'ENOTFOUND') {
            console.log('   ❌ Serveur FTP introuvable');
            console.log('   💡 Solutions:');
            console.log('      - Vérifiez FTP_HOST dans .env');
            console.log('      - Testez la connectivité réseau');
            console.log('      - Vérifiez les DNS');
        } else if (err.code === 'ECONNREFUSED') {
            console.log('   ❌ Connexion refusée par le serveur');
            console.log('   💡 Solutions:');
            console.log('      - Vérifiez FTP_PORT dans .env (défaut: 21)');
            console.log('      - Vérifiez que le service FTP est actif');
            console.log('      - Contrôlez les firewalls');
        } else if (err.code === 'EAUTH' || (err.message && err.message.includes('530'))) {
            console.log('   ❌ Échec d\'authentification');
            console.log('   💡 Solutions:');
            console.log('      - Vérifiez FTP_USER et FTP_PASSWORD dans .env');
            console.log('      - Vérifiez les permissions du compte FTP');
        } else if (err.code === 'ETIMEDOUT') {
            console.log('   ❌ Timeout de connexion');
            console.log('   💡 Solutions:');
            console.log('      - Réseau lent, réessayez');
            console.log('      - Augmentez le timeout dans le script');
        } else {
            console.log('   ❌ Erreur non reconnue');
            console.log('   💡 Solutions générales:');
            console.log('      - Vérifiez votre configuration .env');
            console.log('      - Contactez votre hébergeur');
            if (verboseMode) {
                console.log('   📋 Stack trace complète:');
                console.error(err);
            }
        }
        
        console.log('');
        console.log('🔄 Pour réessayer:');
        console.log('   - Mode forcé: node deploy.js --force');
        console.log('   - Avec build: node deploy.js --build --force');
        console.log('   - Mode verbose: node deploy.js --verbose');
        
        process.exit(1);
    });

// Event listeners pour suivre le progrès
ftpDeploy.on('uploading', function(data) {
    uploadedFiles = data.transferredFileCount || 0;
    totalFiles = data.totalFilesCount || 0;
    
    const percentage = totalFiles > 0 ? Math.round((uploadedFiles / totalFiles) * 100) : 0;
    
    if (verboseMode) {
        console.log(`📤 Upload: ${data.filename} (${percentage}% - ${uploadedFiles}/${totalFiles})`);
    } else {
        // Affichage simplifié
        if (uploadedFiles % 10 === 0 || percentage >= 95) {
            console.log(`📤 Progression: ${percentage}% (${uploadedFiles}/${totalFiles} fichiers)`);
        }
    }
});

ftpDeploy.on('uploaded', function(data) {
    // Mise à jour des statistiques
    if (data.filename && data.totalFileSize) {
        uploadedSize += data.totalFileSize;
    }
    
    if (verboseMode) {
        const sizeStr = data.totalFileSize ? ` - ${formatBytes(data.totalFileSize)}` : '';
        console.log(`✅ Uploadé: ${data.filename}${sizeStr}`);
    }
});

ftpDeploy.on('log', function(data) {
    if (verboseMode) {
        console.log(`📝 Log: ${data}`);
    }
});

ftpDeploy.on('upload-error', function(data) {
    const errorMsg = `${data.filename} - ${data.err}`;
    errors.push(errorMsg);
    
    console.log(`❌ Erreur upload: ${errorMsg}`);
    
    if (forceMode) {
        console.log(`⚠️  Mode forcé: Continue malgré l'erreur`);
    }
});

// Event listener pour le début du déploiement
ftpDeploy.on('deployed', function(data) {
    console.log('🎯 Déploiement initié avec succès');
});

// Event listener pour la progression générale
ftpDeploy.on('progress', function(data) {
    if (verboseMode && data) {
        console.log(`📊 Progression générale: ${JSON.stringify(data)}`);
    }
});

// Affichage de l'aide en cas d'usage incorrect
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🚀 eTicket Deployment Script v2.0

Usage: node deploy.js [options]

Options:
  --force, -f      Mode forcé: retransfère tous les fichiers
  --verbose, -v    Mode verbose: affichage détaillé
  --build, -b      Build automatique avant déploiement
  --help, -h       Affiche cette aide

Exemples:
  node deploy.js                    # Déploiement normal
  node deploy.js --force            # Force le redéploiement complet
  node deploy.js --build --force    # Build puis déploiement forcé
  node deploy.js -v -f              # Mode verbose + forcé
  
Variables d'environnement requises (.env):
  FTP_HOST         # Serveur FTP
  FTP_USER         # Nom d'utilisateur FTP
  FTP_PASSWORD     # Mot de passe FTP
  FTP_PORT         # Port FTP (défaut: 21)
  FTP_PATH         # Chemin distant (défaut: /public_html/)
  FTP_SECURE       # FTPS/SSL (true/false)
  FTP_SFTP         # SFTP (true/false)
  SITE_URL         # URL du site (optionnel)

🌟 Profitez de votre déploiement eTicket !
    `);
    process.exit(0);
}