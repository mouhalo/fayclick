# Documentation Technique - Récupération de Mot de Passe FayClick V2

## Vue d'ensemble

Le système de récupération de mot de passe de FayClick V2 est un processus sécurisé en 2 étapes qui utilise l'authentification par SMS pour permettre aux utilisateurs de réinitialiser leur mot de passe oublié.

## Architecture du Système

### Composants Principaux

1. **Frontend** : `ModalPasswordRecovery.tsx` - Interface utilisateur responsive
2. **Service d'Authentification** : `auth.service.ts` - Logique métier
3. **Service Base de Données** : `database.service.ts` - Fonctions PostgreSQL
4. **Service SMS** : `sms.service.ts` - Envoi de codes de vérification

## Workflow Complet

### Phase 1 : Demande de Récupération

```
┌─ Utilisateur ─┐    ┌─ Frontend ─┐    ┌─ AuthService ─┐    ┌─ DatabaseService ─┐    ┌─ SMSService ─┐
│               │    │            │    │               │    │                  │    │             │
│ 1. Saisit     │───▶│ 2. Valide  │───▶│ 3. Appelle    │───▶│ 4. Exécute       │    │             │
│    login +    │    │    format  │    │    request    │    │    add_demande   │    │             │
│    téléphone  │    │    tél.    │    │    Password   │    │    _password()   │    │             │
│               │    │            │    │    Reset()    │    │                  │    │             │
│               │    │            │    │               │    │ 5. Génère code   │───▶│ 6. Envoie   │
│               │    │            │    │               │    │    temporaire    │    │    SMS      │
│               │    │            │    │               │    │                  │    │             │
│ 9. Reçoit SMS │◀───┴────────────┴────┴───────────────┴────┴──────────────────┴────┘             │
│    avec code  │                                                                                  │
└───────────────┘                                                                                  │
```

### Phase 2 : Vérification et Réinitialisation

```
┌─ Utilisateur ─┐    ┌─ Frontend ─┐    ┌─ AuthService ─┐    ┌─ DatabaseService ─┐    ┌─ SMSService ─┐
│               │    │            │    │               │    │                  │    │             │
│ 1. Saisit     │───▶│ 2. Valide  │───▶│ 3. Appelle    │───▶│ 4. Exécute       │    │             │
│    code SMS   │    │    format  │    │    verify     │    │    add_check     │    │             │
│    (6 chars)  │    │    code    │    │    Password   │    │    _demande()    │    │             │
│               │    │            │    │    ResetCode  │    │                  │    │             │
│               │    │            │    │               │    │ 5. Vérifie +     │    │ 6. Envoie   │
│               │    │            │    │               │    │    réinitialise  │───▶│    nouveau  │
│               │    │            │    │               │    │    mot de passe  │    │    mdp (opt) │
│               │    │            │    │               │    │                  │    │             │
│ 8. Reçoit     │◀───┴────────────┴────┴───────────────┴────┴──────────────────┴────┘             │
│    nouveau    │                                                                                  │
│    mot passe  │                                                                                  │
└───────────────┘                                                                                  │
```

## APIs et Endpoints

### 1. Fonctions PostgreSQL

#### `add_demande_password(login, telephone)`
```sql
-- Localisation : Base de données PostgreSQL
-- Fonction : Créer une demande de récupération
-- Paramètres :
--   - login (VARCHAR) : Login ou email utilisateur
--   - telephone (VARCHAR) : Numéro de téléphone au format sénégalais
-- Retour :
--   - status : 'success' ou 'error'
--   - message : Message descriptif
--   - pwd_temp : Code temporaire (6 caractères alphanumériques)
--   - expiration : Date d'expiration (2 minutes)
```

#### `add_check_demande(login, telephone, code)`
```sql
-- Localisation : Base de données PostgreSQL
-- Fonction : Vérifier le code et réinitialiser le mot de passe
-- Paramètres :
--   - login (VARCHAR) : Login utilisateur
--   - telephone (VARCHAR) : Numéro de téléphone
--   - code (VARCHAR) : Code de vérification reçu par SMS
-- Retour :
--   - status : 'success' ou 'error'
--   - message : Message descriptif
--   - nouveau_password : Nouveau mot de passe temporaire
--   - instruction : Instructions pour l'utilisateur
```

