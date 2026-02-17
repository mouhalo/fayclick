# PRD - Gestion des Droits Caissier par l'Admin

**Version** : 1.0
**Date** : 16/02/2026
**Statut** : En attente de validation
**Priorité** : Haute

---

## 1. Contexte et Problème

Actuellement, les caissiers créés par l'admin ont un accès uniforme à l'application. L'admin ne peut pas configurer individuellement les fonctionnalités auxquelles chaque caissier a accès. Par exemple, un caissier peut voir le chiffre d'affaires, la valeur du stock ou accéder aux paramètres, ce qui ne devrait pas être le cas selon le besoin métier.

### Ce qui existe déjà
- **Table `fonctionnalite`** : 13 fonctionnalités configurables (voir section 3)
- **Fonction `get_mes_droits(pid_structure, pid_profil)`** : Liste les droits d'un profil avec statut oui/non
- **Fonction `update_profils_droits(pid_structure, pid_profil, pid_droit, pautorise)`** : Affecte/révoque un droit
- **Hook `useRights()`** et **`useHasRight()`** : Système de vérification des droits côté React
- **`UtilisateurData.fonctionnalites[]`** : Chaque utilisateur retourné par `get_list_utilisateurs()` a déjà ses droits

### Ce qui manque
1. **Interface admin** pour configurer les droits d'un caissier depuis la page Settings/Utilisateurs
2. **Application effective des droits** dans les composants de l'application (dashboard, produits, dépenses, etc.)

---

## 2. Objectifs

| # | Objectif | Mesure de succès |
|---|----------|-----------------|
| 1 | L'admin peut voir et modifier les droits de chaque caissier | Bouton "Droits" sur chaque carte caissier → modal avec toggles |
| 2 | Les droits sont appliqués en temps réel dans l'app | Un caissier sans le droit "VOIR CHIFFRE D'AFFAIRE" ne voit pas le CA |
| 3 | L'admin conserve tous les droits (non modifiables) | La carte admin n'a pas de bouton "Droits" |

---

## 3. Fonctionnalités Disponibles (Table `fonctionnalite`)

| id | Nom | Catégorie | Impact dans l'app |
|----|-----|-----------|-------------------|
| 1 | VOIR VALEUR STOCK PA | Dashboard | Masquer la card valeur stock PA |
| 2 | VOIR NOMBRE PRODUITS | Dashboard | Masquer la card nombre de produits |
| 3 | VOIR CHIFFRE D'AFFAIRE | Dashboard | Masquer la card CA |
| 4 | VOIR BENEFICE | Dashboard | Masquer la card bénéfice |
| 5 | VOIR VALEUR MARCH PV | Dashboard | Masquer la card valeur marchande PV |
| 6 | MODIFIER PRODUIT | Produits | Désactiver bouton édition produit |
| 7 | SUPPRIMER PRODUIT | Produits | Masquer bouton suppression produit |
| 8 | EXPORTER PRODUIT | Produits | Masquer bouton export |
| 10 | AJOUTER DEPENSE | Dépenses | Masquer bouton ajout dépense |
| 11 | GERER PARAMETRAGES | Settings | Bloquer l'accès à /settings pour les caissiers |
| 12 | VOIR INVENTAIRE | Inventaire | Bloquer l'accès à la page inventaire |
| 13 | VOIR TOTAL FACTURES | Dashboard | Masquer la card total factures |

---

## 4. Spécifications Fonctionnelles

### Phase 1 : Interface de gestion des droits (carte caissier)

#### 4.1 Nouveau bouton sur la carte caissier

**Emplacement** : Sur chaque carte caissier dans `UsersManagement.tsx`, à côté des boutons Modifier (stylo) et Supprimer (poubelle).

**Design** :
- Icône : `Shield` (lucide-react) en couleur violet/indigo
- Tooltip : "Gérer les droits"
- Non visible sur la carte Admin (profil ADMIN)

