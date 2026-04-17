# i18n Wolof Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la locale `wo` (Wolof) à FayClick V2 : fichier `messages/wo.json` complet (traduction 1:1 de `fr.json`) + activation code end-to-end (type Locale, fallback hook, 2 sélecteurs UI, détection navigateur).

**Architecture:** Système i18n maison existant (hook `useTranslations` + `LanguageContext`). On étend le type `Locale` à `'fr' | 'en' | 'wo'`, on injecte `wo.json` dans le dictionnaire, on ajoute l'option au sélecteur de langue. Traduction exécutée par vagues avec glossaire terminologique figé dès le départ pour cohérence.

**Tech Stack:** Next.js 14 + React 18 + TypeScript. Pas de lib i18n externe. Validation via script Node (`scripts/check-i18n-keys.mjs` étendu WO).

**Spec source:** `docs/superpowers/specs/2026-04-17-wolof-translation-design.md`

**Orthographe Wolof :** pragmatique francisée (ex : *nangou, djekar, khalis, jaay, téy, dem, ñëw*). Emprunts modernes conservés en français quand l'usage urbain sénégalais les utilise (*facture, wallet, paiement, Orange Money, Wave*).

---

## Task 1: Créer la branche et scaffolder `wo.json` avec valeurs FR temporaires

**Files:**
- Create: `messages/wo.json` (copie exacte de `fr.json`)

- [ ] **Step 1.1: Créer la branche depuis main**

```bash
git checkout main
git pull origin main
git checkout -b feature/i18n-wolof-support
```

Expected: branche `feature/i18n-wolof-support` active.

- [ ] **Step 1.2: Copier `fr.json` en `wo.json` (valeurs FR temporaires pour débloquer le build)**

```bash
cp messages/fr.json messages/wo.json
```

- [ ] **Step 1.3: Vérifier que le JSON est valide**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/wo.json','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 1.4: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): scaffold wo.json (copie FR temporaire)"
```

---

## Task 2: Étendre `scripts/check-i18n-keys.mjs` à 3 locales

**Files:**
- Modify: `scripts/check-i18n-keys.mjs` (ajouter validation WO vs FR)

- [ ] **Step 2.1: Remplacer le contenu complet du script par la version 3-locales**

```javascript
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

// Extrait les placeholders {param} d'une string
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

const ref = loaded[0]; // fr = référence
console.log(`\n📊 Stats i18n`);
loaded.forEach((l) => console.log(`   ${l.code.toUpperCase()} : ${l.keys.size} clés`));

let hasError = false;

// 1. Parité des clés vs FR
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

// 2. Parité des placeholders {param} entre FR et les autres
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
```

- [ ] **Step 2.2: Lancer le script pour valider**

```bash
npm run i18n:check
```

Expected: `✅ Parité parfaite FR / EN / WO (clés + placeholders).` (puisque `wo.json` est une copie exacte de `fr.json` à ce stade)

- [ ] **Step 2.3: Commit**

```bash
git add scripts/check-i18n-keys.mjs
git commit -m "✨ feat(i18n): etend check-i18n-keys a 3 locales + placeholders"
```

---

## Task 3: Activer le type `Locale = 'fr' | 'en' | 'wo'` dans `LanguageContext.tsx`

**Files:**
- Modify: `contexts/LanguageContext.tsx`

- [ ] **Step 3.1: Remplacer le contenu complet du fichier**

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'fr' | 'en' | 'wo';

const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'en', 'wo'] as const;

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'fr';
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('wo')) return 'wo';
  if (browserLang.startsWith('fr')) return 'fr';
  return 'en';
}

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const savedLocale = localStorage.getItem('fayclick-locale');

    if (isLocale(savedLocale)) {
      setLocaleState(savedLocale);
      document.documentElement.lang = savedLocale;
    } else {
      const detected = detectBrowserLocale();
      setLocaleState(detected);
      localStorage.setItem('fayclick-locale', detected);
      document.documentElement.lang = detected;
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('fayclick-locale', newLocale);
    document.documentElement.lang = newLocale;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
```

