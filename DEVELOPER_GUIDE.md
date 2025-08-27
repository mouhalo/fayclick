# 👩‍💻 Guide Développeur - Système d'Authentification FayClick V2

## 🚀 Guide de Démarrage Rapide

Ce guide fournit tous les exemples pratiques pour utiliser le nouveau système d'authentification basé sur React Context avec permissions granulaires.

### ⚡ Installation et Configuration

Le système est déjà intégré dans l'application. Pour l'utiliser :

```typescript
// 1. L'AuthProvider est déjà configuré dans app/layout.tsx
// 2. Importez les hooks dans vos composants
import { useAuth, usePermissions, useStructure } from '@/hooks';
import { Permission } from '@/types/auth';
import AuthGuard from '@/components/auth/AuthGuard';
```

---

## 🎯 Cas d'Usage Courants

### 1. Vérification d'Authentification Simple

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Chargement...</div>;
  }
  
  if (!isAuthenticated) {
    return <div>Veuillez vous connecter</div>;
  }
  
  return (
    <div>
      <h1>Bienvenue {user?.username} !</h1>
      <p>Structure : {user?.nom_structure}</p>
    </div>
  );
}
```

### 2. Protection d'une Route Complète

```typescript
// app/dashboard/admin/page.tsx
'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { Permission } from '@/types/auth';

export default function AdminDashboard() {
  return (
    <AuthGuard requiredPermission={Permission.ADMIN_FULL_ACCESS}>
      <div>
        <h1>Dashboard Administrateur</h1>
        <p>Cette page est protégée par AuthGuard</p>
        {/* Contenu admin */}
      </div>
    </AuthGuard>
  );
}
```

### 3. Affichage Conditionnel selon Permissions

```typescript
'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/types/auth';

export default function StudentManagement() {
  const { can, canAny, checks } = usePermissions();
  
  return (
    <div className="p-6">
      <h1>Gestion des Élèves</h1>
      
      {/* Affichage conditionnel simple */}
      {can(Permission.MANAGE_STUDENTS) && (
        <button className="btn-primary">
          Ajouter un élève
        </button>
      )}
      
      {/* Permissions multiples (au moins une) */}
      {canAny([Permission.VIEW_GRADES, Permission.MANAGE_COURSES]) && (
        <div className="grades-section">
          <h2>Gestion des Notes</h2>
        </div>
      )}
      
      {/* Utilisation des checks pré-calculés */}
      {checks.canViewFinancialData && (
        <div className="financial-info">
          <h3>Informations Financières</h3>
        </div>
      )}
      
      {/* Vérifications par niveau d'accès */}
      {checks.isAdmin ? (
        <AdminControls />
      ) : checks.isManager ? (
        <ManagerControls />
      ) : (
        <UserControls />
      )}
    </div>
  );
}
```

### 4. Navigation selon Type de Structure

```typescript
'use client';

import { useStructure } from '@/hooks/useStructure';
import { useRouter } from 'next/navigation';