**Maquette de la carte caissier** :
```
┌──────────────────────────────────────────────────┐
│  (AD)  ABDOU DIOP                    🛡️  ✏️  🗑️ │
│        CAISSIER                                   │
│        ✉️ abdoudiop@tech24.fay                    │
│        📞 775475402                               │
│        Créé le 16/02/2026                         │
└──────────────────────────────────────────────────┘
```

#### 4.2 Modal de gestion des droits

**Ouverture** : Clic sur le bouton Shield → Modal plein écran (style modal existante).

**Contenu** :
```
┌──────────────────────────────────────────┐
│  🛡️ Droits de ABDOU DIOP          [X]   │
│  Profil : CAISSIER                       │
│──────────────────────────────────────────│
│                                          │
│  📊 DASHBOARD                            │
│  ┌────────────────────────────────────┐  │
│  │ Voir chiffre d'affaire    [====]  │  │
│  │ Voir bénéfice             [    ]  │  │
│  │ Voir valeur stock PA      [====]  │  │
│  │ Voir valeur march. PV     [    ]  │  │
│  │ Voir nombre produits      [====]  │  │
│  │ Voir total factures       [====]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  📦 PRODUITS                             │
│  ┌────────────────────────────────────┐  │
│  │ Modifier produit          [====]  │  │
│  │ Supprimer produit         [    ]  │  │
│  │ Exporter produit          [    ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  💰 DEPENSES & INVENTAIRE                │
│  ┌────────────────────────────────────┐  │
│  │ Ajouter dépense           [====]  │  │
│  │ Voir inventaire           [    ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⚙️ SYSTEME                              │
│  ┌────────────────────────────────────┐  │
│  │ Gérer paramétrages        [    ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ℹ️ 6/13 droits activés                  │
└──────────────────────────────────────────┘
```

**Comportement des toggles** :
- Chaque toggle appelle immédiatement `update_profils_droits(id_structure, id_profil, id_droit, autorise)`
- Feedback visuel : spinner sur le toggle pendant l'appel, puis vert (activé) ou gris (désactivé)
- Toast de confirmation : "Droit activé/révoqué avec succès"
- Compteur en bas mis à jour en temps réel : "X/13 droits activés"

#### 4.3 Données et API

**Chargement des droits** : Les droits sont déjà dans `UtilisateurData.fonctionnalites[]` (retournés par `get_list_utilisateurs()`). Chaque fonctionnalité a :
```typescript
{
  nom_fonctionnalite: string;  // ex: "VOIR CHIFFRE D'AFFAIRE"
  id_fonctionnalite: number;   // ex: 3
  autorise: boolean;           // true/false
}
```

**Mise à jour d'un droit** : Nouveau service à créer dans `users.service.ts` :
```typescript
async updateUserRight(
  id_structure: number,
  id_profil: number,
  id_droit: number,
  autorise: boolean
): Promise<{ success: boolean; action: string }>
```
Appelle : `SELECT * FROM update_profils_droits(${id_structure}, ${id_profil}, ${id_droit}, ${autorise})`

---

### Phase 2 : Application des droits dans l'app

#### 4.4 Zones protégées par les droits

| Fonctionnalité | Composant/Page concerné | Comportement si non autorisé |
|---|---|---|
| VOIR CHIFFRE D'AFFAIRE | Dashboard Commerce - Card CA | Card masquée ou affiche "---" |
| VOIR BENEFICE | Dashboard Commerce - Card Bénéfice | Card masquée |
| VOIR VALEUR STOCK PA | Dashboard Commerce - Card Stock PA | Card masquée |
| VOIR VALEUR MARCH PV | Dashboard Commerce - Card Valeur PV | Card masquée |
| VOIR NOMBRE PRODUITS | Dashboard Commerce - Card Produits | Card masquée |
| VOIR TOTAL FACTURES | Dashboard Commerce - Card Factures | Card masquée |
| MODIFIER PRODUIT | Page Produits - Bouton édition | Bouton caché |
| SUPPRIMER PRODUIT | Page Produits - Bouton suppression | Bouton caché |
| EXPORTER PRODUIT | Page Produits - Bouton export | Bouton caché |
| AJOUTER DEPENSE | Page Dépenses - Bouton ajout | Bouton caché |
| GERER PARAMETRAGES | Navigation + Page /settings | Lien masqué dans menu + redirection si accès direct |
| VOIR INVENTAIRE | Navigation + Page /inventaire | Lien masqué + redirection |

