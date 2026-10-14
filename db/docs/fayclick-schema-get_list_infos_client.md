# Schéma BD — FayClick : `get_list_infos_client` v1

Base : `fayclick_db` @ `154.12.224.173:3253` (PostgreSQL 16.14)
Date : 2026-10-14 — DBA : dba_master
Dump SQL : `D:\React_Prj\fayclick\db\fayclick_schema_get_list_infos_client_v1.sql`

## Vue d'ensemble

Fonction légère de listing des clients d'une structure, créée pour la **recherche de clients au niveau de la caisse FayClick**. Elle remplace l'usage de `get_list_clients` pour le dropdown de recherche : contrairement à cette dernière (qui embarque toutes les factures de chaque client et le détail articles de chaque facture — ex. structure 218 : 11 418 factures, 70 214 lignes, plusieurs dizaines de Mo, > 2 min), `get_list_infos_client` ne retourne que les 4 champs d'identité du client.

Le filtrage par nom/téléphone est assuré **côté front** (navigateur) sur le JSON reçu. Le paramètre `ptelephone_client` optionnel permet un filtrage serveur exact par téléphone si besoin ultérieur.

**Impact mesuré** : de > 2 minutes et plusieurs dizaines de Mo à **9–34 ms et 3 Ko–105 Ko** selon la structure (voir Mesures).

## Signature

```sql
public.get_list_infos_client(
    pid_structure    integer,
    ptelephone_client character varying DEFAULT ''
) RETURNS json
```

- Langage : PL/pgSQL, `INVOKER` (pas de `SECURITY DEFINER`)
- Propriétaire : `admin_icelab`
- Droits : ACL par défaut (`proacl = NULL`) → **EXECUTE accordé à PUBLIC**, aligné sur `public.get_list_clients` (même policy, aucun GRANT supplémentaire nécessaire)

## Format de retour

```json
{
    "success": true,
    "structure_id": 261,
    "clients": [
        {
            "id_client": 39297,
            "nom_client": "Abdoulaye Ba",
            "tel_client": "773826220",
            "adresse": "senegal"
        }
    ],
    "nombre_clients": 1028,
    "filtre_telephone": null,
    "timestamp_generation": "2026-10-14T20:12:59.759905+00:00"
}
```

- `clients` trié par `nom_client` (asc).
- Chaque élément a **exactement** les clés `id_client` (number), `nom_client` (string), `tel_client` (string), `adresse` (string ou null).
- Structure vide de clients : `clients = []`, `nombre_clients = 0`, `success = true`.
- `filtre_telephone` : `null` si appelé sans filtre, sinon le numéro passé.
- Erreurs métier (`pid_structure` null/négatif, structure inexistante, exception) : `{"success": false, "error": "..."}` — **la fonction ne lève jamais d'exception** (handler `WHEN OTHERS`), le front doit tester `success`.

## Exemples d'appel

```sql
-- Tous les clients d'une structure (cas caisse)
SELECT get_list_infos_client(261, '');

-- Filtrage serveur exact par téléphone (optionnel)
SELECT get_list_infos_client(261, '771234567');   -- clients=[] si aucun match
```

Comportement transactionnel : lecture seule, commit auto, aucun verrou au-delà du `SELECT` (MVCC).

## Mesures (2026-10-14, production)

| Structure | Clients (source) | EXPLAIN ANALYZE | Taille JSON |
|---|---|---|---|
| 218 | 257 | **8,9 ms** (999 buffers hit) | 27 614 caractères (~27 Ko) |
| 261 | 1028 | **33,9 ms** (782 hit / 23 read) | 107 260 caractères (~105 Ko) |
| 1675 | 15 | n/m | 1 808 caractères |

Recoupement exact avec `SELECT count(*) FROM client_facture WHERE id_structure = ...` : 257 / 1028 / 15 — conforme.

Plan d'exécution : la requête interne s'appuie sur l'index existant `idx_client_facture_structure (id_structure, tel_client)` — aucun index nouveau requis.

## Contrôles de forme effectués (structure 261)

- `success = true`, `clients` de type `array`, 1028 éléments
- Chaque élément : exactement `["adresse","id_client","nom_client","tel_client"]` (vérifié sur les 1028)
- 0 `tel_client` null ; tri par `nom_client` vérifié ; `timestamp_generation` présent
- Filtre `771234567` (bidon) : `success=true`, `clients=[]` sans erreur
- Structure 999999 : `success=false`, message « La structure avec l'ID 999999 n'existe pas »

## Notes opérationnelles

- **Additif** : aucun objet existant (fonction, table, vue, index) n'a été modifié. Preuve : diff du catalogue `pg_proc` avant/après = seule ligne ajoutée `get_list_infos_client (pid_structure integer, ptelephone_client character varying)` (560 → 561 fonctions dans `public`).
- `get_list_clients` et `check_one_client` restent intacts et utilisables (rollback front = aucun changement base à prévoir).
- La fonction qualifie `public.` explicitement pour tables et colonnes de retour ; pas de `SET search_path` (défaut). Si un durcissement est souhaité plus tard, ajouter `SET search_path = public, pg_temp` lors d'un futur REPLACE (coordonné avec le front, sans impact de signature).
- Le handler `WHEN OTHERS` masque les erreurs SQL dans le champ `error` : surveiller les retours `success=false` côté passerelle sql_jsonpro.
- Volumétrie : croissance O(nombre de clients de la structure). Même à 10 000 clients la charge resterait ~1 Mo — très en deçà de l'ancien comportement.