export default function DynamicNavigation() {
  const { 
    isSchool, 
    isCommerce, 
    isRealEstate, 
    displayConfig,
    structure 
  } = useStructure();
  const router = useRouter();
  
  const handleNavigation = () => {
    if (isSchool) {
      router.push('/dashboard/scolaire/students');
    } else if (isCommerce) {
      router.push('/dashboard/commerce/products');
    } else if (isRealEstate) {
      router.push('/dashboard/immobilier/properties');
    }
  };
  
  return (
    <div className="navigation">
      {/* Configuration dynamique selon structure */}
      <div className={`header bg-${displayConfig?.color}-500`}>
        <span className="icon">{displayConfig?.icon}</span>
        <h1>{displayConfig?.primaryLabel}</h1>
      </div>
      
      {/* Menu adaptatif */}
      <nav>
        {isSchool && (
          <>
            <NavItem href="/dashboard/scolaire/students" icon="👨‍🎓">
              Élèves
            </NavItem>
            <NavItem href="/dashboard/scolaire/grades" icon="📊">
              Notes
            </NavItem>
          </>
        )}
        
        {isCommerce && (
          <>
            <NavItem href="/dashboard/commerce/products" icon="📦">
              Produits
            </NavItem>
            <NavItem href="/dashboard/commerce/sales" icon="💰">
              Ventes
            </NavItem>
          </>
        )}
        
        {isRealEstate && (
          <>
            <NavItem href="/dashboard/immobilier/properties" icon="🏠">
              Biens
            </NavItem>
            <NavItem href="/dashboard/immobilier/clients" icon="👥">
              Clients
            </NavItem>
          </>
        )}
      </nav>
      
      {/* Bouton action principal */}
      <button 
        onClick={handleNavigation}
        className="btn-primary"
      >
        Accès rapide {displayConfig?.primaryLabel}
      </button>
    </div>
  );
}
```

### 5. Formulaire de Connexion avec Context

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const [credentials, setCredentials] = useState({
    login: '',
    pwd: ''
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Le login gère automatiquement :
    // 1. Authentification
    // 2. Récupération structure
    // 3. Calcul permissions
    // 4. Redirection
    await login(credentials);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Effacer erreur quand l'utilisateur tape
    if (error) clearError();
  };
  
  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="field">
        <label>Identifiant</label>
        <input
          type="text"
          name="login"
          value={credentials.login}
          onChange={handleChange}
          disabled={isLoading}
          required
        />
      </div>
      
      <div className="field">
        <label>Mot de passe</label>
        <input
          type="password"
          name="pwd"
          value={credentials.pwd}
          onChange={handleChange}
          disabled={isLoading}
          required
        />
      </div>
      
      {/* Affichage erreur depuis Context */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={isLoading}
        className="btn-primary"
      >
        {isLoading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}
```

### 6. Dashboard avec Permissions Complexes

```typescript
'use client';

import { useAuth, usePermissions, useStructure } from '@/hooks';
import { Permission } from '@/types/auth';
import AuthGuard from '@/components/auth/AuthGuard';

function DashboardContent() {
  const { user, logout } = useAuth();
  const { can, canAll, getStructurePermissions, checks } = usePermissions();
  const { structure, displayConfig, validateStructure } = useStructure();
  
  // Permissions spécifiques à la structure
  const structurePerms = getStructurePermissions();
  
  // Validation des données structure
  const validation = validateStructure();
  if (!validation.isValid) {
    return (
      <div className="error-state">
        <h2>Configuration incomplète</h2>
        <ul>
          {validation.errors.map(error => (
            <li key={error}>❌ {error}</li>
          ))}
        </ul>
      </div>
    );
  }
  
  return (
    <div className="dashboard">
      {/* Header avec infos contextuelles */}
      <header className={`header bg-gradient-to-r from-${displayConfig?.color}-500 to-${displayConfig?.color}-600`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{displayConfig?.icon}</span>
          <div>
            <h1>{structure?.nom_structure}</h1>
            <p className="opacity-90">{displayConfig?.primaryLabel}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Badge niveau d'accès */}
          <span className={`badge ${
            checks.isAdmin ? 'badge-red' :
            checks.isManager ? 'badge-blue' :
            'badge-gray'
          }`}>
            {checks.isAdmin ? 'Admin' : 
             checks.isManager ? 'Manager' : 'User'}
          </span>
          
          <button onClick={logout} className="btn-secondary">
            Déconnexion
          </button>
        </div>
      </header>
      
      {/* Contenu adaptatif selon structure */}
      <main className="dashboard-content">
        {/* Section administrative (si autorisé) */}
        {canAll([Permission.MANAGE_USERS, Permission.ACCESS_FINANCES]) && (
          <section className="admin-section">
            <h2>Administration</h2>
            <div className="grid grid-cols-3 gap-4">
              <AdminCard title="Utilisateurs" />
              <AdminCard title="Finances" />
              <AdminCard title="Paramètres" />
            </div>
          </section>
        )}
        
        {/* Sections spécifiques structure */}
        {structure?.type_structure === 'SCOLAIRE' && (
          <section className="school-section">
            <h2>Gestion Scolaire</h2>
            
            {structurePerms.canManageStudents && (
              <StudentsWidget />
            )}
            
            {structurePerms.canViewGrades && (
              <GradesWidget />
            )}
            
            {structurePerms.canManageCourses && (
              <CoursesWidget />
            )}
          </section>
        )}
        
        {structure?.type_structure === 'COMMERCIALE' && (
          <section className="commerce-section">
            <h2>Gestion Commerce</h2>
            
            {structurePerms.canManageProducts && (
              <ProductsWidget />
            )}
            
            {structurePerms.canViewSales && (
              <SalesWidget />
            )}
            
            {structurePerms.canManageInventory && (
              <InventoryWidget />
            )}
          </section>
        )}
        
        {/* Section financière (conditionnelle) */}
        {checks.canViewFinancialData && (
          <section className="financial-section">
            <h2>Données Financières</h2>
            <FinancialWidget />
          </section>
        )}
      </main>
    </div>
  );
}

// Export avec protection AuthGuard
export default function Dashboard() {
  return (
    <AuthGuard requiredPermission={Permission.VIEW_DASHBOARD}>
      <DashboardContent />
    </AuthGuard>
  );
}
```

