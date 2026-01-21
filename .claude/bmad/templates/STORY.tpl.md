# Story : {ID} - {Titre}

> **User Story BMAD** | Sprint: {SPRINT_ID}

---

## 📋 Métadonnées

| Champ | Valeur |
|-------|--------|
| **ID** | STORY-{XXX} |
| **Sprint** | {SPRINT_YYYY_MM} |
| **Epic** | {EPIC_NAME} |
| **PRD Source** | `docs/bmad/prd/PRD_{FEATURE}.md` |
| **Priorité** | 🔴 Must Have / 🟠 Should Have / 🟢 Could Have |
| **Points** | {estimation} |
| **Assigné** | Developer Agent |
| **Statut** | 📝 Todo / 🔄 In Progress / 👀 Review / ✅ Done |

---

## 📖 User Story

**En tant que** {persona}
**Je veux** {action/fonctionnalité}
**Afin de** {bénéfice/valeur}

---

## 🎯 Objectif Technique

{Description technique claire et détaillée de ce qui doit être implémenté. 
Cette section doit permettre au Developer Agent de comprendre exactement ce qu'il doit faire.}

---

## 📐 Architecture

### Fichiers à Créer/Modifier

```
src/
├── {chemin/fichier1.tsx}     # [CRÉER] - {Description}
├── {chemin/fichier2.ts}      # [MODIFIER] - {Description}
├── {chemin/fichier3.tsx}     # [CRÉER] - {Description}
└── services/
    └── {service.ts}          # [MODIFIER] - {Description}
```

### Schéma Base de Données (si applicable)

```sql
-- Nouvelles tables
CREATE TABLE {nom_table} (
    id SERIAL PRIMARY KEY,
    {colonne1} {TYPE} NOT NULL,
    {colonne2} {TYPE},
    created_at TIMESTAMP DEFAULT NOW()
);

-- Modifications de tables existantes
ALTER TABLE {table_existante}
ADD COLUMN {nouvelle_colonne} {TYPE};

-- Index requis
CREATE INDEX idx_{nom} ON {table}({colonne});
```

### Fonctions PostgreSQL (si applicable)

```sql
-- Nouvelle fonction
CREATE OR REPLACE FUNCTION {nom_fonction}(
    p{param1} {TYPE},
    p{param2} {TYPE}
)
RETURNS {TYPE_RETOUR} AS $$
BEGIN
    -- Implémentation
END;
$$ LANGUAGE plpgsql;
```

### API Endpoints (si applicable)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| {GET/POST/PUT/DELETE} | `/api/{endpoint}` | {Description} | {Oui/Non} | {Description} |

---

## 🔧 Détails d'Implémentation

### Étape 1 : {Nom de l'étape}

**Objectif :** {Ce que cette étape accomplit}

**Instructions :**
```typescript
// Code exemple ou pseudo-code
{instructions détaillées}
```

**Fichiers concernés :**
- `{fichier1}`
- `{fichier2}`

---

### Étape 2 : {Nom de l'étape}

**Objectif :** {Ce que cette étape accomplit}

**Instructions :**
```typescript
// Code exemple ou pseudo-code
{instructions détaillées}
```

---

### Étape 3 : {Nom de l'étape}

**Objectif :** {Ce que cette étape accomplit}

**Instructions :**
{instructions détaillées}

---

## ✅ Critères d'Acceptance

| ID | Critère | Vérifié |
|----|---------|---------|
| CA1 | {Description du critère vérifiable} | ⬜ |
| CA2 | {Description du critère vérifiable} | ⬜ |
| CA3 | {Description du critère vérifiable} | ⬜ |
| CA4 | {Description du critère vérifiable} | ⬜ |

---

## 🧪 Tests Requis

### Tests Unitaires

| ID | Test | Fichier | Statut |
|----|------|---------|--------|
| TU1 | {Description du test} | `{fichier.test.ts}` | ⬜ |
| TU2 | {Description du test} | `{fichier.test.ts}` | ⬜ |

### Tests d'Intégration

| ID | Test | Statut |
|----|------|--------|
| TI1 | {Description du test} | ⬜ |
| TI2 | {Description du test} | ⬜ |

### Tests Manuels (QA)

| ID | Scénario | Résultat attendu | Statut |
|----|----------|------------------|--------|
| TM1 | {Scénario} | {Résultat} | ⬜ |
| TM2 | {Scénario} | {Résultat} | ⬜ |

---

## 🔗 Dépendances

### Stories Pré-requises
- [ ] STORY-{XXX} : {Titre} - Doit être terminée avant

### APIs/Services Requis
- [ ] {API/Service 1} - {Statut}
- [ ] {API/Service 2} - {Statut}

### Composants UI Requis
- [ ] {Composant 1} - {Disponible/À créer}
- [ ] {Composant 2} - {Disponible/À créer}

---

## 📝 Notes Techniques

### Patterns à Suivre
- {Pattern 1 du projet - ex: utiliser Zustand pour state}
- {Pattern 2 - ex: services singleton}
- {Pattern 3 - ex: stopPropagation sur boutons imbriqués}

### Points d'Attention
⚠️ {Point d'attention 1}
⚠️ {Point d'attention 2}

### Références Code Existant
- `{fichier1}` : Exemple de {pattern similaire}
- `{fichier2}` : Implémentation de {fonctionnalité similaire}

---

## 📝 Notes QA

### Environnement de Test
- URL : {URL staging}
- Credentials : {si applicable}

### Données de Test
```json
{
  "exemple_data": "pour tester"
}
```

### Scénarios de Test Prioritaires
1. {Scénario happy path}
2. {Scénario edge case 1}
3. {Scénario erreur}

---

## 🚀 Definition of Done

### Code
- [ ] Code implémenté selon les spécifications
- [ ] Pas de console.log ou code de debug
- [ ] Typage TypeScript complet
- [ ] Commentaires si logique complexe

### Qualité
- [ ] Tests unitaires écrits et passants
- [ ] Code review effectuée et approuvée
- [ ] Pas de régression sur fonctionnalités existantes

### Documentation
- [ ] CHANGELOG mis à jour
- [ ] CLAUDE.md mis à jour (si nouveau pattern)
- [ ] JSDoc sur fonctions publiques

### Déploiement
- [ ] Déployé en staging
- [ ] Validé par QA en staging
- [ ] Prêt pour déploiement production

---

## 💬 Commentaires et Discussions

### Questions ouvertes
- [ ] {Question 1}
- [ ] {Question 2}

### Décisions prises
| Date | Décision | Par |
|------|----------|-----|
| {Date} | {Décision} | {Qui} |

---

## 🔄 Historique

| Date | Action | Par | Notes |
|------|--------|-----|-------|
| {DATE} | Création | SUPER_BMAD_AGENT | Story initiale |
| | | | |
