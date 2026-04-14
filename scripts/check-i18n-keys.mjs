#!/usr/bin/env node
/**
 * Vérifie la parité des clés entre messages/fr.json et messages/en.json.
 * Sort avec code 1 si divergence détectée (utile en CI).
 *
 * Usage :
 *   node scripts/check-i18n-keys.mjs
 *   npm run i18n:check
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const FR_PATH = resolve(ROOT, 'messages/fr.json');
const EN_PATH = resolve(ROOT, 'messages/en.json');

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(`❌ Impossible de lire ${path} :`, err.message);
    process.exit(2);
  }
}

/**
 * Aplatit un objet imbriqué en liste de clés "a.b.c".
 */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const fr = loadJson(FR_PATH);
const en = loadJson(EN_PATH);

const frKeys = new Set(flattenKeys(fr));
const enKeys = new Set(flattenKeys(en));

const missingInEn = [...frKeys].filter((k) => !enKeys.has(k)).sort();
const missingInFr = [...enKeys].filter((k) => !frKeys.has(k)).sort();

console.log(`\n📊 Stats i18n`);
console.log(`   FR : ${frKeys.size} clés`);
console.log(`   EN : ${enKeys.size} clés`);

let hasError = false;

if (missingInEn.length > 0) {
  hasError = true;
  console.log(`\n❌ ${missingInEn.length} clé(s) manquante(s) dans EN :`);
  missingInEn.forEach((k) => console.log(`   - ${k}`));
}

if (missingInFr.length > 0) {
  hasError = true;
  console.log(`\n⚠️  ${missingInFr.length} clé(s) en EN absente(s) de FR :`);
  missingInFr.forEach((k) => console.log(`   - ${k}`));
}

if (!hasError) {
  console.log(`\n✅ Parité parfaite entre FR et EN.\n`);
  process.exit(0);
}

console.log('');
process.exit(1);
