# Composants UI Réutilisables - Guide Rapide

## 🚀 Utilisation Rapide

### Pour créer une nouvelle page de liste :

```tsx
import { ListPageLayout, useListPage } from '@/components/ui';

export default function MaListePage() {
  const {
    paginatedItems,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage
  } = useListPage<MonType, MesFiltres>({
    loadItems: monService.getAll,
    filterItems: monService.filter,
    itemsPerPage: 10
  });

  return (
    <ListPageLayout<MonType>
      title="Ma Liste"
      onBack={() => router.back()}
      items={paginatedItems}
      loading={loading}
      error={error}
      renderItem={(item) => <MaCard item={item} />}
      showPagination={true}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={setCurrentPage}
    />
  );
}
```

## 📋 Composants Disponibles

- **ListPageLayout<T>** - Layout complet pour pages de listes
- **ItemsList<T>** - Liste générique avec animations
- **useListPage<T, F>** - Hook de gestion d'état
- **ListPagination** - Pagination standardisée
- **EmptyState** - État vide
- **ErrorState** - État d'erreur
- **NoResultsState** - Aucun résultat

## 📖 Documentation Complète

Voir `docs/REUSABLE_COMPONENTS.md` pour la documentation détaillée avec tous les exemples d'usage.