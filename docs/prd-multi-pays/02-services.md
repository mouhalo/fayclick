# PRD Phase 2 — Services (OTP Routing Multi-Pays CEDEAO)

**Branche** : `feature/multi-pays-cedeao`
**Date** : 2026-04-12
**Agent** : Fullstack
**Scope** : Inscription + Recovery Login (pas KALPE)
**Règle de routage** : `code_iso_pays === 'SN'` → SMS | sinon → Email Gmail strict (@gmail.com)

---

## 1. Nouveau service `services/email.service.ts`

### 1.1 Objectifs
- Pattern singleton conforme à `services/sms.service.ts` (ligne 39-49)
- Envoi immédiat via l'API ICELABSOFT `https://api.icelabsoft.com/email_sender/api/send`
- Validation Gmail stricte côté service (défense en profondeur)
- Logging sécurisé via `SecurityService.secureLog` comme `sms.service.ts:68, 143, 158, 164`

### 1.2 Types
- `EmailPayload` : `{ email: string; message: string }`
- `EmailResponse` : `{ success: boolean; message: string; timestamp?: string; recipient?: string }`

### 1.3 Code TypeScript complet (à créer)

```typescript
/**
 * Service Email pour l'envoi de messages (OTP, notifications)
 * Utilisé en remplacement du SMS pour les pays CEDEAO hors Sénégal
 *
 * Mode d'envoi unique :
 * - sendDirectEmail() : API REST ICELABSOFT email_sender → envoi IMMÉDIAT
 *
 * Contrainte métier : UNIQUEMENT les adresses @gmail.com sont acceptées
 * (décision produit MVP — voir PRD multi-pays CEDEAO).
 */

import SecurityService from './security.service';

// URL de l'API Email directe (envoi immédiat)
const EMAIL_API_URL = 'https://api.icelabsoft.com/email_sender/api/send';

// Regex Gmail strict : aucun alias suffixe, doit finir par @gmail.com
const GMAIL_STRICT_REGEX = /^[^\s@]+@gmail\.com$/i;

// Types pour les requêtes/réponses Email
interface EmailPayload {
  email: string;
  message: string;
}

export interface EmailResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  recipient?: string;
}

class EmailService {
  private static instance: EmailService;

  private constructor() {}

  static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  /**
   * Envoie un email immédiatement via l'API REST ICELABSOFT
   * Utilisé pour : OTP inscription, recovery login (pays ≠ SN)
   *
   * @throws Error si email non Gmail ou réponse API KO
   */
  async sendDirectEmail(email: string, message: string): Promise<EmailResponse> {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!this.isValidGmail(cleanEmail)) {
        throw new Error('Email invalide : seules les adresses @gmail.com sont acceptées');
      }

      if (!message || message.trim().length === 0) {
        throw new Error('Message requis');
      }

      SecurityService.secureLog('log', `📧 [EMAIL-DIRECT] Envoi email immédiat à: ${this.maskEmail(cleanEmail)}`);

      const payload: EmailPayload = {
        email: cleanEmail,
        message: message,
      };

      const response = await fetch(EMAIL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        SecurityService.secureLog('log', `✅ [EMAIL-DIRECT] Email envoyé avec succès (${data.timestamp ?? 'no-ts'})`);
        return {
          success: true,
          message: data.message ?? 'Email envoyé avec succès',
          timestamp: data.timestamp,
          recipient: data.recipient,
        };
      } else {
        throw new Error(data.message || 'Erreur API Email');
      }
    } catch (error: any) {
      SecurityService.secureLog('error', `❌ [EMAIL-DIRECT] Erreur: ${error.message}`);
      throw new Error(`Erreur envoi email: ${error.message}`);
    }
  }

  /**
   * Valide strictement un email Gmail (xxx@gmail.com)
   * Exposé pour permettre la validation en amont (UI, otpRouter, registration)
   */
  isValidGmail(email: string): boolean {
    if (!email) return false;
    return GMAIL_STRICT_REGEX.test(email.trim().toLowerCase());
  }

  /**
   * Masque une adresse email pour les logs (RGPD/sécurité)
   * Ex: johndoe@gmail.com → jo***@gmail.com
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visible = local.substring(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
}

// Export instance unique (pattern conforme à sms.service.ts)
export default EmailService.getInstance();
```

