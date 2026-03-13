# PRD : Factures Proformes (Comptes Privés)

> **Product Requirements Document** | Projet: FayClick V2

---

## Informations Generales

| Champ | Valeur |
|-------|--------|
| **Projet** | FayClick V2 |
| **Fonctionnalite** | Factures Proformes |
| **Version PRD** | 1.0 |
| **Date creation** | 2026-03-13 |
| **Auteur** | Claude Code (BMAD) |
| **Statut** | Draft |
| **Priorite** | Must Have |
| **Branche** | `feature/factures-proformes` |
| **Condition** | `compte_prive = true` uniquement |

---

## Objectif

### Resume Executif
Permettre aux clients ayant un **compte prive** de creer, gerer, imprimer et convertir des **factures proformes** depuis un nouvel onglet dans la page Factures. Les proformes fonctionnent comme des devis formels : elles listent des produits avec prix sans mouvementer le stock. La conversion en facture reelle declenche le mouvement de stock.

### Objectifs Mesurables
1. Les utilisateurs compte_prive peuvent creer une proforma en moins de 60 secondes (meme workflow que la commande)
2. 100% des proformes sont convertibles en facture reelle en 1 clic
3. Le stock n'est JAMAIS mouvemente lors de la creation d'une proforma

---

## Contexte

### Probleme
Les commercants avec comptes prives ont besoin d'envoyer des devis/proformes a leurs clients avant facturation definitive. Actuellement, ils n'ont pas cette fonctionnalite dans FayClick et utilisent des outils externes (Word, Excel) pour generer ces documents.

### Situation Actuelle
- La page Factures a 2 onglets : **Factures** et **Paiements**
- Le champ `est_devis` existe dans `create_facture_complete1` mais il cree dans la meme table factures et mouvemente le stock
- Pas de gestion CRUD dediee pour les proformes
- Pas de numerotation specifique proforma

### Impact Attendu
| Type d'impact | Description | Mesure |
|---------------|-------------|--------|
| Business | Professionnalisation des comptes prives | Adoption proformes > 50% des comptes prives |
| Utilisateur | Workflow devis → facture integre | Temps creation proforma < 60s |
| Technique | Module isole, pas d'impact sur factures existantes | 0 regression factures |

---

## Utilisateurs Concernes

| Persona | Benefice Principal | Frequence d'utilisation | Priorite |
|---------|-------------------|------------------------|----------|
| Admin (compte_prive) | Cree et gere les proformes, convertit en facture | Quotidien | Haute |
| Manager (compte_prive) | Cree et gere les proformes, convertit en facture | Quotidien | Haute |
| Caissier (compte_prive) | Cree des proformes, impression | Quotidien | Haute |
| Client (destinataire) | Consulte la proforma via lien public | Occasionnel | Moyenne |

### Parcours Utilisateur Principal (Creation Proforma)
```
1. Page Factures → Onglet "Proformes" (visible si compte_prive)
   ↓
2. Bouton "+ Nouvelle Proforma" → Ouvre modal/page creation
   ↓
3. Selection produits (meme interface que commande) + Selection client obligatoire
   ↓
4. Validation → Proforma creee (statut BROUILLON, stock NON mouvemente)
   ↓
5. Actions : Imprimer / Partager lien / Modifier / Convertir en Facture / Supprimer
```

### Parcours Conversion Proforma → Facture
```
1. Liste proformes → Clic "Convertir en facture" sur proforma ACCEPTEE ou BROUILLON
   ↓
2. Modal confirmation avec resume articles + montants
   ↓
3. Validation → Facture reelle creee (stock mouvemente) + Proforma passe en statut CONVERTIE
   ↓
4. Redirection vers facture creee (ou retour liste avec toast succes)
```

---

## Exigences Fonctionnelles

### EPIC 1 : Base de Donnees & API Proformes

#### FR-001 : Table proforma + proforma_details
| Champ | Valeur |
|-------|--------|
| **ID** | FR-001 |
| **Priorite** | Must Have |