### 7. Gestion d'État avec Mise à Jour

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileSettings() {
  const { user, updateUser, refreshAuth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    telephone: user?.telephone || '',
    email: user?.email || ''
  });
  
  const handleSave = async () => {
    try {
      // Mise à jour locale immédiate
      updateUser(formData);
      
      // API call pour persistance (simulé)
      await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      // Optionnel : rafraîchir depuis API
      await refreshAuth();
      
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
    }
  };
  
  return (
    <div className="profile-settings">
      <h2>Paramètres Profil</h2>
      
      <div className="profile-info">
        <div className="field">
          <label>Nom d'utilisateur</label>
          <input 
            value={user?.username || ''} 
            disabled 
            className="input-disabled"
          />
          <small>Non modifiable</small>
        </div>
        
        <div className="field">
          <label>Téléphone</label>
          <input
            value={isEditing ? formData.telephone : user?.telephone || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
            disabled={!isEditing}
            className={isEditing ? 'input-editable' : 'input-readonly'}
          />
        </div>
        
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={isEditing ? formData.email : user?.email || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing}
            className={isEditing ? 'input-editable' : 'input-readonly'}
          />
        </div>
      </div>
      
      <div className="actions">
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn-primary"
          >
            Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className="btn-success"
            >
              Sauvegarder
            </button>
            <button 
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  telephone: user?.telephone || '',
                  email: user?.email || ''
                });
              }}
              className="btn-cancel"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🛡️ Patterns de Sécurité

### 1. Protection Multi-Niveaux

```typescript
'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { Permission } from '@/types/auth';
import { usePermissions } from '@/hooks/usePermissions';

// Niveau 1 : Protection de la route entière
function FinancialDashboard() {
  const { can } = usePermissions();
  
  return (
    <div className="financial-dashboard">
      <h1>Dashboard Financier</h1>
      
      {/* Niveau 2 : Protection de sections sensibles */}
      {can(Permission.ACCESS_FINANCES) && (
        <section className="sensitive-data">
          <h2>Données Sensibles</h2>
          
          {/* Niveau 3 : Protection granulaire */}
          {can(Permission.EXPORT_DATA) ? (
            <ExportButton />
          ) : (
            <p className="text-gray-500">
              Export non autorisé pour votre profil
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// Export avec AuthGuard (Niveau 0)
export default function ProtectedFinancialDashboard() {
  return (
    <AuthGuard 
      requiredPermissions={[
        Permission.VIEW_DASHBOARD,
        Permission.ACCESS_FINANCES
      ]}
      requireAll={true}
    >
      <FinancialDashboard />
    </AuthGuard>
  );
}
```

### 2. Validation côté Client et Serveur