### 1.4 Note sur le retry
Le service `sms.service.ts` actuel n'implémente **pas** de retry logic (seul try/catch). Pour rester iso-pattern au MVP, `email.service.ts` ne l'implémente pas non plus. Un wrapper de retry générique pourra être ajouté en Phase 3 si les métriques le justifient.

---

## 2. Nouveau routeur OTP `services/otp-router.service.ts`

### 2.1 Objectifs
- Seul point d'entrée pour l'envoi d'OTP dans les flows **inscription** et **recovery**.
- Décide SMS vs Email en fonction de `code_iso_pays`.
- Centralise les templates de messages (FR au MVP).
- Garantit qu'un pays ≠ SN sans email Gmail valide échoue **avant** tout appel réseau.

### 2.2 Code TypeScript complet (à créer)

```typescript
/**
 * Routeur OTP Multi-Pays CEDEAO
 * Décide du canal d'envoi (SMS ou Email Gmail) selon le code ISO pays.
 *
 * Règle : code_iso_pays === 'SN' → SMS | sinon → Email Gmail strict
 * Scope MVP : inscription (welcome) + recovery (password reset).
 */

import smsService from './sms.service';
import emailService from './email.service';
import SecurityService from './security.service';

export type OtpContext = 'registration' | 'recovery';

export interface OtpRouteParams {
  codeIsoPays: string;           // ex: 'SN', 'CI', 'ML'
  phone: string;                 // numéro 7 à 10 chiffres (requis si SN)
  email?: string | null;         // email Gmail (requis si ≠ SN)
  code: string;                  // code OTP à 4-5 chiffres
  context: OtpContext;
  structureName?: string;        // pour personnaliser le template welcome
}

export interface OtpRouteResult {
  success: boolean;
  channel: 'sms' | 'email';
  recipientMasked: string;       // numéro ou email masqué (logs/UI)
  message: string;
}

class OtpRouterService {
  private static instance: OtpRouterService;

  private constructor() {}

  static getInstance(): OtpRouterService {
    if (!this.instance) {
      this.instance = new OtpRouterService();
    }
    return this.instance;
  }

  /**
   * Point d'entrée unique OTP.
   * Route SMS (SN) vs Email (autres pays CEDEAO).
   */
  async sendOTP(params: OtpRouteParams): Promise<OtpRouteResult> {
    const { codeIsoPays, phone, email, code, context, structureName } = params;

    if (!codeIsoPays) {
      throw new Error('Code ISO pays requis pour router l\'OTP');
    }
    if (!code) {
      throw new Error('Code OTP requis');
    }

    const isSenegal = codeIsoPays.toUpperCase() === 'SN';
    const body = this.buildMessage(context, code, structureName);

    if (isSenegal) {
      if (!phone) throw new Error('Numéro de téléphone requis pour OTP SMS (Sénégal)');

      SecurityService.secureLog('log', `📤 [OTP-ROUTER] Canal=SMS pays=SN context=${context}`);
      await smsService.sendDirectSMS(phone, body);

      return {
        success: true,
        channel: 'sms',
        recipientMasked: this.maskPhone(phone),
        message: 'OTP envoyé par SMS',
      };
    }

    // Pays non-SN → Email Gmail strict OBLIGATOIRE
    if (!email) {
      throw new Error(`Email Gmail requis pour les OTP hors Sénégal (pays=${codeIsoPays})`);
    }
    if (!emailService.isValidGmail(email)) {
      throw new Error('Seules les adresses @gmail.com sont acceptées pour les OTP internationaux');
    }

    SecurityService.secureLog('log', `📤 [OTP-ROUTER] Canal=EMAIL pays=${codeIsoPays} context=${context}`);
    await emailService.sendDirectEmail(email, body);

    return {
      success: true,
      channel: 'email',
      recipientMasked: this.maskEmail(email),
      message: 'OTP envoyé par Email',
    };
  }

  /**
   * Génère le corps du message selon le contexte (FR uniquement au MVP)
   */
  private buildMessage(context: OtpContext, code: string, structureName?: string): string {
    switch (context) {
      case 'registration': {
        const prefix = structureName
          ? `Bienvenue sur FayClick, ${structureName} !`
          : 'Bienvenue sur FayClick !';
        return `${prefix} Votre code de connexion rapide est : ${code}. Utilisez-le pour vous connecter facilement. Ne le partagez pas.`;
      }
      case 'recovery':
        return `FAYCLICK - Votre nouveau code de connexion rapide est : ${code}. Ne le partagez avec personne.`;
      default:
        return `Votre code FayClick est : ${code}`;
    }
  }

  private maskPhone(phone: string): string {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.length < 4) return '***';
    return cleaned.substring(0, 2) + '****' + cleaned.substring(cleaned.length - 2);
  }

  private maskEmail(email: string): string {
    const [local, domain] = (email || '').split('@');
    if (!local || !domain) return '***';
    return `${local.substring(0, Math.min(2, local.length))}***@${domain}`;
  }
}

export default OtpRouterService.getInstance();
```

