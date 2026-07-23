# MÉMO CHANTIER — Persistance de la remise par ligne en base

**Date** : 23/07/2026
**Destinataire** : agent `dba_master` (propriétaire exclusif du DDL) — en collaboration avec le frontend (Claude Code) et validation PO
**Priorité** : chantier lourd validé dans son principe par le PO, déclenchement à sa demande
**Base concernée** : `fayclick_db` (154.12.224.173:3253), production

---

## 1. Contexte — historique du chantier « remises » (23/07/2026)

Tout part d'une facture imprimée sans remise (FAC-202607-218-0708, structure 218). L'enquête a débouché sur un audit QA complet (score 58/100), un patch DDL en production et 7 PRs frontend, tous **OPEN non mergés** à la date de ce mémo :

| PR | Branche | Contenu |
|---|---|---|
| #16 | `fix/affichage-remise-facture` | `ModalFactureSuccess` : reconstitution remise à l'impression (Σ lignes − net) |
| #17 | `fix/remise-article-proforma` | **CRIT-001** : `proforma.service` absorbe enfin `remise_article` dans les prix nets (parité `facture.service`) |
| #18 | `fix/convention-montant-impression` | `ModalImpressionDocuments` : convention `montant = BRUT`, TOTAL = montant − mt_remise |
| #19 | `fix/remise-ticket-venteflash` | Ticket + WhatsApp VenteFlash : remise globale visible |
| #20 | `fix/remise-facture-publique` | Facture publique : bloc Sous-total/Remise/Net (i18n FR/EN/WO) |
| #21 | `fix/cosmetique-remise-proforma` | Impression proforma immédiate alignée BD + libellé « Remise (X%) » |
| #22 | `fix/remise-pct-precision` | Modal Modifier proforma : % effectif à 2 décimales (12,5 au lieu de 13) |

**Côté BD, déjà FAIT en production par dba_master (23/07/2026)** :
- `add_acompte_facture` patchée : `montant` n'est **plus jamais muté** (il reste BRUT immuable = Σ lignes), restant = `GREATEST(0, montant − mt_remise − Σ acomptes)`. Signature 7 params et JSON de retour inchangés. Une seule surcharge.
- Remédiation : **179 factures** corrigées (montant restauré = Σ lignes). 4 cas ambigus laissés intacts (facture 291 structure 139 ; factures 2128/2242/2289 structure 203) — décision PO en attente.
- Backups : `C:\tmp\pgquery\backup_add_acompte_facture_v_before/after_20260723.sql`, `patch_add_acompte_facture_v2_20260723.sql`, `backup_factures_a_remedier_20260723_v2.csv`, `remediation_result_20260723.json`.

**Chantier distinct identifié, hors périmètre de ce mémo** : la quasi-totalité des fonctions de reporting (`get_dashboard_commerce_complet`, `get_etat_global`, dashboards représentant/réseau/partenaire/prestataire, `get_admin_stats_*`) calcule le CA sur `montant` BRUT sans déduire `mt_remise` → CA surestimé. Seule `get_my_factures1` est conforme. Sources auditées dans `C:\tmp\pgquery\impact_*.sql`.

---

## 2. Le modèle actuel des remises (design « absorption » — à bien comprendre avant de toucher)

Deux types de remises coexistent, traités différemment :

### Remise GLOBALE
- Saisie en % ou FCFA sur l'ensemble du panier.
- **Persistée** dans `facture_com.mt_remise` / `proforma.mt_remise` (via `p_mt_remise`).
- Convention (post-patch 23/07) : `montant` = BRUT = Σ lignes ; **net = montant − mt_remise**. Aucune fonction ne doit plus muter `montant`.

