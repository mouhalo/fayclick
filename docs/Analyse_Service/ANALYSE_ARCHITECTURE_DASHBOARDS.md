# Analyse Architecture Dashboards FayClick V2

**Date**: 2 Janvier 2026
**Branche**: `feature/dashboard-prestataire-services`
**Objectif**: Comprendre l'existant pour implémenter le Dashboard Prestataire de Services

---

## 1. Vue d'Ensemble

### 1.1 Types de Structures Supportées

FayClick supporte **5 types de structures** définis dans `types/auth.ts`:

| Type | Route Dashboard | Statut |
|------|-----------------|--------|
| `SCOLAIRE` | `/dashboard/scolaire` | Implémenté |
| `COMMERCIALE` | `/dashboard/commerce` | Implémenté (complet) |
| `IMMOBILIER` | `/dashboard/immobilier` | Implémenté |
| `PRESTATAIRE DE SERVICES` | `/dashboard/services` | **Partiel** |
| `FORMATION PRO` | `/dashboard/formation` | Non implémenté |

### 1.2 Hiérarchie des Fichiers

```
app/dashboard/
├── page.tsx                    ← Redirection automatique selon type_structure
├── admin/
│   └── page.tsx
├── commerce/                   ← LE PLUS COMPLET
│   ├── layout.tsx             ← Validation type_structure
│   ├── page.tsx               ← Dashboard principal
│   ├── clients/page.tsx
│   ├── depenses/page.tsx
│   ├── factures/page.tsx
│   ├── inventaire/page.tsx
│   ├── produits/page.tsx
│   └── venteflash/page.tsx
├── scolaire/
│   ├── layout.tsx
│   └── page.tsx
├── immobilier/
│   ├── layout.tsx
│   └── page.tsx
└── services/                   ← PRESTATAIRE (à développer)
    ├── layout.tsx             ← Existe
    ├── page.tsx               ← Existe (basique)
    └── prestations/page.tsx   ← Existe (basique)
```

---

## 2. Système d'Authentification & Redirection

### 2.1 Flux de Connexion

```
Login → AuthService.completeLogin() → Structure récupérée → Permissions calculées
                                           ↓
                              getUserRedirectRoute(user)
                                           ↓
                              Redirection vers /dashboard/{type}
```

### 2.2 Fonction de Redirection

**Fichier**: `types/auth.ts`

```typescript
export function getUserRedirectRoute(user: User): string {
  const USER_ROUTES: Record<string, string> = {
    SCOLAIRE: '/dashboard/scolaire',
    COMMERCE: '/dashboard/commerce',
    COMMERCIALE: '/dashboard/commerce',
    IMMOBILIER: '/dashboard/immobilier',
    'PRESTATAIRE DE SERVICES': '/dashboard/services',
    'FORMATION PRO': '/dashboard/formation',
    CLIENT: '/dashboard/client',
    ADMIN: '/dashboard/admin',
    SYSTEM: '/dashboard/system'
  };

  // Priorité: type_structure > nom_groupe > fallback
}
```

### 2.3 Protection des Routes (Layout)

Chaque dashboard a un `layout.tsx` qui vérifie:

```typescript
// Exemple: app/dashboard/commerce/layout.tsx
useEffect(() => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  const user = authService.getUser();
  if (!user || user.type_structure !== 'COMMERCIALE') {
    router.push('/dashboard');
  }
}, []);
```

---

## 3. Architecture des Données

### 3.1 Hook Principal: `useDashboardData`

**Fichier**: `hooks/useDashboardData.ts`

```typescript
export function useDashboardData(structureId: number) {
  return {
    stats: DashboardStats,           // Données brutes API
    statsCardData: StatsCardData[],  // Transformées pour affichage
    financialData: FinancialData,    // Calculs financiers
    isLoading: boolean,
    error: Error | null,
    refresh: () => void
  };
}
```

### 3.2 Structure des Stats par Type

**Interface `DashboardStats`** (réponse API):

```typescript
interface DashboardStats {
  nom_structure: string;
  type_structure: string;

  // Financier (commun)
  mt_total_factures: number;
  mt_total_payees: number;
  mt_total_impayees: number;

  // SCOLAIRE
  total_eleves?: number;

  // COMMERCIALE
  total_produits?: number;
  total_clients?: number;
  mt_valeur_stocks?: number;

  // IMMOBILIER
  total_clients?: number;

  // PRESTATAIRE DE SERVICES
  total_services?: number;
  mt_chiffre_affaire?: number;
}
```

### 3.3 Transformation pour Affichage

Le hook transforme les données selon le `type_structure`:

| Type | Métrique 1 | Métrique 2 | Métrique 3 | Métrique 4 |
|------|-----------|-----------|-----------|-----------|
| SCOLAIRE | Élèves | Total Factures | Payées | Impayées |
| COMMERCIALE | Produits | Valeur Stock | Clients | Dépenses |
| IMMOBILIER | Clients | Total Factures | Payées | Impayées |
| PRESTATAIRE | Services | Chiffre d'Affaires | Clients | - |

---

## 4. Composants Réutilisables

### 4.1 Composants Dashboard

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `DashboardContainer` | `components/dashboard/` | Wrapper responsive avec gradient |
| `DashboardHeader` | `components/dashboard/` | Header avec menu, notifs, titre |
| `StatsCard` | `components/dashboard/` | Carte statistique individuelle |
| `StatsGrid` | `components/dashboard/` | Grille 2×2 (mobile) / 4×1 (desktop) |
| `MainMenu` | `components/layout/` | Menu latéral avec profil |

