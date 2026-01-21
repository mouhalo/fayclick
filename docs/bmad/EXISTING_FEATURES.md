# FayClick V2 - Fonctionnalités Existantes

> **Document BMAD** | Version: 1.0 | Dernière mise à jour: 2026-01-21
> **Phase**: 2 complétée | **Statut**: Production (v2.fayclick.net)

---

## 1. Vue d'Ensemble

FayClick V2 est une **Super App PWA** multi-segments avec les modules suivants :

| Module | Statut | Routes |
|--------|--------|--------|
| Core (Auth/PWA) | ✅ Complet | `/login`, `/register`, `/settings` |
| Commerce | ✅ Complet | `/dashboard/commerce/*` |
| Scolaire | ✅ Base | `/dashboard/scolaire` |
| Immobilier | ✅ Base | `/dashboard/immobilier` |
| Prestataires | ✅ Complet | `/dashboard/services/*` |
| Admin | ✅ Complet | `/dashboard/admin` |
| Partenaire | ✅ Complet | `/dashboard/partenaire` |

---

## 2. Module Core

### 2.1 Authentification
| Feature | Service | Route | Statut |
|---------|---------|-------|--------|
| Login | `auth.service.ts` | `/login` | ✅ |
| Register | `registration.service.ts` | `/register` | ✅ |
| JWT Token | `auth.service.ts` | - | ✅ |
| Permissions | `AuthContext` | - | ✅ |
| Change Password | `auth.service.ts` | `/settings` | ✅ |

**Fonctions PostgreSQL** :
- `check_user_credentials(login, pwd)`
- `get_mes_droits(id_structure, id_profil)`

### 2.2 PWA (Progressive Web App)
| Feature | Fichier | Statut |
|---------|---------|--------|
| Service Worker | `public/service-worker.js` | ✅ |
| Installation intelligente | `PWAInstallProvider.tsx` | ✅ |
| Mode Offline | `useBackgroundSync.ts` | ✅ |
| Cache assets | Service Worker | ✅ |
| Background Sync | IndexedDB | ✅ |

### 2.3 Gestion Structure
| Feature | Route | Statut |
|---------|-------|--------|
| Profil structure | `/structure/gestion` | ✅ |
| Upload logo | `logo-upload.service.ts` | ✅ |
| Modification infos | `add_edit_structure()` | ✅ |

---

## 3. Module Commerce

**Route principale** : `/dashboard/commerce`

### 3.1 Gestion Produits
| Feature | Route | Service | Statut |
|---------|-------|---------|--------|
| Liste produits | `/commerce/produits` | `produits.service.ts` | ✅ |
| CRUD produit | Modal | `add_edit_produit()` | ✅ |
| Photos produits | Modal | `add_edit_photo()` | ✅ |
| Catégories | Filtre | - | ✅ |
| Stock/Inventaire | `/commerce/inventaire` | `inventaire.service.ts` | ✅ |
| Export CSV | Bouton | `produits-print.service.ts` | ✅ |
| Présentation public | Toggle | `presente_au_public` | ✅ |

### 3.2 Gestion Clients
| Feature | Route | Service | Statut |
|---------|-------|---------|--------|
| Liste clients | `/commerce/clients` | `clients.service.ts` | ✅ |
| Recherche intelligente | Input | `get_list_clients()` | ✅ |
| CRUD client | Modal | `add_edit_client()` | ✅ |
| Stats par client | Accordion | Calculées | ✅ |
| Export CSV | Bouton | - | ✅ |
| Impression | Bouton | - | ✅ |
| Filtres avancés | - | - | ✅ |

### 3.3 Facturation
| Feature | Route | Service | Statut |
|---------|-------|---------|--------|
| Liste factures | `/commerce/factures` | `facture-list.service.ts` | ✅ |
| Création facture | Modal Panier | `facture.service.ts` | ✅ |
| Détails facture | Modal | `facture-privee.service.ts` | ✅ |
| Impression | Bouton | - | ✅ |
| Partage lien public | Bouton | `/facture?token=` | ✅ |
| États (Payée/Impayée) | Badge | `id_etat` | ✅ |

**Panier** (Zustand Store) :
- Ajout/suppression articles
- Quantités modifiables
- Remise globale
- Acompte
- Client associé

### 3.4 VenteFlash (Ventes Rapides)
| Feature | Route | Statut |
|---------|-------|--------|
| Client anonyme | `/commerce/venteflash` | ✅ |
| Encaissement CASH immédiat | - | ✅ |
| Facture auto-payée | - | ✅ |

