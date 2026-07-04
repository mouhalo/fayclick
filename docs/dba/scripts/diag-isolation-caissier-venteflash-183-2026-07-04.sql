-- ============================================================================
-- DIAGNOSTIC — Isolation ventes entre caissiers (Vente Flash)
-- Base    : fayclick_db (154.12.224.173:3253)
-- Cible   : structure 183 (TECH24, compte_distributeur = TRUE)
-- Comptes : abdoudiop@tech24.fay / testcaissier2@tech24.fay
-- Nature  : LECTURE SEULE — aucun DDL/DML. Prêt à copier-coller (psql / client SQL).
-- DBA     : dba_master — 2026-07-04
--
-- Hypothèses de schéma retenues (confirmées par le code source FayClick, à valider
-- par la Requête 0 avant de lancer 2 et 3) :
--   - Table de base  : utilisateur (singulier) — PK = id (PAS id_utilisateur)
--   - Table de base  : facture_com (singulier) — PK = id_facture
--   - Vue            : list_utilisateurs (colonnes : id, username, login, id_structure,
--                       id_profil, nom_du_profil, actif — PAS "nom_profil")
--   - facture_com.id_utilisateur : nom déduit du paramètre p_id_utilisateur de
--     create_facture_complete1() / add_new_facture() (patch 10-args du 2026-07-02).
--     NON confirmé par lecture directe du corps de la fonction (patch appliqué en
--     prod hors dépôt). SI la Requête 0 montre un autre nom (agent_saisie, id_agent,
--     cree_par...), remplacer "id_utilisateur" par ce nom dans les Requêtes 2 et 3b.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- REQUÊTE 0 — Découverte des colonnes réelles (préalable obligatoire)
-- ----------------------------------------------------------------------------
SELECT table_name, column_name, data_type, is_nullable, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('facture_com', 'utilisateur', 'list_utilisateurs', 'profil')
ORDER BY table_name, ordinal_position;

-- Verdict attendu : confirme (a) que facture_com contient bien une colonne du type
-- "id_utilisateur" (ou son équivalent réel — à reporter dans les requêtes 2/3b si
-- le nom diffère) et (b) si une colonne "id_representant" existe séparément sur
-- facture_com (utile pour la Requête 3). Si aucune colonne d'attribution n'existe
-- du tout sur facture_com → escalade immédiate : le bug n'est pas côté front,
-- l'attribution n'est structurellement pas stockée.


-- ----------------------------------------------------------------------------
-- REQUÊTE 1 — Identité + profil des 2 comptes de test (structure 183)
-- ----------------------------------------------------------------------------
SELECT
    vu.id,
    vu.username,
    vu.login,
    vu.id_structure,
    vu.id_profil,
    vu.nom_du_profil,
    vu.actif,
    u.mode_encaissement,
    u.nom_rep,
    u.prenom_rep,
    u.id_localite,
    u.actif_reseau
FROM list_utilisateurs vu
INNER JOIN utilisateur u ON u.id = vu.id
WHERE vu.id_structure = 183
  AND (
        LOWER(vu.login)    IN ('abdoudiop@tech24.fay', 'testcaissier2@tech24.fay')
        OR LOWER(vu.username) IN ('abdoudiop@tech24.fay', 'testcaissier2@tech24.fay')
      )
ORDER BY vu.id;

