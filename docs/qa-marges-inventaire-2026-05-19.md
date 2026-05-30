# RAPPORT QA — Suivi des Marges sur Inventaire Commerce

**Projet** : FayClick V2
**Module testé** : `/dashboard/commerce/inventaire` — bloc Suivi des Marges (v2 `get_inventaire_periodique`)
**Auditeur QA** : Mansour Thiam — Ingénieur QA Senior, audit technique indépendant
**Date** : 2026-05-19
**Environnement** : Local `http://localhost:3000` (`npm run dev` déjà actif, PID 34664) — API DEV pointée sur PostgreSQL prod
**Compte de test** : `admin@chezkelefant.fay` — structure 1675 (CHEZ KELEFA NIARRY TALLY) — profil ADMIN
**Branche** : `feature/perf-factures`
**Référence spec** : `docs/spec-marges-inventaire-2026-05-19.md` (v1.0)
**Référence DBA** : `docs/dba-doc-get_inventaire_periodique-v2-2026-05-19.md` (v2.1)

---

## 1. RÉSUMÉ EXÉCUTIF

| Indicateur | Valeur |
|---|---|
| **Score global** | **96 / 100** 🟢 |
| Tests exécutés | 11 (TC-01 → TC-11) |
| ✅ PASS | 9 |
| ⚪ SKIP / Non testable | 2 (TC-07, TC-10) |
| ❌ FAIL | 0 |
| Issues critiques (P0) | 0 |
| Issues majeures (P1) | 0 |
| Issues mineures (P2) | 1 (MIN-001 — héritée, hors périmètre Marges) |
| Suggestions | 1 (SUG-001) |

**Verdict** : aucun défaut bloquant ni majeur détecté sur la fonctionnalité Marges. Tous les critères d'acceptation testables avec les données réelles disponibles sont satisfaits. Les 2 tests non exécutés (TC-07, TC-10) le sont par limitation du jeu de données / de comptes, pas par défaut applicatif — le comportement attendu a été vérifié par inspection du code source.

---

## 2. TABLEAU DE SYNTHÈSE DES TESTS

| # | Critère | Résultat | Preuve |
|---|---|---|---|
| TC-01 | Page se charge sans erreur console | ✅ PASS | `TC-01-inventaire-loaded.png` — 0 erreur console après login propre |
| TC-02 | Affichage du bloc Marges (card violette + chart violet) | ✅ PASS | `TC-02-bloc-marges-semaine.png` — bordure `4px rgb(139,92,246)`, grille `grid-cols-2` |
| TC-03 | Bascule onglets Semaine / Mois / Année | ✅ PASS | `TC-03-onglet-mois.png`, `TC-03-onglet-annee-TC-08-variation-null.png` |
| TC-04 | Cohérence axe temporel (CA-02) Ventes vs Marges | ✅ PASS | Axes X identiques sur les 3 onglets (extraction `evaluate_script`) |
| TC-05 | Tooltip hover chart Marges | ✅ PASS | `TC-05-tooltip-hover.png` — bordure violette, montant `text-violet-600`, "32 ventes" |
| TC-06 | i18n FR / EN / WO | ✅ PASS | `TC-06-i18n-fr.png`, `TC-06-i18n-en.png`, `TC-06-i18n-wo.png` |
| TC-07 | Cas marge négative | ⚪ NON TESTABLE | Données réelles structure 1675 : aucune marge < 0 (toutes ≥ 0) |
| TC-08 | Cas variation null (année 2026) | ✅ PASS | `TC-03-onglet-annee-TC-08-variation-null.png` — variation affichée `—` |
| TC-09 | Network — pas de double appel | ✅ PASS | 1 appel `/api/sql` par changement d'onglet, payload contient `resume_marges` + `evolution_marges` |
| TC-10 | Masquage CAISSIER | ⚪ SKIP | Aucun compte CAISSIER dans le jeu de test ; masquage validé par inspection code |
| TC-11 | Pas de régression Ventes | ✅ PASS | `TC-11-regression-ventes.png` — Résumé Ventes + EvolutionChart vert + Top Articles + Top Clients OK |

---

## 3. DÉTAIL DES TESTS

### TC-01 — Chargement sans erreur console ✅ PASS

**Procédure** : navigation `/login` → saisie `admin@chezkelefant.fay` / `777301221@` → redirection `/dashboard/commerce` → navigation `/dashboard/commerce/inventaire`.