### 4.2 Composants Modaux Partagés

| Modal | Usage |
|-------|-------|
| `ModalAbonnementExpire` | Blocage si abonnement expiré |
| `ModalCoffreFort` | Gestion encaissements (COMMERCE, SERVICES) |
| `ModalFactureSuccess` | Confirmation création facture |
| `ModalPaiementQRCode` | Paiement wallet (OM/WAVE/FREE) |

### 4.3 Pattern de Page Dashboard

```tsx
export default function DashboardPage() {
  // 1. Auth & Validation
  const { user, structure } = useAuth();
  const { stats, isLoading, refresh } = useDashboardData(structure?.id_structure);

  // 2. États locaux
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFinances, setShowFinances] = useState(false);

  // 3. Rendu
  return (
    <DashboardContainer>
      <DashboardHeader
        title="Mon Dashboard"
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <StatsGrid data={stats} isLoading={isLoading} />

      {/* Actions rapides */}
      <QuickActions />

      {/* Modaux */}
      <MainMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </DashboardContainer>
  );
}
```

---

## 5. Système de Permissions

### 5.1 Hook `usePermissions`

**Fichier**: `hooks/usePermissions.ts`

```typescript
const { can, canAny, canAll, checks } = usePermissions();

// Vérification simple
if (can(Permission.MANAGE_SERVICES)) { ... }

// Vérifications multiples
if (canAny([Permission.VIEW_REVENUE, Permission.VIEW_SALES])) { ... }
```

### 5.2 Permissions par Type

| Type | Permissions Clés |
|------|-----------------|
| SCOLAIRE | `MANAGE_STUDENTS`, `VIEW_GRADES`, `MANAGE_COURSES` |
| COMMERCIALE | `MANAGE_PRODUCTS`, `MANAGE_INVENTORY`, `VIEW_SALES` |
| IMMOBILIER | `MANAGE_PROPERTIES`, `MANAGE_CLIENTS`, `VIEW_COMMISSIONS` |
| PRESTATAIRE | `MANAGE_SERVICES`, `MANAGE_APPOINTMENTS`, `VIEW_REVENUE` |

---

## 6. État Actuel: Dashboard Services

### 6.1 Fichiers Existants

```
app/dashboard/services/
├── layout.tsx          ← Validation type_structure OK
├── page.tsx            ← Dashboard basique
└── prestations/
    └── page.tsx        ← Liste prestations (minimal)
```

### 6.2 Fonctionnalités Présentes

- Affichage statistiques de base (Services, CA, Clients)
- Modal Coffre-Fort
- Menu principal
- Header avec notifications

### 6.3 Ce qui Manque

| Fonctionnalité | Priorité | Commerce Équivalent |
|----------------|----------|---------------------|
| Gestion Services/Tarifs | Haute | Produits |
| Gestion Clients | Haute | Clients |
| Création Prestation | Haute | Facture/VenteFlash |
| Historique Prestations | Moyenne | Factures |
| Agenda/Rendez-vous | Moyenne | - (nouveau) |
| Statistiques détaillées | Basse | Inventaire/Stats |

---

## 7. Services Backend Disponibles

### 7.1 Endpoints API Existants

D'après `services/dashboard.service.ts` et l'API:

```typescript
// Stats dashboard
GET /api/dashboard/stats/{id_structure}

// Clients (réutilisable)
SELECT * FROM get_list_clients(pid_structure, ptel_client)

// Factures (réutilisable)
SELECT * FROM get_mes_factures(pid_structure, periode)
```

### 7.2 À Créer Côté Backend

| Fonction PostgreSQL | Description |
|---------------------|-------------|
| `get_list_services(pid_structure)` | Liste des services/tarifs |
| `add_service(params)` | Créer un service |
| `get_list_prestations(pid_structure, periode)` | Historique prestations |
| `add_prestation(params)` | Enregistrer une prestation |
| `get_agenda_prestataire(pid_structure, date)` | Rendez-vous du jour |

---

## 8. Recommandations

### 8.1 Approche Recommandée

1. **Réutiliser au maximum** les composants existants (Commerce)
2. **Adapter** plutôt que recréer (ex: Produit → Service)
3. **Prioriser** les fonctionnalités essentielles

### 8.2 Ordre d'Implémentation Suggéré

```
Phase 1 - Core (Semaine 1)
├── Gestion Services/Tarifs
├── Gestion Clients (réutiliser existant)
└── Dashboard amélioré

Phase 2 - Prestations (Semaine 2)
├── Création Prestation rapide
├── Historique Prestations
└── Reçu/Facture prestation

Phase 3 - Avancé (Semaine 3+)
├── Agenda/Rendez-vous
├── Notifications client
└── Statistiques avancées
```

---

## 9. Conclusion

L'architecture FayClick est **bien structurée** et **extensible**. Le dashboard Commerce est le plus complet et servira de **modèle de référence** pour le dashboard Prestataire de Services.

**Points forts à exploiter**:
- Composants réutilisables matures
- Système de permissions flexible
- Hooks de données centralisés
- Patterns UI cohérents (Tailwind + Framer Motion)

**Prochaine étape**: Définir les entités métier spécifiques aux prestataires (Service, Prestation, Tarif, Rendez-vous).
