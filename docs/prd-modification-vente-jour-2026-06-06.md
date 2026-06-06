# PRD — Modification d'une vente payée du jour

- **Date** : 2026-06-06
- **Statut** : Validé pour implémentation
- **Branche cible** : `feature/modification-vente-jour` (à créer depuis `main` ou la branche courante)
- **Approche retenue** : A — fonction PostgreSQL atomique `modifier_facturecom` (édition in-place, `num_facture` conservé)

---

## 1. Contexte & problème

Les caissiers utilisent deux flux de vente :
- **VenteFlash** (`/dashboard/commerce/venteflash`) — client anonyme, encaissement CASH immédiat.
- **Vente depuis panier Produits** (`/dashboard/commerce/produits`) — vente client classique.

Une fois la vente **enregistrée et payée**, il n'existe **aucun moyen de la modifier**. Si le client veut retirer ou ajouter des articles juste après, le caissier est obligé de **supprimer la vente et d'en refaire une nouvelle** — perte de temps, perte du numéro de facture, risque d'erreur, et passage par la suppression admin (mot de passe).

### Besoin exprimé (verbatim)
> « Une fonctionnalité permettant de pouvoir modifier une vente enregistrée et payée mais qui ne doit jamais dépasser la date du jour afin de protéger les ventes antérieures de toute fraude. »

### Garde-fou central
La modification est **strictement limitée aux ventes dont `date_facture = date du jour`**. Les ventes des jours antérieurs sont immuables (protection anti-fraude). Ce contrôle est appliqué **côté serveur** dans la fonction PostgreSQL, pas seulement dans l'UI.

---

## 2. Objectifs

- Permettre au caissier de **modifier les articles** (ajout, retrait, changement de quantité) et **la remise globale** d'une vente **payée du jour**.
- Recalculer automatiquement le montant net et **réconcilier le paiement** : complément CASH à encaisser si le total monte, monnaie à rendre si le total baisse. La vente **reste « payée »** (`mt_restant = 0`).
- **Conserver `id_facture` et `num_facture`** (le client a déjà son reçu/numéro).
- **Journaliser** chaque modification (snapshot avant/après, qui, quand) de manière append-only.
- Réconcilier le **stock** correctement (delta net par produit).

### Hors périmètre (cette V1)
- ❌ Modification du **client** (nom/téléphone) ou de la **méthode de paiement**.
- ❌ Modification d'une vente d'un **jour antérieur**.
- ❌ Modification de ventes **non payées** (impayées/acompte partiel) — réservé éventuellement à une itération ultérieure ; cette V1 cible les ventes **payées**.
- ❌ **Écran de revue quotidienne des modifications** (reporté en **V2** — voir §10). La V1 se limite au journal en base.
- ❌ Modification des **factures privées** / autres types de structures (Scolaire, Immobilier, Services). Périmètre = **Commerce**.

---

## 3. Décisions de cadrage (validées)

| Décision | Choix retenu |
|---|---|
| **Périmètre de modification** | Articles (ajout / retrait / quantité) **+ remise globale** |
| **Réconciliation paiement** | Recalcul auto → **complément CASH** (total ↑) ou **monnaie à rendre** (total ↓). Vente reste **payée**. |
| **Autorisation** | **Caissier libre** (sans mot de passe) **+ journalisation systématique**. Garde-fou = `date_facture = CURRENT_DATE`. |
| **Point d'entrée / UX** | Bouton **« Modifier »** sur la facture du jour → **réouverture du panier** d'origine pour ajustement. |
| **Mitigation anti-fraude V1** | **Journal append-only seul** (snapshot complet avant/après). Écran de revue → V2. |
| **Mécanisme** | **Approche A** : fonction PG `modifier_facturecom` atomique, in-place. |

---

## 4. État des lieux technique (faits vérifiés en base de prod)

### 4.1 Tables concernées

**`facture_com`** (en-tête facture commerce) — colonnes clés :

| Colonne | Type | Note |
|---|---|---|
| id_facture | integer (PK) | conservé lors de la modif |
| num_facture | varchar(25) | conservé lors de la modif |
| id_structure | integer | |
| date_facture | date (def. CURRENT_DATE) | **base du garde-fou** |
| nannee, nmois | integer | |
| nom_client_payeur | varchar(150) | |
| montant | numeric | **convention = brut (SUM quantite×prix)** via trigger |
| mt_remise | numeric | |
| mt_acompte | numeric | |
| mt_restant | numeric | |
| id_etat | integer (def. 1) | FK `etat_facture` |
| numrecu | varchar(75) | |
| tms_update | varchar | |
| id_utilisateur | integer | |

