# Guide de Communication API FayClick V2

## 📌 Architecture de Communication

FayClick V2 utilise une architecture de communication XML/JSON pour interagir avec une base de données PostgreSQL via une API REST intermédiaire.

```
[Application Next.js] → [API XML] → [Serveur API] → [PostgreSQL] → [Réponse JSON]
```

## 🔄 Flux de Communication Détaillé

### 1. Configuration de l'Environnement

L'API détecte automatiquement l'environnement selon l'URL :

```typescript
// config/env.ts
const API_CONFIG = {
  // Développement : localhost → API locale
  DEV: 'http://127.0.0.1:5000/api/psql_request/api/psql_request',
  
  // Production : fayclick.net → API production
  PROD: 'https://api.icelabsoft.com/api/psql_request/api/psql_request'
}
```

### 2. Construction de la Requête XML

Toutes les requêtes sont formatées en XML avec la structure suivante :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>SELECT * FROM fonction_postgres(param1, param2)</requete_sql>
</request>
```

### 3. Service Database

Le `DatabaseService` gère toute la communication :

```typescript
// services/database.service.ts
class DatabaseService {
  // Méthode principale pour envoyer une requête
  async envoyerRequeteApi(application_name: string, requeteSql: string) {
    // 1. Construction du XML
    const xml = this.construireXml(application_name, requeteSql);
    
    // 2. Envoi avec fetch
    const response = await fetch(API_CONFIG.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/json',
      },
      body: xml
    });
    
    // 3. Parse de la réponse JSON
    const responseData = await response.json();
    
    // 4. Extraction des données
    return responseData.datas || responseData.data || [];
  }
}
```

## 📊 Extraction des Données

### Utilisation du DataExtractor

Le `dataExtractor` simplifie l'extraction des données depuis les réponses API :

```typescript
// utils/dataExtractor.ts
import { extractSingleDataFromResult } from '@/utils/dataExtractor';

// Pour un seul résultat
const userData = extractSingleDataFromResult<UserType>(result[0]);

// Pour un tableau de résultats
const allData = extractDataFromResults<DataType>(results);
```

### Structure des Réponses API

Les réponses suivent généralement ce format :

```json
{
  "status": "success",
  "message": "Requête exécutée avec succès",
  "datas": [
    {
      // Données directes ou dans result_json
      "id": 1,
      "nom": "Exemple",
      // ou
      "result_json": {
        "id": 1,
        "nom": "Exemple"
      }
    }
  ]
}
```

## 🔐 Authentification - Exemple Complet

### 1. Service d'Authentification

```typescript
// services/auth.service.ts
export class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Appel de la fonction PostgreSQL
    const results = await DatabaseService.checkUserCredentials(
      credentials.login, 
      credentials.pwd
    );
    
    // Extraction des données avec dataExtractor
    const userData = extractSingleDataFromResult<UserCredentialsResult>(results[0]);
    
    if (userData && userData.actif) {
      return {
        token: this.generateSessionToken(userData),
        user: userData
      };
    }
    
    throw new ApiException('Identifiants incorrects', 401);
  }
}
```

### 2. Route API Next.js

```typescript
// app/api/auth/login/route.ts
import { authService } from '@/services/auth.service';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const credentials = {
    login: body.username,
    pwd: body.password
  };
  
  const loginResponse = await authService.login(credentials);
  
  // Sauvegarde du token et utilisateur
  authService.saveToken(loginResponse.token);
  authService.saveUser(loginResponse.user);
  
  return NextResponse.json(loginResponse);
}
```

### 3. Utilisation côté Client

```typescript
// Depuis un composant React
const handleLogin = async (username: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  // data contient { token, user }
};
```

## 📈 Dashboard - Récupération des Données par Type de Structure

### Service Dashboard

```typescript
// services/dashboard.service.ts
export class DashboardService {
  async getDashboardData(structureId: number): Promise<DashboardData> {
    // Appel fonction PostgreSQL
    const results = await DatabaseService.getDashboard(structureId.toString());
    
    // Extraction avec dataExtractor
    const data = extractSingleDataFromResult<DashboardRawData>(results[0]);
    
    // Transformation selon le type de structure
    return this.transformDashboardData(data);
  }
  
  private transformDashboardData(raw: DashboardRawData): DashboardData {
    const baseData = {
      structureInfo: {
        id: raw.id_structure,
        nom: raw.nom_structure,
        type: raw.type_structure,
        logo: raw.logo
      }
    };
    
    // Adaptation selon le type
    switch(raw.type_structure) {
      case 'SCOLAIRE':
        return {
          ...baseData,
          metrics: {
            total_eleves: raw.total_eleves,
            mt_total_factures: raw.mt_total_factures,
            mt_total_payees: raw.mt_total_payees,
            mt_total_impayees: raw.mt_total_impayees
          }
        };
      
      case 'COMMERCIALE':
        return {
          ...baseData,
          metrics: {
            total_produits: raw.total_produits,
            total_clients: raw.total_clients,
            mt_valeur_stocks: raw.mt_valeur_stocks
          }
        };
      
      // Autres types...
    }
  }
}
```

## 🛠️ Fonctions PostgreSQL Disponibles

### Authentification
```sql
-- Vérification des identifiants
SELECT * FROM check_user_credentials('login', 'password');

