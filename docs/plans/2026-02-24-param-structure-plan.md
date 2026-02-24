# Paramètres Structure - Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mapper les paramètres `param_structure` depuis la DB vers le frontend, les rendre éditables dans Settings, et synchroniser avec localStorage pour la propagation aux pages produits/venteflash.

**Architecture:** DB-first avec sync localStorage. `get_une_structure()` retourne les 9 champs param_structure. Au login et à la sauvegarde settings, on sync le localStorage `fayclick_regles_ventes_{id}` pour que `useSalesRules()` continue de fonctionner sans changement sur les pages consommatrices.

**Tech Stack:** Next.js 15, TypeScript, React 19, Tailwind CSS, PostgreSQL (fonctions: `get_une_structure`, `edit_param_structure`)

---

## Task 1 : Ajouter les champs param_structure dans StructureDetails

**Files:**
- Modify: `types/auth.ts:72-83`

**Step 1: Ajouter les 9 champs à l'interface StructureDetails**

Dans `types/auth.ts`, ajouter après la ligne `etat_abonnement`:

```typescript
export interface StructureDetails extends Structure {
  description?: string;
  website?: string;
  siret?: string;
  responsable?: string;
  created_at: string;
  updated_at: string;
  etat_abonnement?: EtatAbonnement | null;
  // Paramètres structure depuis param_structure (get_une_structure)
  credit_autorise?: boolean;
  limite_credit?: number;
  acompte_autorise?: boolean;
  prix_engros?: boolean;
  nombre_produit_max?: number;
  nombre_caisse_max?: number;
  compte_prive?: boolean;
  mensualite?: number;
  taux_wallet?: number;
}
```

**Step 2: Commit**

```
git add types/auth.ts
git commit -m "feat: ajouter champs param_structure dans StructureDetails"
```

---

## Task 2 : Mapper les champs dans auth.service.ts + sync localStorage au login

**Files:**
- Modify: `services/auth.service.ts:47-75` (fetchStructureDetails mapping)
- Modify: `services/auth.service.ts:548-586` (saveCompleteAuthData)

**Step 1: Mapper les 9 champs dans fetchStructureDetails**

Dans `services/auth.service.ts`, méthode `fetchStructureDetails`, ajouter après la ligne `etat_abonnement`:

```typescript
const structure: StructureDetails = {
  // ... champs existants ...
  etat_abonnement: structureData.etat_abonnement as StructureDetails['etat_abonnement'] || null,
  // Paramètres structure depuis param_structure
  credit_autorise: structureData.credit_autorise as boolean ?? false,
  limite_credit: structureData.limite_credit as number ?? 5000,
  acompte_autorise: structureData.acompte_autorise as boolean ?? false,
  prix_engros: structureData.prix_engros as boolean ?? false,
  nombre_produit_max: structureData.nombre_produit_max as number ?? 600,
  nombre_caisse_max: structureData.nombre_caisse_max as number ?? 2,
  compte_prive: structureData.compte_prive as boolean ?? false,
  mensualite: structureData.mensualite as number ?? 0,
  taux_wallet: structureData.taux_wallet as number ?? 0.04,
};
```

**Step 2: Sync localStorage sales rules dans saveCompleteAuthData**

Dans `saveCompleteAuthData`, après la sauvegarde des droits, ajouter la sync :

```typescript
// Sync localStorage sales rules depuis les paramètres DB
if (authData.structure.id_structure) {
  const salesRulesKey = `fayclick_regles_ventes_${authData.structure.id_structure}`;
  const salesRules = {
    creditAutorise: authData.structure.credit_autorise ?? false,
    limiteCredit: authData.structure.limite_credit ?? 5000,
    acompteAutorise: authData.structure.acompte_autorise ?? false,
    prixEnGrosActif: authData.structure.prix_engros ?? false,
  };
  localStorage.setItem(salesRulesKey, JSON.stringify(salesRules));
  console.log('✅ [AUTH] Sales rules synchronisées depuis DB:', salesRules);
}
```

**Step 3: Commit**

```
git add services/auth.service.ts
git commit -m "feat: mapper param_structure au login + sync localStorage"
```

---

## Task 3 : Ajouter edit_param_structure dans database.service.ts

**Files:**
- Modify: `services/database.service.ts`

**Step 1: Ajouter la méthode editParamStructure**