**Résultat** :
- Page chargée intégralement (en-tête, onglets, Résumé Ventes, Top Articles/Clients, chart Ventes, bloc Marges, chart Marges, footer).
- `list_console_messages` filtré sur `error` : **aucune erreur** après login propre.
- 1 seul `404` observé : `GET /pattern.svg` — asset cosmétique préexistant, hors périmètre Marges (voir MIN-001).

**Observation d'audit (non bloquante)** : lors d'une première tentative sur une session navigateur héritée d'un run antérieur, la page restait bloquée sur « Chargement des statistiques… » avec une `SyntaxError: Invalid or unexpected token` en console et aucun appel `/api/sql` émis. Cause identifiée : état `localStorage` incohérent (`fayclick_user` partiellement hydraté). Le problème **disparaît totalement après un login propre depuis `/login`**. Ce n'est pas un défaut de la fonctionnalité Marges mais un point de robustesse de l'hydratation `AuthContext` (voir SUG-001).

Screenshot : `qa-screenshots/TC-01-inventaire-loaded.png`

---

### TC-02 — Affichage du bloc Marges ✅ PASS

Bloc positionné **sous** le graphique vert « Évolution des Ventes », conforme spec §3.1.

| Élément attendu | Constaté | Verdict |
|---|---|---|
| Card « 💰 Résumé des marges » | Présente (`h2` avec emoji 💰) | ✅ |
| Bordure gauche violette | `border-left: 4px rgb(139, 92, 246)` (= violet-500) | ✅ |
| Grille 2 colonnes | `class="grid grid-cols-2 gap-4"` | ✅ |
| Colonne 1 — « Marge totale (FCFA) » | « 45 357 » + libellé | ✅ |
| Colonne 2 — « Variation » | « -46.2% » + « vs semaine dernière » | ✅ |
| Graphique violet « Évolution des Marges » | Présent, barres `#7c3aed` (normale) / `#6d28d9` (max) | ✅ |

Couleur des barres vérifiée par DOM (`fill` attribut) : chart Marges `["#6d28d9","#7c3aed"]` vs chart Ventes `["#059669","#10b981"]` — distinction franche violet / vert conforme spec §3.3 et critère CA-09.

Screenshot : `qa-screenshots/TC-02-bloc-marges-semaine.png`

---

### TC-03 — Bascule onglets Semaine / Mois / Année ✅ PASS

| Onglet | Marge totale | Variation | Label variation | Nb barres chart Marges | Nb barres chart Ventes |
|---|---|---|---|---|---|
| Semaine (S21) | 45 357 | -46.2% | « vs semaine dernière » | 7 | 7 |
| Mois (mai) | 316 060 | -49.1% | « vs mois dernier » | 31 | 31 |
| Année (2026) | 1 483 702 | — (null) | « vs année dernière » | 12 | 12 |

- Les barres du chart Marges se mettent à jour à chaque bascule.
- Nombre de barres du chart Marges = nombre de barres du chart Ventes pour les 3 onglets (invariant CA-02 respecté).
- Libellé de variation contextuel correct sur les 3 onglets.