- [ ] **Step 3.2: Vérifier que TypeScript accepte le changement**

```bash
npx tsc --noEmit
```

Expected: Pas d'erreur de type (ou uniquement des erreurs préexistantes non liées).

- [ ] **Step 3.3: Commit**

```bash
git add contexts/LanguageContext.tsx
git commit -m "✨ feat(i18n): Locale accepte 'wo' + detection navigateur wo/wo-SN"
```

---

## Task 4: Injecter `wo.json` dans le hook `useTranslations`

**Files:**
- Modify: `hooks/useTranslations.ts`

- [ ] **Step 4.1: Remplacer le contenu complet du fichier**

```typescript
import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import fr from '@/messages/fr.json';
import en from '@/messages/en.json';
import wo from '@/messages/wo.json';

const translations = { fr, en, wo } as const;

export type Locale = keyof typeof translations;
export type Namespace = keyof typeof fr;
export type TranslationKey<N extends Namespace> = keyof (typeof fr)[N];

function resolveKey(messages: any, namespace: string, key: string): string | undefined {
  const namespaceMessages = messages[namespace];
  if (!namespaceMessages) return undefined;

  const keys = key.split('.');
  let value: any = namespaceMessages;
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, param: string) =>
    params[param] !== undefined ? String(params[param]) : match
  );
}

export function useTranslations<N extends Namespace>(namespace: N) {
  const { locale } = useLanguage();

  // Mémoïsé sur [locale, namespace] : la référence `t` ne change que si la locale
  // change. Sans cela, ajouter `t` aux deps d'un useEffect/useCallback causerait
  // une boucle infinie de re-render.
  const t = useCallback(
    (key: TranslationKey<N> | string, params?: Record<string, unknown>): string => {
      const keyStr = key as string;

      let value = resolveKey(translations[locale], namespace, keyStr);

      if (value === undefined && locale !== 'fr') {
        value = resolveKey(translations.fr, namespace, keyStr);
        if (value !== undefined && typeof window !== 'undefined') {
          console.warn(`[i18n] Missing "${namespace}.${keyStr}" in "${locale}", using FR fallback`);
        }
      }

      if (value === undefined) {
        if (typeof window !== 'undefined') {
          console.warn(`[i18n] Missing "${namespace}.${keyStr}" in all locales`);
        }
        return keyStr;
      }

      return interpolate(value, params);
    },
    [locale, namespace]
  );

  return t;
}
```

- [ ] **Step 4.2: Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: Pas de nouvelle erreur.

- [ ] **Step 4.3: Commit**

```bash
git add hooks/useTranslations.ts
git commit -m "✨ feat(i18n): injecte wo.json dans useTranslations avec fallback FR"
```

---

## Task 5: Ajouter l'option Wolof au `components/ui/LanguageSwitcher.tsx`

**Files:**
- Modify: `components/ui/LanguageSwitcher.tsx:12-15`

- [ ] **Step 5.1: Modifier la constante `LANGUAGES`**

Remplacer :
```typescript
const LANGUAGES: LanguageOption[] = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
];
```

Par :
```typescript
const LANGUAGES: LanguageOption[] = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'wo', label: 'WO', flag: '🇸🇳' },
];
```

- [ ] **Step 5.2: Commit**

```bash
git add components/ui/LanguageSwitcher.tsx
git commit -m "✨ feat(i18n): ajoute option Wolof (WO) au LanguageSwitcher ui"
```

---

## Task 6: Ajouter l'option Wolof au `components/LanguageSwitcher.tsx`

**Files:**
- Modify: `components/LanguageSwitcher.tsx:8-19`

- [ ] **Step 6.1: Modifier le dictionnaire `languages`**

Remplacer :
```typescript
const languages = {
  fr: {
    flag: '🇫🇷',
    name: 'Français',
    shortName: 'FR'
  },
  en: {
    flag: '🇬🇧',
    name: 'English',
    shortName: 'EN'
  }
};
```