**Description :**
Creer les tables PostgreSQL `proforma` et `proforma_details` pour stocker les factures proformes independamment des factures.

**Schema table `proforma` :**
```sql
- id_proforma        SERIAL PRIMARY KEY
- num_proforma       VARCHAR(50) UNIQUE    -- Format: PRO-{id_structure}-{sequence}
- id_structure       INTEGER NOT NULL      -- FK structures
- date_proforma      DATE NOT NULL
- tel_client         VARCHAR(20) NOT NULL
- nom_client         VARCHAR(255) NOT NULL
- description        TEXT
- montant            NUMERIC(12,2)         -- Sous-total brut
- mt_remise          NUMERIC(12,2) DEFAULT 0
- montant_net        NUMERIC(12,2)         -- montant - remise
- id_etat            INTEGER DEFAULT 1     -- 1=BROUILLON, 2=ACCEPTEE, 3=CONVERTIE
- id_facture_liee    INTEGER DEFAULT NULL   -- FK factures (apres conversion)
- id_utilisateur     INTEGER               -- Createur
- date_creation      TIMESTAMP DEFAULT NOW()
- date_modification  TIMESTAMP DEFAULT NOW()
```

**Schema table `proforma_details` :**
```sql
- id_detail          SERIAL PRIMARY KEY
- id_proforma        INTEGER NOT NULL      -- FK proforma
- id_produit         INTEGER NOT NULL      -- FK produits
- nom_produit        VARCHAR(255)
- quantite           INTEGER NOT NULL
- prix_unitaire      NUMERIC(12,2) NOT NULL
- sous_total         NUMERIC(12,2)         -- quantite * prix_unitaire
```

**Criteres d'Acceptance :**
- [ ] Tables creees avec contraintes FK et index
- [ ] Table `etat_proforma` avec valeurs : BROUILLON, ACCEPTEE, CONVERTIE
- [ ] Index sur (id_structure, id_etat) pour performance
- [ ] Sequence de numerotation PRO-{id_structure}-XXXX

---

#### FR-002 : Fonction creation proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-002 |
| **Priorite** | Must Have |

**Description :**
Fonction PostgreSQL `create_proforma(...)` qui cree une proforma avec ses details SANS mouvementer le stock.

**Signature :**
```sql
create_proforma(
  p_id_structure    INTEGER,
  p_date_proforma   DATE,
  p_tel_client      VARCHAR,
  p_nom_client      VARCHAR,
  p_description     TEXT,
  p_montant         NUMERIC,
  p_articles_string TEXT,    -- Format: "id_produit-quantite-prix#id_produit-quantite-prix#"
  p_mt_remise       NUMERIC DEFAULT 0,
  p_id_utilisateur  INTEGER DEFAULT 0
) RETURNS TABLE(id_proforma INTEGER, num_proforma VARCHAR, success BOOLEAN, message TEXT)
```

**Criteres d'Acceptance :**
- [ ] Proforma creee avec num_proforma genere automatiquement
- [ ] Details inseres dans proforma_details
- [ ] AUCUN mouvement de stock
- [ ] Retourne JSON avec id_proforma, num_proforma, success, message

---

#### FR-003 : Fonction edition proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-003 |
| **Priorite** | Must Have |

**Description :**
Fonction PostgreSQL `edit_proforma(...)` qui modifie une proforma existante (articles, client, montants). Uniquement si statut BROUILLON ou ACCEPTEE (pas CONVERTIE).

**Signature :**
```sql
edit_proforma(
  p_id_proforma     INTEGER,
  p_id_structure    INTEGER,
  p_tel_client      VARCHAR DEFAULT NULL,
  p_nom_client      VARCHAR DEFAULT NULL,
  p_description     TEXT DEFAULT NULL,
  p_montant         NUMERIC DEFAULT NULL,
  p_articles_string TEXT DEFAULT NULL,    -- Si fourni, remplace tous les details
  p_mt_remise       NUMERIC DEFAULT NULL,
  p_id_etat         INTEGER DEFAULT NULL  -- Pour changer le statut
) RETURNS JSON  -- {success, message}
```

