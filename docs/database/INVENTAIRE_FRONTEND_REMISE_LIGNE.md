# INVENTAIRE FRONTEND — Persistance de la remise par ligne

**Date** : 23/07/2026
**Auteur** : Claude Code (frontend) — pour `dba_master` et la branche frontend future
**Branche analysée** : `test/integration-remises` (fusion des 7 branches `fix/remise-*`, 9 commits ahead de `origin/main`)
**Mémo de référence** : [`MEMO_CHANTIER_PERSISTANCE_REMISE_LIGNE.md`](./MEMO_CHANTIER_PERSISTANCE_REMISE_LIGNE.md)

Format `articles_string` actuel : `"id_produit-quantite-prix_net#..."` (3 champs, séparateurs `-` et `#`).
Cible : `"id-qty-prix_net[-remise_pct[-prix_origine]]#"` (3, 4 ou 5 champs, rétro-compatible).

---

## 1. SERVICES qui CONSTRUISENT/ÉMETTENT `articles_string` (à étendre)

> Aucun appelant direct oublié : **tous les chemins passent par les services centralisés ci-dessous.**

| Fichier:Ligne | Fonction | Fonction PG | Rôle dans le flux remise |
|---|---|---|---|
| `services/facture.service.ts:148-150` | `createFacture()` inline | `create_facture_complete1` (l.166) | Construit la string à la volée (n'appelle PAS `buildArticlesString`, **duplication volontaire** — voir commentaire l.469 « NE PAS recâbler createFacture() sur ce helper : chemin de vente critique en prod »). **Les 2 chemins doivent évoluer en parallèle.** |
| `services/facture.service.ts:93-114` | `createFacture()` bloc absorption | — | Lit `localStorage['vf_remise_mode']`, calcule `pctEquivalent`, écrit `prix_applique = round(prix × (1 − pct/100))`. Doit aussi écrire `remise_pct`/`prix_origine` dans la string. |
| `services/facture.service.ts:471-493` | `buildArticlesString(articles)` privé | appelé par `modifierFacture` (l.561→592) → `modifier_facturecom` | Helper dédié à la modification. Même absorption. |
| `services/facture.service.ts:571` | regex garde-fou | — | ⚠️ `^(\d+-\d+(\.\d+)?-\d+(\.\d+)?#)+$` — **rejette 4/5 champs**, à assouplir en même temps que le format. |
| `services/proforma.service.ts:54-71` | `absorberRemisesArticles()` privé | — | Helper partagé `createProforma` + `editProforma`. Lit `vf_remise_mode` (l.55). |
| `services/proforma.service.ts:108-110` | `createProforma()` | `create_proforma` (l.120) | `${id}-${qty}-${prix_applique ?? prix_vente}#` |
| `services/proforma.service.ts:260-264` | `editProforma()` | `edit_proforma` (l.271) | Idem après absorption. |
| `services/prestation.service.ts:1161-1164, 1190-1204` | `createFactureFromDevis()` | `create_facture_complete1` (l.1190) | Format `id-quantite-prix#` depuis `details_produits` du devis. **Devis → facture, doit propager.** |
| `services/bon-commande.service.ts:84-96` | `articleToString()` + `buildArticlesString()` | `create_bon_commande` (l.159), `edit_bon_commande` (l.377) | BC : prix de base = `cout_revient` (pas `prix_vente`). |
| `services/vente-representant.service.ts:101-119` | `buildArticlesString()` | `create_facture_representant` (l.166) | Prix DOIT être `prix_vente_rep` imposé serveur (`PRIX_NON_AUTORISE` sinon). |
| `services/online-seller.service.ts:241-242, 350-353, 440-451` | `createFactureOnline()` (+ panier + draft) | `create_facture_online` (l.246/357/454) | 3 variantes mono/panier/draft. |
| `services/prestation.service.ts:869-889` | `createPrestation()` | `add_new_facture(... '::JSONB')` | **N'utilise PAS articles_string** mais JSON `detailsFacture`. Variation à surveiller (hors scope immédiat). |

---

## 2. COMPOSANTS qui RECONSTITUENT la remise par lookup catalogue (à remplacer par `d.remise_pct`/`d.prix_origine` quand présents)

Formule actuelle : `remise% = (prix_catalogue − prix_net_BD) / prix_catalogue × 100`.

| Fichier:Ligne | Composant/Fonction | Rôle |
|---|---|---|
| `components/impression/ModalImpressionDocuments.tsx:62-68` | `useEffect` produits | Pré-charge `getListeProduits()` pour lookup (factures + proforma legacy). |
| `components/impression/ModalImpressionDocuments.tsx:165-175` | `generateDocumentHTML()` branche `isFacture` | **Lookup principal factures** : `prixOrigine = prod.prix_vente > d.prix ? prod.prix_vente : d.prix` puis `remiseArtPct = ((prixOrigine − d.prix)/prixOrigine)×100`. Colonne « Remise » l.181. |
| `components/impression/ModalImpressionDocuments.tsx:241-249` | tfoot factures | Sous-total / Remise globale (`f.mt_remise`) / Net (`f.montant − f.mt_remise`). |
| `components/proformas/ModalImpressionProforma.tsx:42-50` | `useEffect` produits | Lookup prix d'origine proforma. |
| `components/proformas/ModalImpressionProforma.tsx:116-141` | `generateProformaHTML()` | **Lookup proforma** : `prixOrigine = prod.prix_vente > d.prix_unitaire ? prod.prix_vente : d.prix_unitaire` (l.121). Colonne « Remise » l.138. |
| `components/proformas/ModalCreerProforma.tsx:103-141` | `loadEditData()` | **Hydratation édition proforma** : reconstitue `remise_article` depuis `prod.prix_vente ?? d.prix_unitaire` (l.123), arrondi **2 décimales** via `×10000/100` (l.125) — justifié l.117-120 pour éviter dérive au re-save. |
| `components/proformas/ModalCreerProforma.tsx:248-258` | `handleSubmit()` | Ré-absorbe `remise_article` puis remet `remise_article = 0` avant envoi (l.257) — point clé pour la future persistance. |
| `components/boncommandes/ModalCreerBonCommande.tsx:123-167` | `hydrateEditData()` | Variante BC : `prixOrigine = cout_revient ?? prix_vente ?? d.cout_revient`. **Ne remet pas `remise_article` à 0** (différence à noter). |
| `lib/edition-vente-helpers.ts:73-113` | `reconstruireArticlesDepuisFacture()` | Helper partagé Factures + VenteFlash (mode édition). **Force `remise_article: 0`** (l.92, 109), `prix_applique = detail.prix`. Futur point de consommation `d.remise_pct`/`d.prix_origine`. |
| `app/dashboard/commerce/factures/page.tsx:389-398` | `handleModifierFacture()` | Appelle `reconstruireArticlesDepuisFacture(details, lookupProduit)`. |
| `app/dashboard/commerce/venteflash/page.tsx:714, 738` | Page VF | Idem pour ouvrir l'édition VF. |
| `components/panier/ModalFactureSuccess.tsx:106, 208-227` | `preloadedArticles` / fallback BD | Lit le store (prix d'origine) ou fallback `SELECT ... FROM detail_facture_com` (prix net). Affiche `a.prix` directement, **pas de reconstitution remise ligne**. |
| `components/panier/ModalFactureSuccess.tsx:455-466` | `computeTotauxImpression()` | Reconstitue la remise **globale agrégée** = `sousTotal − montantNet`. |
| `components/venteflash/ModalRecuVenteFlash.tsx:128-153` | `handlePrint()` | `remiseGlobale = max(0, sousTotalLignes − montantTotal)` → `generateTicketHTML`. |
| `components/venteflash/ModalRecuVenteFlash.tsx:167-181` | `handleWhatsApp()` | Idem pour partage WhatsApp. |
| `lib/generate-ticket-html.ts:75-77, 168-170` | `generateTicketHTML()` | Générique ticket. `sousTotal = data.sousTotal ?? data.montantNet + (data.remise \|\| 0)`. Pas de notion de remise par ligne. |
| `components/facture/FacturePubliqueClient.tsx:677-706` | Page publique client | Tableau produits (`item.prix`, `item.sous_total`) + sous-total/remise globale/net si `mt_remise > 0`. Pas de remise par ligne. |
| `components/facture/FacturePublique.tsx:264-271` | Ancienne version publique | Remise globale uniquement. |
| `components/facture/FacturePubliqueNew.tsx:93, 234-242` | Nouvelle version publique | `hasDiscount = mt_remise > 0`. |
| `components/recu/ModalRecuGenere.tsx:220-242` | `handlePrint()` reçu | Ticket sans articles ni remise ligne. |

---

## 3. TYPES à étendre (`remise_pct?: number`, `prix_origine?: number`)

| Fichier:Ligne | Type | Note |
|---|---|---|
| `types/proforma.ts:31-39` | `ProformaDetail` | `prix_unitaire` déjà net. |
| `types/facture.ts:35-46` | `DetailFacture` | `prix` actuel = prix net. |
| `types/facture-publique.ts:5-16` | `DetailFacturePublique` | Miroir `FacturePubliqueClient`. |
| `types/facture-privee.ts:5-13` | `DetailFacture` | Miroir `ModalFacturePrivee`. |
| `types/bon-commande.ts:68-75` | `BonCommandeDetail` | `cout_revient` = prix d'achat. |
| `types/produit.ts:56-59` | `ArticlePanier` (extends `Produit`) | A déjà `prix_applique?` + `remise_article?`. |
| `services/facture.service.ts:36-40` | `DetailFacture` local (shadow) | À aligner (sinon shadowing). |
| `hooks/useFactureSuccess.ts:20` | `PreloadedArticle` shape | Ajouter `remise_pct?`/`prix_origine?`. |
| `components/panier/ModalFactureSuccess.tsx:60-65` | `FactureArticleRow` local | Shape impression ticket. |

---

## 4. TOGGLE `vf_remise_mode` (localStorage, valeur `'%'` défaut ou `'F'`)

Bascule le **sens** de `remise_article` : `%` → pourcentage (0-100), `F` → montant FCFA ligne (clampé sur `prixUnitaire × quantity`).
Services convertissent `F`→`%` équivalent avant absorption (`facture.service.ts:104-105`, `proforma.service.ts:65-66`).

**Lectures** : `facture.service.ts:93,472` · `proforma.service.ts:55` · `panierStore.ts:190,225` · `panierProformaStore.ts:159,193` · `panierBonCommandeStore.ts:218,260` · `panierVFMultiStore.ts:200,259` · `ModalPanier.tsx:113` · `PanierSidePanel.tsx:167,1032` · `ProformaSidePanel.tsx:42` · `PanierVenteFlashInline.tsx:112` · `ModalEditionVente.tsx:42`.

**Écritures** : `ModalPanier.tsx:125` · `PanierSidePanel.tsx:245,1043` · `ProformaSidePanel.tsx:56` · `PanierVenteFlashInline.tsx:144`.

---

## 5. APPELS DIRECTS aux fonctions PG (cartographie complète)

| Fonction PG | Service émetteur | Appelants UI |
|---|---|---|
| `create_facture_complete1` | `facture.service.ts:166` (createFacture), `prestation.service.ts:1190` (createFactureFromDevis) | `ModalPanier.tsx:219`, `PanierSidePanel.tsx:473,1149`, `PanierVenteFlash.tsx:95`, `PanierVenteFlashInline.tsx:244`, `services/devis/page.tsx:171` |
| `modifier_facturecom` | `facture.service.ts:592` | `factures/page.tsx:449`, `venteflash/page.tsx:806` |
| `create_proforma` | `proforma.service.ts:120` | `ModalCreerProforma.tsx:277`, `ProformaSidePanel.tsx:122`, `PanierSidePanel.tsx:361,1108` |
| `edit_proforma` | `proforma.service.ts:271` | `ModalCreerProforma.tsx:262` (uniquement) |
| `create_facture_online` | `online-seller.service.ts:246,357,454` | pas d'appel UI direct |
| `create_facture_representant` | `vente-representant.service.ts:166` | `representant/vente/page.tsx:237` |
| `create_bon_commande` | `bon-commande.service.ts:159` | `ModalCreerBonCommande.tsx:322`, `PanierSidePanel.tsx:429` |
| `edit_bon_commande` | `bon-commande.service.ts:377` | `ModalCreerBonCommande.tsx:298` |
| `add_new_devis_complet` | `prestation.service.ts:392` | `ModalNouveauDevis.tsx:357` |

---

## 6. Points d'attention pour la coordination BD ↔ Front

1. **Regex garde-fou** `facture.service.ts:571` doit être étendue pour accepter `id-qty-prix[-remise[-prix_orig]]#` (sinon `modifierFacture` rejette le format étendu).
2. **Duplication volontaire** `facture.service.ts:148-150` (inline createFacture) vs `buildArticlesString` (l.471) — évoluer en parallèle, ne pas factoriser.
3. **`ModalCreerProforma.tsx:248-258`** ré-absorbe `remise_article` puis `= 0` — pattern à conserver (compat ascendante), deviendra redondant après persistance.
4. **`edition-vente-helpers.ts:91-92,108-109`** force `remise_article: 0` — futur point de lecture de `d.remise_pct` quand présent.
5. **Rétro-compat affichage** : anciennes lignes BD sans `remise_pct`/`prix_origine` doivent continuer via le lookup actuel — chaque composant consommateur doit faire `d.remise_pct ?? reconstitutionLookup(d)`.
6. **Aucun impact montants** : la string transporte toujours le prix NET ; BD-first, front ensuite.

---

*Inventaire produit le 23/07/2026 —état de référence `test/integration-remises`. Complément du mémo `MEMO_CHANTIER_PERSISTANCE_REMISE_LIGNE.md`.*
