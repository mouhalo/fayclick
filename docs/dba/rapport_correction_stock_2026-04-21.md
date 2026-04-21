# Rapport — Correction bug retour stock après suppression facture

**Date** : 21 avril 2026
**Fonction patchée** : `public.supprimer_facturecom(pid_structure, pid_facture, pid_utilisateur)`
**Base** : `fayclick_db` sur `154.12.224.173:3253`

## Bug détecté

Lorsqu'une facture était supprimée (IMPAYÉE via UI, ou n'importe laquelle via BD), la fonction `supprimer_facturecom` :
- Supprimait la facture et ses lignes `detail_facture_com` (via CASCADE)
- **N'insérait AUCUN mouvement ENTREE compensatoire** dans `mouvement_stock`

Comme le stock est calculé à la volée par la vue `list_produits` (SOMME ENTREE - SOMME SORTIE), le mouvement SORTIE créé à la vente restait orphelin et le stock affiché restait définitivement faux.

## Cause racine

La fonction comptait les lignes de détail mais ne les LISAIT pas pour en extraire `id_produit` et `quantite` avant le DELETE. Le CASCADE effaçait ensuite les détails, rendant impossible toute compensation a posteriori.

## Correctif appliqué

Ajout d'une boucle `FOR ... LOOP` avant le `DELETE FROM facture_com` qui insère un mouvement `ENTREE` dans `mouvement_stock` pour chaque ligne de `detail_facture_com` :

```sql
FOR v_id_produit, v_quantite, v_prix IN
    SELECT id_produit, quantite, prix FROM public.detail_facture_com
    WHERE id_facture = pid_facture
LOOP
    INSERT INTO public.mouvement_stock(
        id_produit, id_structure, type_mouvement, date_mouvement,
        quantite, prix_unitaire, description, tms_create, created_by
    ) VALUES (
        v_id_produit, pid_structure, 'ENTREE', CURRENT_DATE,
        v_quantite, v_prix::real,
        'Retour stock - Suppression facture '||v_num_facture,
        NOW(), 'SYSTEM'
    );
END LOOP;
```

Signature de la fonction inchangée → aucun appel client à adapter.

## Audit des données historiques

**230 mouvements SORTIE orphelins** détectés sur 7 structures :

| Structure | ID | Nb | Qté totale |
|-----------|----|----|------------|
| LIBRAIRIE CHEZ KELEFA SCAT URBAM | 218 | 155 | 1 267 |
| COSMÉTIQUE GUEYE | 203 | 50 | 67 |
| ALLOSHOP | 139 | 9 | 9 |
| SYLVIACOM | 182 | 6 | 8 |
| TECH24 | 183 | 5 | 7 |
| K-BUSINESS CENTER | 157 | 3 | 11 |
| ALIM G DIAW | 222 | 2 | 2 |

## Correction des données

Script appliqué en transaction `BEGIN ... COMMIT` :

```sql
INSERT INTO public.mouvement_stock(...)
SELECT ms.id_produit, ms.id_structure, 'ENTREE', CURRENT_DATE,
       ms.quantite, ms.prix_unitaire,
       'Retour stock correctif - '||ms.description, NOW(),
       'CORRECTION-21042026'
FROM public.mouvement_stock ms
WHERE ms.type_mouvement='SORTIE'
  AND ms.description LIKE 'Vente - Facture %'
  AND NOT EXISTS (SELECT 1 FROM public.facture_com fc
                  WHERE ms.description='Vente - Facture '||fc.num_facture)
  AND NOT EXISTS (SELECT 1 FROM public.mouvement_stock mc
                  WHERE mc.type_mouvement='ENTREE'
                    AND mc.created_by='CORRECTION-21042026'
                    AND mc.id_produit=ms.id_produit
                    AND mc.id_structure=ms.id_structure
                    AND mc.description='Retour stock correctif - '||ms.description);
```

**Résultat : 230 lignes ENTREE compensatoires insérées.**

## Vérification

Produit test : Casa 79 (`id_produit=1052`, `id_structure=183`)
- Avant correction : `niveau_stock=24`
- Après correction : **`niveau_stock=26`** ✅

Confirmé en base et dans l'UI `v2.fayclick.net/dashboard/commerce/produits`.

## Limites et recommandations

- **Rapports historiques de stock par période** : les ENTREE correctives portent la date `2026-04-21` (pas la date réelle de chaque suppression). Impossible de reconstruire les dates exactes sans table d'audit.
- **Suggestion prévention** : créer une table `log_suppressions_factures` ou un trigger `BEFORE DELETE` sur `facture_com` pour tracer chaque suppression (structure, facture, user, timestamp, articles, montant).

## Scripts

- Exécution : `C:\tmp\pgquery\patch_fayclick_2026_04_21.js`
- Backup fonction avant patch : sauvegardé manuellement par l'utilisateur
