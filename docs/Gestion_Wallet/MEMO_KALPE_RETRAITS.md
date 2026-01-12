# MEMO TECHNIQUE - Système KALPE & Retraits Wallet

## Vue d'ensemble

Le système **KALPE** est le coffre-fort financier de FayClick permettant aux structures de :
1. Visualiser leurs soldes wallet (OM, WAVE, FREE)
2. Consulter l'historique des transactions (encaissements/retraits)
3. Effectuer des retraits sécurisés vers leurs comptes mobile money

---

## Architecture des Fichiers

```
fayclick/
├── components/coffre-fort/
│   ├── ModalCoffreFort.tsx    # Modal principal avec 3 onglets (CA, KALPE, Transactions)
│   ├── WalletFlipCard.tsx     # Carte wallet avec animation flip pour retrait
│   └── OTPInput.tsx           # Composant de saisie OTP (5 chiffres)
├── services/
│   ├── wallet.service.ts      # Service pour récupérer soldes et historique
│   ├── retrait.service.ts     # Service pour effectuer les retraits
│   └── sms.service.ts         # Service pour envoi SMS (OTP)
├── hooks/
│   └── useWalletStructure.ts  # Hook React pour données wallet
├── types/
│   └── wallet.types.ts        # Interfaces TypeScript
└── docs/Gestion_Wallet/
    ├── Fonctions_SQL.txt      # Documentation fonctions PostgreSQL
    └── GEstion_REtraits.txt   # Documentation API retrait
```

---

## 1. Récupération des Données Wallet

### 1.1 Fonctions PostgreSQL

#### `get_soldes_wallet_structure(id_structure)`
Retourne les soldes simplifiés :
```json
{
  "solde_om": 1500,
  "solde_wave": 2300,
  "solde_free": 0,
  "solde_total": 3800
}
```

#### `get_wallet_structure(id_structure)`
Retourne les données complètes avec historique :
```json
{
  "success": true,
  "structure": {
    "id_structure": 183,
    "nom": "MA BOUTIQUE",
    "mobile_om": "777301221",
    "mobile_wave": "781234567"
  },
  "soldes": {
    "om": { "total_encaisse": 5000, "total_retire": 3500, "solde_disponible": 1500 },
    "wave": { "total_encaisse": 3000, "total_retire": 700, "solde_disponible": 2300 },
    "free": { "total_encaisse": 0, "total_retire": 0, "solde_disponible": 0 },
    "global": { "solde_disponible": 3800 }
  },
  "historique": {
    "paiements_recus": [...],
    "retraits_effectues": [...]
  }
}
```

### 1.2 Service Wallet (`wallet.service.ts`)

```typescript
import database from '@/services/database.service';

class WalletService {
  // Récupère soldes simplifiés
  async getSoldesWallet(idStructure: number): Promise<WalletSoldes> {
    const query = `SELECT * FROM get_soldes_wallet_structure(${idStructure});`;
    const results = await database.query(query);
    // ... parsing et retour
  }

  // Récupère données complètes avec historique
  async getWalletStructure(idStructure: number): Promise<WalletStructureData | null> {
    const query = `SELECT * FROM get_wallet_structure(${idStructure});`;
    const results = await database.query(query);
    // ... parsing et retour
  }

  // Transforme les données en transactions unifiées pour affichage
  transformToTransactions(paiements, retraits): WalletTransaction[] { ... }
}
```

### 1.3 Hook React (`useWalletStructure.ts`)

```typescript
const {
  soldes,           // WalletSoldes | null
  walletData,       // WalletStructureData | null
  transactions,     // WalletTransaction[]
  totaux,           // { totalRecus, totalRetraits, soldeNet }
  isLoading,
  refresh           // () => Promise<void>
} = useWalletStructure(idStructure);
```

---

## 2. Affichage dans le Modal Coffre-Fort

### 2.1 Structure du Modal (`ModalCoffreFort.tsx`)

Le modal a **3 onglets** :
- **CA Global** : Chiffre d'affaires, charges, marge
- **KALPE** : Soldes wallet avec cartes flip pour retrait
- **Transactions** : Historique des mouvements

### 2.2 Onglet KALPE

