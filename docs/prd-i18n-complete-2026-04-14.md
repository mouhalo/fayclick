# PRD — Internationalisation complète FayClick V2 (FR/EN)

**Date** : 2026-04-14
**Auteur** : Product Manager (agent BMAD)
**Projet** : FayClick V2 — traduction FR/EN de l'intégralité de l'application
**Branche Git** : `gestion_multilangue_fr_et_en` (à créer depuis `main`)
**Statut** : Draft — en attente validation utilisateur

---

## 1. Executive Summary

Finaliser l'internationalisation de FayClick V2 en **français (défaut) + anglais** sur l'ensemble des surfaces applicatives (pages publiques, dashboards, modules métier, modals, messages, exports). L'infrastructure i18n existe déjà (solution custom `LanguageContext` + `useTranslations` + fichiers `messages/fr.json|en.json`) et couvre actuellement les namespaces `common`, `register`, `landing`. Le travail consiste à **étendre méthodiquement la couverture** page par page, sprint par sprint, avec validation QA et review manuelle utilisateur avant chaque déploiement.

### Objectifs business
1. **Ouvrir FayClick aux marchés anglophones CEDEAO** (Nigeria, Ghana, Gambie, Sierra Leone, Liberia) en cohérence avec l'ouverture aux 17 pays CEDEAO/UEMOA/Maghreb (commit `c1e7522`).
2. **Améliorer l'expérience utilisateur** avec un switch de langue natif disponible partout.
3. **Ne casser aucune fonctionnalité existante** — refactor pur de texte, zéro régression métier.

### Métriques de succès
- 100 % des chaînes visibles utilisateur traduites par sprint livré.
- 0 régression fonctionnelle détectée par l'agent QA entre sprints.
- 0 clé de traduction manquante en console (warnings `useTranslations`).
- Switch FR↔EN instantané (< 100 ms, sans rechargement page).

---

## 2. Contexte technique existant

### Stack i18n en place (à conserver)
- **Contexte** : `contexts/LanguageContext.tsx` — gère `locale` (`fr`|`en`) + persistance localStorage (`fayclick-locale`) + détection navigateur.
- **Hook** : `hooks/useTranslations.ts` — signature `useTranslations(namespace)` → fonction `t(key, params?)` avec support clés imbriquées (`step1.title`) et interpolation `{name}`.
- **Fichiers traduction** : `messages/fr.json` et `messages/en.json` — structure par namespaces.
- **Namespaces actuels** : `common`, `register`, `landing`.
- **Login** : démarré partiellement — à finaliser en Sprint 1.

### Données à NE PAS traduire
- Contenus saisis par le commerçant en BD (noms produits, descriptions, noms structure, adresses, factures historiques).
- Codes techniques (IDs, références, codes-barres).

### Données à adapter selon locale
- **Dates** : `toLocaleDateString('fr-FR' | 'en-US')`.
- **Nombres/montants** : `toLocaleString('fr-FR' | 'en-US')`.
- **Devise** : récupérée depuis les données structure (`devise` + `code_devise`) — pas de hardcoding FCFA.

---

## 3. Functional Requirements (FRs)

### FR-001 : Header — Switch langue global
**Priorité** : Must Have
**Description** : Composant `<LanguageSwitcher />` placé dans le header principal (mobile + desktop) permettant de basculer FR↔EN en 1 clic, sans rechargement page.
**Acceptance Criteria**
- [ ] Dropdown ou toggle visible en permanence dans le header (tous contextes authentifiés + non authentifiés).
- [ ] Sélection persistée en localStorage (`fayclick-locale`).
- [ ] Changement reflété immédiatement sur tous les composants sans F5.
- [ ] Icône drapeau + code langue (ex: 🇫🇷 FR / 🇬🇧 EN).
- [ ] Accessible clavier (tab + enter).

---

