# Architecture : {NOM_FONCTIONNALITÉ}

> **Document Architecture BMAD** | Projet: {NOM_PROJET}

---

## 📋 Informations

| Champ | Valeur |
|-------|--------|
| **Projet** | {NOM_PROJET} |
| **Fonctionnalité** | {NOM_FONCTIONNALITÉ} |
| **PRD Source** | `docs/bmad/prd/PRD_{FEATURE}.md` |
| **Version** | 1.0 |
| **Date** | {DATE} |
| **Auteur** | System Architect Agent |
| **Statut** | 🟡 Draft / 🔵 Review / 🟢 Approved |

---

## 🎯 Vue d'Ensemble

### Objectif Architectural
{Description de haut niveau de ce que cette architecture accomplit}

### Principes Directeurs
1. {Principe 1 - ex: Mobile First}
2. {Principe 2 - ex: Offline Support}
3. {Principe 3 - ex: Performance}

---

## 🏗️ Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Pages     │  │ Components  │  │   Hooks     │             │
│  │  (App Dir)  │  │    (UI)     │  │  (Logic)    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────┐             │
│  │              Services Layer                    │             │
│  │  database.service.ts → Requêtes PostgreSQL    │             │
│  │  auth.service.ts, payment.service.ts, etc.    │             │
│  └───────────────────────┬───────────────────────┘             │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────┐             │
│  │              State Management                  │             │
│  │  (Zustand Stores + React Context)             │             │
│  └───────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS/REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND API                               │
│                   (api.icelabsoft.com)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Auth     │  │   Payment   │  │     SMS     │             │
│  │   (JWT)     │  │ (OM/Wave)   │  │  Gateway    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │  /api/psql_request/api/psql_request  ← Requêtes SQL        │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ SQL (via API)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL                                  │
│                                                                 │
│  ⚠️ ACCÈS DIRECT RÉSERVÉ À L'AGENT dba_master                  │
│     (via MCP postgres-server pour analyse schéma/tables)       │
└─────────────────────────────────────────────────────────────────┘
```

### Accès Base de Données

| Contexte | Méthode | Service/Outil |
|----------|---------|---------------|
| **Application FayClick** | API REST | `database.service.ts` → `/api/psql_request/api/psql_request` |
| **Analyse structure BD** | MCP direct | Agent `dba_master` → MCP `postgres-server` |

> **Note importante** : L'application n'accède JAMAIS directement à PostgreSQL.
> Toutes les requêtes passent par l'API. Seul l'agent `dba_master` a accès
> direct pour analyser la structure (tables, vues, index, fonctions).

---

## 📁 Structure des Fichiers

### Nouveaux Fichiers à Créer

```
{projet}/
├── app/
│   └── {route}/
│       ├── page.tsx              # Page principale
│       └── {sous-route}/
│           └── page.tsx          # Sous-page
│
├── components/
│   └── {feature}/
│       ├── {Component1}.tsx      # Composant principal
│       ├── {Component2}.tsx      # Composant secondaire
│       └── index.ts              # Export centralisé
│
├── hooks/
│   └── use{Feature}.ts           # Hook custom
│
├── services/
│   └── {feature}.service.ts      # Service API
│
├── stores/
│   └── {feature}Store.ts         # Zustand store
│
├── types/
│   └── {feature}.types.ts        # Interfaces TypeScript
│
└── docs/
    └── architecture/
        └── features/
            └── ARCH_{FEATURE}.md # Ce document