#### `add_pending_sms(numtel, message, application, sender)`
```sql
-- Localisation : Base de données PostgreSQL
-- Fonction : Ajouter un SMS en file d'attente d'envoi
-- Paramètres :
--   - numtel (VARCHAR) : Numéro de téléphone destinataire
--   - message (TEXT) : Contenu du SMS
--   - application (VARCHAR) : 'sms' pour l'application SMS
--   - sender (VARCHAR) : 'ICELABOSOFT' ou nom expéditeur
-- Retour :
--   - id : ID du SMS en base
--   - date_create : Timestamp de création
```

### 2. Services Frontend

#### `AuthService.requestPasswordReset()`
```typescript
// Localisation : services/auth.service.ts:505
// Méthode : POST équivalent (via fonction PostgreSQL)
// Paramètres :
interface RequestPasswordResetParams {
  login: string;      // Login ou email utilisateur
  telephone: string;  // Format : 77XXXXXXX (9 chiffres)
}

// Réponse :
interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
  demandId?: string;    // ID de la demande (optionnel)
  expiration?: string;  // Date d'expiration
  error?: string;       // Message d'erreur si échec
}
```

#### `AuthService.verifyPasswordResetCode()`
```typescript
// Localisation : services/auth.service.ts:569
// Méthode : POST équivalent (via fonction PostgreSQL)
// Paramètres :
interface VerifyPasswordResetCodeParams {
  login: string;              // Login utilisateur
  telephone: string;          // Numéro de téléphone
  code: string;              // Code 6 caractères (alphanumériques)
}

// Réponse :
interface VerifyPasswordResetCodeResponse {
  success: boolean;
  message: string;
  newPassword?: string;       // Nouveau mot de passe temporaire
  instruction?: string;       // Instructions pour l'utilisateur
  error?: string;            // Message d'erreur si échec
}
```

#### `SMSService.sendPasswordResetSMS()`
```typescript
// Localisation : services/sms.service.ts:50
// Fonction : Envoi du SMS avec code de vérification
// Paramètres :
interface SendPasswordResetSMSParams {
  phoneNumber: string;        // Numéro de téléphone
  tempCode: string;          // Code temporaire (ne pas logger)
}

// Réponse :
interface SMSResponse {
  success: boolean;
  message: string;
  details?: {
    sms_id: number;          // ID du SMS en base
    numtel: string;          // Numéro destinataire
    date_create: string;     // Timestamp création
  };
}
```

## Implémentation Frontend

### Composant Principal : `ModalPasswordRecovery`

**Localisation** : `components/auth/ModalPasswordRecovery.tsx`

#### États du Workflow
```typescript
type Step = 'request' | 'verify' | 'success';

// État du composant
interface ComponentState {
  currentStep: Step;           // Étape actuelle
  formData: {
    login: string;            // Login/email saisi
    phoneNumber: string;      // Numéro de téléphone
    verificationCode: string; // Code de vérification
  };
  isLoading: boolean;         // État de chargement
  error: string;              // Message d'erreur
  countdown: number;          // Compte à rebours (120s)
  requestData: {
    demandId: string;         // ID de la demande
    expiration: string;       // Date d'expiration
    newPassword: string;      // Nouveau mot de passe
  };
}
```

#### Fonctionnalités Clés

1. **Validation Frontend**
   - Format téléphone sénégalais : `/^(77|78|76|70|75)[0-9]{7}$/`
   - Code de vérification : 6 caractères alphanumériques
   - Échappement automatique des caractères spéciaux

2. **Responsive Design**
   - 3 breakpoints : mobile, mobile large, desktop
   - Interface adaptative avec icônes et animations
   - Support tactile optimisé

3. **Sécurité**
   - Masquage automatique des données sensibles
   - Compte à rebours de 2 minutes pour le code
   - Nettoyage automatique des données en mémoire

4. **UX/UI**
   - Indicateur de progression visuel
   - Messages d'erreur contextuels
   - Animations fluides avec Framer Motion
   - Toast notifications avec Sonner

## Sécurité

### Mesures de Protection

1. **Côté Base de Données**
   - Expiration automatique des codes (2 minutes)
   - Limitation des tentatives de récupération
   - Chiffrement des mots de passe temporaires
   - Logs sécurisés sans données sensibles

