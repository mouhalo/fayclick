# 📚 Documentation Base de Données fayclick_db

> **Documentation DBA PostgreSQL Complète**
> Dernière mise à jour: 2026-01-21

---

## 📁 Fichiers Disponibles

### 1. 📊 [TABLES_REELLES_FAYCLICK_DB.md](./TABLES_REELLES_FAYCLICK_DB.md)
**Documentation complète et détaillée de toutes les tables**

**Contenu**:
- Liste exhaustive des 35+ tables principales
- Description détaillée de chaque table (colonnes, types, contraintes)
- Fonctions PostgreSQL associées (~80 fonctions)
- Relations et Foreign Keys
- Extensions PostgreSQL utilisées (pgvector)
- Recommandations d'optimisation (index, partitionnement)

**Utilisation**: Référence technique complète pour comprendre la structure de la base.

---

### 2. 📝 [LISTE_TABLES_SIMPLE.txt](./LISTE_TABLES_SIMPLE.txt)
**Liste simple et visuelle des tables (format texte ASCII)**

**Contenu**:
- Liste des 30 tables principales regroupées par catégorie
- Top 20 fonctions PostgreSQL critiques
- Index recommandés pour optimisation
- Tableau de référence rapide

**Utilisation**: Référence rapide imprimable ou consultation terminal.

---

### 3. 🗂️ [SCHEMA_RELATIONNEL.md](./SCHEMA_RELATIONNEL.md)
**Diagramme complet des relations entre tables**

**Contenu**:
- Architecture globale en 9 niveaux
- Diagrammes ASCII des relations (ERD)
- Cardinalités détaillées (1:N, N:1, N:N)
- Contraintes d'intégrité (UNIQUE, CHECK, NOT NULL)
- Triggers potentiels
- Vues matérialisées suggérées

**Utilisation**: Comprendre visuellement l'architecture et les dépendances.

---

### 4. 🔧 [REQUETES_SQL_UTILES.md](./REQUETES_SQL_UTILES.md)
**Collection de requêtes SQL prêtes à l'emploi**

**Contenu**:
- 50+ requêtes SQL catégorisées:
  - Statistiques globales
  - Diagnostics et santé
  - Analyses financières
  - Gestion des stocks
  - Analyse clients
  - Partenaires et codes promo
  - Wallet et transactions
  - Maintenance et optimisation
  - Sécurité et audit
  - SMS et notifications
  - Recherches avancées
- Vues utiles à créer
- Requêtes de correction/nettoyage

**Utilisation**: Copy/paste pour administration quotidienne.

---

## 🎯 Guide d'Utilisation Rapide

### Pour un nouveau développeur
1. Lire **TABLES_REELLES_FAYCLICK_DB.md** (sections 1-3)
2. Consulter **SCHEMA_RELATIONNEL.md** pour comprendre les relations
3. Garder **LISTE_TABLES_SIMPLE.txt** sous la main

### Pour un administrateur DBA
1. Consulter **REQUETES_SQL_UTILES.md** quotidiennement
2. Utiliser **SCHEMA_RELATIONNEL.md** pour diagnostiquer les problèmes de performance
3. Référencer **TABLES_REELLES_FAYCLICK_DB.md** pour les détails techniques

### Pour un analyste de données
1. Utiliser **REQUETES_SQL_UTILES.md** (sections Analyses financières, Analyse clients)
2. Créer des vues personnalisées basées sur les exemples fournis
3. Référencer **SCHEMA_RELATIONNEL.md** pour comprendre les jointures

---

## 📊 Statistiques de la Base

| Métrique | Valeur |
|----------|--------|
| **Tables principales** | ~35 tables |
| **Vues (views)** | ~5 vues |
| **Fonctions PostgreSQL** | ~80 fonctions |
| **Schéma principal** | `public` |
| **Extensions** | pgvector (embeddings IA) |
| **SGBD** | PostgreSQL 14+ |

---

## 🔑 Tables Critiques (Top 10)

### Par volume de données
1. **list_factures_com** - Factures (forte volumétrie)
2. **detail_facture_com** - Lignes de facture (très forte volumétrie)
3. **paiements** - Historique paiements (croissance continue)
4. **mouvement_stock** - Mouvements de stock (historique)
5. **transactions_wallet** - Transactions wallet (croissance continue)

### Par importance fonctionnelle
1. **structures** - Noyau central (tout dépend d'elle)
2. **utilisateurs** - Authentification et permissions
3. **clients** - Base commerciale
4. **list_produits** - Catalogue produits
5. **wallet_structure** - Gestion financière

---

## 🛠️ Maintenance Recommandée

### Quotidienne
- Vérifier les factures impayées > 30 jours
- Surveiller les produits en rupture de stock
- Vérifier les SMS en attente (`pending_sms`)

### Hebdomadaire
- Analyser les abonnements expirant dans 7 jours
- Vérifier la taille des tables principales
- Analyser les requêtes lentes (pg_stat_statements)

### Mensuelle
- VACUUM ANALYZE sur tables volumineuses
- Vérifier les index manquants sur FK
- Analyser les statistiques d'utilisation des codes promo
- Contrôler l'évolution des soldes wallet

### Trimestrielle
- Archiver les données anciennes (> 2 ans)
- Revoir les index et optimiser
- Analyser les partitions si mises en place
- Audit de sécurité complet

---

## 🚀 Optimisations Prioritaires

### Index à créer immédiatement
```sql
-- Copier depuis REQUETES_SQL_UTILES.md
CREATE INDEX idx_factures_structure_date ON list_factures_com(id_structure, date_facture);
CREATE INDEX idx_produits_structure_actif ON list_produits(id_structure, actif);
CREATE INDEX idx_clients_structure_tel ON clients(id_structure, tel_client);
CREATE INDEX idx_paiements_facture ON paiements(id_facture);
CREATE INDEX idx_transactions_wallet ON transactions_wallet(id_structure, date_transaction);
```

### Partitionnement recommandé
- **list_factures_com** - Par année (`PARTITION BY RANGE (EXTRACT(YEAR FROM date_facture))`)
- **transactions_wallet** - Par mois (`PARTITION BY RANGE (date_transaction)`)
- **mouvement_stock** - Par trimestre

### Vacuum automatique
```sql
-- Configuration autovacuum pour tables critiques
ALTER TABLE list_factures_com SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE paiements SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE transactions_wallet SET (autovacuum_vacuum_scale_factor = 0.05);
```

---

## 🔗 Liens Utiles

### Documentation PostgreSQL
- [PostgreSQL 14 Documentation](https://www.postgresql.org/docs/14/)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)

### Outils DBA
- pgAdmin 4
- DBeaver
- psql (CLI)

---

## 📞 Support DBA

### En cas de problème
1. Consulter **REQUETES_SQL_UTILES.md** (section Diagnostics)
2. Analyser les logs PostgreSQL
3. Vérifier l'activité vacuum
4. Contacter le DBA senior

### Alertes critiques
- Rupture de stock (notification immédiate)
- Abonnement expiré (bloquer l'accès)
- Wallet négatif (erreur critique)
- Factures > 90 jours impayées (relance client)

---

## 📝 Historique des Modifications

| Date | Version | Modifications |
|------|---------|---------------|
| 2026-01-21 | 1.0 | Création initiale de la documentation complète |

---

**Maintenu par**: DBA PostgreSQL Expert
**Contact**: (Ajouter email/contact DBA)
**Dernière révision**: 2026-01-21