```typescript
'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/types/auth';

export default function SecureForm() {
  const { can } = usePermissions();
  
  const handleSubmit = async (data: FormData) => {
    // Validation côté client
    if (!can(Permission.MANAGE_USERS)) {
      alert('Permission insuffisante');
      return;
    }
    
    try {
      // API call avec validation côté serveur
      const response = await fetch('/api/secure-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fayclick_token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (response.status === 403) {
        // Permissions insuffisantes côté serveur
        alert('Accès refusé par le serveur');
        return;
      }
      
      const result = await response.json();
      // Traitement succès...
      
    } catch (error) {
      console.error('Erreur sécurisée:', error);
    }
  };
  
  // UI conditionnelle
  if (!can(Permission.MANAGE_USERS)) {
    return (
      <div className="access-denied">
        <p>Vous n'avez pas les permissions pour cette action.</p>
      </div>
    );
  }
  
  return <ActualForm onSubmit={handleSubmit} />;
}
```

### 3. Audit Trail et Logging

```typescript
'use client';

import { usePermissions, useAuth } from '@/hooks';
import { Permission } from '@/types/auth';

export default function AuditedComponent() {
  const { can } = usePermissions();
  const { user } = useAuth();
  
  const handleSensitiveAction = () => {
    const hasPermission = can(Permission.MANAGE_USERS);
    
    // Log de l'action avec contexte
    console.log('Audit Log:', {
      action: 'MANAGE_USERS_ATTEMPTED',
      userId: user?.id,
      userProfile: user?.nom_profil,
      structureId: user?.id_structure,
      granted: hasPermission,
      timestamp: new Date().toISOString()
    });
    
    if (!hasPermission) {
      // Log tentative non autorisée
      console.warn('Unauthorized access attempt:', {
        userId: user?.id,
        action: 'MANAGE_USERS',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Exécution action autorisée...
  };
  
  return (
    <button onClick={handleSensitiveAction}>
      Action Sensible
    </button>
  );
}
```

---

## ⚡ Optimisations Performance

### 1. Mémoïsation des Calculs

```typescript
'use client';

import { useMemo } from 'react';
import { usePermissions, useStructure } from '@/hooks';

export default function OptimizedComponent() {
  const { permissions } = usePermissions();
  const { structure } = useStructure();
  
  // Calculs lourds mémoïsés
  const computedPermissions = useMemo(() => {
    if (!permissions || !structure) return {};
    
    return {
      canManageFinances: permissions.canAccessFinances && permissions.hasManagerAccess,
      canExportReports: permissions.canExportData && structure.actif,
      canManageStructure: permissions.hasAdminAccess && structure.type_structure !== 'READONLY',
      // ... autres calculs
    };
  }, [permissions, structure]);
  
  // Rendu optimisé
  return (
    <div>
      {computedPermissions.canManageFinances && (
        <FinancialSection />
      )}
      
      {computedPermissions.canExportReports && (
        <ExportSection />
      )}
    </div>
  );
}
```

### 2. Lazy Loading des Composants Protégés

```typescript
'use client';

import { lazy, Suspense } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/types/auth';

// Lazy loading conditionnel
const AdminPanel = lazy(() => import('./AdminPanel'));
const ManagerPanel = lazy(() => import('./ManagerPanel'));
const UserPanel = lazy(() => import('./UserPanel'));

export default function AdaptiveDashboard() {
  const { checks } = usePermissions();
  
  return (
    <div className="dashboard">
      <Suspense fallback={<div>Chargement du panneau...</div>}>
        {checks.isAdmin && <AdminPanel />}
        {checks.isManager && <ManagerPanel />}
        {!checks.isAdmin && !checks.isManager && <UserPanel />}
      </Suspense>
    </div>
  );
}
```

### 3. Cache des Vérifications Fréquentes

