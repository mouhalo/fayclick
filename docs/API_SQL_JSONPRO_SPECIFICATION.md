# Spécification Technique : API sql_jsonpro

## 📋 Résumé Exécutif

Proposition d'une nouvelle API REST pour remplacer l'endpoint XML actuel (`/api/psql_request`) par une solution JSON moderne, robuste et sans les limitations actuelles.

**URL proposée :** `https://api.icelabsoft.com/api/sql_jsonpro`

---

## 🔴 Problèmes actuels avec `/api/psql_request`

| Problème | Impact | Workaround actuel |
|----------|--------|-------------------|
| Limite 10K caractères | Impossible d'envoyer des embeddings 768D | Réduction précision à 5 décimales |
| Format XML | Parsing complexe, caractères spéciaux problématiques | Encodage `d`/`f`/`m` pour `[`/`]`/`-` |
| CDATA instable | Comportement inconsistant | Suppression CDATA |
| Pas de typage | Tout passe en string | Cast côté PostgreSQL |
| Pas de batch | 1 requête = 1 appel HTTP | Boucles côté client |

---

## 🟢 Spécification de la nouvelle API

### Endpoint Principal

```
POST https://api.icelabsoft.com/api/sql_jsonpro
Content-Type: application/json
```

### Structure de la Requête

```json
{
  "application": "fayclick",
  "query": "SELECT * FROM ma_fonction($1, $2, $3)",
  "params": [123, "texte", [0.1, -0.2, 0.3]],
  "options": {
    "timeout": 30000,
    "format": "array" | "object"
  }
}
```

### Champs

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `application` | string | ✅ | Nom de l'application (validation whitelist) |
| `query` | string | ✅ | Requête SQL avec placeholders `$1, $2, ...` |
| `params` | array | ❌ | Paramètres typés (string, number, boolean, array, null) |
| `options.timeout` | number | ❌ | Timeout en ms (défaut: 30000, max: 120000) |
| `options.format` | string | ❌ | Format réponse: "array" (défaut) ou "object" |

---

## 📊 Gestion des Types

### Mapping automatique JSON → PostgreSQL

| Type JSON | Type PostgreSQL | Exemple |
|-----------|-----------------|---------|
| `string` | `TEXT` | `"hello"` → `'hello'` |
| `number` (entier) | `INTEGER` | `42` → `42` |
| `number` (décimal) | `NUMERIC` | `3.14` → `3.14` |
| `boolean` | `BOOLEAN` | `true` → `TRUE` |
| `null` | `NULL` | `null` → `NULL` |
| `array` (numbers) | `FLOAT8[]` | `[0.1, -0.2]` → `ARRAY[0.1, -0.2]::float8[]` |
| `array` (strings) | `TEXT[]` | `["a", "b"]` → `ARRAY['a', 'b']::text[]` |
| `object` | `JSONB` | `{"k": "v"}` → `'{"k": "v"}'::jsonb` |

---

## 🎯 Cas d'Usage : Embeddings Visuels

### Requête actuelle (problématique)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>SELECT * FROM save_product_embedding(1036, 183, 'd0.40549,m0.32347,...f', 'hash', NULL, '224x224', 1)</requete_sql>
</request>
```

**Problèmes :**
- Encodage `d`/`f`/`m` nécessaire
- Limite 10K caractères
- Précision réduite obligatoire

### Requête avec sql_jsonpro

```json
{
  "application": "fayclick",
  "query": "SELECT * FROM save_product_embedding($1, $2, $3, $4, $5, $6, $7)",
  "params": [
    1036,
    183,
    [0.40549105405807495, -0.3234715461730957, 0.10699113458395004, ...],
    "e87f2050105440a5e820db0563777ae82fa80331e68aeb7282cae5566b0bf060",
    null,
    "224x224",
    1.0
  ]
}
```

**Avantages :**
- ✅ Pas d'encodage spécial
- ✅ Pas de limite de taille (body JSON standard)
- ✅ Précision complète préservée
- ✅ Typage natif des arrays

---

## 📤 Structure de la Réponse

### Succès

```json
{
  "status": "success",
  "code": "QUERY_SUCCESS",
  "message": "Requête exécutée avec succès",
  "data": {
    "rows": [...],
    "rowCount": 1,
    "duration": 45
  },
  "timestamp": "2026-01-06T12:00:00.000Z"
}
```

### Erreur

```json
{
  "status": "error",
  "code": "QUERY_ERROR",
  "message": "Erreur lors de l'exécution",
  "error": {
    "type": "PostgresError",
    "detail": "column \"xyz\" does not exist",
    "hint": "Vérifiez le nom de la colonne",
    "position": 42
  },
  "timestamp": "2026-01-06T12:00:00.000Z"
}
```

### Codes d'erreur

| Code | HTTP | Description |
|------|------|-------------|
| `QUERY_SUCCESS` | 200 | Requête exécutée avec succès |
| `INVALID_JSON` | 400 | Corps de requête JSON invalide |
| `MISSING_FIELD` | 400 | Champ requis manquant |
| `INVALID_APPLICATION` | 403 | Application non autorisée |
| `QUERY_ERROR` | 422 | Erreur SQL PostgreSQL |
| `TIMEOUT` | 408 | Timeout dépassé |
| `INTERNAL_ERROR` | 500 | Erreur serveur interne |

---

## 🔐 Sécurité

### Validation des requêtes

1. **Whitelist applications** : Seules les applications enregistrées sont autorisées
2. **Paramètres préparés** : Utiliser `$1, $2, ...` pour éviter les injections SQL
3. **Limite de taille body** : 1 MB max (configurable)
4. **Rate limiting** : 100 req/min par IP (configurable)
5. **Timeout** : Max 120 secondes

### Requêtes interdites

```javascript
// Bloquer les mots-clés dangereux en dehors des fonctions autorisées
const BLOCKED_KEYWORDS = [
  'DROP', 'TRUNCATE', 'DELETE FROM', 'UPDATE ... SET',
  'ALTER', 'CREATE', 'GRANT', 'REVOKE'
];
```

---

## 🔄 Mode Batch (optionnel)

Pour exécuter plusieurs requêtes en une seule transaction :

```json
{
  "application": "fayclick",
  "batch": [
    {
      "query": "SELECT * FROM fonction1($1)",
      "params": [123]
    },
    {
      "query": "SELECT * FROM fonction2($1, $2)",
      "params": ["test", true]
    }
  ],
  "options": {
    "transaction": true
  }
}
```

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "results": [
      { "rows": [...], "rowCount": 1 },
      { "rows": [...], "rowCount": 5 }
    ],
    "totalDuration": 120
  }
}
```

