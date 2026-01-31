# 🔧 Requêtes SQL Utiles - fayclick_db

> **Guide DBA PostgreSQL**
> Requêtes courantes pour administration, maintenance et diagnostics

---

## 📊 STATISTIQUES GLOBALES

### Nombre total de structures par type
```sql
SELECT
  ts.nom_type,
  COUNT(*) as nombre_structures,
  COUNT(CASE WHEN s.actif = true THEN 1 END) as actives,
  COUNT(CASE WHEN s.actif = false THEN 1 END) as inactives
FROM structures s
JOIN type_structure ts ON s.id_type = ts.id_type
GROUP BY ts.id_type, ts.nom_type
ORDER BY nombre_structures DESC;
```

### Total factures et CA par structure (Top 20)
```sql
SELECT
  s.nom_structure,
  s.mobile_om,
  COUNT(f.id_facture) as nb_factures,
  SUM(f.montant_net) as chiffre_affaire,
  SUM(f.reste_a_payer) as total_impayes
FROM structures s
LEFT JOIN list_factures_com f ON s.id_structure = f.id_structure
GROUP BY s.id_structure, s.nom_structure, s.mobile_om
ORDER BY chiffre_affaire DESC NULLS LAST
LIMIT 20;
```

### Statistiques wallet globales
```sql
SELECT
  SUM(solde_om) as total_om,
  SUM(solde_wave) as total_wave,
  SUM(solde_free) as total_free,
  SUM(solde_om + solde_wave + solde_free) as total_global,
  COUNT(*) as nb_wallets
FROM wallet_structure;
```

---

## 🔍 DIAGNOSTICS ET SANTÉ

### Factures impayées depuis plus de 30 jours
```sql
SELECT
  s.nom_structure,
  c.nom_client,
  c.tel_client,
  f.numero_facture,
  f.date_facture,
  f.reste_a_payer,
  CURRENT_DATE - f.date_facture::date as jours_retard
FROM list_factures_com f
JOIN structures s ON f.id_structure = s.id_structure
JOIN clients c ON f.id_client = c.id_client
WHERE f.statut IN ('IMPAYEE', 'PAYEE_PARTIELLE')
  AND CURRENT_DATE - f.date_facture::date > 30
ORDER BY jours_retard DESC
LIMIT 50;
```

### Produits en rupture de stock
```sql
SELECT
  s.nom_structure,
  p.nom_produit,
  p.quantite as stock_actuel,
  p.stock_min as stock_minimum,
  p.prix_unitaire,
  (p.stock_min - p.quantite) as quantite_a_commander
FROM list_produits p
JOIN structures s ON p.id_structure = s.id_structure
WHERE p.quantite < p.stock_min
  AND p.actif = true
ORDER BY (p.stock_min - p.quantite) DESC;
```

### Abonnements expirant dans 7 jours
```sql
SELECT
  s.nom_structure,
  s.mobile_om,
  a.type_abonnement,
  a.date_fin,
  a.date_fin - CURRENT_DATE as jours_restants,
  a.montant
FROM abonnements_structure a
JOIN structures s ON a.id_structure = s.id_structure
WHERE a.statut = 'ACTIF'
  AND a.date_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY a.date_fin;
```

### Utilisateurs inactifs (aucune connexion depuis 30 jours)
```sql
-- Requête nécessite une table logs ou derniere_connexion
SELECT
  u.username,
  s.nom_structure,
  u.telephone,
  p.nom_profil,
  u.actif
FROM utilisateurs u
JOIN structures s ON u.id_structure = s.id_structure
JOIN profils p ON u.id_profil = p.id_profil
WHERE u.actif = true
ORDER BY u.id_utilisateur DESC;
-- Note: Ajouter condition derniere_connexion si colonne existe
```

---

## 💰 ANALYSES FINANCIÈRES

