# PRD + Plan d'implémentation — Phase 2 Frontend : Persistance de la remise par ligne

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date** : 24/07/2026
**Statut** : À VALIDER PAR LE PO avant implémentation
**Références** : `docs/database/MEMO_CHANTIER_PERSISTANCE_REMISE_LIGNE.md` · `docs/database/INVENTAIRE_FRONTEND_REMISE_LIGNE.md` · `docs/database/RAPPORT_PHASE1_REMISE_LIGNE.md`

---

# PARTIE A — PRD (Product Requirements Document)

## A1. Contexte

**Phase 1 (BD) est en production depuis le 24/07/2026** (dba_master, 21/21 vérifications PASS) :
- Colonnes `remise_pct NUMERIC(5,2)` et `prix_origine NUMERIC(10,2)` (NULL par défaut) sur `detail_facture_com`, `proforma_details`, `bon_commande_details`, `detail_devis`.
- 14 surcharges de fonctions PG acceptent le format `articles_string` étendu : `id-qty-prix[-remise_pct[-prix_origine]]#` (3, 4 ou 5 champs, rétro-compatible).
- `convert_proforma_to_facture` **propage** les 2 colonnes ; `get_proforma_details`, `get_my_factures1`, `rechercher_multifacturecom` et la vue `list_detailventes` les **exposent**.
- Le prix transporté reste le prix **NET** : aucun impact sur montants, stock, paiements.

**Mais le frontend émet toujours l'ancien format 3 champs** : toutes les nouvelles lignes ont `remise_pct = NULL`, et les affichages continuent de **reconstituer** la remise par lookup du prix catalogue courant. Problèmes résiduels (constatés par le PO le 24/07) :
1. **Perte du % saisi** : 12% sur un article à 32 F → prix net 28 F → taux effectif 12,5% affiché (au mieux) au lieu du 12 saisi. Irrécupérable sans persistance.
2. **Fragilité au changement de prix catalogue** : si le commerçant change le prix d'un produit, les réimpressions de documents anciens affichent des remises fausses, fantômes ou disparues.

## A2. Objectif

> **Le % de remise saisi par le caissier est persisté en base et réaffiché tel quel, partout, pour toujours — indépendamment des évolutions du catalogue.**

Scénario de référence (critère n°1) : saisir **12%** sur Casa 79 (32 F) → BD `prix=28, remise_pct=12.00, prix_origine=32.00` → panier, impression proforma, détails, modal Modifier, conversion en facture, impression facture affichent tous « **12%** ».

## A3. Périmètre (in scope)

| Lot | Contenu |
|---|---|
| **Lot 1 — Émission** | `facture.service.ts` (createFacture inline + `buildArticlesString` + regex garde-fou) et `proforma.service.ts` (`absorberRemisesArticles` + create + edit) émettent le format 5 champs quand une remise ligne existe. `ModalCreerProforma.handleSubmit` transmet le % saisi explicitement. |
| **Lot 2 — Consommation** | `ModalImpressionProforma`, `ModalImpressionDocuments` (branche facture), `ModalCreerProforma.loadEditData` lisent `d.remise_pct`/`d.prix_origine` quand présents, **fallback reconstitution lookup** sinon (lignes historiques). |
| **Lot 3 — Bons de commande** | `bon-commande.service.ts` émet le format 5 champs ; `ModalCreerBonCommande.hydrateEditData` consomme avec fallback. |
| **Types** | Extension `remise_pct?`/`prix_origine?` sur les types détails + `ArticlePanier`. |

## A4. Hors périmètre (non-objectifs — explicites)