### FR-002 : Sprint 1 — Finalisation Connexion + Inscription + Accueil
**Priorité** : Must Have
**Description** : Traduire intégralement `/login` (déjà commencé), `/register` (déjà partiellement fait via namespace `register`), et la landing page (`MobileHome.tsx`, `DesktopHome.tsx`, namespace `landing` existant).
**Acceptance Criteria**
- [ ] `/login` : 100 % des labels, placeholders, boutons, messages d'erreur traduits.
- [ ] ModalRecoveryOTP (récupération mot de passe) traduit.
- [ ] `/register` : tous les steps (1-4) revus et complétés.
- [ ] `MobileHome.tsx` + `DesktopHome.tsx` + `MarketplaceCTA.tsx` : 100 % traduits.
- [ ] Toasts et validations formulaires inclus.
- [ ] Namespace `auth` créé (pour login + OTP + recovery).
- [ ] QA agent valide — screenshots FR + EN des 3 pages.

---

### FR-003 : Sprint 2 — Pages publiques
**Priorité** : Must Have
**Description** : Traduire toutes les pages accessibles sans authentification.
**Pages concernées** : `/facture` (facture publique), `/recu`, `/catalogue`, `/catalogues`, `/marketplace` + `CarteBoutiqueVedette`, `/offline`, `/privacy`, `/terms`.
**Acceptance Criteria**
- [ ] Chaque page affiche 100 % de son contenu dans la langue sélectionnée.
- [ ] Modals de paiement wallet (OM/WAVE/FREE) traduits dans contexte public.
- [ ] Messages d'erreur de chargement facture/reçu traduits.
- [ ] Namespaces dédiés : `public-facture`, `public-recu`, `catalogue`, `marketplace`, `legal` (privacy/terms), `offline`.
- [ ] QA agent valide — screenshots FR + EN.

---

### FR-004 : Sprint 3 — Dashboards + Navigation
**Priorité** : Must Have
**Description** : Traduire les dashboards de tous les types de structure et la navigation associée.
**Pages concernées** : `/dashboard/commerce` (mobile + desktop `CommerceDashboardDesktop`), `/dashboard/scolaire`, `/dashboard/immobilier`, `/dashboard/services`, `/dashboard/admin`, sidebar/header dashboard, menus.
**Acceptance Criteria**
- [ ] KPIs, labels graphiques, titres sections traduits.
- [ ] Top articles/clients, dernières factures : libellés colonnes traduits (données DB intactes).
- [ ] Navigation (sidebar items, breadcrumbs, menu utilisateur) traduite.
- [ ] Dashboard desktop Commerce : WeeklyBarChart, TopProducts, TopClients, RecentInvoices, StatsGlobales.
- [ ] Masquage CAISSIER (`canViewCA`) fonctionne identiquement FR/EN.
- [ ] Namespaces : `dashboard-common`, `dashboard-commerce`, `dashboard-scolaire`, `dashboard-immobilier`, `dashboard-services`, `dashboard-admin`.
- [ ] QA agent valide.

---

### FR-005 : Sprint 4 — Modules Commerce
**Priorité** : Must Have
**Description** : Traduire tous les sous-modules du dashboard Commerce.
**Pages concernées** : Produits, Clients, Factures (+ Proformas), VenteFlash, Panier, Dépenses, Inventaire.
**Acceptance Criteria**
- [ ] Pages liste : filtres, tri, colonnes, pagination, états vides traduits.
- [ ] Formulaires création/édition : tous labels + placeholders + validations.
- [ ] Modal scan code-barres + modal sélection multi-matches.
- [ ] VenteFlash header, panier, encaissement CASH.
- [ ] Proformas (3e onglet compte_prive) : tous composants (ProformasTab, ProformaCard, modals créer/convertir/détails).
- [ ] Namespaces : `commerce-produits`, `commerce-clients`, `commerce-factures`, `commerce-proformas`, `commerce-venteflash`, `commerce-panier`, `commerce-depenses`, `commerce-inventaire`.
- [ ] QA agent valide.

---

