# Progression Internationalisation FayClick V2 (FR/EN)

**Dernière mise à jour** : 2026-04-15
**Branche Git** : `gestion_multilangue_fr_et_en`
**PRD** : [docs/prd-i18n-complete-2026-04-14.md](./prd-i18n-complete-2026-04-14.md)
**Guide dev** : [docs/i18n-guide.md](./i18n-guide.md)

---

## Vue d'ensemble

| Sprint | Statut | QA | Déploiement |
|--------|--------|----|-------------|
| EPIC-001 — Infrastructure | ✅ Terminé | ✅ GO | ⏳ En attente validation utilisateur |
| Sprint 1 — Auth & Landing | ✅ Terminé | ✅ GO (92/100) | ⏳ En attente validation utilisateur |
| Sprint 2 — Pages publiques | 🟡 En cours (2/4 lots) | — | — |
| Sprint 3 — Dashboards & Navigation | ⏸️ À démarrer | — | — |
| Sprint 4 — Modules Commerce | ⏸️ À démarrer | — | — |
| Sprint 5 — Modals & Impression | ⏸️ À démarrer | — | — |
| Sprint 6 — Services, Validations, Exports | ⏸️ À démarrer | — | — |
| Sprint 7 — Paramètres, Structure, KALPE | ⏸️ À démarrer | — | — |

**Couverture actuelle** : 387 clés FR = 387 clés EN (parité parfaite)
**Commits totaux** : 14 commits atomiques

---

## Stack technique

Solution **custom** (pas `next-intl` ni `react-i18next`) :

- `contexts/LanguageContext.tsx` — locale + persistance localStorage (`fayclick-locale`)
- `hooks/useTranslations.ts` — hook `t(key, params?)` avec fallback FR + warnings console
- `messages/fr.json` + `messages/en.json` — structure par namespaces
- `components/ui/LanguageSwitcher.tsx` — dropdown FR/EN (variants light/dark/glass, compact)
- `lib/format-locale.ts` — helpers formatDate/Number/Currency
- `scripts/check-i18n-keys.mjs` — lint parité (`npm run i18n:check`)

### Namespaces actuels
- `common` — boutons/labels partagés (18 clés)
- `auth` — login, PIN, modals récup mot de passe/PIN (80+ clés)
- `register` — inscription 3 steps + célébration (50+ clés)
- `landing` — landing page mobile/desktop + marketplace CTA (40+ clés)
- `offline` — page /offline (10 clés)
- `publicFacture` — facture publique partageable (35 clés)
- `publicRecu` — reçu public partageable (28 clés)

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

## Prochaines étapes immédiates

1. ⏳ **Test local** par l'utilisateur du Sprint 1 (FR↔EN sur login, register, modaux, landing)
2. ⏳ **Validation explicite** avant déploiement
3. ⏳ **Déploiement Sprint 1** en production
4. ⏳ **Démarrage Sprint 2** — pages publiques