---

## 3. Refactor `services/registration.service.ts`

### 3.1 Extension `RegistrationData` (types)
Ajouter deux champs dans `types/registration.ts` :
- `p_code_iso_pays: string` — obligatoire, ex. `'SN'`, `'CI'`
- `p_email_gmail?: string` — obligatoire si `p_code_iso_pays !== 'SN'`

### 3.2 Validation stricte (nouvelle méthode)
Dans `validateRegistrationData()` (`registration.service.ts:88-116`), **ajouter** :

```typescript
// Validation pays
if (!data.p_code_iso_pays || data.p_code_iso_pays.trim().length !== 2) {
  errors.push('Code pays ISO (2 lettres) requis');
}

// Validation email Gmail strict si pays ≠ SN
const isSenegal = (data.p_code_iso_pays || '').toUpperCase() === 'SN';
if (!isSenegal) {
  const email = (data.p_email_gmail || data.p_email || '').trim().toLowerCase();
  if (!email) {
    errors.push('Email Gmail requis pour les inscriptions hors Sénégal');
  } else if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
    errors.push('Seules les adresses @gmail.com sont acceptées');
  }
}
```

### 3.3 Appel PG v2 `add_edit_inscription_v2`
Remplacer le bloc `services/registration.service.ts:158-175` par un appel à la fonction **v2** (13 params — signature définie dans le PRD DBA) :

**Avant** (`registration.service.ts:161-175`) :
```typescript
const query = `SELECT add_edit_inscription(
  ${formattedData.p_id_type}::integer,
  '${formattedData.p_nom_structure}'::varchar,
  '${formattedData.p_adresse}'::varchar,
  '${formattedData.p_mobile_om}'::varchar,
  '${formattedData.p_mobile_wave}'::varchar,
  '${formattedData.p_numautorisatioon}'::varchar,
  '${formattedData.p_nummarchand}'::varchar,
  '${formattedData.p_email}'::varchar,
  '${formattedData.p_logo}'::varchar,
  '${formattedData.p_nom_service}'::varchar,
  '${formattedData.p_code_promo}'::varchar,
  ${formattedData.p_id_structure}::integer
) AS message;`;
```

