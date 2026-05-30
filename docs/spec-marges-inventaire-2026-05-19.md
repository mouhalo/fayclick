# SPEC FONCTIONNELLE — Suivi des Marges sur Inventaire Commerce

**Projet** : FayClick V2
**Module** : `/dashboard/commerce/inventaire`
**Auteur** : Amadou NDIAYE — Architecte Requirements Système, ICELABSOFT-SARL
**Date** : 2026-05-19
**Statut** : Spec validée par PO, prête pour DBA + Fullstack
**Version** : 1.0

---

## 0. Synthèse exécutive

Ajout d'un bloc « Marges » sur la page Inventaire pour permettre aux commerçants de mesurer la **rentabilité réelle** (PV − PA) de leur activité, en plus du chiffre d'affaires déjà affiché. La marge est calculée **uniquement sur les montants encaissés** (prorata sur acomptes partiels), regroupée selon l'onglet actif (Semaine/Mois/Année), comparée à la période précédente, et **masquée pour les CAISSIERS** (droit `VOIR VALEUR STOCK PA`).

**Impact technique** : enrichissement du JSON retourné par `get_inventaire_periodique` (pas de nouvel endpoint), extension du type `InventaireData`, ajout d'une carte résumé + d'un second graphique violet sur la page. Aucune régression sur l'existant (ascendance compatible : les anciens consommateurs ignorent simplement les nouveaux champs).

---

## 1. Exigences fonctionnelles

### 1.1 [REQ-F-001] Calcul de la marge unitaire

**Description**
Pour chaque ligne de `facture_details` rattachée à une facture **encaissée totalement ou partiellement**, calculer la marge brute :

```
marge_ligne_brute = (prix_vente_unitaire − prix_achat_unitaire) × quantite
```

- `prix_vente_unitaire` = colonne `prix` (ou équivalent) de `facture_details`
- `prix_achat_unitaire` = `prix_achat` (PA) du produit lié, à lire dans `produit`
- `quantite` = quantité vendue dans la ligne

**Règle PO validée** : Le PA est **toujours renseigné** en BD. Pas d'edge case PA=0/NULL à gérer côté calcul (les éventuels PA=0 résiduels seraient traités comme « marge brute = PV × quantité », ce qui reste mathématiquement correct).

### 1.2 [REQ-F-002] Prorata sur encaissement (règle métier critique)

**Description**
Une facture peut être :
- **Soldée** (`montant_acompte = montant_net`) → marge réalisée = marge brute totale
- **Acompte partiel** (`0 < montant_acompte < montant_net`) → marge réalisée = prorata
- **Impayée** (`montant_acompte = 0`) → **exclue du périmètre**

**Formule** :
```
ratio_encaissement = montant_acompte_facture / montant_net_facture
marge_realisee_facture = marge_brute_facture × ratio_encaissement
```

**Exemple PO** : Facture 10 000 F, marge brute 3 000 F, acompte 5 000 F → ratio 0,5 → marge réalisée = **1 500 F**.

**Pseudo-SQL** :
```sql
WITH lignes_marges AS (
  SELECT
    f.id_facture,
    f.date_facture,
    f.montant_net,
    f.montant_acompte,
    SUM((fd.prix - p.prix_achat) * fd.quantite) AS marge_brute_facture
  FROM facture f
  JOIN facture_details fd ON fd.id_facture = f.id_facture
  JOIN produit p ON p.id_produit = fd.id_produit
  WHERE f.id_structure = pid_structure
    AND f.montant_acompte > 0                 -- encaissée (totale ou partielle)
    AND f.annulee = false                     -- exclusion annulations
    AND f.date_facture BETWEEN date_debut AND date_fin
  GROUP BY f.id_facture, f.date_facture, f.montant_net, f.montant_acompte
)
SELECT
  date_facture,
  SUM(
    marge_brute_facture
    * (montant_acompte::numeric / NULLIF(montant_net, 0))
  ) AS marge_realisee
FROM lignes_marges
GROUP BY date_facture;
```

**Note DBA** : `NULLIF(montant_net, 0)` pour blinder une éventuelle division par zéro. Si `montant_acompte > montant_net` (sur-paiement résiduel possible ?), capper le ratio à 1 : `LEAST(montant_acompte / NULLIF(montant_net,0), 1)`.

