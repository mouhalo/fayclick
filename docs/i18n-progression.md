# Progression Internationalisation FayClick V2 (FR/EN)

**Dernière mise à jour** : 2026-04-15 (fin session)
**Branche Git** : `gestion_multilangue_fr_et_en`
**PRD** : [docs/prd-i18n-complete-2026-04-14.md](./prd-i18n-complete-2026-04-14.md)
**Guide dev** : [docs/i18n-guide.md](./i18n-guide.md)

---

## Vue d'ensemble

| Sprint | Statut | QA | Déploiement |
|--------|--------|----|-------------|
| EPIC-001 — Infrastructure | ✅ Terminé | ✅ GO | ⏳ En attente validation utilisateur |
| Sprint 1 — Auth & Landing | ✅ Terminé | ✅ GO (92/100) | ⏳ En attente validation utilisateur |
| Sprint 2 — Pages publiques | ✅ Terminé (4/4 lots) | — | — |
| Sprint 3 — Dashboards & Navigation | 🟡 Partiel (commerce mobile OK) | — | — |
| Sprint 4 — Modules Commerce | 🟡 En cours (4/6 livrés) | — | — |
| Sprint 5 — Modals & Impression | ⏸️ À démarrer | — | — |
| Sprint 6 — Services, Validations, Exports | ⏸️ À démarrer | — | — |
| Sprint 7 — Paramètres, Structure, KALPE | ⏸️ À démarrer | — | — |

**Couverture actuelle** : 965 clés FR = 965 clés EN (parité parfaite)
**Commits totaux** : 24 commits atomiques sur la branche

---

## Stack technique

Solution **custom** (pas `next-intl` ni `react-i18next`) :

- `contexts/LanguageContext.tsx` — locale + persistance localStorage (`fayclick-locale`)
- `hooks/useTranslations.ts` — hook `t(key, params?)` avec fallback FR + warnings console
- `messages/fr.json` + `messages/en.json` — structure par namespaces
- `components/ui/LanguageSwitcher.tsx` — dropdown FR/EN (variants light/dark/glass, compact)
- `lib/format-locale.ts` — helpers formatDate/Number/Currency
- `scripts/check-i18n-keys.mjs` — lint parité (`npm run i18n:check`)

### Namespaces actuels (12)
- `common` — boutons/labels partagés
- `auth` — login, PIN, modals récup mot de passe/PIN
- `register` — inscription 3 steps + célébration
- `landing` — landing page mobile/desktop + marketplace CTA
- `offline` — page /offline
- `publicFacture` — facture publique partageable
- `publicRecu` — reçu public partageable
- `marketplace` + `catalogue` — pages publiques /catalogues + /catalogue
- `dashboardCommerce` — dashboard commerce mobile
- `expenses` — module dépenses (85 clés)
- `inventory` — module inventaire (63 clés)
- `clients` — module clients (149 clés)
- `invoices` — module factures page + composants (98 clés)
- `invoicesModals` — 6 modals factures (121 clés)

---

## EPIC-001 — Infrastructure (commit `82f9d5a`)

### Livrables
- ✅ `hooks/useTranslations.ts` avec fallback FR si clé manquante EN
- ✅ `components/ui/LanguageSwitcher.tsx` (variants light/dark/glass, compact)
- ✅ `lib/format-locale.ts` (formatDate, formatNumber, formatCurrency via `structure.devise`)
- ✅ `scripts/check-i18n-keys.mjs` + `npm run i18n:check`
- ✅ Switch intégré dans `LandingNavbar` + `DashboardHeader` + `/login`
- ✅ `docs/i18n-guide.md` (guide dev)
- ✅ `docs/prd-i18n-complete-2026-04-14.md` (PRD complet 8 epics)

---

## Sprint 1 — Auth & Landing (commits `0442c89` → `c9b21c7`)

### Pages traduites
- ✅ `/login` (mode classique + PIN, barre progression avec `loginStepKey` stable)
- ✅ `/register` (3 steps : businessName, config, finalisation + célébration + validations)
- ✅ `ModalPasswordRecovery` (3 étapes : request, verify, success)
- ✅ `ModalRecoveryOTP` (form + success, canaux SMS/Email/WhatsApp)
- ✅ `MarketplaceCTA` (variants mobile + desktop)
- ✅ `MobileHome.tsx` + `DesktopHome.tsx` (déjà traduits antérieurement)
- ✅ `LandingNavbar` (switch langue intégré)
- ✅ `DashboardHeader` (switch langue intégré compact)

