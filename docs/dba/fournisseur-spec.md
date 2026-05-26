# Spécification DBA — Module Fournisseurs v1.0

**Référence** : DBA-SPEC-2026-05-25-FOURNISSEURS  
**Version** : v1.0  
**Date** : 2026-05-25  
**DBA** : dba_master  
**Base cible** : fayclick_db (154.12.224.173:3253)  
**PRD source** : `docs/prd-bons-commande-fournisseurs-2026-05-25.md` — EPIC 1 (FR-001 à FR-005)  
**Branche** : `feature/bons-commande-fournisseurs`  

**SHA-256 DDL** (`fournisseur-schema.sql`) :  
`cbf26bda36009f79b7ab83720335cbf7aae6681f084d931e20ed200d11aa7a52`

---

## 1. Description Métier

### Contexte (FR-001)

La table `fournisseur` est la **première entité fournisseur dans FayClick**. Jusqu'ici, aucune structure n'avait de répertoire de fournisseurs en base (confirmé par audit Grep : aucun fichier SQL fournisseur en production à ce jour).

Ce module constitue le **prérequis absolu de l'EPIC 2** (Bons de Commande) : la table `bon_commande` porte une FK `id_fournisseur → fournisseur.id_fournisseur`. Sans la table fournisseur, l'EPIC 2 est impossible à déployer.

### Exigences couvertes

| Réf | Intitulé | Statut |
|---|---|---|
| FR-001 | Table `fournisseur` avec FK, index, contrainte UNIQUE | Couvert |
| FR-001 | Table `etat_bon_commande` seedée 4 valeurs | Couvert (préparation EPIC 2) |
| FR-002 | Fonction `create_fournisseur` | Couvert |
| FR-003 | Fonction `edit_fournisseur` | Couvert |
| FR-004 | Fonction `delete_fournisseur` (soft delete) | Couvert |
| FR-005 | Fonction `get_list_fournisseurs` | Couvert |
| FR-006 | Service frontend `fournisseur.service.ts` | Hors scope DBA (kader_backend) |
| FR-007 | Composant `ModalGestionFournisseurs` | Hors scope DBA (fullstack) |

---

## 2. Schéma de la Table

### 2.1 `etat_bon_commande`

Table de référence immuable (lookup table). Créée en Phase 1 pour éviter une migration EPIC 2 bloquante.

| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| `id_etat` | INTEGER | NOT NULL | — | PK fixe. 1=BROUILLON, 2=CONFIRME, 3=LIVRE, 4=ANNULE. Ne jamais renuméroter. |
| `libelle` | VARCHAR(30) | NOT NULL | — | Libellé UNIQUE affiché dans l'UI et les JSONs PG. |
| `couleur` | VARCHAR(20) | NULL | — | Code couleur Tailwind (slate/blue/emerald/red) pour les badges statut. |

**Seed :**
```
(1, 'BROUILLON', 'slate')
(2, 'CONFIRME',  'blue')
(3, 'LIVRE',     'emerald')
(4, 'ANNULE',    'red')
```

### 2.2 `fournisseur`

| Colonne | Type | Null | Défaut | Description |
|---|---|---|---|---|
| `id_fournisseur` | SERIAL | NOT NULL | auto | PK. Référencée en FK par `bon_commande.id_fournisseur` (EPIC 2). |
| `id_structure` | INTEGER | NOT NULL | — | FK → `structures.id_structure`. Clé de sécurité : toutes les fonctions vérifient cette colonne. |
| `nom_fournisseur` | VARCHAR(200) | NOT NULL | — | Nom commercial. UNIQUE sur `(id_structure, nom_fournisseur)`. |
| `tel_fournisseur` | VARCHAR(20) | NULL | — | Téléphone. Format libre. Dénormalisé en snapshot dans `bon_commande`. |
| `email_fournisseur` | VARCHAR(150) | NULL | — | Email. Validation format côté service frontend uniquement. |
| `adresse` | TEXT | NULL | — | Adresse physique. Affiché sur BC imprimé. |
| `ninea` | VARCHAR(50) | NULL | — | Numéro NINEA/RC sénégalais. Affiché sur BC imprimé. |
| `notes` | TEXT | NULL | — | Notes internes. Non imprimé sur BC. |
| `actif` | BOOLEAN | NOT NULL | TRUE | Soft delete : FALSE = masqué des listes, conservé pour historique BC. |
| `date_creation` | TIMESTAMP | NOT NULL | NOW() | Auto. Non modifiable. |
| `date_modification` | TIMESTAMP | NULL | — | Mis à jour par `edit_fournisseur()`. NULL à la création. |