### 1.3 [REQ-F-003] Groupement temporel selon onglet

**Règle de groupement** (alignée sur `evolution_ventes` existant) :

| Onglet actif (côté UI) | Appel PG | Groupement `evolution_marges` |
|---|---|---|
| **Semaine** | `(id, annee, 0, semaine, 0)` | par jour (7 points : lundi → dimanche) |
| **Mois** | `(id, annee, mois, 0, 0)` | par semaine (4 à 6 points selon mois) |
| **Année** | `(id, annee, 0, 0, 0)` | par mois (12 points : janv → déc) |

**Contrainte de cohérence (forte)** :
> `evolution_marges.length === evolution_ventes.length`
> ET `evolution_marges[i].periode === evolution_ventes[i].periode`
> ET `evolution_marges[i].label === evolution_ventes[i].label`

Le DBA doit garantir que les deux séries partagent **exactement** le même axe temporel (mêmes buckets, même ordre, même valeur de `periode` et `label`). Cela permet au front d'afficher les 2 graphiques côte-à-côte ou superposés sans recalage d'axe.

### 1.4 [REQ-F-004] Variation vs période précédente

**Description**
Comparer la marge totale de la période courante avec la marge totale de la période N-1 équivalente.

| Onglet | Période courante | Période comparée |
|---|---|---|
| Semaine | semaine S de année A | semaine S-1 de année A (ou S=52 de A-1 si S=1) |
| Mois | mois M de année A | mois M-1 de année A (ou M=12 de A-1 si M=1) |
| Année | année A | année A-1 |

**Formule** :
```
marge_variation = ((marge_courante - marge_precedente) / NULLIF(marge_precedente, 0)) * 100
```

**Cas limite** : Si `marge_precedente = 0` et `marge_courante > 0` → renvoyer `NULL` côté DBA, afficher « N/A » ou « — » côté UI (cf. §4.4). Ne **jamais** renvoyer `+Infinity` ou un nombre aberrant.

### 1.5 [REQ-F-005] Format JSON enrichi attendu

Le JSON existant retourné par `get_inventaire_periodique` doit être enrichi de **2 nouvelles clés** au même niveau que `resume_ventes` et `evolution_ventes` :

```jsonc
{
  "success": true,
  "structure_id": 1675,
  "periode": "semaine",
  "annee": 2026,
  "date_debut": "2026-05-13",
  "date_fin": "2026-05-19",

  // ===== EXISTANT (inchangé) =====
  "resume_ventes": { "ca_total": 250000, "ca_variation": 12.5, /* ... */ },
  "evolution_ventes": [
    { "periode": "Mon", "label": "13/05", "montant": 35000, "nombre_ventes": 4 },
    /* ... */
  ],
  "top_articles": [/* ... */],
  "top_clients": [/* ... */],

  // ===== NOUVEAU =====
  "resume_marges": {
    "marge_total": 87500,        // somme des marges réalisées (prorata appliqué) sur la période
    "marge_variation": 8.3       // % vs période N-1 (peut être null si N-1 vide)
  },
  "evolution_marges": [
    { "periode": "Mon", "label": "13/05", "marge": 12000, "nombre_ventes": 4 },
    { "periode": "Tue", "label": "14/05", "marge":  9500, "nombre_ventes": 3 },
    /* ... 7 points pour semaine, 4-6 pour mois, 12 pour année */
  ],

  "timestamp_generation": "2026-05-19T10:30:00Z"
}
```

**Notes** :
- `nombre_ventes` dans `evolution_marges` doit valoir le **nombre de factures encaissées** sur ce bucket (cohérent avec le périmètre de calcul des marges, qui exclut les impayées).
- Si aucune vente sur la période : `resume_marges.marge_total = 0`, `marge_variation = null`, `evolution_marges = [{...buckets vides...}]` avec tous les `marge: 0` (pour préserver le même axe temporel que `evolution_ventes`).

---

## 2. Exigences non-fonctionnelles

### 2.1 Performance
- **Pas de nouvel appel HTTP** : enrichissement du JSON existant.
- La fonction PG ne doit pas dépasser **+30 %** de son temps d'exécution actuel (cible : la jointure supplémentaire sur `produit` doit utiliser l'index existant sur `produit.id_produit`).
- Aucun cache front à ajouter — le hook actuel d'inventaire suffit (page rechargée à chaque changement de période).

