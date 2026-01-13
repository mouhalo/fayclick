# Analyse des Besoins - Prestataires de Services

**Date**: 2 Janvier 2026
**Cible**: Maçons, Plombiers, Coiffeurs, Mécaniciens, Électriciens, etc.

---

## 1. Profil des Utilisateurs Cibles

### 1.1 Caractéristiques Communes

| Caractéristique | Description |
|-----------------|-------------|
| **Mobilité** | Travaillent souvent sur site (chez le client) |
| **Facturation** | Service + Main d'œuvre + Pièces/Fournitures |
| **Paiement** | Souvent en espèces ou mobile money |
| **Clientèle** | Mix clients réguliers + ponctuels |
| **Équipement** | Smartphone principal (pas de PC) |

### 1.2 Segments de Prestataires

| Segment | Exemples | Spécificités |
|---------|----------|--------------|
| **BTP** | Maçons, Plombiers, Électriciens, Peintres | Devis préalable, fournitures |
| **Beauté/Bien-être** | Coiffeurs, Esthéticiennes | Rendez-vous, services récurrents |
| **Auto/Moto** | Mécaniciens, Carrossiers | Pièces détachées, diagnostic |
| **Services Pro** | Comptables, Consultants, Formateurs | Facturation horaire, abonnements |
| **Artisanat** | Couturiers, Menuisiers, Soudeurs | Sur-mesure, délais |

---

## 2. Parcours Utilisateur Type

### 2.1 Journée Type d'un Plombier

```
07h00 - Consulte son agenda du jour (3 interventions prévues)
08h00 - Intervention 1: Fuite robinet chez Mme Diallo
        → Crée prestation: Main d'œuvre (5000 FCFA) + Joint (500 FCFA)
        → Client paie en CASH → Reçu envoyé par WhatsApp
11h00 - Intervention 2: Installation chauffe-eau chez M. Ndiaye
        → Devis déjà accepté (75,000 FCFA)
        → Acompte reçu (30,000) → Reste à payer (45,000)
        → Termine et encaisse le solde
15h00 - Client appelle pour urgence (fuite grave)
        → Ajoute RDV urgent, se déplace
        → Prestation non planifiée: 15,000 FCFA CASH
18h00 - Consulte son tableau de bord
        → CA du jour: 95,000 FCFA
        → 3 prestations réalisées
```

### 2.2 Points de Friction Actuels (Sans App)

1. **Pas de trace** des interventions passées
2. **Oubli** des montants dus par les clients
3. **Difficulté** à établir des devis professionnels
4. **Perte de temps** pour les relances de paiement
5. **Aucune visibilité** sur le chiffre d'affaires

---

## 3. Fonctionnalités Essentielles

### 3.1 MVP - Phase 1 (Priorité Haute)

#### A. Catalogue de Services

```
┌─────────────────────────────────────────┐
│ MES SERVICES                    [+ Ajouter]
├─────────────────────────────────────────┤
│ 🔧 Réparation fuite             5,000 F │
│ 🔧 Installation robinet        12,000 F │
│ 🔧 Débouchage canalisation     15,000 F │
│ 🔧 Installation chauffe-eau    25,000 F │
│ ⏱️ Main d'œuvre (par heure)     3,000 F │
└─────────────────────────────────────────┘
```

**Champs Service**:
- Nom du service
- Prix de base (FCFA)
- Durée estimée (optionnel)
- Catégorie (optionnel)
- Description (optionnel)

#### B. Création de Prestation Rapide

```
┌─────────────────────────────────────────┐
│ NOUVELLE PRESTATION                      │
├─────────────────────────────────────────┤
│ Client: [Mme Diallo - 77 123 45 67]  🔍 │
│                                          │
│ Services:                                │
│ ✓ Réparation fuite          5,000 F     │
│ ✓ Main d'œuvre (2h)         6,000 F     │
│                                          │
│ Fournitures ajoutées:                    │
│ + Joint caoutchouc            500 F     │
│ + Teflon                      200 F     │
│                          ─────────────── │
│ TOTAL                      11,700 F     │
│                                          │
│ Remise: [____] F                         │
│ NET À PAYER:               11,700 F     │
│                                          │
│ [ENCAISSER CASH]  [ENVOYER FACTURE]     │
└─────────────────────────────────────────┘
```