**Criteres d'Acceptance :**
- [ ] Modification uniquement si statut != CONVERTIE
- [ ] Si articles_string fourni : supprime anciens details + insere nouveaux
- [ ] Met a jour date_modification
- [ ] Retourne JSON {success, message}

---

#### FR-004 : Fonction suppression proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-004 |
| **Priorite** | Must Have |

**Description :**
Fonction PostgreSQL `delete_proforma(...)` qui supprime une proforma et ses details. Uniquement si statut BROUILLON ou ACCEPTEE.

**Signature :**
```sql
delete_proforma(
  p_id_proforma   INTEGER,
  p_id_structure  INTEGER    -- Securite : verification appartenance
) RETURNS JSON  -- {success, message}
```

**Criteres d'Acceptance :**
- [ ] Suppression uniquement si statut != CONVERTIE
- [ ] Supprime proforma_details en cascade
- [ ] Verification que la proforma appartient a la structure
- [ ] Retourne JSON {success, message}

---

#### FR-005 : Fonction conversion proforma → facture
| Champ | Valeur |
|-------|--------|
| **ID** | FR-005 |
| **Priorite** | Must Have |

**Description :**
Fonction PostgreSQL `convert_proforma_to_facture(...)` qui cree une facture reelle a partir d'une proforma, mouvemente le stock, et met la proforma en statut CONVERTIE.

**Signature :**
```sql
convert_proforma_to_facture(
  p_id_proforma    INTEGER,
  p_id_structure   INTEGER,
  p_id_utilisateur INTEGER DEFAULT 0
) RETURNS TABLE(id_facture INTEGER, num_facture VARCHAR, success BOOLEAN, message TEXT)
```

**Logique interne :**
1. Verifie que proforma existe et statut != CONVERTIE
2. Lit les details de la proforma
3. Appelle `create_facture_complete1(...)` avec les memes articles (est_devis=false)
4. Met a jour proforma : id_etat=3 (CONVERTIE), id_facture_liee = nouvelle facture
5. Retourne info facture creee

**Criteres d'Acceptance :**
- [ ] Facture creee avec les memes articles/montants que la proforma
- [ ] Stock mouvemente correctement via create_facture_complete1
- [ ] Proforma passe en statut CONVERTIE avec reference facture
- [ ] Impossible de convertir une proforma deja convertie
- [ ] Retourne id_facture et num_facture de la facture creee

---

#### FR-006 : Fonction liste proformes
| Champ | Valeur |
|-------|--------|
| **ID** | FR-006 |
| **Priorite** | Must Have |

**Description :**
Fonction PostgreSQL `get_list_proformas(...)` ou vue SQL qui retourne la liste des proformes d'une structure.

**Signature :**
```sql
get_list_proformas(
  p_id_structure  INTEGER
) RETURNS TABLE(...)
-- Retourne: id_proforma, num_proforma, date_proforma, nom_client, tel_client,
--   montant, mt_remise, montant_net, libelle_etat, id_etat, nb_articles,
--   id_facture_liee, date_creation, date_modification
```

**Criteres d'Acceptance :**
- [ ] Liste triee par date_creation DESC
- [ ] Inclut le libelle de l'etat (BROUILLON, ACCEPTEE, CONVERTIE)
- [ ] Inclut nombre d'articles par proforma
- [ ] Filtre par id_structure pour securite

---

#### FR-007 : Fonction details proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-007 |
| **Priorite** | Must Have |

**Description :**
Fonction PostgreSQL `get_proforma_details(...)` qui retourne une proforma complete avec ses articles.

**Signature :**
```sql
get_proforma_details(
  p_id_proforma   INTEGER,
  p_id_structure  INTEGER
) RETURNS JSON
-- Retourne: {proforma: {...}, details: [{...}], resume: {nb_articles, total_quantite, total_montant}}
```

