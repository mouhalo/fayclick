#!/usr/bin/env node
/**
 * Vérifie la parité des clés entre messages/fr.json, messages/en.json et messages/wo.json.
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

const LOCALES = [
  { code: 'fr', path: resolve(ROOT, 'messages/fr.json') },
  { code: 'en', path: resolve(ROOT, 'messages/en.json') },
  { code: 'wo', path: resolve(ROOT, 'messages/wo.json') },
];

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(`❌ Impossible de lire ${path} :`, err.message);
    process.exit(2);
  }
}

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

function extractPlaceholders(str) {
  if (typeof str !== 'string') return new Set();
  const matches = str.match(/\{(\w+)\}/g) || [];
  return new Set(matches);
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
}

const loaded = LOCALES.map(({ code, path }) => ({ code, data: loadJson(path), keys: null }));
loaded.forEach((l) => (l.keys = new Set(flattenKeys(l.data))));

const ref = loaded[0];
console.log(`\n📊 Stats i18n`);
loaded.forEach((l) => console.log(`   ${l.code.toUpperCase()} : ${l.keys.size} clés`));

let hasError = false;

for (const l of loaded.slice(1)) {
  const missing = [...ref.keys].filter((k) => !l.keys.has(k)).sort();
  const extra = [...l.keys].filter((k) => !ref.keys.has(k)).sort();
  if (missing.length > 0) {
    hasError = true;
    console.log(`\n❌ ${missing.length} clé(s) manquante(s) dans ${l.code.toUpperCase()} :`);
    missing.forEach((k) => console.log(`   - ${k}`));
  }
  if (extra.length > 0) {
    hasError = true;
    console.log(`\n⚠️  ${extra.length} clé(s) en ${l.code.toUpperCase()} absente(s) de FR :`);
    extra.forEach((k) => console.log(`   - ${k}`));
  }
}

for (const l of loaded.slice(1)) {
  const mismatches = [];
  for (const key of ref.keys) {
    const frVal = getValueByPath(ref.data, key);
    const otherVal = getValueByPath(l.data, key);
    const frPlaceholders = extractPlaceholders(frVal);
    const otherPlaceholders = extractPlaceholders(otherVal);
    const missingInOther = [...frPlaceholders].filter((p) => !otherPlaceholders.has(p));
    const extraInOther = [...otherPlaceholders].filter((p) => !frPlaceholders.has(p));
    if (missingInOther.length > 0 || extraInOther.length > 0) {
      mismatches.push({ key, missing: missingInOther, extra: extraInOther });
    }
  }
  if (mismatches.length > 0) {
    hasError = true;
    console.log(`\n❌ ${mismatches.length} clé(s) avec placeholders divergents FR↔${l.code.toUpperCase()} :`);
    mismatches.forEach((m) => {
      const parts = [];
      if (m.missing.length > 0) parts.push(`manquants: ${m.missing.join(', ')}`);
      if (m.extra.length > 0) parts.push(`en trop: ${m.extra.join(', ')}`);
      console.log(`   - ${m.key} → ${parts.join(' | ')}`);
    });
  }
}

if (!hasError) {
  console.log(`\n✅ Parité parfaite FR / EN / WO (clés + placeholders).\n`);
  process.exit(0);
}

console.log('');
process.exit(1);
