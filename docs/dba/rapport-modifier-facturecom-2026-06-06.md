# Schéma BD — Module modification vente du jour v1.1

**Date** : 2026-06-06
**DBA** : dba_master
**PRD** : `docs/prd-modification-vente-jour-2026-06-06.md`
**Statut** : Déployé en prod `fayclick_db` — Phase 1a validée

---

## Vue d'ensemble

Permet à un caissier de modifier les articles et la remise d'une vente commerce **payée du jour**, sans mot de passe administrateur, avec :
- Garde-fou date côté serveur (ventes antérieures immuables)
- Recalcul automatique du paiement (complément CASH ou monnaie à rendre)
- Journalisation append-only complète (snapshot avant/après)
- Correction stock delta net par produit (zéro double-comptage)

Périmètre V1 : Commerce uniquement. Ventes payées (`id_etat=2`) du jour uniquement.

---

## Objets déployés

### Table `log_modifications_factures`

| Colonne | Type | Null | Description |
|---|---|---|---|
| id | serial | NO | PK |
| id_structure | integer | NO | Structure concernée |
| id_facture | integer | NO | Facture modifiée (pas de FK CASCADE — intentionnel) |
| num_facture | varchar(25) | YES | Numéro conservé pour lisibilité |
| id_utilisateur | integer | NO | Auteur de la modification |
| login_user | varchar(100) | YES | Login au moment de la modif |
| nom_client_payeur | varchar(150) | YES | Client |
| montant_avant | numeric(10,2) | YES | Brut avant |
| remise_avant | numeric(10,2) | YES | Remise avant |
| acompte_avant | numeric(10,2) | YES | Acompte (= net payé) avant |
| articles_avant | jsonb | YES | Snapshot lignes avant `[{id_produit, quantite, prix, sous_total}]` |
| montant_apres | numeric(10,2) | YES | Brut après (recalculé par trigger) |
| remise_apres | numeric(10,2) | YES | Remise après |
| acompte_apres | numeric(10,2) | YES | Acompte après (= net payé après) |
| articles_apres | jsonb | YES | Snapshot lignes après |
| ecart_net | numeric(10,2) | YES | `net_apres - net_avant` (>0 complément, <0 remboursement) |
| type_ajustement | varchar(20) | YES | `'COMPLEMENT'` \| `'REMBOURSEMENT'` \| `'AUCUN'` |
| tms_modification | timestamp | NO | Horodatage (default NOW()) |

**Index** :
- `idx_log_mod_fac_structure` sur `(id_structure, tms_modification DESC)` — requêtes rapport admin
- `idx_log_mod_fac_user` sur `(id_utilisateur, tms_modification DESC)` — audit par caissier

**Volumétrie estimée** : faible (quelques dizaines de lignes/jour/structure). Pas de partition prévue en V1.