**Criteres d'Acceptance :**
- [ ] Retourne proforma + details articles + resume
- [ ] Verification securite id_structure
- [ ] Format JSON compatible avec le frontend

---

### EPIC 2 : Service Frontend & Types TypeScript

#### FR-008 : Service proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-008 |
| **Priorite** | Must Have |

**Description :**
Creer `services/proforma.service.ts` avec methodes CRUD + conversion.

**Methodes :**
```typescript
class ProformaService {
  createProforma(articles, clientInfo, montants): Promise<CreateProformaResponse>
  getListProformas(): Promise<ProformaListResponse>
  getProformaDetails(idProforma): Promise<ProformaComplete>
  editProforma(idProforma, data): Promise<{success, message}>
  deleteProforma(idProforma): Promise<{success, message}>
  convertToFacture(idProforma): Promise<ConvertProformaResponse>
  updateStatut(idProforma, statut): Promise<{success, message}>
}
```

**Criteres d'Acceptance :**
- [ ] Singleton pattern coherent avec les autres services
- [ ] Gestion d'erreurs avec ProformaApiException
- [ ] Cache 5 min pour getListProformas
- [ ] Invalidation cache apres create/edit/delete/convert

---

#### FR-009 : Types TypeScript proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-009 |
| **Priorite** | Must Have |

**Description :**
Creer `types/proforma.ts` avec toutes les interfaces necessaires.

**Interfaces :**
```typescript
interface Proforma {
  id_proforma: number;
  num_proforma: string;
  id_structure: number;
  date_proforma: string;
  tel_client: string;
  nom_client: string;
  description: string;
  montant: number;
  mt_remise: number;
  montant_net: number;
  id_etat: number;
  libelle_etat: 'BROUILLON' | 'ACCEPTEE' | 'CONVERTIE';
  id_facture_liee: number | null;
  nb_articles: number;
  date_creation: string;
  date_modification: string;
}

interface ProformaDetail { ... }
interface ProformaComplete { proforma, details, resume }
interface ProformaListResponse { proformas: Proforma[], resume: {...} }
interface CreateProformaResponse { success, id_proforma, num_proforma, message }
interface ConvertProformaResponse { success, id_facture, num_facture, message }
```

**Criteres d'Acceptance :**
- [ ] Types coherents avec les retours PostgreSQL
- [ ] Export centralise

---

### EPIC 3 : Interface Utilisateur (Onglet Proformes)

#### FR-010 : Onglet Proformes dans page Factures
| Champ | Valeur |
|-------|--------|
| **ID** | FR-010 |
| **Priorite** | Must Have |

**Description :**
Ajouter un 3eme onglet "Proformes" dans le composant `FacturesOnglets` visible uniquement si `compte_prive = true`. Design glassmorphism coherent avec les onglets existants.

**Criteres d'Acceptance :**
- [ ] Onglet "Proformes" avec icone FileCheck (lucide) et couleur orange/amber
- [ ] Visible uniquement si `structure.param_structure.compte_prive === true`
- [ ] Badge compteur nombre de proformes
- [ ] Animation layoutId coherente avec les 2 autres onglets
- [ ] Responsive mobile/desktop

---

#### FR-011 : Liste des proformes (mobile)
| Champ | Valeur |
|-------|--------|
| **ID** | FR-011 |
| **Priorite** | Must Have |

**Description :**
Composant `ProformasList` affichant les proformes en cartes (meme pattern que FacturesList). Chaque carte affiche : num_proforma, client, montant, statut (badge colore), date, actions.

**Badges statut :**
- BROUILLON → gris/bleu
- ACCEPTEE → vert
- CONVERTIE → violet (avec lien vers facture)

**Actions par carte :**
- Voir details
- Modifier (si pas CONVERTIE)
- Imprimer
- Partager (lien public)
- Convertir en facture (si pas CONVERTIE)
- Supprimer (si pas CONVERTIE)

