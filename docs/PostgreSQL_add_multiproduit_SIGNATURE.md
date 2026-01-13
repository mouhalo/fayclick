# Fonction PostgreSQL : `add_multiproduit`

## 📋 Informations générales

**Nom de la fonction** : `add_multiproduit`
**Base de données** : PostgreSQL sur serveur 154.12.224.173:3253
**Application** : FayClick V2

---

## 🔍 Signature de la fonction

### Paramètres d'entrée

```sql
add_multiproduit(
  pid_structure INTEGER,
  pproduits JSONB
)
```

#### Détail des paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `pid_structure` | `INTEGER` | ID de la structure (commerce/entreprise) |
| `pproduits` | `JSONB` | Tableau JSON des produits à créer |

### Format du JSONB `pproduits`

Le paramètre `pproduits` doit être un tableau d'objets JSON avec la structure suivante :

```json
[
  {
    "nom_produit": "string",
    "cout_revient": number,
    "prix_vente": number,
    "qte_stock": number
  },
  ...
]
```

#### Exemple de JSONB valide

```json
[
  {
    "nom_produit": "Coca-Cola 50cl",
    "cout_revient": 300,
    "prix_vente": 500,
    "qte_stock": 100
  },
  {
    "nom_produit": "Pain au chocolat",
    "cout_revient": 150,
    "prix_vente": 250,
    "qte_stock": 50
  }
]
```

---

## 📤 Valeur de retour

La fonction retourne un objet JSON avec la structure suivante :

```json
{
  "success": boolean,
  "message": "string",
  "data": {
    "produits_ids": [number, number, ...]
  }
}
```

### Structure de la réponse

| Champ | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` si la création a réussi, `false` sinon |
| `message` | `string` | Message descriptif du résultat |
| `data.produits_ids` | `number[]` | Tableau des IDs des produits créés (dans l'ordre) |

#### Exemple de réponse réussie

```json
{
  "success": true,
  "message": "3 produits créés avec succès",
  "data": {
    "produits_ids": [1245, 1246, 1247]
  }
}
```

#### Exemple de réponse en erreur

```json
{
  "success": false,
  "message": "Erreur : nom_produit manquant pour le produit 2",
  "data": null
}
```

---

## 💻 Utilisation dans le code FayClick

### Appel depuis TypeScript (via `database.service.ts`)

```typescript
import databaseService from '@/services/database.service';

async function creerMultiplesProduits(idStructure: number) {
  // Construire le JSON des produits
  const produitsJson = [
    {
      nom_produit: "Produit A",
      cout_revient: 1000,
      prix_vente: 1500,
      qte_stock: 20
    },
    {
      nom_produit: "Produit B",
      cout_revient: 500,
      prix_vente: 800,
      qte_stock: 50
    }
  ];

  // Construire la requête SQL
  const query = `SELECT * FROM add_multiproduit(${idStructure}, '${JSON.stringify(produitsJson)}'::jsonb)`;

  // Exécuter la requête
  const result = await databaseService.query(query);

  // Vérifier le résultat
  if (!result?.success) {
    throw new Error(result?.message || 'Erreur lors de la création des produits');
  }

  // Récupérer les IDs des produits créés
  const produitsIds: number[] = result.data?.produits_ids || [];

  console.log('Produits créés avec les IDs:', produitsIds);

  return produitsIds;
}
```

### Exemple complet tiré de `ModalEnrolementProduits.tsx`

```typescript
const handleSave = async () => {
  setIsSaving(true);

  try {
    const validProduits = produits.filter(p => !p.isProcessing && !p.error);

    // Construire le JSON pour add_multiproduit
    const produitsJson = validProduits.map(p => ({
      nom_produit: p.nomProduit,
      cout_revient: Number(p.coutRevient),
      prix_vente: Number(p.prixVente),
      qte_stock: p.qteStock
    }));

    console.log('[Enrolement] Sauvegarde produits:', produitsJson);

    // Appeler add_multiproduit
    const query = `SELECT * FROM add_multiproduit(${idStructure}, '${JSON.stringify(produitsJson)}'::jsonb)`;
    const result = await databaseService.query(query);

    console.log('[Enrolement] Résultat add_multiproduit:', result);

    if (!result?.success) {
      throw new Error(result?.message || 'Erreur lors de la création des produits');
    }

    const produitsIds: number[] = result.data?.produits_ids || [];

    // Faire quelque chose avec les IDs...
    produitsIds.forEach((id, index) => {
      console.log(`Produit "${validProduits[index].nomProduit}" créé avec ID: ${id}`);
    });

  } catch (error) {
    console.error('[Enrolement] Erreur:', error);
    throw error;
  } finally {
    setIsSaving(false);
  }
};
```

---

## ⚠️ Points d'attention

### 1. Échappement JSON
Le JSON doit être correctement échappé dans la requête SQL. Utiliser `JSON.stringify()` puis entourer de quotes simples et caster en `::jsonb`.

```typescript
// ✅ Correct
const query = `SELECT * FROM add_multiproduit(${idStructure}, '${JSON.stringify(produitsJson)}'::jsonb)`;

