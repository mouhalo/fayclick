# Traduction Wolof (wo.json) + activation i18n — Design

**Date** : 2026-04-17
**Branche cible** : `feature/i18n-wolof-support` (à créer depuis `main`)
**Auteur** : Brainstorming session loitdevexpert + Claude
**Statut** : Validé par l'utilisateur

---

## 1. Contexte & objectif

FayClick V2 dispose aujourd'hui d'un système i18n maison (hook `useTranslations`, pas de `next-intl`) avec deux locales :

- `messages/fr.json` (français, locale par défaut)
- `messages/en.json` (anglais)

Chaque fichier contient ~1772 lignes réparties en 21 namespaces. La parité structurelle FR↔EN est stricte.

L'objectif de ce travail est d'**ajouter le support du Wolof** (locale `wo`), langue vernaculaire principale du Sénégal, marché cible de FayClick. Cela permettra aux commerçants, prestataires, écoles et agences immobilières sénégalaises d'utiliser l'application dans leur langue quotidienne.

## 2. Décisions actées pendant le brainstorming

| Question | Décision |
|---|---|
| Forme du livrable | `messages/wo.json` exact (copie 1:1 de `fr.json` avec valeurs traduites) |
| Qui traduit ? | Claude (LLM), qualité "bon niveau natif urbain Dakar", relecture humaine prévue ultérieurement |
| Standard orthographique | **Wolof pragmatique francisé** (écriture proche du français, pas l'orthographe officielle du décret 2005-981) |
| Scope code | **Activation complète** : type `Locale`, fallback hook, sélecteur UI, détection navigateur |

### 2.1 Justification orthographique

Le public cible (commerçants de Dakar, Thiès, Saint-Louis…) est alphabétisé en français. Une orthographe francisée (*nangou, djekar, khalis, téy*) est plus lisible au premier contact qu'une orthographe officielle avec diacritiques (*nangu, jëkkër, xaalis, tey*). Les emprunts modernes couramment utilisés en Wolof urbain sont conservés en français : *facture, wallet, paiement, QR code, Orange Money, Wave*.

## 3. Livrables

### 3.1 Nouveau fichier

**`messages/wo.json`** — Copie structurelle 1:1 de `fr.json`, avec les ~1772 lignes traduites en Wolof. Parité stricte : mêmes clés, mêmes placeholders `{param}`, mêmes namespaces.

### 3.2 Modifications de code

| Fichier | Changement |
|---|---|
| `contexts/LanguageContext.tsx` | `Locale = 'fr' \| 'en' \| 'wo'` ; détection navigateur `wo` / `wo-SN` ; validation `savedLocale` élargie |
| `hooks/useTranslations.ts` | Ajout de `wo` dans le dictionnaire `translations` ; chaîne de fallback `wo → fr` (clé WO manquante → FR, pas EN) |
| `components/ui/LanguageSwitcher.tsx` | Ajout de `{ code: 'wo', label: 'WO', flag: '🇸🇳' }` dans `LANGUAGES` (composant avec variants light/dark/glass) |
| `components/LanguageSwitcher.tsx` | Ajout de `wo: { flag: '🇸🇳', name: 'Wolof', shortName: 'WO' }` dans `languages` (composant avec framer-motion, utilisé ailleurs dans l'app) |

### 3.3 Documentation

| Fichier | Changement |
|---|---|
| `docs/i18n-guide.md` | Section "Ajout du Wolof" : conventions orthographiques, politique des emprunts français, exemples de termes clés |
| `CLAUDE.md` | Mentions "FR/EN" → "FR/EN/WO" dans la section i18n |
| `MEMORY.md` | Note mémoire : Wolof ajouté comme 3e locale supportée |

## 4. Stratégie de traduction (par vagues)

Pour garantir la cohérence terminologique à travers les 1772 lignes, la traduction est découpée en **5 vagues** exécutées séquentiellement. Un glossaire interne est établi d'abord et appliqué partout.

### Vague 1 — Glossaire de base (~60 termes récurrents)

Table de correspondance FR → WO figée dès le départ, couvrant :

- Actions UI : Retour, Suivant, Enregistrer, Annuler, Supprimer, Modifier…
- Statuts : Payé, Impayé, En attente, Brouillon, Actif, Inactif…
- Rôles : Admin, Caissier, Client, Marchand, Prestataire, Élève…
- Domaine métier : Facture, Reçu, Panier, Article, Stock, Dépense, Prestation, Devis, Proforma, Wallet, Retrait, Abonnement, Structure, Boutique, École

Ce glossaire sera inclus dans `docs/i18n-guide.md` pour futurs contributeurs.

### Vague 2 — Namespaces "plomberie" courts

- `common` (boutons génériques, ~19 clés)
- `pagination`
- `sidebar`
- `offline`

Volume cumulé estimé : ~50 lignes. Sert de première validation du glossaire.

### Vague 3 — Auth & onboarding

- `auth` (login, PIN, loading modal, messages d'erreur)
- `register` (inscription nouvelle structure)
- `landing` (page d'accueil publique, segments métier)

### Vague 4 — Domaines métier commerce (gros volume)

- `dashboardCommerce` / `commerceDashboard`
- `produits`
- `clients`
- `invoices` / `invoicesModals`
- `venteFlash`
- `expenses`
- `inventory`
- `panier`

### Vague 5 — Public & marketplace

- `publicFacture` (facture publique partageable)
- `publicRecu`
- `marketplace`
- `catalogue`

## 5. Garde-fous techniques

### 5.1 Parité structurelle

Après chaque vague : script/diff de vérification que les clés de `wo.json` sont identiques à celles de `fr.json` (aucune clé ajoutée ni omise). Tolérance zéro sur les clés manquantes.

### 5.2 Placeholders d'interpolation

Tous les `{param}` du FR doivent être préservés dans le WO (`{count}`, `{length}`, `{menuPath}`, `{name}`, etc.). Une vérification regex est faite avant commit.

### 5.3 JSON valide

`JSON.parse()` sur `wo.json` doit réussir. Pas de virgule traînante, pas de guillemet non échappé.

### 5.4 Build Next.js

`npm run build` doit passer sans warnings d'import. Le type `Locale` TypeScript doit être cohérent partout.

### 5.5 Test de fumée UX

Après intégration :
1. `npm run dev`
2. Ouvrir `/login` → basculer WO via le switcher → vérifier absence de fallback visible
3. Se connecter sur compte test commerce → parcourir dashboard, créer une facture, ouvrir le panier
4. Vérifier la console : aucun warning `[i18n] Missing "..." in "wo"` sur les écrans testés

### 5.6 Localisation navigateur

`LanguageContext` doit reconnaître :
- `wo`, `wo-SN` (codes ISO standard)
- Fallback : si `navigator.language` ne matche pas `fr*`/`wo*`, défaut = `en`
- Si `fr*` : défaut = `fr` (comportement actuel inchangé)

## 6. Hors scope (explicite)

- ❌ Traduction par locuteur natif professionnel (pourra être faite en post-livraison)
- ❌ Pluralisation différenciée (le Wolof n'a pas de marqueur de pluriel systématique — on garde des formes uniques)
- ❌ Support RTL (le Wolof s'écrit LTR en latin)
- ❌ Ajout d'autres langues africaines (Pulaar, Sérère, Diola) — hors sujet
- ❌ Déploiement production — cette spec livre sur branche, pas de `npm run deploy:build`
- ❌ Modification de la locale par défaut (reste `fr`)
- ❌ Révision de `fr.json` ou `en.json` — traduction WO uniquement

## 7. Branche & découpage des commits

**Branche** : `feature/i18n-wolof-support` (depuis `main`)

**Découpage commits suggéré** :

1. `✨ feat(i18n): scaffold wo.json + activation code (LanguageContext, hook, switcher)`
   - Fichier `wo.json` avec structure complète mais valeurs = FR temporairement (pour débloquer build)
   - Modifs type `Locale`, hook, switcher
2. `✨ feat(i18n): traduction Wolof vague 1-2 (glossaire + plomberie common/pagination/sidebar/offline)`
3. `✨ feat(i18n): traduction Wolof vague 3 (auth/register/landing)`
4. `✨ feat(i18n): traduction Wolof vague 4 (commerce/produits/factures/panier/...)`
5. `✨ feat(i18n): traduction Wolof vague 5 (public/marketplace/catalogue)`
6. `📝 docs(i18n): guide Wolof + MEMORY/CLAUDE + glossaire`

## 8. Critères d'acceptation

- [ ] `messages/wo.json` existe, valide JSON, ~1772 lignes, parité stricte avec `fr.json`
- [ ] `Locale = 'fr' | 'en' | 'wo'` dans `LanguageContext`
- [ ] Fallback WO → FR fonctionne (vérifié sur clé volontairement omise)
- [ ] Sélecteur de langue affiche l'option Wolof 🇸🇳 WO
- [ ] Détection navigateur `wo`/`wo-SN` → locale `wo`
- [ ] `npm run build` passe sans erreur
- [ ] Test de fumée UX : 3 écrans clés parcourus en WO sans fallback visible
- [ ] `docs/i18n-guide.md` mis à jour avec conventions Wolof
- [ ] `CLAUDE.md` et `MEMORY.md` mentionnent WO
- [ ] Glossaire des 60 termes de base documenté

## 9. Risques & mitigations

| Risque | Mitigation |
|---|---|
| Traduction de qualité variable selon les namespaces | Glossaire établi en vague 1 et appliqué strictement ; relecture de cohérence après chaque vague |
| Certaines clés FR ambiguës sans contexte visuel | Lecture croisée FR+EN+usage dans le code si besoin |
| Placeholders `{param}` perdus accidentellement | Regex de validation avant commit |
| Parité de clés cassée par ajout/oubli | Diff structurel après chaque vague |
| Locuteur natif en désaccord avec nos choix | Livraison sur branche ; branche révisable avant merge main |

## 10. Prochaine étape

Cette spec alimente la phase `writing-plans` qui produira un plan d'implémentation détaillé (découpage tâches, ordre, vérifications intermédiaires).