**Contraintes :**
- `PRIMARY KEY (id_fournisseur)`
- `FOREIGN KEY (id_structure) REFERENCES structures(id_structure) ON DELETE RESTRICT`
- `CONSTRAINT uq_fournisseur_struct_nom UNIQUE (id_structure, nom_fournisseur)`

### 2.3 Index et justifications

| Index | Type | Colonnes | Filtre | Justification |
|---|---|---|---|---|
| `idx_fournisseur_structure` | B-Tree PARTIEL | `(id_structure)` | `WHERE actif = TRUE` | Requête dominante : `WHERE id_structure = ? AND actif = TRUE`. Index partiel exclut les désactivés → taille réduite, scan plus rapide. |
| `idx_fournisseur_nom_lower` | B-Tree | `(id_structure, LOWER(nom_fournisseur))` | — | Recherche insensible à la casse. Pattern établi : correctif login 26/04/2026 a prouvé qu'un index fonctionnel sur LOWER() divise le temps de 27s à 18ms. Index NON partiel pour couvrir d'éventuelles recherches historiques incluant désactivés. |

### 2.4 Divergences brief vs PRD — décisions d'arbitrage

| Point | Brief mission | PRD officiel | Décision |
|---|---|---|---|
| Nom table FK | `list_structures` | `structures` | `structures` — PRD + audit DBA_SPEC_RESEAU font référence |
| Colonne `notes` | Absente | Présente (FR-001/FR-002) | Incluse — PRD est la source validée PO |
| `nb_bons_commandes` dans get_list | Calculé (jointure BC) | Calculé (jointure BC) | Retourné à `0` en Phase 1 — table `bon_commande` inexistante ; TODO Phase 2 |
| Blocage delete si BC actif | Demandé | Demandé | TODO Phase 2 — commentaire SQL explicite dans la fonction |
| `etat_bon_commande` | Non mentionné Phase 1 | EPIC 1 FR-001 | Inclus en Phase 1 pour préparer EPIC 2 sans migration supplémentaire |

---

## 3. Fonctions PL/pgSQL Exposées

### Contrat d'interface v1.0 — signé DBA

Toute modification de signature = **breaking change** → coordonner avec kader_backend avant déploiement.

---

### 3.1 `create_fournisseur`

**Signature complète :**
```sql
create_fournisseur(
  p_id_structure       INTEGER,
  p_nom_fournisseur    VARCHAR,
  p_tel_fournisseur    VARCHAR  DEFAULT NULL,
  p_email_fournisseur  VARCHAR  DEFAULT NULL,
  p_adresse            TEXT     DEFAULT NULL,
  p_ninea              VARCHAR  DEFAULT NULL,
  p_notes              TEXT     DEFAULT NULL
) RETURNS JSON
```

**Comportement :**
1. TRIM + validation `p_nom_fournisseur` non vide.
2. Vérification unicité `(id_structure, LOWER(nom))` — couvre aussi les fournisseurs désactivés.
3. INSERT avec NULLIF(TRIM(...), '') sur les champs optionnels.
4. Exception `unique_violation` catchée (filet race condition).

**Retour succès :**
```json
{ "success": true, "id_fournisseur": 42, "message": "Fournisseur créé avec succès" }
```

**Retour erreur :**
```json
{ "success": false, "id_fournisseur": null, "message": "Fournisseur déjà existant pour cette structure" }
```

**Exemple d'appel :**
```sql
SELECT create_fournisseur(
  218,
  'DIALLO IMPORT',
  '771234567',
  'diallo@import.sn',
  'Marché Sandaga, Dakar',
  'SN-DAK-2024-B-12345',
  'Délai livraison 48h'
);
```

---

### 3.2 `edit_fournisseur`

**Signature complète :**
```sql
edit_fournisseur(
  p_id_fournisseur     INTEGER,
  p_id_structure       INTEGER,
  p_nom_fournisseur    VARCHAR  DEFAULT NULL,
  p_tel_fournisseur    VARCHAR  DEFAULT NULL,
  p_email_fournisseur  VARCHAR  DEFAULT NULL,
  p_adresse            TEXT     DEFAULT NULL,
  p_ninea              VARCHAR  DEFAULT NULL,
  p_notes              TEXT     DEFAULT NULL
) RETURNS JSON
```