**Criteres d'Acceptance :**
- [ ] Cartes glassmorphism coherentes avec FactureCard
- [ ] Badges statut colores
- [ ] Actions contextuelles selon statut
- [ ] Filtrage par statut (TOUS, BROUILLON, ACCEPTEE, CONVERTIE)
- [ ] Recherche par numero ou nom client
- [ ] Pagination

---

#### FR-012 : Vue desktop proformes
| Champ | Valeur |
|-------|--------|
| **ID** | FR-012 |
| **Priorite** | Must Have |

**Description :**
Composant `ProformasDesktopView` pour la vue desktop (tableau). Meme pattern que `FacturesDesktopView`.

**Criteres d'Acceptance :**
- [ ] Tableau avec colonnes : N°, Date, Client, Articles, Montant, Remise, Net, Statut, Actions
- [ ] Tri par colonnes
- [ ] Actions inline (boutons icones)
- [ ] Responsive lg+ breakpoint

---

#### FR-013 : Modal creation proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-013 |
| **Priorite** | Must Have |

**Description :**
Modal de creation de proforma. Reutilise le meme workflow que la creation de commande/facture : selection produits depuis catalogue, selection client obligatoire, remise optionnelle.

**Sections du modal :**
1. **Selection client** (obligatoire) — recherche par tel/nom
2. **Selection produits** — recherche + scan code-barres + ajout quantite
3. **Resume** — sous-total, remise, montant net
4. **Bouton "Creer Proforma"**

**Criteres d'Acceptance :**
- [ ] Client obligatoire (pas de CLIENT_ANONYME)
- [ ] Selection produits identique a la commande (avec code-barres filter pattern)
- [ ] Remise globale supportee
- [ ] PAS d'acompte (pas de champ acompte)
- [ ] Stock NON impacte a la creation
- [ ] Toast succes avec num_proforma
- [ ] Redirect vers details ou retour liste

---

#### FR-014 : Modal edition proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-014 |
| **Priorite** | Must Have |

**Description :**
Modal d'edition reprenant les memes champs que la creation, pre-remplis avec les donnees existantes. Disponible uniquement si statut != CONVERTIE.

**Criteres d'Acceptance :**
- [ ] Pre-remplissage de tous les champs
- [ ] Modification client, articles, remise
- [ ] Ajout/suppression d'articles
- [ ] Sauvegarde avec toast succes
- [ ] Bloquer si statut CONVERTIE

---

#### FR-015 : Modal details proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-015 |
| **Priorite** | Must Have |

**Description :**
Modal affichant les details complets d'une proforma : info client, liste articles, montants, statut, historique. Si CONVERTIE, lien vers la facture liee.

**Criteres d'Acceptance :**
- [ ] Affichage complet proforma + articles
- [ ] Badge statut visible
- [ ] Si CONVERTIE : lien vers facture liee (num_facture cliquable)
- [ ] Boutons actions selon statut (Modifier, Imprimer, Convertir, Supprimer)

---

#### FR-016 : Modal conversion proforma → facture
| Champ | Valeur |
|-------|--------|
| **ID** | FR-016 |
| **Priorite** | Must Have |

**Description :**
Modal de confirmation avant conversion. Affiche resume des articles, montants, et avertissement que le stock sera mouvemente.

**Criteres d'Acceptance :**
- [ ] Resume articles + montants
- [ ] Avertissement : "Le stock sera mis a jour"
- [ ] Verification stock disponible avant conversion
- [ ] Bouton "Confirmer la conversion"
- [ ] Toast succes avec num_facture creee
- [ ] Proforma passe en CONVERTIE automatiquement

---

#### FR-017 : Suppression proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-017 |
| **Priorite** | Must Have |

**Description :**
Confirmation de suppression avec modal. Uniquement si statut != CONVERTIE.

**Criteres d'Acceptance :**
- [ ] Modal confirmation "Etes-vous sur ?"
- [ ] Suppression proforma + details
- [ ] Bloquer si statut CONVERTIE
- [ ] Toast succes + refresh liste

---

