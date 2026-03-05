# PRD : Dashboard Commerce - Donnees Reelles

**Date** : 2026-03-05
**Statut** : Valide
**Equipe** : dba_master + fullstack + qa_testeur

---

## 1. Contexte et Objectif

Le composant `CommerceDashboardDesktop.tsx` affiche actuellement des donnees FAKE
(FAKE_KPI, FAKE_CHART_DATA, FAKE_TOP_PRODUCTS, FAKE_INVOICES, valeurs hardcodees).

**Objectif** : Remplacer toutes les donnees fictives par des donnees reelles issues d'une
nouvelle fonction PostgreSQL `get_dashboard_commerce_complet()`, appelee uniquement par
la vue desktop/tablet. La vue mobile reste intacte avec ses fonctions existantes.

---

## 2. Contraintes

- **Ne PAS modifier** les fonctions PostgreSQL existantes (`get_dashboard`, `get_inventaire_periodique`, `get_my_factures1`, `get_list_depenses`)
- **Ne PAS modifier** la vue mobile du dashboard (`app/dashboard/commerce/page.tsx` partie mobile)
- La nouvelle fonction est appelee **uniquement** par `CommerceDashboardDesktop.tsx`
- Un seul appel reseau pour toutes les donnees du dashboard desktop
- Cache 5 minutes cote frontend (pattern existant dans `dashboard.service.ts`)

---

## 3. Nouvelle Fonction PostgreSQL

### 3.1 Signature

```sql
CREATE OR REPLACE FUNCTION get_dashboard_commerce_complet(
  pid_structure INTEGER,
  pperiode_top VARCHAR DEFAULT 'mois'  -- 'semaine' ou 'mois' pour top articles/clients
)
RETURNS JSON
```

### 3.2 Structure JSON retournee

```json
{
  "success": true,
  "structure_id": 1675,
  "timestamp_generation": "2026-03-05T14:30:00Z",

  "kpis": {
    "nb_ventes_jour": 12,
    "ca_jour": 185000,
    "nb_clients_jour": 8,
    "nb_ventes_semaine": 47,
    "ca_semaine": 1250000,
    "panier_moyen_semaine": 26595,
    "nb_clients_semaine": 23,
    "variation_ventes": 12.5,
    "variation_ca": -3.2,
    "variation_panier": 5.1,
    "variation_clients": 8.0
  },

  "graphique_semaine": [
    { "jour": "Lun", "date": "2026-03-02", "montant": 185000, "nb_ventes": 5 },
    { "jour": "Mar", "date": "2026-03-03", "montant": 240000, "nb_ventes": 7 },
    { "jour": "Mer", "date": "2026-03-04", "montant": 160000, "nb_ventes": 4 },
    { "jour": "Jeu", "date": "2026-03-05", "montant": 310000, "nb_ventes": 9 },
    { "jour": "Ven", "date": "2026-03-06", "montant": 0, "nb_ventes": 0 },
    { "jour": "Sam", "date": "2026-03-07", "montant": 0, "nb_ventes": 0 },
    { "jour": "Dim", "date": "2026-03-08", "montant": 0, "nb_ventes": 0 }
  ],

  "top_articles": [
    {
      "rang": 1,
      "id_produit": 42,
      "nom_produit": "Riz Brise Uncle Bens 5kg",
      "categorie": "ALIMENTATION",
      "quantite": 124,
      "montant": 620000
    }
  ],

  "top_clients": [
    {
      "rang": 1,
      "id_client": 15,
      "nom_client": "Mamadou Diallo",
      "tel_client": "771234567",
      "nb_factures": 8,
      "montant": 345000
    }
  ],

  "dernieres_factures": [
    {
      "id_facture": 1247,
      "num_facture": "F-1247",
      "nom_client": "Mamadou Diallo",
      "montant_total": 45000,
      "montant_paye": 45000,
      "statut": "PAYEE",
      "date_facture": "2026-03-05",
      "mode_paiement": "CASH"
    }
  ],

  "stats_globales": {
    "total_produits": 5381,
    "valeur_stock_pv": 35893422,
    "nb_ventes_mois": 156,
    "nb_clients_mois": 89,
    "ca_mois": 4750000
  },

  "depenses_mois": {
    "total": 325000,
    "variation": -8.5,
    "nb_depenses": 12
  }
}
```

### 3.3 Detail des calculs par section

#### KPIs