**Comportement :**
1. Vérification sécurité : `(id_fournisseur, id_structure)` existe.
2. Si `p_nom_fournisseur` fourni : TRIM + validation vide + vérification unicité (hors lui-même).
3. UPDATE avec `COALESCE(valeur_proposée, valeur_existante)` sur chaque champ.
4. `date_modification = NOW()` systématique.

**Sémantique COALESCE :**
- Passer `NULL` → champ conservé inchangé.
- Passer une chaîne vide `''` → champ vidé (NULLIF retourne NULL).
- Passer une valeur → champ mis à jour.

**Retour succès :**
```json
{ "success": true, "message": "Fournisseur modifié avec succès" }
```

**Retour erreur :**
```json
{ "success": false, "message": "Fournisseur introuvable ou accès refusé" }
```

**Exemple — modification partielle (téléphone uniquement) :**
```sql
SELECT edit_fournisseur(42, 218, NULL, '778765432', NULL, NULL, NULL, NULL);
```

---

### 3.3 `delete_fournisseur`

**Signature complète :**
```sql
delete_fournisseur(
  p_id_fournisseur  INTEGER,
  p_id_structure    INTEGER
) RETURNS JSON
```

**Comportement :**
1. Vérification sécurité `(id_fournisseur, id_structure)`.
2. UPDATE `actif = FALSE, date_modification = NOW()`.
3. **TODO Phase 2** : Ajouter blocage si BC non ANNULE référence ce fournisseur (voir commentaire SQL dans la fonction).

**Retour succès :**
```json
{ "success": true, "message": "Fournisseur désactivé avec succès (historique BC préservé)" }
```

**Retour erreur :**
```json
{ "success": false, "message": "Fournisseur introuvable ou accès refusé" }
```

**Exemple :**
```sql
SELECT delete_fournisseur(42, 218);
```

---

### 3.4 `get_list_fournisseurs`

**Signature complète :**
```sql
get_list_fournisseurs(
  p_id_structure  INTEGER
) RETURNS JSON
```