### EPIC 4 : Impression & Partage

#### FR-018 : Impression proforma
| Champ | Valeur |
|-------|--------|
| **ID** | FR-018 |
| **Priorite** | Must Have |

**Description :**
Impression de la proforma au meme format que les factures (Personnalise/Standard via `config_facture`), avec titre "FACTURE PROFORMA" au lieu de "FACTURE".

**Criteres d'Acceptance :**
- [ ] Integration avec ModalImpressionDocuments existant
- [ ] Titre "FACTURE PROFORMA" sur le document
- [ ] Numero PRO-XXX affiche
- [ ] Statut (BROUILLON/ACCEPTEE) affiche
- [ ] Mention "Ce document n'est pas une facture" en bas
- [ ] Format Personnalise (config_facture) et Standard supportes
- [ ] Impression ticket 80mm via generate-ticket-html.ts avec badge "PROFORMA"

---

#### FR-019 : Partage proforma par lien public
| Champ | Valeur |
|-------|--------|
| **ID** | FR-019 |
| **Priorite** | Should Have |

**Description :**
Permettre le partage d'une proforma via un lien public consultable sans authentification (meme pattern que les factures publiques).

**Criteres d'Acceptance :**
- [ ] URL type : `/proforma?id_structure=XXX&id_proforma=YYY`
- [ ] Page publique affichant proforma complete
- [ ] Pas de bouton paiement (c'est un devis, pas une facture)
- [ ] Bouton "Telecharger PDF" ou "Imprimer"
- [ ] Design coherent avec la page facture publique

---

### EPIC 5 : Stats & Integration Dashboard

#### FR-020 : Stats proformes dans l'onglet
| Champ | Valeur |
|-------|--------|
| **ID** | FR-020 |
| **Priorite** | Should Have |

**Description :**
Cartes statistiques en haut de l'onglet Proformes : total proformes, montant total, brouillons en cours, converties ce mois.

**Criteres d'Acceptance :**
- [ ] 4 cartes stats glassmorphism
- [ ] Total proformes (tous statuts)
- [ ] Montant total (hors converties)
- [ ] En attente (BROUILLON + ACCEPTEE)
- [ ] Converties ce mois
- [ ] Masquage montants si canViewCA = false (profil CAISSIER)

---

## Exigences Non-Fonctionnelles

### Performance
| Critere | Exigence | Priorite |
|---------|----------|----------|
| Temps chargement liste | < 2 secondes | Must Have |
| Temps creation proforma | < 3 secondes | Must Have |
| Temps conversion → facture | < 5 secondes | Must Have |
| Cache liste proformes | 5 min (coherent avec factures) | Must Have |

### Securite
- [x] Authentification requise : Oui (sauf page publique)
- [x] Niveau de permission : ADMIN, MANAGER, CAISSIER (tous avec compte_prive)
- [x] Verification id_structure sur chaque requete
- [x] Pas d'injection SQL (fonctions PostgreSQL parametrees)

### Compatibilite
| Environnement | Support | Notes |
|---------------|---------|-------|
| Mobile (PWA) | Requis | Vue cartes responsive |
| Desktop | Requis | Vue tableau + cartes |
| Offline | Non requis | Connexion necessaire |
| Navigateurs | Chrome, Safari, Firefox | |

### Usabilite
- Interface en francais
- Design glassmorphism coherent avec le reste de l'app
- Icones explicites (lucide-react)
- Feedback visuel (toast, animations framer-motion)
- Pattern scan code-barres avec filter() (pas find())

---

## Dependances

### Dependances Internes
| Fonctionnalite/Module | Type | Statut |
|-----------------------|------|--------|
| Systeme Factures existant | Reference pattern | Disponible |
| Panier (panierStore) | Reutilisation possible | Disponible |
| ModalImpressionDocuments | Extension | Disponible |
| generate-ticket-html.ts | Extension (badge PROFORMA) | Disponible |
| Recherche clients | Reutilisation | Disponible |
| Scan code-barres | Reutilisation | Disponible |
| config_facture / info_facture | Reutilisation impression | Disponible |

### Dependances Externes
| Service/API | Usage | Documentation |
|-------------|-------|---------------|
| PostgreSQL (154.12.224.173:3253) | Tables + Fonctions | DBA Agent |
| API DatabaseService | Requetes SQL | services/database.service.ts |

### Dependances Base de Donnees (a creer)
```sql
-- Tables a creer
proforma
proforma_details
etat_proforma (ou utiliser constantes)

-- Fonctions PostgreSQL a creer
create_proforma(...)
edit_proforma(...)
delete_proforma(...)
convert_proforma_to_facture(...)
get_list_proformas(...)
get_proforma_details(...)
```

---

## Risques et Mitigations

| ID | Risque | Probabilite | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| R1 | Stock mouvemente par erreur a la creation | Faible | Eleve | Fonction create_proforma dediee, aucun appel aux fonctions de stock |
| R2 | Conversion double d'une proforma | Faible | Moyen | Verif statut != CONVERTIE dans la fonction + contrainte unique |
| R3 | Proforma avec produits supprimes | Moyenne | Faible | Stocker nom_produit + prix dans proforma_details (snapshot) |
| R4 | Performance avec beaucoup de proformes | Faible | Moyen | Index sur (id_structure, id_etat), pagination |

---

## Matrice de Tracabilite

| Epic | Nom | FRs | Estimation Stories |
|------|-----|-----|-------------------|
| EPIC-1 | Base de Donnees & API | FR-001 a FR-007 | 7 stories |
| EPIC-2 | Service Frontend & Types | FR-008, FR-009 | 2 stories |
| EPIC-3 | Interface Utilisateur | FR-010 a FR-017 | 8 stories |
| EPIC-4 | Impression & Partage | FR-018, FR-019 | 2 stories |
| EPIC-5 | Stats & Integration | FR-020 | 1 story |
| **Total** | | **20 FRs** | **~20 stories** |

### Priorites
- **Must Have** : 18 FRs (FR-001 a FR-018, FR-020)
- **Should Have** : 2 FRs (FR-019, FR-020)

---

## Criteres de Validation Globaux (Definition of Done)

### Fonctionnel
- [ ] Toutes les user stories implementees
- [ ] Tous les criteres d'acceptance valides
- [ ] Tests manuels sur mobile + desktop

### Technique
- [ ] Fonctions PostgreSQL creees et testees
- [ ] Service proforma.service.ts fonctionnel
- [ ] Types TypeScript complets
- [ ] Pas de regression sur factures existantes

### UX
- [ ] Design glassmorphism coherent
- [ ] Responsive mobile-first
- [ ] Impression format Personnalise + Standard
- [ ] Ticket 80mm avec badge PROFORMA

### Deploiement
- [ ] Build production sans erreur
- [ ] Deploye sur v2.fayclick.net
- [ ] Test avec compte prive reel

---

## Plan d'Implementation (Equipe)

| Phase | Responsable | Taches | Dependances |
|-------|------------|--------|-------------|
| 1. DB | DBA Expert | Tables + Fonctions PostgreSQL (FR-001 a FR-007) | Aucune |
| 2. Types & Service | Fullstack | types/proforma.ts + proforma.service.ts (FR-008, FR-009) | Phase 1 |
| 3. UI Onglet + Liste | Fullstack + UX | Onglet, Liste, Filtres (FR-010 a FR-012) | Phase 2 |
| 4. CRUD UI | Fullstack | Modals creation/edition/details/suppression (FR-013 a FR-017) | Phase 3 |
| 5. Impression | Fullstack | Integration impression + partage (FR-018, FR-019) | Phase 4 |
| 6. Stats | Fullstack | Cartes stats proformes (FR-020) | Phase 2 |
| 7. Tests & Deploy | QA | Tests complets + deploiement | Toutes |

---

## Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-03-13 | 1.0 | Claude Code (BMAD) | Creation initiale |
