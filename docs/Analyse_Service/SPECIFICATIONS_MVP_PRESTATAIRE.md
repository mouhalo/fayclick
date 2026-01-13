# Spécifications MVP - Dashboard Prestataire de Services

**Date**: 2 Janvier 2026
**Version**: 1.0
**Statut**: Validé

---

## 1. Vision Produit

### 1.1 Cible Utilisateur

| Caractéristique | Description |
|-----------------|-------------|
| **Profil** | Artisans sous-lettrés (maçons, plombiers, électriciens, etc.) |
| **Contexte** | Travaillent dans l'informel, qualifiés mais sans outils de gestion |
| **Besoin** | Solution SIMPLE et SMART pour professionnaliser leur activité |
| **Équipement** | Smartphone uniquement |

### 1.2 Proposition de Valeur

> Aider les artisans à créer facilement des **devis** et **factures** professionnels,
> et à accepter les paiements via **Wave** et **Orange Money**.

### 1.3 Principes de Design

1. **Simplicité** - Interfaces épurées, minimum de clics
2. **Clarté** - Textes courts, icônes explicites
3. **Rapidité** - Actions en 2-3 taps maximum
4. **Mobile-first** - 100% optimisé smartphone

---

## 2. Décisions Produit Validées

| Question | Décision | Justification |
|----------|----------|---------------|
| Gestion fournitures | Saisie manuelle | Plus simple, pas de stock à gérer |
| Agenda/RDV | Non (Phase 2+) | MVP focalisé sur l'essentiel |
| Modèle facturation | Entité "Prestation" distincte | Logique métier différente de Commerce |

---

## 3. Fonctionnalités MVP (Priorité 1-2-3)

### 3.1 Priorité 1: Catalogue de Services

**Objectif**: Permettre au prestataire de définir ses services avec tarifs de base.

**Écran**: Liste des services avec CRUD

```
┌─────────────────────────────────────────┐
│ MES SERVICES                   [+ Nouveau]
├─────────────────────────────────────────┤
│ 🔧 Installation électrique              │
│    Coût de base: 15,000 F               │
│    [Modifier] [Supprimer]               │
├─────────────────────────────────────────┤
│ 🔧 Dépannage urgent                     │
│    Coût de base: 10,000 F               │
│    [Modifier] [Supprimer]               │
├─────────────────────────────────────────┤
│ 🔧 Pose tableau électrique              │
│    Coût de base: 25,000 F               │
│    [Modifier] [Supprimer]               │
└─────────────────────────────────────────┘
```

**Champs Service**:
- `nom_service` (obligatoire) - Ex: "Installation électrique"
- `cout_base` (obligatoire) - Tarif minimum de référence
- `description` (optionnel) - Détails du service
- `actif` (boolean) - Masquer sans supprimer

**Note**: Le coût de base est indicatif. Le prestataire ajuste le prix final lors de la création du devis/facture selon la complexité du chantier.

### 3.2 Priorité 2: Création de Devis

**Objectif**: Créer un devis professionnel avec services + équipements.

**Concept Clé**:
- **Services** = Main d'œuvre du prestataire (comptabilisé dans le CA)
- **Équipements** = Matériel à acheter par le client (NON comptabilisé)

**Écran**: Formulaire de devis

```
┌─────────────────────────────────────────┐
│ NOUVEAU DEVIS                           │
├─────────────────────────────────────────┤
│ CLIENT                                  │
│ Téléphone: [77 123 45 67]          🔍  │
│ Nom: [Amadou Diallo]                    │
├─────────────────────────────────────────┤
│ MES SERVICES                    [+ Ajouter]
│ ┌─────────────────────────────────────┐ │
│ │ Installation électrique    15,000 F │ │
│ │ Pose tableau              25,000 F │ │
│ │                    ─────────────── │ │
│ │ TOTAL SERVICES:           40,000 F │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ÉQUIPEMENTS CLIENT            [+ Ajouter]
│ ┌─────────────────────────────────────┐ │
│ │ Tableau électrique  x1    35,000 F │ │
│ │ Disjoncteur 20A     x3     9,000 F │ │
│ │ Câble 2.5mm (50m)   x1    12,000 F │ │
│ │                    ─────────────── │ │
│ │ TOTAL ÉQUIPEMENTS:        56,000 F │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ RÉCAPITULATIF                           │
│ ┌─────────────────────────────────────┐ │
│ │ Services (main d'œuvre):  40,000 F │ │
│ │ Équipements (achats):     56,000 F │ │
│ │ ═══════════════════════════════════ │ │
│ │ TOTAL DEVIS:              96,000 F │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [ENREGISTRER]  [ENVOYER PAR WHATSAPP]   │
└─────────────────────────────────────────┘
```