-- Verdict attendu : les 2 lignes doivent avoir id_profil = CAISSIER (PAS ADMIN) et
-- nom_rep/actif_reseau vides ou FALSE (comptes emails, pas des représentants).
-- Si l'un des deux ressort avec nom_rep renseigné / actif_reseau = TRUE → ce compte
-- est en réalité un représentant et passe par create_facture_representant (chemin
-- d'écriture différent, cf. Requête 3) → le futur filtre front devra en tenir compte,
-- escalade vers analyse du chemin représentant avant de livrer le filtre caissier.


-- ----------------------------------------------------------------------------
-- REQUÊTE 2 — Attribution id_utilisateur des ventes récentes de la structure 183
-- (depuis le 2026-07-02, date du patch add_new_facture 10-args)
-- ----------------------------------------------------------------------------
SELECT
    fc.id_utilisateur,
    COALESCE(u.username, '(aucun utilisateur correspondant)') AS username,
    u.login,
    COUNT(*)                    AS nb_ventes,
    MIN(fc.date_facture)        AS premiere_vente,
    MAX(fc.date_facture)        AS derniere_vente
FROM facture_com fc
LEFT JOIN utilisateur u ON u.id = fc.id_utilisateur
WHERE fc.id_structure = 183
  AND fc.date_facture >= '2026-07-02'
GROUP BY fc.id_utilisateur, u.username, u.login
ORDER BY nb_ventes DESC;

-- Verdict attendu : chaque caisse (identifiée en Requête 1 par son id) doit apparaître
-- ICI avec SON PROPRE id (username = abdoudiop / testcaissier2) et un nb_ventes > 0.
-- Le bucket "id_utilisateur = 0" ou "id_utilisateur IS NULL" (username = aucun
-- utilisateur correspondant) doit être proche de zéro sur cette période.
--   → Si chaque caisse a bien ses propres lignes attribuées : l'écriture est correcte,
--     le futur filtre front (WHERE id_utilisateur = user connecté) résoudra le bug.
--   → Si les ventes des 2 caisses se retrouvent regroupées sous un seul id (souvent 0,
--     NULL, ou l'id de l'ADMIN) : l'attribution est cassée AU NIVEAU ÉCRITURE — aucun
--     filtre front ne peut réparer ça seul → escalade vers correctif SQL côté
--     create_facture_complete1 / add_new_facture.


-- ----------------------------------------------------------------------------
-- REQUÊTE 3a — facture_com a-t-elle une colonne d'attribution "représentant" dédiée ?
-- ----------------------------------------------------------------------------
SELECT COUNT(*) AS nb_colonne_id_representant
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'facture_com'
  AND column_name = 'id_representant';

-- Verdict attendu : si nb_colonne_id_representant = 0, facture_com ne distingue pas
-- nativement les ventes représentant par colonne dédiée (create_facture_representant
-- écrit alors probablement aussi via id_utilisateur, ou dans une autre table) — dans
-- ce cas, s'appuyer uniquement sur la Requête 1 pour confirmer que les 2 comptes
-- testés sont bien de simples caissiers et NE PAS exécuter la Requête 3b ci-dessous
-- (elle échouera : colonne inexistante).


-- ----------------------------------------------------------------------------
-- REQUÊTE 3b — À N'EXÉCUTER QUE SI 3a > 0 (sinon erreur "colonne inexistante")
-- Répartition des ventes récentes de 183 par type d'attribution (caissier vs représentant)
-- ----------------------------------------------------------------------------
-- SELECT
--     CASE
--         WHEN fc.id_representant IS NOT NULL AND fc.id_representant > 0 THEN 'REPRESENTANT'
--         WHEN fc.id_utilisateur  IS NOT NULL AND fc.id_utilisateur  > 0 THEN 'CAISSIER/ADMIN (id_utilisateur)'
--         ELSE 'NON_ATTRIBUE (0/NULL)'
--     END AS type_attribution,
--     COUNT(*) AS nb_ventes
-- FROM facture_com fc
-- WHERE fc.id_structure = 183
--   AND fc.date_facture >= '2026-07-02'
-- GROUP BY 1
-- ORDER BY nb_ventes DESC;

-- Verdict attendu (si exécutée) : les ventes des 2 comptes caissiers testés doivent
-- apparaître exclusivement sous 'CAISSIER/ADMIN (id_utilisateur)', jamais sous
-- 'REPRESENTANT'. Une présence sous 'REPRESENTANT' pour ces 2 comptes contredirait
-- la Requête 1 (comptes supposés caissiers) → escalade : vérifier si ces comptes de
-- test ont été mal provisionnés (créés comme représentants par erreur) avant de
-- toucher au filtre front.
-- ============================================================================