- **`lib/edition-vente-helpers.ts`** (modification vente payée du jour, Factures + VenteFlash) : continue de forcer `remise_article: 0` avec `prix_applique = prix net BD`. Ce flux est sensible (ventes payées) et fonctionne correctement au niveau montants ; l'affichage du % en édition de vente sera un lot ultérieur.
- **`prestation.service.ts`** (devis prestataires, `createFactureFromDevis`, `add_new_devis_complet`), **`online-seller.service.ts`**, **`vente-representant.service.ts`** : ces flux n'ont pas de saisie de remise par article dans l'UI aujourd'hui → ils continuent d'émettre 3 champs (format toujours valide). Aucun changement.
- **Backfill des lignes historiques** : jamais (décision mémo). `remise_pct IS NULL` = fallback reconstitution.
- **`ModalFactureSuccess`** : ses totaux sont déjà cohérents (PR #16) ; l'ajout d'une colonne remise par ligne sur ce document est cosmétique et hors scope.
- **Mode `'F'` (remise en FCFA)** : le montant F est converti en % équivalent (2 décimales) comme aujourd'hui — c'est ce % équivalent qui est persisté (le montant F saisi n'est pas une donnée pérenne : il dépend de la quantité).

## A5. Exigences fonctionnelles

- **RF1** — À la création/édition d'une proforma ou d'une facture avec remise(s) par article, chaque ligne remisée est émise en **5 champs** : `id-qty-prixNet-remisePct-prixOrigine#`. Les lignes **sans** remise restent en **3 champs** (`id-qty-prixNet#`).
- **RF2** — `remisePct` émis = **valeur saisie** en mode `%` (ex. `12`, `12.5`) ; en mode `F` = % équivalent arrondi à 2 décimales. Toujours avec un **point** décimal (jamais de virgule), dans [0;100].
- **RF3** — `prixOrigine` émis = prix unitaire **avant** absorption (`prix_applique ?? prix_vente`, donc le prix gros si actif).
- **RF4** — Tout affichage de remise par ligne utilise `d.remise_pct` et `d.prix_origine` **quand présents (non NULL)** ; sinon fallback = reconstitution lookup actuelle, inchangée (lignes historiques).
- **RF5** — Rétro-compatibilité totale : un document sans aucune remise par article produit un `articles_string` **strictement identique** à aujourd'hui, et les documents historiques s'affichent **strictement comme** aujourd'hui.
- **RF6** — La conversion proforma → facture réaffiche le même % (propagation faite côté PG, le front n'a rien à faire d'autre que consommer).

## A6. Exigences techniques

- **RT1** — Aucun montant ne change : le prix transporté reste le NET absorbé (`Math.round(prixOrigine × (1 − pct/100))`), identique à l'existant au franc près.
- **RT2** — La regex garde-fou de `modifierFacture` (`facture.service.ts:571`) accepte 3/4/5 champs.
- **RT3** — Les valeurs `remise_pct`/`prix_origine` revenant de PG peuvent être `number`, `string` (« 12.50 ») ou `null` selon la couche API → coercition défensive `Number(...)` systématique côté consommation.
- **RT4** — La duplication volontaire `createFacture` inline vs `buildArticlesString` est **conservée** (commentaire l.469 : chemin de vente critique) — les deux évoluent en parallèle avec un code identique.
- **RT5** — `ModalCreerProforma` conserve sa pré-absorption (sémantique % locale, indépendante de `vf_remise_mode`) mais transmet désormais le % saisi via des champs explicites `remise_pct`/`prix_origine` sur `ArticlePanier`, que les services émettent en priorité.

## A7. Critères d'acceptation (recette PO)

1. Proforma side-panel, Casa 79 (32 F) × 3, remise **12%** → BD : `prix_unitaire=28, remise_pct=12.00, prix_origine=32.00` ; impression immédiate, réimpression, détails, **Modifier** affichent « 12% » (plus jamais 12,5 ni 13).
2. Même scénario en mode **F** (remise 12 F sur ligne de 96) → `remise_pct=12.50` persisté, affiché 12,5% partout, stable.
3. Convertir la proforma → la facture affiche « 12% » sur la ligne (bouton Imprimer, colonne Remise).
4. **Changer le prix catalogue** de Casa 79 (32 → 40 F) → réimpression du document : toujours P.U. 32 et 12% (plus aucune dépendance au catalogue).
5. Document **historique** (créé avant Phase 2) → affichage strictement identique à aujourd'hui (fallback lookup).
6. Vente/proforma **sans remise** → `articles_string` 3 champs identique, rendu identique, `remise_pct` NULL en BD.
7. `npm run build` OK, `npm run i18n:check` OK (aucune clé ajoutée), aucune nouvelle erreur TS sur les fichiers modifiés.

## A8. Risques et mitigations

| Risque | Mitigation |
|---|---|
| Virgule décimale dans le token (locale FR) → erreur parsing PG | Ne jamais utiliser `toLocaleString` dans les tokens ; `String(Number(x))` produit toujours un point. Vérifié par scénario 12,5. |
| `remise_pct` string depuis l'API → `NaN` ou comparaison foireuse | Helper de coercition unique `numOrNull()` utilisé partout (Tâche 1). |
| Régression sur le chemin de vente critique (`createFacture`) | Modification minimale, code identique dans les 2 chemins, scénario sans remise = string inchangée (comparaison avant/après en console). |
| Conflits git avec les PRs #16→#22 non mergés | **Prérequis bloquant** : merger #16→#22 dans `main` AVANT de brancher la Phase 2 (mêmes fichiers touchés : `proforma.service.ts`, `ModalCreerProforma.tsx`, `ModalImpressionDocuments.tsx`). |
| Anciens fronts déployés (prod) émettent 3 champs pendant la transition | Sans impact : format 3 champs accepté à vie par les fonctions PG. |

## A9. Déploiement

1. Prérequis : PRs #16→#22 validés PO et mergés dans `main` (sinon conflits + la Phase 2 présuppose l'absorption PR #17).
2. Branche unique : `feat/remise-ligne-persistance-front`, 1 PR, pas de merge sans validation PO.
3. Recette PO sur localhost (critères A7) puis `rm -rf .next && npm run deploy:build` + bump `CACHE_NAME` Service Worker (changement de comportement des ventes).
4. Rollback front trivial : redéployer le build précédent (la BD accepte les deux formats indéfiniment).

---

# PARTIE B — Plan d'implémentation

**Goal:** Émettre le format `articles_string` 5 champs (% saisi + prix d'origine) depuis les services facture/proforma/BC et consommer `remise_pct`/`prix_origine` persistés à l'affichage, avec fallback lookup pour l'historique.

**Architecture:** BD déjà prête (Phase 1). On étend les types, on ajoute un formateur de token unique par service (sans factoriser le chemin critique), puis on remplace la reconstitution par la lecture BD dans les 3 composants d'affichage. Aucun changement de montants.

**Tech Stack:** Next.js 14 / TypeScript strict / services singletons existants. Pas de framework de test dans le repo → chaque tâche se vérifie par `npx tsc --noEmit` ciblé + un scénario navigateur précis sur localhost:3000 (serveur dev, structure test 183 ou 218).

## Global Constraints

- Base de travail : `main` APRÈS merge des PRs #16→#22 (prérequis bloquant).
- Format token : `id-qty-prixNet` ou `id-qty-prixNet-remisePct-prixOrigine` (on n'émet **jamais** le format 4 champs ; il reste accepté en lecture PG).
- `remisePct` ∈ [0;100], max 2 décimales, séparateur point. `prixOrigine` = nombre, séparateur point.
- Ne PAS factoriser `createFacture` inline sur `buildArticlesString` (commentaire `facture.service.ts:469`).
- Aucun montant modifié : `prixNet` calculé exactement comme aujourd'hui.
- Vérification par tâche : `npx tsc --noEmit 2>&1 | Select-String "<fichier>"` → vide, + scénario navigateur indiqué.
- Commits fréquents, format emoji du repo.

---

### Task 1: Types + helper de coercition numérique

**Files:**
- Create: `lib/numeric-utils.ts`
- Modify: `types/produit.ts` (interface `ArticlePanier`), `types/proforma.ts` (`ProformaDetail`), `types/facture.ts` (`DetailFacture`), `types/facture-publique.ts` (`DetailFacturePublique`), `types/facture-privee.ts` (`DetailFacture`), `types/bon-commande.ts` (`BonCommandeDetail`), `services/facture.service.ts` (interface locale `DetailFacture` l.36-40)

**Interfaces:**
- Produces: `numOrNull(v: unknown): number | null` (coercition PG string/number/null) ; champs optionnels `remise_pct?: number | null` et `prix_origine?: number | null` sur tous les types détails ; champs optionnels `remise_pct?: number` et `prix_origine?: number` sur `ArticlePanier` (canal explicite d'émission, prioritaire sur `remise_article`).

- [ ] **Step 1: Créer le helper**

```typescript
// lib/numeric-utils.ts
/**
 * Coercition défensive des numériques PostgreSQL : selon la couche API,
 * un NUMERIC peut arriver en number, en string ("12.50") ou en null.
 */
export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
```

- [ ] **Step 2: Étendre les types détails** — ajouter sur chacun des 6 types listés (+ l'interface locale de `facture.service.ts`) :

```typescript
  /** % de remise par ligne persisté (Phase 1 BD) — null/absent sur lignes historiques */
  remise_pct?: number | null;
  /** Prix unitaire avant remise, figé à la vente — null/absent sur lignes historiques */
  prix_origine?: number | null;
```

- [ ] **Step 3: Étendre `ArticlePanier`** (`types/produit.ts`) :

```typescript
  /** % saisi à transmettre tel quel en BD (prioritaire sur remise_article à l'émission) */
  remise_pct?: number;
  /** Prix d'origine à transmettre tel quel en BD */
  prix_origine?: number;
```

- [ ] **Step 4: Vérifier** — `npx tsc --noEmit 2>&1 | Select-String "numeric-utils|produit.ts|proforma.ts|facture"` → aucune NOUVELLE erreur (comparer à `main` : erreurs préexistantes connues sur `admin/page.tsx`, `produits/page.tsx`, `PanierSidePanel.tsx:1289+`).

- [ ] **Step 5: Commit** — `✨ feat(remise-ligne): types remise_pct/prix_origine + helper numOrNull`

---

### Task 2: Émission 5 champs — `facture.service.ts`

**Files:**
- Modify: `services/facture.service.ts` — bloc absorption `createFacture` (l.93-114), construction string inline (l.148-150), `buildArticlesString` (l.471-493), regex garde-fou (l.571)

**Interfaces:**
- Consumes: `ArticlePanier.remise_article` / `.remise_pct` / `.prix_origine` (Task 1), `vf_remise_mode`.
- Produces: tokens `id-qty-prixNet` ou `id-qty-prixNet-pct-prixOrigine`. Fonction PG appelée inchangée (`create_facture_complete1`, `modifier_facturecom`).

- [ ] **Step 1: Enrichir l'absorption inline de `createFacture`** — remplacer le map l.94-109 pour conserver le % émis et le prix d'origine sur chaque article :

```typescript
      const remiseMode = (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
      const articlesAvecPrixNet = articles.map(art => {
        const prixOrigine = art.prix_applique ?? art.prix_vente;
        const remiseArt = art.remise_article || 0;
        // Canal explicite (ModalCreerProforma & co) : % saisi déjà fourni, prix déjà net
        if (art.remise_pct !== undefined && remiseArt === 0) {
          return { ...art, prix_applique: prixOrigine, _pctEmis: art.remise_pct, _prixOrigineEmis: art.prix_origine ?? prixOrigine };
        }
        if (remiseArt === 0) return { ...art, prix_applique: prixOrigine, _pctEmis: undefined as number | undefined, _prixOrigineEmis: undefined as number | undefined };
        let pctEquivalent = 0;
        if (remiseMode === '%') {
          pctEquivalent = Math.max(0, Math.min(100, remiseArt));
        } else {
          // Mode F : remiseArt est un montant total (prix × qty × pct/100 pré-calculé)
          const lineBrut = prixOrigine * art.quantity;
          pctEquivalent = lineBrut > 0 ? Math.min(100, (remiseArt / lineBrut) * 100) : 0;
        }
        const prixNet = Math.round(prixOrigine * (1 - pctEquivalent / 100));
        // % émis = valeur saisie en mode %, sinon % équivalent arrondi 2 déc (séparateur point garanti par String(Number))
        const pctEmis = Math.round(pctEquivalent * 100) / 100;
        return { ...art, prix_applique: prixNet, _pctEmis: pctEmis, _prixOrigineEmis: prixOrigine };
      });
```

- [ ] **Step 2: Étendre la construction de string inline** (l.148-150) :

```typescript
      const articlesString = articlesAvecPrixNet
        .map(article => {
          const base = `${article.id_produit}-${article.quantity}-${article.prix_applique ?? article.prix_vente}`;
          return article._pctEmis !== undefined && article._pctEmis > 0
            ? `${base}-${article._pctEmis}-${article._prixOrigineEmis}`
            : base;
        })
        .join('#') + '#';
```

- [ ] **Step 3: Appliquer le MÊME changement à `buildArticlesString`** (l.471-493) — code identique aux Steps 1-2 (duplication volontaire conservée, copier le map + le join à l'intérieur du helper).

- [ ] **Step 4: Assouplir la regex garde-fou** (l.571) :

```typescript
    // Format: id-qty-prix[-remise_pct[-prix_origine]]# — 3 à 5 champs par token (Phase 2 remise ligne)
    const formatOk = /^(\d+-\d+(\.\d+)?-\d+(\.\d+)?(-\d+(\.\d+)?(-\d+(\.\d+)?)?)?#)+$/.test(articlesString);
```

- [ ] **Step 5: Vérifier tsc** — `npx tsc --noEmit 2>&1 | Select-String "facture.service"` → vide.

- [ ] **Step 6: Vérifier navigateur (non-régression + émission)** — localhost:3000, structure 218 :
  1. Vente panier **sans** remise → console réseau : `articles_string` strictement au format 3 champs (identique à avant).
  2. Vente avec remise article 10% sur un article à 200 F → token `id-qty-180-10-200`, facture créée, montants inchangés (net ligne 180×qty).
  3. Vérifier en BD (onglet détails ou via dba) : `remise_pct=10.00`, `prix_origine=200.00`.

- [ ] **Step 7: Commit** — `✨ feat(remise-ligne): emission format 5 champs createFacture + buildArticlesString + regex`

---

### Task 3: Émission 5 champs — `proforma.service.ts` + % saisi depuis `ModalCreerProforma`

**Files:**
- Modify: `services/proforma.service.ts` — `absorberRemisesArticles` (l.54-71 ; renvoie désormais aussi `_pctEmis`/`_prixOrigineEmis`), construction string `createProforma` (l.108-110) et `editProforma` (l.260-264)
- Modify: `components/proformas/ModalCreerProforma.tsx` — `handleSubmit` (l.248-258)

**Interfaces:**
- Consumes: `ArticlePanier.remise_article` / `.remise_pct` / `.prix_origine`.
- Produces: tokens 3 ou 5 champs vers `create_proforma` / `edit_proforma`. Annotations internes `_pctEmis?: number` / `_prixOrigineEmis?: number` sur les articles absorbés (portée service uniquement).

- [ ] **Step 1: Étendre `absorberRemisesArticles`** — même logique que Task 2 Step 1 (canal explicite prioritaire, sinon absorption + `_pctEmis` = % saisi en mode `%` / % équivalent 2 déc en mode `F`, `_prixOrigineEmis` = prix avant absorption). Conserver `remise_article: 0` en sortie.

- [ ] **Step 2: Étendre les 2 constructions de string** (`createProforma` et `editProforma`) — même join conditionnel 3/5 champs que Task 2 Step 2.

- [ ] **Step 3: `ModalCreerProforma.handleSubmit`** — transmettre le % saisi via le canal explicite (sa sémantique est toujours `%`, indépendante de `vf_remise_mode`) :

```typescript
      const articlesAEnvoyer = articles.map(art => {
        const prixOrigine = art.prix_applique ?? art.prix_vente;
        const remisePct = art.remise_article || 0;
        const prixNet = Math.round(prixOrigine * (1 - remisePct / 100));
        return {
          ...art,
          prix_applique: prixNet,
          remise_article: 0,
          // Canal explicite Phase 2 : le service émet ce % tel quel (5 champs)
          remise_pct: remisePct > 0 ? Math.round(remisePct * 100) / 100 : undefined,
          prix_origine: remisePct > 0 ? prixOrigine : undefined,
        };
      });
```

- [ ] **Step 4: Vérifier tsc** — `npx tsc --noEmit 2>&1 | Select-String "proforma.service|ModalCreerProforma"` → vide.

- [ ] **Step 5: Vérifier navigateur** — structure 183, scénario PO : Casa 79 (32 F) × 3, remise 12% via **side-panel** → BD `prix_unitaire=28, remise_pct=12.00, prix_origine=32.00` ; même chose via **ModalCreerProforma** ; proforma sans remise → 3 champs.

- [ ] **Step 6: Commit** — `✨ feat(remise-ligne): emission 5 champs proforma (service + ModalCreerProforma % saisi)`

---

### Task 4: Consommation — `ModalCreerProforma.loadEditData` (le « 13% » du PO)

**Files:**
- Modify: `components/proformas/ModalCreerProforma.tsx` — `loadEditData` (l.114-141)

**Interfaces:**
- Consumes: `ProformaDetail.remise_pct` / `.prix_origine` (Task 1), `numOrNull` (Task 1).

- [ ] **Step 1: Prioriser la valeur persistée, fallback reconstitution** :

```typescript
    import { numOrNull } from '@/lib/numeric-utils'; // en tête de fichier

    const arts = proformaDetails.map(d => {
      const pctBD = numOrNull(d.remise_pct);
      const origineBD = numOrNull(d.prix_origine);
      const prod = allProduits.find(p => p.id_produit === d.id_produit);
      // Persisté (Phase 2) : % saisi exact + prix d'origine figé à la vente.
      // Fallback (lignes historiques) : reconstitution lookup catalogue, 2 décimales.
      const prixOrigine = origineBD ?? (prod?.prix_vente ?? d.prix_unitaire);
      const remisePct = pctBD ?? (prixOrigine > d.prix_unitaire
        ? Math.round(((prixOrigine - d.prix_unitaire) / prixOrigine) * 10000) / 100
        : 0);
      return {
        id_produit: d.id_produit,
        nom_produit: d.nom_produit,
        prix_vente: prixOrigine,
        prix_applique: prixOrigine,
        quantity: d.quantite,
        remise_article: remisePct,
        cout_revient: 0,
        id_structure: 0,
        niveau_stock: 9999,
        code_barre: '',
      } as unknown as ArticlePanier;
    });
```

- [ ] **Step 2: Vérifier tsc** puis **navigateur** : rouvrir « Modifier » sur la proforma de la Task 3 → champ remise = **12** (plus 12,5 ni 13) ; re-enregistrer sans toucher → BD inchangée (`prix=28, remise_pct=12`) ; ouvrir une proforma **historique** → comportement identique à avant (fallback).

- [ ] **Step 3: Commit** — `🐛 fix(remise-ligne): Modifier proforma affiche le % saisi persisté (fallback lookup historique)`

---

### Task 5: Consommation — impressions (`ModalImpressionProforma` + `ModalImpressionDocuments`)

**Files:**
- Modify: `components/proformas/ModalImpressionProforma.tsx` (l.116-141)
- Modify: `components/impression/ModalImpressionDocuments.tsx` (l.158-179, branche `isFacture`)

**Interfaces:**
- Consumes: `d.remise_pct` / `d.prix_origine` + `numOrNull`.

- [ ] **Step 1: `ModalImpressionProforma`** — dans le map des lignes (l.119+), remplacer le calcul par :

```typescript
      const pctBD = numOrNull(d.remise_pct);
      const origineBD = numOrNull(d.prix_origine);
      const prod = produitsForLookup.find(p => p.id_produit === d.id_produit);
      // Persisté (Phase 2) prioritaire ; fallback lookup catalogue pour l'historique
      const prixOrigine = origineBD ?? (prod?.prix_vente && prod.prix_vente > d.prix_unitaire ? prod.prix_vente : d.prix_unitaire);
      const totalLigne = d.prix_unitaire * d.quantite;
      const remiseArtPct = pctBD ?? (prixOrigine > 0 ? ((prixOrigine - d.prix_unitaire) / prixOrigine) * 100 : 0);
```
(le bloc `remiseDisplay` existant reste inchangé — il affichera « 12% » car 12 est entier)

- [ ] **Step 2: `ModalImpressionDocuments`** branche `isFacture` (l.161-166) — même substitution avec `d.prix` :

```typescript
        const pctBD = numOrNull(d.remise_pct);
        const origineBD = numOrNull(d.prix_origine);
        const prixOrigine = origineBD ?? (prod?.prix_vente && prod.prix_vente > d.prix ? prod.prix_vente : d.prix);
        const remiseArtPct = pctBD ?? (prixOrigine > 0 ? ((prixOrigine - d.prix) / prixOrigine) * 100 : 0);
```

- [ ] **Step 3: Vérifier navigateur** : impression proforma (12% affiché, P.U. 32) ; **convertir** la proforma → bouton Imprimer facture → colonne Remise « 12% » ; **changer le prix catalogue** de Casa 79 (32→40) → réimprimer les 2 documents → toujours P.U. 32 / 12% (critère A7.4) ; remettre le prix à 32 ; imprimer une facture **historique** remisée → identique à avant.

- [ ] **Step 4: Commit** — `✨ feat(remise-ligne): impressions proforma+facture lisent remise_pct/prix_origine persistés`

---

### Task 6: Bons de commande — émission + hydratation

**Files:**
- Modify: `services/bon-commande.service.ts` — `articleToString`/`buildArticlesString` (l.84-96)
- Modify: `components/boncommandes/ModalCreerBonCommande.tsx` — `hydrateEditData` (l.123-167)

**Interfaces:**
- Consumes/Produces: mêmes conventions que Tasks 2-4, prix de base = `cout_revient` (pas `prix_vente`).

- [ ] **Step 1: Émission** — même join conditionnel 3/5 champs (absorption existante conservée, `_pctEmis` = % saisi mode `%` / équivalent 2 déc mode `F`, `_prixOrigineEmis` = coût avant remise).
- [ ] **Step 2: Hydratation** — `remise_article = numOrNull(d.remise_pct) ?? reconstitution actuelle` ; `prixOrigine = numOrNull(d.prix_origine) ?? fallback actuel`.
- [ ] **Step 3: Vérifier navigateur** : BC avec remise ligne → BD `remise_pct` rempli, réédition affiche le % saisi ; BC sans remise → identique à avant.
- [ ] **Step 4: Commit** — `✨ feat(remise-ligne): bons de commande emission + hydratation remise_pct`

---

### Task 7: Recette finale, build et PR

- [ ] **Step 1: Dérouler les 7 critères d'acceptation A7** sur localhost (structure 183 + une facture historique 218). Consigner OK/KO.
- [ ] **Step 2: Nettoyage** — supprimer les documents de test créés (la suppression de facture restaure le stock).
- [ ] **Step 3: Build** — `npm run build` → succès ; `npm run i18n:check` → parité inchangée.
- [ ] **Step 4: Bump `CACHE_NAME`** dans `public/service-worker.js` (changement de comportement ventes).
- [ ] **Step 5: PR** — branche `feat/remise-ligne-persistance-front` → `main`, corps reprenant A7 comme checklist de recette PO, **sans merge**.

---

## Self-review (fait le 24/07/2026)

- **Couverture** : RF1-RF3 → Tasks 2-3 (+6 BC) ; RF4 → Tasks 4-5 (+6) ; RF5 → steps de non-régression des Tasks 2/4/5 + A7.5-6 ; RF6 → Task 5 Step 3 (conversion). RT1-RT5 portées par les Global Constraints et les steps correspondants.
- **Cohérence types** : `_pctEmis`/`_prixOrigineEmis` = annotations internes aux services (spread d'objets, pas dans les types publics) ; le canal public est `ArticlePanier.remise_pct`/`prix_origine` (Task 1) consommé par Tasks 2-3.
- **Placeholder scan** : chaque step de code contient le code ; les steps « même logique que Task 2 » (Task 3 Step 1, Task 6) réfèrent un bloc complet reproduit en Task 2 — acceptable car le fichier cible et les deltas (prix de base BC) sont précisés.