### Rapport QA — score 92/100
**Agent** : `qa-test-regression`
**Verdict** : 🟢 **GO pour déploiement**

Blockers résolus (commit `c9b21c7`) :
1. ✅ 3 `alert()` + fallback erreur dans `register/page.tsx` traduits
2. ✅ `register.step3.privacyLink` corrigé : "privacy policy" (était "terms of service" — erroné)
3. ✅ `app/register/page.backup.tsx` supprimé

### Dette technique notée (à traiter Sprint 2+)
- Harmoniser terminologie `Sign in` / `Login` / `Registration` / `Sign up`
- Traduire `aria-label="Changer la langue"` du LanguageSwitcher
- `aria-label="Navigation principale"` du LandingNavbar
- Ajouter `eslint-plugin-i18n-json` ou règle `no-literal-string` pour JSX
- `<html lang>` dynamique côté SSR via middleware (actuellement hardcodé `fr` au build)

### Exclusions voulues (noms propres non traduits)
- `FayClick`, `IcelabSoft`, `Orange Money`, `Wave`, `WhatsApp`, `Gmail`, `Sénégal`/`Senegal`

---

## Sprint 2 — Pages publiques (en cours)

### Lot 1 — Pages légales + offline — ✅ Partiel
- ✅ `/offline` traduit (commit `b7e9df9`)
- ⏸️ `/privacy` (287L, server component) — reporté passe dédiée
- ⏸️ `/terms` (228L, server component) — reporté passe dédiée

**Pourquoi report** : `/privacy` et `/terms` sont des server components avec `export metadata` et contiennent du texte légal dense (~200 strings). Nécessitent refactor en client component + traduction juridique soignée. À traiter dans session dédiée.

### Lot 2 — Facture + Reçu publique — ✅ Terminé
- ✅ `FacturePubliqueClient` (659L) — namespace `publicFacture` (commit `00d630b`)
- ✅ `RecuPubliqueClient` (407L) — namespace `publicRecu` (commit `036ffac`)
- ✅ `formatMontant` utilise `formatCurrency` + `locale` (pas de `fr-SN` hardcodé)
- ✅ `formatDate`/`formatHeure` utilisent `toBcp47(locale)`
- ✅ Template WhatsApp interpolé avec paramètres traduits
- ✅ Pluralisation simple (articleCountSingular/Plural via count)
- ⏸️ `ModalPaiementWalletNew` (335L) — flow authentifié, reporté au **Sprint 5 (Modals)**

### Lot 3 — Catalogue public — ✅ Terminé
- ✅ `CataloguePublicClient` (447L) — namespace `catalogue` (commit `5df5679`)
- ✅ `CarteProduit` (176L) — card avec formatPrix localisé
- ✅ `PanierPublic` (438L) — drawer complet avec paiement OM/Wave
- ✅ `ModalCarrouselProduit` (452L) — "Aucune photo disponible" traduit (commit `66c1bd7`)

### Lot 4 — Marketplace — 🟡 Partiel (composants partagés avec Lot 3 OK)
Traduits (commit `66c1bd7`) :
- ✅ `SortDropdown` — 4 options tri
- ✅ `BottomNavMarketplace` — 3 tabs
- ✅ `BoutiqueHeader` — back/contact/live/follow/stats labels
- ✅ `DesktopMiniCart` — panier desktop complet + pluriels
- ✅ `ToastPanier` — "Ajouté au panier !"
- ✅ `MarketplaceFAB` — aria scroll top

À traiter (session dédiée) :
- `CataloguesGlobalClient` (361L) — page /catalogues
- Composants marketplace spécifiques /catalogues : `MarketplaceHero`, `MarketplaceSearchBar` (188L), `StickySearchNav`, `MarketplaceNavbar`, `BoutiqueSearchFilter`, `CarteBoutique*`, `CarteStructure`, `TypeStructureChips`, `BoutiquesCarousel`, `Breadcrumb`, `SkeletonCards`