**Fonction PostgreSQL**:
```sql
SELECT public.add_new_devis_complet(
    '2025-01-02',           -- date_devis
    219,                    -- id_structure
    '771234567',            -- tel_client
    'Amadou Diallo',        -- nom_client_payeur
    40000,                  -- montant_prestation (services)
    '[
        {"designation": "Tableau électrique", "marque": "Legrand", "pu": 35000, "qte": 1, "total": 35000},
        {"designation": "Disjoncteur 20A", "marque": "Schneider", "pu": 3000, "qte": 3, "total": 9000},
        {"designation": "Câble 2.5mm 50m", "marque": "Nexans", "pu": 12000, "qte": 1, "total": 12000}
    ]'::JSONB,              -- lignes_equipements
    252                     -- id_utilisateur
);
```

### 3.3 Priorité 3: Prestation Rapide / Facture

**Objectif**: Encaisser rapidement une prestation (CASH ou Wallet).

**2 Modes d'entrée**:
1. **Mode Direct**: Sélectionner services → Définir prix → Encaisser
2. **Mode Devis**: Convertir un devis existant en facture

**Écran**: Prestation rapide (similaire VenteFlash)

```
┌─────────────────────────────────────────┐
│ NOUVELLE PRESTATION                      │
├─────────────────────────────────────────┤
│ CLIENT (optionnel)                       │
│ [CLIENT ANONYME]              [Changer] │
├─────────────────────────────────────────┤
│ SERVICES                        [+ Ajouter]
│ ┌─────────────────────────────────────┐ │
│ │ 🔧 Dépannage urgent                 │ │
│ │    Coût: [12,000] F          [🗑️]  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ TOTAL:                        12,000 F  │
│ Remise:                       [    ] F  │
│ ═══════════════════════════════════════ │
│ NET À PAYER:                  12,000 F  │
│                                          │
│ [💵 CASH]  [📱 WAVE]  [📱 OM]           │
└─────────────────────────────────────────┘
```

**Workflow Paiement**:
1. CASH → `add_acompte_facture()` → Reçu généré
2. WAVE/OM → QR Code → Polling → Reçu généré

---

## 4. Architecture Technique

### 4.1 Nouvelles Routes

```
/dashboard/services/
├── page.tsx                 ← Dashboard (stats + actions rapides)
├── services/page.tsx        ← Catalogue de services (CRUD)
├── devis/
│   ├── page.tsx            ← Liste des devis
│   └── nouveau/page.tsx    ← Création devis
├── prestations/
│   ├── page.tsx            ← Historique prestations
│   └── nouvelle/page.tsx   ← Prestation rapide
└── clients/page.tsx         ← Gestion clients (réutiliser Commerce)
```

### 4.2 Composants à Créer

| Composant | Description | Base |
|-----------|-------------|------|
| `ModalService.tsx` | CRUD service (sans stock/photos) | Copier `ModalProduit.tsx` |
| `PanierPrestation.tsx` | Panier simplifié services | Adapter `PanierVenteFlash.tsx` |
| `FormDevis.tsx` | Formulaire création devis | Nouveau |
| `LigneEquipement.tsx` | Ligne équipement dans devis | Nouveau |
| `CarteService.tsx` | Carte service cliquable | Adapter `CarteProduit.tsx` |

### 4.3 Services à Créer

```typescript
// services/prestation.service.ts
export const prestationService = {
  // Services (catalogue)
  getServices(idStructure: number): Promise<Service[]>,
  addService(service: ServiceInput): Promise<Service>,
  updateService(id: number, service: ServiceInput): Promise<Service>,
  deleteService(id: number): Promise<void>,

  // Devis
  getDevis(idStructure: number, periode?: string): Promise<Devis[]>,
  createDevis(devis: DevisInput): Promise<Devis>,
  convertDevisToFacture(idDevis: number): Promise<Facture>,

  // Prestations (factures)
  getPrestations(idStructure: number, periode?: string): Promise<Prestation[]>,
  createPrestation(prestation: PrestationInput): Promise<Prestation>,
};
```

### 4.4 Types TypeScript

```typescript
// types/prestation.ts

export interface Service {
  id_service: number;
  id_structure: number;
  nom_service: string;
  cout_base: number;
  description?: string;
  actif: boolean;
  created_at: Date;
}

export interface Devis {
  id_devis: number;
  id_structure: number;
  date_devis: Date;
  tel_client: string;
  nom_client: string;
  montant_services: number;      // Main d'œuvre
  montant_equipements: number;   // Achats client
  montant_total: number;
  statut: 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'FACTURE';
  lignes_equipements: LigneEquipement[];
}

export interface LigneEquipement {
  designation: string;
  marque?: string;
  prix_unitaire: number;
  quantite: number;
  total: number;
}

export interface Prestation {
  id_prestation: number;
  id_structure: number;
  id_client?: number;
  nom_client: string;
  tel_client: string;
  date_prestation: Date;
  montant_total: number;
  montant_paye: number;
  remise: number;
  statut: 'PAYEE' | 'PARTIELLE' | 'IMPAYEE';
  mode_paiement: 'CASH' | 'WAVE' | 'OM' | 'FREE';
  services: PrestationLigne[];
}

export interface PrestationLigne {
  id_service: number;
  nom_service: string;
  cout: number;  // Prix facturé (peut différer du cout_base)
}
```