```

### Fichiers Existants à Modifier

| Fichier | Modification | Impact |
|---------|-------------|--------|
| `{fichier1}` | {Description} | {Faible/Moyen/Élevé} |
| `{fichier2}` | {Description} | {Impact} |

---

## 🗄️ Schéma Base de Données

> **💡 Pour explorer la structure existante de la BD**, utiliser l'agent `dba_master` :
> - `mcp__postgres-server__list_schemas` : Liste des schémas
> - `mcp__postgres-server__list_objects` : Tables, vues, séquences d'un schéma
> - `mcp__postgres-server__get_object_details` : Détails d'une table (colonnes, index, FK)
> - `mcp__postgres-server__execute_sql` : Requêtes SQL directes (lecture)

### Nouvelles Tables

```sql
-- ═══════════════════════════════════════════════════════════════
-- TABLE: {nom_table}
-- Description: {Description de la table}
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE {nom_table} (
    id                  SERIAL PRIMARY KEY,
    id_structure        INTEGER NOT NULL REFERENCES structures(id_structure),
    {colonne1}          VARCHAR(255) NOT NULL,
    {colonne2}          NUMERIC(15,2) DEFAULT 0,
    {colonne3}          BOOLEAN DEFAULT false,
    {colonne_fk}        INTEGER REFERENCES {autre_table}(id),
    statut              VARCHAR(50) DEFAULT 'ACTIF',
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT chk_{nom}_statut CHECK (statut IN ('ACTIF', 'INACTIF', 'SUPPRIME'))
);

-- Index pour performances
CREATE INDEX idx_{nom_table}_structure ON {nom_table}(id_structure);
CREATE INDEX idx_{nom_table}_{colonne} ON {nom_table}({colonne});

-- Trigger updated_at
CREATE TRIGGER trg_{nom_table}_updated
    BEFORE UPDATE ON {nom_table}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Modifications Tables Existantes

```sql
-- Ajout de colonnes
ALTER TABLE {table_existante}
ADD COLUMN {nouvelle_colonne} {TYPE} {CONSTRAINTS};

-- Modification de colonnes
ALTER TABLE {table_existante}
ALTER COLUMN {colonne} TYPE {NOUVEAU_TYPE};
```

### Relations (ERD)

```
┌──────────────────┐       ┌──────────────────┐
│    structures    │       │   {new_table}    │
├──────────────────┤       ├──────────────────┤
│ id_structure PK  │───┐   │ id PK            │
│ nom_structure    │   │   │ id_structure FK  │──┐
│ ...              │   └──▶│ {colonne1}       │  │
└──────────────────┘       │ {colonne2}       │  │
                           └──────────────────┘  │
                                                 │
┌──────────────────┐                             │
│  {autre_table}   │◀────────────────────────────┘
├──────────────────┤
│ id PK            │
│ ...              │
└──────────────────┘
```

---

## 🔌 API Endpoints

### Nouveaux Endpoints

| Méthode | Endpoint | Description | Auth | Rate Limit |
|---------|----------|-------------|------|------------|
| GET | `/api/{feature}` | Liste des {items} | ✅ JWT | 100/min |
| GET | `/api/{feature}/:id` | Détail d'un {item} | ✅ JWT | 100/min |
| POST | `/api/{feature}` | Créer un {item} | ✅ JWT | 50/min |
| PUT | `/api/{feature}/:id` | Modifier un {item} | ✅ JWT | 50/min |
| DELETE | `/api/{feature}/:id` | Supprimer un {item} | ✅ JWT | 20/min |

### Spécifications Détaillées

#### `GET /api/{feature}`

**Request:**
```typescript
// Query params
{
  id_structure: number;  // Requis
  page?: number;         // Défaut: 1
  limit?: number;        // Défaut: 20, Max: 100
  search?: string;       // Recherche textuelle
  status?: string;       // Filtre par statut
}
```

**Response Success (200):**
```typescript
{
  success: true;
  data: {
    items: Array<{
      id: number;
      // ... autres champs
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

**Response Error (4xx/5xx):**
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

## ⚙️ Fonctions PostgreSQL

### Accès via database.service.ts

L'application utilise `services/database.service.ts` pour toutes les requêtes PostgreSQL :

```typescript
import { databaseService } from '@/services/database.service';

// Appel de fonction PostgreSQL
const result = await databaseService.query(`
  SELECT * FROM ma_fonction($1, $2)
`, [param1, param2]);

// Le service appelle automatiquement l'API :
// POST https://api.icelabsoft.com/api/psql_request/api/psql_request
// Body: { sql: "SELECT...", params: [...] }
```

### Nouvelles Fonctions

```sql
-- ═══════════════════════════════════════════════════════════════
-- FONCTION: {nom_fonction}
-- Description: {Description}
-- Paramètres:
--   - p{param1}: {description}
--   - p{param2}: {description}
-- Retourne: {description du retour}
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION {nom_fonction}(
    p{param1}       {TYPE},
    p{param2}       {TYPE}
)
RETURNS {TYPE_RETOUR} AS $$
DECLARE
    v_result    {TYPE};
    v_temp      {TYPE};