### Chiffre d'affaires mensuel (année en cours)
```sql
SELECT
  EXTRACT(MONTH FROM f.date_facture) as mois,
  TO_CHAR(f.date_facture, 'Month YYYY') as periode,
  COUNT(f.id_facture) as nb_factures,
  SUM(f.sous_total) as sous_total,
  SUM(f.remise) as total_remises,
  SUM(f.montant_net) as montant_net,
  SUM(f.acompte) as total_encaisse,
  SUM(f.reste_a_payer) as total_impaye
FROM list_factures_com f
WHERE EXTRACT(YEAR FROM f.date_facture) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY EXTRACT(MONTH FROM f.date_facture), TO_CHAR(f.date_facture, 'Month YYYY')
ORDER BY mois;
```

### Top 10 produits les plus vendus (quantité)
```sql
SELECT
  p.nom_produit,
  s.nom_structure,
  SUM(d.quantite) as quantite_totale_vendue,
  SUM(d.montant_total) as ca_total,
  COUNT(DISTINCT d.id_facture) as nb_factures,
  ROUND(AVG(d.prix_unitaire), 2) as prix_moyen
FROM detail_facture_com d
JOIN list_produits p ON d.id_produit = p.id_produit
JOIN structures s ON p.id_structure = s.id_structure
GROUP BY p.id_produit, p.nom_produit, s.nom_structure
ORDER BY quantite_totale_vendue DESC
LIMIT 10;
```

### Analyse des dépenses par type et structure
```sql
SELECT
  s.nom_structure,
  td.nom_type as type_depense,
  COUNT(d.id_depense) as nb_depenses,
  SUM(d.montant) as total_depenses,
  AVG(d.montant) as depense_moyenne
FROM depenses d
JOIN type_depenses td ON d.id_type_depense = td.id_type_depense
JOIN structures s ON d.id_structure = s.id_structure
WHERE EXTRACT(YEAR FROM d.date_depense) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY s.id_structure, s.nom_structure, td.nom_type
ORDER BY total_depenses DESC;
```

### Taux de paiement des factures par structure
```sql
SELECT
  s.nom_structure,
  COUNT(f.id_facture) as total_factures,
  COUNT(CASE WHEN f.statut = 'PAYEE' THEN 1 END) as factures_payees,
  COUNT(CASE WHEN f.statut = 'PAYEE_PARTIELLE' THEN 1 END) as partielles,
  COUNT(CASE WHEN f.statut = 'IMPAYEE' THEN 1 END) as impayees,
  ROUND(
    COUNT(CASE WHEN f.statut = 'PAYEE' THEN 1 END) * 100.0 / NULLIF(COUNT(f.id_facture), 0),
    2
  ) as taux_paiement_pct
FROM structures s
LEFT JOIN list_factures_com f ON s.id_structure = f.id_structure
WHERE f.date_facture >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY s.id_structure, s.nom_structure
HAVING COUNT(f.id_facture) > 0
ORDER BY taux_paiement_pct DESC;
```

---

## 📦 GESTION DES STOCKS

### Valeur totale du stock par structure
```sql
SELECT
  s.nom_structure,
  COUNT(p.id_produit) as nb_produits,
  SUM(p.quantite) as quantite_totale,
  SUM(p.quantite * p.prix_unitaire) as valeur_stock_totale,
  ROUND(AVG(p.quantite * p.prix_unitaire), 2) as valeur_moyenne_produit
FROM list_produits p
JOIN structures s ON p.id_structure = s.id_structure
WHERE p.actif = true
GROUP BY s.id_structure, s.nom_structure
ORDER BY valeur_stock_totale DESC;
```

### Mouvements de stock sur les 30 derniers jours
```sql
SELECT
  p.nom_produit,
  s.nom_structure,
  ms.type_mouvement,
  ms.quantite,
  ms.raison,
  ms.date_mouvement
FROM mouvement_stock ms
JOIN list_produits p ON ms.id_produit = p.id_produit
JOIN structures s ON ms.id_structure = s.id_structure
WHERE ms.date_mouvement >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ms.date_mouvement DESC
LIMIT 100;
```