```typescript
'use client';

import { useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/types/auth';

export default function CachedPermissions() {
  const { can } = usePermissions();
  
  // Cache des vérifications courantes
  const permissionCache = useMemo(() => ({
    canView: can(Permission.VIEW_DASHBOARD),
    canManage: can(Permission.MANAGE_USERS),
    canExport: can(Permission.EXPORT_DATA),
    canEdit: can(Permission.EDIT_SETTINGS),
    // ... permissions fréquentes
  }), [can]);
  
  // Utilisation du cache
  return (
    <nav className="navigation">
      {permissionCache.canView && (
        <NavItem href="/dashboard">Dashboard</NavItem>
      )}
      {permissionCache.canManage && (
        <NavItem href="/users">Utilisateurs</NavItem>
      )}
      {permissionCache.canExport && (
        <NavItem href="/exports">Exports</NavItem>
      )}
    </nav>
  );
}
```

---

## 🔧 Debugging et Tests

### 1. Debug du Contexte d'Authentification

```typescript
'use client';

import { useAuth, usePermissions, useStructure } from '@/hooks';

export default function DebugPanel() {
  const auth = useAuth();
  const permissions = usePermissions();
  const structure = useStructure();
  
  if (process.env.NODE_ENV !== 'development') {
    return null; // Masquer en production
  }
  
  return (
    <div className="debug-panel" style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      background: '#000',
      color: '#0f0',
      padding: '10px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4>🐛 Auth Debug</h4>
      
      <div>
        <strong>État:</strong>
        <ul>
          <li>isAuthenticated: {auth.isAuthenticated ? '✅' : '❌'}</li>
          <li>isLoading: {auth.isLoading ? '🔄' : '⏹️'}</li>
          <li>isHydrated: {auth.isHydrated ? '✅' : '❌'}</li>
          <li>error: {auth.error || 'null'}</li>
        </ul>
      </div>
      
      <div>
        <strong>Utilisateur:</strong>
        <ul>
          <li>ID: {auth.user?.id}</li>
          <li>Login: {auth.user?.login}</li>
          <li>Profil: {auth.user?.nom_profil}</li>
          <li>Actif: {auth.user?.actif ? '✅' : '❌'}</li>
        </ul>
      </div>
      
      <div>
        <strong>Structure:</strong>
        <ul>
          <li>ID: {structure.id}</li>
          <li>Type: {structure.typeName}</li>
          <li>École: {structure.isSchool ? '✅' : '❌'}</li>
          <li>Commerce: {structure.isCommerce ? '✅' : '❌'}</li>
        </ul>
      </div>
      
      <div>
        <strong>Permissions:</strong>
        <ul>
          <li>Total: {permissions.permissions.length}</li>
          <li>Admin: {permissions.checks.isAdmin ? '✅' : '❌'}</li>
          <li>Manager: {permissions.checks.isManager ? '✅' : '❌'}</li>
          <li>Finance: {permissions.checks.canAccessFinances ? '✅' : '❌'}</li>
        </ul>
      </div>
      
      <details>
        <summary>Détails permissions</summary>
        <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '100px' }}>
          {JSON.stringify(permissions.permissions, null, 2)}
        </pre>
      </details>
    </div>
  );
}
```

### 2. Tests Unitaires

```typescript
// __tests__/auth.test.tsx
import { renderHook } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth, usePermissions } from '@/hooks';

// Wrapper pour les tests
const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('Authentication Hooks', () => {
  test('useAuth provides correct initial state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthWrapper,
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
  });
  
  test('usePermissions handles no permissions gracefully', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: AuthWrapper,
    });
    
    expect(result.current.can('any_permission')).toBe(false);
    expect(result.current.permissions).toEqual([]);
    expect(result.current.checks.isAdmin).toBe(false);
  });
});

// Mock pour les tests
jest.mock('@/services/auth.service', () => ({
  authService: {
    getCompleteAuthData: jest.fn(() => null),
    isTokenValid: jest.fn(() => false),
    clearSession: jest.fn(),
  },
}));
```

### 3. Storybook pour les Composants

