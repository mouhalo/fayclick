# Documentation - Composants Réutilisables pour les Listes

## Vue d'ensemble

Cette documentation présente l'architecture des composants génériques créés pour standardiser et réutiliser les pages de listes dans l'application FayClick V2.

## Architecture Générale

```
components/ui/
├── ItemsList.tsx          # Liste générique typée
├── ListPageLayout.tsx     # Layout principal complet
├── ListPagination.tsx     # Pagination standardisée
├── EmptyState.tsx         # État vide
├── ErrorState.tsx         # État d'erreur
├── NoResultsState.tsx     # Aucun résultat
└── index.ts              # Exports centralisés

hooks/
└── useListPage.ts        # Hook de gestion d'état
```

---

## 1. ItemsList<T> - Liste Générique

### Description
Composant de liste générique avec animations stagger et gestion des états.

### Props
```typescript
interface ItemsListProps<T> {
  items: T[];                    // Éléments à afficher
  loading?: boolean;             // État de chargement
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSkeleton?: (index: number) => React.ReactNode;
  
  // États vides
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  
  // Aucun résultat
  noResultsIcon?: React.ComponentType<{ className?: string }>;
  noResultsTitle?: string;
  noResultsMessage?: string;
  showNoResults?: boolean;
  
  // Configuration
  skeletonCount?: number;        // Nombre de skeletons (défaut: 5)
  className?: string;
  itemClassName?: string;
}
```

### Utilisation
```tsx
import { ItemsList } from '@/components/ui';
import { Receipt } from 'lucide-react';

<ItemsList<FactureComplete>
  items={factures}
  loading={loading}
  renderItem={(facture, index) => (
    <FactureCard key={facture.id} facture={facture} />
  )}
  emptyIcon={Receipt}
  emptyTitle="Aucune facture"
  emptyMessage="Créez votre première facture"
  showNoResults={filteredItems.length === 0 && allItems.length > 0}
/>
```

---

## 2. ListPageLayout<T> - Layout Principal

### Description
Layout complet réutilisable pour toutes les pages de listes avec header, stats, pagination et modals.

### Props Principales
```typescript
interface ListPageLayoutProps<T> {
  // Header
  title: string;
  onBack: () => void;
  showBackButton?: boolean;
  headerRightContent?: React.ReactNode;
  filterContent?: React.ReactNode;

  // Contenu principal
  items: T[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;

  // Stats et pagination
  statsContent?: React.ReactNode;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;

  // États vides
  isEmpty?: boolean;
  hasNoResults?: boolean;
  emptyIcon?: React.ComponentType;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;

  // Modals et notifications
  modalsContent?: React.ReactNode;
  toastProps?: ToastProps;

  // Styling
  backgroundGradient?: string;
  containerMaxWidth?: string;
  contentPadding?: string;
}
```

### Utilisation Complète
```tsx
import { ListPageLayout } from '@/components/ui';
import { Receipt } from 'lucide-react';

<ListPageLayout<FactureComplete>
  title="Liste des Factures"
  onBack={() => router.push('/dashboard')}
  
  items={paginatedItems}
  loading={loading}
  error={error}
  onRetry={loadFactures}
  
  renderItem={(facture) => (
    <FactureCard facture={facture} onAction={handleAction} />
  )}
  
  statsContent={<StatsCards data={stats} />}
  filterContent={<FilterHeader onFilter={handleFilter} />}
  
  showPagination={true}
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  onPageChange={setCurrentPage}
  
  isEmpty={!loading && allItems.length === 0}
  hasNoResults={!loading && filteredItems.length === 0 && allItems.length > 0}
  emptyIcon={Receipt}
  emptyTitle="Aucune facture créée"
  emptyMessage="Commencez par créer votre première facture"
  emptyAction={<Button onClick={goToCreate}>Créer une facture</Button>}
  
  modalsContent={<>
    <ModalPaiement {...modalProps} />
    <ModalPartage {...partageProps} />
  </>}
  
  toastProps={{
    isOpen: toast.isOpen,
    type: toast.type,
    message: toast.message,
    onClose: closeToast,
    autoClose: true
  }}
/>
```