#### 4.5 Stratégie d'implémentation des droits

**Principe** : Utiliser le hook existant `useHasRight("NOM_FONCTIONNALITE")` dans chaque composant concerné.

**Exemple d'application** :
```tsx
// Dashboard card CA
const canViewCA = useHasRight("VOIR CHIFFRE D'AFFAIRE");

{canViewCA && (
  <DashboardCard title="Chiffre d'Affaire" value={ca} />
)}
```

**Protection des routes** :
```tsx
// Dans le layout ou la page settings
const canManageSettings = useHasRight("GERER PARAMETRAGES");

if (!canManageSettings) {
  redirect('/dashboard/commerce');
}
```

**Note importante** : L'admin (id_profil = 1) a TOUS les droits automatiquement. Le hook `useHasRight` doit retourner `true` systématiquement pour un admin.

---

## 5. Fichiers à Créer/Modifier

### Nouveaux fichiers
| Fichier | Description |
|---------|-------------|
| `components/settings/ModalDroitsUtilisateur.tsx` | Modal de gestion des droits avec toggles par catégorie |

### Fichiers à modifier
| Fichier | Modification |
|---------|-------------|
| `components/settings/UsersManagement.tsx` | Ajouter bouton Shield + ouverture modal droits |
| `services/users.service.ts` | Ajouter méthode `updateUserRight()` |
| `app/dashboard/commerce/page.tsx` | Protéger les cards dashboard avec `useHasRight` |
| `app/dashboard/commerce/produits/page.tsx` | Protéger boutons modifier/supprimer/exporter |
| `app/dashboard/commerce/depenses/page.tsx` | Protéger bouton ajout dépense |
| `app/dashboard/commerce/inventaire/page.tsx` | Protéger accès page inventaire |
| `app/settings/page.tsx` | Protéger accès page paramètres |
| Navigation/Sidebar (si existant) | Masquer liens selon droits |

---

## 6. Plan d'Exécution

### Phase 1 - Interface de gestion (prioritaire)
1. Ajouter `updateUserRight()` dans `users.service.ts`
2. Créer `ModalDroitsUtilisateur.tsx` avec les toggles groupés par catégorie
3. Ajouter le bouton Shield sur les cartes caissiers dans `UsersManagement.tsx`
4. Tester : activer/révoquer des droits et vérifier en BD

### Phase 2 - Application des droits
5. Protéger les cards du dashboard commerce
6. Protéger les actions produits (modifier, supprimer, exporter)
7. Protéger la page dépenses et inventaire
8. Protéger l'accès aux paramètres (navigation + route)
9. Tester avec un compte caissier : vérifier que les restrictions sont effectives

---

## 7. Critères d'Acceptation

- [ ] Un bouton Shield est visible sur chaque carte caissier (pas sur l'admin)
- [ ] Le clic ouvre une modal avec tous les droits groupés par catégorie
- [ ] Chaque toggle appelle `update_profils_droits` et met à jour visuellement
- [ ] Un compteur "X/13 droits activés" est affiché
- [ ] Le dashboard masque les cards selon les droits du caissier connecté
- [ ] Les boutons produits sont masqués si le droit correspondant est révoqué
- [ ] La page /settings est inaccessible à un caissier sans le droit "GERER PARAMETRAGES"
- [ ] L'admin a toujours tous les droits (aucune restriction)