### Produits jamais vendus (stock dormant)
```sql
SELECT
  s.nom_structure,
  p.nom_produit,
  p.quantite as stock_actuel,
  p.prix_unitaire,
  (p.quantite * p.prix_unitaire) as valeur_immobilisee
FROM list_produits p
JOIN structures s ON p.id_structure = s.id_structure
WHERE p.actif = true
  AND NOT EXISTS (
    SELECT 1
    FROM detail_facture_com d
    WHERE d.id_produit = p.id_produit
  )
ORDER BY valeur_immobilisee DESC;
```

---

## 👥 ANALYSE CLIENTS

### Top 20 clients par chiffre d'affaires
```sql
SELECT
  c.nom_client,
  c.prenom_client,
  c.tel_client,
  s.nom_structure,
  COUNT(f.id_facture) as nb_factures,
  SUM(f.montant_net) as ca_total,
  SUM(f.reste_a_payer) as total_impayes,
  ROUND(AVG(f.montant_net), 2) as panier_moyen
FROM clients c
JOIN structures s ON c.id_structure = s.id_structure
LEFT JOIN list_factures_com f ON c.id_client = f.id_client
GROUP BY c.id_client, c.nom_client, c.prenom_client, c.tel_client, s.nom_structure
HAVING COUNT(f.id_facture) > 0
ORDER BY ca_total DESC
LIMIT 20;
```

### Clients sans facture depuis 90 jours
```sql
SELECT
  c.nom_client,
  c.tel_client,
  s.nom_structure,
  MAX(f.date_facture) as derniere_facture,
  CURRENT_DATE - MAX(f.date_facture)::date as jours_inactivite
FROM clients c
JOIN structures s ON c.id_structure = s.id_structure
LEFT JOIN list_factures_com f ON c.id_client = f.id_client
GROUP BY c.id_client, c.nom_client, c.tel_client, s.nom_structure
HAVING MAX(f.date_facture) < CURRENT_DATE - INTERVAL '90 days'
ORDER BY jours_inactivite DESC;
```

---

## 🎫 ANALYSE PARTENAIRES ET CODES PROMO

### Utilisation des codes promo
```sql
SELECT
  p.nom_partenaire,
  p.code_promo,
  COUNT(cpu.id_utilisation) as nb_utilisations,
  SUM(cpu.commission_calculee) as total_commissions,
  p.date_validite,
  p.actif
FROM partenaires p
LEFT JOIN codes_promo_utilises cpu ON p.id_partenaire = cpu.id_partenaire
GROUP BY p.id_partenaire, p.nom_partenaire, p.code_promo, p.date_validite, p.actif
ORDER BY nb_utilisations DESC;
```

### Structures inscrites par code promo
```sql
SELECT
  p.nom_partenaire,
  p.code_promo,
  s.nom_structure,
  s.mobile_om,
  cpu.date_utilisation,
  cpu.commission_calculee
FROM codes_promo_utilises cpu
JOIN partenaires p ON cpu.id_partenaire = p.id_partenaire
JOIN structures s ON cpu.id_structure = s.id_structure
ORDER BY cpu.date_utilisation DESC;
```

---

## 💳 ANALYSE WALLET ET TRANSACTIONS

### Historique transactions wallet par structure
```sql
SELECT
  s.nom_structure,
  tw.type_transaction,
  tw.methode,
  tw.montant,
  tw.transaction_id,
  tw.date_transaction,
  tw.statut
FROM transactions_wallet tw
JOIN structures s ON tw.id_structure = s.id_structure
WHERE s.id_structure = 183  -- Remplacer par ID structure
ORDER BY tw.date_transaction DESC
LIMIT 50;
```