**Note** : Un bug critique `useTranslations` a été fixé (commit `74194cb`) — `t` n'était pas mémoïsé, causant boucles infinies dans `useEffect`/`useCallback` avec `t` en deps.

### Prochaine session Sprint 2
Lot 3 + Lot 4 à traiter ensemble (catalogue dépend de ~10 sous-composants marketplace). ~3000 lignes. Possible découpage en 2-3 sessions.

### Ancien périmètre Sprint 2 — pour référence

### Périmètre prévu
- `/facture` (facture publique avec lien partageable) + `FacturePubliqueClient`
- `/recu` (visualisation reçu paiement)
- `/catalogue` (catalogue d'une structure)
- `/catalogues` (liste des catalogues publics)
- `/marketplace` + sous-composants (`CarteBoutiqueVedette`, `BoutiqueHeader`, `MarketplaceNavbar`, `BottomNavMarketplace`, `StickySearchNav`)
- `/offline` (page hors-ligne PWA)
- `/privacy` (conditions générales)
- `/terms` (termes de service)

### Points d'attention identifiés par QA
- Utiliser `lib/format-locale.ts` pour dates/nombres sur factures/reçus
- Devise récupérée depuis `structure.devise` / `structure.code_devise` (pas hardcodé FCFA)
- Langue des reçus imprimés : langue active au moment de génération frontend
- Tester RTL-readiness si arabe envisagé

### Namespaces à créer
- `public-facture`
- `public-recu`
- `catalogue`
- `marketplace`
- `legal` (privacy + terms)
- `offline`

---

## Workflow validé

```
1. [Dev autonome] Implémentation sur branche gestion_multilangue_fr_et_en
   - Extraire strings → ajout fr.json + en.json
   - Remplacer par t(...)
   - npm run i18n:check (parité)
   - npx tsc --noEmit (TS OK)
   - Commit atomique par sous-livrable

2. [QA agent] qa-test-regression
   - 0 régression fonctionnelle
   - 0 string hardcodée (sauf noms propres)
   - Qualité EN (terminologie cohérente)
   - Accessibilité switcher

3. [Validation utilisateur] Review manuelle locale
   - Test visuel FR + EN sur pages du sprint
   - Test scénarios critiques (login, inscription, récup mot de passe)
   - GO ou corrections demandées

4. [Déploiement] rm -rf .next && npm run deploy:build
   - Uniquement APRÈS GO utilisateur explicite
   - Hard refresh Ctrl+Shift+R post-déploiement

5. [Sprint suivant]
```

**Règle** : merge sur `main` uniquement quand tous les sprints terminés ET validés.

---

## Commandes utiles

```bash
# Vérifier parité FR↔EN
npm run i18n:check

# TypeScript strict sur périmètre
npx tsc --noEmit 2>&1 | grep -v TS6053

# Log des commits Sprint i18n
git log --oneline gestion_multilangue_fr_et_en ^main

# Trouver strings FR hardcodées résiduelles (approximatif)
grep -rnE ">\s*[A-ZÀ-Ÿ][a-zà-ÿ].{3,}</|placeholder=\"[A-ZÀ-Ÿ][^\"]+\"" app components | grep -v "useTranslations\|t(\|FayClick\|IcelabSoft"

# Déploiement production
rm -rf .next && npm run deploy:build
```

---

## Sprint 3 — Dashboards & Navigation (partiel)

### Livré (commit `f232ccd`)
- ✅ `/dashboard/commerce` (mobile) — namespace `dashboardCommerce` (25 clés)

### Nettoyage dashboards (commit `1d627a8`)
Suppression de 3 segments désormais gérés par d'autres applications :
- 🔥 `app/dashboard/scolaire/` supprimé
- 🔥 `app/dashboard/immobilier/` supprimé
- 🔥 `app/dashboard/partenaire/` supprimé
- Nettoyage `USER_ROUTES` (types/auth.ts) — retrait SCOLAIRE, IMMOBILIER, FORMATION PRO, CLIENT, PARTENAIRE
- Nettoyage `displayConfig` (useStructure.ts) — 5 configs → 2 (COMMERCIALE + PRESTATAIRE DE SERVICES)
- L'app conserve uniquement : **Commerce**, **Services**, **Admin**

### À traiter Sprint 3 (sessions futures)
- Desktop `/dashboard/commerce` (CommerceDashboardDesktop + sous-composants ~1500L)
- `/dashboard/services` (562L + sous-composants services-factures)
- `/dashboard/admin` (page.tsx 900L + gestion structures/abonnements/partenaires)

---

## Sprint 4 — Modules Commerce (en cours)

### 4.1 Module Dépenses — ✅ Terminé (commit `4899ef6`)
Namespace `expenses` (85 clés). Page + 10 composants/modals :
- `DepensesHeader`, `DepensesStatCards`, `DepensesSearchBar`, `DepensesPagination`
- `DepenseCard`, `DepensesList`, `DepensesDesktopView`
- `AddEditDepenseModal`, `DeleteDepenseModal`, `GererTypesModal`
- Page `/dashboard/commerce/depenses`

### 4.2 Module Inventaire — ✅ Terminé (commit `49cc1b6`)
Namespace `inventory` (63 clés). Page + 6 composants :
- `InventaireHeader`, `TopArticlesCard`, `TopClientsCard`, `EvolutionChart`
- `ModalSelectionPeriode` (12 mois, semaines, jours avec pluriels)
- Page `/dashboard/commerce/inventaire`
- Remplace `inventaireService.getPeriodeLabel/getVariationContext()` par i18n direct

### 4.3 Module Clients — ✅ Terminé (commit `7fa8621`)
Namespace `clients` (149 clés). Page + 7 composants/modals :
- `ClientsDesktopView`, `FilterHeaderClientsGlass`
- `ModalClientMultiOnglets` (3 onglets + footer contextuel + pluriels)
- `OngletInfosGenerales`, `OngletFactures`, `OngletHistoriqueProduits`
- Export CSV + HTML d'impression entièrement traduits (langue dynamique `lang="fr"/"en"`)
- Page `/dashboard/commerce/clients`

**Note** : `clientsService.formatMontant/formatDate` restent en fr-FR (refactor plus large hors scope). Montants/dates s'affichent au format FR même en mode EN.

### 4.4 Module Factures — ✅ Terminé (commits `865cc15` + `7cb7cbd`)

**Page + composants principaux** (`865cc15`, namespace `invoices` — 98 clés) :
- Page `/dashboard/commerce/factures` (loading overlay, toast, confirmations)
- `FacturesOnglets`, `FacturesList`, `FactureCard`
- `StatsCardsFacturesGlass` (4 KPIs + pluralisation)
- `FilterHeaderGlass`, `ListePaiements` (avec date-fns locale FR/EN)
- `FacturesDesktopView`

**Modals factures** (`7cb7cbd`, namespace `invoicesModals` — 121 clés) :
- `ModalPartage` (422L) — QR code, WhatsApp, lien, copie
- `ModalPaiement` (1002L) — ajout acompte, raccourcis %, boutons dynamiques
- `ModalPaiementQRCode` (515L) — génération QR, timer, états success/failed/timeout, 2 boutons OM (app + MaxIt)
- `ModalChoixPaiement`, `ModalConfirmationPaiement`, `PaymentMethodSelector`
- Messages WhatsApp interpolés, logique méthodes paiement i18n

### 4.5 À traiter (prochaine session)
- **Venteflash** (1260L + composants VenteFlashHeader, Panier, etc.)
- **Produits** (2354L + ModalAjoutProduitNew, ModalSelectionProduit, barcode scanning modals)

---

## Prochaines étapes immédiates

1. **Nouvelle session** : Sprint 4.5 — VenteFlash (1260L, flow encaissement CASH + création facture)
2. Puis Sprint 4.6 — Produits (2354L, le plus gros module commerce)
3. Sprint 3 (fin) — `/dashboard/services` et `/dashboard/admin`
4. Validation utilisateur Sprint 1-4 + déploiement prod

## État parité i18n

```
npm run i18n:check
📊 Stats i18n
   FR : 965 clés
   EN : 965 clés
✅ Parité parfaite entre FR et EN.
```
