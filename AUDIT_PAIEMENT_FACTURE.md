# 🔍 AUDIT PAIEMENT FACTURE - Comparaison Workflows

**Date**: 2025-10-08
**Problème identifié**: Les paiements réussissent lors de la création de facture mais échouent (polling ne retourne jamais COMPLETED) depuis la liste des factures.

---

## 📋 Composants Identifiés

### Workflow 1: Paiement lors de la CRÉATION de facture ✅
**Composant principal**: `ModalFactureSuccess.tsx` (lignes 27-715)
- **Localisation**: `components/panier/ModalFactureSuccess.tsx`
- **Trigger**: Après création d'une facture depuis le panier
- **Modal QR Code**: `ModalPaiementQRCode.tsx` (même composant pour les 2 workflows)

### Workflow 2: Paiement depuis la LISTE des factures ❌
**Composant principal**: `ModalPaiement.tsx` (lignes 1-880+)
- **Localisation**: `components/factures/ModalPaiement.tsx`
- **Trigger**: Clic sur "Encaisser" depuis la liste des factures
- **Modal QR Code**: `ModalPaiementQRCode.tsx` (identique)

---

## 🔄 Comparaison des Workflows

### Workflow 1: ModalFactureSuccess ✅ (Fonctionne)

#### Création du PaymentContext (lignes 311-326)
```typescript
const createPaymentContext = (): PaymentContext | null => {
  if (!factureDetails) return null;

  return {
    facture: {
      id_facture: factureDetails.id_facture,
      num_facture: factureDetails.num_facture,
      nom_client: factureDetails.nom_client_payeur,  // ⚠️ nom_client_payeur
      tel_client: factureDetails.tel_client,
      montant_total: factureDetails.montant,
      montant_restant: factureDetails.mt_restant,
      nom_structure: factureDetails.nom_structure     // ✅ PRÉSENT
    },
    montant_acompte: factureDetails.mt_restant // Solde complet
  };
};
```

#### Données source: `factureDetails` (service `factureService.getFactureDetails`)
- Type: Réponse directe de l'API `get_facture_details()`
- Structure: `{ id_facture, num_facture, nom_client_payeur, nom_structure, ... }`

---

### Workflow 2: ModalPaiement ❌ (Échoue)

#### Création du PaymentContext (lignes 482-497)
```typescript
const createPaymentContext = (): PaymentContext | null => {
  if (!facture || !montants) return null;

  return {
    facture: {
      id_facture: facture.facture.id_facture,
      num_facture: facture.facture.num_facture,
      nom_client: facture.facture.nom_client,         // ⚠️ nom_client
      tel_client: facture.facture.tel_client,
      montant_total: facture.facture.montant,
      montant_restant: facture.facture.mt_restant,
      nom_structure: facture.facture.nom_structure    // ⚠️ Peut être undefined !
    },
    montant_acompte: montants.montantSaisi
  };
};
```

#### Données source: `facture: FactureComplete`
- Type: `FactureComplete = { facture: GetMyFactureResponse, ... }`
- Source: `factureListService.getMyFactures()` → PostgreSQL function `get_my_factures()`
- Structure: `{ facture: { id_facture, num_facture, nom_client, ... } }`

---

## 🚨 PROBLÈME IDENTIFIÉ

### Issue Critique: **`nom_structure` manquant ou undefined**

#### Structure SQL `get_my_factures()` vs `get_facture_details()`

**Hypothèse**: La fonction PostgreSQL `get_my_factures()` utilisée par la liste des factures **ne retourne PAS** le champ `nom_structure` dans sa réponse.

#### Payload API envoyé au service de paiement

**Workflow 1** (ModalFactureSuccess):
```json
{
  "pAppName": "FAYCLICKCOM",
  "pMethode": "OM",
  "pReference": "FCT-2025-001",
  "pClientTel": "771234567",
  "pMontant": 50000,
  "pServiceName": "OFMS",
  "pNomClient": "Amadou Diallo",
  "pnom_structure": "Mon Commerce SARL"    // ✅ PRÉSENT
}
```

**Workflow 2** (ModalPaiement):
```json
{
  "pAppName": "FAYCLICKCOM",
  "pMethode": "OM",
  "pReference": "FCT-2025-001",
  "pClientTel": "771234567",
  "pMontant": 50000,
  "pServiceName": "OFMS",
  "pNomClient": "Amadou Diallo",
  "pnom_structure": undefined              // ❌ MANQUANT !
}
```

---

## 🔬 Analyse de l'Impact

### Pourquoi le polling échoue ?

L'API de paiement wallet **requiert** probablement le champ `pnom_structure` pour:
1. **Créer la demande de paiement** correctement
2. **Générer un UUID valide** lié à la structure
3. **Enregistrer le statut de paiement** dans la base de données