Par :
```typescript
const languages = {
  fr: {
    flag: '🇫🇷',
    name: 'Français',
    shortName: 'FR'
  },
  en: {
    flag: '🇬🇧',
    name: 'English',
    shortName: 'EN'
  },
  wo: {
    flag: '🇸🇳',
    name: 'Wolof',
    shortName: 'WO'
  }
};
```

- [ ] **Step 6.2: Vérifier TypeScript + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: build passe. L'app est maintenant installable en Wolof (mais tous les textes restent en FR puisque `wo.json` est encore la copie de `fr.json`).

- [ ] **Step 6.3: Commit**

```bash
git add components/LanguageSwitcher.tsx
git commit -m "✨ feat(i18n): ajoute option Wolof (WO) au LanguageSwitcher framer"
```

---

## Task 7: Écrire le glossaire terminologique Wolof dans `docs/i18n-guide.md`

**Files:**
- Modify: `docs/i18n-guide.md` (ajouter section Wolof à la fin)

- [ ] **Step 7.1: Ajouter la section "Support Wolof" à la fin du guide**

Ajouter ce bloc à la fin de `docs/i18n-guide.md` :

```markdown

## Support Wolof (`wo`)

Ajouté en avril 2026. Troisième locale après FR et EN.

### Orthographe : Wolof pragmatique francisé

Choix assumé : écriture proche du français pour un public sénégalais alphabétisé en français, plutôt que l'orthographe officielle du décret 2005-981 (qui utilise `ñ`, `ë`, `à`, `é`).

**Règles :**
- Pas de diacritiques : `ñ` → `gn`, `ë` → `e`, `x` → `kh`
- Les doubles voyelles sont simplifiées quand le sens reste clair
- Emprunts modernes au français conservés tels quels (voir liste ci-dessous)

### Glossaire terminologique (appliquer à tous les namespaces)

#### Actions UI

| Français | Wolof |
|---|---|
| Retour | Dellu |
| Suivant | Topp |
| Précédent | Kanam |
| Chargement... | Dafay ñëw... |
| Soumettre | Yonnee |
| Annuler | Bañ |
| Enregistrer | Denc |
| Modifier | Soppi |
| Supprimer | Far |
| Requis | Laajtelu na |
| Optionnel | Du fàww |
| Fermer | Tëj |
| Confirmer | Nangu |
| Continuer | Jëkk ba noppi |
| Réessayer | Jéem waat |
| Rechercher | Seet |
| Oui | Waaw |
| Non | Déedéet |
| Connexion | Dugg |
| Déconnexion | Génn |
| Ajouter | Yokk |
| Imprimer | Imprimé |
| Partager | Séddale |
| Télécharger | Téléchargé |
| Voir | Xool |
| Détails | Détails |

#### Statuts

| Français | Wolof |
|---|---|
| Payé | Fay na |
| Impayé | Feyul |
| En attente | Xaar |
| Brouillon | Brouillon |
| Actif | Dafa dox |
| Inactif | Doxul |
| Validé | Nangu na |
| Annulé | Bañ na |
| Terminé | Jeex na |
| En cours | Àngi doxee |
| Nouveau | Bees |

#### Rôles & personnes

| Français | Wolof |
|---|---|
| Administrateur | Admin |
| Caissier | Keesu |
| Client | Jaaykat / Client |
| Marchand | Jaaykat |
| Prestataire | Jëfandikoo |
| Élève | Jàngalekat |
| Parent | Waajur |
| Utilisateur | Jëfandikoo |

#### Domaine métier FayClick

| Français | Wolof |
|---|---|
| Facture | Facture |
| Reçu | Reçu |
| Panier | Panier |
| Article / Produit | Jumtukaay |
| Stock | Stock |
| Dépense | Dépense |
| Prestation | Liggéey |
| Devis | Devis |
| Proforma | Proforma |
| Wallet | Wallet |
| Retrait | Génn xaalis |
| Abonnement | Abonnement |
| Structure | Mbootaay |
| Boutique | Bitig |
| École | Daara / École |
| Argent | Xaalis |
| Prix | Njëg |
| Total | Total |
| Montant | Xaalis bi |
| Quantité | Limu |
| Nom | Tur |
| Téléphone | Telefon |
| Adresse | Adrees |
| Vente | Jaay |
| Achat | Jënd |
| Paiement | Paiement |
| Remise | Wàññi |
| Acompte | Acompte |
| Solde | Solde |

#### Emprunts conservés en français

Ces termes modernes sont utilisés tels quels en Wolof urbain (Dakar) et doivent rester en français dans les traductions :

`facture`, `wallet`, `paiement`, `Orange Money`, `Wave`, `Free Money`, `QR code`, `SMS`, `PIN`, `code`, `email`, `login`, `admin`, `abonnement`, `menu`, `option`, `page`, `stock`, `proforma`, `devis`, `dashboard`.

### Principes de traduction

1. **Garder les placeholders `{param}`** tels quels — ne jamais les traduire (`{count}`, `{length}`, etc.)
2. **Ton** : informel et direct, comme un commerçant s'adresse à un autre
3. **Cohérence** : toujours appliquer les termes du glossaire, même si une autre traduction serait possible
4. **Longueur** : rester proche de la longueur FR pour ne pas casser les layouts UI
5. **Noms propres** : "FayClick", "Orange Money", "Wave", "ICELABSOFT" ne se traduisent jamais

### Validation

Après toute modification de `wo.json` :
```bash
npm run i18n:check
```

Doit afficher : `✅ Parité parfaite FR / EN / WO (clés + placeholders).`
```