```tsx
// Récupération des numéros de téléphone de la structure
const { structure, contact } = useStructure();
const mobileOm = contact?.mobileOm || '';
const mobileWave = contact?.mobileWave || '';

// Affichage des cartes wallet
<WalletFlipCard
  type="OM"
  solde={soldes?.solde_om || 0}
  telephone={mobileOm}
  idStructure={structureId}
  nomStructure={nomStructure}
  onRetraitSuccess={refreshWallet}
/>

<WalletFlipCard
  type="WAVE"
  solde={soldes?.solde_wave || 0}
  telephone={mobileWave}
  // ...
/>

<WalletFlipCard
  type="FREE"
  solde={soldes?.solde_free || 0}
  telephone={mobileOm}  // FREE utilise le même numéro que OM
  // ...
/>
```

---

## 3. Composant WalletFlipCard

### 3.1 Comportement

- **Face avant** : Affiche logo, nom wallet, numéro de téléphone, solde disponible
- **Face arrière** : Formulaire de retrait avec étapes OTP
- **Flip activé** : Uniquement si `solde > 0`
- **Animation** : CSS 3D transform avec Framer Motion

### 3.2 États du retrait

```typescript
type RetraitStep = 'idle' | 'form' | 'otp' | 'processing' | 'success' | 'error';
```

1. **idle** : Carte affichée face avant
2. **form** : Carte flippée, saisie du montant
3. **otp** : Code OTP envoyé, saisie du code
4. **processing** : Traitement en cours (API)
5. **success** : Retrait réussi
6. **error** : Échec du retrait

### 3.3 Animation Flip CSS 3D

```tsx
// Conteneur avec perspective
<div style={{ perspective: '1000px' }}>
  <motion.div
    style={{ transformStyle: 'preserve-3d' }}
    animate={{ rotateY: isFlipped ? 180 : 0 }}
  >
    {/* Face avant */}
    <div style={{ backfaceVisibility: 'hidden' }}>...</div>

    {/* Face arrière */}
    <div style={{
      backfaceVisibility: 'hidden',
      transform: 'rotateY(180deg)'
    }}>...</div>
  </motion.div>
</div>
```

---

## 4. Workflow de Retrait Complet

### 4.1 Diagramme de flux

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW RETRAIT WALLET                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CLIC CARTE (solde > 0)                                      │
│         │                                                        │
│         ▼                                                        │
│  2. FLIP → Formulaire montant                                   │
│         │                                                        │
│         ▼                                                        │
│  3. VALIDATION MONTANT                                          │
│     • montant > 0                                                │
│     • montant <= solde                                           │
│     • montant >= 100 FCFA (minimum)                             │
│         │                                                        │
│         ▼                                                        │
│  4. ENVOI OTP (SMS)                                             │
│     • Génère code 5 chiffres                                    │
│     • Stocke session (expire 2 min)                             │
│     • Envoie via add_pending_sms()                              │
│         │                                                        │
│         ▼                                                        │
│  5. SAISIE OTP                                                  │
│     • 5 cases individuelles                                     │
│     • Max 3 tentatives                                          │
│         │                                                        │
│         ▼                                                        │
│  6. VÉRIFICATION OTP                                            │
│     • Compare avec session stockée                              │
│     • Vérifie expiration (2 min)                                │
│         │                                                        │
│         ▼                                                        │
│  7. APPEL API send_cash                                         │
│     • POST https://api.icelabsoft.com/pay_services/api/send_cash│
│     • Attend réponse SUCCESS                                    │
│         │                                                        │
│         ▼                                                        │
│  8. SAUVEGARDE BD                                               │
│     • Appel add_retrait_marchand()                              │
│     • Enregistre transaction                                    │
│         │                                                        │
│         ▼                                                        │
│  9. SUCCÈS → Refresh soldes                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Service Retrait (`retrait.service.ts`)

#### Génération et envoi OTP

```typescript
async sendOTP(
  idStructure: number,
  telephone: string,
  methode: 'OM' | 'WAVE' | 'FREE',
  montant: number
): Promise<{ success: boolean; message: string }> {
  // 1. Génère code 5 chiffres
  const code = Math.floor(10000 + Math.random() * 90000).toString();

  // 2. Stocke session (Map en mémoire)
  this.otpSessions.set(sessionKey, {
    code,
    expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
    attempts: 0
  });

  // 3. Envoie SMS
  const message = `FayClick: Code de confirmation retrait ${methodeName} de ${montant} FCFA. Code: ${code}. Valable 2 minutes.`;
  await SMSService.sendNotificationSMS(telephone, message);
}
```

#### Vérification OTP

