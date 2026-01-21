# PRD : FayClick V2 - Super App Gestion Commerciale

> **Product Requirements Document** | Projet: FayClick V2
> **Version**: 1.0 | **Date**: 2026-01-21 | **Statut**: 🟢 Production

---

## 1. Informations Générales

| Champ | Valeur |
|-------|--------|
| **Projet** | FayClick V2 |
| **Type** | PWA (Progressive Web App) |
| **Version** | 2.0 |
| **Propriétaire** | MoloDev / SYCAD Fintech |
| **Marché cible** | Sénégal |
| **URL Production** | https://v2.fayclick.net |

---

## 2. Vision Produit

### 2.1 Énoncé de Vision

> **"La gestion commerciale simplifiée pour tous, avec paiements mobiles intégrés"**

FayClick V2 est une Super App PWA conçue pour démocratiser l'accès aux outils de gestion commerciale pour les commerçants et entreprises du secteur informel au Sénégal.

### 2.2 Objectifs Stratégiques

1. **Inclusion numérique** : Rendre la gestion commerciale accessible aux utilisateurs peu alphabétisés
2. **Autonomie offline** : Fonctionner même avec une connexion internet intermittente
3. **Paiements intégrés** : Unifier Orange Money, Wave et Free Money dans une seule interface
4. **Multi-segments** : Servir 4 verticales métier avec une seule application

---

## 3. Utilisateurs Cibles

### 3.1 Personas Principaux

#### Persona 1 : Amadou - Commerçant informel
| Attribut | Valeur |
|----------|--------|
| Âge | 35-55 ans |
| Éducation | Primaire/Secondaire partiel |
| Appareil | Smartphone Android bas de gamme |
| Connexion | 3G intermittente |
| Besoins | Gérer stock, facturer, recevoir paiements |
| Frustrations | Applications complexes, texte trop petit |

#### Persona 2 : Fatou - Gérante d'école
| Attribut | Valeur |
|----------|--------|
| Âge | 30-50 ans |
| Éducation | Supérieur |
| Appareil | Smartphone/Tablette |
| Connexion | WiFi + 4G |
| Besoins | Suivre paiements scolarité, gérer élèves |
| Frustrations | Retards de paiement, suivi manuel |

#### Persona 3 : Moussa - Agent immobilier
| Attribut | Valeur |
|----------|--------|
| Âge | 25-45 ans |
| Éducation | Secondaire/Supérieur |
| Appareil | Smartphone Android |
| Connexion | 4G |
| Besoins | Gérer locataires, suivre loyers |
| Frustrations | Impayés, relances manuelles |

#### Persona 4 : Awa - Prestataire de services
| Attribut | Valeur |
|----------|--------|
| Âge | 25-40 ans |
| Éducation | Secondaire/Supérieur |
| Appareil | Smartphone |
| Connexion | 4G |
| Besoins | Créer devis, facturer prestations |
| Frustrations | Suivi clients dispersé |

---

## 4. Exigences Fonctionnelles

### 4.1 Epic 1 : Authentification & Gestion de Compte

#### US-AUTH-001 : Connexion utilisateur
**En tant que** utilisateur enregistré
**Je veux** me connecter avec mon login et mot de passe
**Afin de** accéder à mon espace de gestion

**Critères d'acceptance :**
- [x] Formulaire login/password
- [x] Validation JWT
- [x] Redirection selon type de structure
- [x] Message d'erreur clair si échec

#### US-AUTH-002 : Inscription nouvelle structure
**En tant que** nouveau commerçant
**Je veux** créer un compte pour ma structure
**Afin de** commencer à utiliser FayClick

**Critères d'acceptance :**
- [x] Formulaire multi-étapes
- [x] Choix du type de structure
- [x] Validation numéro téléphone
- [x] Email de confirmation

#### US-AUTH-003 : Gestion du profil structure
**En tant que** gérant de structure
**Je veux** modifier les informations de ma structure
**Afin de** maintenir mes données à jour

**Critères d'acceptance :**
- [x] Modification nom, adresse, contact
- [x] Upload logo
- [x] Configuration numéros wallet (OM/Wave/Free)

---

### 4.2 Epic 2 : Gestion des Produits (Commerce)

#### US-PROD-001 : Catalogue produits
**En tant que** commerçant
**Je veux** voir la liste de mes produits
**Afin de** gérer mon catalogue

**Critères d'acceptance :**
- [x] Liste avec pagination
- [x] Recherche par nom
- [x] Filtre par catégorie
- [x] Tri par prix/stock

#### US-PROD-002 : CRUD produit
**En tant que** commerçant
**Je veux** ajouter/modifier/supprimer des produits
**Afin de** maintenir mon catalogue à jour

**Critères d'acceptance :**
- [x] Modal de création/édition
- [x] Champs : nom, prix vente, prix achat, stock
- [x] Catégorie optionnelle
- [x] Photo(s) produit

#### US-PROD-003 : Export catalogue
**En tant que** commerçant
**Je veux** exporter mon catalogue en CSV
**Afin de** l'utiliser dans d'autres outils

**Critères d'acceptance :**
- [x] Bouton export CSV
- [x] Tous les produits inclus
- [x] Format compatible Excel

---

### 4.3 Epic 3 : Gestion des Clients

#### US-CLI-001 : Liste clients
**En tant que** commerçant
**Je veux** voir tous mes clients
**Afin de** suivre ma base clientèle

**Critères d'acceptance :**
- [x] Liste avec stats (factures, montants)
- [x] Recherche par téléphone
- [x] Filtres avancés
- [x] Export CSV

#### US-CLI-002 : Fiche client
**En tant que** commerçant
**Je veux** voir le détail d'un client
**Afin de** connaître son historique

