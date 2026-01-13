# API sql_jsonpro

API REST JSON moderne pour exécuter des requêtes PostgreSQL paramétrées. Remplace l'ancien endpoint XML `/api/psql_request`.

## URL de Production

```
https://api.icelabsoft.com/api/sql_jsonpro
```

## Avantages vs Ancienne API XML

| Fonctionnalité | Ancienne API (XML) | Nouvelle API (JSON) |
|----------------|-------------------|---------------------|
| Format | XML avec CDATA | JSON natif |
| Limite taille | 10 KB | 1 MB |
| Encodage spécial | `d`/`f`/`m` pour `[`/`]`/`-` | Aucun |
| Typage | Tout en string | Types natifs |
| Arrays/Embeddings | String encodé | Array JSON natif |
| Mode batch | Non | Oui |

---

## Démarrage Rapide

### Exemple Simple (JavaScript)

```javascript
const response = await fetch('https://api.icelabsoft.com/api/sql_jsonpro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    application: 'fayclick',
    query: 'SELECT * FROM ma_fonction($1, $2)',
    params: [123, 'texte']
  })
});

const result = await response.json();
console.log(result.data.rows);
```

### Exemple avec Embeddings (cas d'usage principal)

```javascript
const embedding = [0.405, -0.323, 0.106, 0.346, -0.120, ...]; // Array de 768 floats

const response = await fetch('https://api.icelabsoft.com/api/sql_jsonpro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    application: 'fayclick',
    query: 'SELECT * FROM save_product_json($1, $2, $3, $4, $5, $6, $7)',
    params: [
      1026,                    // id_produit (number)
      183,                     // id_structure (number)
      JSON.stringify(embedding), // embedding (string JSON)
      'abc123hash...',         // image_hash (string)
      null,                    // image_url (null)
      '224x224',               // dimensions (string)
      0.95                     // confidence (number)
    ]
  })
});
```

---

## Structure de la Requête

```typescript
interface SqlJsonProRequest {
  application: string;          // Nom de l'application (obligatoire)
  query: string;                // Requête SQL avec $1, $2, ... (obligatoire)
  params?: any[];               // Paramètres (optionnel)
  options?: {
    timeout?: number;           // Timeout en ms (défaut: 30000, max: 120000)
    format?: 'array' | 'object'; // Format de réponse (défaut: 'array')
  };
}
```

### Champs

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `application` | string | ✅ | Nom de l'app (fayclick, payecole, alakantine, etc.) |
| `query` | string | ✅ | Requête SQL avec placeholders `$1, $2, ...` |
| `params` | array | ❌ | Paramètres dans l'ordre des placeholders |
| `options.timeout` | number | ❌ | Timeout en ms (défaut: 30000) |

### Types de Paramètres Supportés

| Type JavaScript | Exemple | Conversion PostgreSQL |
|-----------------|---------|----------------------|
| `string` | `"texte"` | `TEXT` |
| `number` (entier) | `42` | `INTEGER` |
| `number` (décimal) | `3.14` | `NUMERIC` |
| `boolean` | `true` | `BOOLEAN` |
| `null` | `null` | `NULL` |
| `array` | `[0.1, -0.2]` | Passé tel quel |
| `object` | `{key: "value"}` | `JSONB` |

---

## Structure de la Réponse

### Succès (HTTP 200)

```typescript
interface SuccessResponse {
  status: 'success';
  code: 'QUERY_SUCCESS';
  message: string;
  data: {
    rows: any[];      // Résultats de la requête
    rowCount: number; // Nombre de lignes
    duration: number; // Temps d'exécution en ms
  };
  timestamp: string;  // ISO 8601
}
```

**Exemple :**

```json
{
  "status": "success",
  "code": "QUERY_SUCCESS",
  "message": "Requête exécutée. 1 résultat(s).",
  "data": {
    "rows": [
      {
        "id": 1,
        "nom": "Produit A",
        "prix": 1500
      }
    ],
    "rowCount": 1,
    "duration": 45
  },
  "timestamp": "2026-01-06T16:24:20.816Z"
}
```

