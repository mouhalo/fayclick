# FayClick V2 - Contexte Projet

> **Document BMAD** | Version: 1.0 | Dernière mise à jour: 2026-01-21

---

## 🎯 Vision

FayClick V2 est une **Super App PWA** de gestion commerciale conçue pour le marché sénégalais. Elle cible quatre segments métier : **Commerce**, **Scolaire**, **Immobilier** et **Prestataires de Services**. L'application permet aux commerçants et entreprises de gérer leurs activités quotidiennes avec une intégration native des paiements mobiles (Orange Money, Wave, Free Money).

---

## 👥 Utilisateurs Cibles

| Persona | Description | Besoins principaux | Niveau technique |
|---------|-------------|-------------------|------------------|
| Commerçant informel | Propriétaire de boutique/commerce | Gestion stock, facturation, paiements | 🔴 Faible (peu alphabétisé) |
| Gérant d'école | Directeur/comptable établissement | Suivi paiements scolarité, gestion élèves | 🟠 Moyen |
| Agent immobilier | Gestionnaire de biens | Suivi loyers, gestion locataires | 🟠 Moyen |
| Prestataire de services | Artisan, consultant, etc. | Devis, facturation, suivi clients | 🟠 Moyen |
| Admin système | Équipe SYCAD | Administration plateforme | 🟢 Élevé |

### Caractéristiques Utilisateurs Sénégal
- [x] Utilisateurs peu alphabétisés → UI simple requise
- [x] Connexion intermittente → Mode offline requis (PWA)
- [x] Smartphones Android bas de gamme → Performance critique
- [x] Préférence paiement mobile → Intégration OM/Wave/Free

---

## 🏢 Contexte Business

### Informations Générales
- **Entreprise** : SYCAD Fintech / IceLabSoft
- **Marché cible** : Sénégal (expansion Afrique de l'Ouest)
- **Secteur** : Fintech / SaaS B2B

### Problème Résolu
Les commerçants et entreprises du secteur informel au Sénégal n'ont pas accès à des outils de gestion adaptés à leurs besoins : simplicité d'utilisation, mode offline, paiements mobiles intégrés. FayClick comble ce gap en offrant une solution tout-en-un accessible.

### Proposition de Valeur (UVP)
**"La gestion commerciale simplifiée pour tous, avec paiements mobiles intégrés"**
- Interface adaptée aux utilisateurs peu alphabétisés
- Mode offline complet (PWA)
- Intégration native Orange Money, Wave, Free Money
- Multi-segments métier en une seule app

### Modèle Économique
- **Type** : SaaS par abonnement
- **Tarification** : 
  - Mensuel : Variable selon segment
  - Annuel : Réduction significative
- **Paiement** : Via wallet intégré (OM/Wave/Free)

---

## 🛠️ Stack Technique

### Frontend
| Composant | Technologie | Version | Notes |
|-----------|-------------|---------|-------|
| Framework | Next.js | 15 | App Router |
| Langage | TypeScript | - | Strict mode |
| Styling | Tailwind CSS | 3.4.1 | Mobile-first |
| State | Zustand | - | + React Context |
| UI Library | React | 19 | Modern patterns |
| PWA | Service Worker | - | Offline support |

### Backend/API
| Composant | Technologie | Notes |
|-----------|-------------|-------|
| API Dev | http://127.0.0.1:5000 | Local |
| API Prod | https://api.icelabsoft.com | Production |
| Auth | JWT | Token management |

### Base de Données
| Composant | Technologie | Notes |
|-----------|-------------|-------|
| Type | PostgreSQL | Via MCP |
| MCP Server | alakantine | Configuré |
| Fonctions | PL/pgSQL | Logique métier |

### Intégrations Externes
- [x] Orange Money (API OFMS)
- [x] Wave (API INTOUCH)
- [x] Free Money (API OFMS)
- [x] SMS Gateway (send_o_sms)

### Infrastructure
| Composant | Service | Notes |
|-----------|---------|-------|
| Hébergement | FTP | v2.fayclick.net |
| Déploiement | deploy.mjs | Script automatisé |
| CI/CD | Manuel | npm run deploy:build |

---

## ⚠️ Contraintes

### Contraintes Techniques
1. **PWA obligatoire** : Mode offline complet avec Service Worker
2. **Performance mobile** : Optimisation pour 3G et appareils bas de gamme
3. **Bundle size** : Minimiser pour temps de chargement rapide
4. **Responsive** : 5 breakpoints (xs, sm, md, lg, xl, 2xl)

### Contraintes Business
1. **Multi-tenant** : Chaque structure est isolée
2. **Multi-segment** : 4 segments métier différents avec dashboards spécifiques
3. **Paiements mobiles** : Intégration OM/Wave/Free obligatoire

### Contraintes Utilisateurs
1. **Peu alphabétisés** : UI simple, icônes explicites, minimum de texte
2. **Connexion instable** : Synchronisation offline/online transparente
3. **Smartphones Android** : Compatibilité appareils bas de gamme

### Contraintes Légales/Réglementaires
1. Conformité paiements mobiles Sénégal
2. Protection données personnelles

---

## 📊 Métriques de Succès

| Métrique | Objectif | Actuel | Méthode de mesure |
|----------|----------|--------|-------------------|
| Structures actives | 1000+ | - | Dashboard admin |
| Taux rétention | > 80% | - | Renouvellement abonnements |
| Temps chargement | < 3s | - | Lighthouse |
| Disponibilité | 99.5% | - | Monitoring |

---

## 🔗 Ressources et Liens

| Ressource | URL | Accès |
|-----------|-----|-------|
| Repository Git | D:\React_Prj\fayclick | Local |
| Production | https://v2.fayclick.net | Public |
| API Prod | https://api.icelabsoft.com | Privé |
| API Dev | http://127.0.0.1:5000 | Local |

---

## ✅ Fonctionnalités Existantes (Phase 2 complétée)

### Core
- [x] Authentification (Login/Register) avec JWT
- [x] Système de permissions granulaires
- [x] Multi-dashboard (Commerce, Scolaire, Immobilier, Prestataires, Admin)
- [x] PWA complète avec Service Worker

### Module Commerce
- [x] Gestion produits/articles
- [x] Gestion clients (recherche intelligente)
- [x] Facturation complète
- [x] VenteFlash (ventes rapides client anonyme)
- [x] Inventaire/Stock
- [x] Dépenses

### Module Paiements
- [x] Wallet KALPE (coffre-fort)
- [x] Paiements Orange Money / Wave / Free Money
- [x] Retraits wallet avec OTP SMS
- [x] Factures publiques (lien partageable)

### Module Abonnements
- [x] Abonnement mensuel
- [x] Abonnement annuel
- [x] Paiement par wallet

### PWA
- [x] Service Worker avec cache
- [x] Installation intelligente
- [x] Background sync (IndexedDB)

---

## 📝 Backlog Évolutions (À développer)

### Haute Priorité 🔴
- [ ] **Social Commerce** : Vente via WhatsApp et TikTok
- [ ] **Reconnaissance IA produits** : Scanner produit pour identification automatique
- [ ] **Interface vocale** : Commandes vocales pour utilisateurs illettrés

### Moyenne Priorité 🟠
- [ ] Synchronisation multi-boutiques
- [ ] Rapports avancés et analytics
- [ ] Support langue Wolof

### Basse Priorité 🟢
- [ ] Scanner codes-barres amélioré
- [ ] Programme fidélité clients

---

## 🔄 Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | SUPER_BMAD_AGENT | Création initiale (Reverse BMAD) |
