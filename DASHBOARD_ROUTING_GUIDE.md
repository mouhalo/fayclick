# Guide du Système de Routage des Dashboards FayClick V2

## 🎯 Vue d'ensemble

Le système de routage de FayClick V2 dirige automatiquement les utilisateurs vers le dashboard approprié selon leur type de structure après connexion.

## 📊 Hiérarchie de Routage

### Priorités de Redirection

1. **`type_structure`** (PRIORITÉ HAUTE) - Type d'activité de la structure
2. **`nom_groupe`** (PRIORITÉ MOYENNE) - Groupe d'appartenance
3. **`nom_profil`** (PRIORITÉ BASSE) - Profil utilisateur (ADMIN, USER, etc.)

### Routes Disponibles

```typescript
const USER_ROUTES = {
  // Types de Structure
  SCOLAIRE: '/dashboard/scolaire',      // Gestion scolaire
  COMMERCIALE: '/dashboard/commerce',    // Commerce/Vente
  COMMERCE: '/dashboard/commerce',       // Alias
  IMMOBILIER: '/dashboard/immobilier',   // Agence immobilière
  'PRESTATAIRE DE SERVICES': '/dashboard/services',
  
  // Profils Spéciaux
  ADMIN: '/dashboard/admin',            // Admin système
  SYSTEM: '/dashboard/system'           // Super admin
}
```

## 🔄 Flux de Connexion et Routage

```mermaid
graph TD
    A[Login] --> B[Auth Service]
    B --> C{Authentification OK?}
    C -->|OUI| D[Récupération User Data]
    C -->|NON| E[Erreur Login]
    D --> F{type_structure?}
    F -->|Existe| G[Route selon type_structure]
    F -->|N'existe pas| H{nom_groupe?}
    H -->|Existe| I[Route selon nom_groupe]
    H -->|N'existe pas| J{ADMIN?}
    J -->|OUI| K[/dashboard/admin]
    J -->|NON| L[/dashboard par défaut]
```

## 📁 Structure des Dashboards

```
app/dashboard/
├── page.tsx              # Dashboard général
├── admin/               # Dashboard administrateur
│   └── page.tsx
├── commerce/            # Dashboard commerce
│   ├── page.tsx
│   └── layout.tsx
├── immobilier/          # Dashboard immobilier
│   ├── page.tsx
│   └── layout.tsx
└── scolaire/            # Dashboard scolaire
    ├── page.tsx
    └── layout.tsx
```

## 🔍 Cas d'Usage Actuels

### Cas 1: Utilisateur IMMOBILIER
```json
{
  "username": "Administrateur",
  "type_structure": "IMMOBILIER",
  "nom_groupe": "SCOLAIRE",  // Incohérence possible
  "nom_profil": "ADMIN"
}
```
**Redirection**: `/dashboard/immobilier` (priorité à type_structure)

### Cas 2: Utilisateur SCOLAIRE
```json
{
  "username": "Directeur",
  "type_structure": "SCOLAIRE",
  "nom_groupe": "SCOLAIRE",
  "nom_profil": "USER"
}
```
**Redirection**: `/dashboard/scolaire`

### Cas 3: Admin Système
```json
{
  "username": "SuperAdmin",
  "type_structure": null,
  "nom_groupe": null,
  "nom_profil": "ADMIN"
}
```
**Redirection**: `/dashboard/admin`

## 🛠️ Implémentation Technique

### 1. Fonction de Routage (types/auth.ts)
```typescript
export function getUserRedirectRoute(user: User): string {
  // PRIORITÉ 1: type_structure
  if (user.type_structure) {
    const route = USER_ROUTES[user.type_structure];
    if (route) return route;
  }
  
  // PRIORITÉ 2: nom_groupe
  if (user.nom_groupe) {
    const groupRoute = USER_ROUTES[user.nom_groupe];
    if (groupRoute) return groupRoute;
  }
  
  // PRIORITÉ 3: Admin système
  if (user.nom_profil === 'ADMIN' && !user.type_structure) {
    return USER_ROUTES.ADMIN;
  }
  
  // Par défaut
  return '/dashboard';
}
```