### FR-006 : Sprint 5 — Modals globaux + Toasts + Impression
**Priorité** : Must Have
**Description** : Traduire tous les modals transversaux et systèmes d'alertes.
**Composants concernés** : `SuccessModal`, `ModalPaiementQRCode`, `ModalRecuGenere`, `ModalRecuVenteFlash`, `ModalFactureSuccess`, `ModalImpressionDocuments`, `OTPInput`, `ModalCoffreFort`, `WalletFlipCard`, toasts (react-hot-toast si utilisé), dialogues confirmation.
**Acceptance Criteria**
- [ ] Tous messages de succès/erreur traduits.
- [ ] Templates reçus 80mm (`generate-ticket-html.ts`) : labels FR/EN selon locale active au moment de la génération (badge PAYE/PAID, sous-total/subtotal, etc.).
- [ ] Badges proforma/facture/reçu bilingues.
- [ ] Namespaces : `modals-common`, `modals-payment`, `modals-print`, `toasts`.
- [ ] QA agent valide.

---

### FR-007 : Sprint 6 — Messages services + Validations + Exports CSV
**Priorité** : Must Have
**Description** : Traduire les messages issus des services (erreurs API, validations Zod/manuelles) et les en-têtes d'exports CSV.
**Acceptance Criteria**
- [ ] Erreurs API mappées vers clés i18n (ex: `errors.network`, `errors.unauthorized`, `errors.validation.required`).
- [ ] Messages de validation formulaires centralisés dans namespace `validation`.
- [ ] Exports CSV : en-têtes de colonnes traduits selon locale active (facture.csv, produits.csv, clients.csv, depenses.csv, proformas.csv).
- [ ] Noms de fichiers CSV avec suffixe locale (ex: `factures_2026-04-14_fr.csv`).
- [ ] Namespaces : `errors`, `validation`, `exports`.
- [ ] QA agent valide.

---

### FR-008 : Sprint 7 — Paramètres + Structure + Abonnements + KALPE
**Priorité** : Must Have
**Description** : Traduire les pages de configuration et gestion avancée.
**Pages concernées** : `/settings` (UsersManagement, CategoriesManagement, FactureLayoutEditor, règles ventes, infos facture), `/structure/gestion`, page Abonnements, ModalCoffreFort (onglets KALPE + Transactions + Retraits).
**Acceptance Criteria**
- [ ] Tous labels paramètres + descriptions explicatives traduits.
- [ ] FactureLayoutEditor : zones header/footer, tooltips drag & drop.
- [ ] Workflow retrait wallet : libellés OTP, confirmation, succès/échec.
- [ ] Namespaces : `settings`, `structure`, `subscription`, `kalpe`, `retraits`.
- [ ] QA agent valide.

---

### FR-009 : Formats dates, nombres et devise
**Priorité** : Must Have
**Description** : Adapter le formatage selon la locale active.
**Acceptance Criteria**
- [ ] Helper centralisé `lib/format-locale.ts` : `formatDate(date, locale)`, `formatNumber(n, locale)`, `formatCurrency(amount, structure)`.
- [ ] Dates : `fr-FR` → `14/04/2026` / `en-US` → `04/14/2026`.
- [ ] Nombres : séparateurs adaptés (`1 234,56` FR vs `1,234.56` EN).
- [ ] Devise : récupérée depuis données structure (`structure.devise`, `structure.code_devise`) — fallback `FCFA`/`XOF`.
- [ ] Refactor des usages existants de `toLocaleDateString` et `toLocaleString` vers le helper.

---

### FR-010 : Détection langue navigateur + persistance
**Priorité** : Must Have (déjà implémenté)
**Description** : Détecter la langue navigateur au premier chargement, persister le choix en localStorage.
**Acceptance Criteria**
- [x] Premier chargement : `navigator.language` → `fr` si commence par `fr`, sinon `en`.
- [x] Choix stocké dans `localStorage.fayclick-locale`.
- [x] `document.documentElement.lang` mis à jour.
- [ ] Tests cross-browser (Chrome, Safari, Firefox, Edge mobile).

---

### FR-011 : Clés manquantes — fallback + logs
**Priorité** : Should Have
**Description** : Améliorer le système de fallback pour clés manquantes afin de ne jamais afficher `undefined`.
**Acceptance Criteria**
- [ ] Si clé manquante en `en` → fallback sur `fr` au lieu d'afficher la clé brute.
- [ ] Warning console structuré : `[i18n] Missing key "namespace.key" in locale "en"`.
- [ ] Script de lint `scripts/check-i18n-keys.mjs` pour détecter clés manquantes entre `fr.json` et `en.json` (diff).

