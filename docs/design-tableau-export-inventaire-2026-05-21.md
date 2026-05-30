# Design — Tableau de données + Export CSV sur les graphiques Inventaire

> **Type de document** : Conception UX/UI (PAS d'implémentation)
> **Auteur** : UX Designer
> **Date** : 2026-05-21
> **Page cible** : `/dashboard/commerce/inventaire`
> **Composants concernés** : `components/inventaire/EvolutionChart.tsx`, `components/inventaire/EvolutionMargesChart.tsx`
> **Statut** : Prêt pour implémentation par l'agent Fullstack

---

## Contexte et objectif

Ajouter sur les 2 cartes graphiques de la page Inventaire (Évolution des Ventes — barres vertes, et Évolution des Marges — barres violettes) :

1. Une **icône-bouton "Table"** dans le coin supérieur droit du header de chaque carte.
2. Un clic ouvre un **modal popup** présentant les données du graphique sous forme de **tableau**.
3. Le modal contient un bouton **"Exporter CSV"**.

### Décisions PO déjà tranchées (rappel — non rediscutées ici)

- Affichage = modal popup, réutilisant `components/ui/Modal.tsx`.
- Export = 1 CSV par graphique.
- Droit CAISSIER : carte Marges, si `canView === false` → colonne marge en `***` ET bouton Export désactivé. Carte Ventes : aucune restriction.
- CSV : séparateur `;` + UTF-8 BOM (compatibilité Excel FR).

### Contraintes techniques relevées à l'étude des fichiers

| # | Contrainte | Conséquence design |
|---|------------|---------------------|
| C1 | `Modal.tsx` impose `max-h-[60vh] overflow-y-auto` sur le slot contenu (ligne 155). | Le tableau scrolle verticalement si besoin. Pas besoin de `size='full'`. |
| C2 | `Modal.tsx` possède un slot `footer` natif (fond gris, bordure haute). | Le bouton "Exporter CSV" se place dans ce `footer`. |
| C3 | `PeriodeType = 'semaine' \| 'mois' \| 'annee'`. | Le titre du modal et le nom du fichier CSV sont dynamiques selon la période. |
| C4 | Volumétrie : semaine ≈ 7 lignes, mois ≈ 4-5 lignes, année = 12 lignes. | `size='lg'` (max-w-2xl) suffit. Pas de `xl`/`full`. |
| C5 | `EvolutionMarge.marge` peut être **négatif** (vente à perte). | Tableau + ligne Total gèrent le signe et la couleur (rouge si < 0). |
| C6 | `evolution_marges?` est optionnel (rétrocompat v2). | Le bouton Table gère `data === undefined` → état vide. |
| C7 | Droit CAISSIER = prop `canView` ("VOIR VALEUR STOCK PA"), **pas** `canViewCA`. | Nommage des props aligné sur l'existant `EvolutionMargesChart`. |
| C8 | Clés i18n existantes : `inventory.chart.*`, `inventory.margins.chart.*`, `inventory.margins.masked`. | Nouvelles clés sous `inventory.dataTable.*`. Réutilisation de `inventory.margins.masked` pour les `***`. |

> **Dette i18n signalée (hors scope)** : `Modal.tsx` ligne 132 a un `aria-label="Fermer"` codé en dur français. À traiter dans un futur passage i18n du composant Modal — **pas un blocker** pour cette feature.

---

## 1. Placement et style de l'icône Table

### 1.1 Icône retenue

**`Table2`** de `lucide-react`.

Justification : `Table2` est l'icône la plus universellement reconnue comme « tableau de données » (en-tête + lignes). `LayoutGrid` évoque un dashboard de cartes ; `TableProperties` est obscur et peu lisible en petite taille ; `Table` (sans le 2) a un rendu de grille plus fin et moins net à 18px.

### 1.2 Position dans le header de la carte

Le `<h3>` actuel utilise `flex items-center gap-2` (barre verticale colorée + titre). On passe à **`flex items-center justify-between`** : le groupe « barre + titre » reste à gauche dans un sous-`<div>`, le bouton Table se place à droite.

**Avant (header actuel) :**
```
┌──────────────────────────────────────────────────┐
│ ▌ Évolution des Ventes                           │
│                                                  │
│   [   graphique recharts   ]                     │
└──────────────────────────────────────────────────┘
```

**Après (header proposé) :**
```
┌──────────────────────────────────────────────────┐
│ ▌ Évolution des Ventes                    [ ▦ ]  │  ← bouton Table aligné à droite
│                                                  │
│   [   graphique recharts   ]                     │
└──────────────────────────────────────────────────┘
```

Structure HTML cible du header (indicatif, pour l'agent Fullstack) :
```
<h3 class="... flex items-center justify-between gap-2">
  <span class="flex items-center gap-2">
    <div class="w-1 h-6 bg-emerald-500 rounded-full"></div>
    {displayTitle}
  </span>
  <button>  ← icône Table  </button>
</h3>
```

> Le bouton est un enfant direct du `<h3>` pour rester au même niveau vertical que le titre. Le `<span>` interne préserve l'alignement barre verticale + texte.

### 1.3 Style du bouton-icône

| Propriété | Valeur |
|-----------|--------|
| Taille icône | `w-[18px] h-[18px]` (18px) — lisible sans dominer le titre |
| Zone cliquable | `p-2` (padding) → cible tactile ≈ 34px, conforme mobile |
| Forme | `rounded-lg` |
| Couleur **au repos** | `text-gray-400` (neutre, discret) |
| Couleur **au hover/focus** — carte Ventes | `text-emerald-600` + fond `hover:bg-emerald-50` |
| Couleur **au hover/focus** — carte Marges | `text-violet-600` + fond `hover:bg-violet-50` |
| Transition | `transition-colors duration-200` |
| Focus visible | `focus:outline-none focus:ring-2 focus:ring-emerald-500` (resp. `violet-500`) |

Choix : icône **neutre grise au repos**, teintée à la couleur de la carte **uniquement au hover/focus**. Moins criard qu'une icône colorée permanente, tout en gardant la cohérence visuelle vert/violet propre à chaque carte.

### 1.4 Accessibilité

- `aria-label` : libellé i18n `inventory.dataTable.openButtonLabel` → FR « Afficher les données en tableau ».
- `title` : même chaîne (tooltip natif au survol desktop).
- `type="button"` explicite (évite tout submit parasite).
- Le bouton reste focusable au clavier (Tab) et activable par Entrée/Espace (comportement natif `<button>`).

---

## 2. Maquette du modal tableau

### 2.1 Paramètres du Modal réutilisé

| Prop `Modal` | Valeur | Raison |
|--------------|--------|--------|
| `size` | `'lg'` (max-w-2xl) | Volumétrie max 12 lignes — confortable, pas surdimensionné (C4) |
| `overlay` | `'blur'` | Cohérent avec le reste de l'app |
| `animation` | `'scale'` | Défaut, cohérent |
| `title` | dynamique (voir 2.2) | — |
| `footer` | bouton Export CSV (voir section 3) | Slot natif (C2) |
| `showCloseButton` | `true` | Croix de fermeture native conservée |

### 2.2 Titre du modal (dynamique selon la période)

Format : `{nom du graphique} — {libellé période}`

| Graphique | Période | Titre rendu (FR) |
|-----------|---------|-------------------|
| Ventes | `semaine` | Évolution des Ventes — Semaine |
| Ventes | `mois` | Évolution des Ventes — Mois |
| Ventes | `annee` | Évolution des Ventes — Année |
| Marges | `semaine` | Évolution des Marges — Semaine |
| Marges | `mois` | Évolution des Marges — Mois |
| Marges | `annee` | Évolution des Marges — Année |

Le libellé de période vient de clés i18n dédiées (`inventory.dataTable.periodSemaine` / `periodMois` / `periodAnnee`).

### 2.3 Structure du tableau

**Colonnes** (3) :

| Colonne | Source donnée | Alignement | Largeur indicative |
|---------|---------------|------------|---------------------|
| Période | `label` (ex « 13/05 », « Semaine 23 », « Janvier 2026 ») | gauche | ~40% |
| Montant / Marge | `montant` (Ventes) ou `marge` (Marges) | droite | ~35% |
| Nb ventes | `nombre_ventes` | droite (ou centre) | ~25% |

Choix de la colonne période : on affiche **`label`** (et non `periode`). `label` est la forme humainement lisible, déjà utilisée dans le tooltip des deux graphiques — cohérence garantie. `periode` (code court « Mon », « S23 ») est abandonné en affichage car redondant et moins clair.

Format des valeurs :
- Montant / Marge : `formatNumber(valeur, locale)` + ` FCFA` (même util que les graphiques).
- Marge négative : affichée avec son signe, **texte rouge** (`text-red-600`).
- Nb ventes : entier brut.

### 2.4 Ligne Total

Une ligne **Total** en bas du tableau, visuellement distincte :
- Fond `bg-gray-50`, texte `font-bold`.
- Bordure supérieure plus marquée (`border-t-2 border-gray-300`).
- Colonne Période → libellé « Total » (i18n).
- Colonne Montant/Marge → **somme** de tous les montants/marges. Si la somme des marges est négative → texte rouge.
- Colonne Nb ventes → **somme** des `nombre_ventes`.

> **Masquage CAISSIER (C6)** : sur la carte Marges, si `canView === false`, la cellule Marge de la ligne Total affiche aussi `***` (clé `inventory.margins.masked`). Sinon le total réel serait déductible par addition des lignes — incohérent avec le masquage.

### 2.5 Maquette ASCII — carte Ventes (cas nominal, période semaine)

```
╔══════════════════════════════════════════════════════════╗
║  Évolution des Ventes — Semaine                      [ ✕ ]║
╠══════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌────────────────┬───────────────────┬─────────────────┐ ║
║  │ Période        │          Montant  │      Nb ventes  │ ║
║  ├────────────────┼───────────────────┼─────────────────┤ ║
║  │ 13/05          │     125 000 FCFA  │              8  │ ║
║  │ 14/05          │      87 500 FCFA  │              5  │ ║
║  │ 15/05          │     210 000 FCFA  │             12  │ ║
║  │ 16/05          │      45 000 FCFA  │              3  │ ║
║  │ 17/05          │     156 000 FCFA  │              9  │ ║
║  │ 18/05          │      98 000 FCFA  │              6  │ ║
║  │ 19/05          │     134 000 FCFA  │              7  │ ║
║  ├════════════════┼═══════════════════┼═════════════════┤ ║
║  │ Total          │     855 500 FCFA  │             50  │ ║
║  └────────────────┴───────────────────┴─────────────────┘ ║
║                                                            ║
╠══════════════════════════════════════════════════════════╣
║                                   [ ⬇  Exporter CSV ]      ║
╚══════════════════════════════════════════════════════════╝
```

### 2.6 Maquette ASCII — carte Marges, profil CAISSIER (`canView === false`)

```
╔══════════════════════════════════════════════════════════╗
║  Évolution des Marges — Semaine                      [ ✕ ]║
╠══════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌────────────────┬───────────────────┬─────────────────┐ ║
║  │ Période        │            Marge  │      Nb ventes  │ ║
║  ├────────────────┼───────────────────┼─────────────────┤ ║
║  │ 13/05          │        *** FCFA   │              8  │ ║
║  │ 14/05          │        *** FCFA   │              5  │ ║
║  │ 15/05          │        *** FCFA   │             12  │ ║
║  │ ...            │        *** FCFA   │             ..  │ ║
║  ├════════════════┼═══════════════════┼═════════════════┤ ║
║  │ Total          │        *** FCFA   │             50  │ ║
║  └────────────────┴───────────────────┴─────────────────┘ ║
║                                                            ║
╠══════════════════════════════════════════════════════════╣
║   [ ⬇  Exporter CSV ]  (désactivé, grisé)                  ║
╚══════════════════════════════════════════════════════════╝
```

> Sur la carte Marges en mode CAISSIER : seule la **colonne Marge** est masquée. La colonne Période et Nb ventes restent visibles (cohérent avec le pattern du graphique qui ne masque que les valeurs chiffrées, pas la structure).

### 2.7 Maquette ASCII — état tableau vide

Cas : `data` vide ou `undefined` (C6 — rétrocompatibilité `evolution_marges?`).

```
╔══════════════════════════════════════════════════════════╗
║  Évolution des Marges — Mois                         [ ✕ ]║
╠══════════════════════════════════════════════════════════╣
║                                                            ║
║                      ╭──────────╮                         ║
║                      │    ▦     │   (icône Table grisée)   ║
║                      ╰──────────╯                         ║
║                                                            ║
║          Aucune donnée à afficher pour cette période       ║
║                                                            ║
╠══════════════════════════════════════════════════════════╣
║   [ ⬇  Exporter CSV ]  (désactivé, grisé)                  ║
╚══════════════════════════════════════════════════════════╝
```

> Lorsque le tableau est vide, le bouton Export est **désactivé** (rien à exporter). Optionnel mais recommandé : on peut aussi simplement ne pas afficher le bouton Table sur la carte si `data` est vide/undefined — voir recommandation §5.

### 2.8 Comportement responsive (mobile-first)

- **Largeur** : le Modal est déjà responsive (`w-full` + `max-w-2xl`, `p-4` sur l'overlay). Sur mobile 320–767px, il occupe quasiment toute la largeur.
- **Tableau** : 3 colonnes étroites → tient sur 320px sans débordement. Les valeurs FCFA peuvent être longues ; on autorise un **scroll horizontal de sécurité** : envelopper le `<table>` dans un `<div class="overflow-x-auto">`. Le `<table>` reçoit `min-w-full` ou `w-full`.
- **Pas d'empilement en cartes** : 3 colonnes courtes, le tableau classique reste lisible sur mobile — pas besoin de transformation en liste.
- **Scroll vertical** : géré nativement par `Modal` (`max-h-[60vh] overflow-y-auto`, C1). La ligne Total scrolle avec le contenu (pas de sticky requis vu la faible volumétrie ≤ 12 lignes).
- **Cible tactile** : bouton Export `min-h-[44px]`, bouton-icône Table `p-2` (≈ 34px) — conformes aux recommandations tactiles.

---

## 3. Bouton Export CSV

### 3.1 Emplacement

Dans le **slot `footer` natif du `Modal`** (C2) — fond gris, bordure supérieure. Bouton **aligné à droite** du footer (`flex justify-end`).

Justification : le footer est l'emplacement idiomatique pour une action principale de modal ; il évite de surcharger le header (qui a déjà titre + croix).

### 3.2 Libellé et icône

- Icône : **`Download`** de `lucide-react` (`w-4 h-4`), placée à gauche du texte.
- Libellé : i18n `inventory.dataTable.exportCsv` → FR « Exporter CSV ».
- Style (état actif) :
  - Carte Ventes : `bg-emerald-600 hover:bg-emerald-700 text-white`
  - Carte Marges : `bg-violet-600 hover:bg-violet-700 text-white`
  - Commun : `rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors min-h-[44px]`
  - Focus : `focus:ring-2 focus:ring-offset-1`

### 3.3 État désactivé

Le bouton est désactivé (`disabled`) dans **2 cas** :

1. **CAISSIER sur carte Marges** (`canExport === false`) — décision PO.
2. **Tableau vide** (`data` vide/undefined) — rien à exporter.

Style désactivé :
- `bg-gray-200 text-gray-400 cursor-not-allowed`
- `disabled` natif (non focusable, non cliquable).
- **Tooltip explicatif** (`title` + `aria-label`) :
  - Cas CAISSIER : i18n `inventory.dataTable.exportDisabledCaissier` → FR « Export non autorisé pour votre profil ».
  - Cas vide : i18n `inventory.dataTable.exportDisabledEmpty` → FR « Aucune donnée à exporter ».

```
État actif (Ventes)        État désactivé
┌─────────────────────┐    ┌─────────────────────┐
│ ⬇  Exporter CSV     │    │ ⬇  Exporter CSV     │   ← gris, curseur "interdit"
└─────────────────────┘    └─────────────────────┘   tooltip au survol
   vert plein                gris clair
```

### 3.4 Nom du fichier CSV

Pattern : `evolution-{type}-{periode}-{AAAA-MM-JJ}.csv`

- `{type}` : `ventes` ou `marges`
- `{periode}` : `semaine` | `mois` | `annee`
- `{AAAA-MM-JJ}` : date du jour de l'export, en **heure locale**.

> Important pour l'agent Fullstack : générer la date via les méthodes locales (`getFullYear()`, `getMonth()`, `getDate()`), **PAS `toISOString()`** qui renvoie l'UTC et peut décaler d'un jour en soirée (fuseau Sénégal UTC+0, risque faible mais à éviter par principe).

Exemples :
- `evolution-ventes-semaine-2026-05-21.csv`
- `evolution-marges-annee-2026-05-21.csv`

### 3.5 Contenu et format du CSV

- **Encodage** : UTF-8 avec **BOM** (`﻿` en tête) → Excel FR lit correctement les accents.
- **Séparateur** : `;` (point-virgule).
- **Fin de ligne** : `\r\n` (CRLF, compatibilité Excel Windows).
- **Échappement** : tout champ contenant `;`, `"` ou un retour ligne → entouré de guillemets doubles, et les `"` internes doublés (`"` → `""`). En pratique seuls les `label` pourraient contenir un séparateur ; l'échappement reste systématique par robustesse.
- **Ligne Total incluse** en dernière ligne du CSV.
- **Valeurs** : nombres bruts (pas de séparateur de milliers, pas de « FCFA »). Marge négative → signe `-` conservé. **Pas de couleur** (le CSV est du texte).
- **CAISSIER** : le bouton étant désactivé, aucun CSV de marges masquées n'est jamais généré — pas besoin de gérer `***` dans le fichier.

**Exemple CSV — Ventes (semaine) :**
```
Période;Montant;Nb ventes
13/05;125000;8
14/05;87500;5
15/05;210000;12
16/05;45000;3
17/05;156000;9
18/05;98000;6
19/05;134000;7
Total;855500;50
```

**Exemple CSV — Marges (avec une marge négative) :**
```
Période;Marge;Nb ventes
13/05;42000;8
14/05;-15000;5
15/05;68000;12
Total;95000;25
```

> Les en-têtes du CSV sont traduits selon la locale active (mêmes clés i18n que les en-têtes du tableau, §4).

---

## 4. Microcopy & clés i18n

Namespace : **`inventory`** — sous-objet **`dataTable`** (au même niveau que `chart` et `margins`, cf. C8).

> **Règle projet** : chaque clé doit être ajoutée dans les **3 fichiers** `messages/fr.json`, `messages/en.json`, `messages/wo.json` (parité 1:1, validée par `npm run i18n:check`).

> **Réutilisation** : pour les `***` de la colonne marge masquée, **réutiliser la clé existante `inventory.margins.masked`** — ne pas créer de doublon.

| Clé i18n | FR | EN | WO |
|----------|-----|-----|-----|
| `inventory.dataTable.openButtonLabel` | Afficher les données en tableau | Show data as table | Wone donne yi ci tablo |
| `inventory.dataTable.titleVentes` | Évolution des Ventes | Sales Trend | Évolution bu njaay yi |
| `inventory.dataTable.titleMarges` | Évolution des Marges | Margin Trend | Évolution bu marge yi |
| `inventory.dataTable.periodSemaine` | Semaine | Week | Ayubés |
| `inventory.dataTable.periodMois` | Mois | Month | Weer |
| `inventory.dataTable.periodAnnee` | Année | Year | At |
| `inventory.dataTable.colPeriode` | Période | Period | Jamono |
| `inventory.dataTable.colMontant` | Montant | Amount | Xaalis |
| `inventory.dataTable.colMarge` | Marge | Margin | Marge |
| `inventory.dataTable.colNbVentes` | Nb ventes | No. of sales | Limu njaay |
| `inventory.dataTable.totalRow` | Total | Total | Mboole |
| `inventory.dataTable.exportCsv` | Exporter CSV | Export CSV | Génne CSV |
| `inventory.dataTable.empty` | Aucune donnée à afficher pour cette période | No data to display for this period | Amul donne ci jamono jii |
| `inventory.dataTable.exportDisabledCaissier` | Export non autorisé pour votre profil | Export not allowed for your profile | Génne bi terewul ci sa profil |
| `inventory.dataTable.exportDisabledEmpty` | Aucune donnée à exporter | No data to export | Amul donne bu ñu génne |

### Notes wolof (glossaire `docs/i18n-guide.md`)

- **« CSV »** : emprunt technique conservé tel quel (terme international, pas de traduction).
- **« Marge »** : emprunt FR conservé (terme comptable moderne, pas d'équivalent wolof courant — cohérent avec les emprunts « facture », « wallet »).
- **« Export / Exporter »** → `Génne` (« faire sortir ») : verbe wolof naturel et compris pour l'action d'extraction de fichier.
- **« Tablo »** : forme wolofisée francisée de « tableau », usage pragmatique conforme à l'orthographe francisée du projet.
- **« Période »** → `Jamono` ; **« Semaine »** → `Ayubés` ; **« Année »** → `At` ; **« Mois »** → `Weer` : termes wolof natifs courants.
- Ces propositions WO sont à **faire valider** par le relecteur wolof du projet avant intégration définitive.

---

## 5. Recommandations d'implémentation pour l'agent Fullstack

### 5.1 Un composant générique unique (recommandé)

**Recommandation : 1 seul composant `DataTableModal` paramétré**, pas 2 modals.

Justification : l'écart entre le cas Ventes et le cas Marges se limite à 3 dimensions — la forme des données (`montant` vs `marge`), le droit `canView`, et quelques libellés. Tout le reste (structure tableau, ligne Total, état vide, footer Export, scroll responsive) est identique. Deux composants dupliqueraient la logique de rendu et de calcul de total → dette de maintenance. Un composant unique paramétré par props est plus DRY et testable.

### 5.2 Props suggérées de `DataTableModal`

```
interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Titre métier : 'ventes' | 'marges' — sert au titre, à la couleur, au nom de fichier */
  variant: 'ventes' | 'marges';
  /** Période courante — pour le titre du modal et le nom du fichier CSV */
  periode: PeriodeType;
  /** Données du graphique. Peut être [] ou undefined (rétrocompat evolution_marges) */
  data: EvolutionVente[] | EvolutionMarge[] | undefined;
  /**
   * Visibilité de la colonne valeur (marge). Pertinent uniquement variant='marges'.
   * false → colonne marge en `***` + bouton Export désactivé.
   * Pour variant='ventes', toujours true (pas de restriction).
   */
  canView?: boolean;
}
```

> Le composant déduit en interne : la clé de valeur (`montant` ou `marge`), la couleur (emerald/violet), l'en-tête de colonne (`colMontant`/`colMarge`), et le préfixe du nom de fichier. `canExport` final = `canView !== false && data?.length > 0`.

### 5.3 Bouton-icône Table — réutilisable

Recommandation : un petit composant `ChartTableButton` (bouton-icône) acceptant une prop `color: 'emerald' | 'violet'` et `onClick`, pour éviter de dupliquer le markup du bouton dans les 2 charts. Optionnel — un simple `<button>` inline dans chaque chart est acceptable vu le faible volume de code.

### 5.4 Logique d'export CSV — util séparé

**Recommandation : créer `lib/export-csv.ts`** (util pur, découplé de tout composant).

Fonctions suggérées :
- `arrayToCsv(rows: (string|number)[][], options?)` → string CSV (gère échappement `;`/`"`/`\n`, séparateur `;`, CRLF).
- `downloadCsv(filename: string, csvContent: string)` → ajoute le BOM `﻿`, crée un `Blob` (`text/csv;charset=utf-8`), déclenche le téléchargement via un `<a download>` temporaire révoqué après clic.

Justification : un util CSV générique est réutilisable ailleurs dans FayClick (export factures, dépenses, clients…). Ne pas coupler la sérialisation CSV au modal Inventaire.

### 5.5 Gestion du cas `data` vide / undefined

Deux options, au choix de l'agent (préférence : option A) :

- **Option A (recommandée)** : afficher le bouton Table en permanence ; à l'ouverture, le modal montre l'état vide (§2.7) si `data` est vide/undefined. Plus prévisible pour l'utilisateur.
- **Option B** : masquer complètement le bouton Table si `data` est vide/undefined. Évite d'ouvrir un modal inutile, mais le bouton « clignote » selon la période sélectionnée.

### 5.6 Liste des fichiers à créer / modifier

**À créer :**

| Fichier | Rôle |
|---------|------|
| `components/inventaire/DataTableModal.tsx` | Modal générique tableau + footer Export (réutilise `Modal.tsx`) |
| `lib/export-csv.ts` | Util de sérialisation + téléchargement CSV (générique, réutilisable) |
| `components/inventaire/ChartTableButton.tsx` *(optionnel)* | Bouton-icône Table réutilisable |

**À modifier :**

| Fichier | Modification |
|---------|--------------|
| `components/inventaire/EvolutionChart.tsx` | Header `<h3>` → `justify-between` + bouton Table ; état `isOpen` ; rendu `<DataTableModal variant="ventes" />` |
| `components/inventaire/EvolutionMargesChart.tsx` | Idem + passage de la prop `canView` existante au modal (`variant="marges"`) |
| `messages/fr.json` | Ajout du sous-objet `inventory.dataTable.*` (15 clés) |
| `messages/en.json` | Idem (parité) |
| `messages/wo.json` | Idem (parité) — valeurs WO à faire valider |

**À ne PAS modifier :**
- `components/ui/Modal.tsx` — réutilisé tel quel.
- `types/inventaire.types.ts` — les types `EvolutionVente` / `EvolutionMarge` couvrent déjà le besoin.
- La page `/dashboard/commerce/inventaire` — aucun changement requis (les charts gèrent leur propre modal en interne).

### 5.7 Points de vigilance

- **`Total` côté CAISSIER** : bien masquer aussi la cellule Total de la colonne marge (`***`), pas seulement les lignes (C6).
- **Marge négative** : couleur rouge dans le tableau **uniquement** ; le CSV garde le nombre brut signé.
- **Date du nom de fichier** : méthodes locales, pas `toISOString()` (C5/§3.4).
- **i18n** : 15 nouvelles clés dans les 3 fichiers + `npm run i18n:check` doit passer.
- **Pas de fonctionnalités hors scope** : ni tri par colonne, ni filtre, ni pagination — non demandés par le PO.
- **Hors scope mais signalé** : `aria-label="Fermer"` codé en dur dans `Modal.tsx` — dette i18n existante, ne pas corriger ici.

---

## Annexe — Récapitulatif visuel du flux utilisateur

```
1. Utilisateur sur /dashboard/commerce/inventaire
        │
        ▼
2. Carte "Évolution des Ventes"  ──►  clic sur [ ▦ ] (coin sup. droit)
        │
        ▼
3. Modal s'ouvre (size=lg)
   ┌─────────────────────────────────┐
   │ Titre dynamique + croix         │
   │ Tableau : Période | Montant | Nb│
   │ Ligne Total                     │
   │ Footer : [ ⬇ Exporter CSV ]     │
   └─────────────────────────────────┘
        │
        ▼
4. clic "Exporter CSV"
        │
        ├─ canExport=true  ──►  téléchargement evolution-ventes-{periode}-{date}.csv
        │
        └─ canExport=false (CAISSIER/vide) ──► bouton grisé, tooltip explicatif
```