-- Retourne: id, username, nom_groupe, id_structure, nom_structure, 
--          pwd_changed, actif, type_structure, logo, etc.
```

### Dashboard
```sql
-- Récupération des données dashboard
SELECT * FROM get_dashboard('96');

-- Retourne des métriques spécifiques selon type_structure:
-- SCOLAIRE: total_eleves, mt_total_factures, mt_total_payees, mt_total_impayees
-- COMMERCIALE: total_produits, total_clients, mt_valeur_stocks
-- IMMOBILIER: total_clients, mt_total_factures, mt_total_payees, mt_total_impayees
-- PRESTATAIRE: total_services, total_clients, mt_chiffre_affaire
```

### Événements
```sql
-- Liste des événements
SELECT * FROM get_list_events();
```

## 🔍 Débogage et Logs

### Logs de Développement

En développement, tous les logs sont activés :

```typescript
// Logs disponibles dans la console
console.log('🔵 [DATABASE] XML Request construit:', xml);
console.log('🟢 [DATABASE] Response brute reçue:', response);
console.log('🟡 [DATABASE] Réponse API parsée:', data);
console.log('✅ [DATABASE] Données extraites:', extractedData);
```

### Test Direct de l'API

```javascript
// test-api.js
const testDirectAPI = async () => {
  const url = 'https://api.icelabsoft.com/api/psql_request/api/psql_request';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>SELECT * FROM check_user_credentials('test','pass')</requete_sql>
</request>`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xml
  });

  console.log(await response.json());
};
```

## ⚡ Optimisations et Bonnes Pratiques

### 1. Gestion des Erreurs
```typescript
try {
  const data = await DatabaseService.query(sql);
  // Traitement...
} catch (error) {
  if (error.message.includes('Timeout')) {
    // Gestion timeout
  } else if (error.message.includes('contacter')) {
    // Erreur réseau
  } else {
    // Erreur SQL ou autre
  }
}
```

### 2. Caching des Données
```typescript
// Utiliser localStorage pour le cache
const cacheKey = `dashboard_${structureId}`;
const cached = localStorage.getItem(cacheKey);

if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  const age = Date.now() - timestamp;
  
  if (age < 5 * 60 * 1000) { // 5 minutes
    return data;
  }
}

// Sinon, fetch et cache
const newData = await fetchData();
localStorage.setItem(cacheKey, JSON.stringify({
  data: newData,
  timestamp: Date.now()
}));
```

### 3. Timeout Configuration
```typescript
// config/env.ts
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 secondes
  // Réduire pour les requêtes rapides
  QUICK_TIMEOUT: 5000 // 5 secondes
};
```

## 📱 Applications Configurées

Les applications disponibles sont définies dans `config/env.ts` :

```typescript
export const APPLICATIONS_CONFIG = {
  fayclick: {
    name: 'fayclick',
    description: 'Super App de gestion avec payement Wallet',
    defaultTimeout: 10000
  },
  payecole: {
    name: 'payecole',
    description: 'Application de gestion scolaire et paiements',
    defaultTimeout: 10000
  },
  sms: {
    name: 'sms',
    description: 'Application d\'envoi de SMS via add_pending_sms',
    defaultTimeout: 10000
  }
};
```

## 🚀 Workflow Complet - Exemple Pratique

### Connexion → Dashboard → Actions

```typescript
// 1. Connexion utilisateur
const login = async () => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  const { token, user } = await response.json();
  
  // 2. Redirection vers dashboard selon type
  const dashboardRoute = `/dashboard/${user.type_structure.toLowerCase()}`;
  router.push(dashboardRoute);
};

// 3. Chargement des données dashboard
const loadDashboard = async () => {
  const user = authService.getUser();
  const data = await dashboardService.getDashboardData(user.id_structure);
  setDashboardData(data);
};

// 4. Actions spécifiques selon le type
const performAction = async (action: string) => {
  switch(user.type_structure) {
    case 'SCOLAIRE':
      // Actions scolaires (inscriptions, paiements, etc.)
      break;
    case 'COMMERCIALE':
      // Actions commerce (ventes, stocks, etc.)
      break;
    // etc.
  }
};
```

## 📚 Ressources et Fichiers Clés

- **Services**
  - `/services/database.service.ts` - Communication API
  - `/services/auth.service.ts` - Authentification
  - `/services/dashboard.service.ts` - Dashboard
  - `/services/security.service.ts` - Sécurité et encryption

- **Configuration**
  - `/config/env.ts` - Configuration API et applications
  - `/lib/api-config.ts` - Détection automatique environnement

- **Utils**
  - `/utils/dataExtractor.ts` - Extraction des données

- **Types**
  - `/types/auth.ts` - Types authentification
  - `/types/dashboard.ts` - Types dashboard
  - `/types/index.ts` - Types généraux

## 🔒 Sécurité

- Ne jamais exposer les mots de passe en clair
- Utiliser HTTPS en production
- Tokens avec expiration (24h)
- Logs sécurisés avec masquage des données sensibles
- Validation des données côté serveur et client