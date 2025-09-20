#!/usr/bin/env node

/**
 * FayClick V2 - Script de Déploiement Moderne
 * Optimisé pour Next.js 15 avec App Router et Export Statique
 *
 * 🚨 IMPORTANT: Consultez TOUJOURS notre guide avant déploiement !
 *
 * 📖 Documentation requise:
 *   - GUIDE_REFERENCE_RAPIDE.md     (⚡ Lecture 2 min - OBLIGATOIRE)
 *   - CHECKLIST_DEPLOIEMENT.md      (📋 Checklist complète)
 *   - GUIDE_DEPLOIEMENT_EXPERT.md   (🎓 Guide technique détaillé)
 *
 * ✅ Validation pré-déploiement:
 *   1. Pages factures publiques testées localement
 *   2. ConditionalAuthProvider validé (pages publiques SANS auth)
 *   3. Tests URLs critiques: /facture?token=XXX
 *   4. Configuration next.config.ts: output:'export'
 *
 * 🌐 Tests post-déploiement obligatoires:
 *   - https://v2.fayclick.net (site principal)
 *   - https://v2.fayclick.net/facture?token=ODktMzIz (factures publiques)
 *   - https://v2.fayclick.net/dashboard (authentification privée)
 *
 * @version 3.0.0
 * @author Expert Senior FayClick
 * @date 2025-09-20
 */

import { spawn, execSync } from 'child_process';
import { readFileSync, existsSync, statSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import FtpDeploy from 'ftp-deploy';
import { config } from 'dotenv';

// Configuration ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger variables d'environnement
config();

// Configuration des couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Classe utilitaire pour les logs professionnels
class Logger {
  static info(message, details = '') {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}${details ? ' ' + colors.cyan + details + colors.reset : ''}`);
  }

  static success(message, details = '') {
    console.log(`${colors.green}✅${colors.reset} ${message}${details ? ' ' + colors.cyan + details + colors.reset : ''}`);
  }

  static warning(message, details = '') {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}${details ? ' ' + colors.yellow + details + colors.reset : ''}`);
  }

  static error(message, details = '') {
    console.log(`${colors.red}❌${colors.reset} ${message}${details ? ' ' + colors.red + details + colors.reset : ''}`);
  }

  static step(step, message) {
    console.log(`${colors.magenta}${step}${colors.reset} ${colors.bright}${message}${colors.reset}`);
  }

  static header(title) {
    const separator = '═'.repeat(60);
    console.log(`\n${colors.cyan}${separator}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright} 🚀 ${title}${colors.reset}`);
    console.log(`${colors.cyan}${separator}${colors.reset}\n`);
  }
}

// Classe principale de déploiement
class FayClickDeployer {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = {
      force: this.args.includes('--force') || this.args.includes('-f'),
      verbose: this.args.includes('--verbose') || this.args.includes('-v'),
      build: this.args.includes('--build') || this.args.includes('-b'),
      help: this.args.includes('--help') || this.args.includes('-h')
    };
    