```typescript
async editParamStructure(
  idStructure: number,
  params: {
    credit_autorise?: boolean;
    limite_credit?: number;
    acompte_autorise?: boolean;
    prix_engros?: boolean;
  }
): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  const args = [
    idStructure,
    params.credit_autorise !== undefined ? params.credit_autorise : 'NULL',
    params.limite_credit !== undefined ? params.limite_credit : 'NULL',
    params.acompte_autorise !== undefined ? params.acompte_autorise : 'NULL',
    params.prix_engros !== undefined ? params.prix_engros : 'NULL',
  ];

  const query = `SELECT edit_param_structure(${args.map(a => a === 'NULL' ? 'NULL' : typeof a === 'boolean' ? a : `'${a}'`).join(', ')})`;

  const results = await this.query(query);
  if (results && results.length > 0) {
    const raw = (results[0] as Record<string, unknown>).edit_param_structure;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed;
  }
  return { success: false, message: 'Aucune réponse' };
}
```

**Step 2: Commit**

```
git add services/database.service.ts
git commit -m "feat: ajouter editParamStructure dans database service"
```

---

## Task 4 : Modifier l'onglet Règles Ventes (settings/page.tsx)

**Files:**
- Modify: `app/settings/page.tsx`

**Step 1: Charger les sales rules depuis la structure DB au lieu de localStorage seul**

Dans le useEffect de chargement (ligne ~226-283), après `setCurrentStructureData(structureData)`, initialiser les salesRules depuis les données DB :

```typescript
// Initialiser les sales rules depuis les données DB
const dbSalesRules: SalesRules = {
  creditAutorise: structureData.credit_autorise ?? DEFAULT_SALES_RULES.creditAutorise,
  limiteCredit: structureData.limite_credit ?? DEFAULT_SALES_RULES.limiteCredit,
  acompteAutorise: structureData.acompte_autorise ?? DEFAULT_SALES_RULES.acompteAutorise,
  prixEnGrosActif: structureData.prix_engros ?? DEFAULT_SALES_RULES.prixEnGrosActif,
};
setSalesRules(dbSalesRules);
// Sync localStorage pour les pages produits/venteflash
saveSalesRules(user.id_structure, dbSalesRules);
```

Supprimer la ligne `setSalesRules(loadSalesRules(user.id_structure));` (ligne ~445) qui charge depuis localStorage seul.

**Step 2: Modifier updateSalesRules pour sauvegarder en DB**

Remplacer la fonction `updateSalesRules` (lignes 516-521) par :

```typescript
const [isSavingSalesRules, setIsSavingSalesRules] = useState(false);

const updateSalesRules = async (updates: Partial<SalesRules>) => {
  if (!user?.id_structure) return;

  const newRules = { ...salesRules, ...updates };
  // Mise à jour optimiste locale immédiate
  setSalesRules(newRules);
  saveSalesRules(user.id_structure, newRules);

  // Sauvegarde en DB
  try {
    setIsSavingSalesRules(true);
    const dbParams: Record<string, boolean | number | undefined> = {};
    if ('creditAutorise' in updates) dbParams.credit_autorise = updates.creditAutorise;
    if ('limiteCredit' in updates) dbParams.limite_credit = updates.limiteCredit;
    if ('acompteAutorise' in updates) dbParams.acompteAutorise = updates.acompteAutorise;
    if ('prixEnGrosActif' in updates) dbParams.prix_engros = updates.prixEnGrosActif;

    const result = await databaseService.editParamStructure(user.id_structure, dbParams);
    if (!result.success) {
      showMessage('error', result.message || 'Erreur sauvegarde paramètres');
    }
  } catch (error) {
    console.error('Erreur sauvegarde règles ventes en DB:', error);
    showMessage('error', 'Erreur de connexion lors de la sauvegarde');
  } finally {
    setIsSavingSalesRules(false);
  }
};
```

**Step 3: Ajouter nombre_produit_max en lecture seule dans l'onglet sales**

Après le bloc "Prix en gros" (ligne ~1000), ajouter :

```tsx
{/* Nombre max produits - lecture seule */}
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.5 }}
  className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200"
>
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center">
      <Shield className="h-6 w-6 text-white" />
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-gray-900">Nombre max de produits</h3>
      <p className="text-sm text-gray-500">Défini par votre plan d'abonnement</p>
    </div>
    <span className="text-2xl font-bold text-gray-700">
      {currentStructureData?.nombre_produit_max ?? 600}
    </span>
  </div>
</motion.div>
```

**Step 4: Commit**

```
git add app/settings/page.tsx
git commit -m "feat: onglet Règles Ventes connecté à la DB + nombre_produit_max"
```

---

## Task 5 : Modifier l'onglet Utilisateurs (UsersManagement.tsx)

**Files:**
- Modify: `components/settings/UsersManagement.tsx:274`

**Step 1: Remplacer le hardcoded MAX_CAISSIERS**

Le composant doit recevoir la limite depuis les props. Ajouter la prop `maxCaissiers` à l'interface du composant :

```typescript
interface UsersManagementProps {
  onShowMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  maxCaissiers?: number; // depuis param_structure.nombre_caisse_max
}
```

Remplacer ligne 274 :
```typescript
// Avant:
const MAX_CAISSIERS = 2;

// Après:
const MAX_CAISSIERS = maxCaissiers ?? 2;
```