```typescript
verifyOTP(idStructure: number, methode: string, code: string): { valid: boolean; message: string } {
  const session = this.otpSessions.get(sessionKey);

  // Vérifie existence
  if (!session) return { valid: false, message: 'Aucun code en attente' };

  // Vérifie expiration
  if (Date.now() > session.expiresAt) return { valid: false, message: 'Code expiré' };

  // Vérifie tentatives (max 3)
  if (session.attempts >= 3) return { valid: false, message: 'Trop de tentatives' };

  // Compare code
  if (session.code !== code) {
    session.attempts++;
    return { valid: false, message: `Code incorrect. ${3 - session.attempts} tentatives restantes.` };
  }

  // Succès - supprime session
  this.otpSessions.delete(sessionKey);
  return { valid: true, message: 'Code vérifié' };
}
```

---

## 5. API send_cash

### 5.1 Endpoint

```
POST https://api.icelabsoft.com/pay_services/api/send_cash
```

### 5.2 Corps de la requête

```json
{
  "pservicename": "OFMS",           // "OFMS" pour OM/FREE, "INTOUCH" pour WAVE
  "app_name": "FAYCLICK",
  "pmethode": "OM",                 // "OM" ou "WAVE" (FREE utilise "OM")
  "ptelnumber": "777301221",        // Numéro destination (9 chiffres)
  "pamount": 1000,                  // Montant en FCFA
  "pmotif": "Retrait OM KALPE 260111193045",  // Format: "Retrait {methode} KALPE {AAMMJJHHMMSS}"
  "pnomstructure": "MA BOUTIQUE"    // Nom de la structure
}
```

### 5.3 Réponse succès

```json
{
  "detail": {
    "reference": "20251110140226185",
    "transactionId": "CI251110.1402.A69635",
    "status": "SUCCESS",
    "payment_uuid": "05d25dd6-75a1-4544-88a5-66565dd8935e",
    "persistence_status": "SAVED"
  }
}
```

### 5.4 Mapping méthode → service

| Méthode | pservicename | pmethode |
|---------|--------------|----------|
| OM      | OFMS         | OM       |
| WAVE    | INTOUCH      | WAVE     |
| FREE    | OFMS         | OM       |

---

## 6. Sauvegarde en Base de Données

### 6.1 Fonction PostgreSQL

```sql
SELECT * FROM public.add_retrait_marchand(
    183,                          -- pid_structure
    'CI260111.1924.A12345',       -- transactionId (reçu de l'API)
    '777301221',                  -- ptelnumber (numéro destination)
    1000,                         -- pamount (montant)
    'OM',                         -- pmethode (OM/WAVE)
    0                             -- pfrais (laisser à 0)
);
```

### 6.2 Réponse

```json
{
  "versement_id": 713,
  "message": "Versement WALLET enregistré avec succès. Transaction: CI260111.1924.A12345. Montant initial: 1000, Taux appliqué: 0.015%, Montant final: 985"
}
```

**Note** : Un taux de frais de 1.5% est automatiquement appliqué par la fonction.

---

## 7. Types TypeScript

### 7.1 Types Wallet (`wallet.types.ts`)

```typescript
// Soldes simplifiés
interface WalletSoldes {
  solde_om: number;
  solde_wave: number;
  solde_free: number;
  solde_total: number;
}

// Transaction unifiée pour affichage
interface WalletTransaction {
  id: number;
  date: string;
  telephone: string | null;
  sens: 'ENTREE' | 'SORTIE';
  montant: number;
  wallet: 'OM' | 'WAVE' | 'FREE';
  reference: string;
  type: 'ENCAISSEMENT' | 'RETRAIT';
}

// Paiement reçu (encaissement)
interface PaiementRecu {
  id_recu: number;
  id_facture: number;
  date_paiement: string;
  wallet: 'OM' | 'WAVE' | 'FREE';
  montant_recu: number;
  montant_net: number;
  frais: number;
  reference: string;
  telephone: string | null;
}

// Retrait effectué
interface RetraitEffectue {
  id_versement: number;
  date_retrait: string;
  wallet: 'OM' | 'WAVE' | 'FREE';
  montant: number;
  montant_initial: number;
  reference: string;
  compte_destination: string;
  etat: 'EFFECTUE' | 'EN_ATTENTE' | 'ANNULE';
}
```

### 7.2 Types Retrait (`retrait.service.ts`)

```typescript
interface RetraitParams {
  idStructure: number;
  telephone: string;
  montant: number;
  methode: 'OM' | 'WAVE' | 'FREE';
  nomStructure: string;
}

interface SendCashResponse {
  success: boolean;
  detail?: {
    reference: string;
    transactionId: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    payment_uuid: string;
    persistence_status: 'SAVED' | 'ERROR';
  };
  error?: string;
}

interface RetraitResult {
  success: boolean;
  message: string;
  versement_id?: number;
  transactionId?: string;
}
```