2. **Côté Application**
   - Validation stricte des formats d'entrée
   - Échappement des caractères spéciaux
   - Aucun stockage de codes temporaires en localStorage
   - Masquage des numéros de téléphone dans les logs

3. **Côté SMS**
   - Messages templates sécurisés
   - Limitation du nombre de SMS par période
   - Validation des numéros sénégalais uniquement
   - Logs anonymisés

### Codes d'Erreur et Messages

```typescript
// Messages d'erreur standardisés
const ERROR_MESSAGES = {
  INVALID_LOGIN: 'Le login est requis',
  INVALID_PHONE: 'Numéro de téléphone invalide (format: 77XXXXXXX)',
  INVALID_CODE: 'Le code doit contenir 6 caractères',
  CODE_EXPIRED: 'Le code a expiré. Veuillez recommencer.',
  CODE_INVALID: 'Code invalide ou expiré',
  USER_NOT_FOUND: 'Aucun utilisateur trouvé avec ces informations',
  SMS_FAILED: 'Impossible d\'envoyer le SMS',
  DATABASE_ERROR: 'Erreur lors de la connexion à la base de données',
  NETWORK_ERROR: 'Erreur de connexion réseau'
};
```

## Format des Messages SMS

### SMS de Code de Vérification
```
Pour reinitialiser votre ancien mot de passe, confirmer avant 2 minutes avec ce mot de passe: [CODE_6_CHARS]
```

### SMS de Nouveau Mot de Passe (optionnel)
```
Votre nouveau mot de passe FayClick est: [NOUVEAU_MOT_PASSE]. Connectez-vous et changez-le immédiatement pour votre sécurité.
```

## Configuration

### Variables d'Environnement
```typescript
// Configuration SMS
const SMS_CONFIG = {
  application: 'sms',
  senderName: 'ICELABOSOFT',
  clientName: 'FAYCLICK'
};

// Timeouts
const TIMEOUTS = {
  CODE_EXPIRY: 120,      // 2 minutes en secondes
  UI_COUNTDOWN: 120000,  // 2 minutes en millisecondes
  AUTO_CLOSE: 5000       // 5 secondes pour fermeture auto
};
```

### Validation des Numéros Sénégalais
```typescript
// Formats acceptés
const SENEGAL_PREFIXES = ['77', '78', '76', '70', '75'];
const PHONE_REGEX = /^(77|78|76|70|75)[0-9]{7}$/;

// Exemples valides :
// - 771234567
// - +221771234567  (converti automatiquement)
// - 221771234567   (converti automatiquement)
```

## Tests et Débogage

### Logs de Débogage
```typescript
// Logs sécurisés dans la console
console.log('🔐 [AUTH] Début récupération mot de passe pour:', login.substring(0, 3) + '***');
console.log('📱 [SMS] Envoi SMS au numéro:', phoneNumber.replace(/\d(?=\d{4})/g, 'X'));
console.log('✅ [AUTH] Mot de passe réinitialisé avec succès');
```

### Points de Test
1. **Validation d'entrée** : Formats login/téléphone invalides
2. **Expiration de code** : Attendre > 2 minutes
3. **Code invalide** : Tester codes erronés
4. **Utilisateur inexistant** : Login/téléphone non correspondants
5. **Erreurs réseau** : Simulation de pannes API
6. **Responsive** : Test sur mobile, tablette, desktop

## Intégration et Déploiement

### Dépendances Requises
```json
{
  "dependencies": {
    "framer-motion": "^11.x",  // Animations
    "sonner": "^1.x",          // Toast notifications
    "lucide-react": "^0.x"     // Icônes
  }
}
```

### Points d'Intégration
1. **Base de données** : Fonctions PostgreSQL déployées
2. **Service SMS** : API SMS configurée et testée
3. **Frontend** : Composant intégré dans la modal d'authentification
4. **Monitoring** : Logs centralisés pour suivre les tentatives

---

## Contact et Support

Pour toute question technique concernant ce système :
- **Équipe Backend** : Fonctions PostgreSQL et APIs
- **Équipe Frontend** : Interface utilisateur et intégration
- **Équipe Infrastructure** : Service SMS et monitoring

*Dernière mise à jour : Septembre 2024*
*Version FayClick V2*