**Après** (ajout `p_code_iso_pays` en 1er ou dernier selon signature PG — ici on suit la convention "nouveaux params à la fin" pour minimiser risques sur clients existants ; ajustez si PRD DBA décide autrement) :
```typescript
const query = `SELECT add_edit_inscription_v2(
  ${formattedData.p_id_type}::integer,
  '${formattedData.p_nom_structure}'::varchar,
  '${formattedData.p_adresse}'::varchar,
  '${formattedData.p_mobile_om}'::varchar,
  '${formattedData.p_mobile_wave}'::varchar,
  '${formattedData.p_numautorisatioon}'::varchar,
  '${formattedData.p_nummarchand}'::varchar,
  '${formattedData.p_email}'::varchar,
  '${formattedData.p_logo}'::varchar,
  '${formattedData.p_nom_service}'::varchar,
  '${formattedData.p_code_promo}'::varchar,
  ${formattedData.p_id_structure}::integer,
  '${formattedData.p_code_iso_pays}'::varchar
) AS message;`;
```

### 3.4 Formatage (`formatRegistrationData`, ligne 121-140)
Ajouter :
```typescript
p_code_iso_pays: (data.p_code_iso_pays || 'SN').toUpperCase().trim(),
p_email_gmail: (data.p_email_gmail || '').trim().toLowerCase(),
// Si pays ≠ SN, on force p_email = email_gmail pour cohérence DB
p_email: ((data.p_code_iso_pays || 'SN').toUpperCase() !== 'SN')
  ? (data.p_email_gmail || '').trim().toLowerCase()
  : (data.p_email || ''),
```

### 3.5 `validateMobilePhone` (ligne 254-257)
**Inchangé** pour MVP (7-10 chiffres couvre CEDEAO). Un renforcement par indicatif pays pourra être ajouté en Phase 3 via `PAYS_LIST[code_iso].longueur_tel`.

---

## 4. Refactor `app/register/page.tsx` (description)

### 4.1 State additionnel
```typescript
// Après les useState existants du formData
const [countryCode, setCountryCode] = useState<string>('SN');
const [emailGmail, setEmailGmail] = useState<string>('');
```
Intégrer dans `RegistrationFormData` (voir §6) pour persistance + reset.

### 4.2 UI — Step 1 (ou Step 2 selon maquette)
- Ajouter un `<CountrySelect />` (nouveau composant à créer en Phase 3 UI) basé sur `PAYS_LIST` de `types/pays.ts`.
- Par défaut : `SN`.
- Si `countryCode !== 'SN'` → afficher input **email** avec placeholder `exemple@gmail.com` + helper text "Seul Gmail est accepté".

### 4.3 Validation step 1
```typescript
if (!countryCode) setError('Pays requis');
if (countryCode !== 'SN') {
  if (!emailGmail || !/^[^\s@]+@gmail\.com$/i.test(emailGmail.trim())) {
    setError('Email Gmail requis (ex: moncompte@gmail.com)');
    return;
  }
}
```

### 4.4 Migration appel SMS → otpRouter (ligne ~318-325)

**Avant** (`app/register/page.tsx:320-325`) :
```typescript
const smsMessage = `Bienvenue sur FayClick ! Votre code de connexion rapide est : ${otpCode}. Utilisez-le pour vous connecter facilement. Ne le partagez pas.`;
try {
  await smsService.sendDirectSMS(phoneNumber, smsMessage);
} catch (smsError) {
  console.warn('SMS OTP non envoyé (non bloquant):', smsError);
}
```

**Après** :
```typescript
try {
  await otpRouter.sendOTP({
    codeIsoPays: countryCode,
    phone: phoneNumber,
    email: emailGmail || null,
    code: otpCode,
    context: 'registration',
    structureName: formData.businessName,
  });
} catch (otpError) {
  console.warn('OTP non envoyé (non bloquant):', otpError);
}
```

### 4.5 Payload `registerMerchant` (ligne 289-298)
Ajouter :
```typescript
p_code_iso_pays: countryCode,
p_email_gmail: emailGmail || '',
p_email: countryCode !== 'SN' ? emailGmail : '',
```

