#!/usr/bin/env node

/**
 * Script de patch automatique pour Next.js 14.2.18
 * Corrige le bug "generate is not a function" dans generate-build-id.js
 *
 * Ce script est exécuté automatiquement après npm install via le hook postinstall
 *
 * Bug: https://github.com/vercel/next.js/issues/xxxxx
 * Date: 2025-10-19
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'build',
  'generate-build-id.js'
);

console.log('🔧 Application du patch Next.js...');

// Vérifier si le fichier existe
if (!fs.existsSync(targetFile)) {
  console.log('⚠️  Fichier generate-build-id.js non trouvé. Next.js n\'est probablement pas encore installé.');
  console.log('   Le patch sera appliqué lors du prochain npm install.');
  process.exit(0);
}

// Lire le contenu du fichier
let content = fs.readFileSync(targetFile, 'utf8');

// Vérifier si le patch est déjà appliqué
if (content.includes('// PATCH APPLIED')) {
  console.log('✅ Patch déjà appliqué.');
  process.exit(0);
}

// Rechercher la fonction à patcher
const originalPattern = /async function generateBuildId\([^)]*\)\s*{/;

if (!originalPattern.test(content)) {
  console.log('⚠️  Le code source de Next.js a changé. Le patch doit être mis à jour.');
  process.exit(1);
}

// Appliquer le patch
const patchedContent = content.replace(
  /async function generateBuildId\(([^)]*)\)\s*{/,
  `async function generateBuildId($1) {
    // PATCH APPLIED - Fix "generate is not a function" bug
    if (typeof generate !== 'function') {
        console.warn('⚠️  Bug Next.js détecté: generate n\\'est pas une fonction. Utilisation de la fonction par défaut.');
        const { nanoid } = require('nanoid');
        return nanoid();
    }
`
);

// Écrire le fichier patché
fs.writeFileSync(targetFile, patchedContent, 'utf8');

console.log('✅ Patch appliqué avec succès à node_modules/next/dist/build/generate-build-id.js');
console.log('   Le build Next.js devrait maintenant fonctionner correctement.');