**Pas de FK cascadante sur `id_facture`** : intentionnel — le log survit à la suppression de la facture (intégrité d'audit).

---

## Fonction PL/pgSQL exposée au backend

### `modifier_facturecom(pid_structure, pid_facture, pid_utilisateur, p_articles_string, p_mt_remise) RETURNS json`

**But** : Modifier in-place une facture commerce payée du jour. Conserve `id_facture` et `num_facture`.

**Paramètres** :

| Nom | Type | Description |
|---|---|---|
| pid_structure | integer | ID structure (vérification d'appartenance) |
| pid_facture | integer | ID de la facture à modifier |
| pid_utilisateur | integer | ID utilisateur (`utilisateur.id`) — doit être actif dans la structure |
| p_articles_string | varchar | Nouveaux articles, format `"id-qty-prix#id-qty-prix#..."` (identique à `create_facture_complete1`) |
| p_mt_remise | numeric | Nouvelle remise globale (0 si inchangée) |

**Retour succès** :
```json
{
  "success": true,
  "id_facture": 154466,
  "num_facture": "FAC-202606-218-0348",
  "net_avant": 2500,
  "net_apres": 3500,
  "ecart": 1000,
  "type_ajustement": "COMPLEMENT",
  "complement_a_encaisser": 1000,
  "monnaie_a_rendre": 0,
  "message": "Vente modifiee avec succes",
  "timestamp_operation": "2026-06-06T19:55:21.855Z"
}
```

**Retour erreur** :
```json
{
  "success": false,
  "code": "DATE_LOCKED",
  "message": "Seules les ventes du jour sont modifiables",
  "step": "DATE_GUARD"
}
```

**Codes d'erreur** :

| Code | Déclencheur |
|---|---|
| `INVOICE_NOT_FOUND` | `id_facture` introuvable |
| `INVOICE_WRONG_STRUCTURE` | Facture n'appartient pas à `pid_structure` |
| `DATE_LOCKED` | `date_facture <> CURRENT_DATE` (vente antérieure) |
| `NOT_PAID` | `id_etat <> 2` (vente non payée) |
| `INVOICE_REVERSED` | `mt_reverser = true` (déjà reversée) |
| `USER_NOT_FOUND` | Utilisateur introuvable ou inactif dans la structure |
| `EMPTY_ARTICLES` | `p_articles_string` vide ou null |
| `INVALID_ARTICLE_FORMAT` | Format `id-qty-prix` non respecté, ou valeurs négatives |
| `INVALID_REMISE` | `p_mt_remise < 0` ou `>= sous-total` |
| `MODIFICATION_ERROR` | Exception PG inattendue (rollback automatique) |

**Exemple d'appel** :
```sql
SELECT modifier_facturecom(218, 154466, 249, '138757-4-500#138759-1-1500', 0);
```

**Comportement transactionnel** : Tout-ou-rien. Si une étape échoue, rollback complet — aucune écriture partielle. Le log n'est écrit que si toutes les mutations ont réussi.

---

## Interactions avec l'existant (triggers)

| Trigger | Table | Événement | Rôle dans modifier_facturecom |
|---|---|---|---|
| `recalculer_montant_facture` | `detail_facture_com` | INSERT/UPDATE/DELETE | Recalcule `facture_com.montant` automatiquement après chaque mutation de ligne |
| `detail_facture_stock_trig` | `detail_facture_com` | AFTER INSERT uniquement | Écrit SORTIE stock automatiquement pour les nouveaux produits ajoutés — ne pas doubler avec un mouvement manuel |
| `trg_historique_paiement_acompte` | `facture_com` | AFTER UPDATE | S'active uniquement si `mt_acompte` augmente (cas COMPLEMENT) — correct, pas de ligne parasite en REMBOURSEMENT |

---

## Convention stock — delta net par produit

Stock = somme des mouvements (confirmé audit Phase 0 — aucun solde caché sur `produit_service`).

| Cas | Action SQL | Mouvement stock |
|---|---|---|
| Produit retiré | DELETE ligne | INSERT ENTREE manuel (quantite originale) |
| Produit conservé, qte++ | UPDATE ligne | INSERT SORTIE manuel (delta = qte_new - qte_old) |
| Produit conservé, qte-- | UPDATE ligne | INSERT ENTREE manuel (delta absolu) |
| Produit conservé, delta=0 | UPDATE ligne (prix peut changer) | Aucun mouvement |
| Nouveau produit | INSERT ligne | Trigger SORTIE auto — pas de mouvement manuel |

`created_by` des mouvements compensatoires : `'MODIF-{login}'` (traçabilité caissier).

---

## Notes opérationnelles

**Backup** : Objets additifs, non destructifs. Aucun objet existant modifié. Rollback possible par DROP TABLE/FUNCTION sans impact sur l'existant.

**Fuseau horaire** : Serveur PostgreSQL en UTC. Sénégal = GMT+0 (aucun décalage saisonnier). `CURRENT_DATE` côté serveur est rigoureusement synchrone avec l'heure locale Dakar. Garde-fou `date_facture = CURRENT_DATE` fiable sans correction.

**Stock négatif** : Autorisé (aligné sur le comportement de `gere_stock` existant). Vérification de stock disponible à faire côté frontend avant soumission (pattern existant dans `venteflash`).

**Limite duplicate `reference_trx`** : Le trigger `trg_prevent_duplicate_reference_trx` sur `journal_compte` peut rejeter deux modifications de la même facture dans la même milliseconde. Format `MODIF-{struct}-{fac}-{epoch_ms}` rend ce cas pratiquement impossible. Acceptable V1.

**Évolutions prévues (V2)** :
- Écran « Modifications du jour » admin depuis `log_modifications_factures`
- Extension aux ventes partiellement payées (acompte)
- Extension aux autres types de structure si besoin

---

## Rapport de test E2E (Phase 1a)

**Date** : 2026-06-06 19:55 UTC
**Structure** : 218 — LIBRAIRIE CHEZ KELEFA
**Facture** : FAC-202606-218-0348 (id=154466)

**Scénario** : P1 conservé qte 2→4 / P2 retiré / P3 nouveau qte=1 / remise=0

| Critère PRD | Résultat |
|---|---|
| num_facture conservé | FAC-202606-218-0348 — inchangé |
| mt_restant=0 après modif | 0.00 |
| id_etat=2 (PAYEE) | 2 |
| Stock P1 delta net | SORTIE 2 (création) + SORTIE 2 (delta) = net SORTIE 4 |
| Stock P2 net=0 | SORTIE 1 (création) + ENTREE 1 (retour) = net 0 |
| Stock P3 via trigger | SORTIE 1 (trigger INSERT auto) |
| Zéro double-comptage | Confirmé |
| Ledger append-only | recus_paiement : 2 lignes (2500 initial + 1000 COMPLEMENT) |
| journal_compte | mt_credit=1000, mt_debit=0 |
| numero_telephone | 771234218 (tel_client, pas nom_client) |
| log_modifications_factures | 1 ligne, snapshots avant/après cohérents |
| Rejet DATE_LOCKED | code=DATE_LOCKED, success=false sur facture du 05/06 |
| Rejet NOT_PAID | Garde en place (non testable en live, pas d'impayée du jour sur 218) |
| Nettoyage | Facture jouet supprimée via supprimer_facturecom_admin |