---

### FR-012 : Documentation développeur
**Priorité** : Should Have
**Description** : Documenter la procédure d'ajout de traductions pour faciliter la maintenance.
**Acceptance Criteria**
- [ ] `docs/i18n-guide.md` : comment ajouter un namespace, une clé, utiliser `t()`, gérer l'interpolation.
- [ ] Mise à jour CLAUDE.md section i18n.

---

## 4. Non-Functional Requirements (NFRs)

### NFR-001 : Performance
**Priorité** : Must Have
**Description** : Le switch de langue ne doit jamais dégrader les perfs.
**Critères**
- [ ] Changement de locale < 100 ms (perçu instantané).
- [ ] Fichiers `messages/fr.json` et `messages/en.json` chargés dans le bundle initial (pas de lazy-load critique à ce stade — si dépassement 50 KB par fichier, envisager splitting par route).
- [ ] Aucune requête réseau pour changer de langue.

---

### NFR-002 : Zéro régression fonctionnelle
**Priorité** : Must Have
**Description** : Aucune fonctionnalité métier ne doit être cassée par le refactor i18n.
**Critères**
- [ ] Tous les scénarios critiques (login, création facture, paiement, vente flash, retrait wallet) passent identiquement FR et EN.
- [ ] QA agent `qa-test-regression` valide après chaque sprint avant déploiement.
- [ ] Aucune modification de logique métier — refactor limité à extraction de strings.

---

### NFR-003 : Couverture traduction 100 %
**Priorité** : Must Have
**Description** : Chaque sprint doit livrer une couverture 100 % des pages concernées.
**Critères**
- [ ] 0 string hardcodée en FR dans les composants du périmètre sprint.
- [ ] 0 warning `useTranslations` en console.
- [ ] Script de lint détecte les regex `>[A-ZÀ-Ÿ][a-zà-ÿ]+` suspectes dans JSX.

---

### NFR-004 : Maintenabilité
**Priorité** : Must Have
**Critères**
- [ ] Structure `messages/*.json` organisée par namespaces métier cohérents.
- [ ] Clés en anglais technique (`submitButton`, `errorNetworkTimeout`), pas en français — pour homogénéité code.
- [ ] Interpolation `{variable}` documentée.
- [ ] Namespaces imbriqués autorisés max 3 niveaux (`section.subsection.key`).

---

### NFR-005 : Accessibilité
**Priorité** : Should Have
**Critères**
- [ ] Attribut `lang` sur `<html>` mis à jour au switch.
- [ ] Labels ARIA traduits (boutons icônes, menus).
- [ ] Contrastes et tailles inchangés quelle que soit la longueur des traductions (certaines strings EN peuvent être + longues que FR).

---

### NFR-006 : Compatibilité impression/PDF
**Priorité** : Must Have
**Description** : Les tickets 80mm et PDFs générés doivent refléter la langue active au moment de la génération.
**Critères**
- [ ] `generate-ticket-html.ts` accepte `locale` en paramètre.
- [ ] Badges PAYE/PAID, ACOMPTE/DEPOSIT, PROFORMA traduits.
- [ ] Footer "Merci" / "Thank you" traduit.

---

### NFR-007 : Build & Déploiement
**Priorité** : Must Have
**Critères**
- [ ] `npm run build` passe sans erreur TypeScript.
- [ ] Taille bundle JS n'augmente pas > 15 % (fichiers JSON compressibles).
- [ ] Déploiement via workflow standard (`rm -rf .next && npm run deploy:build`) après chaque sprint validé manuellement.

---

## 5. Epics & Sprints

Chaque sprint = 1 epic = 1 cycle complet (dev → QA agent → review manuelle utilisateur → merge → déploiement).

### EPIC-001 : Infrastructure i18n & Switch Langue (transverse S1)
**Description** : Créer le `LanguageSwitcher` header + helper formats + script lint clés manquantes + doc dev.
**FRs** : FR-001, FR-009, FR-011, FR-012
**Story estimate** : 4-5 stories
**Priorité** : Must Have — bloquant pour tous les autres sprints.

