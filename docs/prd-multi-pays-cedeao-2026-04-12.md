# PRD — Ouverture FayClick aux pays CEDEAO / UEMOA / Maghreb

**Date** : 2026-04-12
**Branche** : `feature/multi-pays-cedeao`
**Équipe** : Lead (coordination) + DBA + Fullstack + UX
**Statut** : ✅ PRD validé, prêt pour implémentation

---

## 1. Contexte & Objectif

FayClick V2 est actuellement limité aux marchands sénégalais : l'API SMS ne gère que l'indicatif `+221` et les fonctions PG d'inscription ne capturent pas le pays. Ce PRD décrit l'ouverture à **17 pays** (CEDEAO + UEMOA + Maghreb), avec un **MVP centré sur l'inscription** via email Gmail (au lieu de SMS) pour les non-Sénégalais.

## 2. Décisions produit validées

| Thème | Décision |
|-------|----------|
| **Pays cible** | 17 pays : SN (défaut) + CI, ML, BF, TG, BJ, NE, GN, GW, SL, LR, GH, NG, CV + MA, DZ, TN |
| **Routage OTP** | SMS si `code_iso_pays = 'SN'`, sinon Email Gmail strict (`@gmail.com`) |
| **Scope flows OTP** | Inscription + Recovery login uniquement. **Retrait KALPE reste SMS+SN only** |
| **Email API** | `https://api.icelabsoft.com/email_sender/api/send` |
| **Wallets** | OM / WAVE / FREE = Sénégal uniquement. Autres pays = CASH + catalogue public |
| **Devise** | FCFA au MVP, mais champ `devise_code` prévu en DB pour évolution |
| **Migration données** | Toutes les structures existantes → `'SN'` par défaut |
| **UX pays** | Dropdown drapeau intégré au champ téléphone (pas de sélecteur séparé) |
| **Email** | Apparaît dynamiquement si pays ≠ SN (slide-down), obligatoire + Gmail strict |
| **Validation téléphone** | Longueur par pays côté frontend uniquement |
| **Langue** | FR uniquement au MVP (multilingue = PRD séparé) |

## 3. Documents de référence

| # | Fichier | Auteur | Contenu |
|---|---------|--------|---------|
| 00 | `docs/prd-multi-pays/00-audit-phase0.md` | Lead | Audit call sites SMS, fonctions PG, usage `indicatif_pays` |
| 01 | `docs/prd-multi-pays/01-database.md` | DBA | Table `pays`, migration `structures`, `add_edit_inscription_v2`, fonctions PG impactées |
| 02 | `docs/prd-multi-pays/02-services.md` | Fullstack | `email.service.ts`, `otp-router.service.ts`, refactor registration, types |
| 03 | `docs/prd-multi-pays/03-ux-inscription.md` | UX | `CountryPhoneInput`, flow email dynamique, validation tel par pays |

## 4. Architecture cible (vue d'ensemble)

```
┌─────────────────────────────────────────────────────────────┐
│                      app/register/page.tsx                   │
│  ┌────────────────────┐    ┌────────────────────────────┐   │
│  │ CountryPhoneInput  │    │ Email Gmail (dynamique)    │   │
│  │ 🇸🇳 +221 ▾ [input] │    │ apparaît si pays ≠ SN      │   │
│  └────────┬───────────┘    └──────────┬─────────────────┘   │
│           │                            │                     │
│           ▼                            ▼                     │
│     state.countryCode           state.emailGmail            │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ▼ (soumission)
         ┌──────────────────────────┐
         │ registration.service.ts  │ → add_edit_inscription_v2(13 params)
         │ (+code_iso_pays, +email) │
         └──────────┬───────────────┘
                    │
                    ▼ (OTP PIN)
         ┌──────────────────────────┐
         │ otp-router.service.ts    │
         │  ├─ SN  → sms.service    │
         │  └─ ≠SN → email.service  │ → API ICELABSOFT /email_sender
         └──────────────────────────┘
```

## 5. Plan d'implémentation séquencé

### 🗄️ Sprint 1 — Base de données (DBA, ~1 jour)
Dépendance : aucune. Exécuter en premier.

1. `CREATE TABLE pays` + INSERT des 17 pays
2. Migration `structures` : ADD `code_iso_pays CHAR(2) DEFAULT 'SN'` + FK + UPDATE existantes + CHECK email Gmail si non-SN + DROP `indicatif_pays`
3. `CREATE OR REPLACE FUNCTION add_edit_inscription_v2(13 params)` (coexiste avec v1)
4. Révision `get_une_structure()` + vue `list_structures` (ajout JOIN pays)
5. Requêtes de vérification post-migration

**Livrables** : scripts SQL numérotés + rollback prêts à exécuter
**Validation** : tests DO/EXCEPTION sur contrainte CHECK email, comptage structures post-migration

### 🔧 Sprint 2 — Services backend (Fullstack, ~1 jour)
Dépendance : Sprint 1 terminé.