### Erreur

```typescript
interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  error?: {
    type: string;
    detail?: string;
    hint?: string;
  };
  timestamp: string;
}
```

### Codes d'Erreur

| Code | HTTP | Description |
|------|------|-------------|
| `QUERY_SUCCESS` | 200 | Requête exécutée avec succès |
| `INVALID_JSON` | 400 | Corps JSON invalide |
| `MISSING_FIELD` | 400 | Champ requis manquant |
| `INVALID_APPLICATION` | 403 | Application non autorisée |
| `FORBIDDEN_QUERY` | 403 | Requête SQL bloquée (DROP, DELETE, etc.) |
| `TIMEOUT` | 408 | Timeout dépassé |
| `QUERY_ERROR` | 422 | Erreur SQL PostgreSQL |
| `RATE_LIMIT_EXCEEDED` | 429 | Trop de requêtes (100/min) |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

---

## Implémentation Frontend

### TypeScript - Client Complet

```typescript
// api/sqlJsonPro.ts

interface SqlJsonProOptions {
  timeout?: number;
  format?: 'array' | 'object';
}

interface SqlJsonProResponse<T = any> {
  status: 'success' | 'error';
  code: string;
  message: string;
  data?: {
    rows: T[];
    rowCount: number;
    duration: number;
  };
  error?: {
    type: string;
    detail?: string;
    hint?: string;
  };
  timestamp: string;
}

const API_URL = 'https://api.icelabsoft.com/api/sql_jsonpro';

export async function sqlQuery<T = any>(
  application: string,
  query: string,
  params: any[] = [],
  options: SqlJsonProOptions = {}
): Promise<T[]> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      application,
      query,
      params,
      options,
    }),
  });

  const result: SqlJsonProResponse<T> = await response.json();

  if (result.status === 'error') {
    throw new Error(`[${result.code}] ${result.message}`);
  }

  return result.data?.rows ?? [];
}

// Fonction utilitaire pour les embeddings
export async function saveEmbedding(
  idProduit: number,
  idStructure: number,
  embedding: number[],
  imageHash: string,
  imageUrl: string | null = null,
  dimensions: string = '224x224',
  confidence: number = 1.0
) {
  return sqlQuery(
    'fayclick',
    'SELECT * FROM save_product_json($1, $2, $3, $4, $5, $6, $7)',
    [
      idProduit,
      idStructure,
      JSON.stringify(embedding),
      imageHash,
      imageUrl,
      dimensions,
      confidence,
    ]
  );
}
```

### Utilisation

```typescript
import { sqlQuery, saveEmbedding } from './api/sqlJsonPro';

// Requête simple
const produits = await sqlQuery(
  'fayclick',
  'SELECT * FROM produits WHERE id_structure = $1 LIMIT $2',
  [183, 10]
);

// Sauvegarde d'embedding
const embedding = await generateClipEmbedding(imageBase64); // [0.1, -0.2, ...]
const result = await saveEmbedding(1026, 183, embedding, 'hash123');
```

### React Hook

```typescript
// hooks/useSqlQuery.ts
import { useState, useCallback } from 'react';
import { sqlQuery } from '../api/sqlJsonPro';

export function useSqlQuery<T = any>(application: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T[]>([]);

  const execute = useCallback(
    async (query: string, params: any[] = []) => {
      setLoading(true);
      setError(null);

      try {
        const result = await sqlQuery<T>(application, query, params);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [application]
  );

  return { execute, data, loading, error };
}

// Utilisation dans un composant
function ProductList() {
  const { execute, data, loading, error } = useSqlQuery<Product>('fayclick');

  useEffect(() => {
    execute('SELECT * FROM produits WHERE actif = $1', [true]);
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <ul>
      {data.map(p => <li key={p.id}>{p.nom}</li>)}
    </ul>
  );
}
```

### Vue.js Composable