---

## 5. Plan d'Implémentation

### Phase 1: Fondations (Jour 1-2)

| # | Tâche | Fichier |
|---|-------|---------|
| 1 | Créer types TypeScript | `types/prestation.ts` |
| 2 | Créer service API | `services/prestation.service.ts` |
| 3 | Créer page catalogue services | `app/dashboard/services/services/page.tsx` |
| 4 | Créer ModalService (CRUD) | `components/services/ModalService.tsx` |
| 5 | Créer CarteService | `components/services/CarteService.tsx` |

### Phase 2: Devis (Jour 3-4)

| # | Tâche | Fichier |
|---|-------|---------|
| 6 | Créer page liste devis | `app/dashboard/services/devis/page.tsx` |
| 7 | Créer formulaire devis | `components/services/FormDevis.tsx` |
| 8 | Créer composant LigneEquipement | `components/services/LigneEquipement.tsx` |
| 9 | Intégrer fonction PostgreSQL | `add_new_devis_complet()` |

### Phase 3: Prestations (Jour 5)

| # | Tâche | Fichier |
|---|-------|---------|
| 10 | Créer page prestation rapide | Adapter depuis VenteFlash |
| 11 | Créer PanierPrestation | `components/services/PanierPrestation.tsx` |
| 12 | Intégrer paiement CASH/Wallet | Réutiliser existant |
| 13 | Génération reçu | Réutiliser `ModalRecuGenere` |

### Phase 4: Dashboard (Jour 6)

| # | Tâche | Fichier |
|---|-------|---------|
| 14 | Refonte dashboard principal | `app/dashboard/services/page.tsx` |
| 15 | Stats: CA, Prestations, Clients | Adapter `useDashboardData` |
| 16 | Actions rapides | Boutons vers fonctionnalités |

---

## 6. Maquettes UI (Wireframes)

### 6.1 Dashboard Principal

```
┌─────────────────────────────────────────┐
│ 🛠️ MON ACTIVITÉ           [☰]    [🔔]  │
├─────────────────────────────────────────┤
│                                          │
│   ┌─────────┐    ┌─────────┐            │
│   │ 125,000 │    │   8     │            │
│   │ CA Mois │    │Prestats │            │
│   └─────────┘    └─────────┘            │
│   ┌─────────┐    ┌─────────┐            │
│   │   12    │    │ 15,000  │            │
│   │ Clients │    │ Impayés │            │
│   └─────────┘    └─────────┘            │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  ACTIONS RAPIDES                         │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │  [📝 Nouveau Devis]                 ││
│  │  [🔧 Prestation Rapide]             ││
│  │  [📋 Mes Services]                  ││
│  └─────────────────────────────────────┘│
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  DERNIÈRES PRESTATIONS          [Voir +]│
│  ┌─────────────────────────────────────┐│
│  │ Aujourd'hui                         ││
│  │ • M. Diop - Dépannage - 12,000 F   ││
│  │ Hier                                ││
│  │ • Mme Ba - Installation - 45,000 F ││
│  └─────────────────────────────────────┘│
│                                          │
└─────────────────────────────────────────┘
```

### 6.2 Modal Service (Simplifié)

```
┌─────────────────────────────────────────┐
│ NOUVEAU SERVICE                    [X]  │
├─────────────────────────────────────────┤
│                                          │
│  Nom du service *                        │
│  ┌─────────────────────────────────────┐│
│  │ Installation électrique             ││
│  └─────────────────────────────────────┘│
│                                          │
│  Coût de base (FCFA) *                   │
│  ┌─────────────────────────────────────┐│
│  │ 15000                               ││
│  └─────────────────────────────────────┘│
│  ℹ️ Prix indicatif, ajustable par devis │
│                                          │
│  Description (optionnel)                 │
│  ┌─────────────────────────────────────┐│
│  │ Installation complète avec mise     ││
│  │ aux normes...                       ││
│  └─────────────────────────────────────┘│
│                                          │
│  [        ENREGISTRER        ]          │
│                                          │
└─────────────────────────────────────────┘
```

---

## 7. Métriques de Succès

| Métrique | Objectif |
|----------|----------|
| Temps création devis | < 2 minutes |
| Temps prestation rapide | < 30 secondes |
| Clics pour encaisser CASH | ≤ 3 clics |
| Adoption (prestataires actifs/mois) | À définir |

---

## 8. Prochaine Étape

**Démarrer Phase 1**: Créer les types et le service API, puis le catalogue de services.

Valider ce document avant de commencer l'implémentation.