---

## 5. Refactor `components/auth/ModalRecoveryOTP.tsx`

### 5.1 Récupération du pays de la structure
Actuellement `getStructureAdminByName` (`registration.service.ts:304-363`) retourne `{ found, login }`. Il faut **étendre son retour** pour inclure `code_iso_pays` et `email` depuis `list_structures` :

```typescript
// services/registration.service.ts — getStructureAdminByName
const structQuery = `
  SELECT id_structure, mobile_om, code_iso_pays, email
  FROM list_structures
  WHERE UPPER(nom_structure) = '${escapedName}'
  LIMIT 1;
`;
// ...
return { found: true, login, codeIsoPays: struct.code_iso_pays, email: struct.email };
```

Type de retour à mettre à jour : `{ found: boolean; login?: string; codeIsoPays?: string; email?: string }`.

### 5.2 Migration appel SMS → otpRouter (ligne ~109-113)

**Avant** (`ModalRecoveryOTP.tsx:109-113`) :
```typescript
const otpCode = registrationService.generateOTPCode();
const message = `FAYCLICK - Votre nouveau code de connexion rapide est : ${otpCode}. Ne le partagez avec personne.`;
await smsService.sendDirectSMS(cleanPhone, message);
```

**Après** :
```typescript
const otpCode = registrationService.generateOTPCode();
await otpRouter.sendOTP({
  codeIsoPays: result.codeIsoPays || 'SN',
  phone: cleanPhone,
  email: result.email || null,
  code: otpCode,
  context: 'recovery',
});
```

### 5.3 UX
- Si `result.codeIsoPays !== 'SN'` et `!result.email` → afficher message d'erreur : *"Compte sans email Gmail enregistré. Contactez le support."* (bloquant).
- Sinon, feedback step success doit préciser le canal : *"Code envoyé par SMS au ***27"* vs *"Code envoyé par email à jo***@gmail.com"*.

---

## 6. Types à ajouter / modifier

### 6.1 Nouveau `types/pays.ts`