---

## 🛠️ Implémentation Backend (Python/Flask)

```python
from flask import Flask, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import json

app = Flask(__name__)

ALLOWED_APPS = {'fayclick', 'alakantine', 'other_app'}

@app.route('/api/sql_jsonpro', methods=['POST'])
def sql_jsonpro():
    try:
        data = request.get_json()

        # Validation
        if not data:
            return jsonify({
                'status': 'error',
                'code': 'INVALID_JSON',
                'message': 'Corps JSON invalide'
            }), 400

        app_name = data.get('application')
        if app_name not in ALLOWED_APPS:
            return jsonify({
                'status': 'error',
                'code': 'INVALID_APPLICATION',
                'message': f'Application non autorisée: {app_name}'
            }), 403

        query = data.get('query')
        params = data.get('params', [])
        timeout = data.get('options', {}).get('timeout', 30000)

        # Conversion des arrays pour PostgreSQL
        converted_params = []
        for p in params:
            if isinstance(p, list) and all(isinstance(x, (int, float)) for x in p):
                # Array de nombres → float8[]
                converted_params.append(p)
            else:
                converted_params.append(p)

        # Exécution
        conn = get_db_connection()
        conn.set_session(autocommit=True)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SET statement_timeout = {timeout}")
            cur.execute(query, converted_params)
            rows = cur.fetchall()

        return jsonify({
            'status': 'success',
            'code': 'QUERY_SUCCESS',
            'message': f'Requête exécutée. {len(rows)} résultat(s).',
            'data': {
                'rows': rows,
                'rowCount': len(rows)
            }
        })

    except psycopg2.Error as e:
        return jsonify({
            'status': 'error',
            'code': 'QUERY_ERROR',
            'message': str(e.pgerror),
            'error': {
                'type': 'PostgresError',
                'detail': e.diag.message_detail,
                'hint': e.diag.message_hint
            }
        }), 422

    except Exception as e:
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': str(e)
        }), 500
```

---

## 📱 Implémentation Frontend (TypeScript)

```typescript
interface SqlJsonProRequest {
  application: string;
  query: string;
  params?: (string | number | boolean | null | number[] | string[])[];
  options?: {
    timeout?: number;
    format?: 'array' | 'object';
  };
}

interface SqlJsonProResponse<T = unknown> {
  status: 'success' | 'error';
  code: string;
  message: string;
  data?: {
    rows: T[];
    rowCount: number;
    duration?: number;
  };
  error?: {
    type: string;
    detail?: string;
    hint?: string;
  };
}

async function sqlJsonPro<T>(request: SqlJsonProRequest): Promise<T[]> {
  const response = await fetch('https://api.icelabsoft.com/api/sql_jsonpro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const result: SqlJsonProResponse<T> = await response.json();

  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.data?.rows ?? [];
}

// Exemple d'utilisation pour les embeddings
async function saveEmbedding(
  idProduit: number,
  idStructure: number,
  embedding: number[],  // Array natif, pas besoin d'encodage !
  imageHash: string
) {
  return sqlJsonPro({
    application: 'fayclick',
    query: 'SELECT * FROM save_product_embedding($1, $2, $3, $4, $5, $6, $7)',
    params: [
      idProduit,
      idStructure,
      embedding,  // ✅ Passé directement comme array JSON
      imageHash,
      null,
      '224x224',
      1.0
    ]
  });
}
```

---

## 📈 Comparatif Performance

| Métrique | XML actuel | JSON proposé | Gain |
|----------|------------|--------------|------|
| Taille requête embedding 768D | ~15 KB (encodé) | ~12 KB (natif) | -20% |
| Parsing serveur | ~5ms (XML) | ~1ms (JSON) | -80% |
| Complexité client | Encodage d/f/m | Aucun | ∞ |
| Limite taille | 10 KB | 1 MB | +100x |
| Support arrays natif | ❌ | ✅ | - |
| Support batch | ❌ | ✅ | - |

---

## 🚀 Plan de Migration

### Phase 1 : Développement (1-2 jours)
- Créer l'endpoint `/api/sql_jsonpro`
- Implémenter la validation et le parsing JSON
- Ajouter le support des paramètres typés

### Phase 2 : Tests (1 jour)
- Tests unitaires
- Tests d'intégration avec FayClick
- Tests de charge

### Phase 3 : Déploiement (0.5 jour)
- Déploiement en production
- Mise à jour du frontend FayClick
- Documentation API

### Phase 4 : Dépréciation (optionnel)
- Ajouter header de dépréciation sur `/api/psql_request`
- Migration progressive des autres applications

---

## 📞 Contact

Pour toute question sur cette spécification :
- **Projet** : FayClick V2
- **Date** : 6 janvier 2026
- **Version** : 1.0

---

*Document généré automatiquement par Claude Code*
