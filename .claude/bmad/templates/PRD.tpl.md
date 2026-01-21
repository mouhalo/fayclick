# PRD : {NOM_FONCTIONNALITÉ}

> **Product Requirements Document** | Projet: {NOM_PROJET}

---

## 📋 Informations Générales

| Champ | Valeur |
|-------|--------|
| **Projet** | {NOM_PROJET} |
| **Fonctionnalité** | {NOM_FONCTIONNALITÉ} |
| **Version PRD** | 1.0 |
| **Date création** | {DATE} |
| **Auteur** | SUPER_BMAD_AGENT |
| **Statut** | 🟡 Draft / 🔵 Review / 🟢 Approved |
| **Priorité** | 🔴 Must Have / 🟠 Should Have / 🟢 Could Have |

---

## 🎯 Objectif

### Résumé Exécutif
{Description claire et concise de l'objectif de cette fonctionnalité en 2-3 phrases}

### Objectifs Mesurables
1. {Objectif SMART 1}
2. {Objectif SMART 2}
3. {Objectif SMART 3}

---

## 📖 Contexte

### Problème
{Quel problème cette fonctionnalité résout-elle ? Pourquoi est-ce important ?}

### Situation Actuelle
{Comment les utilisateurs gèrent-ils ce besoin actuellement ?}

### Impact Attendu
| Type d'impact | Description | Mesure |
|---------------|-------------|--------|
| Business | {Impact} | {KPI} |
| Utilisateur | {Impact} | {KPI} |
| Technique | {Impact} | {KPI} |

---

## 👥 Utilisateurs Concernés

| Persona | Bénéfice Principal | Fréquence d'utilisation | Priorité |
|---------|-------------------|------------------------|----------|
| {Persona 1} | {Bénéfice} | {Quotidien/Hebdo/etc.} | 🔴 Haute |
| {Persona 2} | {Bénéfice} | {Fréquence} | 🟠 Moyenne |

### Parcours Utilisateur (User Journey)
```
1. {Étape 1 - Point d'entrée}
   ↓
2. {Étape 2}
   ↓
3. {Étape 3}
   ↓
4. {Étape 4 - Résultat attendu}
```

---

## 📝 Exigences Fonctionnelles

### Epic 1 : {Nom de l'Epic}

#### User Story 1.1 : {Titre}
| Champ | Valeur |
|-------|--------|
| **ID** | US-{XXX}-001 |
| **Priorité** | Must Have |
| **Points** | {estimation} |

**En tant que** {persona}
**Je veux** {action/fonctionnalité}
**Afin de** {bénéfice/valeur}

**Critères d'Acceptance :**
- [ ] **CA1** : {Critère vérifiable 1}
- [ ] **CA2** : {Critère vérifiable 2}
- [ ] **CA3** : {Critère vérifiable 3}

**Règles Métier :**
- {Règle 1}
- {Règle 2}

**Notes Techniques :**
- {Note pour le développeur}

**Maquette/Wireframe :** {Lien ou description}

---

#### User Story 1.2 : {Titre}
| Champ | Valeur |
|-------|--------|
| **ID** | US-{XXX}-002 |
| **Priorité** | Should Have |
| **Points** | {estimation} |

**En tant que** {persona}
**Je veux** {action}
**Afin de** {bénéfice}

**Critères d'Acceptance :**
- [ ] **CA1** : {Critère}
- [ ] **CA2** : {Critère}

---

### Epic 2 : {Nom de l'Epic}

#### User Story 2.1 : {Titre}
{Même format...}

---

## 🔧 Exigences Non-Fonctionnelles

### Performance
| Critère | Exigence | Priorité |
|---------|----------|----------|
| Temps de réponse | < {X} secondes | 🔴 |
| Temps de chargement | < {X} secondes | 🔴 |
| Taille bundle | < {X} KB | 🟠 |

### Sécurité
- [ ] Authentification requise : {Oui/Non}
- [ ] Niveau de permission : {Permission requise}
- [ ] Données sensibles : {Description}
- [ ] Chiffrement : {Requis/Non requis}

### Accessibilité
- [ ] Support utilisateurs peu alphabétisés
- [ ] Icônes explicites
- [ ] Feedback visuel clair
- [ ] {Autres critères}

### Compatibilité
| Environnement | Support | Notes |
|---------------|---------|-------|
| Mobile (PWA) | ✅ Requis | Android prioritaire |
| Desktop | ✅ Requis | |
| Offline | {✅/❌} | {Notes} |
| Navigateurs | Chrome, Safari, Firefox | |

### Internationalisation
- Langue principale : Français
- Langues futures : {Wolof, etc.}

---

## 🔗 Dépendances

### Dépendances Internes
| Fonctionnalité/Module | Type | Statut |
|-----------------------|------|--------|
| {Fonctionnalité 1} | Requise avant | ✅ Disponible |
| {Fonctionnalité 2} | Requise avant | 🔄 En cours |

### Dépendances Externes
| Service/API | Usage | Documentation |
|-------------|-------|---------------|
| {API 1} | {Usage} | {Lien} |
| {API 2} | {Usage} | {Lien} |

### Dépendances Base de Données
```sql
-- Tables requises
{Liste des tables}

-- Fonctions PostgreSQL requises
{Liste des fonctions}
```

---

## ⚠️ Risques et Mitigations

| ID | Risque | Probabilité | Impact | Mitigation | Owner |
|----|--------|-------------|--------|------------|-------|
| R1 | {Description} | 🟠 Moyenne | 🔴 Élevé | {Action} | {Qui} |
| R2 | {Description} | 🟢 Faible | 🟠 Moyen | {Action} | {Qui} |

---

## 📅 Planning Estimé

| Phase | Durée | Date début | Date fin | Responsable |
|-------|-------|------------|----------|-------------|
| Design/UX | {X} jours | {Date} | {Date} | UX Designer |
| Développement | {X} jours | {Date} | {Date} | Developer |
| Tests | {X} jours | {Date} | {Date} | QA |
| Déploiement | {X} jours | {Date} | {Date} | DevOps |
| **Total** | **{X} jours** | | | |

---

## ✅ Critères de Validation Globaux (Definition of Done)

### Fonctionnel
- [ ] Toutes les user stories implémentées
- [ ] Tous les critères d'acceptance validés
- [ ] Tests fonctionnels passants

### Technique
- [ ] Code review effectuée
- [ ] Tests unitaires (couverture > {X}%)
- [ ] Tests d'intégration passants
- [ ] Pas de régression

### Documentation
- [ ] Documentation technique mise à jour
- [ ] CHANGELOG mis à jour
- [ ] Guide utilisateur (si applicable)

### Déploiement
- [ ] Déployé en staging
- [ ] Testé en staging
- [ ] Déployé en production
- [ ] Monitoring en place

---

## 📎 Annexes

### A. Maquettes/Wireframes
{Liens ou images}

### B. Diagrammes
{Liens ou images}

### C. Références
- {Lien 1}
- {Lien 2}

---

## 🔄 Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| {DATE} | 1.0 | SUPER_BMAD_AGENT | Création initiale |