**Conséquence**: Si `pnom_structure` est `undefined` ou manquant:
- La demande de paiement peut être créée avec des données incomplètes
- L'UUID généré pourrait ne pas être correctement lié
- Le polling ne trouve jamais de statut `COMPLETED` car le paiement n'est pas correctement enregistré côté serveur

---

## 📊 Comparaison des Types

### Type `PaymentContext` (types/payment-wallet.ts)
```typescript
export interface PaymentContext {
  facture: {
    id_facture: number;
    num_facture: string;
    nom_client: string;
    tel_client: string;
    montant_total: number;
    montant_restant: number;
    nom_structure?: string;  // ⚠️ OPTIONNEL mais devrait être REQUIS
  };
  montant_acompte: number;
}
```

### Type `FactureComplete` (types/facture.ts)
```typescript
export interface FactureComplete {
  facture: GetMyFactureResponse;  // Contient: id_facture, num_facture, nom_client, tel_client, montant, mt_restant
  articles?: ArticleFacture[];
  // ...
}

// ❌ GetMyFactureResponse ne contient PAS nom_structure !
```

---

## ✅ Solutions Proposées

### Solution 1: Ajouter `nom_structure` dans `get_my_factures()` (RECOMMANDÉ)

**Modification PostgreSQL**:
```sql
-- Ajouter nom_structure dans la fonction get_my_factures()
SELECT
  f.id_facture,
  f.num_facture,
  f.nom_client,
  f.tel_client,
  f.montant,
  f.mt_restant,
  s.nom_structure,  -- ✅ AJOUTER CETTE LIGNE
  ...
FROM factures f
LEFT JOIN structures s ON f.id_structure = s.id_structure
...
```

**Impact**: ✅ Aucun changement dans le code frontend

---

### Solution 2: Récupérer `nom_structure` depuis AuthContext

**Modification**: `components/factures/ModalPaiement.tsx` (ligne 482)

```typescript
const createPaymentContext = (): PaymentContext | null => {
  if (!facture || !montants) return null;

  // ✅ Récupérer nom_structure depuis AuthContext
  const user = authService.getUser();
  const structure = user?.structure;

  return {
    facture: {
      id_facture: facture.facture.id_facture,
      num_facture: facture.facture.num_facture,
      nom_client: facture.facture.nom_client,
      tel_client: facture.facture.tel_client,
      montant_total: facture.facture.montant,
      montant_restant: facture.facture.mt_restant,
      nom_structure: facture.facture.nom_structure || structure?.nom_structure || 'FAYCLICK'  // ✅ FALLBACK
    },
    montant_acompte: montants.montantSaisi
  };
};
```

**Impact**: ✅ Fix immédiat, pas besoin de modification SQL

---

### Solution 3: Charger les détails de la facture avant paiement

**Modification**: `components/factures/ModalPaiement.tsx`

```typescript
// Ajouter un useEffect pour charger les détails complets
useEffect(() => {
  if (isOpen && facture) {
    const loadFullDetails = async () => {
      try {
        const details = await factureService.getFactureDetails(facture.facture.id_facture);
        // Stocker dans un état local
        setFactureDetails(details);
      } catch (error) {
        console.error('Erreur chargement détails:', error);
      }
    };
    loadFullDetails();
  }
}, [isOpen, facture]);

// Utiliser factureDetails au lieu de facture dans createPaymentContext()
```

**Impact**: ⚠️ Appel API supplémentaire, légère latence

---

## 🎯 Recommandation Finale

**Solution 2** est la plus rapide et efficace:
1. ✅ Pas de modification SQL nécessaire
2. ✅ Fix immédiat
3. ✅ Fallback robuste (structure depuis AuthContext)
4. ✅ Compatible avec toutes les structures existantes

**Action immédiate**: Modifier `createPaymentContext()` dans `ModalPaiement.tsx` pour récupérer `nom_structure` depuis `authService.getUser()`.

---

## 📝 Checklist de Vérification

Après correction, vérifier:
- [ ] Payload API contient `pnom_structure` non-undefined
- [ ] UUID généré correctement
- [ ] Polling retourne `COMPLETED` après paiement
- [ ] Facture mise à jour avec le nouveau `mt_restant`
- [ ] Reçu généré correctement

---

## 📚 Fichiers Concernés

1. **`components/factures/ModalPaiement.tsx`** - À corriger (ligne 482)
2. **`components/panier/ModalFactureSuccess.tsx`** - Fonctionne correctement (référence)
3. **`services/payment-wallet.service.ts`** - Service commun (OK)
4. **`components/factures/ModalPaiementQRCode.tsx`** - Composant QR commun (OK)
5. **`types/payment-wallet.ts`** - Rendre `nom_structure` requis (optionnel)

---

**Fin du rapport d'audit** 🔍