```typescript
/**
 * Liste des pays CEDEAO supportés par FayClick V2.
 * Source de vérité : table `pays` PostgreSQL — dupliqué côté frontend
 * pour perfs (pas d'appel DB au load) et synchronisé manuellement
 * lors des mises à jour DBA.
 */

export interface Pays {
  code_iso: string;            // ex: 'SN' (ISO-3166-1 alpha-2)
  nom_fr: string;              // ex: 'Sénégal'
  indicatif_tel: string;       // ex: '+221'
  devise_code: string;         // ex: 'XOF'
  devise_symbole: string;      // ex: 'FCFA'
  sms_supporte: boolean;       // true pour SN au MVP, false ailleurs
  emoji_drapeau: string;       // ex: '🇸🇳'
}

export const PAYS_LIST: readonly Pays[] = [
  { code_iso: 'SN', nom_fr: 'Sénégal',           indicatif_tel: '+221', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: true,  emoji_drapeau: '🇸🇳' },
  { code_iso: 'CI', nom_fr: "Côte d'Ivoire",     indicatif_tel: '+225', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇨🇮' },
  { code_iso: 'ML', nom_fr: 'Mali',              indicatif_tel: '+223', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇲🇱' },
  { code_iso: 'BF', nom_fr: 'Burkina Faso',      indicatif_tel: '+226', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇧🇫' },
  { code_iso: 'NE', nom_fr: 'Niger',             indicatif_tel: '+227', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇳🇪' },
  { code_iso: 'TG', nom_fr: 'Togo',              indicatif_tel: '+228', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇹🇬' },
  { code_iso: 'BJ', nom_fr: 'Bénin',             indicatif_tel: '+229', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇧🇯' },
  { code_iso: 'GN', nom_fr: 'Guinée',            indicatif_tel: '+224', devise_code: 'GNF', devise_symbole: 'FG',   sms_supporte: false, emoji_drapeau: '🇬🇳' },
  { code_iso: 'GW', nom_fr: 'Guinée-Bissau',     indicatif_tel: '+245', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇬🇼' },
  { code_iso: 'GM', nom_fr: 'Gambie',            indicatif_tel: '+220', devise_code: 'GMD', devise_symbole: 'D',    sms_supporte: false, emoji_drapeau: '🇬🇲' },
  { code_iso: 'CV', nom_fr: 'Cap-Vert',          indicatif_tel: '+238', devise_code: 'CVE', devise_symbole: '$',    sms_supporte: false, emoji_drapeau: '🇨🇻' },
  { code_iso: 'LR', nom_fr: 'Libéria',           indicatif_tel: '+231', devise_code: 'LRD', devise_symbole: 'L$',   sms_supporte: false, emoji_drapeau: '🇱🇷' },
  { code_iso: 'SL', nom_fr: 'Sierra Leone',      indicatif_tel: '+232', devise_code: 'SLL', devise_symbole: 'Le',   sms_supporte: false, emoji_drapeau: '🇸🇱' },
  { code_iso: 'GH', nom_fr: 'Ghana',             indicatif_tel: '+233', devise_code: 'GHS', devise_symbole: 'GH₵',  sms_supporte: false, emoji_drapeau: '🇬🇭' },
  { code_iso: 'NG', nom_fr: 'Nigéria',           indicatif_tel: '+234', devise_code: 'NGN', devise_symbole: '₦',    sms_supporte: false, emoji_drapeau: '🇳🇬' },
  { code_iso: 'MR', nom_fr: 'Mauritanie',        indicatif_tel: '+222', devise_code: 'MRU', devise_symbole: 'UM',   sms_supporte: false, emoji_drapeau: '🇲🇷' },
  { code_iso: 'TD', nom_fr: 'Tchad',             indicatif_tel: '+235', devise_code: 'XAF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇹🇩' },
] as const;

export const PAYS_DEFAULT_CODE = 'SN';

export function getPaysByCode(code: string): Pays | undefined {
  return PAYS_LIST.find(p => p.code_iso === (code || '').toUpperCase());
}
```

### 6.2 Extension `types/registration.ts`

**Ajouts dans `RegistrationData`** (après ligne 28) :
```typescript
p_code_iso_pays: string;     // NEW — ISO alpha-2 (défaut 'SN')
p_email_gmail?: string;      // NEW — requis si code ≠ 'SN', doit matcher @gmail.com
```

**Ajouts dans `RegistrationFormData`** (après ligne 62) :
```typescript
countryCode: string;         // NEW — code ISO pays sélectionné
emailGmail?: string;         // NEW — email Gmail si pays ≠ SN
```

**Ajouts dans `StepValidation.step1`** :
```typescript
countryCode: boolean;
emailGmail: boolean;   // validé si countryCode !== 'SN'
```

### 6.3 Extension `types/admin.types.ts`
- Ajouter `code_iso_pays: string` dans `AdminStructureItem` et `StructureDetailData`.
- Ajouter `devise_code?: string` et `devise_symbole?: string` (exploités plus tard par dashboard).

---

## 7. Plan de test

### 7.1 Tests unitaires (services)

