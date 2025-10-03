# Guide d'Internationalisation (i18n) - FayClick V2

## 📋 Vue d'ensemble

Ce document détaille la stratégie d'internationalisation de FayClick V2 pour supporter le **français** (langue principale) et l'**anglais** (pour clients anglophones).

## 🎯 Objectifs

- ✅ Support multi-langues (FR/EN initialement)
- ✅ SEO-friendly avec routes localisées (`/fr`, `/en`)
- ✅ Type-safe avec autocomplétion TypeScript
- ✅ Performance optimisée (SSR + SSG)
- ✅ Détection automatique de la langue du navigateur
- ✅ Switcher UI intuitif pour changer de langue

## 🛠️ Solution Technique : next-intl

### Pourquoi next-intl ?

| Critère | next-intl | react-i18next | Custom Hook |
|---------|-----------|---------------|-------------|
| **Next.js 15 App Router** | ✅ Natif | ⚠️ Adapté | ✅ Simple |
| **TypeScript Safety** | ✅ Total | ⚠️ Partiel | ❌ Manuel |
| **SEO (Routes localisées)** | ✅ Auto | ❌ Manuel | ❌ Absent |
| **Performance** | ✅ SSR/SSG | ⚠️ Client | ⚠️ Client |
| **Bundle Size** | 📦 ~15KB | 📦 ~50KB | 📦 ~2KB |
| **Maintenance** | ✅ Active | ✅ Active | ⚠️ Custom |

**Choix recommandé** : `next-intl` pour sa compatibilité native avec Next.js 15 et son typage TypeScript.

## 📦 Installation

```bash
npm install next-intl
```

## 🏗️ Architecture

### Structure des fichiers

```
fayclick/
├── messages/                   # Fichiers de traduction
│   ├── fr.json                # Français (langue principale)
│   └── en.json                # Anglais
│
├── i18n/                      # Configuration i18n
│   ├── request.ts             # Config next-intl pour App Router
│   └── routing.ts             # Routes et locales supportées
│
├── middleware.ts              # Détection et redirection de langue
│
├── app/
│   └── [locale]/              # Routes avec préfixe langue
│       ├── layout.tsx         # Layout avec provider i18n
│       ├── page.tsx           # Page d'accueil
│       ├── login/
│       ├── register/
│       └── dashboard/
│
└── components/
    └── LanguageSwitcher.tsx   # Composant switcher de langue
```

### Fichiers de traduction (messages/)

#### `messages/fr.json`
```json
{
  "common": {
    "welcome": "Bienvenue",
    "login": "Connexion",
    "logout": "Déconnexion",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "confirm": "Confirmer",
    "loading": "Chargement..."
  },
  "auth": {
    "loginTitle": "Connexion à FayClick",
    "registerTitle": "Créer un compte",
    "email": "Adresse e-mail",
    "password": "Mot de passe",
    "forgotPassword": "Mot de passe oublié ?",
    "noAccount": "Pas encore de compte ?",
    "signUp": "S'inscrire"
  },
  "dashboard": {
    "title": "Tableau de bord",
    "totalSales": "Ventes totales",
    "totalClients": "Clients",
    "revenue": "Chiffre d'affaires"
  },
  "errors": {
    "required": "Ce champ est requis",
    "invalidEmail": "Adresse e-mail invalide",
    "serverError": "Erreur serveur, veuillez réessayer"
  }
}
```

#### `messages/en.json`
```json
{
  "common": {
    "welcome": "Welcome",
    "login": "Login",
    "logout": "Logout",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "loading": "Loading..."
  },
  "auth": {
    "loginTitle": "Login to FayClick",
    "registerTitle": "Create an account",
    "email": "Email address",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "noAccount": "Don't have an account?",
    "signUp": "Sign up"
  },
  "dashboard": {
    "title": "Dashboard",
    "totalSales": "Total Sales",
    "totalClients": "Clients",
    "revenue": "Revenue"
  },
  "errors": {
    "required": "This field is required",
    "invalidEmail": "Invalid email address",
    "serverError": "Server error, please try again"
  }
}
```

## 🔧 Configuration

### 1. Configuration de base (`i18n/request.ts`)

```typescript
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Langues supportées
export const locales = ['fr', 'en'] as const;
export const defaultLocale = 'fr' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Validation de la locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    messages: (await import(`@/messages/${locale}.json`)).default
  };
});
```

### 2. Configuration du routing (`i18n/routing.ts`)

```typescript
import { defineRouting } from 'next-intl/routing';
import { createSharedPathnamesNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed' // /fr pour français, / pour défaut
});

// Navigation hooks avec i18n
export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation(routing);
```

### 3. Middleware de détection (`middleware.ts`)

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Matcher pour toutes les routes sauf API, assets, etc.
  matcher: ['/', '/(fr|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
```

### 4. Layout avec provider (`app/[locale]/layout.tsx`)

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/request';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validation de la locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Charger les messages pour la locale
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## 💻 Utilisation dans les Composants

### Composants Server (RSC)

```tsx
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('auth');

  return (
    <div>
      <h1>{t('loginTitle')}</h1>
      <p>{t('noAccount')}</p>
    </div>
  );
}
```

### Composants Client

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function LoginForm() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  return (
    <form>
      <input placeholder={t('email')} />
      <input type="password" placeholder={t('password')} />
      <button>{tCommon('login')}</button>
    </form>
  );
}
```

