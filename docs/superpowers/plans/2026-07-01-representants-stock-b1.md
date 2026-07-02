# Stage B1 — Affectation de stock aux représentants (surface settings)

Restaure l'affectation de stock depuis l'onglet **Représentants** (settings), en ré-ajoutant l'action « Affecter stock » sur le carton rep (retirée en Stage A) → `ModalAffecterStock`. Service + types réconciliés contre les signatures prod. Branche `feat/representants-stock-affectation-b1` (depuis main = Stage A). Test sur **183 (TECH24)**.

Source à porter depuis `feature/reseau-distribution-representants` : `types/affectation.ts`, `services/affectation.service.ts`, `components/representants/ModalAffecterStock.tsx`. **Hors périmètre B1** : page `app/dashboard/commerce/representants` (surface commerce = plus tard), reversements, dashboard, ventes.

## Signatures prod (audit — à respecter à la lettre)

- `affecter_produit_representant(p_id_structure, p_id_produit, p_id_representant, p_quantite, p_prix_vente_rep, p_seuil_alerte=NULL, p_motif=NULL, p_id_admin=0)` → `{success,code?,message,data:{id_affectation,quantite_affectee,stock_global_restant}}`. Gate `compte_distributeur`. UPSERT → ré-affecter ADDITIONNE. Erreurs: MODULE_INACTIF, REP_INVALIDE, PRODUIT_INVALIDE, STOCK_INSUFFISANT, QUANTITE/PRIX_INVALIDE.
- `retirer_stock_representant(p_id_affectation, p_quantite, p_motif, p_id_admin)` — 4 args, **motif obligatoire**, PAS d'id_structure.
- `modifier_prix_rep(p_id_affectation, p_nouveau_prix, p_motif=NULL, p_id_admin=0)`.
- `get_stock_representant(p_id_rep, p_id_structure=NULL)` → `{success,data:{produits:[...],total_produits,valeur_totale_stock}}`.

`p_id_admin` = `useAuth().user.id`.

## Tâche 1 — Data layer

Créer `types/affectation.ts` (port) + `services/affectation.service.ts` (port + réconcilier) :
- `affecterProduit(params)` : args positionnels exacts ci-dessus, ajouter `p_id_admin`.
- `retirerStock(params)` : `(id_affectation, quantite, motif, id_admin)` — motif requis, valider non vide côté service.
- `modifierPrix(params)` : `(id_affectation, nouveau_prix, motif?, id_admin)`.
- `getStockRepresentant(id_rep)` : `get_stock_representant(id_rep)`.
- Types params : ajouter `id_admin` là où nécessaire ; `AffectationData`/réponses alignées au shape `get_stock_representant`.
- Singleton + parsing `typeof raw==='string'?JSON.parse` + échappement apostrophes/NULL (pattern representant.service / admin.service). Vérif `npx tsc --noEmit` sur les 2 fichiers.

## Tâche 2 — Modal + câblage settings

- Créer `components/representants/ModalAffecterStock.tsx` (port ~924 L) : réconcilier tous les appels à `affectationService` (nouvelles signatures) ; l'admin choisit un produit (liste via `produits.service` existant), quantité, prix imposé, seuil ; voit le stock déjà affecté (`getStockRepresentant`) ; peut retirer / modifier prix. `id_admin`=user.id. Adapter `rep.id_representant`.
- Re-câbler dans `components/settings/RepresentantsManagement.tsx` : ré-ajouter `handleAffecterStock` + rendu `<ModalAffecterStock>` + passer `onAffecterStock` à `RepresentantCard`.
- Re-câbler dans `components/representants/RepresentantCard.tsx` : ré-ajouter le bouton/action « Affecter stock » (prop `onAffecterStock`).
- **Gating** : l'onglet Représentants est déjà gaté `compte_distributeur` (Stage A) → suffisant.
- Vérif : `npm run build` vert (gate B1). Si `MODULE_NOT_FOUND` ou "collect page data" → `rm -rf .next` et relancer.

## Vérification navigateur (183 TECH24)

Onglet Représentants → carton `tech24_rep` → action « Affecter stock » → modal ouvre : liste produits, stock déjà affecté chargé. Test non-mutant (ouvrir + fermer) ; test mutant (affecter un produit) sur 183 possible mais réversible via « retirer » (motif obligatoire). Ne pas laisser d'état incohérent.

## Notes

- retirer/modifier_prix ne re-gatent pas `compte_distributeur` côté backend → OK car onglet déjà gaté.
- Ré-affectation d'un même produit ADDITIONNE les quantités (ne remplace pas) — le libellé UI doit être clair.