### Répartition des paiements par mode
```sql
SELECT
  p.mode_paiement,
  COUNT(*) as nb_paiements,
  SUM(p.montant_paye) as montant_total,
  ROUND(AVG(p.montant_paye), 2) as montant_moyen
FROM paiements p
WHERE p.date_paiement >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY p.mode_paiement
ORDER BY montant_total DESC;
```

### Évolution des soldes wallet
```sql
SELECT
  s.nom_structure,
  ws.solde_om,
  ws.solde_wave,
  ws.solde_free,
  (ws.solde_om + ws.solde_wave + ws.solde_free) as solde_total,
  ws.date_mise_a_jour
FROM wallet_structure ws
JOIN structures s ON ws.id_structure = s.id_structure
WHERE ws.solde_om + ws.solde_wave + ws.solde_free > 0
ORDER BY solde_total DESC;
```

---

## 🔧 MAINTENANCE ET OPTIMISATION

### Taille des tables
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

### Index manquants sur colonnes FK
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  'CREATE INDEX idx_' || tc.table_name || '_' || kcu.column_name ||
  ' ON ' || tc.table_name || '(' || kcu.column_name || ');' as create_index_sql
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
  );
```

### Activité vacuum sur les tables
```sql
SELECT
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum,
  vacuum_count,
  autovacuum_count,
  n_tup_ins as insertions,
  n_tup_upd as updates,
  n_tup_del as deletions
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_upd DESC;
```

### Requêtes lentes (si pg_stat_statements activé)
```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 🛡️ SÉCURITÉ ET AUDIT

### Utilisateurs créés récemment (30 derniers jours)
```sql
-- Requête nécessite colonne date_creation sur utilisateurs
SELECT
  u.username,
  s.nom_structure,
  p.nom_profil,
  u.telephone,
  u.actif
FROM utilisateurs u
JOIN structures s ON u.id_structure = s.id_structure
JOIN profils p ON u.id_profil = p.id_profil
ORDER BY u.id_utilisateur DESC
LIMIT 50;
```

### Structures avec plus de 5 utilisateurs actifs
```sql
SELECT
  s.nom_structure,
  COUNT(u.id_utilisateur) as nb_utilisateurs,
  string_agg(u.username, ', ') as liste_utilisateurs
FROM structures s
JOIN utilisateurs u ON s.id_structure = u.id_structure
WHERE u.actif = true
GROUP BY s.id_structure, s.nom_structure
HAVING COUNT(u.id_utilisateur) > 5
ORDER BY nb_utilisateurs DESC;
```

---

## 📧 SMS ET NOTIFICATIONS

### SMS en attente d'envoi
```sql
SELECT
  id_sms,
  sender,
  client_name,
  phone,
  LEFT(message, 50) as message_preview,
  date_creation,
  statut
FROM pending_sms
WHERE statut = 'PENDING'
ORDER BY date_creation
LIMIT 100;
```

### Statistiques d'envoi de SMS
```sql
SELECT
  statut,
  COUNT(*) as nb_sms,
  MIN(date_creation) as premier_sms,
  MAX(date_creation) as dernier_sms
FROM pending_sms
WHERE date_creation >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY statut;
```

---

## 🔍 RECHERCHES AVANCÉES

### Recherche globale de client par téléphone
```sql
SELECT
  c.nom_client,
  c.prenom_client,
  c.tel_client,
  c.email,
  s.nom_structure,
  s.mobile_om,
  COUNT(f.id_facture) as nb_factures
FROM clients c
JOIN structures s ON c.id_structure = s.id_structure
LEFT JOIN list_factures_com f ON c.id_client = f.id_client
WHERE c.tel_client LIKE '%77123456%'  -- Remplacer par numéro recherché
GROUP BY c.id_client, c.nom_client, c.prenom_client, c.tel_client, c.email, s.nom_structure, s.mobile_om;
```

