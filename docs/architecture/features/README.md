# Architecture par Fonctionnalité

Ce dossier contient les documents d'architecture détaillés pour chaque fonctionnalité du projet.

## Structure des fichiers

```
features/
├── ARCH_{FEATURE1}.md       # Architecture fonctionnalité 1
├── ARCH_{FEATURE2}.md       # Architecture fonctionnalité 2
└── ...
```

## Convention de nommage

- Format : `ARCH_{NOM_FEATURE}.md`
- Exemples :
  - `ARCH_WALLET_KALPE.md` : Architecture du système de coffre-fort
  - `ARCH_VENTE_FLASH.md` : Architecture des ventes rapides
  - `ARCH_SOCIAL_COMMERCE.md` : Architecture du commerce social

## Template

Utiliser le template : `.claude/bmad/templates/ARCHITECTURE.tpl.md`

## Contenu typique

- Diagrammes d'architecture
- Schéma de base de données
- API endpoints
- Fonctions PostgreSQL
- Flux de données
- Considérations de sécurité
- Métriques de performance

## Workflow

1. PRD approuvé (voir `docs/bmad/prd/`)
2. Copier le template ARCHITECTURE.tpl.md
3. Renommer en `ARCH_{FEATURE}.md`
4. Remplir les spécifications techniques
5. Faire valider par le System Architect Agent
6. Passer à la phase Stories

---
*BMAD Method - FayClick V2*