### EPIC-002 : Sprint 1 — Auth & Landing
**Description** : Finalisation Connexion, Inscription, Accueil.
**FRs** : FR-002
**Story estimate** : 5-7 stories
**Priorité** : Must Have.

### EPIC-003 : Sprint 2 — Pages Publiques
**FRs** : FR-003
**Story estimate** : 6-8 stories (une par page publique).
**Priorité** : Must Have.

### EPIC-004 : Sprint 3 — Dashboards & Navigation
**FRs** : FR-004
**Story estimate** : 7-9 stories (une par type dashboard + nav).
**Priorité** : Must Have.

### EPIC-005 : Sprint 4 — Modules Commerce
**FRs** : FR-005
**Story estimate** : 8-10 stories (une par module).
**Priorité** : Must Have.

### EPIC-006 : Sprint 5 — Modals & Impression
**FRs** : FR-006, NFR-006
**Story estimate** : 5-7 stories.
**Priorité** : Must Have.

### EPIC-007 : Sprint 6 — Services, Validations & Exports
**FRs** : FR-007
**Story estimate** : 4-6 stories.
**Priorité** : Must Have.

### EPIC-008 : Sprint 7 — Paramètres, Structure, KALPE
**FRs** : FR-008
**Story estimate** : 5-7 stories.
**Priorité** : Must Have.

---

## 6. Workflow & Process par Sprint

Pour chaque sprint :

```
1. [Dev] Implémentation
   - Lister composants/pages du périmètre (scope figé au début du sprint)
   - Extraire strings → ajout dans messages/fr.json + messages/en.json
   - Remplacer par appels t(...)
   - Vérifier aucune modification de logique métier
   - npm run build (vérifier 0 erreur TS)
   - Tests manuels FR + EN sur pages concernées

2. [QA Agent] Validation
   - Agent qa-test-regression lancé sur le scope
   - Vérifications :
     * 0 régression fonctionnelle (scénarios critiques passent)
     * 0 string hardcodée détectée
     * 0 clé manquante en console
     * Screenshots FR + EN des pages concernées
     * Check formats dates/montants/devise
   - Rapport QA remis à l'utilisateur

3. [Utilisateur] Review manuelle
   - Lecture rapport QA
   - Tests perso FR + EN
   - Validation explicite → autorise passage au sprint suivant
   - Si rejet → corrections avant déploiement

4. [Déploiement]
   - Uniquement APRÈS validation manuelle utilisateur
   - Branche gestion_multilangue_fr_et_en
   - rm -rf .next && npm run deploy:build
   - Vérification prod + Hard refresh
   - Commit + push

5. [Sprint suivant]
```

**Règle critique** : pas de merge sur `main` avant que tous les sprints soient terminés ET validés. Travail continu sur `gestion_multilangue_fr_et_en`.

---

## 7. Traceability Matrix

| Epic ID   | Epic Name                        | FRs                    | Story Estimate |
|-----------|----------------------------------|------------------------|----------------|
| EPIC-001  | Infra i18n & Switch              | FR-001, FR-009, FR-011, FR-012 | 4-5    |
| EPIC-002  | Sprint 1 — Auth & Landing        | FR-002                 | 5-7            |
| EPIC-003  | Sprint 2 — Pages publiques       | FR-003                 | 6-8            |
| EPIC-004  | Sprint 3 — Dashboards & Nav      | FR-004                 | 7-9            |
| EPIC-005  | Sprint 4 — Modules Commerce      | FR-005                 | 8-10           |
| EPIC-006  | Sprint 5 — Modals & Impression   | FR-006, NFR-006        | 5-7            |
| EPIC-007  | Sprint 6 — Services & Exports    | FR-007                 | 4-6            |
| EPIC-008  | Sprint 7 — Paramètres & KALPE    | FR-008                 | 5-7            |
| **Total** |                                  | **12 FRs + 7 NFRs**    | **44-59 stories** |

---

## 8. Prioritization Summary