- [ ] **Step 7.2: Commit**

```bash
git add docs/i18n-guide.md
git commit -m "📝 docs(i18n): guide Wolof + glossaire terminologique 60+ termes"
```

---

## Task 8: Vague 2 — Traduire `common`, `pagination`, `sidebar`, `offline`

**Files:**
- Modify: `messages/wo.json` (namespaces `common`, `pagination`, `sidebar`, `offline`)

**Principe :** Pour chaque clé, lire la valeur FR dans `messages/fr.json`, appliquer le glossaire de la Task 7, écrire la valeur WO dans `messages/wo.json` en préservant la clé et les placeholders `{param}`.

- [ ] **Step 8.1: Traduire le namespace `common`**

Ouvrir `messages/wo.json`, localiser le bloc `"common": { ... }`, remplacer chaque valeur par sa traduction Wolof en suivant le glossaire. Exemple attendu :

```json
"common": {
  "back": "Dellu",
  "next": "Topp",
  "previous": "Kanam",
  "loading": "Dafay ñëw...",
  "submit": "Yonnee",
  "cancel": "Bañ",
  "save": "Denc",
  "edit": "Soppi",
  "delete": "Far",
  "required": "Laajtelu na",
  "optional": "Du fàww",
  "close": "Tëj",
  "confirm": "Nangu",
  "continue": "Jëkk ba noppi",
  "retry": "Jéem waat",
  "search": "Seet",
  "yes": "Waaw",
  "no": "Déedéet"
}
```

- [ ] **Step 8.2: Traduire `pagination`, `sidebar`, `offline`**

Même méthode. Lire FR, appliquer le glossaire, écrire WO. Pour chaque clé contenant un placeholder comme `{count}`, le conserver exact.

- [ ] **Step 8.3: Valider la parité**

```bash
npm run i18n:check
```

Expected: `✅ Parité parfaite FR / EN / WO (clés + placeholders).`

- [ ] **Step 8.4: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 2 (common/pagination/sidebar/offline)"
```

---

## Task 9: Vague 3a — Traduire `auth`

**Files:**
- Modify: `messages/wo.json` (namespace `auth`)

- [ ] **Step 9.1: Traduire toutes les sous-clés du namespace `auth`**

Sous-sections attendues à traduire entièrement : `appTagline`, `loadingPage`, `login`, `pin`, `loadingModal`, et toute autre clé présente dans le FR.

Appliquer strictement le glossaire. Exemples de termes récurrents :
- "Connexion" → `Dugg`
- "Mot de passe" → `Mot de passe` (emprunt conservé) ou `Code sutura`
- "Email / Login" → `Email / Login`
- "Se connecter" → `Dugg`
- "Chargement..." → `Dafay ñëw...`

Préserver les placeholders `{length}`, `{menuPath}`, etc.

- [ ] **Step 9.2: Valider**

```bash
npm run i18n:check
```

Expected: `✅ Parité parfaite`

- [ ] **Step 9.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 3a (auth)"
```

