# Rapport - Problème CORS avec l'API FayClick

## Date : 26 Août 2025
## Auteur : Équipe Développement FayClick V2

---

## 🚨 Problème Identifié

L'API refuse certains headers personnalisés lors des requêtes depuis les navigateurs, causant une erreur CORS.

### Message d'erreur
```
Access to fetch at 'https://api.icelabsoft.com/api/psql_request/api/psql_request' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Request header field x-application is not allowed by Access-Control-Allow-Headers 
in preflight response.
```

## 📊 Impact

- **Environnements affectés** : 
  - Développement (localhost:3000)
  - Production (v2.fayclick.net)
  
- **Fonctionnalités impactées** :
  - Connexion utilisateur
  - Toutes les requêtes API depuis le navigateur
  
- **Gravité** : **ÉLEVÉE** - Bloque complètement l'application web

## 🔍 Analyse Technique

### Headers problématiques
Les headers suivants sont refusés par la politique CORS de l'API :
- `X-Application`
- `X-Timestamp`

### Test comparatif

| Méthode | Headers envoyés | Résultat |
|---------|-----------------|----------|
| curl/Node.js | Avec X-Application, X-Timestamp | ✅ Fonctionne |
| Navigateur | Avec X-Application, X-Timestamp | ❌ Erreur CORS |
| Navigateur | Sans headers personnalisés | ✅ Fonctionne |

## ✅ Solution Temporaire Appliquée

Nous avons retiré les headers problématiques du code :

```javascript
// Avant (causait l'erreur)
headers: {
  'Content-Type': 'application/xml',
  'Accept': 'application/json',
  'X-Application': appConfig.name,      // ❌ Bloqué par CORS
  'X-Timestamp': Date.now().toString(), // ❌ Bloqué par CORS
}

// Après (fonctionne)
headers: {
  'Content-Type': 'application/xml',
  'Accept': 'application/json',
}
```

## 🛠️ Solution Recommandée (Côté API)

### Configuration CORS à ajouter sur l'API

L'API doit configurer les headers CORS suivants :

```http
Access-Control-Allow-Origin: http://localhost:3000, https://v2.fayclick.net
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, X-Application, X-Timestamp
Access-Control-Max-Age: 86400
```

### Exemple de configuration (selon votre serveur)

#### Express.js
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://v2.fayclick.net'],
  allowedHeaders: ['Content-Type', 'Accept', 'X-Application', 'X-Timestamp'],
  methods: ['GET', 'POST', 'OPTIONS']
}));
```

#### Nginx
```nginx
add_header 'Access-Control-Allow-Origin' '$http_origin' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Accept, X-Application, X-Timestamp' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
```

#### Apache
```apache
Header set Access-Control-Allow-Origin "http://localhost:3000 https://v2.fayclick.net"
Header set Access-Control-Allow-Headers "Content-Type, Accept, X-Application, X-Timestamp"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
```

## 📋 Actions Requises

### Côté API (Équipe Backend)
1. ✅ Ajouter les headers `X-Application` et `X-Timestamp` à la liste des headers autorisés
2. ✅ Configurer les origines autorisées (localhost:3000 et v2.fayclick.net)
3. ✅ S'assurer que les requêtes OPTIONS (preflight) sont gérées correctement

### Côté Application (Notre équipe)
1. ✅ **Fait** : Retrait temporaire des headers problématiques
2. ⏳ **En attente** : Réactiver les headers une fois l'API mise à jour
3. ✅ **Alternative** : Si les headers sont critiques, implémenter un proxy API côté serveur

## 🎯 Bénéfices des Headers (si réactivés)

Les headers `X-Application` et `X-Timestamp` permettraient :
- **X-Application** : Identifier quelle application fait la requête (payecole, facturier, etc.)
- **X-Timestamp** : Traçabilité et debugging des requêtes

## 📞 Contact

Pour toute question sur ce rapport :
- Équipe Dev FayClick V2
- Application concernée : v2.fayclick.net

---

**Note** : L'application fonctionne actuellement sans ces headers. Leur réactivation est optionnelle mais recommandée pour une meilleure traçabilité.