### Remise PAR ARTICLE (le sujet de ce chantier)
- Saisie en % (ou FCFA-ligne selon le toggle `vf_remise_mode` du localStorage) sur chaque ligne du panier.
- **NON persistée en tant que telle** : les services frontend (`facture.service.ts` L88-114 + `buildArticlesString()` L471-493 ; `proforma.service.ts` `absorberRemisesArticles()` depuis PR #17) l'**absorbent dans le prix unitaire net** avant l'envoi :
  ```
  prix_net = Math.round(prix_origine × (1 − pct/100))   // arrondi à l'ENTIER FCFA
  articles_string = "id-qty-prix_net#id-qty-prix_net#..."
  ```
- En base : `detail_facture_com.prix` / `proforma_details.prix_unitaire` = prix **net entier**, et `montant` = Σ lignes nettes. `mt_remise` ne contient QUE la remise globale.
- À l'affichage (impressions, modal Modifier), le % est **reconstitué** par lookup du prix catalogue :
  ```
  pct = (prix_vente_catalogue − prix_net_BD) / prix_vente_catalogue × 100
  ```
  Composants concernés : `ModalImpressionProforma.tsx` (L116-141), `ModalImpressionDocuments.tsx` (L145-190), `ModalCreerProforma.tsx` `loadEditData()` (L114-141).

---

## 3. Le problème qui motive ce chantier

La reconstitution est **doublement défaillante** :

### 3.1 Perte de précision sur petits prix (constat PO du 23/07, captures à l'appui)
Le PO saisit **12%** sur un article à **32 F** : 12% exact = 28,16 F, irreprésentable en FCFA entiers → prix stocké 28 F = **12,5% effectif**. L'impression affiche 12.50%, le modal Modifier affichait 13% (corrigé en 12,5 par PR #22). **Le « 12 » saisi est définitivement perdu** — aucun palliatif d'affichage ne peut le retrouver. Le PO veut revoir exactement le % saisi.

### 3.2 Fragilité structurelle : dépendance au prix catalogue COURANT
La reconstitution compare le prix net BD au `prix_vente` **actuel** du catalogue :
- si le commerçant **change le prix** d'un produit après coup, toutes les réimpressions de documents anciens affichent un % faux (voire une remise fantôme ou disparue) ;
- si le produit est **supprimé** du catalogue, lookup impossible → colonne Remise vide ;
- le lookup ignore le **prix en gros** (`prix_grossiste`) : une vente en gros sans remise peut apparaître « remisée » vs le prix public ;
- garde actuelle `prod?.prix_vente > d.prix` : un prix catalogue BAISSÉ sous le prix net historique masque la remise.

**La persistance de la remise par ligne élimine les deux problèmes à la racine.**

---

## 4. Cible proposée (à challenger par dba_master)

### 4.1 Schéma — nouvelles colonnes
```sql
ALTER TABLE proforma_details    ADD COLUMN remise_pct NUMERIC(5,2) NULL;
ALTER TABLE detail_facture_com  ADD COLUMN remise_pct NUMERIC(5,2) NULL;
-- NULL = « inconnu / ligne historique » → le front garde son fallback reconstitution.
-- 0    = explicitement sans remise.
-- Optionnel (recommandé) : prix_origine NUMERIC(10,2) NULL — fige le prix catalogue
-- au moment de la vente et supprime TOTALEMENT le lookup catalogue à l'affichage.
```
**Recommandation** : ajouter **les deux** colonnes (`remise_pct` + `prix_origine`). `prix_origine` seul résout 3.2 ; `remise_pct` seul résout 3.1 ; les deux ensemble rendent chaque ligne autoporteuse : `prix_net = round(prix_origine × (1 − remise_pct/100))` vérifiable par contrainte souple (pas de contrainte stricte — les lignes historiques ne la respectent pas).

### 4.2 Format `articles_string` — extension rétro-compatible
Format actuel parsé par les fonctions PG : `"id-qty-prix#"` (séparateurs `-` et `#`).
Extension proposée : **champs additionnels optionnels** :
```
"id-qty-prix_net[-remise_pct[-prix_origine]]#"
ex. : "4682-3-176-12-200#1523-4-28-12.5-32#887-2-25000#"
```
- Le parseur PG doit accepter **3, 4 ou 5 champs** (split sur `-`, champs 4-5 facultatifs → NULL). ⚠️ `remise_pct` peut être décimal (« 12.5 ») — attention au parsing numérique.
- **Rétro-compat OBLIGATOIRE** : tout appelant existant qui envoie 3 champs doit continuer de fonctionner à l'identique (VenteFlash, représentants, bons de commande, PayeEcole/autres apps ICELABSOFT si elles appellent ces fonctions — à inventorier côté DBA avant patch).
- Le prix envoyé **reste le prix NET** (décision structurante) : les montants, le stock, les paiements, les triggers (`recalculer_montant_facture`) et le patch `add_acompte_facture` sont **inchangés**. `remise_pct`/`prix_origine` sont purement **informatifs** (affichage/audit). C'est l'option à moindre risque — l'alternative « envoyer le brut et laisser PG calculer le net » centraliserait l'arrondi mais toucherait tous les flux d'argent : déconseillée en V1.

### 4.3 Fonctions PL/pgSQL à patcher (inventaire minimal — dba_master complète)
| Fonction | Modification |
|---|---|
| `create_proforma` | parser champs 4-5 → insérer `remise_pct`/`prix_origine` dans `proforma_details` |
| `edit_proforma` | idem sur le bloc DELETE + re-INSERT des lignes (déjà conditionné à `p_articles_string IS NOT NULL`) |
| `get_proforma_details` | retourner `remise_pct`/`prix_origine` dans le JSON details |
| `convert_proforma_to_facture` | **propager** `remise_pct`/`prix_origine` des lignes proforma vers `detail_facture_com` (via le string étendu passé à `create_facture_complete1`) |
| `create_facture_complete1` → `add_new_facture` | parser champs 4-5 → insérer dans `detail_facture_com` (c'est `add_new_facture` qui insère les lignes) |
| `modifier_facturecom` | signature verrouillée DBA — même parsing étendu sur `p_articles_string` |
| Fonctions/vues retournant les détails facture au front | inventorier (requête directe `detail_facture_com` utilisée par `ModalFactureSuccess` fallback L214-220, `FactureComplete.details` consommé par `ModalImpressionDocuments`, facture publique, reçus) et exposer les 2 colonnes |

⚠️ Signatures **inchangées** partout (le string transporte tout) — pas de nouveau paramètre.

### 4.4 Données historiques
**Aucun backfill** : lignes existantes → `remise_pct = NULL`, `prix_origine = NULL`. Le front conserve la reconstitution par lookup comme **fallback** quand `remise_pct IS NULL`. Un backfill par reconstitution reproduirait exactement les erreurs du § 3.2 — à proscrire.

### 4.5 Chaîne frontend (fera l'objet d'une branche dédiée APRÈS livraison BD)
1. `facture.service.ts` (`createFacture` + `buildArticlesString`) et `proforma.service.ts` (`absorberRemisesArticles` + create/edit) : émettre le format 5 champs (`prix_net-pct-prix_origine`). Le pct émis = **valeur saisie** (12), même si le net arrondi correspond à 12,5 — c'est tout l'intérêt.
2. Affichages : `ModalImpressionProforma`, `ModalImpressionDocuments`, `ModalCreerProforma.loadEditData`, (+ ModalFactureSuccess si souhaité) → utiliser `d.remise_pct`/`d.prix_origine` quand présents, fallback lookup sinon.
3. Types : `ProformaDetail`, détails facture (`types/facture.ts`, `types/proforma.ts`) + parsing.

---

## 5. Contraintes et discipline (rappels non négociables)

- **DDL = dba_master exclusivement** ; backup systématique (source fonctions via `pg_get_functiondef`, dumps CSV des tables touchées) dans `C:\tmp\pgquery\` AVANT toute écriture ; transactions avec vérification avant COMMIT.
- **Vérifier les surcharges** (`pg_get_function_identity_arguments`) avant chaque patch de fonction — précédent : `add_acompte_facture` n'en avait qu'une, mais ne pas présumer.
- **Rétro-compat 3 champs** testée explicitement (les fronts non redéployés continueront d'envoyer l'ancien format pendant la transition).
- **Ordre de déploiement** : BD d'abord (rétro-compatible), front ensuite. Jamais l'inverse.
- Tests sur structures de test : **183 (TECH24)** et **218 (LIBRAIRIE CHEZ KELEFA)** ; nettoyer les documents de test créés (la suppression de facture restaure le stock — `supprimer_facturecom` patchée en avril 2026).
- Smoke tests post-patch : création proforma 5 champs, création 3 champs (rétro-compat), edit, conversion → facture, vente directe, VenteFlash, `SUM(lignes) = montant` conservé, trigger `recalculer_montant_facture` non perturbé.
- Livrable dba : dump SQL + doc Markdown + liste signée des fonctions patchées (convention `FONCTIONS_SIGNEES_BACKEND.md`).

## 6. Critères d'acceptation du chantier complet (BD + front)

1. Saisir 12% sur un article à 32 F → BD : `prix=28, remise_pct=12, prix_origine=32` → impression ET modal Modifier affichent **12%** (plus jamais 12,5 ni 13).
2. Changer le prix catalogue du produit après la vente → les réimpressions du document historique sont **inchangées**.
3. Convertir une proforma remisée → la facture porte les mêmes `remise_pct`/`prix_origine` par ligne.
4. Un front ancien (format 3 champs) crée factures/proformas sans erreur, lignes avec `remise_pct NULL`, montants identiques à aujourd'hui.
5. Aucun montant (montant, mt_remise, mt_acompte, mt_restant, stock, wallet) ne change nulle part — le chantier est purement informatif.

---

*Mémo rédigé par Claude Code le 23/07/2026 — état de référence : branches fix #16→#22 non mergées, patch `add_acompte_facture` + remédiation 179 factures en prod, env de test `test/integration-remises` sur localhost:3000.*