    this.startTime = Date.now();
    this.stats = {
      filesUploaded: 0,
      totalSize: 0,
      errors: []
    };
  }

  // Afficher l'aide
  showHelp() {
    console.log(`
${colors.cyan}🚀 FayClick V2 - Script de Déploiement Moderne${colors.reset}
${colors.bright}Optimisé pour Next.js 15 avec App Router${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node deploy.mjs [options]

${colors.yellow}Options:${colors.reset}
  -b, --build      Build Next.js avant déploiement
  -f, --force      Mode forcé (retransférer tous les fichiers)
  -v, --verbose    Mode verbose (logs détaillés)
  -h, --help       Afficher cette aide

${colors.yellow}Exemples:${colors.reset}
  node deploy.mjs --build --force    # Build + déploiement complet
  node deploy.mjs --verbose          # Déploiement avec logs détaillés
  node deploy.mjs -b -v -f           # Build + verbose + forcé

${colors.yellow}Variables d'environnement requises:${colors.reset}
  FTP_HOST         Serveur FTP/SFTP
  FTP_USER         Nom d'utilisateur
  FTP_PASSWORD     Mot de passe
  FTP_PORT         Port (défaut: 21)
  FTP_PATH         Chemin distant (défaut: /public_html/)
  FTP_SECURE       FTPS/SSL (true/false)
  SITE_URL         URL du site web

${colors.green}✨ Développé avec expertise pour FayClick V2${colors.reset}
`);
  }

  // Validation de l'environnement
  validateEnvironment() {
    Logger.step('🔍', 'Validation de l\'environnement...');
    
    // Vérifier Node.js
    const nodeVersion = process.version;
    Logger.info('Version Node.js:', nodeVersion);
    
    if (parseInt(nodeVersion.slice(1)) < 18) {
      throw new Error('Node.js 18+ requis');
    }
    
    // Vérifier package.json
    if (!existsSync(join(__dirname, 'package.json'))) {
      throw new Error('package.json non trouvé');
    }
    
    // Vérifier configuration Next.js
    if (!existsSync(join(__dirname, 'next.config.ts')) && !existsSync(join(__dirname, 'next.config.js'))) {
      throw new Error('Configuration Next.js non trouvée');
    }
    
    // Vérifier variables d'environnement FTP
    const requiredEnvs = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD'];
    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missingEnvs.join(', ')}`);
    }
    
    Logger.success('Environnement validé');
  }

  // Build Next.js avec gestion d'erreurs robuste
  async buildNextjs() {
    Logger.step('🏗️', 'Build Next.js en cours...');
    
    // Nettoyer les anciens builds
    const cleanDirs = ['.next', 'out'];
    cleanDirs.forEach(dir => {
      const dirPath = join(__dirname, dir);
      if (existsSync(dirPath)) {
        Logger.info(`Nettoyage du dossier: ${dir}`);
        rmSync(dirPath, { recursive: true, force: true });
      }
    });

    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: __dirname,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: process.platform === 'win32'
      });

      let buildOutput = '';
      let buildErrors = '';

      if (!this.options.verbose) {
        buildProcess.stdout?.on('data', (data) => {
          buildOutput += data.toString();
        });

        buildProcess.stderr?.on('data', (data) => {
          buildErrors += data.toString();
        });
      }

      // Timeout de sécurité pour éviter les blocages
      const buildTimeout = setTimeout(() => {
        buildProcess.kill('SIGKILL');
        reject(new Error('Build timeout (5 minutes) - processus arrêté'));
      }, 5 * 60 * 1000); // 5 minutes

      buildProcess.on('close', (code) => {
        clearTimeout(buildTimeout);
        
        if (code === 0) {
          Logger.success('Build Next.js terminé avec succès');
          
          // Vérifier que le dossier out existe
          const outDir = join(__dirname, 'out');
          if (!existsSync(outDir)) {
            reject(new Error('Dossier /out non généré après build'));
            return;
          }
          
          // Analyser le contenu
          const stats = this.analyzeOutputDir(outDir);
          Logger.info(`Build généré: ${stats.files} fichiers (${this.formatBytes(stats.size)})`);
          resolve();
        } else {
          Logger.error('Échec du build Next.js');
          if (buildErrors && !this.options.verbose) {
            Logger.error('Erreurs de build:', buildErrors);
          }
          reject(new Error(`Build failed with code ${code}`));
        }
      });

      buildProcess.on('error', (err) => {
        clearTimeout(buildTimeout);
        Logger.error('Erreur lors du lancement du build:', err.message);
        reject(err);
      });
    });
  }

  // Analyser le dossier de sortie
  analyzeOutputDir(dir) {
    let files = 0;
    let size = 0;

    const scanDir = (currentDir) => {
      try {
        const items = readdirSync(currentDir, { withFileTypes: true });
        for (const item of items) {
          const itemPath = join(currentDir, item.name);
          if (item.isDirectory()) {
            scanDir(itemPath);
          } else if (item.isFile()) {
            files++;
            try {
              size += statSync(itemPath).size;
            } catch (e) {
              // Ignorer les erreurs de lecture de fichier
            }
          }
        }
      } catch (e) {
        Logger.warning(`Erreur lecture dossier: ${currentDir}`);
      }
    };

    if (existsSync(dir)) {
      scanDir(dir);
    }

    return { files, size };
  }

  // Configuration FTP optimisée pour Next.js
  getFtpConfig() {
    const outDir = join(__dirname, 'out');
    
    return {
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      host: process.env.FTP_HOST,
      port: parseInt(process.env.FTP_PORT) || 21,
      localRoot: outDir,
      remoteRoot: process.env.FTP_PATH || '/public_html/',
      include: ['*', '**/*'],
      
      // Optimisations spécifiques Next.js
      compareSize: !this.options.force,
      continueOnError: true,
      deleteRemote: this.options.force,
      
      // Exclusions pour Next.js export
      exclude: [
        '**/*.map',
        '**/.*',
        '**/_next/static/**/*.js.map',
        '**/_next/static/**/*.css.map'
      ],
      
      // Options de connexion
      forcePasv: true,
      secure: process.env.FTP_SECURE === 'true',
      timeout: 60000,
      keepalive: 120000
    };
  }

  // Déploiement FTP avec monitoring avancé
  async deploy() {
    Logger.step('🚀', 'Déploiement FTP en cours...');
    
    const ftpConfig = this.getFtpConfig();
    const ftpDeploy = new FtpDeploy();
    
    // Validation de la configuration
    if (!existsSync(ftpConfig.localRoot)) {
      throw new Error(`Dossier source non trouvé: ${ftpConfig.localRoot}`);
    }
    
    Logger.info('Configuration FTP:');
    Logger.info(`  Host: ${ftpConfig.host}:${ftpConfig.port}`);
    Logger.info(`  User: ${ftpConfig.user}`);
    Logger.info(`  Local: ${ftpConfig.localRoot}`);
    Logger.info(`  Remote: ${ftpConfig.remoteRoot}`);
    Logger.info(`  Secure: ${ftpConfig.secure ? 'FTPS' : 'FTP'}`);
    
    return new Promise((resolve, reject) => {
      // Event listeners pour monitoring
      ftpDeploy.on('uploading', (data) => {
        this.stats.filesUploaded = data.transferredFileCount || 0;
        const totalFiles = data.totalFilesCount || 0;
        const progress = totalFiles > 0 ? Math.round((this.stats.filesUploaded / totalFiles) * 100) : 0;
        
        if (this.options.verbose) {
          Logger.info(`📤 Upload: ${data.filename} (${progress}%)`);
        } else if (this.stats.filesUploaded % 10 === 0 || progress >= 95) {
          Logger.info(`📤 Progression: ${progress}% (${this.stats.filesUploaded}/${totalFiles})`);
        }
      });
      
      ftpDeploy.on('uploaded', (data) => {
        if (data.totalFileSize) {
          this.stats.totalSize += data.totalFileSize;
        }
      });
      
      ftpDeploy.on('upload-error', (data) => {
        const error = `${data.filename}: ${data.err}`;
        this.stats.errors.push(error);
        Logger.warning(`Upload error: ${error}`);
      });
      
      // Démarrer le déploiement
      ftpDeploy.deploy(ftpConfig)
        .then((res) => {
          Logger.success('Déploiement FTP terminé');
          resolve(res);
        })
        .catch((err) => {
          Logger.error('Erreur de déploiement:', err.message);
          
          // Diagnostics d'erreur
          this.diagnoseDeploymentError(err);
          reject(err);
        });
    });
  }

  // Diagnostic des erreurs de déploiement
  diagnoseDeploymentError(err) {
    Logger.step('🔍', 'Diagnostic de l\'erreur...');
    
    const solutions = {
      'ENOTFOUND': [
        'Vérifiez FTP_HOST dans le fichier .env',
        'Testez la connectivité réseau',
        'Vérifiez la résolution DNS'
      ],
      'ECONNREFUSED': [
        'Vérifiez FTP_PORT (défaut: 21)',
        'Le service FTP est-il actif ?',
        'Problème de firewall ?'
      ],
      'EAUTH': [
        'Vérifiez FTP_USER et FTP_PASSWORD',
        'Permissions du compte FTP',
        'Compte FTP actif ?'
      ]
    };
    
    const errorCode = err.code || 'UNKNOWN';
    const solutionList = solutions[errorCode];
    
    if (solutionList) {
      Logger.info(`Solutions pour l'erreur ${errorCode}:`);
      solutionList.forEach((solution, index) => {
        Logger.info(`  ${index + 1}. ${solution}`);
      });
    } else {
      Logger.warning('Erreur non reconnue, vérifiez la configuration FTP');
    }
  }

  // Formatage des tailles de fichiers
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Résumé final du déploiement
  showSummary() {
    const duration = (Date.now() - this.startTime) / 1000;
    const speed = this.stats.totalSize > 0 ? this.formatBytes(this.stats.totalSize / duration) + '/s' : 'N/A';
    
    Logger.header('📊 Résumé du Déploiement');
    Logger.success(`Fichiers déployés: ${this.stats.filesUploaded}`);
    Logger.success(`Taille transférée: ${this.formatBytes(this.stats.totalSize)}`);
    Logger.success(`Durée: ${duration.toFixed(1)}s`);
    Logger.success(`Vitesse: ${speed}`);
    
    if (this.stats.errors.length > 0) {
      Logger.warning(`Erreurs: ${this.stats.errors.length}`);
      if (this.options.verbose) {
        this.stats.errors.forEach((error, index) => {
          Logger.warning(`  ${index + 1}. ${error}`);
        });
      }
    }
    
    const siteUrl = process.env.SITE_URL || 'https://votre-domaine.com';
    Logger.info(`🌐 Site web: ${siteUrl}`);
    Logger.success('🎉 FayClick V2 déployé avec succès !');
  }

  // Rappel documentation obligatoire
  showDocumentationReminder() {
    Logger.header('📚 Documentation Obligatoire');
    Logger.warning('🚨 IMPORTANT: Avez-vous consulté notre guide de déploiement ?');
    Logger.info('');
    Logger.info('📖 Guides requis AVANT déploiement:');
    Logger.info('  1. 📋 CHECKLIST_DEPLOIEMENT.md      (⚡ Lecture 2 min)');
    Logger.info('  2. 🚀 GUIDE_REFERENCE_RAPIDE.md     (⚡ Référence express)');
    Logger.info('  3. 🎓 GUIDE_DEPLOIEMENT_EXPERT.md   (📚 Guide technique complet)');
    Logger.info('');
    Logger.info('✅ Points critiques à vérifier:');
    Logger.info('  - Pages factures publiques testées: /facture?token=XXX');
    Logger.info('  - ConditionalAuthProvider validé (pas d\'auth sur pages publiques)');
    Logger.info('  - Configuration next.config.ts: output:\'export\'');
    Logger.info('  - Tests post-déploiement prêts');
    Logger.info('');
    Logger.success('💡 Ces guides vous éviteront les erreurs de déploiement courantes !');
    Logger.info('');
  }

  // Méthode principale d'exécution
  async run() {
    try {
      Logger.header('FayClick V2 - Déploiement Professionnel');

      if (this.options.help) {
        this.showHelp();
        return;
      }

      // Rappel documentation obligatoire
      this.showDocumentationReminder();

      Logger.info('Options activées:');
      Logger.info(`  Build automatique: ${this.options.build ? '✅' : '❌'}`);
      Logger.info(`  Mode forcé: ${this.options.force ? '✅' : '❌'}`);
      Logger.info(`  Mode verbose: ${this.options.verbose ? '✅' : '❌'}`);

      // Étapes du déploiement
      this.validateEnvironment();
      
      if (this.options.build) {
        await this.buildNextjs();
      } else {
        // Vérifier que le build existe
        const outDir = join(__dirname, 'out');
        if (!existsSync(outDir)) {
          Logger.warning('Aucun build trouvé. Utilisez --build pour construire automatiquement.');
          throw new Error('Dossier /out manquant. Exécutez npm run build ou utilisez --build');
        }
        
        const stats = this.analyzeOutputDir(outDir);
        Logger.info(`Build existant: ${stats.files} fichiers (${this.formatBytes(stats.size)})`);
      }
      
      await this.deploy();
      this.showSummary();
      
    } catch (error) {
      Logger.error('❌ Déploiement échoué:', error.message);
      
      Logger.info('\n🔄 Pour réessayer:');
      Logger.info('  node deploy.mjs --build --force    # Build + déploiement forcé');
      Logger.info('  node deploy.mjs --verbose          # Mode diagnostic');
      
      process.exit(1);
    }
  }
}

// Point d'entrée principal
const deployer = new FayClickDeployer();
deployer.run();