- **Must Have** : 10 FRs + 6 NFRs
- **Should Have** : 2 FRs + 1 NFR
- **Could Have** : 0

Aucun requirement "Could Have" — l'i18n est binaire (complet ou incomplet par périmètre).

---

## 9. User Personas

- **Utilisateur francophone** (marchés SN/CI/ML/BF/BJ/TG/GN/NE/MR/MA/TN/DZ) — défaut.
- **Utilisateur anglophone** (marchés NG/GH/GM/SL/LR) — nouveau segment.
- **Admin système** — bilingue, switch fréquent.
- **Caissier** — langue figée par le commerçant, peut changer si besoin.

---

## 10. Key User Flows

1. **Premier visiteur anglophone** → landing EN détectée navigateur → inscription EN → dashboard EN.
2. **Commerçant FR existant** → switch EN via header → toutes pages EN instantanément → retour FR conservé après session.
3. **Client anglophone payant facture publique** → lien partagé ouvre page EN → paiement wallet EN → reçu imprimé EN.

---

## 11. Dependencies

**Internes** :
- `contexts/LanguageContext.tsx` (existant — à enrichir si besoin).
- `hooks/useTranslations.ts` (existant — améliorer fallback FR-012).
- `messages/fr.json` + `messages/en.json` (existants — étendre).
- Composants header mobile/desktop (ajout switch).

**Externes** : aucune (solution custom sans lib externe).

---

## 12. Assumptions

- Le choix stack custom (pas `next-intl` ni `react-i18next`) est définitif.
- Les contenus BD restent dans la langue d'origine saisie par le commerçant.
- La devise est toujours disponible dans les données structure (sinon fallback FCFA/XOF).
- Le volume de traductions reste gérable en un fichier JSON par locale (< 500 KB chacun).
- Pas d'i18n des contenus techniques (logs, erreurs dev).

---

## 13. Out of Scope

- ❌ Traduction automatique des contenus BD (noms produits, descriptions).
- ❌ Support RTL (arabe).
- ❌ Langues africaines (Wolof, Yoruba, Dioula, Haoussa) — mentionnées mais non retenues pour ce PRD.
- ❌ Migration vers `next-intl` ou autre lib externe.
- ❌ Traduction des emails/SMS transactionnels côté backend (périmètre frontend UI uniquement).
- ❌ Changement de logique métier.
- ❌ Refonte UI/UX — conservation exacte du design actuel.

---

## 14. Open Questions

1. ❓ **Header non-authentifié** : le switch langue doit-il apparaître sur pages publiques sans header complet (`/facture`, `/recu`) ? → proposition : mini-switch en haut à droite, cohérent partout.
2. ❓ **Profil utilisateur multi-langue** : si un marchand FR crée un reçu et l'envoie à un client EN, le reçu imprimé doit-il être dans la langue du marchand ou du client ? → proposition : langue active au moment de génération côté frontend.
3. ❓ **SMS/WhatsApp** : les templates SMS sont côté backend — traduction dans un PRD séparé ?

---

## 15. Stakeholders

- **Product Owner** : utilisateur
- **Dev Lead** : Claude Code (agent dev)
- **QA** : agent `qa-test-regression`
- **Validation finale** : utilisateur (review manuelle avant chaque déploiement)

---

## 16. Deliverables par Sprint

À livrer à la fin de chaque sprint :
1. Code commité sur `gestion_multilangue_fr_et_en`.
2. Rapport QA agent avec screenshots FR + EN.
3. Liste des composants/pages modifiés.
4. Checklist de régression testée.
5. Build production passant (`npm run build` OK).

**Déploiement** : uniquement après validation utilisateur explicite.

---

## 17. Next Steps

1. ✅ **Validation de ce PRD par l'utilisateur** — ajustements si nécessaire.
2. ⏭️ **Phase Architecture** (optionnelle vu l'infra existante) ou directement **Sprint Planning S1** via `bmad:create-story`.
3. ⏭️ Création branche `gestion_multilangue_fr_et_en`.
4. ⏭️ Implémentation EPIC-001 (infrastructure transverse) → puis Sprint 1.

---

**Fin du PRD.**