Screenshots : `qa-screenshots/TC-03-onglet-mois.png`, `qa-screenshots/TC-03-onglet-annee-TC-08-variation-null.png` (l'onglet Semaine est couvert par `TC-01` et `TC-02`).

---

### TC-04 — Cohérence axe temporel (CA-02) ✅ PASS

Extraction des ticks de l'axe X des deux graphiques via `evaluate_script` (textes SVG les plus bas = axe X).

| Onglet | Ticks chart Ventes | Ticks chart Marges | Identiques ? |
|---|---|---|---|
| Semaine | `Mon Tue Wed Thu Fri Sat Sun` | `Mon Tue Wed Thu Fri Sat Sun` | ✅ |
| Mois | `1 … 31` (31 ticks) | `1 … 31` (31 ticks) | ✅ |
| Année | `Jan … Dec` (12 ticks) | `Jan … Dec` (12 ticks) | ✅ |

Confirmé également côté payload PG : `evolution_marges[i].periode === evolution_ventes[i].periode` et `.label` identiques pour tous les index, sur les 3 onglets. Invariant CA-02 entièrement satisfait.

---

### TC-05 — Tooltip hover ✅ PASS

Survol de la barre « Mon » (18/05) du chart Marges déclenché via dispatch d'événements souris recharts.

Tooltip affiché — contenu DOM :
- Conteneur : `class="bg-white p-4 rounded-lg shadow-xl border-2 border-violet-500"` → **bordure violette** ✅
- Date : « 18/05 »
- Montant : « 26 398 FCFA » — `class="text-violet-600 font-bold text-lg"`, couleur calculée `rgb(124, 58, 237)` (= violet-600) ✅
- Nombre de ventes : « 32 ventes » (pluriel correct) ✅

Screenshot : `qa-screenshots/TC-05-tooltip-hover.png`

---

### TC-06 — i18n FR / EN / WO ✅ PASS

Bascule de locale via `localStorage['fayclick-locale']` + reload (mécanisme natif du `LanguageContext`).

| Locale | `summary.title` | `summary.marginTotal` | `chart.title` | Verdict |
|---|---|---|---|---|
| FR | Résumé des marges | Marge totale (FCFA) | Évolution des Marges | ✅ |
| EN | Margins summary | Total margin (FCFA) | Margins Evolution | ✅ |
| WO | Risubeem benefice yi | Benefice bu yepp (FCFA) | Yokkute benefice yi | ✅ |

Les 3 libellés attendus par le plan de test sont exactement restitués pour EN et WO. Parité 1:1 confirmée dans `messages/fr.json`, `messages/en.json`, `messages/wo.json` (namespace `inventory.margins.*`, lignes 770-784).

Screenshots : `qa-screenshots/TC-06-i18n-fr.png`, `TC-06-i18n-en.png`, `TC-06-i18n-wo.png`

---

### TC-07 — Cas marge négative ⚪ NON TESTABLE

Le critère exige l'affichage en rouge de la marge totale lorsque `marge_total < 0` (vente à perte, spec §4.5).

**Données réelles structure 1675** — toutes les marges observées sont **strictement positives** :
- Semaine S21 : `marge_total = 45 357`
- Mois mai : `marge_total = 316 060`
- Année 2026 : `marge_total = 1 483 702`
- Tous les buckets `evolution_marges` : `marge ≥ 0`

Aucune donnée réelle ne permet de déclencher le cas marge négative sur les comptes de test disponibles. Conformément aux consignes, le test est marqué **non testable** (pas FAIL).

**Vérification de substitution (inspection code)** — `components/inventaire/ResumeMargesCard.tsx` lignes 54-55 :
```tsx
const isLoss = data.marge_total < 0;
const marginTotalColor = canView && isLoss ? 'text-red-600' : 'text-violet-600';
```
La logique d'affichage rouge conditionnel est **correctement implémentée**. Le chart utilise `domain={['auto','auto']}` (ligne 85 `EvolutionMargesChart.tsx`) qui supporte les valeurs négatives. La référence DBA cite par ailleurs la structure 139 (mois 9/2025, N-1 = -216 767 FCFA) comme cas réel de marge négative — un test ciblé sur cette structure serait possible si un compte y donnant accès était fourni.

---

### TC-08 — Cas variation null (année 2026) ✅ PASS

Onglet Année — payload PG : `"resume_marges": { "marge_total": 1483702, "marge_variation": null }`.

L'UI affiche la variation sous forme du fallback **« — »** (`margins.naLabel`), couleur neutre `text-gray-500`. Conforme spec §4.4 et tableau logique DBA (N-1 = 0, N > 0 → `NULL` → `—`). Aucune valeur aberrante (`Infinity`, `NaN`) affichée.

Screenshot : `qa-screenshots/TC-03-onglet-annee-TC-08-variation-null.png`

---

### TC-09 — Network : pas de double appel ✅ PASS

| Action | Requête | Statut | Query |
|---|---|---|---|
| Chargement initial (Semaine) | `POST /api/sql` (reqid 152) | 200 | `get_inventaire_periodique(1675, 2026, 0, 21, 0)` |
| Bascule Mois | `POST /api/sql` (reqid 153) | 200 | `get_inventaire_periodique(1675, 2026, 5, 0, 0)` |
| Bascule Année | `POST /api/sql` (reqid 154) | 200 | `get_inventaire_periodique(1675, 2026, 0, 0, 0)` |

**Exactement 1 appel par changement d'onglet** — aucun double appel. Chaque réponse contient bien les clés `resume_marges` et `evolution_marges` au même niveau que `resume_ventes` / `evolution_ventes`.

Payload réel archivé : `qa-screenshots/payload-semaine-1675.json` (réponse complète onglet Semaine, structure 1675).

---

### TC-10 — Masquage CAISSIER ⚪ SKIP

**Raison du SKIP** : le jeu de comptes de test (`docs/Comptes_test.txt` + MEMORY) ne contient que des comptes **profil ADMIN** (`admin@chezkelefant.fay`, `admin@tech24.fay`). Aucun compte profil CAISSIER (droit `VOIR VALEUR STOCK PA` = false) n'est disponible. La fabrication d'un faux test serait non probante.

**Vérification de substitution (inspection code)** — le masquage est implémenté et propagé correctement :
- `app/dashboard/commerce/inventaire/page.tsx` ligne 50 : `const canViewMargins = useHasRight('VOIR VALEUR STOCK PA');`
- Ligne 355-364 : `canView={canViewMargins}` passé à `ResumeMargesCard` ET `EvolutionMargesChart`.
- `ResumeMargesCard.tsx` lignes 85, 94 : montants → `masked` (`***`) si `!canView`.
- `EvolutionMargesChart.tsx` lignes 44, 87 : tooltip et `tickFormatter` YAxis → `***` si `!canView` ; les barres restent affichées (forme non sensible) — conforme spec §3.4.

Le profil ADMIN testé voit l'intégralité des montants (CA-08 implicitement validé). **Recommandation** : provisionner un compte CAISSIER de test pour valider CA-07 en exécution réelle avant mise en production (cf. risque R-04 de la spec).

---

### TC-11 — Pas de régression Ventes ✅ PASS

Tous les éléments préexistants de la page Inventaire restent fonctionnels et inchangés :

| Élément | État |
|---|---|
| Card « 🔥 Résumé des ventes » (4 KPI : CA, Ventes, Panier moyen, Clients actifs) | ✅ Présente, valeurs réelles |
| Variations % avec libellé contextuel | ✅ « -42.3% vs semaine dernière », etc. |
| « Meilleurs articles » (Top 5) | ✅ 5 articles, montants + ventes + unités |
| « Meilleurs clients » (Top 1 en S21) | ✅ Présent |
| EvolutionChart vert « Évolution des Ventes » | ✅ Barres vertes `#059669`/`#10b981` |
| Onglets, en-tête, footer génération | ✅ Inchangés |
| Console | ✅ 0 erreur |

La référence DBA confirme par ailleurs CA-10 (non-régression des champs JSON `resume_ventes`, `evolution_ventes`, `top_articles`, `top_clients`) côté backend. Aucune régression UI ni données détectée.

Screenshot : `qa-screenshots/TC-11-regression-ventes.png` (full page)

---

## 4. 🟡 ISSUES MINEURES

### [MIN-001] — 404 sur `/pattern.svg` (P2 — hérité, hors périmètre Marges)

- **Fichier** : asset statique référencé par un composant de fond/décoration.
- **Type** : ressource manquante.
- **Description** : `GET http://localhost:3000/pattern.svg` retourne `404 Not Found` à chaque chargement de page.
- **Impact** : purement cosmétique, aucune incidence fonctionnelle. Préexiste à la fonctionnalité Marges (non introduit par cette livraison).
- **Solution recommandée** : ajouter le fichier `public/pattern.svg` manquant, ou retirer la référence si le motif de fond n'est plus utilisé. À traiter dans un ticket de maintenance distinct.
- **Priorité** : P2 — n'impacte pas la décision GO/NO-GO.

---

## 5. 💡 SUGGESTIONS

### [SUG-001] — Robustesse de l'hydratation AuthContext

Lors de l'audit, une session navigateur avec un `localStorage` partiellement hydraté (`fayclick_user` hérité d'un run interrompu) a provoqué un blocage permanent sur « Chargement des statistiques… » sans qu'aucun appel API ne soit émis, accompagné d'une `SyntaxError` en console. Le `useEffect` de chargement (`page.tsx` ligne 85) dépend de `user?.id_structure` ; si l'`AuthContext` n'expose pas `id_structure` (hydratation incomplète), la page reste indéfiniment en état `loading`.