#### C. Gestion Clients (Réutiliser Commerce)

- Recherche par téléphone (9 chiffres)
- Création client rapide
- Historique prestations par client
- Solde dû par client

#### D. Historique Prestations

```
┌─────────────────────────────────────────┐
│ AUJOURD'HUI                     95,000 F│
├─────────────────────────────────────────┤
│ 15:30 │ M. Fall      │ Urgence │ 15,000│
│ 11:00 │ M. Ndiaye    │ Install │ 45,000│
│ 08:30 │ Mme Diallo   │ Répar.  │ 11,700│
├─────────────────────────────────────────┤
│ HIER                            42,000 F│
├─────────────────────────────────────────┤
│ ...                                      │
└─────────────────────────────────────────┘
```

### 3.2 Phase 2 - Fonctionnalités Avancées

#### A. Agenda / Rendez-vous

```
┌─────────────────────────────────────────┐
│ JEUDI 2 JANVIER 2026            [+ RDV] │
├─────────────────────────────────────────┤
│ 08:00 │ Mme Diallo │ Fuite robinet      │
│       │ 📍 Parcelles, Villa 45          │
│       │ 📞 77 123 45 67                 │
├───────┼─────────────────────────────────┤
│ 11:00 │ M. Ndiaye │ Chauffe-eau         │
│       │ 📍 Almadies, Apt 12             │
│       │ 💰 Devis: 75,000 F (acompte OK) │
├───────┼─────────────────────────────────┤
│ 15:00 │ LIBRE                           │
└─────────────────────────────────────────┘
```

#### B. Devis

- Création devis détaillé
- Envoi par WhatsApp/SMS
- Conversion devis → prestation
- Suivi statut (en attente, accepté, refusé)

#### C. Rappels Automatiques

- Rappel RDV J-1 par SMS
- Relance impayés automatique
- Notification client quand prestataire en route

### 3.3 Phase 3 - Nice to Have

- **Localisation GPS** (je suis en route)
- **Photos avant/après** intervention
- **Notes vocales** pour le dossier client
- **Partage calendrier** avec équipe
- **Rapport mensuel** automatique

---

## 4. Modèle de Données Proposé

### 4.1 Entité: Service (Catalogue)

```typescript
interface Service {
  id_service: number;
  id_structure: number;
  nom_service: string;
  prix_base: number;
  duree_minutes?: number;
  categorie?: string;
  description?: string;
  actif: boolean;
  created_at: Date;
}
```

### 4.2 Entité: Prestation (Réalisation)

```typescript
interface Prestation {
  id_prestation: number;
  id_structure: number;
  id_client?: number;            // null = client anonyme
  nom_client: string;
  tel_client: string;

  // Détails
  services: PrestationService[]; // Services inclus
  fournitures: Fourniture[];     // Pièces/matériaux

  // Financier
  montant_services: number;
  montant_fournitures: number;
  remise: number;
  montant_total: number;
  montant_paye: number;

  // Statut
  statut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  date_prestation: Date;
  notes?: string;

  // Paiement
  mode_paiement?: 'CASH' | 'OM' | 'WAVE' | 'FREE' | 'CREDIT';
}

interface PrestationService {
  id_service: number;
  nom_service: string;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
}

interface Fourniture {
  designation: string;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
}
```

### 4.3 Entité: Rendez-vous (Phase 2)

