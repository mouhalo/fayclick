#!/usr/bin/env node
/**
 * Wrapper autour de `next build` pour contourner l'incompatibilité entre
 * `output: 'export'` (Next.js static export) et `app/api/sql/route.ts`
 * (POST handler dev-only).
 *
 * Principe :
 *   1. Renommer `app/api/sql/route.ts` → `app/api/sql/route.ts.disabled`
 *      avant `next build`
 *   2. Lancer `next build`
 *   3. Restaurer le fichier dans un bloc `finally` (même si le build échoue,
 *      même si Ctrl+C)
 *
 * En PROD, `.htaccess` gère `/api/sql` via reverse proxy vers sql_jsonpro.
 * En DEV, `next dev` lit le fichier tel quel (ce script n'est appelé que pour
 * `next build`).
 *
 * Usage : node scripts/build-static.mjs
 * Appelé automatiquement par `npm run build` via package.json.
 */

import { spawn } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DEV_ROUTE = resolve(ROOT, 'app/api/sql/route.ts');
const DISABLED_ROUTE = DEV_ROUTE + '.disabled';

function disableDevRoute() {
  if (existsSync(DISABLED_ROUTE)) {
    console.log('⚠️  ' + DISABLED_ROUTE + ' existe déjà (cleanup précédent incomplet). Restauration...');
    restoreDevRoute();
  }
  if (existsSync(DEV_ROUTE)) {
    renameSync(DEV_ROUTE, DISABLED_ROUTE);
    console.log('🔧 [build-static] app/api/sql/route.ts → route.ts.disabled (temporaire)');
    return true;
  }
  return false;
}

function restoreDevRoute() {
  if (existsSync(DISABLED_ROUTE)) {
    renameSync(DISABLED_ROUTE, DEV_ROUTE);
    console.log('✅ [build-static] app/api/sql/route.ts restauré');
  }
}

function runNextBuild() {
  return new Promise((resolvePromise, rejectPromise) => {
    // shell: true pour compatibilité Windows (EINVAL sans shell)
    const proc = spawn('npx next build', {
      stdio: 'inherit',
      shell: true,
      cwd: ROOT,
    });

    proc.on('error', (err) => rejectPromise(err));
    proc.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error('next build a échoué avec code ' + code));
    });
  });
}

// Garantir la restauration même sur Ctrl+C / kill / unhandled errors
let restored = false;
function safeRestore() {
  if (!restored) {
    restored = true;
    restoreDevRoute();
  }
}
process.on('SIGINT', () => { safeRestore(); process.exit(130); });
process.on('SIGTERM', () => { safeRestore(); process.exit(143); });
process.on('uncaughtException', (err) => {
  safeRestore();
  console.error('❌ [build-static] Uncaught exception:', err);
  process.exit(1);
});

async function main() {
  const wasDisabled = disableDevRoute();
  try {
    await runNextBuild();
  } finally {
    if (wasDisabled) restoreDevRoute();
    restored = true;
  }
}

main().catch((err) => {
  console.error('❌ [build-static]', err.message);
  process.exit(1);
});
