# Mémo DBA - Fonctionnalité Online Seller

**Date** : 31 janvier 2026
**Branche** : `online_seller`
**Objectif** : Vérifier les objets BD existants et identifier les besoins pour la vente en ligne via QR Code / Lien public.

---

## 1. Objets BD existants utilisés (AUCUNE modification requise)

### Vue `list_produits` (lecture seule)
Colonnes utilisées par Online Seller :
```sql
SELECT
  ps.id_produit,
  ps.nom_produit,
  ps.prix_vente,
  ps.description,
  ps.niveau_stock,
  ps.nom_categorie,
  ps.photo_disponible
FROM list_produits ps
WHERE ps.id_structure = {id_structure}
  AND ps.id_produit = {id_produit}
```
**Note** : On n'expose PAS `cout_revient`, `marge`, `mt_total_achat` (données sensibles).

### Table `structures` (lecture seule)
```sql
SELECT nom_structure, logo
FROM structures
WHERE id_structure = {id_structure}
```

### Fonction `create_facture_complete1()`
Déjà utilisée par VenteFlash et factures classiques. Signature existante :
```sql
SELECT * FROM create_facture_complete1(
  pdate_facture,      -- DATE
  pid_structure,      -- INTEGER
  ptel_client,        -- VARCHAR (9 chiffres)
  pnom_client,        -- VARCHAR
  pmontant,           -- NUMERIC
  pdescription,       -- VARCHAR
  particle_string,    -- VARCHAR (format: "id_produit-quantite-prix#")
  premise,            -- NUMERIC
  pacompte,           -- NUMERIC
  pavec_frais,        -- BOOLEAN
  pest_devis,         -- BOOLEAN
  pid_devis           -- INTEGER
)
```

### Fonction `add_acompte_facture()`
Déjà utilisée par factures publiques et VenteFlash. Signature existante :
```sql
SELECT * FROM add_acompte_facture(
  pid_structure,      -- INTEGER
  pid_facture,        -- INTEGER
  pmontant_acompte,   -- NUMERIC
  ptransactionid,     -- VARCHAR
  puuid               -- VARCHAR
)
```
**Important** : Cette fonction prend **5 paramètres** (pas 7). Le `mode_paiement` et `telephone` ne sont PAS des paramètres de cette fonction.

---

## 2. Requête complète Online Seller (produit public)

La requête pour récupérer un produit public avec le nom de la structure :
```sql
SELECT
  p.id_produit,
  p.nom_produit,
  p.prix_vente,
  p.description,
  p.niveau_stock,
  p.nom_categorie,
  p.photo_disponible,
  s.nom_structure,
  s.logo
FROM list_produits p
JOIN structures s ON s.id_structure = p.id_structure
WHERE p.id_structure = {id_structure}
  AND p.id_produit = {id_produit}
```

### Questions pour le DBA :

1. **`photo_disponible`** : C'est un booléen ? Si oui, où sont stockées les URLs des photos produits ? Y a-t-il une table `photo_produit` ou similaire ?
2. **`list_produits` vs `list_produits_com`** : Le code existant du front (`produits.service.ts`) utilise-t-il `list_produits` directement ou une autre vue ?
3. **Signature `add_acompte_facture`** : Confirmer que c'est bien 5 paramètres. Le service online-seller avait été codé avec 7 params (ajout mode_paiement + telephone) - c'est à corriger.

---

## 3. Flux de création facture Online Seller

```
1. Client arrive sur /produit?token=XXX (token = base64 de "id_structure-id_produit")
2. Requête produit public (SELECT ci-dessus)
3. Client saisit : prénom + téléphone + quantité
4. Client paie via OM ou Wave (paymentWalletService existant)
5. Paiement confirmé (COMPLETED) → Création facture :
   a. create_facture_complete1() → retourne id_facture
   b. add_acompte_facture() → enregistre le paiement
6. Reçu affiché au client
```

### Transaction ID format :
```
{WALLET}-ONLINE-{id_structure}-{timestamp}
Exemple : OM-ONLINE-183-1738300800000
```

### Articles string format :
```
{id_produit}-{quantite}-{prix_unitaire}#
Exemple : 456-2-5000#
```

---

## 4. Aucune nouvelle fonction BD requise

Toute la logique métier utilise des objets **existants** :
- `list_produits` (vue) - lecture produit
- `structures` (table) - nom + logo structure
- `create_facture_complete1()` - création facture
- `add_acompte_facture()` - enregistrement paiement

**Aucune nouvelle table, vue ou fonction n'est nécessaire.**

---

## 5. Corrections à appliquer dans le code

| Fichier | Problème | Correction |
|---------|----------|------------|
| `services/online-seller.service.ts` | Utilise `list_produits_com` | Remplacer par `list_produits` |
| `services/online-seller.service.ts` | Utilise `photo_url` | Remplacer par `photo_disponible` |
| `services/online-seller.service.ts` | `add_acompte_facture` avec 7 params | Corriger à 5 params |
| `services/online-seller.service.ts` | JOIN `list_structures` | Corriger en JOIN `structures` |