### Traductions avec paramètres

```tsx
// messages/fr.json
{
  "welcome": "Bienvenue {name} !",
  "items": "Vous avez {count, plural, =0 {aucun article} one {# article} other {# articles}}"
}

// Composant
const t = useTranslations();
<p>{t('welcome', { name: 'Abdou' })}</p>
<p>{t('items', { count: 5 })}</p>
```

## 🎨 Switcher de Langue

### Composant LanguageSwitcher

```tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: 'fr' | 'en') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-gray-600" />
      <button
        onClick={() => switchLocale('fr')}
        className={`px-2 py-1 rounded ${
          locale === 'fr' ? 'bg-blue-500 text-white' : 'text-gray-600'
        }`}
      >
        🇫🇷 FR
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded ${
          locale === 'en' ? 'bg-blue-500 text-white' : 'text-gray-600'
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
```

### Intégration dans le Header

```tsx
// components/Header.tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
  return (
    <header className="flex justify-between items-center p-4">
      <Logo />
      <nav>
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
```

## 📅 Plan d'Implémentation

### Phase 1 : Pages Publiques (Sprint 1 - 2 jours)
- [x] Installation et configuration next-intl
- [ ] Traduction login/register
- [ ] Traduction landing page
- [ ] Messages d'erreur et validation
- [ ] Switcher de langue dans header

### Phase 2 : Dashboards (Sprint 2 - 3 jours)
- [ ] Dashboard Commerce
- [ ] Dashboard Scolaire
- [ ] Dashboard Immobilier
- [ ] Dashboard Prestataire
- [ ] Modals et composants UI

### Phase 3 : Fonctionnalités Avancées (Sprint 3 - 2 jours)
- [ ] Notifications et toasts
- [ ] Emails transactionnels
- [ ] Documentation et aide
- [ ] Tests et validation

### Phase 4 : Optimisation (Sprint 4 - 1 jour)
- [ ] Audit performance
- [ ] Lazy loading des traductions
- [ ] Cache et CDN
- [ ] Tests E2E multilingues

## 🔍 Bonnes Pratiques

### Organisation des clés

```json
{
  "namespace": {
    "section": {
      "key": "Traduction"
    }
  }
}
```

**Exemples** :
- `auth.login.title` → Titre de la page login
- `dashboard.commerce.revenue` → Chiffre d'affaires dashboard commerce
- `errors.validation.required` → Message d'erreur champ requis

### Nommage des clés

- ✅ **Utiliser camelCase** : `loginTitle`, `forgotPassword`
- ✅ **Être descriptif** : `emailPlaceholder` plutôt que `email`
- ✅ **Grouper par contexte** : `auth.*`, `dashboard.*`, `errors.*`
- ❌ **Éviter** : `text1`, `label`, `msg`

### Pluralisation

```json
{
  "items": "{count, plural, =0 {aucun article} one {# article} other {# articles}}"
}
```

### Dates et nombres

```tsx
import { useFormatter } from 'next-intl';

const format = useFormatter();

// Dates
format.dateTime(new Date(), { dateStyle: 'long' });

// Nombres
format.number(1234.56, { style: 'currency', currency: 'XOF' });
```

## 🧪 Tests

### Test de traduction

```tsx
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import LoginPage from '@/app/[locale]/login/page';

const messages = {
  auth: {
    loginTitle: 'Login to FayClick'
  }
};

test('renders login title', () => {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LoginPage />
    </NextIntlClientProvider>
  );

  expect(screen.getByText('Login to FayClick')).toBeInTheDocument();
});
```

## 📊 Métriques de Succès

- ✅ 100% des pages publiques traduites
- ✅ 100% des dashboards traduits
- ✅ Score Lighthouse ≥ 90 (maintenu)
- ✅ Temps de chargement < 200ms (switch langue)
- ✅ 0 erreur de traduction manquante en production

## 🔗 Ressources

- [Documentation next-intl](https://next-intl-docs.vercel.app/)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/)

## 🚀 Commandes Utiles

```bash
# Démarrer en développement
npm run dev

# Vérifier les traductions manquantes
npm run i18n:check

# Build avec toutes les locales
npm run build

# Tester une locale spécifique
NEXT_PUBLIC_LOCALE=en npm run dev
```

## 📝 Notes Importantes

### URLs et SEO

- **Français** (défaut) : `https://v2.fayclick.net/login`
- **Anglais** : `https://v2.fayclick.net/en/login`

### Pages exclues de l'i18n

- `/api/*` - Routes API
- `/facture?token=*` - Factures publiques (pas de traduction)
- `/_next/*` - Assets Next.js

### Stockage de préférence

```typescript
// Stocker la préférence utilisateur
localStorage.setItem('preferred-locale', 'en');

// Middleware vérifiera localStorage avant navigator.language
```

---

**Maintenu par** : Équipe FayClick Dev
**Dernière mise à jour** : 2025-10-01
**Version** : 1.0.0