---

## 8. Composant OTPInput

### 8.1 Props

```typescript
interface OTPInputProps {
  length?: number;           // Nombre de chiffres (défaut: 5)
  onComplete: (otp: string) => void;  // Callback quand OTP complet
  disabled?: boolean;
  error?: string;            // Message d'erreur à afficher
  autoFocus?: boolean;
}
```

### 8.2 Fonctionnalités

- **Auto-focus** : Focus automatique sur la première case
- **Navigation** : Flèches gauche/droite, Backspace pour revenir
- **Copier/Coller** : Support du paste d'un code complet
- **Reset sur erreur** : Vide les cases quand `error` change
- **Style dynamique** : Bordure verte si rempli, rouge si erreur

---

## 9. Sécurité

### 9.1 Validations côté client

```typescript
// Validation numéro de téléphone
validatePhone(phone: string, methode: 'OM' | 'WAVE' | 'FREE') {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 9) return { valid: false };

  const prefix = cleaned.slice(0, 2);
  if (methode === 'OM' || methode === 'FREE') {
    // OM/FREE : uniquement 77 ou 78
    if (!['77', '78'].includes(prefix)) return { valid: false };
  }
  // WAVE : tous les préfixes sénégalais
}

// Validation montant
validateMontant(montant: number, soldeDisponible: number) {
  if (montant <= 0) return { valid: false, message: 'Montant invalide' };
  if (montant > soldeDisponible) return { valid: false, message: 'Solde insuffisant' };
  if (montant < 100) return { valid: false, message: 'Minimum 100 FCFA' };
}
```

### 9.2 Restrictions retrait

- **Numéros autorisés** : Uniquement `mobile_om` et `mobile_wave` de la structure
- **FREE Money** : Utilise le même numéro que Orange Money
- **OTP obligatoire** : Aucun retrait sans validation SMS
- **Expiration OTP** : 2 minutes
- **Tentatives limitées** : 3 essais max par OTP

---

## 10. Points d'attention pour le développeur

### 10.1 Erreurs courantes

1. **Import database** : Utiliser `import database from` et non `import { database } from`
2. **stopPropagation** : Toujours ajouter `e.stopPropagation()` sur les boutons de la face arrière
3. **Styles 3D** : Utiliser des styles inline React pour `perspective`, `transformStyle`, `backfaceVisibility`

### 10.2 Tests à effectuer

- [ ] Vérifier que seules les cartes avec solde > 0 sont cliquables
- [ ] Tester le flip sur mobile (touch events)
- [ ] Vérifier l'expiration OTP après 2 minutes
- [ ] Tester les 3 tentatives OTP
- [ ] Vérifier le refresh des soldes après retrait réussi

### 10.3 Logs de debug

```typescript
// Dans retrait.service.ts
console.log('💸 [RETRAIT] Appel API send_cash:', { url, methode, telephone, montant });
console.log('✅ [RETRAIT] send_cash SUCCESS:', transactionId);
console.log('❌ [RETRAIT] send_cash FAILED:', data);

// Dans wallet.service.ts
console.log('💰 [WALLET] Récupération soldes wallet:', { idStructure, query });
console.log('📊 [WALLET] Données wallet reçues:', { success, nbPaiements, nbRetraits });
```

---

## 11. Évolutions futures possibles

1. **Historique des OTP** : Stocker en base pour audit
2. **Notifications push** : Alerter après retrait réussi
3. **Plafonds de retrait** : Limites journalières/mensuelles
4. **Validation 2FA** : Double authentification pour gros montants
5. **Retrait programmé** : Retraits automatiques récurrents

---

*Document créé le 11/01/2026 - Version 1.0*
## ENVOI SMS
*EXEMPLE*
  const generatedPin = generatePinCode();
      setSentPinCode(generatedPin);

      // Appel à l'API d'IceLabSoft pour envoyer le SMS
      const response = await fetch('https://api.icelabsoft.com/sms_service/api/send_o_sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numtel: telephone,
          message: `Entrez le code : ${generatedPin} pour valider le retrait. Ce code est valide pour 2 minutes.`,
          sender: 'ICELABOSOFT',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`SMS envoyé au ${telephone}`);
        setStep('confirm');
      } else {
        toast.error(data.message || 'Échec de l\'envoi du SMS');
      }