```typescript
interface RendezVous {
  id_rdv: number;
  id_structure: number;
  id_client?: number;
  nom_client: string;
  tel_client: string;

  date_rdv: Date;
  heure_debut: string;      // "08:00"
  duree_prevue?: number;    // minutes

  objet: string;            // "Réparation fuite"
  adresse?: string;
  notes?: string;

  statut: 'PLANIFIE' | 'CONFIRME' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  id_prestation?: number;   // Lien si converti en prestation
}
```

---

## 5. Écrans à Développer

### 5.1 Navigation Proposée

```
/dashboard/services
├── /                       ← Dashboard principal (stats + RDV du jour)
├── /services               ← Catalogue services/tarifs
├── /prestations            ← Historique + Création
├── /clients                ← Gestion clients
├── /agenda                 ← Calendrier RDV (Phase 2)
└── /statistiques           ← Stats détaillées (Phase 3)
```

### 5.2 Dashboard Principal Repensé

```
┌─────────────────────────────────────────┐
│ 🛠️ MON ACTIVITÉ           [Menu] [🔔]  │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 156,000  │  │    12    │             │
│  │ CA Mois  │  │ Prestats │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │    45    │  │  25,000  │             │
│  │ Clients  │  │ Impayés  │             │
│  └──────────┘  └──────────┘             │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  AUJOURD'HUI (2 RDV)           [Voir +] │
│  ┌─────────────────────────────────────┐│
│  │ 08:00 Mme Diallo - Fuite robinet   ││
│  │ 11:00 M. Ndiaye - Chauffe-eau      ││
│  └─────────────────────────────────────┘│
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│        [🔧 NOUVELLE PRESTATION]          │
│                                          │
└─────────────────────────────────────────┘
```

---

## 6. Différences avec Commerce

| Aspect | Commerce | Prestataire |
|--------|----------|-------------|
| **Entité principale** | Produit (stock) | Service (tarif) |
| **Vente** | Vente Flash | Prestation |
| **Stock** | Géré (quantités) | Non applicable |
| **Client** | Souvent anonyme | Souvent identifié |
| **Localisation** | Fixe (boutique) | Mobile (déplacement) |
| **Planification** | Non | Agenda/RDV |
| **Fournitures** | Incluses (produits) | Ajoutées manuellement |

---

## 7. Questions à Valider

### 7.1 Fonctionnelles

1. **Stock fournitures**: Le prestataire gère-t-il un stock de pièces/fournitures ?
   - Option A: Non, il saisit manuellement à chaque prestation
   - Option B: Oui, mini-stock avec déstockage automatique

2. **Devis**: Les devis sont-ils une priorité immédiate ?
   - Option A: Phase 1 (essentiel)
   - Option B: Phase 2 (peut attendre)

3. **Agenda**: L'agenda est-il critique pour le MVP ?
   - Option A: Oui, les prestataires planifient leurs journées
   - Option B: Non, on commence simple (prestations uniquement)

### 7.2 Techniques

4. **Facturation**: Réutiliser le système de factures Commerce ou créer "Prestation" comme entité distincte ?
   - Option A: Prestation = Facture avec type "SERVICE"
   - Option B: Prestation = Nouvelle table dédiée

5. **Backend**: Fonctions PostgreSQL existantes à adapter ou créer de zéro ?
   - Vérifier: `get_list_services`, `add_prestation`, etc.

---

## 8. Prochaines Étapes

1. **Valider** les questions ci-dessus avec l'équipe produit
2. **Définir** le scope précis du MVP
3. **Créer** les fonctions PostgreSQL nécessaires
4. **Développer** les écrans par ordre de priorité
5. **Tester** avec un prestataire réel (plombier partenaire ?)

---

## 9. Estimation Effort

| Phase | Fonctionnalités | Effort |
|-------|-----------------|--------|
| Phase 1 | Dashboard + Services + Prestations | 3-5 jours |
| Phase 2 | Agenda + Devis | 3-4 jours |
| Phase 3 | Stats avancées + Notifications | 2-3 jours |

**Total MVP (Phase 1)**: ~5 jours de développement