1. Créer `types/pays.ts` avec interface + constante `PAYS_LIST` (17 pays hardcodés, synchronisés avec DB)
2. Créer `services/email.service.ts` (singleton, validation Gmail strict, retry logic)
3. Créer `services/otp-router.service.ts` (dispatch SN↔non-SN)
4. Refactor `services/registration.service.ts` : ajouter `code_iso_pays` + `email_gmail` dans `RegistrationData`, valider Gmail si non-SN, appeler `add_edit_inscription_v2`
5. Étendre `types/registration.ts`, `types/admin.types.ts` (ajout `code_iso_pays`, `devise`)

**Livrables** : 3 nouveaux fichiers + 3 fichiers modifiés, tests unitaires
**Validation** : 10 tests unitaires (email.service, otp-router) + 6 tests d'intégration

### 🎨 Sprint 3 — UX inscription (UX + Fullstack, ~1,5 jour)
Dépendance : Sprint 2 terminé.

1. Créer `components/register/CountryPhoneInput.tsx` (dropdown drapeau + input tel, accessible clavier)
2. Refactor `app/register/page.tsx` :
   - State `countryCode` (défaut `'SN'`) + `emailGmail`
   - Remplacer bloc préfixe `+221` (lignes 576-591) par `<CountryPhoneInput />`
   - Ajouter champ email dynamique (framer-motion slide-down) si pays ≠ SN
   - Validation téléphone par pays (mapping longueurs dans `PAYS_LIST`)
   - Payload inscription : `code_iso_pays` + `email` (si non-SN)
3. Refactor `components/auth/ModalRecoveryOTP.tsx` : récupérer `code_iso_pays` de la structure et router OTP

**Livrables** : 1 nouveau composant + 2 fichiers modifiés
**Validation** : test manuel sur 4 cas (SN, CI valide, CI email non-gmail, CI tel trop court)

### 🚀 Sprint 4 — QA & Déploiement (Lead, ~0,5 jour)
1. Tests manuels bout-en-bout : inscription SN, CI, MA + recovery
2. Vérification flows non-impactés (retrait KALPE doit rester SMS+SN)
3. Déploiement prod après merge sur `main`

## 6. Risques & Mitigation

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Fonctions PG secondaires référencent encore `indicatif_pays` après DROP COLUMN | Moyenne | Haut | Requête `pg_depend` avant DROP (détaillée dans `01-database.md` §5) |
| API email ICELABSOFT indisponible au moment de l'inscription non-SN | Faible | Bloquant inscription | Message d'erreur clair + retry, mais pas de fallback SMS (numéros non-SN non supportés) |
| Utilisateur étranger rentre un email non-Gmail | Certaine | UX | Validation inline stricte avec message explicite "Gmail uniquement (ex: vous@gmail.com)" |
| Longueurs téléphone incorrectes dans mapping pays | Moyenne | UX (validation trop stricte/laxe) | Revue du mapping avec sources officielles, test manuel au moins 3 pays |
| Structures existantes sans `email` valide qui changent leur pays a posteriori | Faible | Contrainte CHECK échoue | Documentation : changement pays → ajout email obligatoire d'abord |

## 7. Hors scope (futurs PRD)

- **Wallets locaux** : Orange Money Mali, MTN Côte d'Ivoire, etc.
- **Multilingue** : Anglais (Ghana, Nigeria, Liberia, Sierra Leone), Arabe (Maroc, Algérie, Tunisie)
- **Devises multiples** : Maroc MAD, Guinée GNF (champ prévu, logique non implémentée)
- **Retrait KALPE multi-pays** : reste SMS+SN uniquement au MVP

## 8. Critères d'acceptation (MVP)

- [ ] Un marchand SN s'inscrit comme avant (comportement identique, SMS OTP reçu)
- [ ] Un marchand CI/MA/etc. s'inscrit avec email Gmail obligatoire (OTP reçu par email)
- [ ] Un marchand non-SN tentant avec email non-gmail est bloqué (validation frontend + backend)
- [ ] Dropdown pays fonctionne clavier (flèches, Enter, Esc)
- [ ] Champ email apparaît/disparaît dynamiquement selon pays
- [ ] Toutes les structures existantes en production ont `code_iso_pays = 'SN'` après migration
- [ ] Contrainte CHECK PostgreSQL empêche d'insérer une structure non-SN sans email Gmail
- [ ] Retrait KALPE inchangé (SMS+SN)
- [ ] Aucune régression sur login, paiements, factures

## 9. Estimation globale

**Effort total** : ~4 jours développeur
- Sprint 1 (DB) : 1 j
- Sprint 2 (Services) : 1 j
- Sprint 3 (UX) : 1,5 j
- Sprint 4 (QA+Deploy) : 0,5 j

## 10. Validation utilisateur

Le présent PRD consolidé et les 3 PRD détaillés (`01-database.md`, `02-services.md`, `03-ux-inscription.md`) sont **prêts pour validation**. Une fois approuvés, démarrage immédiat du Sprint 1.

---

*PRD produit par l'équipe Lead+DBA+Fullstack+UX le 2026-04-12 — branche `feature/multi-pays-cedeao`*
