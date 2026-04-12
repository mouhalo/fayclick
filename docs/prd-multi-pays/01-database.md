# 01 — PRD Base de Données : Multi-Pays CEDEAO

> Version : 1.0 — 2026-04-12
> Auteur : DBA Expert (agent dba_master)
> Branche cible : feature/multi-pays-cedeao
> Base de référence : alakantine_db (PostgreSQL 154.12.224.173:3253)

---

## Table des matières

1. [DDL Table `pays`](#1-ddl-table-pays)
2. [Migration table `structures`](#2-migration-table-structures)
3. [Nouvelle fonction `add_edit_inscription_v2`](#3-nouvelle-fonction-add_edit_inscription_v2)
4. [Autres fonctions PostgreSQL à réviser](#4-autres-fonctions-postgresql-à-réviser)
5. [Plan d'exécution de la migration](#5-plan-dexécution-de-la-migration)

---

## 1. DDL Table `pays`

### 1.1 Décisions de conception

- `code_iso` CHAR(2) est la clé primaire naturelle (ISO 3166-1 alpha-2). Valeur stable, universellement reconnue, plus lisible qu'un entier séquentiel pour les FK.
- `devise_code` suit la norme ISO 4217 (3 caractères).
- `sms_supporte` vaut `true` uniquement pour `SN` au MVP. La règle OTP e-mail pour les autres pays est gérée côté application, mais ce flag permet de la piloter en base sans déploiement code.
- `ordre_affichage` permet de placer SN en tête et de trier les autres selon la priorité commerciale.
- `emoji_drapeau` est inclus : valeur purement utilitaire pour les dropdowns UI, sans impact fonctionnel.

### 1.2 CREATE TABLE

```sql
-- ============================================================
-- TABLE : pays
-- Référentiel des pays supportés par FayClick
-- ============================================================
CREATE TABLE IF NOT EXISTS pays (
    code_iso          CHAR(2)      NOT NULL,
    nom_fr            VARCHAR(100) NOT NULL,
    indicatif_tel     VARCHAR(6)   NOT NULL,   -- ex: '+221', '+225'
    devise_code       CHAR(3)      NOT NULL,   -- ISO 4217 : XOF, MAD, GNF
    devise_symbole    VARCHAR(10)  NOT NULL,   -- ex: 'FCFA', 'MAD', 'GNF'
    actif             BOOLEAN      NOT NULL DEFAULT TRUE,
    sms_supporte      BOOLEAN      NOT NULL DEFAULT FALSE,
    ordre_affichage   INT          NOT NULL DEFAULT 99,
    emoji_drapeau     VARCHAR(10)  NULL,

    CONSTRAINT pk_pays PRIMARY KEY (code_iso),
    CONSTRAINT chk_pays_code_iso    CHECK (code_iso    = UPPER(code_iso)),
    CONSTRAINT chk_pays_devise_code CHECK (devise_code = UPPER(devise_code))
);

COMMENT ON TABLE pays IS 'Référentiel des pays supportés au lancement multi-pays CEDEAO';
COMMENT ON COLUMN pays.sms_supporte   IS 'true = OTP via SMS ; false = OTP via email @gmail.com';
COMMENT ON COLUMN pays.indicatif_tel  IS 'Format E.164 sans le +, ex: 221 (non 0221 ni +221). Stocker sans + pour faciliter la concaténation.';
```

> **Note indicatif_tel** : on stocke le suffixe numérique seul (`221`, `225`...) sans le `+`, ce qui simplifie la concaténation côté application (`'+' || indicatif_tel || telephone`). La colonne existante `indicatif_pays` de `structures` était au format `'+221'` (avec le `+`) — cette incohérence est corrigée lors de la migration (section 2).

### 1.3 INSERT des 17 pays

```sql
-- ============================================================
-- DONNÉES : 17 pays du MVP
-- Zone UEMOA/CEDEAO + Maghreb
-- ============================================================
INSERT INTO pays
    (code_iso, nom_fr,                   indicatif_tel, devise_code, devise_symbole, actif,  sms_supporte, ordre_affichage, emoji_drapeau)
VALUES
-- ---- Sénégal (défaut, SMS actif) ----
    ('SN', 'Sénégal',                    '221',  'XOF', 'FCFA', TRUE,  TRUE,  1,  '🇸🇳'),

-- ---- UEMOA (FCFA, pas de SMS au MVP) ----
    ('CI', 'Côte d''Ivoire',             '225',  'XOF', 'FCFA', TRUE,  FALSE, 2,  '🇨🇮'),
    ('ML', 'Mali',                       '223',  'XOF', 'FCFA', TRUE,  FALSE, 3,  '🇲🇱'),
    ('BF', 'Burkina Faso',               '226',  'XOF', 'FCFA', TRUE,  FALSE, 4,  '🇧🇫'),
    ('TG', 'Togo',                       '228',  'XOF', 'FCFA', TRUE,  FALSE, 5,  '🇹🇬'),
    ('BJ', 'Bénin',                      '229',  'XOF', 'FCFA', TRUE,  FALSE, 6,  '🇧🇯'),
    ('NE', 'Niger',                      '227',  'XOF', 'FCFA', TRUE,  FALSE, 7,  '🇳🇪'),
    ('GW', 'Guinée-Bissau',              '245',  'XOF', 'FCFA', TRUE,  FALSE, 8,  '🇬🇼'),

-- ---- CEDEAO hors UEMOA (devises propres) ----
    ('GN', 'Guinée Conakry',             '224',  'GNF', 'GNF',  TRUE,  FALSE, 9,  '🇬🇳'),
    ('SL', 'Sierra Leone',               '232',  'SLL', 'SLL',  TRUE,  FALSE, 10, '🇸🇱'),
    ('LR', 'Liberia',                    '231',  'LRD', 'LRD',  TRUE,  FALSE, 11, '🇱🇷'),
    ('GH', 'Ghana',                      '233',  'GHS', 'GHS',  TRUE,  FALSE, 12, '🇬🇭'),
    ('NG', 'Nigeria',                    '234',  'NGN', 'NGN',  TRUE,  FALSE, 13, '🇳🇬'),
    ('CV', 'Cap-Vert',                   '238',  'CVE', 'CVE',  TRUE,  FALSE, 14, '🇨🇻'),

-- ---- Maghreb ----
    ('MA', 'Maroc',                      '212',  'MAD', 'MAD',  TRUE,  FALSE, 15, '🇲🇦'),
    ('DZ', 'Algérie',                    '213',  'DZD', 'DZD',  TRUE,  FALSE, 16, '🇩🇿'),
    ('TN', 'Tunisie',                    '216',  'TND', 'TND',  TRUE,  FALSE, 17, '🇹🇳')

ON CONFLICT (code_iso) DO NOTHING;
```

> **SLL** (Sierra Leone Leone) et **LRD** (Liberian Dollar) sont les codes ISO 4217 officiels. Au MVP le calcul financier reste en XOF pour la zone UEMOA ; pour les autres devises le frontend affiche la devise locale mais les montants sont des entiers sans conversion (pas de taux de change en DB au MVP).

---

## 2. Migration table `structures`

### 2.1 Situation actuelle

| Colonne existante | Type actuel | Valeur actuelle | Problème |
|---|---|---|---|
| `indicatif_pays` | VARCHAR (longueur ?) | `'+221'` ou vide | Format avec `+`, pas de FK, non utilisé côté code |
| `email` | VARCHAR | nullable/vide | Doit devenir obligatoire pour les pays ≠ SN |

### 2.2 Script de migration FORWARD

```sql
-- ============================================================
-- MIGRATION FORWARD : structures → multi-pays
-- Pré-requis : table pays doit exister et être peuplée
-- ============================================================

BEGIN;

-- Étape 1 : Ajouter la nouvelle colonne code_iso_pays
ALTER TABLE structures
    ADD COLUMN IF NOT EXISTS code_iso_pays CHAR(2) NOT NULL DEFAULT 'SN';

COMMENT ON COLUMN structures.code_iso_pays IS
    'Code ISO 3166-1 alpha-2 du pays de la structure. FK vers pays(code_iso).';

-- Étape 2 : Migrer les données existantes
-- Toutes les structures existantes sont sénégalaises par défaut
UPDATE structures
SET code_iso_pays = 'SN'
WHERE code_iso_pays IS NULL
   OR code_iso_pays = '';

-- Étape 3 : Ajouter la contrainte FK
ALTER TABLE structures
    ADD CONSTRAINT fk_structures_pays
        FOREIGN KEY (code_iso_pays)
        REFERENCES pays (code_iso)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

-- Étape 4 : Créer un index sur code_iso_pays (utile pour filtres admin par pays)
CREATE INDEX IF NOT EXISTS idx_structures_code_iso_pays
    ON structures (code_iso_pays);

-- Étape 5 : Contrainte CHECK email obligatoire pour pays ≠ SN
-- Une structure non-sénégalaise DOIT avoir un email Gmail valide
-- (Cette contrainte s'appliquera aux nouvelles inscriptions et aux UPDATE)
ALTER TABLE structures
    ADD CONSTRAINT chk_structures_email_pays_non_sn
        CHECK (
            code_iso_pays = 'SN'
            OR (
                email IS NOT NULL
                AND email <> ''
                AND email LIKE '%@gmail.com'
            )
        );

-- Étape 6 : Supprimer l'ancienne colonne indicatif_pays
-- ATTENTION : s'assurer qu'aucune fonction PG ni vue ne la référence
-- avant d'exécuter cette étape (voir section 4 et 5 pour la vérification)
ALTER TABLE structures
    DROP COLUMN IF EXISTS indicatif_pays;

COMMIT;
```

> **Pourquoi `ON UPDATE CASCADE` sur la FK ?** Si jamais un code ISO devait être corrigé (coquille), la cascade propage automatiquement. `ON DELETE RESTRICT` empêche de supprimer un pays encore référencé.

> **Pourquoi `LIKE '%@gmail.com'` et non une regex ?** La décision produit stipule "Email Gmail strict (@gmail.com)". `LIKE` est plus lisible, plus rapide, et suffisant pour cette contrainte. Une regex `~* '^[^@]+@gmail\.com$'` peut remplacer si on veut interdire les sous-domaines (gmail.co, etc.) — à valider avec le PO.

### 2.3 Script de ROLLBACK

```sql
-- ============================================================
-- MIGRATION ROLLBACK : annuler la migration multi-pays
-- ============================================================

BEGIN;

-- Étape 1 : Supprimer la contrainte CHECK email/pays
ALTER TABLE structures
    DROP CONSTRAINT IF EXISTS chk_structures_email_pays_non_sn;

-- Étape 2 : Supprimer la FK
ALTER TABLE structures
    DROP CONSTRAINT IF EXISTS fk_structures_pays;

-- Étape 3 : Supprimer l'index
DROP INDEX IF EXISTS idx_structures_code_iso_pays;

-- Étape 4 : Supprimer la colonne code_iso_pays
ALTER TABLE structures
    DROP COLUMN IF EXISTS code_iso_pays;

-- Étape 5 : Réajouter indicatif_pays si elle a été supprimée
-- (uniquement si l'étape 6 de la migration forward a été exécutée)
ALTER TABLE structures
    ADD COLUMN IF NOT EXISTS indicatif_pays VARCHAR(10) DEFAULT '+221';

UPDATE structures
SET indicatif_pays = '+221'
WHERE indicatif_pays IS NULL;

-- Étape 6 : Supprimer la table pays
-- (uniquement si aucune autre table ne la référence)
DROP TABLE IF EXISTS pays;

COMMIT;
```

---

## 3. Nouvelle fonction `add_edit_inscription_v2`

### 3.1 Stratégie de coexistence

La fonction `add_edit_inscription` (12 params) reste inchangée en base pour ne pas casser les appels existants. `add_edit_inscription_v2` est une nouvelle fonction avec 13 params (ajout de `p_code_iso_pays`). Le service TypeScript `registration.service.ts` sera mis à jour pour appeler la v2 (hors scope de ce PRD).

### 3.2 Code SQL complet

```sql
-- ============================================================
-- FONCTION : add_edit_inscription_v2
-- Inscription / Modification d'une structure marchand
-- Ajout du paramètre p_code_iso_pays par rapport à la v1
--
-- Paramètres (ordre identique à v1, nouveau param en 13e position) :
--   1  p_id_type         INTEGER       Type de structure
--   2  p_nom_structure   VARCHAR       Nom de la structure (mis en UPPER)
--   3  p_adresse         VARCHAR       Adresse physique
--   4  p_mobile_om       VARCHAR       Téléphone principal (Orange Money)
--   5  p_mobile_wave     VARCHAR       Téléphone Wave (optionnel)
--   6  p_numautorisatioon VARCHAR      Numéro d'autorisation
--   7  p_nummarchand     VARCHAR       Numéro marchand
--   8  p_email           VARCHAR       Email (obligatoire si pays ≠ SN)
--   9  p_logo            VARCHAR       URL logo
--  10  p_nom_service     VARCHAR       Nom du service principal
--  11  p_code_promo      VARCHAR       Code partenaire / promo
--  12  p_id_structure    INTEGER       0 = nouvelle inscription, >0 = modification
--  13  p_code_iso_pays   CHAR(2)       Code ISO pays (DEFAULT 'SN')
--
-- Retour : TEXT (message JSON ou texte lisible selon implémentation v1)
-- ============================================================

CREATE OR REPLACE FUNCTION add_edit_inscription_v2(
    p_id_type          INTEGER,
    p_nom_structure    VARCHAR,
    p_adresse          VARCHAR,
    p_mobile_om        VARCHAR,
    p_mobile_wave      VARCHAR       DEFAULT '',
    p_numautorisatioon VARCHAR       DEFAULT '',
    p_nummarchand      VARCHAR       DEFAULT '',
    p_email            VARCHAR       DEFAULT '',
    p_logo             VARCHAR       DEFAULT '',
    p_nom_service      VARCHAR       DEFAULT 'SERVICES',
    p_code_promo       VARCHAR       DEFAULT 'FAYCLICK',
    p_id_structure     INTEGER       DEFAULT 0,
    p_code_iso_pays    CHAR(2)       DEFAULT 'SN'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code_iso      CHAR(2);
    v_pays_exists   BOOLEAN;
    v_email_clean   VARCHAR;
    v_result        TEXT;
BEGIN
    -- --------------------------------------------------------
    -- 1. Normalisation des entrées
    -- --------------------------------------------------------
    v_code_iso    := UPPER(TRIM(p_code_iso_pays));
    v_email_clean := LOWER(TRIM(p_email));
    p_nom_structure := UPPER(TRIM(p_nom_structure));

    -- --------------------------------------------------------
    -- 2. Validation du code pays
    -- --------------------------------------------------------
    SELECT EXISTS(
        SELECT 1 FROM pays WHERE code_iso = v_code_iso AND actif = TRUE
    ) INTO v_pays_exists;

    IF NOT v_pays_exists THEN
        RAISE EXCEPTION
            'Pays non supporté : %. Contactez le support FayClick.',
            v_code_iso
            USING ERRCODE = 'P0001';
    END IF;

    -- --------------------------------------------------------
    -- 3. Validation email pour pays ≠ SN
    -- --------------------------------------------------------
    IF v_code_iso <> 'SN' THEN

        -- Email obligatoire
        IF v_email_clean IS NULL OR v_email_clean = '' THEN
            RAISE EXCEPTION
                'L''email est obligatoire pour les structures hors Sénégal. '
                || 'Fournissez une adresse @gmail.com valide.'
                USING ERRCODE = 'P0002';
        END IF;

        -- Email doit être un Gmail
        IF v_email_clean NOT LIKE '%@gmail.com' THEN
            RAISE EXCEPTION
                'Seules les adresses Gmail (@gmail.com) sont acceptées '
                || 'pour les pays hors Sénégal. Email reçu : %.',
                v_email_clean
                USING ERRCODE = 'P0003';
        END IF;

    END IF;

    -- --------------------------------------------------------
    -- 4. Délégation à la logique métier existante (v1)
    --    On appelle add_edit_inscription avec les 12 params d'origine,
    --    puis on met à jour code_iso_pays si besoin.
    -- --------------------------------------------------------
    v_result := add_edit_inscription(
        p_id_type,
        p_nom_structure,
        p_adresse,
        p_mobile_om,
        p_mobile_wave,
        p_numautorisatioon,
        p_nummarchand,
        p_email,
        p_logo,
        p_nom_service,
        p_code_promo,
        p_id_structure
    );

    -- --------------------------------------------------------
    -- 5. Mettre à jour code_iso_pays sur la structure créée/modifiée
    --    La v1 retourne un message contenant "id_structure:NNN" ou
    --    l'id peut être lu depuis la table (dernier inséré pour code ≠ SN).
    --    Si p_id_structure > 0 : mise à jour directe.
    --    Si p_id_structure = 0 : la v1 crée la structure, on patch par nom.
    -- --------------------------------------------------------
    IF p_id_structure > 0 THEN
        UPDATE structures
        SET code_iso_pays = v_code_iso
        WHERE id_structure = p_id_structure;
    ELSE
        -- Nouvelle inscription : la v1 insère avec DEFAULT 'SN'.
        -- On corrige immédiatement si pays ≠ SN.
        IF v_code_iso <> 'SN' THEN
            UPDATE structures
            SET code_iso_pays = v_code_iso
            WHERE UPPER(nom_structure) = p_nom_structure
              AND createdat >= NOW() - INTERVAL '5 seconds'
              AND code_iso_pays = 'SN';
        END IF;
    END IF;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Re-lever l'exception pour que le caller TypeScript la capte
        RAISE;
END;
$$;

COMMENT ON FUNCTION add_edit_inscription_v2 IS
    'Version multi-pays de add_edit_inscription. '
    || 'Ajoute p_code_iso_pays (DEFAULT SN), valide email @gmail.com si pays ≠ SN, '
    || 'puis délègue à add_edit_inscription v1 et patch code_iso_pays.';

-- Droits d'exécution (adapter au rôle utilisé par l'API)
-- GRANT EXECUTE ON FUNCTION add_edit_inscription_v2 TO api_role;
```

> **Note sur la stratégie de patch NEW inscription** : La fenêtre de 5 secondes (`createdat >= NOW() - INTERVAL '5 seconds'`) est un garde-fou pragmatique. En production, `add_edit_inscription` retourne un message texte contenant les credentials ; si ce message contient un `id_structure` extractable avec `regexp_match`, préférer le parser pour éviter la fenêtre temporelle. Ce sera à préciser lors de l'analyse du code source de `add_edit_inscription`.

### 3.3 Format de retour

La fonction retourne le même `TEXT` que `add_edit_inscription`. Le service TypeScript `registration.service.ts` n'a pas besoin de changement de parsing — seul l'appel SQL change (nom de fonction + 13e paramètre).

---

## 4. Autres fonctions PostgreSQL à réviser

### 4.1 Inventaire complet des fonctions impactées

| # | Fonction PG | Pourquoi impactée | Action requise |
|---|---|---|---|
| 1 | `add_edit_inscription` | Référence `indicatif_pays` si elle existe dans le corps | Vérifier le corps ; ne pas modifier |
| 2 | `add_edit_inscription_v2` | **Nouvelle** (section 3) | Créer |
| 3 | `get_une_structure(pid_structure)` | Retourne les données structure — manque `code_iso_pays` et devise | Modifier (voir 4.2) |
| 4 | `get_admin_detail_structure(id_structure)` | Même objet structure que `get_une_structure` côté admin | Modifier (voir 4.3) |
| 5 | `get_admin_list_structures(...)` | Retourne liste de structures — utile d'ajouter le pays pour filtres admin | Modifier (voir 4.4) |
| 6 | Vue `list_structures` | Requêtée directement dans `catalogues-public.service.ts`, `registration.service.ts`, `marketplace-search.service.ts` | Modifier (voir 4.5) |

### 4.2 `get_une_structure` — enrichir le JSON retourné

Cette fonction est utilisée par :
- `database.service.ts:167` — `fetchStructureDetails` (auth au login)
- `admin.service.ts:727` — `getUneStructure` (admin panel)

Elle doit retourner deux nouveaux champs dans son JSON de réponse :

```sql
-- Fragment à intégrer dans le SELECT JSON de get_une_structure()
-- (adapter selon la structure exacte du JSON actuel)

-- Ajouter dans le bloc JSON principal :
--   "code_iso_pays": s.code_iso_pays,
--   "pays": {
--       "nom_fr": p.nom_fr,
--       "devise_code": p.devise_code,
--       "devise_symbole": p.devise_symbole,
--       "indicatif_tel": p.indicatif_tel,
--       "sms_supporte": p.sms_supporte,
--       "emoji_drapeau": p.emoji_drapeau
--   }

-- Exemple de modification du FROM/JOIN :
-- FROM structures s
-- LEFT JOIN pays p ON p.code_iso = s.code_iso_pays
-- WHERE s.id_structure = pid_structure

-- Exemple de colonne JSON à ajouter dans le json_build_object() existant :
-- 'code_iso_pays', s.code_iso_pays,
-- 'pays', json_build_object(
--     'nom_fr',         p.nom_fr,
--     'devise_code',    p.devise_code,
--     'devise_symbole', p.devise_symbole,
--     'indicatif_tel',  p.indicatif_tel,
--     'sms_supporte',   p.sms_supporte,
--     'emoji_drapeau',  p.emoji_drapeau
-- )
```

> Le code source complet de `get_une_structure` doit être lu avec :
> ```sql
> SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_une_structure';
> ```
> avant d'écrire le `CREATE OR REPLACE` final. Ce PRD fournit le patron — l'implémenteur vérifiera la structure JSON existante.

**Impact côté TypeScript** : Ajouter les champs dans `StructureDetails` (`types/auth.ts`) :
- `code_iso_pays?: string`
- `pays?: { nom_fr: string; devise_code: string; devise_symbole: string; indicatif_tel: string; sms_supporte: boolean; emoji_drapeau?: string }`

### 4.3 `get_admin_detail_structure` — enrichir l'objet structure

Même logique que 4.2. Ajouter `code_iso_pays` et l'objet `pays` dans le bloc `structure` du JSON retourné.

**Impact côté TypeScript** : `AdminDetailStructure.structure` (`types/admin.types.ts`) — ajouter :
- `code_iso_pays?: string`
- `pays_nom?: string`
- `devise_code?: string`

### 4.4 `get_admin_list_structures` — ajouter filtre par pays

Cette fonction reçoit actuellement : `(limit, offset, search, type, statut)`.

```sql
-- Fragment : ajouter p_code_iso_pays VARCHAR(2) DEFAULT NULL en 6e paramètre
-- et intégrer dans le WHERE :
--   AND (p_code_iso_pays IS NULL OR s.code_iso_pays = p_code_iso_pays)
-- et dans le SELECT : s.code_iso_pays
```

Ce filtre permettra à l'admin FayClick de visualiser les structures par pays dès le lancement.

**Impact côté TypeScript** : `AdminListStructuresParams` — ajouter `code_iso_pays?: string` ; `AdminStructureItem` — ajouter `code_iso_pays?: string`.

### 4.5 Vue `list_structures` — ajouter code_iso_pays

La vue `list_structures` est requêtée directement en SQL dans plusieurs services (pas via une fonction PG). Elle doit exposer `code_iso_pays` pour que les services qui filtrent ou affichent les structures puissent l'utiliser sans JOIN supplémentaire.

```sql
-- Exemple de modification : ajouter s.code_iso_pays dans le SELECT de la vue
-- CREATE OR REPLACE VIEW list_structures AS
--   SELECT
--     s.id_structure,
--     s.code_structure,
--     s.nom_structure,
--     ...colonnes existantes...,
--     s.code_iso_pays,
--     p.nom_fr         AS pays_nom,
--     p.devise_code    AS devise_code,
--     p.devise_symbole AS devise_symbole
--   FROM structures s
--   LEFT JOIN pays p ON p.code_iso = s.code_iso_pays;
```

> Le code source complet de la vue s'obtient avec :
> ```sql
> SELECT definition FROM pg_views WHERE viewname = 'list_structures';
> ```

### 4.6 Fonctions identifiées dans les services TypeScript — synthèse

Analyse de `services/auth.service.ts`, `services/admin.service.ts` et `services/registration.service.ts` :

| Service TypeScript | Fonction/Vue PG appelée | Champ manquant après migration |
|---|---|---|
| `auth.service.ts:fetchStructureDetails` | `get_une_structure()` | `code_iso_pays`, `pays.*` |
| `admin.service.ts:getDetailStructure` | `get_admin_detail_structure()` | `code_iso_pays` |
| `admin.service.ts:getListStructures` | `get_admin_list_structures()` | filtre `code_iso_pays` |
| `admin.service.ts:getUneStructure` | `get_une_structure()` | `code_iso_pays`, `pays.*` |
| `registration.service.ts:registerMerchant` | `add_edit_inscription` | Passer à `add_edit_inscription_v2` |
| `registration.service.ts:getStructureAdminByName` | `list_structures` (vue) | `code_iso_pays` (non bloquant) |
| `catalogues-public.service.ts` | `list_structures` (vue, SELECT direct) | `code_iso_pays` (non bloquant) |
| `marketplace-search.service.ts` | `list_structures` (vue) | `code_iso_pays` (non bloquant) |

---

## 5. Plan d'exécution de la migration

### 5.1 Ordre des scripts

Les scripts doivent être exécutés **dans cet ordre strict** (dépendances FK) :

```
Script 01 — Créer table pays + INSERT 17 pays
Script 02 — Migrer structures (ADD COLUMN → UPDATE → FK → CHECK → DROP indicatif_pays)
Script 03 — Créer fonction add_edit_inscription_v2
Script 04 — Modifier get_une_structure (lire source → CREATE OR REPLACE)
Script 05 — Modifier vue list_structures (lire source → CREATE OR REPLACE)
Script 06 — Modifier get_admin_detail_structure (lire source → CREATE OR REPLACE)
Script 07 — Modifier get_admin_list_structures (lire source → CREATE OR REPLACE)
Script 08 — Requêtes de vérification post-migration
```

> Scripts 04 à 07 nécessitent de lire le code source actuel via `pg_get_functiondef` / `pg_views.definition` avant d'écrire les `CREATE OR REPLACE`. Ce PRD fournit les fragments à intégrer ; l'implémenteur adapte au corps existant.

### 5.2 Requêtes de vérification post-migration

```sql
-- ============================================================
-- VÉRIFICATIONS POST-MIGRATION
-- ============================================================

-- V1 : Table pays bien créée avec 17 lignes
SELECT COUNT(*) AS nb_pays,
       COUNT(*) FILTER (WHERE sms_supporte = TRUE) AS pays_sms,
       COUNT(*) FILTER (WHERE actif = TRUE)         AS pays_actifs
FROM pays;
-- Attendu : nb_pays=17, pays_sms=1, pays_actifs=17

-- V2 : Toutes les structures existantes ont code_iso_pays = 'SN'
SELECT code_iso_pays, COUNT(*) AS nb
FROM structures
GROUP BY code_iso_pays
ORDER BY nb DESC;
-- Attendu : 1 seule ligne SN avec le total de structures existantes

-- V3 : La FK est bien posée
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'structures'::regclass
  AND conname = 'fk_structures_pays';
-- Attendu : 1 ligne avec contype = 'f'

-- V4 : La colonne indicatif_pays n'existe plus
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'structures'
  AND column_name = 'indicatif_pays';
-- Attendu : 0 lignes

-- V5 : La contrainte CHECK email/pays est active
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'structures'::regclass
  AND conname = 'chk_structures_email_pays_non_sn';
-- Attendu : 1 ligne

-- V6 : Test fonctionnel add_edit_inscription_v2 — refus email vide pour CI
DO $$
BEGIN
    BEGIN
        PERFORM add_edit_inscription_v2(
            1, 'TEST CI SANS EMAIL', 'ABIDJAN', '0700000000',
            '', '', '', '',  -- email vide
            '', 'SERVICES', 'FAYCLICK', 0,
            'CI'  -- pays ≠ SN
        );
        RAISE EXCEPTION 'TEST ÉCHOUÉ : la validation email aurait dû lever une exception';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%obligatoire%' OR SQLERRM LIKE '%gmail%' THEN
                RAISE NOTICE 'TEST V6 OK : exception levée correctement -> %', SQLERRM;
            ELSE
                RAISE; -- Re-lever si l'erreur est inattendue
            END IF;
    END;
END;
$$;

-- V7 : Test fonctionnel add_edit_inscription_v2 — refus email non-Gmail pour MA
DO $$
BEGIN
    BEGIN
        PERFORM add_edit_inscription_v2(
            1, 'TEST MA EMAIL YAHOO', 'CASABLANCA', '0600000000',
            '', '', '', 'test@yahoo.com',  -- email non-Gmail
            '', 'SERVICES', 'FAYCLICK', 0,
            'MA'
        );
        RAISE EXCEPTION 'TEST ÉCHOUÉ : la validation @gmail.com aurait dû lever une exception';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%gmail%' THEN
                RAISE NOTICE 'TEST V7 OK : exception @gmail.com levée -> %', SQLERRM;
            ELSE
                RAISE;
            END IF;
    END;
END;
$$;

-- V8 : La vue list_structures expose bien code_iso_pays
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'list_structures'
  AND column_name = 'code_iso_pays';
-- Attendu : 1 ligne (si la vue a été mise à jour)

-- V9 : get_une_structure retourne bien code_iso_pays pour une structure existante
-- (remplacer 1 par un id_structure réel)
SELECT get_une_structure(1)::text LIKE '%code_iso_pays%' AS has_code_iso;
-- Attendu : TRUE (si la fonction a été mise à jour)
```

### 5.3 Estimation des risques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| `add_edit_inscription` référence `indicatif_pays` dans son corps | Faible (audit dit "non utilisé côté code") | Bloquant si DROP COLUMN | Lire `pg_get_functiondef('add_edit_inscription')` avant script 02 étape 6 |
| Autre fonction PG inconnue référence `indicatif_pays` | Faible | Cassant | Requête `grep` PG avant migration (voir ci-dessous) |
| Contrainte CHECK bloque des UPDATE d'urgence sur structures existantes | Nul (toutes SN, contrainte satisfaite) | Nul pour l'existant | N/A |
| Fenêtre temporelle 5s dans v2 pour patch code_iso_pays nouvelles inscriptions | Faible (charge mono-structure à l'inscription) | Mineur | Long terme : parser l'id_structure du message retour v1 |
| Vue `list_structures` cassée après ajout JOIN pays | Faible | Cassant pour catalogues publics et marketplace | Tester `SELECT * FROM list_structures LIMIT 1` immédiatement après script 05 |

### 5.4 Requête de détection des références à `indicatif_pays`

Avant d'exécuter le script 02 étape 6 (DROP COLUMN), exécuter cette requête en base pour s'assurer qu'aucun objet PG ne référence encore `indicatif_pays` :

```sql
-- Chercher toutes les fonctions/vues qui mentionnent indicatif_pays
SELECT
    n.nspname                        AS schema,
    p.proname                        AS nom_fonction,
    'FUNCTION'                       AS type_objet,
    LEFT(pg_get_functiondef(p.oid), 500) AS extrait
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%indicatif_pays%'

UNION ALL

SELECT
    schemaname,
    viewname,
    'VIEW',
    LEFT(definition, 500)
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%indicatif_pays%';
```

Si cette requête retourne des lignes, mettre à jour ces objets avant le DROP COLUMN.

---

## Annexe — Correspondance devise par zone géographique

| Devise | Code ISO 4217 | Pays couverts dans ce MVP |
|---|---|---|
| Franc CFA BCEAO | XOF | SN, CI, ML, BF, TG, BJ, NE, GW (8 pays) |
| Franc guinéen | GNF | GN |
| Leone | SLL | SL |
| Dollar libérien | LRD | LR |
| Cedi ghanéen | GHS | GH |
| Naira nigérian | NGN | NG |
| Escudo cap-verdien | CVE | CV |
| Dirham marocain | MAD | MA |
| Dinar algérien | DZD | DZ |
| Dinar tunisien | TND | TN |

> Au MVP, seule la zone XOF (8 pays) bénéficie du calcul financier complet. Les 9 autres devises sont stockées pour affichage mais sans taux de change en base. Une table `taux_change` sera adressée dans une phase ultérieure.
