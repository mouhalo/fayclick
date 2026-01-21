# Prompts par Fonctionnalité

Ce dossier contient les prompts de contexte spécifiques à chaque fonctionnalité.

## Structure

```
features/
├── PROMPT_WALLET.md         # Contexte système wallet/KALPE
├── PROMPT_FACTURATION.md    # Contexte facturation
├── PROMPT_INVENTAIRE.md     # Contexte inventaire
├── PROMPT_CLIENTS.md        # Contexte gestion clients
└── PROMPT_{FEATURE}.md      # Contexte par fonctionnalité
```

## Usage

Utiliser ces prompts quand on travaille sur une fonctionnalité spécifique pour avoir :
- Le contexte métier de la fonctionnalité
- Les fichiers concernés
- Les services et hooks associés
- Les fonctions PostgreSQL utilisées
- Les patterns spécifiques

## Contenu type

```markdown
# Prompt : {Fonctionnalité}

## Contexte Métier
{Description du besoin}

## Fichiers Clés
- `{fichier1}` : {description}
- `{fichier2}` : {description}

## Services
- `{service}.service.ts` : {endpoints}

## PostgreSQL Functions
- `{function}` : {usage}

## Patterns Spécifiques
{Conventions particulières}
```

## Génération

Commande BMAD : `/bmad-context --feature={nom}`

---
*BMAD Method - FayClick V2*