**Step 2: Passer la prop depuis settings/page.tsx**

Modifier l'appel à UsersManagement (ligne ~885) :

```tsx
<UsersManagement
  onShowMessage={showPopMessage}
  maxCaissiers={currentStructureData?.nombre_caisse_max ?? 2}
/>
```

**Step 3: Commit**

```
git add components/settings/UsersManagement.tsx app/settings/page.tsx
git commit -m "feat: nombre_caisse_max dynamique depuis DB au lieu de hardcodé"
```

---

## Task 6 : Modifier l'onglet Abonnement pour compte_prive

**Files:**
- Modify: `app/settings/page.tsx` (section onglet subscription, lignes ~1010-1068)
- Modify: `components/subscription/ModalPaiementAbonnement.tsx`

**Step 1: Conditionner l'affichage dans l'onglet subscription**

Dans `app/settings/page.tsx`, remplacer le bouton "Souscrire un abonnement" (lignes ~1012-1041) par une version conditionnelle :

```tsx
{activeTab === 'subscription' && (
  <div className="space-y-6">
    {/* Compte privé: montant fixe direct */}
    {currentStructureData?.compte_prive ? (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => setShowModalAbonnement(true)}
          className="w-full p-6 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold mb-1">Renouveler l'abonnement</h3>
                <p className="text-sm text-emerald-50">
                  Montant fixe : {(currentStructureData?.mensualite ?? 0).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </motion.div>
    ) : (
      /* Compte standard: choix libre du nombre de jours */
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => setShowModalAbonnement(true)}
          className="w-full p-6 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold mb-1">Souscrire un abonnement</h3>
                <p className="text-sm text-emerald-50">
                  Choisissez entre MENSUEL et ANNUEL
                </p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </motion.div>
    )}

    {/* Reste identique: CurrentSubscriptionStatus + SubscriptionHistory */}
```

**Step 2: Passer les props compte_prive et mensualite au ModalPaiementAbonnement**

```tsx
<ModalPaiementAbonnement
  isOpen={showModalAbonnement}
  onClose={() => setShowModalAbonnement(false)}
  idStructure={user.id_structure}
  nomStructure={structure.nom_structure}
  telStructure={structure.mobile_om || structure.mobile_wave || ''}
  onSuccess={handleSubscriptionSuccess}
  onError={handleSubscriptionError}
  comptePrive={currentStructureData?.compte_prive ?? false}
  mensualite={currentStructureData?.mensualite ?? 0}
/>
```

**Step 3: Modifier ModalPaiementAbonnement pour gérer compte_prive**

Dans `components/subscription/ModalPaiementAbonnement.tsx`, ajouter les props :

```typescript
interface ModalPaiementAbonnementProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number;
  nomStructure: string;
  telStructure: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  comptePrive?: boolean;   // Si true, montant fixe
  mensualite?: number;     // Montant fixe pour compte privé
}
```

Quand `comptePrive === true` :
- Le state initial doit être `'SELECT_METHOD'` au lieu de `'SELECT_DAYS'` (skip la sélection de jours)
- Le montant utilisé est `mensualite` au lieu de `nombreJours * PRIX_JOUR`
- L'affichage résume "Abonnement mensuel : {mensualite} FCFA"

Ajouter dans le composant :
```typescript
const montantTotal = comptePrive ? (mensualite ?? 0) : nombreJours * PRIX_JOUR;

// Au useEffect d'ouverture du modal :
useEffect(() => {
  if (isOpen) {
    setModalState(comptePrive ? 'SELECT_METHOD' : 'SELECT_DAYS');
    // ... reset autres états
  }
}, [isOpen, comptePrive]);
```

Remplacer toutes les occurrences de `nombreJours * PRIX_JOUR` par `montantTotal`.

**Step 4: Commit**

```
git add app/settings/page.tsx components/subscription/ModalPaiementAbonnement.tsx
git commit -m "feat: onglet Abonnement avec compte_prive + montant fixe mensualite"
```

---

## Task 7 : Vérification et build

**Step 1: Lancer le build**

```bash
npm run build
```

Expected: Build réussi sans erreurs TypeScript.

**Step 2: Tester manuellement**

1. Se connecter avec le compte commerce (CHEZ KELEFA NT, structure 1675)
2. Vérifier que les sales rules sont bien chargées depuis DB
3. Aller dans Settings > Règles Ventes > modifier un toggle > vérifier sync DB
4. Vérifier Settings > Utilisateurs > MAX_CAISSIERS = 2 (valeur DB)
5. Vérifier Settings > Abonnement > affichage compte privé avec montant 39700

**Step 3: Commit final**

```
git add -A
git commit -m "feat: paramètres structure DB-first complet avec sync localStorage"
```