### 2. Protection des Routes (dans chaque dashboard)
```typescript
// dashboard/immobilier/page.tsx
useEffect(() => {
  // Vérifier l'authentification
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  // Vérifier le type correct
  const userData = authService.getUser();
  if (userData?.type_structure !== 'IMMOBILIER') {
    router.push('/dashboard');
    return;
  }
  
  setUser(userData);
}, [router]);
```

### 3. Après Connexion (login/page.tsx)
```typescript
const handleSubmit = async () => {
  const response = await authService.login(credentials);
  
  // Sauvegarde et redirection
  authService.saveToken(response.token);
  authService.saveUser(response.user);
  
  // Redirection automatique
  const redirectPath = getUserRedirectRoute(response.user);
  router.push(redirectPath);
};
```

## ⚠️ Problèmes Identifiés

### 1. Incohérence de Données
**Problème**: Utilisateur avec `type_structure: "IMMOBILIER"` mais `nom_groupe: "SCOLAIRE"`

**Impact**: Confusion potentielle, mais la logique de priorité gère correctement

**Solution Recommandée**: 
- Vérifier la cohérence des données en base
- Ajouter une validation lors de la création/modification d'utilisateur

### 2. Routes Manquantes
Certains types de structure n'ont pas encore de dashboard dédié :
- `PRESTATAIRE DE SERVICES` → `/dashboard/services` (à créer)
- `FORMATION PRO` → `/dashboard/formation` (à créer)

## 🚀 Améliorations Proposées

### 1. Validation de Cohérence
```typescript
// Ajouter dans auth.service.ts
private validateUserData(user: User): User {
  // Vérifier la cohérence type_structure / nom_groupe
  const coherenceMap = {
    'IMMOBILIER': ['IMMOBILIER', 'AGENCE'],
    'SCOLAIRE': ['SCOLAIRE', 'EDUCATION'],
    'COMMERCIALE': ['COMMERCE', 'COMMERCIALE', 'VENTE']
  };
  
  if (user.type_structure && coherenceMap[user.type_structure]) {
    if (!coherenceMap[user.type_structure].includes(user.nom_groupe)) {
      console.warn(`Incohérence détectée: type=${user.type_structure}, groupe=${user.nom_groupe}`);
    }
  }
  
  return user;
}
```

### 2. Dashboard Dynamique
```typescript
// Créer un composant DashboardRouter
export default function DashboardRouter() {
  const user = authService.getUser();
  
  switch(user?.type_structure) {
    case 'IMMOBILIER':
      return <ImmobilierDashboard />;
    case 'SCOLAIRE':
      return <ScolaireDashboard />;
    case 'COMMERCIALE':
      return <CommerceDashboard />;
    default:
      return <DefaultDashboard />;
  }
}
```

### 3. Middleware de Routage
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('fayclick_token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Vérifier les permissions par type de dashboard
  // ...
}
```

## 📝 Logs de Debug

Le système génère des logs détaillés pour le debug :

```javascript
// Logs disponibles dans la console
getUserRedirectRoute - User data: {
  nom_groupe: 'SCOLAIRE',
  type_structure: 'IMMOBILIER', 
  nom_profil: 'ADMIN'
}
Redirecting to /dashboard/immobilier based on type_structure: IMMOBILIER
```

## 🔒 Sécurité

1. **Vérification côté serveur** : Toujours valider les permissions côté API
2. **Protection des routes** : Chaque dashboard vérifie le type d'utilisateur
3. **Token expiration** : Les tokens expirent après 24h
4. **Logs d'accès** : Tracer tous les accès aux dashboards sensibles

## 📊 Matrice de Compatibilité

| type_structure | nom_groupe | Dashboard | Status |
|---------------|------------|-----------|---------|
| IMMOBILIER | IMMOBILIER | /dashboard/immobilier | ✅ OK |
| IMMOBILIER | SCOLAIRE | /dashboard/immobilier | ⚠️ Incohérent mais fonctionnel |
| SCOLAIRE | SCOLAIRE | /dashboard/scolaire | ✅ OK |
| COMMERCIALE | COMMERCE | /dashboard/commerce | ✅ OK |
| null | null + ADMIN | /dashboard/admin | ✅ OK |

## 🎯 Conclusion

Le système de routage est **fonctionnel** et gère correctement les redirections même en cas d'incohérence de données. La priorité donnée à `type_structure` assure que les utilisateurs arrivent toujours sur le bon dashboard selon leur activité principale.