| # | Cas | Entrée | Attendu |
|---|-----|--------|---------|
| U1 | `emailService.isValidGmail` OK | `jane@gmail.com` | `true` |
| U2 | `emailService.isValidGmail` KO — domaine | `jane@yahoo.com` | `false` |
| U3 | `emailService.isValidGmail` KO — sous-domaine | `jane@mail.gmail.com` | `false` |
| U4 | `emailService.sendDirectEmail` refuse non-Gmail | `('x@outlook.com', 'msg')` | throw "seules les adresses @gmail.com" |
| U5 | `otpRouter.sendOTP` SN → SMS | `{codeIsoPays:'SN', phone:'771234567', code:'12345', context:'registration'}` | `channel='sms'`, `smsService.sendDirectSMS` appelé |
| U6 | `otpRouter.sendOTP` CI sans email | `{codeIsoPays:'CI', phone:'0701020304', code:'12345', context:'registration'}` | throw "Email Gmail requis" |
| U7 | `otpRouter.sendOTP` CI + Gmail | `{codeIsoPays:'CI', email:'test@gmail.com', code:'12345', context:'registration'}` | `channel='email'`, `emailService.sendDirectEmail` appelé |
| U8 | `otpRouter.sendOTP` CI + email non-Gmail | `{codeIsoPays:'CI', email:'test@outlook.com', code:'12345'}` | throw "Seules les adresses @gmail.com" |
| U9 | Template registration contient structureName | context='registration', structureName='MA BOUTIQUE' | message commence par "Bienvenue sur FayClick, MA BOUTIQUE !" |
| U10 | Template recovery | context='recovery' | message commence par "FAYCLICK -" |

### 7.2 Tests d'intégration (flows)

**T1 — Inscription SN (nominal)**
- Sélectionne `SN`, champ email caché
- Soumission → `registerMerchant` appelle `add_edit_inscription_v2(…, 'SN')`
- SMS envoyé via `otpRouter` → canal `sms`, `recipientMasked='77****67'`

**T2 — Inscription CI (nominal)**
- Sélectionne `CI`, saisit `jane@gmail.com`
- Soumission → DB reçoit `code_iso_pays='CI'` + `email='jane@gmail.com'`
- Email envoyé via `otpRouter` → canal `email`

**T3 — Inscription CI sans email**
- Sélectionne `CI`, laisse email vide
- Validation step 1 bloque : *"Email Gmail requis (ex: moncompte@gmail.com)"*
- Aucun appel DB ni OTP

**T4 — Inscription CI avec email non-Gmail**
- Sélectionne `CI`, saisit `jane@yahoo.fr`
- Validation step 1 bloque : *"Seules les adresses @gmail.com sont acceptées"*

**T5 — Recovery pays étranger**
- Saisit nom structure CI + téléphone OM
- `getStructureAdminByName` retourne `{found:true, login, codeIsoPays:'CI', email:'admin@gmail.com'}`
- `otpRouter.sendOTP` → canal `email`
- UX success : *"Code envoyé par email à ad***@gmail.com"*

**T6 — Recovery pays étranger sans email enregistré**
- Structure CI sans email en base
- UI bloque avec : *"Compte sans email Gmail enregistré. Contactez le support."*

### 7.3 Tests manuels (QA)
- Vérifier réception email Gmail réelle (latence + anti-spam)
- Vérifier SMS Sénégal inchangé (non-régression)
- Tester rate limiting recovery (3/jour existant)

---

## Fichiers concernés (récap)

**À créer**
- `services/email.service.ts`
- `services/otp-router.service.ts`
- `types/pays.ts`

**À modifier**
- `services/registration.service.ts` : `validateRegistrationData`, `formatRegistrationData`, requête SQL, `getStructureAdminByName`
- `app/register/page.tsx` : state pays/email, validation step, appel `otpRouter`, payload registerMerchant
- `components/auth/ModalRecoveryOTP.tsx` : appel `otpRouter` avec codeIsoPays de la structure
- `types/registration.ts` : `RegistrationData`, `RegistrationFormData`, `StepValidation`
- `types/admin.types.ts` : `AdminStructureItem`, `StructureDetailData`

**Dépendances externes (autres PRD)**
- PRD DBA — signature exacte `add_edit_inscription_v2` (13 params) + ajout colonnes `code_iso_pays`, `email` sur `list_structures`
- PRD UI — composant `<CountrySelect />` basé sur `PAYS_LIST`