---

## Task 10: Vague 3b — Traduire `register`

**Files:**
- Modify: `messages/wo.json` (namespace `register`)

- [ ] **Step 10.1: Traduire le namespace `register` en entier**

Couvre toutes les étapes d'inscription (type de structure, infos commerce, admin, logo, validation).

Termes fréquents :
- "Inscription" → `Inscription` (emprunt)
- "Nouvelle structure" → `Mbootaay bu bees`
- "Logo" → `Logo`
- "Suivant" → `Topp`
- "Retour" → `Dellu`
- "Valider" → `Nangu`

Préserver tous les `{param}`.

- [ ] **Step 10.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 10.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 3b (register)"
```

---

## Task 11: Vague 3c — Traduire `landing`

**Files:**
- Modify: `messages/wo.json` (namespace `landing`)

- [ ] **Step 11.1: Traduire le namespace `landing`**

Page d'accueil publique : hero, 4 segments métier (Commerce, Scolaire, Immobilier, Prestataires), features, CTA.

Ton : accrocheur mais accessible. Marketing-friendly.

Exemples :
- "Simplifiez votre business" → `Yombalal sa liggéey`
- "Commerçants" → `Jaaykat yi`
- "Écoles" → `Daara yi` ou `École yi`
- "Commencer" → `Tambali`

- [ ] **Step 11.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 11.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 3c (landing)"
```

---

## Task 12: Vague 4a — Traduire `dashboardCommerce` + `commerceDashboard`

**Files:**
- Modify: `messages/wo.json` (namespaces `dashboardCommerce` et `commerceDashboard`)

- [ ] **Step 12.1: Traduire `dashboardCommerce` (dashboard mobile)**

KPIs, widgets, stats. Exemples :
- "Ventes du jour" → `Jaay bu tëy`
- "Clients" → `Client yi`
- "Chiffre d'affaires" → `Chiffre d'affaires` (emprunt technique) ou `Xaalis bi dugg`
- "Panier moyen" → `Panier moyen`
- "Voir tout" → `Xool bépp`

- [ ] **Step 12.2: Traduire `commerceDashboard` (dashboard desktop)**

Contient top produits, top clients, dernières factures, dépenses du mois, etc. Appliquer le glossaire.

- [ ] **Step 12.3: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 12.4: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4a (dashboardCommerce x2)"
```

---

## Task 13: Vague 4b — Traduire `produits`

**Files:**
- Modify: `messages/wo.json` (namespace `produits`)

- [ ] **Step 13.1: Traduire `produits`**

Le plus gros namespace (gestion catalogue produits, variantes, codes-barres, stock, prix).

Termes fréquents :
- "Produit" → `Jumtukaay`
- "Nouveau produit" → `Jumtukaay bu bees`
- "Prix de vente" → `Njëg mu jaay`
- "Prix en gros" → `Njëg u gros`
- "Stock" → `Stock`
- "Code-barres" → `Code-barres`
- "Catégorie" → `Catégorie`

- [ ] **Step 13.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 13.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4b (produits)"
```

---

## Task 14: Vague 4c — Traduire `clients`

**Files:**
- Modify: `messages/wo.json` (namespace `clients`)

- [ ] **Step 14.1: Traduire `clients`**

Liste clients, recherche, détails, historique factures.

- "Client" → `Client` (emprunt conservé — largement utilisé) ou `Jaaykat` quand on parle d'un commerçant
- "Nom" → `Tur`
- "Téléphone" → `Telefon`
- "Adresse" → `Adrees`
- "Ajouter client" → `Yokk client`