| Champ | Calcul |
|-------|--------|
| `nb_ventes_jour` | COUNT factures WHERE date_facture = CURRENT_DATE |
| `ca_jour` | SUM montant_total WHERE date_facture = CURRENT_DATE |
| `nb_clients_jour` | COUNT DISTINCT nom_client WHERE date_facture = CURRENT_DATE |
| `nb_ventes_semaine` | COUNT factures WHERE date_facture IN semaine courante (lundi->dimanche) |
| `ca_semaine` | SUM montant_total WHERE semaine courante |
| `panier_moyen_semaine` | ca_semaine / NULLIF(nb_ventes_semaine, 0) |
| `nb_clients_semaine` | COUNT DISTINCT nom_client WHERE semaine courante |
| `variation_ventes` | ((nb_ventes_semaine - nb_ventes_semaine_precedente) / NULLIF(nb_ventes_semaine_precedente, 0)) * 100 |
| `variation_ca` | ((ca_semaine - ca_semaine_precedente) / NULLIF(ca_semaine_precedente, 0)) * 100 |
| `variation_panier` | ((panier_moyen_semaine - panier_moyen_precedent) / NULLIF(panier_moyen_precedent, 0)) * 100 |
| `variation_clients` | ((nb_clients_semaine - nb_clients_semaine_precedente) / NULLIF(nb_clients_semaine_precedente, 0)) * 100 |

#### Graphique Semaine

- 7 entrees, une par jour de la semaine courante (lundi = jour 1)
- Pour chaque jour : SUM montant_total, COUNT factures
- Jours futurs : montant = 0, nb_ventes = 0
- Labels jours : Lun, Mar, Mer, Jeu, Ven, Sam, Dim

#### Top 5 Articles

- Periode determinee par `pperiode_top` ('semaine' ou 'mois')
- GROUP BY id_produit sur les details de factures de la periode
- ORDER BY SUM(montant_ligne) DESC LIMIT 5
- Jointure avec table produits pour nom_produit et categorie

#### Top 5 Clients

- Meme periode que top articles
- GROUP BY id_client/nom_client sur les factures de la periode
- ORDER BY SUM(montant_total) DESC LIMIT 5
- Retourner nb_factures et montant cumule

#### 10 Dernieres Factures

- ORDER BY date_facture DESC, id_facture DESC LIMIT 10
- Tous statuts confondus (PAYEE, EN ATTENTE, PARTIELLE)
- Jointure pour nom_client, montant_total, montant_paye
- statut derive : si montant_paye >= montant_total -> 'PAYEE', sinon si montant_paye > 0 -> 'PARTIELLE', sinon 'EN ATTENTE'

#### Stats Globales

| Champ | Calcul |
|-------|--------|
| `total_produits` | COUNT produits WHERE id_structure = pid_structure |
| `valeur_stock_pv` | SUM(prix_vente * niveau_stock) pour tous les produits |
| `nb_ventes_mois` | COUNT factures WHERE mois courant |
| `nb_clients_mois` | COUNT DISTINCT nom_client WHERE mois courant |
| `ca_mois` | SUM montant_total WHERE mois courant |

#### Depenses Mois

| Champ | Calcul |
|-------|--------|
| `total` | SUM montant depenses WHERE mois courant |
| `nb_depenses` | COUNT depenses WHERE mois courant |
| `variation` | ((total_mois - total_mois_precedent) / NULLIF(total_mois_precedent, 0)) * 100 |

---

## 4. Service Frontend

### 4.1 Nouvelle methode dans `dashboard.service.ts`

```typescript
async getDashboardCommerceComplet(
  structureId: number,
  periodeTop: 'semaine' | 'mois' = 'mois'
): Promise<DashboardCommerceComplet>
```

- Appel via `DatabaseService.query()` avec SQL :
  `SELECT * FROM get_dashboard_commerce_complet($1, $2)`
- Cache 5 minutes (pattern existant)
- Extraction JSON : verifier typeof string avant JSON.parse

### 4.2 Nouveau type TypeScript

Fichier : `types/dashboard.ts` (ajouter)

