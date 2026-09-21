#!/usr/bin/env node

/**
 * FayClick V2 - Script de Déploiement Multi-Serveurs
 * Build unique + déploiement sur v2.fayclick.net ET fayclick.com
 *
 * Usage:
 *   node deploy.mjs --build --force          # Build + déploiement 2 serveurs
 *   node deploy.mjs --server v2              # Déployer sur v2.fayclick.net uniquement
 *   node deploy.mjs --server com             # Déployer sur fayclick.com uniquement
 *   node deploy.mjs --build --verbose        # Build + déploiement avec logs détaillés
 *
 * @version 4.0.0
 * @date 2026-02-21
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import FtpDeploy from 'ftp-deploy';
import { Client as FtpClient } from 'basic-ftp';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger .env principal
config();

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

class Logger {
  static info(msg, d = '') { console.log(`${colors.blue}ℹ${colors.reset} ${msg}${d ? ' ' + colors.cyan + d + colors.reset : ''}`); }
  static success(msg, d = '') { console.log(`${colors.green}✅${colors.reset} ${msg}${d ? ' ' + colors.cyan + d + colors.reset : ''}`); }
  static warning(msg, d = '') { console.log(`${colors.yellow}⚠${colors.reset} ${msg}${d ? ' ' + colors.yellow + d + colors.reset : ''}`); }
  static error(msg, d = '') { console.log(`${colors.red}❌${colors.reset} ${msg}${d ? ' ' + colors.red + d + colors.reset : ''}`); }
  static step(icon, msg) { console.log(`${colors.magenta}${icon}${colors.reset} ${colors.bright}${msg}${colors.reset}`); }
  static header(title) {
    const sep = '═'.repeat(60);
    console.log(`\n${colors.cyan}${sep}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright} 🚀 ${title}${colors.reset}`);
    console.log(`${colors.cyan}${sep}${colors.reset}\n`);
  }
}

// ══════════════════════════════════════════════════════════
// Configuration des serveurs
// ══════════════════════════════════════════════════════════

const SERVERS = {
  v2: {
    name: 'v2.fayclick.net',
    envFile: null, // utilise .env principal (déjà chargé)
    host: () => process.env.FTP_HOST,
    user: () => process.env.FTP_USER,
    password: () => process.env.FTP_PASSWORD,
    port: () => parseInt(process.env.FTP_PORT) || 21,
    remotePath: () => process.env.FTP_SITE_PATH || '/',
    secure: () => process.env.FTP_SECURE === 'true',
    siteUrl: () => process.env.SITE_URL || 'https://v2.fayclick.net'
  },
  com: {
    name: 'fayclick.com',
    envFile: '.env.fayclick-com',
    host: null, user: null, password: null, port: null,
    remotePath: null, secure: null, siteUrl: null
  }
};

// Charger la config du serveur fayclick.com depuis son .env dédié
function loadServerComConfig() {
  const envPath = join(__dirname, '.env.fayclick-com');
  if (!existsSync(envPath)) {
    throw new Error('Fichier .env.fayclick-com introuvable pour le serveur fayclick.com');
  }
  const envContent = readFileSync(envPath, 'utf-8');
  const vars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    vars[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  });

  SERVERS.com.host = () => vars.FTP_HOST;
  SERVERS.com.user = () => vars.FTP_USER;
  SERVERS.com.password = () => vars.FTP_PASSWORD;
  SERVERS.com.port = () => parseInt(vars.FTP_PORT) || 21;
  SERVERS.com.remotePath = () => vars.FTP_SITE_PATH || '/public_html/';
  SERVERS.com.secure = () => vars.FTP_SECURE === 'true';
  SERVERS.com.siteUrl = () => vars.SITE_URL || 'https://fayclick.com';
}

// ══════════════════════════════════════════════════════════
// Classe principale
// ══════════════════════════════════════════════════════════

class FayClickDeployer {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = {
      force: this.args.includes('--force') || this.args.includes('-f'),
      verbose: this.args.includes('--verbose') || this.args.includes('-v'),
      build: this.args.includes('--build') || this.args.includes('-b'),
      help: this.args.includes('--help') || this.args.includes('-h'),
      server: this.getServerArg()
    };
    this.startTime = Date.now();
    this.serverResults = [];
  }

  getServerArg() {
    const idx = this.args.findIndex(a => a === '--server' || a === '-s');
    if (idx === -1) return 'all';
    const val = this.args[idx + 1];
    if (!val || !['v2', 'com', 'all'].includes(val)) {
      return 'all';
    }
    return val;
  }

  getTargetServers() {
    if (this.options.server === 'all') return ['v2', 'com'];
    return [this.options.server];
  }

  showHelp() {
    console.log(`
${colors.cyan}🚀 FayClick V2 - Déploiement Multi-Serveurs${colors.reset}
${colors.bright}Build unique + déploiement v2.fayclick.net & fayclick.com${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node deploy.mjs [options]

${colors.yellow}Options:${colors.reset}
  -b, --build              Build Next.js avant déploiement
  -f, --force              Mode forcé (retransférer tous les fichiers)
  -v, --verbose            Mode verbose (logs détaillés)
  -s, --server <v2|com>    Déployer sur un seul serveur (défaut: les 2)
  -h, --help               Afficher cette aide

${colors.yellow}Serveurs:${colors.reset}
  v2     v2.fayclick.net   (config .env)
  com    fayclick.com      (config .env.fayclick-com)

${colors.yellow}Exemples:${colors.reset}
  node deploy.mjs --build --force          # Build + déploiement 2 serveurs
  node deploy.mjs --server v2              # v2.fayclick.net uniquement
  node deploy.mjs --server com             # fayclick.com uniquement
  node deploy.mjs -b -v -s v2             # Build + verbose + v2 uniquement

${colors.yellow}Scripts npm:${colors.reset}
  npm run deploy:build                     # Build + 2 serveurs (forcé)
  npm run deploy:v2                        # v2.fayclick.net uniquement
  npm run deploy:com                       # fayclick.com uniquement

${colors.green}✨ FayClick V2 - Déploiement Production${colors.reset}
`);
  }

  validateEnvironment() {
    Logger.step('🔍', 'Validation de l\'environnement...');

    const nodeVersion = process.version;
    Logger.info('Version Node.js:', nodeVersion);
    if (parseInt(nodeVersion.slice(1)) < 18) throw new Error('Node.js 18+ requis');

    if (!existsSync(join(__dirname, 'package.json'))) throw new Error('package.json non trouvé');

    if (!existsSync(join(__dirname, 'next.config.ts')) &&
        !existsSync(join(__dirname, 'next.config.js')) &&
        !existsSync(join(__dirname, 'next.config.mjs'))) {
      throw new Error('Configuration Next.js non trouvée');
    }

    // Valider configs serveurs ciblés
    const targets = this.getTargetServers();

    if (targets.includes('v2')) {
      const missing = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD'].filter(e => !process.env[e]);
      if (missing.length > 0) throw new Error(`v2.fayclick.net - Variables manquantes: ${missing.join(', ')}`);
    }

    if (targets.includes('com')) {
      loadServerComConfig();
      if (!SERVERS.com.host() || !SERVERS.com.user() || !SERVERS.com.password()) {
        throw new Error('fayclick.com - Config manquante dans .env.fayclick-com');
      }
    }

    Logger.success('Environnement validé');
  }

  async buildNextjs() {
    Logger.step('🏗️', 'Build Next.js en cours...');

    ['.next', 'out'].forEach(dir => {
      const p = join(__dirname, dir);
      if (existsSync(p)) {
        Logger.info(`Nettoyage: ${dir}`);
        try { rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
        catch { Logger.warning(`Impossible de supprimer ${dir}, le build continuera...`); }
      }
    });

    return new Promise((resolve, reject) => {
      const proc = spawn('npm', ['run', 'build'], {
        cwd: __dirname,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: process.platform === 'win32'
      });

      let buildErrors = '';
      if (!this.options.verbose) {
        proc.stdout?.on('data', () => {});
        proc.stderr?.on('data', d => { buildErrors += d.toString(); });
      }

      const timeout = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('Build timeout (5 min)')); }, 5 * 60 * 1000);

      proc.on('close', code => {
        clearTimeout(timeout);
        if (code === 0) {
          const outDir = join(__dirname, 'out');
          if (!existsSync(outDir)) { reject(new Error('Dossier /out non généré')); return; }
          const stats = this.analyzeOutputDir(outDir);
          Logger.success(`Build terminé: ${stats.files} fichiers (${this.formatBytes(stats.size)})`);
          resolve();
        } else {
          if (buildErrors) Logger.error('Erreurs:', buildErrors.slice(-500));
          reject(new Error(`Build failed (code ${code})`));
        }
      });

      proc.on('error', err => { clearTimeout(timeout); reject(err); });
    });
  }

  analyzeOutputDir(dir) {
    let files = 0, size = 0;
    const scan = (d) => {
      try {
        for (const item of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, item.name);
          if (item.isDirectory()) scan(p);
          else if (item.isFile()) { files++; try { size += statSync(p).size; } catch {} }
        }
      } catch {}
    };
    if (existsSync(dir)) scan(dir);
    return { files, size };
  }

  getFtpConfig(serverKey) {
    const srv = SERVERS[serverKey];
    return {
      user: srv.user(),
      password: srv.password(),
      host: srv.host(),
      port: srv.port(),
      localRoot: join(__dirname, 'out'),
      remoteRoot: srv.remotePath(),
      include: ['*', '**/*', '.*'],
      compareSize: !this.options.force,
      continueOnError: true,
      deleteRemote: this.options.force,
      exclude: ['**/*.map', '**/_next/static/**/*.js.map', '**/_next/static/**/*.css.map'],
      forcePasv: true,
      secure: srv.secure(),
      timeout: 60000,
      keepalive: 120000
    };
  }

  async deployToServer(serverKey) {
    const srv = SERVERS[serverKey];
    const serverName = srv.name;
    const startTime = Date.now();
    const stats = { filesUploaded: 0, totalSize: 0, errors: [] };

    Logger.header(`Déploiement → ${serverName}`);

    const ftpConfig = this.getFtpConfig(serverKey);

    if (!existsSync(ftpConfig.localRoot)) {
      throw new Error(`Dossier out/ non trouvé`);
    }

    Logger.info(`  Host: ${ftpConfig.host}:${ftpConfig.port}`);
    Logger.info(`  User: ${ftpConfig.user}`);
    Logger.info(`  Remote: ${ftpConfig.remoteRoot}`);

    const ftpDeploy = new FtpDeploy();

    ftpDeploy.on('uploading', (data) => {
      stats.filesUploaded = data.transferredFileCount || 0;
      const total = data.totalFilesCount || 0;
      const pct = total > 0 ? Math.round((stats.filesUploaded / total) * 100) : 0;
      if (this.options.verbose) {
        Logger.info(`  📤 ${data.filename} (${pct}%)`);
      } else if (stats.filesUploaded % 20 === 0 || pct >= 95) {
        Logger.info(`  📤 ${pct}% (${stats.filesUploaded}/${total})`);
      }
    });

    ftpDeploy.on('uploaded', (data) => {
      if (data.totalFileSize) stats.totalSize += data.totalFileSize;
    });

    ftpDeploy.on('upload-error', (data) => {
      stats.errors.push(`${data.filename}: ${data.err}`);
    });

    try {
      await ftpDeploy.deploy(ftpConfig);

      // Upload .htaccess via basic-ftp (ftp-deploy ignore les dotfiles)
      await this.uploadHtaccess(serverKey);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      Logger.success(`${serverName} déployé - ${stats.filesUploaded} fichiers (${this.formatBytes(stats.totalSize)}) en ${duration}s`);

      if (stats.errors.length > 0) {
        Logger.warning(`  ${stats.errors.length} erreur(s) non-bloquante(s)`);
      }

      this.serverResults.push({ server: serverName, url: srv.siteUrl(), success: true, files: stats.filesUploaded, size: stats.totalSize, duration, errors: stats.errors.length });
    } catch (err) {
      Logger.error(`${serverName} - Échec:`, err.message);
      this.diagnoseError(err);
      this.serverResults.push({ server: serverName, url: srv.siteUrl(), success: false, error: err.message });
    }
  }

  async uploadHtaccess(serverKey) {
    const srv = SERVERS[serverKey];
    const htaccessPath = join(__dirname, 'out', '.htaccess');

    if (!existsSync(htaccessPath)) {
      Logger.warning('  .htaccess non trouvé dans out/, skip');
      return;
    }

    // Sécurisation sql_jsonpro : injecter la clé X-App-Key dans la copie uploadée
    // (out/.htaccess, artifact de build gitigné). public/.htaccess (commité) n'est
    // JAMAIS modifié, la clé vient de l'env locale (jamais d'un fichier commité).
    const MARKER = '# X-App-Key sql_jsonpro (injecté au déploiement, clé hors dépôt)';
    let htaccessContent = readFileSync(htaccessPath, 'utf-8');

    // Idempotence : retirer toute occurrence précédente du bloc (marqueur + directive)
    // pour éviter les doublons lors de déploiements répétés sans --build
    htaccessContent = htaccessContent
      .split('\n')
      .filter(line =>
        !line.includes('X-App-Key sql_jsonpro') &&
        !/^\s*RequestHeader set X-App-Key\b/.test(line)
      )
      .join('\n');

    const appKey = process.env.SQL_APP_KEY;
    if (appKey) {
      htaccessContent =
        htaccessContent.replace(/\s*$/, '\n') +
        `\n# Reverse proxy /api/sql : authentification auprès de sql_jsonpro\n${MARKER}\nRequestHeader set X-App-Key "${appKey}"\n`;
      writeFileSync(htaccessPath, htaccessContent, 'utf-8');
      Logger.success('  X-App-Key sql_jsonpro injectée dans le .htaccess uploadé');
    } else {
      // Clé absente : upload tel quel, comportement historique (serveur en tuilage)
      Logger.info('  SQL_APP_KEY absente : .htaccess uploadé sans en-tête X-App-Key');
    }

    const client = new FtpClient();
    try {
      await client.access({
        host: srv.host(),
        port: srv.port(),
        user: srv.user(),
        password: srv.password(),
        secure: srv.secure()
      });

      const remotePath = srv.remotePath().replace(/\/$/, '') + '/.htaccess';
      await client.uploadFrom(htaccessPath, remotePath);
      Logger.success(`  .htaccess uploadé → ${remotePath}`);
    } catch (err) {
      Logger.warning(`  .htaccess upload échoué: ${err.message}`);
    } finally {
      client.close();
    }
  }

  diagnoseError(err) {
    const solutions = {
      'ENOTFOUND': ['Vérifiez FTP_HOST', 'Testez la connectivité réseau'],
      'ECONNREFUSED': ['Vérifiez FTP_PORT', 'Le service FTP est-il actif ?'],
      'EAUTH': ['Vérifiez FTP_USER / FTP_PASSWORD', 'Compte FTP actif ?']
    };
    const list = solutions[err.code];
    if (list) list.forEach((s, i) => Logger.info(`  ${i + 1}. ${s}`));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showFinalSummary() {
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    Logger.header('📊 Résumé Final - Déploiement Multi-Serveurs');

    const allOk = this.serverResults.every(r => r.success);
    const successCount = this.serverResults.filter(r => r.success).length;

    this.serverResults.forEach(r => {
      if (r.success) {
        Logger.success(`${r.server} → ${r.files} fichiers (${this.formatBytes(r.size)}) en ${r.duration}s${r.errors > 0 ? ` [${r.errors} erreur(s)]` : ''}`);
        Logger.info(`  🌐 ${r.url}`);
      } else {
        Logger.error(`${r.server} → ÉCHEC: ${r.error}`);
      }
    });

    console.log('');
    Logger.info(`Durée totale: ${totalDuration}s`);

    if (allOk) {
      Logger.success(`🎉 ${successCount}/${this.serverResults.length} serveur(s) déployé(s) avec succès !`);
    } else {
      Logger.warning(`${successCount}/${this.serverResults.length} serveur(s) déployé(s)`);
    }

    console.log('');
    Logger.info('🔄 Post-déploiement : Ctrl+Shift+R sur chaque site pour vérifier');
  }

  async run() {
    try {
      Logger.header('FayClick V2 - Déploiement Multi-Serveurs');

      if (this.options.help) { this.showHelp(); return; }

      const targets = this.getTargetServers();
      Logger.info('Options:');
      Logger.info(`  Build: ${this.options.build ? '✅' : '❌'}`);
      Logger.info(`  Force: ${this.options.force ? '✅' : '❌'}`);
      Logger.info(`  Verbose: ${this.options.verbose ? '✅' : '❌'}`);
      Logger.info(`  Serveurs: ${targets.map(k => SERVERS[k].name).join(' + ')}`);

      this.validateEnvironment();

      // Build unique
      if (this.options.build) {
        await this.buildNextjs();
      } else {
        const outDir = join(__dirname, 'out');
        if (!existsSync(outDir)) {
          throw new Error('Dossier /out manquant. Utilisez --build');
        }
        const stats = this.analyzeOutputDir(outDir);
        Logger.info(`Build existant: ${stats.files} fichiers (${this.formatBytes(stats.size)})`);
      }

      // Déploiement séquentiel sur chaque serveur
      for (const serverKey of targets) {
        await this.deployToServer(serverKey);
      }

      this.showFinalSummary();

      // Exit code selon résultat
      const allOk = this.serverResults.every(r => r.success);
      if (!allOk) process.exit(1);

    } catch (error) {
      Logger.error('Déploiement échoué:', error.message);
      Logger.info('\n🔄 Pour réessayer:');
      Logger.info('  node deploy.mjs --build --force');
      Logger.info('  node deploy.mjs --build --server v2');
      Logger.info('  node deploy.mjs --build --server com');
      process.exit(1);
    }
  }
}

new FayClickDeployer().run();