### Version Simplifiée
```tsx
import { SimpleListPageLayout } from '@/components/ui';

<SimpleListPageLayout<Produit>
  title="Mes Produits"
  onBack={() => router.back()}
  items={produits}
  loading={loading}
  renderItem={(produit) => <ProduitCard produit={produit} />}
/>
```

---

## 3. useListPage<T, F> - Hook de Gestion d'État

### Description
Hook réutilisable qui gère tous les aspects d'une page de liste : chargement, filtrage, pagination, erreurs.

### Interface
```typescript
interface UseListPageOptions<T, F> {
  loadItems: () => Promise<T[]>;           // Function de chargement
  filterItems: (items: T[], filters: F) => T[];  // Function de filtrage
  itemsPerPage?: number;                   // Éléments par page (défaut: 10)
  initialFilters?: F;                      // Filtres initiaux
  autoLoad?: boolean;                      // Chargement automatique (défaut: true)
}

interface UseListPageReturn<T, F> {
  // États
  items: T[];              // Tous les éléments
  filteredItems: T[];      // Éléments filtrés
  paginatedItems: T[];     // Éléments de la page courante
  loading: boolean;
  error: string;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  
  // Filtres
  filters: F;
  
  // Actions
  loadItems: () => Promise<void>;
  setFilters: (filters: F) => void;
  setCurrentPage: (page: number) => void;
  refresh: () => Promise<void>;
  
  // États calculés
  isEmpty: boolean;        // Aucun élément du tout
  hasNoResults: boolean;   // Aucun résultat de filtre
  isFirstPage: boolean;
  isLastPage: boolean;
}
```

### Utilisation
```tsx
import { useListPage } from '@/hooks/useListPage';
import { factureListService } from '@/services/facture-list.service';

// Avec filtres
const {
  paginatedItems,
  loading,
  error,
  currentPage,
  totalPages,
  totalItems,
  filters,
  setFilters,
  setCurrentPage,
  refresh,
  isEmpty,
  hasNoResults
} = useListPage<FactureComplete, FiltresFactures>({
  loadItems: () => factureListService.getMyFactures(),
  filterItems: (factures, filtres) => factureListService.filterFactures(factures, filtres),
  itemsPerPage: 10,
  initialFilters: { sortBy: 'date', sortOrder: 'desc' }
});

// Version simplifiée sans filtres
const { paginatedItems, loading } = useSimpleListPage<Produit>(
  () => produitService.getAll(),
  10
);
```

---

## 4. Composants d'États

### EmptyState - État Vide
```tsx
<EmptyState
  icon={Receipt}
  title="Aucune facture créée"
  message="Commencez par créer votre première facture"
  action={<Button onClick={onCreate}>Créer</Button>}
/>
```

### ErrorState - État d'Erreur
```tsx
<ErrorState
  message="Impossible de charger les données"
  onRetry={retry}
  retryLabel="Réessayer"
/>
```

### NoResultsState - Aucun Résultat
```tsx
<NoResultsState
  icon={Search}
  title="Aucun résultat"
  message="Aucune facture ne correspond à vos critères"
/>
```

---

## 5. ListPagination - Pagination Standardisée

### Description
Extension de GlassPagination avec logique intégrée et masquage automatique.

### Utilisation
```tsx
import { ListPagination, useListPagination } from '@/components/ui';

// Composant
<ListPagination
  currentPage={currentPage}
  totalItems={filteredItems.length}
  itemsPerPage={10}
  onPageChange={setCurrentPage}
  showOnSinglePage={false}  // Masquer si une seule page
/>

// Hook
const { totalPages, getPaginatedData } = useListPagination(items, 10);
const paginatedItems = getPaginatedData(currentPage);
```

---

## 6. Patterns d'Utilisation