- [ ] **Step 14.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 14.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4c (clients)"
```

---

## Task 15: Vague 4d — Traduire `invoices` + `invoicesModals`

**Files:**
- Modify: `messages/wo.json` (namespaces `invoices` et `invoicesModals`)

- [ ] **Step 15.1: Traduire `invoices`**

Liste factures, filtres, stats, onglets.

- "Facture" → `Facture`
- "Payée" → `Fay na`
- "Impayée" → `Feyul`
- "Créer facture" → `Def facture`
- "Référence" → `Référence`

- [ ] **Step 15.2: Traduire `invoicesModals`**

Tous les modals liés aux factures (paiement, partage, suppression, impression, etc.).

- [ ] **Step 15.3: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 15.4: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4d (invoices x2)"
```

---

## Task 16: Vague 4e — Traduire `venteFlash`

**Files:**
- Modify: `messages/wo.json` (namespace `venteFlash`)

- [ ] **Step 16.1: Traduire `venteFlash`**

Namespace lourd (~1260 lignes source). Scan code-barres, panier multi-article, client anonyme, encaissement CASH.

- "Vente rapide" → `Jaay gaaw`
- "Encaisser" → `Jàpp xaalis`
- "Scanner" → `Scanner`
- "Monnaie à rendre" → `Monnaie bi ngay delloo`
- "Ticket" → `Ticket` (emprunt)

- [ ] **Step 16.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 16.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4e (venteFlash)"
```

---

## Task 17: Vague 4f — Traduire `expenses`

**Files:**
- Modify: `messages/wo.json` (namespace `expenses`)

- [ ] **Step 17.1: Traduire `expenses`**

- "Dépense" → `Dépense`
- "Ajouter dépense" → `Yokk dépense`
- "Type de dépense" → `Xeetu dépense`
- "Montant" → `Xaalis bi`

- [ ] **Step 17.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 17.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4f (expenses)"
```

---

## Task 18: Vague 4g — Traduire `inventory`

**Files:**
- Modify: `messages/wo.json` (namespace `inventory`)

- [ ] **Step 18.1: Traduire `inventory`**

Mouvements de stock, entrées, sorties, ajustements, évolution.

- "Inventaire" → `Inventaire`
- "Entrée de stock" → `Dugalu stock`
- "Sortie de stock" → `Génn stock`
- "Ajustement" → `Setal`

- [ ] **Step 18.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 18.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4g (inventory)"
```

---

## Task 19: Vague 4h — Traduire `panier`

**Files:**
- Modify: `messages/wo.json` (namespace `panier`)

- [ ] **Step 19.1: Traduire `panier`**

- "Panier" → `Panier`
- "Article ajouté" → `Jumtukaay bi dugg na`
- "Vider le panier" → `Far panier bi`
- "Total" → `Total`
- "Sous-total" → `Sous-total`

- [ ] **Step 19.2: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 19.3: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 4h (panier)"
```

---

## Task 20: Vague 5a — Traduire `publicFacture` + `publicRecu`

**Files:**
- Modify: `messages/wo.json` (namespaces `publicFacture` et `publicRecu`)

- [ ] **Step 20.1: Traduire `publicFacture`**

Page facture publique partageable (client final qui paie via lien). Doit être très accessible.

- "Votre facture" → `Sa facture`
- "Payer" → `Fay`
- "Montant à payer" → `Xaalis bi ngay fay`
- "Merci pour votre paiement" → `Jërë jëf ci sa paiement`

- [ ] **Step 20.2: Traduire `publicRecu`**

Page reçu public après paiement.

