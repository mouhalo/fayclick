# Déploiement BD Bons de Commande — Procédure manuelle

> Date : 2026-05-28
> Cible : `fayclick_db` (host `154.12.224.173` port `3253`)
> Branche Git source : `feature/bons-commande-fournisseurs`

## Pourquoi cette procédure manuelle

L'environnement Claude Code (poste local Windows) ne dispose pas de :
- `psql` / `pg_dump` dans le PATH
- Client SSH configuré vers le serveur
- Accès réseau direct vers la BD prod

Les agents IA (incluant `dba_master`) sont des sub-agents LLM avec les mêmes contraintes — ils ne disposent pas d'accès magique au serveur. Le déploiement doit donc être exécuté par toi avec tes outils.

## ⚠️ Point critique avant déploiement

Les fichiers SQL référencent **`structures`** (vérifié ligne 51 de `fournisseur-schema.sql`).

**Avant tout DDL**, exécute ce SELECT en prod :

```sql
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('structures','list_structures');
```

- Si résultat = `structures` → ✅ OK, les SQL sont cohérents
- Si résultat = `list_structures` → ❌ Patcher les SQL avant : remplacer toutes les occurrences de `structures(` par `list_structures(` dans les 5 fichiers SQL
- Si résultat vide → ❌ Investiguer avant tout DDL

## Outils possibles

| Outil | Avantage | Usage |
|---|---|---|
| **pgAdmin 4** | GUI complet, idéal pour debug | Ouvrir `DEPLOY_BC_ALL_IN_ONE.sql` → exécuter |
| **DBeaver** | Multi-base, light | Idem |
| **psql en ligne** | Le plus fiable | `psql -h ... -f DEPLOY_BC_ALL_IN_ONE.sql` |

Pour installer psql sous Windows :
- Télécharger PostgreSQL client tools : https://www.postgresql.org/download/windows/
- Ou via Chocolatey : `choco install postgresql`

## Procédure recommandée

### Étape 1 — Backup pg_dump
Depuis un terminal où psql/pg_dump sont disponibles et `$env:PGPASSWORD` set :

```powershell
pg_dump -h 154.12.224.173 -p 3253 -U admin_icelab -d fayclick_db -F c `
  -f D:\backups\fayclick_db_pre_bc_2026-05-28.dump
# Vérifier taille > 1 MB
```

Si pg_dump impossible localement → demander à l'admin serveur de le faire côté serveur, ou utiliser pgAdmin (Tools → Backup).

### Étape 2 — Pré-checks (lecture seule)
```sql
-- Vérifier nom table structures
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('structures','list_structures');

-- Vérifier qu'aucun objet BC n'existe déjà
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('fournisseur','etat_bon_commande','bon_commande',
                    'bon_commande_details','bon_commande_compteur');
-- Doit retourner 0 ligne

SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace
  AND proname IN ('create_fournisseur','create_bon_commande');
-- Doit retourner 0 ligne
```

Si quelque chose existe déjà → **STOP**, investiguer.

### Étape 3 — Déploiement
Option A — En un seul fichier consolidé :
```sql
\i docs/dba/DEPLOY_BC_ALL_IN_ONE.sql
```

Option B — Fichier par fichier (ordre exact OBLIGATOIRE) :
```sql
\i docs/dba/fournisseur-schema.sql
\i docs/dba/fournisseur-functions.sql
\i docs/dba/bon-commande-schema.sql
\i docs/dba/bon-commande-functions.sql
\i docs/dba/bon-commande-epic1-patches.sql
```

Via pgAdmin/DBeaver : ouvrir chaque fichier dans une query window et exécuter.

### Étape 4 — Vérifications post-deploy
```sql
SELECT count(*) FROM etat_bon_commande;
-- Doit = 4 (BROUILLON, CONFIRME, LIVRE, ANNULE)

SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace
  AND proname IN ('create_fournisseur','edit_fournisseur','delete_fournisseur','get_list_fournisseurs',
                  'create_bon_commande','edit_bon_commande','delete_bon_commande',
                  'get_list_bons_commandes','get_bon_commande_details');