BEGIN
    -- Validation des paramètres
    IF p{param1} IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Paramètre {param1} requis'
        );
    END IF;
    
    -- Logique principale
    {IMPLEMENTATION}
    
    -- Retour succès
    RETURN json_build_object(
        'success', true,
        'data', v_result,
        'message', 'Opération réussie'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', SQLERRM,
            'code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- Permissions
GRANT EXECUTE ON FUNCTION {nom_fonction}({TYPES}) TO {role};
```

---

## 🔄 Flux de Données

### Flux Principal

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │   Frontend  │     │   Backend   │
│  Action     │────▶│  Component  │────▶│    API      │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                    ┌──────▼──────┐     ┌──────▼──────┐
                    │   Service   │     │  PostgreSQL │
                    │   Layer     │────▶│  Function   │
                    └──────┬──────┘     └──────┬──────┘
                           │                   │
                    ┌──────▼──────┐     ┌──────▼──────┐
                    │   Zustand   │◀────│   Response  │
                    │   Store     │     │   JSON      │
                    └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   UI        │
                    │   Update    │
                    └─────────────┘
```

### Séquence Détaillée

```
User          Component       Service         API            DB
 │                │              │              │              │
 │──click()──────▶│              │              │              │
 │                │──handler()──▶│              │              │
 │                │              │──fetch()────▶│              │
 │                │              │              │──query()────▶│
 │                │              │              │◀──result─────│
 │                │◀──response───│◀─────────────│              │
 │                │              │              │              │
 │                │──setState()─▶│              │              │
 │◀──re-render────│              │              │              │
 │                │              │              │              │
```

---

## 🔒 Sécurité

### Authentification
- [ ] JWT Token requis
- [ ] Validation id_structure
- [ ] Vérification permissions

### Validation des Données
```typescript
// Exemple de validation avec Zod
const schema = z.object({
  {champ1}: z.string().min(1).max(255),
  {champ2}: z.number().positive(),
  {champ3}: z.enum(['OPTION1', 'OPTION2']),
});
```

### Protection CSRF
- [ ] Token CSRF pour mutations
- [ ] SameSite cookies

---

## 📊 Performance

### Optimisations Prévues

| Technique | Où | Impact attendu |
|-----------|----|--------------| 
| Index DB | `{table}.{colonne}` | -50% temps requête |
| Cache | Service layer | -80% appels API |
| Lazy loading | Components | -30% bundle initial |
| Pagination | Liste | Constant time |

### Métriques Cibles

| Métrique | Cible | Mesure |
|----------|-------|--------|
| TTFB | < 200ms | Lighthouse |
| LCP | < 2.5s | Lighthouse |
| Bundle size | < 100KB | webpack-bundle-analyzer |
| DB query | < 100ms | pg_stat_statements |

---

## 🧪 Stratégie de Test

### Tests Unitaires
- Services : 80% couverture
- Hooks : 90% couverture
- Utils : 100% couverture

### Tests d'Intégration
- API endpoints : tous les cas
- Flux complets : happy path + errors

### Tests E2E (si applicable)
- Parcours utilisateur critique

---

## 📝 Notes d'Implémentation

### Patterns à Suivre
1. {Pattern 1 du projet}
2. {Pattern 2}
3. {Pattern 3}

### Points d'Attention
⚠️ {Point 1}
⚠️ {Point 2}

### Références
- Code similaire : `{fichier}`
- Documentation : `{lien}`

---

## ✅ Checklist de Validation

### Avant Développement
- [ ] PRD approuvé
- [ ] Architecture review effectuée
- [ ] Dépendances identifiées

### Après Développement
- [ ] Tests passants
- [ ] Documentation à jour
- [ ] Performance validée

---

## 🔄 Historique

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| {DATE} | 1.0 | System Architect Agent | Création initiale |
