# Design : Paramètres Structure DB-first avec sync localStorage

**Date** : 2026-02-24
**Branche** : `feature/settings-structure`
**Approche** : DB comme source de vérité, sync localStorage pour réactivité

---

## Contexte

La table `param_structure` stocke les paramètres configurables de chaque structure. La fonction `get_une_structure()` a été mise à jour pour retourner ces 9 champs. Il faut maintenant les mapper côté frontend et les rendre éditables dans la page Settings.

## Table param_structure (champs concernés)

| Champ | Type | Editable user | Usage |
|---|---|---|---|
| `credit_autorise` | bool | Oui | Onglet Règles Ventes |
| `limite_credit` | numeric(10,2) | Oui | Onglet Règles Ventes |
| `acompte_autorise` | bool | Oui | Onglet Règles Ventes |
| `prix_engros` | bool | Oui | Onglet Règles Ventes |
| `nombre_produit_max` | int2 | Non (lecture) | Onglet Règles Ventes |
| `nombre_caisse_max` | int2 | Non (admin) | Onglet Utilisateurs |
| `compte_prive` | bool | Non (admin) | Onglet Abonnement |
| `mensualite` | numeric(10,2) | Non (admin) | Onglet Abonnement |
| `taux_wallet` | numeric(10,2) | Non (admin) | Interne |

## Fonctions PostgreSQL

- **Lecture** : `get_une_structure(pid_structure)` — retourne les 9 champs (modifiée le 2026-02-24)
- **Écriture** : `edit_param_structure(p_id_structure, p_credit_autorise, p_limite_credit, p_acompte_autorise, p_prix_engros)` — met à jour les 4 champs éditables

## Architecture

### Flux de données

```
LOGIN
  get_une_structure() → StructureDetails (9 nouveaux champs)
    → saveCompleteAuthData() → localStorage structure
    → sync localStorage sales rules (fayclick_regles_ventes_{id})

SETTINGS (sauvegarde)
  edit_param_structure() → DB mise à jour
    → sync localStorage sales rules
    → AuthContext structure mis à jour

PAGES PRODUITS / VENTEFLASH (lecture)
  useSalesRules() → lit localStorage (inchangé)
```

### 1. Mapping au login (auth.service.ts)

`fetchStructureDetails()` mappe les 9 champs dans `StructureDetails`. Après `saveCompleteAuthData()`, sync automatique du localStorage sales rules avec les valeurs DB.

### 2. Onglet Règles Ventes

- 4 contrôles existants (credit_autorise, limite_credit, acompte_autorise, prix_engros) : chargement depuis structure au lieu de localStorage seul
- Sauvegarde : appel `edit_param_structure()` → puis sync localStorage
- `nombre_produit_max` : affiché en lecture seule (information)

### 3. Onglet Utilisateurs

Remplacer `const MAX_CAISSIERS = 2` (hardcodé) par `structure.nombre_caisse_max` depuis AuthContext.

### 4. Onglet Abonnement

- Si `compte_prive === true` : pas de sélection formule, affichage montant fixe `mensualite` FCFA, bouton payer directement vers confirmation wallet
- Si `compte_prive === false` : comportement actuel inchangé

### 5. Propagation produits/venteflash

Aucun changement. `useSalesRules()` continue de lire localStorage. La sync DB → localStorage se fait au login et à la sauvegarde settings.
