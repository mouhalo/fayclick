# MÉMO : Fonctionnalités Admin System à Implémenter

**Date** : 10 Janvier 2026
**Statut** : En attente - Revenir après stabilisation connexion commerçants

---

## 1. Contexte

L'admin système (admin@system.fay) a `id_structure = 0` et nécessite un workflow différent des utilisateurs normaux qui ont une vraie structure.

---

## 2. Problème identifié

Lors de la connexion admin, le système tentait d'appeler `get_une_structure(0)` qui échouait car aucune structure n'existe avec id = 0.

---

## 3. Solution à implémenter

### 3.1 Workflow Admin System (id_structure = 0)

```typescript
// Détection admin système
const isAdminSystem = user.id_structure === 0;

if (isAdminSystem) {
  // NE PAS appeler get_une_structure()
  // Créer une structure virtuelle
  // Attribuer droits admin complets
  // Rediriger vers /dashboard/admin
}
```

### 3.2 Structure Virtuelle Admin

```typescript
const virtualStructure = {
  id_structure: 0,
  code_structure: 'ADMIN-SYSTEM',
  nom_structure: 'Administration Système FayClick',
  type_structure: 'ADMIN',
  etat_abonnement: {
    statut: 'ACTIF',
    date_debut: '2020-01-01',
    date_fin: '2099-12-31',
    jours_restants: 99999,
    type_abonnement: 'SYSTEM'
  }
};
```

### 3.3 Routes à ajouter dans USER_ROUTES

```typescript
'ADMIN SYSTEM': '/dashboard/admin',
'SYSTEME': '/dashboard/admin'
```

---

## 4. Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `services/auth.service.ts` | Ajouter détection admin et structure virtuelle dans `completeLogin()` |
| `contexts/AuthContext.tsx` | Gérer admin dans hydratation et refreshAuth |
| `types/auth.ts` | Ajouter routes 'ADMIN SYSTEM' et 'SYSTEME' |

---

## 5. Dashboard Admin - Fonctions PostgreSQL

Les fonctions PostgreSQL sont prêtes (testées par le DBA) :

| Fonction | Description |
|----------|-------------|
| `get_admin_stats_global()` | Stats pour les 4 StatCards |
| `get_admin_list_structures(limit, offset, search, type, statut)` | Liste structures paginée |
| `get_admin_list_abonnements(limit, offset, statut, type, date_debut, date_fin)` | Liste abonnements |
| `get_admin_stats_ventes(annee, mois, id_structure)` | Statistiques ventes |
| `get_admin_detail_structure(id_structure)` | Détails d'une structure |

---

## 6. Dashboard Admin - Interface

### 6.1 Composants créés

- `app/dashboard/admin/page.tsx` - Page principale
- `services/admin.service.ts` - Service API admin
- `types/admin.types.ts` - Types TypeScript

### 6.2 Layout

```
┌─────────────────────────────────────────────────┐
│ Dashboard Administration                        │
│ Supervision globale FayClick                    │
├─────────────────────────────────────────────────┤
│ [StatCard] [StatCard] [StatCard] [StatCard]     │
├─────────────────────────────────────────────────┤
│ [Structures] [Abonnements] [Ventes]  ← Onglets  │
├─────────────────────────────────────────────────┤
│ Filtres + Recherche                             │
├─────────────────────────────────────────────────┤
│ Tableau avec données                            │
│ - Pagination                                    │
│ - Actions (voir détails)                        │
└─────────────────────────────────────────────────┘
```

---

## 7. Points d'attention

1. **NE JAMAIS** appeler `get_une_structure()` pour id_structure = 0
2. **Vérifier** que le workflow utilisateur normal n'est pas affecté
3. **Propager les erreurs** correctement dans AuthContext (throw error dans catch)
4. **Tester** la connexion commerçant AVANT d'implémenter admin

---

## 8. Ordre d'implémentation recommandé

1. ✅ S'assurer que la connexion commerçant fonctionne parfaitement
2. [ ] Modifier `auth.service.ts` - détection admin + structure virtuelle
3. [ ] Modifier `AuthContext.tsx` - gestion hydratation admin
4. [ ] Modifier `types/auth.ts` - routes admin
5. [ ] Tester connexion admin
6. [ ] Intégrer dashboard admin avec API

---

## 9. Identifiants de test

| Utilisateur | Login | Mot de passe | Type |
|-------------|-------|--------------|------|
| Admin System | admin@system.fay | 777301221@ | id_structure = 0 |
| Commerçant | admin@tech24.fay | 777301221@ | id_structure = 183 |

---

*Ce mémo sera utilisé pour reprendre l'implémentation après stabilisation du système de connexion standard.*
