# PRD : Interface Vocale FayClick

> **Product Requirements Document** | Projet: FayClick V2
> **Version**: 1.0 | **Date**: 2026-01-21 | **Statut**: 🟢 Approved

---

## 1. Informations Générales

| Champ | Valeur |
|-------|--------|
| **Projet** | FayClick V2 |
| **Fonctionnalité** | Interface Vocale |
| **ID Backlog** | VOC-001 à VOC-004 |
| **Priorité** | 🔴 Must Have |
| **Effort estimé** | L-XL (2-3 mois) |
| **Auteur** | Product Manager (BMAD) |

---

## 2. Résumé Exécutif

### Vision
Permettre aux commerçants sénégalais, notamment ceux peu alphabétisés (~50% du marché cible), d'interagir avec FayClick par la voix en français, avec support Wolof prévu en Phase 2.

### Objectifs Mesurables
1. **Adoption** : 30% des utilisateurs actifs utilisent au moins 1 commande vocale/semaine dans les 3 mois post-lancement
2. **Accessibilité** : Réduire de 40% le temps de création de facture pour utilisateurs peu alphabétisés
3. **Satisfaction** : NPS > 40 sur la fonctionnalité vocale
4. **Précision** : Taux de reconnaissance > 85% pour commandes en français

---

## 3. Contexte

### Problème
Au Sénégal, une proportion significative des commerçants du secteur informel ont des difficultés avec l'écrit (alphabétisation partielle, français langue seconde). L'interface textuelle actuelle de FayClick crée une barrière à l'adoption pour ces utilisateurs potentiels.

### Situation Actuelle
- Les utilisateurs doivent taper toutes les commandes
- La recherche produit/client nécessite de saisir du texte
- Pas d'alternative pour utilisateurs peu à l'aise avec l'écrit
- Concurrents n'offrent pas de solution vocale en langues locales

### Impact Attendu

| Type | Impact | KPI |
|------|--------|-----|
| Business | Élargir le marché adressable de 30-40% | Nouvelles inscriptions |
| Utilisateur | Opérations 2x plus rapides pour certaines tâches | Temps moyen/facture |
| Technique | Différenciation technologique majeure | Fonctionnalité unique |

---

## 4. Utilisateurs Concernés

### Personas

| Persona | Bénéfice Principal | Fréquence | Priorité |
|---------|-------------------|-----------|----------|
| **Amadou** - Commerçant informel peu alphabétisé | Peut utiliser FayClick sans savoir lire/écrire | Quotidien | 🔴 Haute |
| **Fatou** - Gérante d'école | Accélère les opérations répétitives | Quotidien | 🟠 Moyenne |
| **Moussa** - Commerçant occupé | Mains libres pendant qu'il sert des clients | Quotidien | 🟠 Moyenne |

### Parcours Utilisateur Principal

```
1. Amadou ouvre FayClick sur son téléphone
   ↓
2. Il appuie sur le bouton microphone (icône visible)
   ↓
3. Animation et son indiquent que FayClick écoute
   ↓
4. Amadou dit : "Ajoute 5 sacs de riz"
   ↓
5. FayClick confirme vocalement : "5 sacs de riz ajoutés au panier"
   ↓
6. Le panier affiche les articles ajoutés
```

---

## 5. Exigences Fonctionnelles

### EPIC-VOC-01 : Infrastructure Vocale

#### FR-001 : Bouton Microphone Global

**Priorité:** 🔴 Must Have

**Description:**
Un bouton microphone flottant doit être accessible sur toutes les pages de l'application (sauf pages publiques), permettant d'activer la capture vocale en un tap.

**Critères d'Acceptance:**
- [ ] Bouton visible sur toutes les pages dashboard
- [ ] Position fixe en bas à droite (au-dessus de la navigation)
- [ ] Animation pulsante quand actif
- [ ] Accessible avec le pouce (zone touch > 48x48px)
- [ ] Masqué si micro non disponible (permission refusée)

**Dépendances:** Aucune

---

#### FR-002 : Capture Audio

**Priorité:** 🔴 Must Have

**Description:**
Le système doit capturer l'audio du microphone de l'appareil avec une qualité suffisante pour la reconnaissance vocale.