-- Doit = 9
```

### Étape 5 — Tests smoke (structure 218 LIBRAIRIE CHEZ KELEFA)

```sql
-- T1 : Créer fournisseur test
SELECT create_fournisseur(218, 'SMOKE TEST H3 - A SUPPRIMER', '777301221', NULL, NULL, NULL, NULL);
-- Attendu : {"success":true,...}

-- T2 : Lister fournisseurs structure 218
SELECT get_list_fournisseurs(218);
-- Attendu : JSON contenant SMOKE TEST H3 avec nb_bons_commandes=0

-- Récupérer id_fournisseur smoke + id_produit test
SELECT id_fournisseur FROM fournisseur
  WHERE id_structure=218 AND nom_fournisseur='SMOKE TEST H3 - A SUPPRIMER';
-- Note l'id (appelons-le ID_FR)

SELECT id_produit FROM produit_service
  WHERE id_structure=218 AND cout_revient > 0 LIMIT 1;
-- Note l'id (appelons-le ID_PR)

-- T3 : Créer BC (remplacer ID_FR et ID_PR par les valeurs ci-dessus)
SELECT create_bon_commande(218, CURRENT_DATE, ID_FR, 'Smoke test H3', 1500,
  'ID_PR-1-1500#', 0, 1);
-- Attendu : success=true + num_bc='BC-218-XXX'

SELECT id_bon_commande FROM bon_commande
  WHERE id_structure=218 AND id_fournisseur=ID_FR
  ORDER BY date_creation DESC LIMIT 1;
-- Note l'id (appelons-le ID_BC)

-- T4 : Liste BCs
SELECT get_list_bons_commandes(218);
-- Attendu : JSON contenant le BC créé

-- T5 : Détails BC
SELECT get_bon_commande_details(ID_BC, 218);
-- Attendu : structure imbriquée { success, bon_commande:{...fournisseur, articles:[...]} }

-- T6 : Transition BROUILLON → CONFIRME
SELECT edit_bon_commande(ID_BC, 218, NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL, 2);
-- Attendu : success=true

-- T7 : Valider patch EPIC 1 (nb_bons_commandes maintenant = 1)
SELECT get_list_fournisseurs(218);
-- Le fournisseur smoke doit afficher "nb_bons_commandes":1

-- T8 : delete_fournisseur doit échouer (BC actif)
SELECT delete_fournisseur(ID_FR, 218);
-- Attendu : success=false (blocage attendu)

-- T9 : Nettoyage (DELETE physique exceptionnel pour smoke uniquement)
DELETE FROM bon_commande_details WHERE id_bon_commande = ID_BC;
DELETE FROM bon_commande WHERE id_bon_commande = ID_BC;
DELETE FROM fournisseur WHERE id_fournisseur = ID_FR;
```

## Rollback (en cas de problème)

```sql
-- Ordre inverse pour respecter les FK
DROP FUNCTION IF EXISTS get_bon_commande_details(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS get_list_bons_commandes(integer) CASCADE;
DROP FUNCTION IF EXISTS delete_bon_commande(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS edit_bon_commande CASCADE;
DROP FUNCTION IF EXISTS create_bon_commande CASCADE;
DROP TABLE IF EXISTS bon_commande_details CASCADE;
DROP TABLE IF EXISTS bon_commande CASCADE;
DROP TABLE IF EXISTS bon_commande_compteur CASCADE;
DROP FUNCTION IF EXISTS get_list_fournisseurs(integer) CASCADE;
DROP FUNCTION IF EXISTS delete_fournisseur(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS edit_fournisseur CASCADE;
DROP FUNCTION IF EXISTS create_fournisseur CASCADE;
DROP TABLE IF EXISTS fournisseur CASCADE;
DROP TABLE IF EXISTS etat_bon_commande CASCADE;
```

Ou restauration complète depuis backup :
```powershell
pg_restore -h 154.12.224.173 -p 3253 -U admin_icelab -d fayclick_db `
  --clean --if-exists D:\backups\fayclick_db_pre_bc_2026-05-28.dump
```

## Post-deploy

Une fois la BD à jour :
1. Merge la PR #5 sur main
2. Frontend : `rm -rf .next && npm run deploy:build`
3. Hard refresh `Ctrl+Shift+R` sur v2.fayclick.net
4. Tester avec compte structure 218 (`admin@chezkelefa.fay`)

Me transmettre les outputs des 9 tests smoke pour validation finale et clôture de H3.
