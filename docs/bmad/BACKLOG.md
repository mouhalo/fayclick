# FayClick V2 - Backlog Produit

> **Document BMAD** | Version: 1.0 | Dernière mise à jour: 2026-01-21

---

## 1. Vue d'Ensemble

Ce document liste toutes les évolutions planifiées pour FayClick V2, priorisées selon la méthode MoSCoW.

| Priorité | Signification | Horizon |
|----------|---------------|---------|
| 🔴 Must Have | Critique pour le succès | Court terme (1-3 mois) |
| 🟠 Should Have | Important mais pas bloquant | Moyen terme (3-6 mois) |
| 🟡 Could Have | Amélioration appréciable | Long terme (6-12 mois) |
| ⚪ Won't Have | Pas prévu actuellement | Futur indéfini |

---

## 2. Haute Priorité 🔴 (Must Have)

### 2.1 Social Commerce

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| SC-001 | Intégration WhatsApp | Partager catalogue/factures via WhatsApp | M |
| SC-002 | Bouton WhatsApp | Bouton "Commander via WhatsApp" sur produits | S |
| SC-003 | Liens TikTok Shop | Lier produits à TikTok Shop | L |
| SC-004 | Notifications WhatsApp | Envoyer rappels paiement via WhatsApp | M |

**Valeur business** : Augmenter les ventes via canaux sociaux populaires au Sénégal

**Dépendances** :
- API WhatsApp Business
- Catalogue public existant ✅

---

### 2.2 Reconnaissance IA Produits

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| AI-001 | Scanner produit | Photographier un produit pour l'identifier | L |
| AI-002 | Suggestion prix | Suggérer un prix basé sur produits similaires | M |
| AI-003 | Catégorisation auto | Catégoriser automatiquement les nouveaux produits | M |

**Valeur business** : Réduire le temps de saisie pour utilisateurs peu alphabétisés

**Dépendances** :
- API Vision (Google/Claude)
- Base de données produits de référence

---

### 2.3 Interface Vocale

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| VOC-001 | Commandes vocales | "Ajouter 5 sacs de riz" | L |
| VOC-002 | Dictée produit | Créer un produit par la voix | M |
| VOC-003 | Recherche vocale | Chercher un client/produit par la voix | M |
| VOC-004 | Support Wolof | Reconnaissance vocale en Wolof | XL |

**Valeur business** : Accessibilité pour utilisateurs illettrés

**Dépendances** :
- API Speech-to-Text
- Modèle Wolof (pour VOC-004)

---

## 3. Moyenne Priorité 🟠 (Should Have)

### 3.1 Multi-Boutiques

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| MB-001 | Gestion multi-points | Une structure, plusieurs boutiques | L |
| MB-002 | Sync inventaire | Synchroniser stock entre boutiques | L |
| MB-003 | Dashboard consolidé | Vue globale de toutes les boutiques | M |
| MB-004 | Transfert stock | Transférer produits entre boutiques | M |

**Valeur business** : Cibler les commerçants avec plusieurs points de vente

---

### 3.2 Rapports Avancés

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| RAP-001 | Dashboard analytics | Graphiques CA, tendances | M |
| RAP-002 | Export PDF | Rapports mensuels en PDF | S |
| RAP-003 | Comparaison périodes | Comparer mois/trimestres | M |
| RAP-004 | Prévisions | IA pour prévoir les ventes | L |

**Valeur business** : Aide à la décision pour les commerçants

---

### 3.3 Support Wolof

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| WOL-001 | UI en Wolof | Traduction interface | M |
| WOL-002 | Switch langue | Bouton changement FR/WO | S |
| WOL-003 | Notifications Wolof | Messages SMS en Wolof | S |

**Valeur business** : Inclusion linguistique

---

### 3.4 Module Scolaire Complet

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| SCO-001 | Gestion élèves | CRUD élèves avec classes | M |
| SCO-002 | Frais scolarité | Configuration des frais par classe | M |
| SCO-003 | Paiements échelonnés | Plans de paiement | M |
| SCO-004 | Notifications parents | Rappels paiement automatiques | M |
| SCO-005 | Bulletins | Génération bulletins scolaires | L |