### Recherche facture par numéro ou montant
```sql
SELECT
  f.numero_facture,
  s.nom_structure,
  c.nom_client,
  f.date_facture,
  f.montant_net,
  f.reste_a_payer,
  f.statut
FROM list_factures_com f
JOIN structures s ON f.id_structure = s.id_structure
JOIN clients c ON f.id_client = c.id_client
WHERE f.numero_facture LIKE '%FAC%'  -- Recherche par numéro
   OR f.montant_net = 15000          -- Recherche par montant exact
ORDER BY f.date_facture DESC;
```

---

## 📊 VUES UTILES À CRÉER

### Vue: Factures avec détails complets
```sql
CREATE OR REPLACE VIEW vw_factures_completes AS
SELECT
  f.id_facture,
  f.numero_facture,
  f.date_facture,
  s.nom_structure,
  s.mobile_om,
  c.nom_client,
  c.prenom_client,
  c.tel_client,
  f.sous_total,
  f.remise,
  f.montant_net,
  f.acompte,
  f.reste_a_payer,
  f.statut,
  CASE
    WHEN f.statut = 'IMPAYEE' AND CURRENT_DATE - f.date_facture::date > 30
    THEN 'RETARD'
    ELSE 'OK'
  END as alerte_paiement
FROM list_factures_com f
JOIN structures s ON f.id_structure = s.id_structure
JOIN clients c ON f.id_client = c.id_client;
```

### Vue: Stock disponible avec alertes
```sql
CREATE OR REPLACE VIEW vw_stock_alerte AS
SELECT
  s.nom_structure,
  p.nom_produit,
  p.quantite,
  p.stock_min,
  p.stock_max,
  p.prix_unitaire,
  (p.quantite * p.prix_unitaire) as valeur_stock,
  CASE
    WHEN p.quantite = 0 THEN 'RUPTURE'
    WHEN p.quantite < p.stock_min THEN 'FAIBLE'
    WHEN p.quantite > p.stock_max THEN 'SURSTOCKAGE'
    ELSE 'NORMAL'
  END as statut_stock
FROM list_produits p
JOIN structures s ON p.id_structure = s.id_structure
WHERE p.actif = true;
```

---

## 🎯 REQUÊTES DE CORRECTION/NETTOYAGE

### Recalculer le reste_a_payer des factures
```sql
UPDATE list_factures_com
SET reste_a_payer = montant_net - acompte
WHERE reste_a_payer != (montant_net - acompte);
```

### Mettre à jour le statut des factures selon acompte
```sql
UPDATE list_factures_com
SET statut = CASE
  WHEN acompte = 0 THEN 'IMPAYEE'
  WHEN acompte >= montant_net THEN 'PAYEE'
  ELSE 'PAYEE_PARTIELLE'
END
WHERE statut != CASE
  WHEN acompte = 0 THEN 'IMPAYEE'
  WHEN acompte >= montant_net THEN 'PAYEE'
  ELSE 'PAYEE_PARTIELLE'
END;
```

### Désactiver les structures sans abonnement actif
```sql
-- ATTENTION: Requête destructive, tester d'abord avec SELECT
SELECT s.nom_structure, s.actif
FROM structures s
WHERE NOT EXISTS (
  SELECT 1
  FROM abonnements_structure a
  WHERE a.id_structure = s.id_structure
    AND a.statut = 'ACTIF'
    AND a.date_fin >= CURRENT_DATE
)
AND s.actif = true;

-- Puis exécuter la mise à jour:
-- UPDATE structures SET actif = false WHERE ...
```

---

**Document maintenu par**: DBA PostgreSQL Expert
**Dernière mise à jour**: 2026-01-21
**Version**: 1.0

**⚠️ AVERTISSEMENT**:
- Toujours tester les requêtes UPDATE/DELETE sur un environnement de test avant production
- Faire un backup avant toute opération de masse
- Les requêtes avec LIMIT sont recommandées pour les premières analyses