**Critères d'Acceptance:**
- [ ] Demande de permission micro au premier usage
- [ ] Capture audio en continu pendant l'activation
- [ ] Détection automatique de fin de parole (silence > 1.5s)
- [ ] Indicateur visuel de niveau audio (feedback)
- [ ] Bouton pour arrêter manuellement la capture
- [ ] Timeout après 10 secondes sans parole

**Dépendances:** FR-001

---

#### FR-003 : Feedback Utilisateur

**Priorité:** 🔴 Must Have

**Description:**
Le système doit fournir un feedback visuel et sonore clair à chaque étape de l'interaction vocale.

**Critères d'Acceptance:**
- [ ] Son "bip" à l'activation du micro
- [ ] Animation visuelle pendant l'écoute
- [ ] Affichage du texte reconnu en temps réel
- [ ] Confirmation vocale après exécution réussie
- [ ] Message d'erreur clair si commande non comprise
- [ ] Vibration légère à l'activation (si supporté)

**Dépendances:** FR-002

---

### EPIC-VOC-02 : Reconnaissance & Interprétation

#### FR-004 : Speech-to-Text (STT)

**Priorité:** 🔴 Must Have

**Description:**
Convertir l'audio capturé en texte via une API de reconnaissance vocale, avec support du français.

**Critères d'Acceptance:**
- [ ] Intégration API STT (Web Speech API ou alternative)
- [ ] Précision > 85% pour phrases courtes en français
- [ ] Temps de réponse < 2 secondes
- [ ] Gestion des accents africains francophones
- [ ] Fallback si API indisponible (message d'erreur)

**Dépendances:** FR-002

---

#### FR-005 : Natural Language Understanding (NLU)

**Priorité:** 🔴 Must Have

**Description:**
Interpréter le texte reconnu pour identifier l'intention de l'utilisateur et extraire les entités (produit, quantité, client, page).

**Critères d'Acceptance:**
- [ ] Identification des intentions : RECHERCHE, AJOUT_PANIER, NAVIGATION, CREATION
- [ ] Extraction entités : nom_produit, quantite, nom_client, nom_page
- [ ] Tolérance aux variations ("ajoute", "mets", "rajoute" = même intention)
- [ ] Score de confiance pour chaque interprétation
- [ ] Demande de clarification si confiance < 70%

**Dépendances:** FR-004

---

#### FR-006 : Mapping Commandes-Actions

**Priorité:** 🔴 Must Have

**Description:**
Associer chaque intention reconnue à une action concrète dans l'application.

**Critères d'Acceptance:**
- [ ] Table de mapping intention → action
- [ ] Exécution automatique si confiance > 85%
- [ ] Confirmation demandée si confiance entre 70-85%
- [ ] Rejet avec message si confiance < 70%
- [ ] Logging de toutes les commandes pour amélioration

**Dépendances:** FR-005

---

### EPIC-VOC-03 : Commandes Navigation

#### FR-007 : Navigation par la Voix

**Priorité:** 🔴 Must Have

**Description:**
Permettre à l'utilisateur de naviguer entre les pages de l'application par commande vocale.

**Critères d'Acceptance:**
- [ ] Commandes supportées :
  - "Va aux factures" / "Ouvre les factures"
  - "Va aux produits" / "Montre les produits"
  - "Ouvre le panier"
  - "Va aux clients"
  - "Retour" / "Page précédente"
  - "Accueil" / "Dashboard"
- [ ] Navigation instantanée après reconnaissance
- [ ] Feedback vocal : "Page factures"
- [ ] Gestion des synonymes (factures = ventes = tickets)

**Dépendances:** FR-006

---

### EPIC-VOC-04 : Commandes Recherche

#### FR-008 : Recherche Produit Vocale

**Priorité:** 🔴 Must Have

**Description:**
Permettre de rechercher un produit par la voix.

**Critères d'Acceptance:**
- [ ] Commandes : "Cherche [produit]", "Trouve [produit]", "Où est [produit]"
- [ ] Recherche fuzzy (tolérance fautes)
- [ ] Affichage résultats avec highlight du terme
- [ ] Si résultat unique, navigation directe vers fiche
- [ ] Si multiples résultats, affichage liste filtrée
- [ ] Feedback vocal : "3 produits trouvés pour riz"

**Dépendances:** FR-006

---

#### FR-009 : Recherche Client Vocale

**Priorité:** 🔴 Must Have

**Description:**
Permettre de rechercher un client par nom ou téléphone via la voix.

**Critères d'Acceptance:**
- [ ] Commandes : "Cherche client [nom]", "Trouve [nom]", "Client [téléphone]"
- [ ] Recherche par nom (partiel accepté)
- [ ] Recherche par numéro téléphone
- [ ] Affichage fiche client si unique
- [ ] Liste si multiples correspondances
- [ ] Feedback vocal : "Client Mamadou Diallo trouvé"

**Dépendances:** FR-006

---

### EPIC-VOC-05 : Commandes Actions

#### FR-010 : Ajout au Panier Vocal

**Priorité:** 🔴 Must Have

**Description:**
Permettre d'ajouter des produits au panier par commande vocale.

**Critères d'Acceptance:**
- [ ] Commandes :
  - "Ajoute [quantité] [produit]"
  - "Mets [quantité] [produit] dans le panier"
  - "[quantité] [produit]" (forme courte)
- [ ] Quantité par défaut = 1 si non précisée
- [ ] Recherche produit automatique
- [ ] Confirmation si plusieurs produits correspondent
- [ ] Vérification stock disponible
- [ ] Feedback vocal : "5 sacs de riz ajoutés, total panier 25 000 francs"
- [ ] Annulation possible : "Annule" dans les 5 secondes

**Dépendances:** FR-006, FR-008

---

#### FR-011 : Création Produit Vocale

**Priorité:** 🟠 Should Have

**Description:**
Permettre de créer un nouveau produit par dictée vocale.

**Critères d'Acceptance:**
- [ ] Commandes : "Crée produit [nom] à [prix] francs"
- [ ] Extraction : nom_produit, prix_vente
- [ ] Prix achat optionnel : "coût [montant]"
- [ ] Catégorie optionnelle : "catégorie [nom]"
- [ ] Confirmation avant création : "Créer Sac de riz 50kg à 15000 FCFA ?"
- [ ] Feedback vocal : "Produit créé avec succès"

**Dépendances:** FR-006

---

#### FR-012 : Création Facture Rapide Vocale

**Priorité:** 🟠 Should Have

**Description:**
Permettre de créer une facture complète par commandes vocales enchaînées.

**Critères d'Acceptance:**
- [ ] Workflow vocal :
  1. "Nouvelle facture pour [client]"
  2. "Ajoute [quantité] [produit]" (répétable)
  3. "Valide la facture"
- [ ] Mode conversation maintenu jusqu'à "valide" ou "annule"
- [ ] Résumé vocal avant validation
- [ ] Impression/partage proposé après création

**Dépendances:** FR-010, FR-009

---

### EPIC-VOC-06 : Support Wolof (Phase 2)

#### FR-013 : Reconnaissance Wolof

**Priorité:** 🟡 Could Have (Phase 2)

**Description:**
Étendre la reconnaissance vocale au Wolof, langue la plus parlée au Sénégal.

**Critères d'Acceptance:**
- [ ] Modèle STT Wolof intégré
- [ ] Précision > 80% pour commandes courantes
- [ ] Mélange Wolof-Français supporté (code-switching)
- [ ] Vocabulaire commerce : nombres, produits courants

**Dépendances:** FR-004, Modèle Wolof externe

---

#### FR-014 : Switch de Langue

**Priorité:** 🟡 Could Have (Phase 2)

**Description:**
Permettre à l'utilisateur de choisir sa langue de commande vocale.

**Critères d'Acceptance:**
- [ ] Paramètre "Langue vocale" : Français / Wolof / Auto
- [ ] Mode Auto détecte la langue automatiquement
- [ ] Commande vocale pour changer : "Parle Wolof", "Speak French"
- [ ] Feedback dans la langue choisie

**Dépendances:** FR-013

---

## 6. Exigences Non-Fonctionnelles

### NFR-001 : Performance

| Critère | Exigence | Priorité |
|---------|----------|----------|
| Temps de réponse STT | < 2 secondes | 🔴 |
| Temps affichage feedback | < 500ms | 🔴 |
| Taille module vocal | < 50KB (hors API) | 🟠 |

### NFR-002 : Précision

| Critère | Exigence | Priorité |
|---------|----------|----------|
| Reconnaissance français | > 85% | 🔴 |
| Reconnaissance Wolof (P2) | > 80% | 🟠 |
| Interprétation intention | > 90% quand texte correct | 🔴 |

### NFR-003 : Sécurité

- [ ] Aucune donnée audio stockée côté serveur
- [ ] Transmission audio chiffrée (HTTPS)
- [ ] Permission micro révocable
- [ ] Pas d'écoute en arrière-plan

### NFR-004 : Accessibilité

- [ ] Bouton micro > 48x48px (touch target)
- [ ] Feedback visuel ET sonore
- [ ] Contraste élevé pour indicateurs
- [ ] Fonctionnel avec une seule main

### NFR-005 : Compatibilité

| Environnement | Support | Notes |
|---------------|---------|-------|
| Chrome Android | ✅ Requis | Web Speech API native |
| Safari iOS | ✅ Requis | Limitations Web Speech |
| Firefox | 🟠 Best effort | Fallback si non supporté |
| Offline | ❌ Non requis | Nécessite connexion |

### NFR-006 : Internationalisation

- Langue Phase 1 : Français
- Langue Phase 2 : Wolof
- Architecture extensible pour autres langues

---

## 7. Dépendances

### Dépendances Internes

| Module | Type | Statut |
|--------|------|--------|
| Système de recherche produits | Requise | ✅ Disponible |
| Système de recherche clients | Requise | ✅ Disponible |
| Panier (panierStore) | Requise | ✅ Disponible |
| Navigation (Next.js router) | Requise | ✅ Disponible |
| Service création produit | Requise | ✅ Disponible |

### Dépendances Externes

| Service | Usage | Documentation |
|---------|-------|---------------|
| Web Speech API | STT navigateur | [MDN Web Speech](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) |
| Google Cloud Speech (backup) | STT si Web Speech indisponible | [Google Cloud](https://cloud.google.com/speech-to-text) |
| API NLU (optionnel) | Interprétation avancée | À définir |

### Dépendances Base de Données

```sql
-- Aucune nouvelle table requise pour Phase 1
-- Les commandes utilisent les services existants :
-- - get_mes_produits()
-- - get_list_clients()
-- - add_edit_produit()
-- - Panier côté client (Zustand)
```

---

## 8. Risques et Mitigations

| ID | Risque | Prob. | Impact | Mitigation |
|----|--------|-------|--------|------------|
| R1 | Web Speech API non supporté sur certains appareils | 🟠 Moyenne | 🔴 Élevé | Fallback Google Cloud Speech ou afficher message |
| R2 | Accents africains mal reconnus | 🟠 Moyenne | 🔴 Élevé | Tests avec utilisateurs réels, fine-tuning prompts |
| R3 | Bruit ambiant (marchés) dégrade précision | 🔴 Haute | 🟠 Moyen | Filtrage bruit, seuil confiance ajustable |
| R4 | Coût API STT cloud élevé | 🟢 Faible | 🟠 Moyen | Web Speech API gratuit prioritaire |
| R5 | Modèle Wolof inexistant/coûteux | 🟠 Moyenne | 🟠 Moyen | Phase 2, recherche partenaires/open source |

---

## 9. Planning Estimé

| Phase | Durée | Contenu |
|-------|-------|---------|
| **Phase 1A** - Infrastructure | 2 semaines | FR-001 à FR-003 (bouton, capture, feedback) |
| **Phase 1B** - STT & NLU | 2 semaines | FR-004 à FR-006 (reconnaissance, interprétation) |
| **Phase 1C** - Commandes de base | 3 semaines | FR-007 à FR-010 (navigation, recherche, panier) |
| **Phase 1D** - Commandes avancées | 2 semaines | FR-011 à FR-012 (création produit, facture) |
| **Tests & Polish** | 1 semaine | Tests utilisateurs, corrections |
| **Total Phase 1** | **10 semaines** | |
| **Phase 2 - Wolof** | 4-6 semaines | FR-013 à FR-014 |

---

## 10. Critères de Validation (Definition of Done)

### Fonctionnel
- [ ] Toutes les FR Must Have implémentées
- [ ] Tests avec 5+ utilisateurs réels au Sénégal
- [ ] Précision > 85% mesurée sur 100 commandes test

### Technique
- [ ] Code review effectuée
- [ ] Tests unitaires pour NLU (> 80% coverage)
- [ ] Tests d'intégration avec mocks STT
- [ ] Performance validée (< 2s)

### Documentation
- [ ] Guide utilisateur "Comment utiliser les commandes vocales"
- [ ] Liste des commandes supportées
- [ ] Troubleshooting (permission micro, etc.)

### Déploiement
- [ ] Déployé en staging
- [ ] Beta test avec 10 utilisateurs
- [ ] Déployé en production avec feature flag
- [ ] Monitoring erreurs STT en place

---

## 11. Matrice de Traçabilité

| Epic | FRs | Stories estimées | Priorité |
|------|-----|------------------|----------|
| EPIC-VOC-01 | FR-001, FR-002, FR-003 | 3-4 | 🔴 Must |
| EPIC-VOC-02 | FR-004, FR-005, FR-006 | 4-5 | 🔴 Must |
| EPIC-VOC-03 | FR-007 | 3-4 | 🔴 Must |
| EPIC-VOC-04 | FR-008, FR-009 | 3-4 | 🔴 Must |
| EPIC-VOC-05 | FR-010, FR-011, FR-012 | 4-5 | 🔴/🟠 Must/Should |
| EPIC-VOC-06 | FR-013, FR-014 | 3-4 | 🟡 Could (P2) |
| **TOTAL** | **14 FRs** | **20-26 stories** | |

---

## 12. Résumé Priorisation

| Priorité | FRs | Pourcentage |
|----------|-----|-------------|
| 🔴 Must Have | 10 | 71% |
| 🟠 Should Have | 2 | 14% |
| 🟡 Could Have | 2 | 14% |

---

## 13. Annexes

### A. Commandes Vocales Supportées (Phase 1)

| Catégorie | Commande | Action |
|-----------|----------|--------|
| **Navigation** | "Va aux factures" | router.push('/dashboard/commerce/factures') |
| | "Ouvre le panier" | router.push('/dashboard/commerce/panier') |
| | "Va aux produits" | router.push('/dashboard/commerce/produits') |
| | "Va aux clients" | router.push('/dashboard/commerce/clients') |
| | "Retour" / "Page précédente" | router.back() |
| | "Accueil" | router.push('/dashboard') |
| **Recherche** | "Cherche [produit]" | Filtre liste produits |
| | "Trouve client [nom]" | Filtre liste clients |
| | "Client [téléphone]" | Recherche par téléphone |
| **Panier** | "Ajoute [qté] [produit]" | panierStore.addArticle() |
| | "[qté] [produit]" | panierStore.addArticle() |
| | "Vide le panier" | panierStore.clearPanier() |
| **Création** | "Crée produit [nom] à [prix]" | add_edit_produit() |
| **Contrôle** | "Annule" | Annule dernière action |
| | "Aide" | Affiche liste commandes |

### B. Architecture Technique Proposée

```
┌─────────────────────────────────────────────────────────────┐
│                    Interface Utilisateur                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ VoiceButton │  │ VoiceFeedback│  │ TranscriptDisplay │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    VoiceService (Hook)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ useVoice()  │──│ AudioCapture│──│ STT Integration    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    NLU Engine                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │IntentParser │──│EntityExtract│──│ CommandMapper      │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
└───────────────────────────────────────────────┼─────────────┘
                                                │
          ┌─────────────────────────────────────┼─────────────┐
          │                                     ▼             │
          │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
          │  │ Navigation  │  │  Recherche  │  │  Actions  │ │
          │  │  Handler    │  │   Handler   │  │  Handler  │ │
          │  └─────────────┘  └─────────────┘  └───────────┘ │
          │                   Action Handlers                 │
          └───────────────────────────────────────────────────┘
```

---

## 14. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | Product Manager (BMAD) | Création initiale |