**Workflow** :
1. Sélection produits → Panier
2. Validation → `create_facture_complete1()`
3. Encaissement → `add_acompte_facture()` avec `uuid='face2face'`

### 3.5 Dépenses
| Feature | Route | Service | Statut |
|---------|-------|---------|--------|
| Liste dépenses | `/commerce/depenses` | `depense.service.ts` | ✅ |
| CRUD dépense | Modal | `add_edit_depense()` | ✅ |
| Types dépenses | Select | `type_depense` | ✅ |
| Filtres période | - | `YYYY-MM` | ✅ |

### 3.6 Inventaire
| Feature | Route | Service | Statut |
|---------|-------|---------|--------|
| Mouvements stock | `/commerce/inventaire` | `inventaire.service.ts` | ✅ |
| Entrées/Sorties | Modal | - | ✅ |
| Alertes stock bas | Badge | `seuil_min_stock` | ✅ |

---

## 4. Module Paiements

### 4.1 Wallet KALPE (Coffre-Fort)
| Feature | Composant | Service | Statut |
|---------|-----------|---------|--------|
| Soldes OM/WAVE/FREE | `WalletFlipCard.tsx` | `wallet.service.ts` | ✅ |
| Historique transactions | `ModalCoffreFort.tsx` | `get_wallet_structure()` | ✅ |
| CA Global | Onglet | - | ✅ |

**Fonctions PostgreSQL** :
- `get_soldes_wallet_structure(id_structure)`
- `get_wallet_structure(id_structure)`

### 4.2 Paiements Mobile Money
| Feature | Service | API | Statut |
|---------|---------|-----|--------|
| Orange Money | `payment-wallet.service.ts` | OFMS | ✅ |
| Wave | `payment-wallet.service.ts` | INTOUCH | ✅ |
| Free Money | `payment-wallet.service.ts` | OFMS | ✅ |
| QR Code | `ModalPaiementQRCode.tsx` | - | ✅ |
| Polling statut | `startPolling()` | - | ✅ |

### 4.3 Retraits Wallet
| Feature | Composant | Service | Statut |
|---------|-----------|---------|--------|
| Flip Card retrait | `WalletFlipCard.tsx` | `retrait.service.ts` | ✅ |
| OTP SMS | `OTPInput.tsx` | `sms.service.ts` | ✅ |
| API send_cash | - | `send_cash` | ✅ |
| Validation 3 tentatives | - | - | ✅ |

**Workflow Retrait** :
1. Clic carte (solde > 0) → Flip
2. Saisie montant (min 100 FCFA)
3. Envoi OTP via `send_o_sms`
4. Validation OTP (5 chiffres, 2 min, 3 essais)
5. Appel `send_cash` API
6. Si SUCCESS → `add_retrait_marchand()`

### 4.4 Factures Publiques
| Feature | Route | Service | Statut |
|---------|-------|---------|--------|
| Visualisation | `/facture?token=` | `facture-publique.service.ts` | ✅ |
| Paiement sans auth | Modal | `addAcomptePublique()` | ✅ |
| QR Code paiement | - | - | ✅ |

---

## 5. Module Abonnements

| Feature | Service | Statut |
|---------|---------|--------|
| Formule MENSUEL | `subscription.service.ts` | ✅ |
| Formule ANNUEL | `subscription.service.ts` | ✅ |
| Calcul montant | `calculer_montant_abonnement()` | ✅ |
| Paiement wallet | `createSubscriptionPaymentDirect()` | ✅ |
| Renouvellement | `renouveler_abonnement()` | ✅ |
| Historique | `historique_abonnements_structure()` | ✅ |

---

## 6. Module Prestataires de Services

**Route principale** : `/dashboard/services`

| Feature | Route | Service | Statut |
|---------|-------|---------|--------|
| Dashboard | `/services` | `dashboard.service.ts` | ✅ |
| Gestion services | `/services/services` | - | ✅ |
| Gestion clients | `/services/clients` | `clients.service.ts` | ✅ |
| Prestations | `/services/prestations` | `prestation.service.ts` | ✅ |
| Devis | `/services/devis` | - | ✅ |
| Factures | `/services/factures` | - | ✅ |

---

## 7. Module Scolaire

**Route principale** : `/dashboard/scolaire`

| Feature | Statut | Notes |
|---------|--------|-------|
| Dashboard | ✅ Base | Stats élèves, paiements |
| Gestion élèves | 🔄 Partiel | Via clients |
| Frais scolarité | ✅ | Via factures |