**Gain potentiel** (maintenabilité / robustesse) : ajouter un garde-fou — soit un timeout d'hydratation avec message d'erreur explicite (« Session invalide, reconnectez-vous »), soit une redirection vers `/login` si `user` n'est pas hydraté après un délai. Cela éviterait un écran de chargement infini en cas de `localStorage` corrompu.

Hors périmètre strict de la fonctionnalité Marges — à arbitrer par le PO comme amélioration transverse.

---

## 6. ✅ POINTS POSITIFS

- **Implémentation conforme à la spec** : positionnement du bloc (§3.1), grille 2 colonnes (§3.2), couleurs violettes `#7c3aed`/`#6d28d9` (§3.3), masquage `canView` propagé (§3.4), clés i18n complètes 3 langues (§3.5).
- **Invariant CA-02 parfaitement respecté** : axes temporels Ventes/Marges strictement alignés sur les 3 onglets, validé côté UI (DOM) et côté payload PG.
- **Rétrocompatibilité défensive** : la page conditionne le rendu du bloc par `data.resume_marges && data.evolution_marges` (`page.tsx` ligne 352) — un ancien JSON sans marges ne planterait pas.
- **Gestion des cas limites** : variation `null` → `—`, marge négative → rouge, supportées dans le code.
- **Aucune régression** sur les fonctionnalités Ventes préexistantes.
- **Performance** : 1 seul appel API par interaction, aucun appel redondant ; la DBA documente un temps d'exécution PG v2 inférieur à v1 (~69% du baseline).