**`detail_facture_com`** (lignes) : `id_facture`, `id_produit`, `quantite` (real), `prix` (numeric).

**`mouvement_stock`** : `id_produit`, `id_structure`, `type_mouvement` (`'ENTREE'` / `'SORTIE'`), `date_mouvement`, `quantite`, `prix_unitaire` (real), `description`, `tms_create`, `created_by`.

**`produit_service`** : `id_produit`, `id_structure`, `nom_produit`.

**`etat_facture`** : `1 = IMPAYEE`, `2 = PAYEE` (deux états seulement — pas d'état ACOMPTE intermédiaire ; un partiel reste `id_etat = 1`).

**Ledger de paiement** (écrit par `add_acompte_facture`) :
- `journal_compte` : `date_journal`, `id_structure`, `reference_trx`, `mt_credit` (double), `mt_debit` (double), `uuid_trx`, …
- `recus_paiement` : `id_recu`, `id_facture`, `id_structure`, `numero_recu` (`'REC-{struct}-{fac}-{epoch_ms}'`), `methode_paiement`, `montant_paye`, `reference_transaction`, `numero_telephone`, `date_paiement`, `date_creation`.
- `historique_paiement` : alimentée **automatiquement** par le trigger `trg_historique_paiement_acompte` (AFTER UPDATE sur `facture_com`) **uniquement quand `mt_acompte` augmente**.

### 4.2 Triggers existants (déterminants pour le design)

- **`recalculer_montant_facture()`** — sur `detail_facture_com` INSERT/UPDATE/DELETE → recalcule `montant = SUM(quantite×prix)` et `mt_restant = montant - mt_remise - mt_acompte` sur `facture_com`. ✅ **Atout** : l'en-tête se met à jour automatiquement quand on touche les lignes.
- **`detail_facture_stock_trigger()`** — sur `detail_facture_com` **AFTER INSERT uniquement** → `gere_stock(id_structure, id_produit, 'SORTIE', quantite, prix, 'Vente - Facture {num}')`. ⚠️ **Ne se déclenche PAS en UPDATE/DELETE.**

### 4.3 Référence : suppression admin (pattern à calquer)

`supprimer_facturecom_admin` (déjà en prod) : vérifie profil/mdp, **snapshot articles en JSONB**, **INSERT dans `log_suppressions_factures` AVANT suppression**, **boucle INSERT mouvement ENTREE** (retour stock) ligne par ligne, puis DELETE CASCADE. → `modifier_facturecom` reprend ce squelette (snapshot + log + mouvements stock explicites).

---

## 5. ⚠️ Contraintes & pièges à neutraliser (exigences)

> Ces points sont issus de l'audit base et **doivent** être respectés par l'implémentation.

1. **Stock = delta net par produit, mouvement compensatoire explicite.**
   Le trigger SORTIE ne s'active qu'à l'INSERT. UPDATE/DELETE d'une ligne ne compense rien. La fonction doit calculer, **par produit**, `delta = quantité_nouvelle − quantité_ancienne` puis écrire **un seul** mouvement compensatoire par produit (`'SORTIE'` si delta > 0, `'ENTREE'` si delta < 0). **Interdiction** de supprimer les mouvements SORTIE d'origine (cf. bug historique des 230 mouvements orphelins, 21/04/2026). **Insert-avant-mutation**, jamais reverse-all-then-reapply.
   - ⚠️ **Interaction trigger INSERT** : si la fonction réécrit les lignes via DELETE+INSERT, le trigger SORTIE se redéclenchera sur les INSERT. Le DBA doit choisir la technique qui évite le double-comptage (ex. : manipuler les lignes via `UPDATE` quand possible + appliquer le delta net manuellement ; ou neutraliser/contourner proprement le trigger durant l'opération ; ou recalculer le delta en tenant compte des SORTIE auto-générées). **À trancher et documenter par le DBA**, avec test de non-régression stock.
   - 🔬 **INVESTIGATION BLOQUANTE AVANT CODAGE DBA — convention `gere_stock` vs INSERT brut.** Deux conventions divergent dans l'existant : `create_facture_complete1` écrit le stock via **`gere_stock(...)`** (trigger), tandis que `supprimer_facturecom_admin` insère **en brut** dans `mouvement_stock` (sans `gere_stock`). **Question discriminante à résoudre par le DBA** : *`gere_stock` maintient-il un solde caché (colonne `stock_actuel` / table de balance) EN PLUS d'insérer le mouvement, ou le stock est-il toujours calculé en sommant `mouvement_stock` ?*
     - Si **stock = somme des mouvements** → l'INSERT brut (comme admin-delete) est canonique → `modifier_facturecom` insère en brut.
     - Si **solde caché maintenu** → `modifier_facturecom` **DOIT** passer par `gere_stock`, **et** `supprimer_facturecom_admin` a un **bug latent** (depuis avril 2026) à signaler/corriger.
     Ce point **change la spec §6.2 step 7** et doit être tranché **avant** toute écriture SQL.
   - 🔬 **Spike DBA recommandé** : choisir **UNE** technique stock et la **prouver** (test `mouvement_stock` + solde avant/après sur une facture jouet) **avant** le build complet, pas en intégration. Piste la plus propre vu le trigger INSERT-only : `UPDATE` les lignes des produits conservés (pas de trigger) + delta manuel ; `INSERT` uniquement les produits réellement nouveaux (SORTIE auto) ; `ENTREE` manuel pour les produits retirés. Le DBA tranche, mais **avant**.

2. **Ne PAS réutiliser `add_acompte_facture` pour la réconciliation.**
   Cette fonction contient `UPDATE facture_com SET montant = montant - mt_remise` (resoustrait la remise du montant à chaque appel) — incohérent avec la convention `montant = brut` du trigger de recalcul. `modifier_facturecom` gère `mt_acompte` / `mt_restant` / `id_etat` **directement**, en s'appuyant sur le trigger `recalculer_montant_facture` pour le `montant` brut, et écrit lui-même les lignes ledger.

3. **Garde-fou date côté serveur.**
   `IF date_facture <> CURRENT_DATE THEN RETURN erreur`. Vérifier le **fuseau du serveur DB** (Sénégal = GMT/UTC±0) pour la bascule de minuit. Le bouton UI est un confort, **pas** la protection.

4. **Atomicité.** Toute l'opération dans une seule transaction PG. `id_facture` / `num_facture` conservés.

5. **Ledger append-only.** Complément → nouvelle ligne `recus_paiement` (méthode CASH) + `journal_compte` (crédit). Remboursement (monnaie à rendre) → ligne d'ajustement **négative** dans `recus_paiement` (ou ligne dédiée) + `journal_compte` (débit). **Jamais** de mutation muette d'une ligne de reçu existante.

6. **Journal de modification obligatoire**, écrit **dans la même transaction**, snapshot **avant et après**.

---

## 6. Spécification — Backend (PostgreSQL)

> Propriété **DBA** (`dba_master`). DDL + fonction livrés via le process habituel (dump SQL + doc Markdown + liste signée des fonctions).

### 6.1 Nouvelle table `log_modifications_factures`

Calquée sur `log_suppressions_factures` :

```sql
CREATE TABLE IF NOT EXISTS public.log_modifications_factures (
    id              SERIAL PRIMARY KEY,
    id_structure    INTEGER      NOT NULL,
    id_facture      INTEGER      NOT NULL,
    num_facture     VARCHAR(25),
    id_utilisateur  INTEGER      NOT NULL,
    login_user      VARCHAR(100),
    nom_client_payeur VARCHAR(150),
    -- AVANT
    montant_avant   NUMERIC(10,2),
    remise_avant    NUMERIC(10,2),
    acompte_avant   NUMERIC(10,2),
    articles_avant  JSONB,
    -- APRES
    montant_apres   NUMERIC(10,2),
    remise_apres    NUMERIC(10,2),
    acompte_apres   NUMERIC(10,2),
    articles_apres  JSONB,
    -- RECONCILIATION
    ecart_net       NUMERIC(10,2),   -- net_apres - net_avant (>0 complément, <0 remboursement)
    type_ajustement VARCHAR(20),     -- 'COMPLEMENT' | 'REMBOURSEMENT' | 'AUCUN'
    tms_modification TIMESTAMP   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_log_mod_fac_structure ON public.log_modifications_factures(id_structure, tms_modification DESC);
CREATE INDEX IF NOT EXISTS idx_log_mod_fac_user      ON public.log_modifications_factures(id_utilisateur, tms_modification DESC);
```

### 6.2 Fonction `modifier_facturecom`

**Signature proposée** (à finaliser par le DBA) :
```sql
modifier_facturecom(
    pid_structure    integer,
    pid_facture      integer,
    pid_utilisateur  integer,
    p_articles_string varchar,   -- format "id-qty-prix#" (identique à create_facture_complete1)
    p_mt_remise      numeric
) RETURNS json
```

**Algorithme (transaction unique) :**
1. Récupérer la facture ; vérifier `id_structure` cohérent → sinon erreur `INVOICE_WRONG_STRUCTURE`.
2. **Garde-fou** : `date_facture = CURRENT_DATE` → sinon erreur `DATE_LOCKED` (« Seules les ventes du jour sont modifiables »).
3. Vérifier que la vente est **payée** (`id_etat = 2`) → sinon erreur `NOT_PAID` (V1 ciblée payées).
4. Récupérer login utilisateur (`utilisateur` actif, même structure).
5. **Snapshot AVANT** : articles (JSONB), `montant`, `mt_remise`, `mt_acompte`, `mt_restant`. Calculer `net_avant = montant_brut_avant - mt_remise_avant` ; `paye_avant = mt_acompte_avant`.
6. Parser `p_articles_string` → nouvelles lignes. Calculer, **par produit**, le **delta net de quantité** vs lignes actuelles.
7. **Mouvements stock compensatoires** : pour chaque produit avec delta ≠ 0, un mouvement `mouvement_stock` (`SORTIE` si delta>0, `ENTREE` si delta<0), `description = 'Modification vente - Facture {num}'`, `created_by = 'MODIF-{login}'`. (Coordonner avec le trigger INSERT — cf. §5.1.)
8. Remplacer les lignes `detail_facture_com` selon la technique retenue (sans double stock).
9. Appliquer `mt_remise = p_mt_remise`. Le trigger recalcule `montant` (brut) et `mt_restant`. Calculer `net_apres = montant_brut_apres - p_mt_remise`.
10. **Réconciliation paiement** pour rester payée (`mt_restant = 0`, `id_etat = 2`) :
    - `ecart = net_apres - paye_avant`.
    - Si `ecart > 0` (**complément**) : `mt_acompte = net_apres` ; INSERT `recus_paiement` (méthode `'CASH'`, montant = `ecart`, ref `'MODIF-{struct}-{fac}-{epoch}'`) + `journal_compte` (crédit = `ecart`). `type_ajustement='COMPLEMENT'`.
    - Si `ecart < 0` (**remboursement / monnaie à rendre**) : `mt_acompte = net_apres` ; INSERT `recus_paiement` (montant = `ecart` négatif) + `journal_compte` (débit = `|ecart|`). `type_ajustement='REMBOURSEMENT'`.
    - Si `ecart = 0` : aucun mouvement ledger. `type_ajustement='AUCUN'`.
    - Forcer `mt_restant = 0`, `id_etat = 2`, `tms_update = NOW()`.
11. **INSERT `log_modifications_factures`** (avant + après + écart + type).
12. Retour JSON :
```json
{
  "success": true,
  "id_facture": 731,
  "num_facture": "FAC-202606-183-0042",
  "net_avant": 4750,
  "net_apres": 5500,
  "ecart": 750,
  "type_ajustement": "COMPLEMENT",
  "complement_a_encaisser": 750,
  "monnaie_a_rendre": 0,
  "message": "Vente modifiée avec succès"
}
```
13. `EXCEPTION WHEN OTHERS` → rollback implicite + JSON `{success:false, code:'MODIFICATION_ERROR', sql_state, message}`.

**Codes d'erreur** : `INVOICE_NOT_FOUND`, `INVOICE_WRONG_STRUCTURE`, `DATE_LOCKED`, `NOT_PAID`, `USER_NOT_FOUND`, `EMPTY_ARTICLES`, `INVALID_REMISE` (remise > sous-total), `MODIFICATION_ERROR`.

---

## 7. Spécification — Frontend

> Propriété **kader_backend** (service) + **fullstack-web-expert** (UI/UX), sous coordination du **chef de projet IT**.

### 7.1 Service — `services/facture.service.ts`

Nouvelle méthode :
```ts
async modifierFacture(
  idFacture: number,
  articles: ArticlePanier[],
  nouvelleRemise: number
): Promise<ModifierFactureResponse>
```
- Construit `p_articles_string` au format `"id-qty-prix#"` (réutiliser la logique de `createFacture`).
- Appelle `SELECT * FROM modifier_facturecom(...)`.
- Parse JSON (vérifier `typeof === 'string'` avant `JSON.parse`).
- Type `ModifierFactureResponse` dans `types/facture.ts` (success, id_facture, num_facture, net_avant, net_apres, ecart, type_ajustement, complement_a_encaisser, monnaie_a_rendre, message).

### 7.2 Conditions d'affichage du bouton « Modifier »

Sur la **FactureCard** (liste factures `/dashboard/commerce/factures`) et le **reçu VenteFlash** :
- Visible **uniquement si** : `libelle_etat === 'PAYEE'` **ET** `date_facture === aujourd'hui` (comparaison locale, le serveur reste l'autorité).
- Placement : à côté/à la place du bouton « Reçu »/« Imprimer » existant (à arbitrer UX pour ne pas surcharger la carte).

### 7.3 Flux d'édition (réouverture panier)

1. Clic « Modifier » → charge les détails de la facture (`getFactureDetails` / `getMyFactures(id)`).
2. **Préremplit le panier d'origine** selon l'origine :
   - Facture issue de VenteFlash → store `panierVFMultiStore`.
   - Facture issue du panier Produits → store `panierStore`.
   - ℹ️ **Routing à nommer explicitement** : déterminer l'origine (heuristique : client anonyme + CASH ⇒ VenteFlash, sinon panier Produits ; ou stocker l'origine). À défaut d'info fiable, **route par défaut vers le panier Produits** depuis la liste Factures. **Point à valider en implémentation.**
3. Le panier passe en **mode édition** (`editFactureId` dans le store) : badge « Modification vente {num} », bouton de validation renommé « Enregistrer les modifications ».
   - ⚠️ **EXIGENCE — collision avec le panier en cours.** Réouvrir le panier d'origine **écraserait une vente en cours** si le caissier a déjà un panier non vide au moment du clic « Modifier » → **perte de données silencieuse en caisse**. La V1 doit traiter ce cas, au choix (à valider en implémentation) :
     - (a) Détecter panier non vide → **avertir** le caissier (modal de confirmation) et **sauvegarder/restaurer** le panier en cours après la modification ; **ou**
     - (b) Isoler l'édition dans un **état dédié** (flag `editFactureId` + jeu d'articles séparé) qui **n'écrase pas** le panier de vente courant.
     L'option (b) est préférable si réalisable proprement. **Ne pas livrer sans gérer ce cas.**
4. À la validation → `modifierFacture(...)`.
5. **Écran de résultat** :
   - `COMPLEMENT` → modal « Complément à encaisser : {ecart} FCFA » (CASH).
   - `REMBOURSEMENT` → modal « Monnaie à rendre : {|ecart|} FCFA ».
   - `AUCUN` → toast succès simple.
6. Réimpression du **reçu mis à jour** (même `num_facture`) via `generate-ticket-html.ts`.
7. Rafraîchir la liste des factures + invalider les caches concernés.

### 7.4 i18n

Ajouter les clés dans **`fr.json`, `en.json`, `wo.json`** (parité 1:1, `npm run i18n:check`) — namespace `invoices` / `venteFlash` : libellés bouton « Modifier », mode édition, complément, monnaie à rendre, messages de succès/erreur.

### 7.5 PWA

Bump `CACHE_NAME` dans `public/service-worker.js` (changement UI majeur).

---

## 8. Cas limites & règles

| Cas | Comportement attendu |
|---|---|
| Vente d'un jour antérieur | Bouton masqué ; si appel forcé → rejet serveur `DATE_LOCKED`. |
| Vente non payée (impayée/partielle) | Hors V1 → rejet `NOT_PAID` (ou bouton masqué). |
| Retrait de **tous** les articles | Interdit (vente vide). → erreur `EMPTY_ARTICLES`. Pour annuler totalement, utiliser la suppression. |
| Remise > nouveau sous-total | Rejet `INVALID_REMISE`. |
| Produit en rupture lors d'un ajout | Vérifier le stock disponible côté front (pattern existant) avant validation ; le delta négatif (retrait) est toujours autorisé. |
| Stock devenant négatif | Politique = aligner sur le comportement actuel de `gere_stock` (à confirmer DBA : bloque ou autorise négatif). |
| Modification concurrente (2 caissiers) | Transaction PG atomique ; dernière écriture gagne. Acceptable en V1 (faible probabilité même structure/jour). |
| Bascule minuit pendant l'édition | Le serveur fait foi : si validation après minuit, `date_facture` d'hier → `DATE_LOCKED`. Afficher message clair. |
| Vente déjà reversée (`mt_reverser = true`) | À confirmer DBA : bloquer la modif si la vente a été reversée (intégrité comptable). **Recommandation : bloquer.** |

---

## 9. Critères d'acceptation

1. ✅ Un caissier modifie les articles d'une vente **payée du jour** sans mot de passe ; `num_facture` inchangé.
2. ✅ Ajout d'article → modal **complément CASH** correct ; après confirmation, vente reste `PAYEE`, `mt_restant = 0`.
3. ✅ Retrait d'article → modal **monnaie à rendre** correcte ; vente reste `PAYEE`.
4. ✅ Modification de la remise globale reflétée dans le net et la réconciliation.
5. ✅ **Stock** : delta net correct par produit, **un seul** mouvement compensatoire/produit, **aucun** mouvement orphelin, **pas** de double-comptage. (Test : vérifier `mouvement_stock` avant/après.)
6. ✅ Tentative de modifier une vente **d'hier** → refusée (bouton masqué **et** rejet serveur).
7. ✅ Chaque modification crée **une ligne** `log_modifications_factures` avec snapshots avant/après cohérents.
8. ✅ Ledger : complément/remboursement enregistré en **ligne(s) append-only** (`recus_paiement` + `journal_compte`) ; aucune ligne de reçu existante mutée.
9. ✅ Reçu réimprimé reflète les nouveaux articles/montants.
10. ✅ Parité i18n FR/EN/WO (`npm run i18n:check` vert).
11. ✅ `npm run build` + `npm run lint` OK ; déploiement testé en navigation privée.

---

## 10. Évolutions futures (V2)

- **Écran « Modifications du jour »** (admin/gérant) : liste des modifications depuis `log_modifications_factures` pour contrôle a posteriori (mitigation renforcée du risque skimming cash). Filtre par caissier/date, affichage avant/après.
- Modification des ventes **partiellement payées** (acompte).
- Modification du **client** rattaché.
- Extension aux autres types de structures si besoin.

---

## 11. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Double-comptage stock (interaction trigger INSERT) | Stock faux | Technique stock tranchée + test de non-régression dédié (§5.1, §9.5). |
| Skimming cash (baisse de total après encaissement) | Fraude caissier | Journal append-only complet (V1) + écran de revue (V2). Choix « caissier libre » assumé par le PO. |
| Réutilisation accidentelle d'`add_acompte_facture` (bug `montant - mt_remise`) | Montants corrompus | Interdiction explicite (§5.2) ; gestion directe `mt_acompte`/`mt_restant`. |
| Mauvais routing de panier (VF vs Produits) | UX cassée | Heuristique + défaut Produits ; à valider en implémentation (§7.3). |
| Écrasement du panier de vente en cours | Perte de données caisse | État d'édition isolé ou avertissement + save/restore (§7.3, exigence bloquante). |
| Convention stock mal choisie (`gere_stock` vs brut) | Solde stock faux | Investigation discriminante + spike preuve **avant** codage DBA (§5.1). |
| Incohérence fuseau minuit | Modif refusée à tort/raison | Serveur fait foi ; message clair ; vérifier TZ serveur. |

---

## 12. Équipe & responsabilités

| Rôle | Agent | Responsabilité |
|---|---|---|
| **Lead** | chef-projet-it-icelabsoft | Coordination, plan, vérification, synthèse |
| **Architecte** | architecte-requirements-icelabsoft | Validation architecture, contraintes techniques |
| **DBA** | dba_master | Table `log_modifications_factures` + fonction `modifier_facturecom` (DDL exclusif) + tests stock/ledger |
| **Backend** | kader_backend | `facture.service.ts` (`modifierFacture`) + types |
| **Frontend** | fullstack-web-expert | Bouton « Modifier », mode édition panier, modals complément/monnaie, reçu, i18n, PWA |
| **QA** | qa-test-regression | Critères d'acceptation, non-régression stock/paiement |

---

## 13. Annexe — Conventions à respecter (rappel CLAUDE.md)

- Délégation BD **exclusive** à `dba_master` (SSH serveur). Pas de DDL hors DBA.
- `DatabaseService` : import default = instance singleton (ne pas appeler `.getInstance()`).
- Réponses PostgreSQL : `typeof === 'string'` avant `JSON.parse()`.
- `stopPropagation()` sur boutons dans éléments cliquables (FactureCard).
- Bump `CACHE_NAME` (service worker) si changement UI majeur.
- Commit format emoji (✨/🔧/🐛).
- Branche dédiée, merge `main` après tests + validation complète.