**Données spécifiques** :
- `total_eleves`
- `mt_total_factures`
- `mt_total_payees`
- `mt_total_impayees`

---

## 8. Module Immobilier

**Route principale** : `/dashboard/immobilier`

| Feature | Statut | Notes |
|---------|--------|-------|
| Dashboard | ✅ Base | Stats locataires |
| Gestion locataires | 🔄 Partiel | Via clients |
| Loyers | ✅ | Via factures |

---

## 9. Module Admin

**Route principale** : `/dashboard/admin`

| Feature | Service | Statut |
|---------|---------|--------|
| Liste structures | `admin.service.ts` | ✅ |
| Détail structure | Modal | ✅ |
| Statistiques globales | - | ✅ |
| Gestion partenaires | `/dashboard/partenaire` | ✅ |
| Tri colonnes | TableHeader | ✅ |

---

## 10. Pages Publiques

| Page | Route | Description | Statut |
|------|-------|-------------|--------|
| Landing | `/` | Segments métier | ✅ |
| Login | `/login` | Connexion | ✅ |
| Register | `/register` | Inscription | ✅ |
| Facture publique | `/facture` | Lien partageable | ✅ |
| Catalogue | `/catalogue` | Catalogue structure | ✅ |
| Catalogues | `/catalogues` | Liste catalogues | ✅ |
| Reçu | `/recu` | Reçu paiement | ✅ |
| Offline | `/offline` | Mode hors-ligne | ✅ |

---

## 11. Services Techniques

### Services Core
| Service | Rôle |
|---------|------|
| `database.service.ts` | Requêtes PostgreSQL via API |
| `auth.service.ts` | Authentification JWT |
| `http.service.ts` | Wrapper fetch |
| `security.service.ts` | Masquage données sensibles |

### Services Métier
| Service | Rôle |
|---------|------|
| `clients.service.ts` | CRUD clients |
| `produits.service.ts` | CRUD produits |
| `facture.service.ts` | Création factures |
| `facture-list.service.ts` | Liste factures |
| `payment-wallet.service.ts` | Paiements OM/Wave/Free |
| `wallet.service.ts` | Soldes KALPE |
| `retrait.service.ts` | Retraits wallet |
| `subscription.service.ts` | Abonnements |
| `sms.service.ts` | Envoi SMS |

---

## 12. Composants Clés

### UI Components
| Composant | Usage |
|-----------|-------|
| `Button.tsx` | Boutons gradient/glassmorphism |
| `Card.tsx` | Cartes avec hover |
| `Modal.tsx` | Modals backdrop blur |
| `TableHeader.tsx` | En-têtes triables |

### Pattern Components
| Composant | Usage |
|-----------|-------|
| `ResponsiveCard` | Cartes adaptatives |
| `PageContainer` | Wrapper pages |
| `TouchCarousel` | Carousel tactile |

### Feature Components
| Composant | Usage |
|-----------|-------|
| `ModalCoffreFort.tsx` | Wallet 3 onglets |
| `WalletFlipCard.tsx` | Carte flip 3D |
| `OTPInput.tsx` | Saisie OTP |
| `ModalPaiementQRCode.tsx` | Paiement wallet |
| `PanierDrawer.tsx` | Panier latéral |

---

## 13. Hooks Personnalisés

| Hook | Usage |
|------|-------|
| `useAuth()` | État authentification |
| `usePermissions()` | Vérification droits |
| `useStructure()` | Données structure |
| `useBreakpoint()` | Responsive |
| `useTouch()` | Gestion tactile |
| `useDashboardData()` | Stats dashboard |
| `useWalletStructure()` | Soldes wallet |
| `useBackgroundSync()` | Sync offline |

---

## 14. Stores Zustand

| Store | Usage |
|-------|-------|
| `panierStore.ts` | Panier avec persistence |

**Fonctionnalités** :
- Articles, quantités
- Client associé
- Remise, acompte
- Auto-reset client si panier vidé
- Persistence localStorage

---

## 15. Métriques Clés

| Métrique | Valeur | Source |
|----------|--------|--------|
| Pages | 31 | `app/**/page.tsx` |
| Services | 36 | `services/*.service.ts` |
| Segments métier | 4 | Commerce, Scolaire, Immo, Services |
| Intégrations paiement | 3 | OM, Wave, Free |
| Fonctions PostgreSQL | 25+ | `fayclick_db` |

---

## 16. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | SUPER_BMAD_AGENT | Documentation initiale Reverse BMAD |
