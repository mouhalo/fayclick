# 🔐 Système de Gestion des Droits PostgreSQL

Documentation complète du système de droits basé sur `get_mes_droits()` pour FayClick V2.

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Utilisation](#utilisation)
- [API Reference](#api-reference)
- [Exemples](#exemples)
- [Debug](#debug)

---

## 🎯 Vue d'ensemble

Le système de droits FayClick permet de contrôler finement les autorisations des utilisateurs via une fonction PostgreSQL centralisée.

### Principe

```sql
SELECT * FROM get_mes_droits(139, 1)
```

**Résultat JSON :**
```json
{
  "id_profil": 1,
  "profil": "ADMIN",
  "fonctionnalites": [
    {"AJOUTER FACTURE": "oui"},
    {"SUPPRIMER FACTURE": "non"},
    {"VOIR DASHBOARD": "oui"},
    ...
  ]
}
```

### Workflow

1. **Connexion** → Appel automatique de `get_mes_droits()`
2. **Parsing** → Transformation JSON → TypeScript
3. **Stockage** → localStorage avec signature de sécurité
4. **Utilisation** → Hooks React partout dans l'app

### ⭐ Règle Spéciale ADMIN

**Si `id_profil === 1`, l'utilisateur a TOUS les droits automatiquement.**

Cette vérification est effectuée en amont dans toutes les fonctions de contrôle :
- `hasRight()` → retourne `true` pour tout
- `hasAllRights()` → retourne `true` pour tout
- `hasAnyRight()` → retourne `true` pour tout
- `getAllowedFunctionalities()` → retourne toutes les fonctionnalités
- `getDeniedFunctionalities()` → retourne un tableau vide

**Avantage :** L'admin a un accès complet sans dépendre de la configuration PostgreSQL.

---

## 🏗️ Architecture

### Fichiers Modifiés

```
types/auth.ts                        // Types UserRights, Functionality
services/database.service.ts         // getUserRights()
services/auth.service.ts             // fetchUserRights(), completeLogin()
contexts/AuthContext.tsx             // Exposition globale
utils/permissions.ts                 // parseUserRights(), hasRight()
hooks/useRights.ts                   // Hook personnalisé ✨
components/debug/RightsDebugPanel.tsx // Panneau de debug
```

### Flow de Données

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       v
┌──────────────────────────────────┐
│  authService.completeLogin()     │
│  1. login()                      │
│  2. fetchStructureDetails()      │
│  3. getUserPermissions()         │
│  4. fetchUserRights() ✨         │
└──────┬───────────────────────────┘
       │
       v
┌──────────────────────────────────┐
│  get_mes_droits(id_struct, profil)│
│  → JSON PostgreSQL               │
└──────┬───────────────────────────┘
       │
       v
┌──────────────────────────────────┐
│  parseUserRights()               │
│  → Transformation TypeScript     │
│  → Création index O(1)           │
└──────┬───────────────────────────┘
       │
       v
┌──────────────────────────────────┐
│  localStorage + signature        │
│  → Stockage sécurisé             │
└──────┬───────────────────────────┘
       │
       v
┌──────────────────────────────────┐
│  AuthContext                     │
│  → État global réactif           │
└──────┬───────────────────────────┘
       │
       v
┌──────────────────────────────────┐
│  useRights() dans composants     │
│  → Vérification temps réel       │
└──────────────────────────────────┘
```

---

## 🚀 Utilisation

### 1. Hook `useRights()`

Le hook principal pour accéder aux droits dans n'importe quel composant.

```tsx
import { useRights } from '@/hooks/useRights';

function ProductForm() {
  const { hasRight, rights, profil } = useRights();

  // Vérification simple
  if (!hasRight("AJOUTER FACTURE")) {
    return <AccessDenied />;
  }

  return (
    <form>
      <h1>Nouvelle Facture ({profil})</h1>

      {/* Champ conditionnel */}
      {hasRight("ACCORDER REMISE") && (
        <input type="number" name="discount" placeholder="Remise %" />
      )}

      <button type="submit">
        Enregistrer
      </button>
    </form>
  );
}
```

### 2. Hook `useHasRight()`

Version raccourcie pour vérifier un seul droit.

```tsx
import { useHasRight } from '@/hooks/useRights';

function DeleteButton({ invoiceId }: { invoiceId: number }) {
  const canDelete = useHasRight("SUPPRIMER FACTURE");

  if (!canDelete) return null;

  return (
    <button
      onClick={() => handleDelete(invoiceId)}
      className="btn-danger"
    >
      Supprimer
    </button>
  );
}
```

### 3. useAuth() avec droits

Accès direct via le contexte d'authentification.

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Dashboard() {
  const { hasRight, hasAllRights, hasAnyRight, rights } = useAuth();

  const handleAction = () => {
    // Vérification avant exécution
    if (!hasRight("ENREGISTRER DEPENSE")) {
      toast.error("Vous n'avez pas le droit d'enregistrer des dépenses");
      return;
    }

    // Continuer l'action
    saveExpense();
  };

  // Vérifier plusieurs droits (ET logique)
  const canManageInvoices = hasAllRights([
    "AJOUTER FACTURE",
    "MODIFIER FACTURE",
    "SUPPRIMER FACTURE"
  ]);

  // Vérifier au moins un droit (OU logique)
  const hasFinanceAccess = hasAnyRight([
    "GERER FINANCES",
    "LISTER LES ENCAISSEMENTS",
    "EFFECTUER REVERSEMENT"
  ]);

  return (
    <div>
      <h1>Dashboard {rights?.profil}</h1>

      {canManageInvoices && (
        <section>
          <h2>Gestion Factures</h2>
          {/* ... */}
        </section>
      )}

      {hasFinanceAccess && (
        <section>
          <h2>Module Finances</h2>
          {/* ... */}
        </section>
      )}
    </div>
  );
}
```

### 4. Protection de Routes

Composant Guard pour protéger les routes entières.

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRight: string;
  fallback?: React.ReactNode;
}

function ProtectedRoute({
  children,
  requiredRight,
  fallback
}: ProtectedRouteProps) {
  const { hasRight, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!hasRight(requiredRight)) {
    return fallback || (
      <div className="text-center py-12">
        <h2>Accès Refusé</h2>
        <p>Vous n'avez pas le droit : {requiredRight}</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Utilisation
<ProtectedRoute requiredRight="GERER PRODUITS">
  <ProductManagement />
</ProtectedRoute>
```

### 5. Composant Conditionnel

Wrapper pour afficher/cacher selon les droits.

```tsx
interface IfHasRightProps {
  right: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function IfHasRight({ right, children, fallback }: IfHasRightProps) {
  const { hasRight } = useAuth();

  if (!hasRight(right)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Utilisation
<IfHasRight right="MODIFIER FACTURE">
  <button onClick={handleEdit}>Modifier</button>
</IfHasRight>

<IfHasRight
  right="VOIR DASHBOARD"
  fallback={<p>Tableau de bord non accessible</p>}
>
  <DashboardWidget />
</IfHasRight>
```

---

## 📚 API Reference

### Interface `UserRights`

```typescript
interface UserRights {
  id_profil: number;          // ID du profil
  profil: string;             // Nom du profil ("ADMIN", "USER", etc.)
  fonctionnalites: Functionality[];  // Liste des fonctionnalités
  _index?: Record<string, boolean>;  // Index pour accès O(1)
}

interface Functionality {
  name: string;    // Nom de la fonctionnalité
  allowed: boolean; // true si autorisé
}
```

### Hook `useRights()`

```typescript
function useRights(): {
  rights: UserRights | null;
  hasRight: (name: string) => boolean;
  hasAllRights: (names: string[]) => boolean;
  hasAnyRight: (names: string[]) => boolean;
  allowedFunctionalities: string[];
  deniedFunctionalities: string[];
  profil: string | null;
  totalFunctionalities: number;
  allowedCount: number;
  deniedCount: number;
  isLoading: boolean;
  isReady: boolean;
}
```

### Hook `useHasRight(name: string)`

```typescript
function useHasRight(functionalityName: string): boolean
```

### Hook `useUserProfil()`

```typescript
function useUserProfil(): string | null
```

### Fonction `hasRight()`

```typescript
function hasRight(rights: UserRights | null, functionalityName: string): boolean
```

### Fonction `hasAllRights()`

```typescript
function hasAllRights(rights: UserRights | null, functionalityNames: string[]): boolean
```

### Fonction `hasAnyRight()`

```typescript
function hasAnyRight(rights: UserRights | null, functionalityNames: string[]): boolean
```

---

## 💡 Exemples Pratiques

### Exemple 1 : Bouton Conditionnel

```tsx
function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const { hasRight } = useRights();

  return (
    <div className="flex gap-2">
      {hasRight("MODIFIER FACTURE") && (
        <button onClick={() => editInvoice(invoice.id)}>
          Modifier
        </button>
      )}

      {hasRight("SUPPRIMER FACTURE") && (
        <button onClick={() => deleteInvoice(invoice.id)} className="btn-danger">
          Supprimer
        </button>
      )}

      {hasRight("ENVOYER FACTURE") && (
        <button onClick={() => sendInvoice(invoice.id)}>
          Envoyer par Email
        </button>
      )}
    </div>
  );
}
```

### Exemple 2 : Menu Dynamique

```tsx
function NavigationMenu() {
  const { hasRight } = useRights();

  const menuItems = [
    {
      label: "Dashboard",
      route: "/dashboard",
      right: "VOIR DASHBOARD"
    },
    {
      label: "Factures",
      route: "/factures",
      right: "AJOUTER FACTURE"
    },
    {
      label: "Produits",
      route: "/produits",
      right: "GERER PRODUITS"
    },
    {
      label: "Finances",
      route: "/finances",
      right: "GERER FINANCES"
    },
    {
      label: "Utilisateurs",
      route: "/users",
      right: "GESTION DES UTILISATEURS"
    }
  ];

  // Filtrer le menu selon les droits
  const visibleItems = menuItems.filter(item => hasRight(item.right));

  return (
    <nav>
      {visibleItems.map(item => (
        <Link key={item.route} href={item.route}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

### Exemple 3 : Formulaire Adaptatif

```tsx
function ProductForm() {
  const { hasRight, hasAnyRight } = useRights();

  const canEditPrice = hasRight("AFFICHER LES MONTANTS");
  const canAddPhoto = hasRight("GESTION PHOTO");
  const canGiveDiscount = hasRight("ACCORDER REMISE");
  const canManageFinances = hasAnyRight([
    "GERER FINANCES",
    "LISTER LES ENCAISSEMENTS"
  ]);

  return (
    <form>
      <input type="text" name="name" placeholder="Nom du produit" />

      {canEditPrice && (
        <input type="number" name="price" placeholder="Prix de vente" />
      )}

      {canGiveDiscount && (
        <input type="number" name="discount" placeholder="Remise %" />
      )}

      {canAddPhoto && (
        <input type="file" accept="image/*" />
      )}

      {canManageFinances && (
        <div className="financial-section">
          <h3>Informations Financières</h3>
          {/* ... */}
        </div>
      )}

      <button type="submit">Enregistrer</button>
    </form>
  );
}
```

### Exemple 4 : Affichage Conditionnel Complexe

```tsx
function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  const { hasRight, hasAllRights, profil } = useRights();

  // Droits multiples requis pour action critique
  const canPerformCriticalAction = hasAllRights([
    "MODIFIER FACTURE",
    "SUPPRIMER FACTURE",
    "EFFECTUER REVERSEMENT"
  ]);

  return (
    <div>
      <h1>Facture #{invoice.number}</h1>

      {/* Section visible seulement si droit */}
      {hasRight("AFFICHER LES MONTANTS") ? (
        <div className="amounts">
          <p>Montant HT: {invoice.amountHT} FCFA</p>
          <p>Montant TTC: {invoice.amountTTC} FCFA</p>
        </div>
      ) : (
        <p className="text-gray-500 italic">
          Montants masqués (droit requis: AFFICHER LES MONTANTS)
        </p>
      )}

      {/* Action critique */}
      {canPerformCriticalAction && (
        <div className="bg-red-50 border border-red-200 p-4 mt-4">
          <h3>Actions Critiques ({profil})</h3>
          <button className="btn-danger">
            Supprimer et Rembourser
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🐛 Debug

### Panneau de Debug

Pour activer le panneau de debug visuel :

```tsx
import RightsDebugPanel from '@/components/debug/RightsDebugPanel';

function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      {/* Activer seulement en développement */}
      {process.env.NODE_ENV === 'development' && (
        <RightsDebugPanel />
      )}
    </>
  );
}
```

Le panneau affiche :
- ✅ Liste des fonctionnalités autorisées
- ❌ Liste des fonctionnalités refusées
- 📊 Statistiques (nb autorisé/refusé)
- 👤 Profil utilisateur
- 🧪 Exemples de vérifications en temps réel

### Logs Console

Le système inclut des logs détaillés :

```
🔑 [DATABASE] Récupération droits utilisateur: { id_structure: 139, id_profil: 1 }
🔍 [PARSER] Parsing UserRights depuis PostgreSQL: { ... }
✅ [PARSER] UserRights parsé avec succès: { profil: "ADMIN", nb_fonctionnalites: 19 }
✅ [AUTH] Droits utilisateur récupérés: { profil: "ADMIN", nb_fonctionnalites: 19 }
✅ [AUTH] Connexion complète réussie: { user: "admin", droits_profil: "ADMIN", nb_fonctionnalites: 19 }
```

### Vérification Manuelle

Dans la console développeur :

```javascript
// Accéder aux droits depuis localStorage
const rightsKey = localStorage.getItem('fayclick_rights');
const rights = JSON.parse(rightsKey);
console.log(rights.data);

// Vérifier un droit spécifique
const authService = require('@/services/auth.service').authService;
const rights = authService.getUserRightsFromStorage();
console.log(rights.fonctionnalites);
```

---

## ⚠️ Points Importants

### Sécurité

1. **Ne jamais faire confiance au client seul** : Les vérifications côté client sont pour l'UX, toujours vérifier côté serveur aussi.

2. **Signature des données** : Les droits sont stockés avec une signature pour détecter les modifications.

3. **Vérification d'intégrité** : Au chargement, la signature est vérifiée. Si invalide → déconnexion.

### Performance

- **Index O(1)** : Utilise un `_index` pour accès constant aux droits.
- **Mémoïsation** : Les callbacks dans AuthContext sont mémoïsés avec `useCallback`.
- **Cache localStorage** : Évite les appels API répétés.

### Fallbacks

En cas d'erreur lors de la récupération des droits :

```typescript
// Droits par défaut sécuritaires (aucun droit)
{
  id_profil: 0,
  profil: 'UNKNOWN',
  fonctionnalites: [],
  _index: {}
}
```

---

## 🔄 Migration depuis l'Ancien Système

L'ancien système de permissions (`UserPermissions`) est **conservé pour compatibilité**.

Les deux systèmes coexistent :

```typescript
const { permissions, rights } = useAuth();

// Ancien système (enum Permission)
if (permissions.canViewDashboard) { ... }

// Nouveau système (strings PostgreSQL)
if (hasRight("VOIR DASHBOARD")) { ... }
```

---

## 📞 Support

Pour toute question sur le système de droits :
- Consulter `utils/permissions.ts` pour la logique métier
- Consulter `services/auth.service.ts` pour l'intégration API
- Utiliser `RightsDebugPanel` pour visualiser les droits en temps réel

---

**Dernière mise à jour** : 2025-01-30
**Version** : 1.0.0