- [ ] **Step 20.3: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 20.4: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 5a (publicFacture + publicRecu)"
```

---

## Task 21: Vague 5b — Traduire `marketplace` + `catalogue`

**Files:**
- Modify: `messages/wo.json` (namespaces `marketplace` et `catalogue`)

- [ ] **Step 21.1: Traduire `marketplace`**

Page liste des boutiques publiques.

- "Boutiques" → `Bitig yi`
- "Découvrir" → `Xamal`
- "Catégories" → `Catégorie yi`

- [ ] **Step 21.2: Traduire `catalogue`**

Catalogue public d'une structure (articles disponibles, mini-panier visiteur).

- [ ] **Step 21.3: Valider**

```bash
npm run i18n:check
```

- [ ] **Step 21.4: Commit**

```bash
git add messages/wo.json
git commit -m "✨ feat(i18n): traduction Wolof vague 5b (marketplace + catalogue)"
```

---

## Task 22: Vérifier qu'il ne reste aucun namespace non traduit

**Files:**
- Read: `messages/wo.json` et `messages/fr.json`

- [ ] **Step 22.1: Lister tous les namespaces de `fr.json`**

```bash
node -e "const fr = require('./messages/fr.json'); console.log(Object.keys(fr).join('\n'));"
```

Expected : 21 namespaces listés.

- [ ] **Step 22.2: Comparer avec les namespaces déjà traduits (Tasks 8–21)**

Liste attendue couverte : `common`, `auth`, `register`, `landing`, `publicFacture`, `marketplace`, `catalogue`, `publicRecu`, `dashboardCommerce`, `offline`, `expenses`, `inventory`, `clients`, `invoices`, `invoicesModals`, `venteFlash`, `produits`, `commerceDashboard`, `pagination`, `panier`, `sidebar`.

Si un namespace a été oublié (par exemple ajouté récemment à `fr.json`) : le traduire maintenant en suivant le même protocole (lire FR, appliquer glossaire, écrire WO, valider, commit).

- [ ] **Step 22.3: Dernière validation de parité**

```bash
npm run i18n:check
```

Expected: `✅ Parité parfaite FR / EN / WO (clés + placeholders).`

- [ ] **Step 22.4: Vérifier visuellement qu'aucune valeur n'est restée en français dans `wo.json`**

```bash
node -e "
const fr = require('./messages/fr.json');
const wo = require('./messages/wo.json');
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}
const frFlat = flatten(fr);
const woFlat = flatten(wo);
const identical = Object.keys(frFlat).filter(k => frFlat[k] === woFlat[k] && typeof frFlat[k] === 'string' && frFlat[k].length > 3);
console.log('Clés identiques FR=WO (' + identical.length + ') :');
identical.slice(0, 50).forEach(k => console.log('  - ' + k + ' = ' + JSON.stringify(frFlat[k])));
if (identical.length > 50) console.log('  ... et ' + (identical.length - 50) + ' autres');
"
```

Les valeurs conservées en français volontairement (emprunts : `facture`, `wallet`, noms propres, références type `Orange Money`, etc.) sont OK. Les autres doivent être traduites.

Si la liste contient des valeurs qui ne sont PAS des emprunts légitimes, retourner dans la vague concernée pour finir la traduction.

---

## Task 23: Test de fumée UX — naviguer en Wolof

**Files:**
- Run: `npm run dev`

- [ ] **Step 23.1: Démarrer le serveur dev**

```bash
npm run dev
```

Expected: serveur démarre sur port 3000.

- [ ] **Step 23.2: Ouvrir la console navigateur pour capter les warnings i18n**

Ouvrir http://localhost:3000 dans un navigateur, ouvrir les DevTools → Console, filtrer sur `[i18n]`.

- [ ] **Step 23.3: Basculer en Wolof via le sélecteur de langue**

Cliquer sur le LanguageSwitcher → choisir 🇸🇳 WO. L'interface doit changer.

- [ ] **Step 23.4: Parcourir 5 écrans clés**

1. Landing page (`/`)
2. Login (`/login`)
3. Register (`/register`) — au moins 2 étapes
4. Dashboard commerce (après login avec compte test) — `/dashboard/commerce`
5. Créer une facture (depuis dashboard → Factures → Nouvelle)

Pour chaque écran :
- Vérifier qu'aucun texte ne reste en français (hors emprunts légitimes : Wallet, Facture, Orange Money, etc.)
- Vérifier la console : aucun warning `[i18n] Missing "..." in "wo"`
- Vérifier que les placeholders s'interpolent correctement (ex : "Saisissez votre code à {length} chiffres" → nombre injecté)

- [ ] **Step 23.5: Documenter les écarts éventuels**

S'il reste des warnings de fallback ou des textes non traduits repérés : créer un fichier temporaire `docs/i18n-wolof-followups.md` avec la liste, puis corriger les clés manquantes dans `wo.json`.

- [ ] **Step 23.6: Build de production**

```bash
rm -rf .next
npm run build
```

Expected: build passe sans erreur, sans warning i18n bloquant.

- [ ] **Step 23.7: Commit des corrections éventuelles**

```bash
git add messages/wo.json
git commit -m "🐛 fix(i18n): corrections Wolof apres test de fumee UX"
```

(Si aucune correction n'a été nécessaire, skip ce commit.)

---

## Task 24: Mettre à jour `CLAUDE.md` et `MEMORY.md`

**Files:**
- Modify: `CLAUDE.md`
- Modify: `C:\Users\DELL 5581\.claude\projects\D--React-Prj-fayclick\memory\MEMORY.md`

- [ ] **Step 24.1: Mettre à jour `CLAUDE.md`**

Dans la section `## Système i18n (FR/EN)` :
- Renommer le titre en `## Système i18n (FR/EN/WO)`
- Mettre à jour la phrase d'intro : "Architecture maison — **pas de next-intl ni i18next**." devient "Architecture maison trois locales : français (défaut), anglais, wolof."
- Mettre à jour la ligne `**Fichiers**` : `messages/fr.json` + `messages/en.json` + `messages/wo.json`
- Mettre à jour la ligne `**Fallback**` pour mentionner le fallback WO → FR