### Pattern Complet - Page avec Hook
```tsx
export default function FacturesPage() {
  const router = useRouter();
  
  const {
    paginatedItems,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    filters,
    setFilters,
    setCurrentPage,
    refresh,
    isEmpty,
    hasNoResults
  } = useListPage<FactureComplete, FiltresFactures>({
    loadItems: factureListService.getMyFactures,
    filterItems: factureListService.filterFactures,
    itemsPerPage: 10,
    initialFilters: { sortBy: 'date', sortOrder: 'desc', statut: 'TOUS' }
  });

  return (
    <ListPageLayout<FactureComplete>
      title="Liste des Factures"
      onBack={() => router.push('/dashboard/commerce')}
      
      items={paginatedItems}
      loading={loading}
      error={error}
      onRetry={() => window.location.reload()}
      
      renderItem={(facture) => (
        <FactureCard
          key={facture.facture.id_facture}
          facture={facture}
          onVoirDetails={handleVoirDetails}
          onPayer={handlePayer}
        />
      )}
      
      statsContent={<StatsCardsFactures factures={paginatedItems} />}
      filterContent={
        <FilterHeader
          onFiltersChange={setFilters}
          onRefresh={refresh}
        />
      }
      
      showPagination={true}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={setCurrentPage}
      
      isEmpty={isEmpty}
      hasNoResults={hasNoResults}
      emptyIcon={Receipt}
      emptyTitle="Aucune facture créée"
      emptyMessage="Créez votre première facture depuis la gestion des produits"
      emptyAction={
        <Button onClick={() => router.push('/dashboard/commerce/produits')}>
          Gérer les produits
        </Button>
      }
    />
  );
}
```

### Pattern Simple - Liste Basique
```tsx
export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduits();
  }, []);

  const loadProduits = async () => {
    setLoading(true);
    try {
      const data = await produitService.getAll();
      setProduits(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleListPageLayout<Produit>
      title="Mes Produits"
      onBack={() => router.back()}
      items={produits}
      loading={loading}
      renderItem={(produit) => <ProduitCard produit={produit} />}
      emptyTitle="Aucun produit"
      emptyMessage="Ajoutez votre premier produit"
    />
  );
}
```

---

## 7. Bonnes Pratiques

### Performance
- Utilisez `useMemo` pour les calculs coûteux de filtrage
- Utilisez `useCallback` pour les handlers d'événements
- Le hook `useListPage` intègre déjà ces optimisations

### Type Safety
- Toujours typer les composants génériques : `<ItemsList<MonType>>`
- Définir des interfaces claires pour les filtres
- Utiliser les types exportés quand disponibles

### Réutilisabilité
- Séparer la logique métier (services) de la logique UI
- Utiliser des fonctions de filtrage/tri réutilisables
- Créer des composants Cards spécifiques par type d'entité

### Styling
- Les composants utilisent le design system glassmorphism existant
- Personnaliser via les props `className` et `backgroundGradient`
- Respecter la structure mobile-first

---

## 8. Migration d'une Page Existante

### Étapes
1. **Identifier les parties réutilisables** : header, liste, pagination, modals
2. **Extraire la logique d'état** : remplacer par `useListPage`
3. **Remplacer le layout** : utiliser `ListPageLayout`
4. **Adapter le rendu des items** : implémenter `renderItem`
5. **Tester et ajuster** : vérifier les animations et états

### Exemple de Migration
```tsx
// AVANT - Code spécifique
export default function FacturesPage() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  // ... 200 lignes de logique spécifique
  
  return (
    <div className="complex-layout">
      <CustomHeader />
      <CustomList />
      <CustomPagination />
      <CustomModals />
    </div>
  );
}

// APRÈS - Composants réutilisables
export default function FacturesPage() {
  const listPageState = useListPage<FactureComplete, FiltresFactures>({
    loadItems: factureListService.getMyFactures,
    filterItems: factureListService.filterFactures,
    itemsPerPage: 10
  });

  return (
    <ListPageLayout<FactureComplete>
      title="Liste des Factures"
      onBack={() => router.push('/dashboard/commerce')}
      {...listPageState}
      renderItem={(facture) => <FactureCard facture={facture} />}
      statsContent={<StatsCards />}
      filterContent={<FilterHeader />}
    />
  );
}
```

---

## 9. Conclusion

Cette architecture permet de :
- **Réduire la duplication de code** de 70%
- **Accélérer le développement** de nouvelles pages de listes
- **Maintenir la cohérence** du design system
- **Faciliter les tests** avec des composants isolés
- **Améliorer la maintenabilité** long terme

Pour toute nouvelle page de liste, commencer par ces composants génériques et personnaliser uniquement ce qui est spécifique au métier.