**Comportement :**
1. SELECT sur `fournisseur WHERE id_structure = ? AND actif = TRUE`.
2. Tri par `nom_fournisseur ASC`.
3. `nb_bons_commandes = 0` en Phase 1 (TODO Phase 2 : jointure agrégée sur `bon_commande`).
4. Retourne `'[]'::JSON` si aucun fournisseur actif (pas d'erreur).

**Retour :**
```json
{
  "success": true,
  "fournisseurs": [
    {
      "id_fournisseur": 42,
      "nom_fournisseur": "DIALLO IMPORT",
      "tel_fournisseur": "771234567",
      "email_fournisseur": "diallo@import.sn",
      "adresse": "Marché Sandaga, Dakar",
      "ninea": "SN-DAK-2024-B-12345",
      "notes": "Délai livraison 48h",
      "nb_bons_commandes": 0,
      "date_creation": "2026-05-25T14:30:00"
    }
  ],
  "resume": {
    "total_fournisseurs": 1
  }
}
```

**Exemple :**
```sql
SELECT get_list_fournisseurs(218);
```

---

## 4. Stratégie d'Indexation

### Pourquoi `LOWER(nom_fournisseur)` ?

Pattern validé en production lors du correctif login du 26/04/2026 :
- Un Seq Scan sur LOWER(username) sur 1718 lignes causait un login à 27-30s.
- Après `CREATE INDEX idx_utilisateur_username_lower ON utilisateur(LOWER(username::text))`, temps réduit à 18ms côté DB.

Le même pattern s'applique ici : `get_list_fournisseurs` compare via `LOWER(nom_fournisseur)`, et la vérification de doublon dans `create_fournisseur`/`edit_fournisseur` effectue `WHERE LOWER(nom_fournisseur) = LOWER(?)`. Sans index fonctionnel, PostgreSQL force un Seq Scan sur chaque appel.

### Pourquoi index partiel `WHERE actif = TRUE` ?

L'index `idx_fournisseur_structure` ne couvre que les fournisseurs actifs : c'est le cas d'usage de 99% des requêtes (liste, CRUD). Les fournisseurs désactivés (soft delete) sont exclus de cet index, réduisant sa taille et accélérant les scans. La contrepartie est qu'une requête `WHERE actif = FALSE` ne peut pas utiliser cet index — acceptable puisque ce cas est rare (admin seul).

### Absence de FK strict `bon_commande.id_fournisseur`

Le soft delete sur `fournisseur` (`actif=FALSE`) **ne bloque pas** la FK de `bon_commande`. Un BC peut référencer un fournisseur désactivé — c'est voulu : l'historique des commandes doit rester consultable même après désactivation du fournisseur. La FK sera `ON DELETE RESTRICT` (défaut) en EPIC 2 pour empêcher la suppression physique accidentelle.

---

## 5. Handoff vers kader_backend

### Liste signée des fonctions disponibles après déploiement Phase 1

| Fonction | Signature | Retour |
|---|---|---|
| `create_fournisseur` | `(INTEGER, VARCHAR, VARCHAR?, VARCHAR?, TEXT?, VARCHAR?, TEXT?)` | `JSON {success, id_fournisseur, message}` |
| `edit_fournisseur` | `(INTEGER, INTEGER, VARCHAR?, VARCHAR?, VARCHAR?, TEXT?, VARCHAR?, TEXT?)` | `JSON {success, message}` |
| `delete_fournisseur` | `(INTEGER, INTEGER)` | `JSON {success, message}` |
| `get_list_fournisseurs` | `(INTEGER)` | `JSON {success, fournisseurs[], resume}` |

### Appel via DatabaseService (côté service TypeScript)

```typescript
// Pattern OBLIGATOIRE (import direct = instance singleton)
import DatabaseService from './database.service';

// create_fournisseur
const raw = await DatabaseService.executeFunction('create_fournisseur', [
  idStructure,
  nomFournisseur,
  telFournisseur ?? null,
  emailFournisseur ?? null,
  adresse ?? null,
  ninea ?? null,
  notes ?? null
]);
const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
// result: { success: boolean, id_fournisseur: number | null, message: string }

// get_list_fournisseurs
const raw = await DatabaseService.executeFunction('get_list_fournisseurs', [idStructure]);
const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
// result: { success: boolean, fournisseurs: Fournisseur[], resume: { total_fournisseurs: number } }
```

### Types TypeScript attendus (FR-006)

```typescript
// types/fournisseur.ts
export interface Fournisseur {
  id_fournisseur:    number;
  id_structure:      number;
  nom_fournisseur:   string;
  tel_fournisseur:   string | null;
  email_fournisseur: string | null;
  adresse:           string | null;
  ninea:             string | null;
  notes:             string | null;
  nb_bons_commandes: number;       // 0 en Phase 1, valeur réelle Phase 2
  date_creation:     string;       // ISO 8601 : "2026-05-25T14:30:00"
}

export interface CreateFournisseurInput {
  nom_fournisseur:   string;
  tel_fournisseur?:  string;
  email_fournisseur?: string;
  adresse?:          string;
  ninea?:            string;
  notes?:            string;
}

export interface CreateFournisseurResponse {
  success:          boolean;
  id_fournisseur?:  number;
  message:          string;
}

export interface FournisseurListResponse {
  success:     boolean;
  fournisseurs: Fournisseur[];
  resume:      { total_fournisseurs: number };
}
```

---

## 6. Migration Script (UP / DOWN)

### UP (déploiement)

```sql
-- Ordre d'exécution :
-- 1. fournisseur-schema.sql   (tables + index)
-- 2. fournisseur-functions.sql (4 fonctions)
\i docs/dba/fournisseur-schema.sql
\i docs/dba/fournisseur-functions.sql
```

Via Node.js (méthode fallback) :
```bash
cd /c/tmp/pgquery && node -e "
const { Client } = require('pg');
const fs = require('fs');
const client = new Client({
  host: '154.12.224.173', port: 3253,
  user: 'admin_icelab', password: '*IceL@b2022*',
  database: 'fayclick_db'
});
client.connect().then(async () => {
  await client.query(fs.readFileSync('docs/dba/fournisseur-schema.sql', 'utf8'));
  await client.query(fs.readFileSync('docs/dba/fournisseur-functions.sql', 'utf8'));
  console.log('Migration UP OK');
  client.end();
}).catch(err => { console.error(err.message); client.end(); });
"
```

### DOWN (rollback)

```sql
-- Attention : DROP TABLE fournisseur CASCADE supprimera aussi les BC (EPIC 2)
-- si déjà déployé. En Phase 1 seule, rollback sans risque.

-- Fonctions
DROP FUNCTION IF EXISTS get_list_fournisseurs(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS delete_fournisseur(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS edit_fournisseur(INTEGER, INTEGER, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_fournisseur(INTEGER, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT) CASCADE;

-- Tables (ordre : dépendances d'abord)
-- NE PAS EXÉCUTER si EPIC 2 déjà déployé (bon_commande référence fournisseur et etat_bon_commande)
DROP TABLE IF EXISTS fournisseur CASCADE;
DROP TABLE IF EXISTS etat_bon_commande CASCADE;
```

---

## 7. Tests SQL d'Acceptation

Les 10 cas couvrant les critères d'acceptance des FR-001 à FR-005.

```sql
-- ===================================================================
-- Pré-requis : utiliser une structure de test (ex: id_structure = 999)
-- Remplacer par un id_structure réel existant en fayclick_db
-- ===================================================================

-- CAS 1 : Création réussie
SELECT create_fournisseur(218, 'TEST FOURNISSEUR SA', '771234567', 'test@fournisseur.sn', 'Dakar', 'SN-1234', 'Notes test');
-- Attendu : { success: true, id_fournisseur: <n>, message: "Fournisseur créé avec succès" }

-- CAS 2 : Doublon — même nom même structure
SELECT create_fournisseur(218, 'TEST FOURNISSEUR SA');
-- Attendu : { success: false, id_fournisseur: null, message: "Fournisseur déjà existant pour cette structure" }

-- CAS 3 : Doublon insensible à la casse
SELECT create_fournisseur(218, 'test fournisseur sa');
-- Attendu : { success: false, ... } -- LOWER() doit matcher

-- CAS 4 : Nom vide → refus
SELECT create_fournisseur(218, '');
SELECT create_fournisseur(218, '   ');
-- Attendu : { success: false, message: "Le nom du fournisseur est obligatoire" }

-- CAS 5 : Edit partiel — téléphone uniquement (COALESCE)
-- Récupérer l'id du CAS 1
SELECT create_fournisseur(218, 'FOURNISSEUR EDIT TEST', '771000000');
-- Puis éditer uniquement le téléphone :
SELECT edit_fournisseur(<id_du_cas_5>, 218, NULL, '778999999', NULL, NULL, NULL, NULL);
-- Attendu : { success: true, message: "Fournisseur modifié avec succès" }
-- Vérifier que nom/email/adresse/ninea sont inchangés :
SELECT nom_fournisseur, tel_fournisseur, email_fournisseur FROM fournisseur WHERE id_fournisseur = <id>;

-- CAS 6 : Accès cross-structure refusé (edit)
SELECT edit_fournisseur(<id_structure_218>, 999, NULL, '778000000');
-- Attendu : { success: false, message: "Fournisseur introuvable ou accès refusé" }

-- CAS 7 : Soft delete — fournisseur disparaît de la liste
SELECT delete_fournisseur(<id_du_cas_5>, 218);
-- Attendu : { success: true, message: "Fournisseur désactivé avec succès (historique BC préservé)" }
-- Vérifier disparition de la liste :
SELECT * FROM get_list_fournisseurs(218);
-- Attendu : fournisseur absent du tableau fournisseurs[]

-- CAS 8 : Liste filtre actif=TRUE
-- Créer 2 fournisseurs, en désactiver 1, vérifier que la liste n'en retourne qu'1
SELECT create_fournisseur(218, 'ACTIF FOURNISSEUR');
SELECT create_fournisseur(218, 'INACTIF FOURNISSEUR');
SELECT delete_fournisseur(<id_inactif>, 218);
SELECT get_list_fournisseurs(218);
-- Attendu : "INACTIF FOURNISSEUR" absent, resume.total_fournisseurs compte les actifs seulement

-- CAS 9 : Doublon via rename — refus si le nouveau nom existe déjà
SELECT create_fournisseur(218, 'FOURNISSEUR A RENOMMER');
SELECT create_fournisseur(218, 'NOM CIBLE EXISTANT');
SELECT edit_fournisseur(<id_a_renommer>, 218, 'NOM CIBLE EXISTANT');
-- Attendu : { success: false, message: "Un autre fournisseur porte déjà ce nom dans votre structure" }

-- CAS 10 : Accès cross-structure refusé (delete)
SELECT delete_fournisseur(<id_structure_218>, 9999);
-- Attendu : { success: false, message: "Fournisseur introuvable ou accès refusé" }

-- Nettoyage après tests
-- UPDATE fournisseur SET actif=FALSE WHERE id_structure=218 AND nom_fournisseur LIKE 'TEST%';
-- UPDATE fournisseur SET actif=FALSE WHERE id_structure=218 AND nom_fournisseur LIKE 'ACTIF%';
-- UPDATE fournisseur SET actif=FALSE WHERE id_structure=218 AND nom_fournisseur LIKE 'FOURNISSEUR%';
-- UPDATE fournisseur SET actif=FALSE WHERE id_structure=218 AND nom_fournisseur LIKE 'NOM CIBLE%';
```

---

## 8. Points d'attention pour l'EPIC 2

### 8.1 FK `bon_commande.id_fournisseur`

Lors du déploiement EPIC 2 :

```sql
-- FK recommandée dans bon_commande :
FOREIGN KEY (id_fournisseur) REFERENCES fournisseur(id_fournisseur)
  ON DELETE RESTRICT   -- Empêche suppression physique d'un fournisseur référencé
  -- Note : le soft delete (actif=FALSE) contourne naturellement cette contrainte
  --        car il ne supprime pas la ligne, il la désactive.
```

**Comportement voulu :**
- Fournisseur désactivé (`actif=FALSE`) → FK sur BC toujours valide → historique consultable.
- Suppression physique accidentelle → bloquée par `ON DELETE RESTRICT` → sécurité.

### 8.2 Mise à jour des fonctions en Phase 2

Les deux fonctions suivantes devront être **remplacées (CREATE OR REPLACE)** lors du déploiement EPIC 2 :

1. **`get_list_fournisseurs`** : remplacer `'nb_bons_commandes', 0` par :
   ```sql
   'nb_bons_commandes',
   (SELECT COUNT(*) FROM bon_commande bc WHERE bc.id_fournisseur = f.id_fournisseur)
   ```

2. **`delete_fournisseur`** : activer le bloc TODO Phase 2 qui vérifie l'absence de BC actif (id_etat != 4) avant le soft delete.

### 8.3 Snapshot dénormalisé dans `bon_commande`

Les colonnes `nom_fournisseur` et `tel_fournisseur` dans la table `bon_commande` sont des **snapshots** capturés à la création du BC. Cela garantit la résilience : même si le fournisseur est édité ou désactivé ultérieurement, le BC affiche les informations du moment de la commande.

---

## 9. Notes Opérationnelles

### Stratégie de backup

Avant tout déploiement en production :
```bash
pg_dump -h 154.12.224.173 -p 3253 -U admin_icelab fayclick_db \
  --schema-only -t fournisseur -t etat_bon_commande \
  -f backup-pre-fournisseurs-$(date +%Y%m%d).sql
```

### Règles de maintenance (VACUUM / REINDEX)

- La table `fournisseur` est une **table de référence à faible volumétrie** (quelques dizaines à centaines de lignes par structure). Le VACUUM automatique PostgreSQL est suffisant.
- L'index partiel `idx_fournisseur_structure` n'a pas besoin de REINDEX périodique en V1.
- L'index fonctionnel `idx_fournisseur_nom_lower` : si VACUUM ANALYZE signale un bloat > 30%, REINDEX CONCURRENTLY.

### Pièges à éviter

1. Ne jamais passer `p_id_structure` d'une autre structure que celle de l'utilisateur authentifié — la sécurité est entièrement dans les fonctions PG, pas en BD.
2. Ne pas oublier de passer `id_structure` dans `edit_fournisseur` et `delete_fournisseur` — sans lui, la vérification sécurité retourne faux négatif.
3. La contrainte UNIQUE `(id_structure, nom_fournisseur)` est sensible à la casse en BD mais les fonctions normalisent via `LOWER()`. Ne pas tenter de créer deux fournisseurs "Diallo" et "diallo" — la fonction les considère comme doublons mais la contrainte BD les accepterait si LOWER() n'est pas utilisé dans l'INSERT.

### Évolutions prévues

- **Phase 2** : Mise à jour `get_list_fournisseurs` (compteur BC réel) + `delete_fournisseur` (blocage BC actif).
- **V2** : Page dédiée gestion fournisseurs dans Settings (actuellement uniquement accessible depuis modal création BC).
- **V2** : Statistiques fournisseurs (montant total commandé, délai moyen, top fournisseurs).