---

### 3.5 Module Immobilier Complet

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| IMM-001 | Gestion biens | CRUD appartements/maisons | M |
| IMM-002 | Contrats location | Génération contrats | M |
| IMM-003 | Quittances loyer | Génération automatique | M |
| IMM-004 | Rappels impayés | Relances automatiques | S |

---

## 4. Basse Priorité 🟡 (Could Have)

### 4.1 Scanner Codes-Barres Amélioré

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| BAR-001 | Scan continu | Scanner plusieurs produits sans arrêt | M |
| BAR-002 | Création par scan | Créer produit depuis code-barre GS1 | M |
| BAR-003 | Impression étiquettes | Générer étiquettes codes-barres | M |

---

### 4.2 Programme Fidélité

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| FID-001 | Points fidélité | Accumuler points sur achats | M |
| FID-002 | Récompenses | Catalogue de récompenses | M |
| FID-003 | Cartes fidélité | QR Code client pour accumulation | S |

---

### 4.3 Intégration Comptabilité

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| CPT-001 | Export SYSCOHADA | Format comptable OHADA | L |
| CPT-002 | TVA automatique | Calcul TVA si applicable | M |
| CPT-003 | Clôture exercice | Assistant clôture annuelle | M |

---

### 4.4 Marketplace B2B

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| B2B-001 | Catalogue fournisseurs | Voir produits fournisseurs | L |
| B2B-002 | Commandes fournisseurs | Commander directement | L |
| B2B-003 | Prix de gros | Tarification selon quantité | M |

---

## 5. Non Planifié ⚪ (Won't Have - For Now)

| Feature | Raison |
|---------|--------|
| App native iOS/Android | PWA suffit pour le marché cible |
| Livraison intégrée | Complexité logistique hors scope |
| Crédit/Prêt | Réglementation bancaire |
| Multi-devise | Marché 100% FCFA |

---

## 6. Dépendances Techniques

### APIs Externes Requises

| Feature | API Requise | Coût estimé |
|---------|-------------|-------------|
| Social Commerce | WhatsApp Business API | $$ |
| IA Produits | Google Vision / Claude | $$ |
| Interface Vocale | Speech-to-Text | $ |
| Wolof Vocal | Modèle custom | $$$ |

### Infrastructure

| Feature | Besoin |
|---------|--------|
| Multi-Boutiques | Partitioning BD |
| Rapports | Materialized Views |
| IA | GPU pour inférence |

---

## 7. Estimation Effort

| Taille | Story Points | Durée équivalente |
|--------|--------------|-------------------|
| XS | 1-2 | 1-2 jours |
| S | 3-5 | 3-5 jours |
| M | 8-13 | 1-2 semaines |
| L | 21-34 | 2-4 semaines |
| XL | 55+ | 1-2 mois |

---

## 8. Sprints Suggérés

### Sprint 1 : Social Commerce Base
- SC-001 : Intégration WhatsApp
- SC-002 : Bouton WhatsApp

### Sprint 2 : Reconnaissance IA
- AI-001 : Scanner produit
- AI-002 : Suggestion prix

### Sprint 3 : Rapports
- RAP-001 : Dashboard analytics
- RAP-002 : Export PDF

### Sprint 4 : Module Scolaire
- SCO-001 : Gestion élèves
- SCO-002 : Frais scolarité

---

## 9. Critères de Priorisation

Chaque feature est évaluée sur :

| Critère | Poids |
|---------|-------|
| Valeur business | 40% |
| Demande utilisateurs | 25% |
| Effort technique | 20% |
| Alignement stratégique | 15% |

---

## 10. Processus d'Ajout

Pour ajouter une feature au backlog :

1. Créer une entrée dans la section appropriée
2. Attribuer un ID unique (PREFIX-XXX)
3. Estimer l'effort (XS/S/M/L/XL)
4. Identifier les dépendances
5. Valider avec Product Owner
6. Créer PRD détaillé si priorité 🔴

---

## 11. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | Product Manager Agent | Création initiale (Reverse BMAD) |