### 2.2 Sécurité
- Droit applicatif **`VOIR VALEUR STOCK PA`** : vérifié via `useHasRight("VOIR VALEUR STOCK PA")` (cf. `hooks/useRights.ts`).
- Si **false** (profil CAISSIER typiquement) :
  - La carte résumé Marges et le graphique violet **restent affichés** (pour ne pas créer un layout instable selon le profil).
  - **Tous les montants** sont remplacés par `***` (card + barres du chart + tooltip + variation).
  - Le nombre de ventes (`nombre_ventes`) reste visible (ce n'est pas une donnée financière sensible).
- **Pas de masquage côté backend** : la fonction PG renvoie toujours les marges. Le contrôle est **uniquement UI** (cohérent avec le pattern `canViewCA` du dashboard desktop). Justification : la fonction est appelée par le même endpoint pour tous les profils ; ajouter une logique de masquage côté SQL doublerait inutilement la complexité.

### 2.3 Compatibilité ascendante
- Les anciens clients (PWA installée en cache) qui ne connaissent pas `resume_marges` / `evolution_marges` **ignorent simplement** ces champs grâce au typing TypeScript laxiste sur les propriétés non utilisées.
- Aucun champ existant ne change de nom, de type, ou de signification.
- Signature PG **inchangée** : `get_inventaire_periodique(pid_structure, pannee, pmois, psemaine, pjour)` — mêmes 5 paramètres `INTEGER`.

### 2.4 i18n
- 3 langues à mettre à jour : `messages/fr.json`, `messages/en.json`, `messages/wo.json` (parité 1:1).
- Namespace : `inventory.margins.*` (cf. §3.5 pour la liste complète).
- Vérification par `npm run i18n:check` après ajout.

### 2.5 Responsive / Mobile
- La carte résumé Marges suit la même grille responsive que `summary` (existant) : full-width sur mobile, conservée sur tablette/desktop.
- Le second graphique reprend les mêmes breakpoints que `EvolutionChart` (hauteur 300 px, `ResponsiveContainer`).

---

## 3. Spécification UI

### 3.1 Position dans la page

Ordre vertical recommandé dans `app/dashboard/commerce/inventaire/page.tsx` :

```
1. InventaireHeader (existant)
2. Onglets Semaine/Mois/Année (existant)
3. Card résumé Ventes (existant)
4. Top Articles + Top Clients (existant)
5. EvolutionChart vert — Ventes (existant)
6. ⭐ NOUVELLE Card résumé Marges
7. ⭐ NOUVEAU EvolutionChart violet — Marges
8. Footer infos génération (existant)
```

Justification : placer le bloc Marges **après** Ventes respecte le flux de lecture naturel (CA d'abord, rentabilité ensuite) et permet à un CAISSIER de voir un layout cohérent (même position, valeurs masquées).

### 3.2 Card résumé Marges — Recommandation : **2 colonnes**

**Choix** : grille `grid-cols-2` (Marge totale | Variation %), pas pleine largeur.

**Justification** :
- La card Ventes existante (§264-326 de `inventaire/page.tsx`) utilise une grille **2×2** (4 KPI). Une card Marges en 2×1 préserve la **cohérence visuelle**.
- Pleine largeur (1 colonne) gaspille de l'espace sur desktop et déséquilibre la hiérarchie visuelle (Marges paraîtrait « plus important » que Ventes).
- Évolution future possible (Marge moyenne, taux marge si le PO change d'avis) → la grille 2×2 sera réutilisable sans refonte.

**Maquette ASCII** :
```
┌──────────────────────────────────────────────┐
│ 💰 Résumé des marges                          │
├─────────────────────┬────────────────────────┤
│ 87 500              │ +8.3%                   │
│ Marge totale (FCFA) │ vs semaine dernière     │
└─────────────────────┴────────────────────────┘
```

**Style** :
- Background : `bg-white rounded-2xl p-4 shadow-lg`
- Bordure gauche : `border-l-4 border-violet-500` (vs `border-emerald-500` pour Ventes)
- Couleur montants : `text-violet-600` (vs `text-emerald-600` pour Ventes)
- Couleur variation : `text-emerald-600` si ≥0, `text-red-600` si <0 (identique à Ventes)

### 3.3 Graphique Marges

**Composant** : nouveau `components/inventaire/EvolutionMargesChart.tsx`, copie quasi-conforme de `EvolutionChart.tsx` avec ajustements :

| Élément | Ventes (existant) | Marges (nouveau) |
|---|---|---|
| Couleur barre max | `#059669` (emerald-700) | `#6d28d9` (violet-700) |
| Couleur barre normale | `#10b981` (emerald-500) | `#7c3aed` (violet-600) |
| Bordure titre (barre verticale 4 px) | `bg-emerald-500` | `bg-violet-500` |
| Cursor hover | `rgba(16, 185, 129, 0.1)` | `rgba(124, 58, 237, 0.1)` |
| Tooltip border | `border-emerald-500` | `border-violet-500` |
| Tooltip texte montant | `text-emerald-600` | `text-violet-600` |
| dataKey | `montant` | `marge` |
| Titre par défaut | `chart.title` | `margins.chart.title` |

**Choix couleur** : `#7c3aed` (violet-600 Tailwind) pour distinction franche du vert ventes, sans tomber sur des couleurs sémantiquement chargées (rouge=alerte, orange=warning). Le violet/indigo véhicule « valeur premium / analytique avancée ».

### 3.4 Masquage CAISSIER (droit `VOIR VALEUR STOCK PA`)

**Pattern d'implémentation** (côté page Inventaire) :

```tsx
const canViewMargins = useHasRight('VOIR VALEUR STOCK PA');

// Card résumé
<div className="text-xl font-bold text-violet-600">
  {canViewMargins ? formatNumber(data.resume_marges.marge_total, locale) : '***'}
</div>
<div className={`text-xs font-semibold ${...}`}>
  {canViewMargins
    ? `${signe}${data.resume_marges.marge_variation?.toFixed(1) ?? '—'}% ${variationLabel}`
    : '***'}
</div>

// Chart : passer canViewMargins en prop
<EvolutionMargesChart data={data.evolution_marges} canView={canViewMargins} />
```

À l'intérieur de `EvolutionMargesChart` :
- Si `canView === false` : remplacer le `tickFormatter` du YAxis par `() => '***'`, masquer les valeurs dans le tooltip (`*** FCFA` au lieu du montant), barres affichées normalement (la **forme** du graphique n'est pas une fuite — seules les valeurs chiffrées le sont).

**Note** : Ne **PAS** retourner `null` ou cacher complètement le bloc Marges pour les CAISSIERS → casser la mise en page selon le profil crée plus de confusion qu'un masquage `***`.

### 3.5 Clés i18n à ajouter

À ajouter dans le namespace `inventory` des 3 fichiers `messages/fr.json`, `messages/en.json`, `messages/wo.json` :

```jsonc
"margins": {
  "summary": {
    "title": "Résumé des marges",                  // EN: "Margins summary" / WO: "Risubeem benefice yi"
    "marginTotal": "Marge totale (FCFA)",          // EN: "Total margin (FCFA)" / WO: "Benefice bu yepp (FCFA)"
    "marginVariation": "Variation"                 // EN: "Variation" / WO: "Coppite"
  },
  "chart": {
    "title": "Évolution des Marges",               // EN: "Margins Evolution" / WO: "Yokkute benefice yi"
    "titleWithPeriod": "Évolution des Marges - {period}",
    "empty": "Aucune donnée de marge disponible",
    "tooltipMargin": "Marge"                       // EN: "Margin" / WO: "Benefice"
  },
  "masked": "***",                                 // identique 3 langues
  "naLabel": "—"                                   // identique 3 langues (fallback variation null)
}
```

**Glossaire wolof** (cohérent avec `docs/i18n-guide.md`) :
- "marge" → `benefice` (emprunt français consacré, plus parlant que `tegale-bu-toll` peu courant)
- "variation" → `coppite` (changement)
- "évolution" → `yokkute` (progression)

---

## 4. Edge cases et règles de gestion

### 4.1 Facture avec acompte partiel
**Cas** : facture 10 000 F, marge brute 3 000 F, acompte 4 000 F.
**Calcul** :
- `ratio = 4000 / 10000 = 0.4`
- `marge_realisee = 3000 × 0.4 = 1200 F`
- Si plus tard un 2ᵉ acompte de 6000 F arrive (total = 10000) → recalcul automatique au prochain refresh : marge_realisee passe à 3000 F.

**Note** : Le prorata étant recalculé à chaque appel de `get_inventaire_periodique`, **aucun stockage historique** des marges n'est nécessaire. Si la facture est encaissée en plusieurs fois sur des jours différents, la marge sera attribuée au **jour de la facture initiale** (`date_facture`), pas au jour des paiements. C'est la convention métier la plus simple et la plus cohérente avec `evolution_ventes` existant.

### 4.2 Facture annulée
**Règle** : Exclure via `WHERE f.annulee = false` (ou la colonne équivalente — DBA à confirmer le nom exact : `annulee`, `statut <> 'ANNULEE'`, etc.).
**Si la colonne n'existe pas** : DBA propose une alternative (flag, table d'historique, etc.) avant implémentation.

### 4.3 Produit supprimé entre vente et calcul
**Hypothèse** : la table `produit` n'a probablement pas de soft-delete (à confirmer par DBA). Deux scénarios :

**Scénario A — Pas de soft-delete (suppression dure)** :
- Le `JOIN produit ON p.id_produit = fd.id_produit` retournera 0 lignes pour les ventes de produits supprimés → ces lignes seront **silencieusement exclues** du calcul de marge.
- **Risque** : sous-estimation de la marge totale.
- **Solution recommandée** : `LEFT JOIN produit p ON p.id_produit = fd.id_produit` + `COALESCE(p.prix_achat, 0)` → marge = PV × quantité pour les produits orphelins (équivalent à PA inconnu = 0).
- **Alternative** : `facture_details` stocke-t-il un snapshot du PA au moment de la vente ? Si oui, **utiliser ce snapshot** plutôt que `produit.prix_achat` (plus fiable historiquement).

**Scénario B — Soft-delete présent** (`produit.actif`, `produit.supprime`, etc.) :
- `LEFT JOIN` suffit, le produit reste accessible.

**Action DBA** : auditer la structure de `produit` et `facture_details` et confirmer le choix avant développement. Documenter la décision dans cette spec.

### 4.4 Variation = +∞ ou non calculable
**Règle** :
| Période N-1 | Période N | `marge_variation` |
|---|---|---|
| > 0 | > 0 | `((N - N-1) / N-1) × 100` |
| > 0 | 0 | `-100` (chute totale) |
| 0 | > 0 | `null` (renvoyé par PG) → UI affiche `margins.naLabel` = `—` |
| 0 | 0 | `0` (stabilité à zéro) |
| < 0 | n'importe | théoriquement impossible (marges < 0 = vente à perte) — si ça arrive, calculer normalement |

**Affichage UI** :
```tsx
{data.resume_marges.marge_variation === null
  ? t('margins.naLabel')                       // "—"
  : `${signe}${marge_variation.toFixed(1)}% ${variationLabel}`}
```

### 4.5 Vente à perte (marge négative)
**Cas** : PA > PV (promotion agressive, déstockage).
**Règle** : Calculer normalement. La marge peut être négative.
**Affichage** :
- Card résumé : montant en rouge si `marge_total < 0` (couleur conditionnelle, à distinguer du violet par défaut).
- Chart : les barres restent violettes mais peuvent partir en négatif si `recharts` le supporte (oui via `domain={['auto', 'auto']}`).
- **Pas de blocage métier** : un commerçant a le droit de vendre à perte et doit le voir.

---

## 5. Critères d'acceptation testables

| # | Critère | Test |
|---|---|---|
| **CA-01** | La fonction `get_inventaire_periodique` retourne `resume_marges` et `evolution_marges` dans son JSON | Appel SQL `SELECT * FROM get_inventaire_periodique(1675, 2026, 0, 20, 0)` → vérifier présence des 2 clés |
| **CA-02** | `evolution_marges.length === evolution_ventes.length` quelle que soit la période | Test sur les 3 onglets (semaine/mois/année), assertion d'égalité de longueur et de `periode[i]` |
| **CA-03** | Pour une facture soldée 10 000 F avec marge brute 3 000 F, `marge_realisee` = 3 000 F | Insérer données test, vérifier `resume_marges.marge_total` |
| **CA-04** | Pour la même facture en acompte 5 000 F, `marge_realisee` = 1 500 F | Test idem avec ratio 0,5 |
| **CA-05** | Une facture annulée (`annulee = true`) est **exclue** du calcul de marge | Créer 2 factures identiques, annuler l'une, vérifier que la marge totale = marge d'une seule facture |
| **CA-06** | Si la marge période N-1 = 0 et N > 0, `marge_variation = null` côté JSON et `—` côté UI | Test sur une structure neuve (1ère semaine d'activité) |
| **CA-07** | Profil CAISSIER (droit `VOIR VALEUR STOCK PA` = false) : tous les montants marges affichent `***` | Login compte caissier, naviguer sur `/dashboard/commerce/inventaire`, screenshot |
| **CA-08** | Profil ADMIN : tous les montants marges sont visibles normalement | Idem, compte ADMIN |
| **CA-09** | Le graphique Marges utilise des barres violettes (`#7c3aed`) et non vertes | Inspection visuelle + DOM (`fill` attribut) |
| **CA-10** | Aucune régression : `resume_ventes`, `evolution_ventes`, `top_articles`, `top_clients` inchangés en structure et valeurs | Diff avant/après sur les anciens champs pour 3 structures de test |
| **CA-11** | i18n FR/EN/WO : la clé `inventory.margins.summary.title` retourne le bon libellé selon la locale active | Switcher de langue, vérifier 3 fois |
| **CA-12** | Performance : temps d'exécution de la fonction PG **< 130 %** du temps actuel sur structure 1675 (≈900 factures) | `EXPLAIN ANALYZE` avant/après |

---

## 6. Contraintes techniques pour DBA et Fullstack

### 6.1 Contraintes DBA

- **Signature PG inchangée** : `get_inventaire_periodique(pid_structure INTEGER, pannee INTEGER, pmois INTEGER, psemaine INTEGER, pjour INTEGER)`. Pas de nouveau paramètre. Le droit `VOIR VALEUR STOCK PA` est géré côté UI.
- **Ascendance compatible** : ne **rien retirer** du JSON existant. Uniquement ajouter 2 clés au même niveau.
- Utiliser un `LEFT JOIN` sur `produit` pour absorber un éventuel produit supprimé sans casser le calcul.
- `NULLIF(montant_net, 0)` obligatoire pour éviter division par zéro.
- `marge_variation` peut renvoyer `NULL` (pas `Infinity`, pas une string).
- Documenter la version dans un commentaire SQL en tête de fonction : `-- v2.0 (2026-05-19) : ajout resume_marges + evolution_marges`.
- Auditer et **documenter** la décision sur le scénario 4.3 (snapshot PA dans `facture_details` ou non).

### 6.2 Contraintes Fullstack

**Extension du type TypeScript** (`types/inventaire.types.ts`) — **pas de breaking change** :

```typescript
// AJOUT
export interface ResumeMarges {
  marge_total: number;
  marge_variation: number | null;  // null si N-1 vide
}

export interface EvolutionMarge {
  periode: string;
  label: string;
  marge: number;
  nombre_ventes: number;
}

// MODIFICATION (ajout de propriétés optionnelles pour rétrocompat)
export interface InventaireData {
  // ... champs existants inchangés ...
  resume_marges?: ResumeMarges;        // optionnel pour les anciens clients
  evolution_marges?: EvolutionMarge[]; // optionnel pour les anciens clients
}
```

**Marquer optionnel (`?`)** est crucial : un client PWA mis en cache avant le déploiement DB ne plantera pas si la fonction tarde à être déployée.

**Fichiers à créer/modifier** :

| Fichier | Action |
|---|---|
| `types/inventaire.types.ts` | Ajouter `ResumeMarges`, `EvolutionMarge`, étendre `InventaireData` |
| `components/inventaire/EvolutionMargesChart.tsx` | **Créer** (copie + variantes couleur de `EvolutionChart.tsx`) |
| `app/dashboard/commerce/inventaire/page.tsx` | Insérer Card Marges + Chart Marges entre `EvolutionChart` et footer ; ajouter `useHasRight('VOIR VALEUR STOCK PA')` |
| `messages/fr.json` | Ajouter bloc `inventory.margins.*` |
| `messages/en.json` | Idem |
| `messages/wo.json` | Idem |
| `services/inventaire.service.ts` | **Aucun changement** (mêmes paramètres, le JSON parsé est juste plus riche) |

**Pattern de défense** côté front (au cas où la PG renvoie un ancien JSON sans marges) :
```tsx
{data.resume_marges && data.evolution_marges && (
  <>
    <ResumeMargesCard data={data.resume_marges} canView={canViewMargins} />
    <EvolutionMargesChart data={data.evolution_marges} canView={canViewMargins} />
  </>
)}
```

### 6.3 Ordre de déploiement recommandé

1. **DBA** : déployer la nouvelle version de `get_inventaire_periodique` en environnement de test, valider CA-01 à CA-06 + CA-12.
2. **DBA** : déployer en production (la fonction enrichie reste compatible avec les anciens clients qui ignorent les nouveaux champs).
3. **Fullstack** : développer les composants + i18n sur une branche `feature/marges-inventaire`.
4. **Fullstack** : tester en local pointé sur la PG de prod (les marges seront déjà calculées).
5. **Fullstack** : merger + déployer via `npm run deploy:build`. Bumper `CACHE_NAME` du Service Worker.
6. **QA** : valider CA-07 à CA-11 sur l'environnement de prod avec comptes caissier + admin.

---

## 7. Risques et points d'attention

| # | Risque | Criticité | Mitigation |
|---|---|---|---|
| **R-01** | Le calcul de marge alourdit la fonction PG > +30 % | Moyenne | `EXPLAIN ANALYZE` avant déploiement ; index sur `facture(id_structure, date_facture, montant_acompte)` à vérifier |
| **R-02** | Snapshot PA absent de `facture_details` → marge erronée pour produits dont PA a évolué | Haute | Audit DBA prioritaire ; si absent, prévoir migration future pour ajouter `prix_achat_snapshot` dans `facture_details` |
| **R-03** | Désynchronisation `evolution_marges` vs `evolution_ventes` (longueurs différentes) | Haute | Test CA-02 obligatoire ; ne pas paralléliser les 2 calculs SQL, factoriser le bucket temporel |
| **R-04** | Un CAISSIER voit accidentellement les marges (bug droit) | Haute | Test manuel CA-07 systématique avant chaque release ; envisager un test E2E Playwright |
| **R-05** | i18n EN/WO non livrés en même temps que FR → fallback FR visible aux utilisateurs anglophones | Faible | `npm run i18n:check` bloque le merge si parité non respectée |

---

## 8. Décisions clés (à valider par PO si non encore tranchées)

1. **Marge attribuée au jour de la facture** (pas au jour des paiements/acomptes) — choix par simplicité, alignement avec `evolution_ventes`. **À confirmer PO**.
2. **Marges négatives autorisées et affichées en rouge** — pas de blocage métier. **À confirmer PO**.
3. **Bloc Marges visible même pour CAISSIER avec valeurs `***`** plutôt que masqué intégralement — pour stabilité du layout. **À confirmer PO**.
4. **Pas de taux de marge (%) affiché** — confirmé par PO en amont (montant FCFA uniquement).
5. **Pas d'export PDF/Excel des marges dans cette V1** — fonctionnalité d'export globale déjà en TODO (`exportWip`).

---

## 9. Fichiers et chemins de référence

| Élément | Chemin |
|---|---|
| Page principale | `D:\React_Prj\fayclick\app\dashboard\commerce\inventaire\page.tsx` |
| Composant graphique source | `D:\React_Prj\fayclick\components\inventaire\EvolutionChart.tsx` |
| Service inventaire | `D:\React_Prj\fayclick\services\inventaire.service.ts` |
| Types | `D:\React_Prj\fayclick\types\inventaire.types.ts` |
| Hook droits | `D:\React_Prj\fayclick\hooks\useRights.ts` |
| i18n FR | `D:\React_Prj\fayclick\messages\fr.json` (namespace `inventory` ligne 688) |
| i18n EN | `D:\React_Prj\fayclick\messages\en.json` |
| i18n WO | `D:\React_Prj\fayclick\messages\wo.json` |
| Guide i18n | `D:\React_Prj\fayclick\docs\i18n-guide.md` |

---

**Fin de spec.** Prochaine étape : assigner à DBA (audit `facture_details` + scénario 4.3) en parallèle de Fullstack (POC composant `EvolutionMargesChart` avec mock data conforme au format §1.5).