- [ ] **Step 24.2: Mettre à jour `MEMORY.md`**

Ajouter sous la section `## i18n FR/EN` (renommée en `## i18n FR/EN/WO`) une note :

```markdown
- **Wolof ajouté** (avril 2026) : 3e locale, orthographe pragmatique francisée, glossaire dans docs/i18n-guide.md, fallback WO → FR
```

- [ ] **Step 24.3: Commit**

```bash
git add CLAUDE.md "C:\Users\DELL 5581\.claude\projects\D--React-Prj-fayclick\memory\MEMORY.md"
git commit -m "📝 docs(i18n): CLAUDE.md + MEMORY.md mentionnent le support Wolof"
```

(Si `git` refuse de suivre le fichier de mémoire Claude hors du repo, le mettre à jour manuellement sans commit — c'est normal, c'est un fichier hors projet.)

---

## Task 25: Merge final vers main (sur demande utilisateur uniquement)

**Files:**
- Run: git

- [ ] **Step 25.1: Ouvrir une PR**

Ne PAS merger automatiquement. Pusher la branche et demander à l'utilisateur de valider :

```bash
git push -u origin feature/i18n-wolof-support
```

- [ ] **Step 25.2: Attendre validation utilisateur + relecture locuteur natif (recommandé)**

Communiquer à l'utilisateur :
- Branche poussée, prête pour review
- Recommandation : faire relire `messages/wo.json` par un locuteur natif avant merge sur main
- Le merge vers main est une décision utilisateur, pas automatique

---

## Critères d'acceptation finale

- [ ] `messages/wo.json` existe et parité parfaite avec `fr.json` (clés + placeholders)
- [ ] `Locale = 'fr' | 'en' | 'wo'` partout
- [ ] Fallback WO → FR testé (clé volontairement supprimée → affiche FR + warning console)
- [ ] Les 2 LanguageSwitcher affichent 🇸🇳 WO
- [ ] Détection navigateur `wo`/`wo-SN` fonctionne
- [ ] `npm run i18n:check` passe
- [ ] `npm run build` passe
- [ ] Test de fumée UX OK sur 5 écrans
- [ ] `docs/i18n-guide.md` contient le glossaire complet
- [ ] `CLAUDE.md` et `MEMORY.md` mentionnent WO
- [ ] Glossaire couvre les ~60 termes clés listés
- [ ] Aucune PR automatique vers main — utilisateur décide
