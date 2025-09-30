/**
 * Script d'injection de timestamp unique dans le Service Worker
 *
 * Objectif: Forcer le changement de taille du Service Worker à chaque build
 * pour contourner le bug de ftp-deploy qui compare les tailles de fichiers
 *
 * Utilisation: npm run prebuild (automatique avant chaque build)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SW_PATH = resolve(__dirname, '../public/service-worker.js');
const BUILD_LINE_PATTERN = /^\/\/ Build: .+ - .+$/m;

try {
  console.log('🔧 [BUILD] Injection du timestamp dans le Service Worker...');

  // Lire le Service Worker
  let swContent = readFileSync(SW_PATH, 'utf-8');

  // Générer nouveau timestamp unique
  const buildTimestamp = new Date().toISOString();
  const buildInfo = `// Build: ${buildTimestamp} - Force upload fix for ftp-deploy size comparison bug`;

  // Remplacer ou ajouter la ligne de build
  if (BUILD_LINE_PATTERN.test(swContent)) {
    // Remplacer la ligne existante
    swContent = swContent.replace(BUILD_LINE_PATTERN, buildInfo);
    console.log('✅ [BUILD] Timestamp mis à jour:', buildTimestamp);
  } else {
    // Ajouter après la ligne de version
    const versionLineIndex = swContent.indexOf('// Version:');
    if (versionLineIndex !== -1) {
      const nextLineIndex = swContent.indexOf('\n', versionLineIndex);
      swContent =
        swContent.slice(0, nextLineIndex + 1) +
        buildInfo + '\n' +
        swContent.slice(nextLineIndex + 1);
      console.log('✅ [BUILD] Timestamp ajouté:', buildTimestamp);
    } else {
      console.warn('⚠️  [BUILD] Ligne de version non trouvée, ajout en début de fichier');
      swContent = buildInfo + '\n' + swContent;
    }
  }

  // Sauvegarder le Service Worker modifié
  writeFileSync(SW_PATH, swContent, 'utf-8');

  console.log('🎉 [BUILD] Service Worker prêt pour le déploiement');
  console.log(`   Fichier: ${SW_PATH}`);
  console.log(`   Taille: ${swContent.length} octets`);

} catch (error) {
  console.error('❌ [BUILD] Erreur lors de l\'injection du timestamp:', error.message);
  process.exit(1);
}