```typescript
// stories/AuthGuard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import AuthGuard from '@/components/auth/AuthGuard';
import { Permission } from '@/types/auth';

const meta: Meta<typeof AuthGuard> = {
  title: 'Auth/AuthGuard',
  component: AuthGuard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Authenticated: Story = {
  args: {
    children: <div>Contenu protégé visible</div>,
    requiredPermission: Permission.VIEW_DASHBOARD,
  },
  // Mock du contexte pour Storybook
  decorators: [
    (Story) => (
      <MockAuthProvider isAuthenticated={true} hasPermission={true}>
        <Story />
      </MockAuthProvider>
    ),
  ],
};

export const NotAuthenticated: Story = {
  args: {
    children: <div>Ne devrait pas être visible</div>,
    requiredPermission: Permission.VIEW_DASHBOARD,
  },
  decorators: [
    (Story) => (
      <MockAuthProvider isAuthenticated={false}>
        <Story />
      </MockAuthProvider>
    ),
  ],
};
```

---

## 🚨 Gestion d'Erreurs

### 1. Gestion Globale des Erreurs

```typescript
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { error, clearError } = useAuth();
  
  useEffect(() => {
    if (error) {
      // Log l'erreur
      console.error('Auth Error:', error);
      
      // Optionnel : Envoi à un service de monitoring
      // sendErrorToMonitoring(error);
      
      // Auto-clear après 5 secondes
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);
  
  if (error) {
    return (
      <div className="error-boundary">
        <div className="error-message">
          <h2>❌ Erreur d'authentification</h2>
          <p>{error}</p>
          <button onClick={clearError} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
```

### 2. Recovery Automatique

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AutoRecovery() {
  const { isAuthenticated, error, refreshAuth } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  useEffect(() => {
    if (error && !isAuthenticated && retryCount < maxRetries) {
      // Tentative de récupération automatique
      const timer = setTimeout(async () => {
        try {
          await refreshAuth();
          setRetryCount(0); // Reset sur succès
        } catch (err) {
          setRetryCount(prev => prev + 1);
        }
      }, 2000 * (retryCount + 1)); // Backoff exponentiel
      
      return () => clearTimeout(timer);
    }
  }, [error, isAuthenticated, retryCount, refreshAuth]);
  
  if (retryCount >= maxRetries) {
    return (
      <div className="recovery-failed">
        <h2>Impossible de restaurer la session</h2>
        <p>Veuillez vous reconnecter.</p>
        <button onClick={() => window.location.href = '/login'}>
          Page de connexion
        </button>
      </div>
    );
  }
  
  if (error && retryCount > 0) {
    return (
      <div className="recovering">
        <p>Tentative de récupération... ({retryCount}/{maxRetries})</p>
      </div>
    );
  }
  
  return null;
}
```

---

## 📚 Ressources et Références

### API de Référence

```typescript
// Hooks disponibles
import {
  useAuth,           // État global authentification
  usePermissions,    // Vérification permissions
  useStructure,      // Données structure
  useAuthState       // État loading-safe
} from '@/hooks';

// Composants
import AuthGuard from '@/components/auth/AuthGuard';

// Types
import { 
  Permission,
  User,
  StructureDetails,
  UserPermissions,
  AuthState,
  CompleteAuthData,
  LoginCredentials
} from '@/types/auth';

// Services (usage avancé)
import { authService } from '@/services/auth.service';
```

### Patterns Recommandés

1. **Toujours utiliser AuthGuard** pour protection des routes
2. **Vérifier les permissions** avant affichage d'UI sensible
3. **Mémoïser les calculs** coûteux avec useMemo
4. **Logger les erreurs** d'authentification
5. **Tester les composants** avec des mocks appropriés

### Migration depuis l'Ancien Système

```typescript
// Ancien code
const user = authService.getUser();
if (user && user.nom_profil === 'ADMIN') {
  // Afficher admin panel
}

// Nouveau code (recommandé)
const { checks } = usePermissions();
if (checks.isAdmin) {
  // Afficher admin panel
}
```

### Support et Documentation

- 📖 **Documentation technique** : `AUTH_SYSTEM.md`
- 🔧 **Configuration permissions** : `config/permissions.ts`
- 🐛 **Debug** : Utiliser `<DebugPanel />` en développement
- 📊 **Métriques** : Bundle impact documenté dans CHANGELOG.md

---

*Guide développeur généré automatiquement - Version 1.2.0*  
*Dernière mise à jour : 27 Août 2025*