```typescript
interface DashboardCommerceComplet {
  success: boolean;
  structure_id: number;
  timestamp_generation: string;

  kpis: {
    nb_ventes_jour: number;
    ca_jour: number;
    nb_clients_jour: number;
    nb_ventes_semaine: number;
    ca_semaine: number;
    panier_moyen_semaine: number;
    nb_clients_semaine: number;
    variation_ventes: number;
    variation_ca: number;
    variation_panier: number;
    variation_clients: number;
  };

  graphique_semaine: Array<{
    jour: string;
    date: string;
    montant: number;
    nb_ventes: number;
  }>;

  top_articles: Array<{
    rang: number;
    id_produit: number;
    nom_produit: string;
    categorie: string;
    quantite: number;
    montant: number;
  }>;

  top_clients: Array<{
    rang: number;
    id_client: number;
    nom_client: string;
    tel_client: string;
    nb_factures: number;
    montant: number;
  }>;

  dernieres_factures: Array<{
    id_facture: number;
    num_facture: string;
    nom_client: string;
    montant_total: number;
    montant_paye: number;
    statut: 'PAYEE' | 'PARTIELLE' | 'EN ATTENTE';
    date_facture: string;
    mode_paiement: string;
  }>;

  stats_globales: {
    total_produits: number;
    valeur_stock_pv: number;
    nb_ventes_mois: number;
    nb_clients_mois: number;
    ca_mois: number;
  };

  depenses_mois: {
    total: number;
    variation: number;
    nb_depenses: number;
  };
}
```

### 4.3 Nouveau hook

Fichier : `hooks/useDashboardCommerceComplet.ts`

```typescript
function useDashboardCommerceComplet(structureId: number) {
  // Retourne { data, isLoading, error, refresh }
  // Auto-refresh toutes les 5 minutes
  // Appelle dashboardService.getDashboardCommerceComplet()
}
```

---

## 5. Composant Frontend

### 5.1 Fichier modifie : `CommerceDashboardDesktop.tsx`

**Suppressions :**
- Supprimer FAKE_KPI, FAKE_CHART_DATA, FAKE_TOP_PRODUCTS, FAKE_INVOICES
- Supprimer valeurs hardcodees "47" et "156"

**Ajouts :**
- Importer `useDashboardCommerceComplet`
- Remplacer les donnees FAKE par `data.kpis`, `data.graphique_semaine`, etc.
- Ajouter section Top 5 Clients
- Ajouter section Depenses Mois
- Etat de chargement : skeleton loaders sur chaque section
- Etat d'erreur : message retry par section

### 5.2 Props modifiees de CommerceDashboardDesktop

**Supprimer** (plus necessaires car le composant charge ses propres donnees) :
- `statsCardData`
- `loadingStats`
- `canViewProducts` (gere en interne)
- `canViewStockValue` (gere en interne)

**Conserver** :
- `user`
- `notificationCount`
- `canAccessFeature`
- `showAbonnementModal`
- `onShowCoffreModal`, `onShowLogoutModal`, `onShowNotificationsModal`, `onShowProfilModal`
- `isTablet`

### 5.3 Layout Desktop final

```
+-------------------------------------------------------+
| Top Bar : Bon retour, {nom}  | Notifs | Vente Flash   |
+-------------------------------------------------------+
| KPI 1: Nb Ventes | KPI 2: Clients | KPI 3: CA | KPI 4: Panier |
| (jour + var %)   | (jour + var %) | (sem+var%) | (sem + var %) |
+-------------------------------------------------------+
| Graphique Semaine (barres)  | Top 5 Produits          |
| Lun Mar Mer Jeu Ven Sam Dim| 1. Riz... 124 620k     |
+-------------------------------------------------------+
| Stats Globales (2x2)       | Dernieres Factures (10) |
| Produits | Stock            | Ref | Client | Mt | Stat|
| Ventes   | Clients          |                         |
+-------------------------------------------------------+
| Top 5 Clients              | Depenses du Mois        |
| 1. Mamadou... 8 fact 345k  | Total: 325k (-8.5%)    |
+-------------------------------------------------------+
```

### 5.4 Vue mobile inchangee

La page `app/dashboard/commerce/page.tsx` continue d'utiliser :
- `useDashboardData()` hook existant
- `statsCardData` depuis `get_dashboard`
- Aucune modification de la branche mobile

---

## 6. Plan d'Execution - Equipe 3 Agents

### Agent 1 : dba_master
**Role** : Creer la fonction PostgreSQL