**Critères d'acceptance :**
- [x] Informations client
- [x] Historique factures
- [x] Montant total/payé/impayé
- [x] Actions rapides (facturer, appeler)

---

### 4.4 Epic 4 : Facturation

#### US-FACT-001 : Création facture
**En tant que** commerçant
**Je veux** créer une facture pour un client
**Afin de** formaliser une vente

**Critères d'acceptance :**
- [x] Sélection client (existant ou nouveau)
- [x] Ajout produits avec quantités
- [x] Calcul automatique totaux
- [x] Remise globale optionnelle
- [x] Acompte optionnel

#### US-FACT-002 : VenteFlash
**En tant que** commerçant
**Je veux** faire une vente rapide sans client identifié
**Afin de** encaisser rapidement en caisse

**Critères d'acceptance :**
- [x] Client anonyme par défaut
- [x] Encaissement CASH immédiat
- [x] Facture auto-payée

#### US-FACT-003 : Partage facture
**En tant que** commerçant
**Je veux** envoyer un lien de facture à mon client
**Afin qu'il** puisse payer en ligne

**Critères d'acceptance :**
- [x] Lien public unique
- [x] Visualisation facture sans auth
- [x] Paiement wallet intégré

---

### 4.5 Epic 5 : Paiements Wallet

#### US-PAY-001 : Encaisser paiement
**En tant que** commerçant
**Je veux** recevoir un paiement OM/Wave/Free
**Afin de** encaisser mes factures

**Critères d'acceptance :**
- [x] Choix du wallet (OM/Wave/Free)
- [x] QR Code de paiement
- [x] Polling statut automatique
- [x] Confirmation visuelle

#### US-PAY-002 : Coffre-fort KALPE
**En tant que** commerçant
**Je veux** voir mes soldes wallet
**Afin de** suivre ma trésorerie

**Critères d'acceptance :**
- [x] Solde par wallet (OM/Wave/Free)
- [x] Solde total
- [x] Historique transactions
- [x] CA global

#### US-PAY-003 : Retrait wallet
**En tant que** commerçant
**Je veux** retirer mes gains vers mon téléphone
**Afin de** récupérer mon argent

**Critères d'acceptance :**
- [x] Sélection wallet source
- [x] Saisie montant (min 100 FCFA)
- [x] Validation OTP SMS
- [x] Confirmation transfert

---

### 4.6 Epic 6 : Abonnements

#### US-ABO-001 : Souscrire abonnement
**En tant que** nouveau client
**Je veux** souscrire un abonnement
**Afin d'** utiliser FayClick

**Critères d'acceptance :**
- [x] Choix formule (Mensuel/Annuel)
- [x] Calcul montant automatique
- [x] Paiement wallet
- [x] Activation immédiate

#### US-ABO-002 : Renouveler abonnement
**En tant que** client existant
**Je veux** renouveler mon abonnement
**Afin de** continuer à utiliser le service

**Critères d'acceptance :**
- [x] Alerte expiration proche
- [x] Renouvellement en 1 clic
- [x] Historique abonnements

---

### 4.7 Epic 7 : PWA & Offline

#### US-PWA-001 : Installation app
**En tant que** utilisateur
**Je veux** installer FayClick sur mon téléphone
**Afin d'** y accéder facilement

**Critères d'acceptance :**
- [x] Prompt d'installation intelligent
- [x] Icône sur écran d'accueil
- [x] Splash screen personnalisé

#### US-PWA-002 : Mode offline
**En tant que** utilisateur sans connexion
**Je veux** continuer à utiliser l'app
**Afin de** ne pas perdre de ventes

**Critères d'acceptance :**
- [x] Cache des données essentielles
- [x] Page offline dédiée
- [x] Sync automatique au retour réseau

---

## 5. Exigences Non-Fonctionnelles

### 5.1 Performance

| Métrique | Objectif |
|----------|----------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3s |
| Bundle size (initial) | < 200KB |

### 5.2 Compatibilité

| Plateforme | Support |
|------------|---------|
| Android (Chrome) | ✅ Prioritaire |
| iOS (Safari) | ✅ Supporté |
| Desktop (Chrome/Firefox) | ✅ Supporté |
| Offline | ✅ Requis |

### 5.3 Sécurité

| Aspect | Implémentation |
|--------|----------------|
| Authentification | JWT avec expiration |
| Données sensibles | Masquage dans logs |
| Mots de passe | Hash bcrypt |
| Communications | HTTPS obligatoire |

### 5.4 Accessibilité

| Aspect | Implémentation |
|--------|----------------|
| Utilisateurs peu alphabétisés | Icônes explicites, texte minimal |
| Taille texte | Minimum 16px |
| Contraste | Ratio > 4.5:1 |
| Touch targets | Minimum 44x44px |

---

## 6. Métriques de Succès

| KPI | Objectif | Mesure |
|-----|----------|--------|
| Structures actives | 1000+ | Dashboard admin |
| Taux de rétention | > 80% | Renouvellement abonnements |
| NPS | > 40 | Enquêtes utilisateurs |
| Taux installation PWA | > 30% | Analytics |
| Temps moyen création facture | < 60s | Analytics |

---

## 7. Roadmap

### Phase 1 (Complétée) : MVP
- ✅ Authentification
- ✅ Gestion produits de base
- ✅ Facturation simple

### Phase 2 (Complétée) : Core Features
- ✅ Multi-dashboard
- ✅ Paiements wallet complets
- ✅ KALPE & Retraits
- ✅ PWA complète
- ✅ Abonnements

### Phase 3 (En cours) : Extensions
- 🔄 Social Commerce
- 🔄 Reconnaissance IA produits
- 🔄 Interface vocale

---

## 8. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | Product Manager Agent | Documentation PRD existant (Reverse BMAD) |