// ❌ Incorrect (guillemets manquants ou mauvais cast)
const query = `SELECT * FROM add_multiproduit(${idStructure}, ${JSON.stringify(produitsJson)})`;
```

### 2. Validation des données
Assurez-vous que tous les champs requis sont présents :
- `nom_produit` : non vide
- `cout_revient` : nombre positif
- `prix_vente` : nombre positif
- `qte_stock` : nombre entier positif ou zéro

### 3. Conversion des types
Les valeurs numériques doivent être converties explicitement :

```typescript
// ✅ Correct
const produitsJson = produits.map(p => ({
  nom_produit: p.nomProduit,
  cout_revient: Number(p.coutRevient),  // Conversion explicite
  prix_vente: Number(p.prixVente),      // Conversion explicite
  qte_stock: p.qteStock
}));
```

### 4. Ordre des IDs retournés
Les IDs dans `produits_ids` sont retournés **dans le même ordre** que les produits envoyés dans le JSON. Vous pouvez donc faire une correspondance directe par index.

```typescript
const produitsIds: number[] = result.data?.produits_ids || [];

for (let i = 0; i < validProduits.length; i++) {
  const produit = validProduits[i];
  const idProduit = produitsIds[i];

  console.log(`${produit.nom_produit} → ID: ${idProduit}`);
}
```

---

## 🔗 Fichiers liés

- **Utilisation** : `D:\React_Prj\fayclick\components\visual-recognition\ModalEnrolementProduits.tsx` (ligne 353)
- **Service DB** : `D:\React_Prj\fayclick\services\database.service.ts`
- **Serveur PostgreSQL** : `154.12.224.173:3253`
- **Base de données** : Multiples (alakantine_db, magasinpro_db, etc.)

---

## 📝 Notes supplémentaires

### Performance
Cette fonction permet de créer **plusieurs produits en une seule transaction**, ce qui est beaucoup plus performant que de créer les produits un par un.

### Transaction atomique
Si la création d'un produit échoue, **toute la transaction est annulée** (rollback). Aucun produit ne sera créé si un seul est invalide.

### Logs recommandés
Pour faciliter le debugging, loggez toujours :
1. Le JSON envoyé (avant l'appel)
2. Le résultat complet (après l'appel)
3. Les IDs retournés (mapping avec les noms)

```typescript
console.log('[add_multiproduit] Envoi:', produitsJson);
console.log('[add_multiproduit] Résultat:', result);
console.log('[add_multiproduit] IDs créés:', result.data?.produits_ids);
```

---

## 🧪 Requête de test

Pour tester directement la fonction PostgreSQL :

```sql
SELECT * FROM add_multiproduit(
  183,  -- ID de la structure de test
  '[
    {
      "nom_produit": "Test Produit 1",
      "cout_revient": 100,
      "prix_vente": 150,
      "qte_stock": 10
    },
    {
      "nom_produit": "Test Produit 2",
      "cout_revient": 200,
      "prix_vente": 300,
      "qte_stock": 5
    }
  ]'::jsonb
);
```

---

**Document généré le** : 2026-01-06
**Auteur** : Claude Code (DBA PostgreSQL Expert)
**Version** : 1.0