```typescript
// composables/useSqlQuery.ts
import { ref } from 'vue';

const API_URL = 'https://api.icelabsoft.com/api/sql_jsonpro';

export function useSqlQuery<T = any>(application: string) {
  const data = ref<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function execute(query: string, params: any[] = []) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application, query, params }),
      });

      const result = await response.json();

      if (result.status === 'error') {
        throw new Error(result.message);
      }

      data.value = result.data?.rows ?? [];
      return data.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return { execute, data, loading, error };
}
```

---

## Mode Batch

Exécuter plusieurs requêtes en une seule transaction :

```javascript
const response = await fetch('https://api.icelabsoft.com/api/sql_jsonpro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    application: 'fayclick',
    batch: [
      {
        query: 'SELECT * FROM produits WHERE id = $1',
        params: [1]
      },
      {
        query: 'SELECT * FROM categories WHERE id = $1',
        params: [5]
      }
    ]
  })
});
```

**Réponse :**

```json
{
  "status": "success",
  "code": "BATCH_SUCCESS",
  "message": "Batch exécuté. 2 requête(s).",
  "data": {
    "results": [
      { "rows": [...], "rowCount": 1 },
      { "rows": [...], "rowCount": 1 }
    ],
    "totalDuration": 85
  }
}
```

---

## Applications Disponibles

Liste des applications configurées :

- `fayclick` - FayClick V2
- `payecole` / `payecole_24` - PayEcole
- `alakantine` - Alakantine
- `senmarche` - SenMarché
- `eticket` - E-Ticket
- `masterclass` - MasterClass
- Et autres...

Pour voir la liste complète :

```bash
curl https://api.icelabsoft.com/api/sql_jsonpro
```

---

## Endpoints Disponibles

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/sql_jsonpro` | Info API + liste applications |
| `GET` | `/api/sql_jsonpro/test` | Test connexion toutes les DBs |
| `POST` | `/api/sql_jsonpro` | Exécuter une requête SQL |

---

## Limites et Sécurité

- **Rate limiting** : 100 requêtes/minute par IP
- **Timeout max** : 120 secondes
- **Taille body max** : 1 MB
- **Requêtes bloquées** : `DROP`, `TRUNCATE`, `DELETE FROM`, `ALTER`, `CREATE`, `GRANT`, `REVOKE`

---

## Migration depuis l'Ancienne API XML

### Avant (XML)

```javascript
// Encodage nécessaire: [ → d, ] → f, - → m
const embeddingStr = embedding.map(v =>
  v.toString().replace('[', 'd').replace(']', 'f').replace('-', 'm')
).join(',');

const xml = `<?xml version="1.0"?>
<request>
  <application>fayclick</application>
  <requete_sql>SELECT * FROM save_product_embedding(1026, 183, 'd${embeddingStr}f', 'hash', NULL, '224x224', 1)</requete_sql>
</request>`;

await fetch('/api/psql_request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/xml' },
  body: xml
});
```

### Après (JSON)

```javascript
// Plus d'encodage ! Array natif
await fetch('/api/sql_jsonpro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    application: 'fayclick',
    query: 'SELECT * FROM save_product_json($1, $2, $3, $4, $5, $6, $7)',
    params: [1026, 183, JSON.stringify(embedding), 'hash', null, '224x224', 1]
  })
});
```

---

## Debugging

### Tester avec cURL

```bash
# Info API
curl https://api.icelabsoft.com/api/sql_jsonpro

# Test connexions
curl https://api.icelabsoft.com/api/sql_jsonpro/test

# Requête simple
curl -X POST https://api.icelabsoft.com/api/sql_jsonpro \
  -H "Content-Type: application/json" \
  -d '{"application": "fayclick", "query": "SELECT NOW()", "params": []}'
```

### Logs Serveur

```bash
docker logs -f sql_jsonpro_api
```

---

## Support

- **Documentation Swagger** : https://api.icelabsoft.com/sql_jsonpro/docs
- **Version** : 1.0.0
- **Port interne** : 5014