**Taches :**
1. Analyser les tables existantes (factures, produits, clients, depenses) pour identifier les colonnes exactes
2. Ecrire `get_dashboard_commerce_complet(pid_structure, pperiode_top)`
3. Tester avec la structure 1675 (CHEZ KELEFA NT)
4. Valider que les donnees retournees correspondent au schema JSON defini
5. Verifier les performances (< 2 secondes pour 5000+ produits)

### Agent 2 : fullstack
**Role** : Integration frontend

**Taches :**
1. Ajouter le type `DashboardCommerceComplet` dans `types/dashboard.ts`
2. Ajouter la methode `getDashboardCommerceComplet()` dans `dashboard.service.ts`
3. Creer le hook `useDashboardCommerceComplet.ts`
4. Modifier `CommerceDashboardDesktop.tsx` :
   - Supprimer toutes les donnees FAKE
   - Brancher les donnees reelles via le hook
   - Ajouter skeleton loaders
   - Ajouter section Top 5 Clients
   - Ajouter section Depenses Mois
5. Adapter les props dans `app/dashboard/commerce/page.tsx` (passage desktop)
6. Verifier que la vue mobile n'est pas impactee

### Agent 3 : qa_testeur
**Role** : Validation complete

**Taches :**
1. Verifier que la fonction PostgreSQL retourne le JSON attendu
2. Tester le dashboard desktop avec donnees reelles (structure 1675)
3. Verifier chaque section : KPIs, graphique, top articles, top clients, factures, stats, depenses
4. Tester la vue mobile : confirmer aucune regression
5. Tester les cas limites : structure sans ventes, sans clients, sans depenses
6. Verifier le responsive : desktop 1920px, desktop 1280px, tablet 1024px
7. Valider les performances : temps de chargement < 3 secondes

---

## 7. Criteres d'Acceptation

- [ ] Aucune donnee FAKE dans CommerceDashboardDesktop
- [ ] KPIs affichent nb_ventes_jour, ca_jour, nb_clients_jour, panier_moyen_semaine avec variations %
- [ ] Graphique barres affiche les 7 jours de la semaine courante avec montants reels
- [ ] Top 5 Produits affiche les vrais produits les plus vendus (mois par defaut)
- [ ] Top 5 Clients affiche les meilleurs acheteurs (mois par defaut)
- [ ] 10 dernieres factures avec ref, client, montant, statut, date, mode paiement
- [ ] Stats globales : total produits, valeur stock, ventes mois, clients mois, CA mois
- [ ] Depenses mois : total, variation %, nb depenses
- [ ] Skeleton loaders pendant le chargement
- [ ] Vue mobile 100% inchangee (aucune regression)
- [ ] Performance : chargement < 3 secondes
- [ ] Cache 5 minutes sur les donnees

---

## 8. Tables PostgreSQL concernees (reference DBA)

Le DBA devra consulter ces tables pour construire la fonction :

| Table | Usage |
|-------|-------|
| `factures` | Ventes, CA, clients, statuts |
| `detail_factures` | Top articles (quantite, montant par produit) |
| `produits` | Nom, categorie, prix_vente, niveau_stock |
| `clients` | Nom, telephone |
| `depenses` | Montant, date, type |
| `acomptes` / `recus_paiements` | Montant paye, mode paiement |

> Note : les noms exacts des colonnes seront confirmes par le DBA lors de l'exploration du schema.

---

## 9. Fichiers impactes

| Fichier | Action |
|---------|--------|
| **PostgreSQL** : nouvelle fonction | CREER `get_dashboard_commerce_complet` |
| `types/dashboard.ts` | AJOUTER interface `DashboardCommerceComplet` |
| `services/dashboard.service.ts` | AJOUTER methode `getDashboardCommerceComplet()` |
| `hooks/useDashboardCommerceComplet.ts` | CREER nouveau hook |
| `components/dashboard/CommerceDashboardDesktop.tsx` | MODIFIER (supprimer FAKE, brancher reel) |
| `app/dashboard/commerce/page.tsx` | MODIFIER props desktop (simplifier) |

---

## 10. Risques et Mitigations

| Risque | Mitigation |
|--------|-----------|
| Fonction PostgreSQL lente (5000+ produits) | Index sur id_structure + date_facture, LIMIT sur sous-requetes |
| Noms de colonnes differents dans la BD | DBA explore le schema reel avant de coder |
| Regression vue mobile | QA teste specifiquement mobile avant/apres |
| Donnees vides (nouvelle structure) | Valeurs par defaut 0 dans la fonction, UI affiche "Aucune donnee" |