---

## 7. 📈 MÉTRIQUES

| Métrique | Valeur |
|---|---|
| Critères d'acceptation testables couverts | 9/11 exécutés, 0 échec |
| Couverture i18n | 3/3 locales (FR, EN, WO) — parité 1:1 |
| Erreurs console (fonctionnalité Marges) | 0 |
| Appels réseau redondants | 0 |
| Issues critiques / majeures | 0 / 0 |
| Dette technique introduite | Nulle (composants isolés, typed, conformes patterns projet) |
| Composants livrés | `ResumeMargesCard.tsx`, `EvolutionMargesChart.tsx` + intégration `page.tsx` |

---

## 8. 🎯 PLAN D'ACTION

**Immédiat (avant mise en production)**
- Aucune action bloquante. La fonctionnalité Marges peut être promue.

**Court terme (recommandé)**
- Provisionner un compte de test profil **CAISSIER** sur structure 1675 afin d'exécuter réellement TC-10 / CA-07 (masquage `***`) — couvre le risque R-04 de la spec.
- Si possible, exécuter TC-07 sur la structure 139 (cas réel de marge négative documenté par la DBA) pour confirmer l'affichage rouge en conditions réelles.

**Moyen terme**
- MIN-001 : corriger le 404 `/pattern.svg` dans un ticket de maintenance.
- SUG-001 : renforcer la robustesse de l'hydratation `AuthContext` (timeout / redirection sur session corrompue).

---

## 9. RECOMMANDATION FINALE

# ✅ GO

La fonctionnalité **Suivi des Marges** sur `/dashboard/commerce/inventaire` est **validée pour mise en production**.

- 9 critères sur 11 testés en exécution réelle : **tous PASS**.
- 0 défaut critique, 0 défaut majeur, 0 régression.
- Les 2 tests non exécutés (TC-07 marge négative, TC-10 masquage CAISSIER) le sont par limitation du jeu de données / de comptes de test, **pas par défaut applicatif** — le comportement attendu est confirmé par inspection du code source.

Le GO est assorti d'une **recommandation court terme** : exécuter TC-10 (masquage CAISSIER) avec un compte caissier réel avant ou juste après la mise en production, ce point touchant à la confidentialité de données financières sensibles (droit `VOIR VALEUR STOCK PA`).

---

## ANNEXE — Inventaire des livrables

| Livrable | Chemin |
|---|---|
| Rapport QA | `docs/qa-marges-inventaire-2026-05-19.md` |
| Screenshot TC-01 | `docs/qa-screenshots/TC-01-inventaire-loaded.png` |
| Screenshot TC-02 | `docs/qa-screenshots/TC-02-bloc-marges-semaine.png` |
| Screenshot TC-03 (Mois) | `docs/qa-screenshots/TC-03-onglet-mois.png` |
| Screenshot TC-03 (Année) + TC-08 | `docs/qa-screenshots/TC-03-onglet-annee-TC-08-variation-null.png` |
| Screenshot TC-05 (tooltip) | `docs/qa-screenshots/TC-05-tooltip-hover.png` |
| Screenshot TC-06 (FR) | `docs/qa-screenshots/TC-06-i18n-fr.png` |
| Screenshot TC-06 (EN) | `docs/qa-screenshots/TC-06-i18n-en.png` |
| Screenshot TC-06 (WO) | `docs/qa-screenshots/TC-06-i18n-wo.png` |
| Screenshot TC-11 (régression) | `docs/qa-screenshots/TC-11-regression-ventes.png` |
| Payload PG réel archivé | `docs/qa-screenshots/payload-semaine-1675.json` |

**Fin du rapport QA.**
