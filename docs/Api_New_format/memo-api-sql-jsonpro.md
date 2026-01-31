# Mémo Technique — API sql_jsonpro

**Date :** 31 janvier 2026
**Auteur :** Équipe SYCAD-PILOT
**Usage :** Référence pour intégration dans tout projet front-end

---

## 1. Principe

L'API `sql_jsonpro` est un point d'entrée HTTP unique qui permet d'exécuter des **fonctions PostgreSQL** enregistrées côté serveur. Chaque application dispose d'un identifiant (`application`) qui détermine la base de données et les fonctions accessibles.

**Endpoint :**

```
POST https://api.icelabsoft.com/api/sql_jsonpro
```

**Content-Type :** `application/json`

---

## 2. Payload

```json
{
  "application": "nom_application",
  "query": "nom_fonction_postgresql", //JAMAIS DE INSERT-UPDATE-DELETE
  "params": [param1, param2, ...]
}
```

| Champ         | Type     | Description                                                    |
|---------------|----------|----------------------------------------------------------------|
| `application` | `string` | Identifiant de l'application (fourni par l'administrateur BDD) |
| `query`       | `string` | Nom exact de la fonction PostgreSQL à appeler                  |
| `params`      | `array`  | Paramètres positionnels de la fonction (ordre important)       |

> **Prérequis :** Avant toute intégration, demander le nom `application` associé à votre projet. Sans ce nom, aucune requête ne fonctionnera.

---

## 3. Réponse

```json
{
  "status": "success",
  "code": "OK",
  "message": "Query executed",
  "data": {
    "rows": [ ... ],
    "rowCount": 1,
    "duration": 12
  }
}
```

### Enveloppe PostgreSQL

Les fonctions retournent leurs résultats dans une enveloppe portant le nom de la fonction :

```json
{
  "rows": [
    { "get_utilisateur": { "id": 1, "nom": "Dupont", "email": "a@b.com" } }
  ]
}
```

Il faut donc **déballer** cette enveloppe côté client pour obtenir l'objet utile :

```typescript
const row = response.data.rows[0];
const keys = Object.keys(row);
const data = row[keys[0]]; // → { id: 1, nom: "Dupont", email: "a@b.com" }
```

### En cas d'erreur

```json
{
  "status": "error",
  "code": "QUERY_ERROR",
  "message": "Description de l'erreur",
  "data": null
}
```

---

## 4. Exemples

### Exemple 1 — Authentification

```javascript
const res = await fetch("https://api.icelabsoft.com/api/sql_jsonpro", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    application: "pilot_task",
    query: "login_utilisateur",
    params: ["user@example.com", "motdepasse123"]
  })
});
const result = await res.json();
// result.data.rows[0].login_utilisateur → { id, nom, prenom, role, ... }
```

### Exemple 2 — Lecture avec paramètres

```javascript
const res = await fetch("https://api.icelabsoft.com/api/sql_jsonpro", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    application: "pilot_task",
    query: "get_taches_by_projet",
    params: [42]
  })
});
const result = await res.json();
// result.data.rows → [{ "get_taches_by_projet": [{ id, titre, statut, ... }, ...] }]
// Après déballage + flat : [{ id, titre, statut, ... }, ...]
```

### Exemple 3 — Insertion / Mutation

```javascript
const res = await fetch("https://api.icelabsoft.com/api/sql_jsonpro", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    application: "pilot_task",
    query: "creer_tache",
    params: ["Titre de la tâche", "Description", "haute", "2026-03-15", 42]
  })
});
const result = await res.json();
// result.data.rows[0].creer_tache → { id: 123 } (ID de la tâche créée)
```

---

## 5. CORS — Contournement

L'API renvoie un double header `Access-Control-Allow-Origin: *, *` qui bloque les appels directs depuis un navigateur. Deux solutions :

| Environnement | Solution                                                                 |
|---------------|--------------------------------------------------------------------------|
| Développement | Proxy via API route du framework (Next.js, Nuxt, etc.)                   |
| Production    | Proxy serveur via `.htaccess` (Apache) ou `nginx.conf` avec reverse proxy |

**Exemple `.htaccess` (Apache avec mod_proxy) :**

```apache
RewriteEngine On
RewriteRule ^api/sql$ https://api.icelabsoft.com/api/sql_jsonpro [P,L]
```

Le front-end appelle alors `/api/sql` au lieu de l'URL directe.

---

## 6. Résumé

1. Obtenir le nom `application` auprès de l'admin BDD
2. Toutes les requêtes sont des `POST` avec `{application, query, params}`
3. Déballer l'enveloppe `{ "nom_fonction": ... }` dans chaque row
4. Mettre en place un proxy pour contourner le CORS
