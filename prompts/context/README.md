# Prompts de Contexte

Ce dossier contient les prompts de contexte pour les sessions de développement avec Claude.

## Structure

```
context/
├── FULL_CONTEXT_PROMPT.md   # Prompt complet du projet
├── QUICK_CONTEXT.md         # Contexte rapide pour sessions courtes
└── TECH_CONTEXT.md          # Contexte technique uniquement
```

## Usage

### FULL_CONTEXT_PROMPT.md
Prompt complet à utiliser en début de session longue. Contient :
- Contexte business
- Stack technique complète
- Patterns et conventions
- État actuel du projet
- Backlog et roadmap

### QUICK_CONTEXT.md
Version condensée pour interventions rapides :
- Stack technique
- Commandes essentielles
- Patterns critiques

### TECH_CONTEXT.md
Focus technique pour debugging ou refactoring :
- Architecture détaillée
- Services et hooks
- PostgreSQL functions

## Génération

Commande BMAD : `/bmad-context`

---
*BMAD Method - FayClick V2*
