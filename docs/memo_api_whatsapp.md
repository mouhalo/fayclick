# Mémo de réponse — Endpoint WhatsApp OTP disponible

**De** : Équipe Backend ICELABSOFT
**À** : Équipe FayClick
**Date** : 2026-04-12
**Objet** : Livraison de l'endpoint `whatsapp_service/api/send_otp` — prêt pour intégration
**Référence** : Mémo FayClick du 2026-04-12 (ouverture CEDEAO/Maghreb)

---

## 1. Statut de livraison

| Élément | Statut |
|---|---|
| Service Docker `whatsapp_service_icelabsoft` (port interne 3200) | ✅ Déployé |
| Nginx reverse proxy sur `api.icelabsoft.com` | ✅ Configuré |
| HTTPS (Let's Encrypt) | ✅ Actif |
| Token Meta stocké côté serveur (`.env`, non committé) | ✅ OK |
| CORS restreint aux origines FayClick | ✅ OK |
| Rate limit par IP (20 req/min) + quota journalier Meta (250/24h) | ✅ OK |
| Tests end-to-end sur numéros sénégalais | ✅ Validés |

**URL de production** :
```
POST https://api.icelabsoft.com/whatsapp_service/api/send_otp
```

---

## 2. Configuration Meta utilisée

| Paramètre | Valeur |
|---|---|
| Phone Number ID | `1035744049616511` |
| Numéro expéditeur | `+221 71 165 13 30` (iceSupport) |
| WABA ID | `3543987259077541` (Soutien Solutions) |
| API Meta | Graph API v25.0 |

> **Note importante** : le WABA ID du mémo original (`4028677147420630`) était incorrect — il s'agissait d'un WABA de test vide. Le numéro iceSupport est en réalité rattaché au WABA `3543987259077541`. Les deux templates ont été recréés et approuvés sur ce bon WABA. Cette information n'impacte pas l'intégration frontend (transparent côté FayClick).

---

## 3. Templates WhatsApp disponibles — résolution automatique

Les deux templates sont **APPROVED** et opérationnels. **Le backend choisit automatiquement le bon template selon la `langue` envoyée** — le frontend n'a pas besoin de connaître les noms des templates :

| `langue` envoyée | Template résolu (auto) | Catégorie | Variable | Usage recommandé |
|---|---|---|---|---|
| `fr` | `fayclick_auth_code` | Authentication (Copy code) | `{{1}}` = code OTP | **Défaut** — utilisateurs francophones (SN, CI, ML, BF, MA, DZ, TN, TG, BJ, NE, GN…) |
| `en` | `fayclick_otp_verification` | Authentication (Copy code) | `{{1}}` = code OTP | Utilisateurs anglophones (GH, NG, GM, LR, SL, CV) |

> ℹ️ Le mapping `langue → template` peut évoluer côté backend sans impact frontend. La liste à jour est interrogeable via `GET /whatsapp_service/api/status` (champ `template_map`).

**Rendu côté utilisateur WhatsApp** :
- Message avec le code en gras (texte localisé selon la langue)
- Bouton **« Copier le code »** / **« Copy code »** qui copie automatiquement le code dans le presse-papier

**Override manuel (optionnel, rarement nécessaire)** : passer explicitement `template` dans le body pour forcer un template précis. Sinon, laisser le backend résoudre.

---

## 4. Spécification de l'API

### 4.1 Requête

**URL** :
```
POST https://api.icelabsoft.com/whatsapp_service/api/send_otp
Content-Type: application/json
```

**Body JSON — usage recommandé (simple)** :

```json
{
  "telephone": "+212612345678",
  "code": "12345",
  "langue": "fr"
}
```

| Champ | Type | Obligatoire | Défaut | Description |
|---|---|---|---|---|
| `telephone` | string | ✅ | — | Format E.164 strict : `+` suivi de l'indicatif pays et du numéro, sans espace ni tiret. Regex : `^\+\d{8,15}$` |
| `code` | string | ✅ | — | Code OTP, 4 à 8 chiffres. Regex : `^\d{4,8}$` |
| `langue` | string | ❌ | `fr` | Langue du message. **Valeurs acceptées : `fr`, `en`**. Le template est résolu automatiquement. Une langue non supportée retourne `400 INVALID_REQUEST`. |
| `template` | string | ❌ | auto selon `langue` | **Optionnel — override manuel**. Nom exact d'un template Meta. À n'utiliser que pour cas particuliers (tests, nouveaux templates). |

> ✅ **Règle simple côté front** : envoyer uniquement `telephone`, `code` et `langue`. Ne pas toucher à `template`.

### 4.2 Headers

- `Content-Type: application/json` obligatoire
- CORS autorisé pour : `https://v2.fayclick.net`, `https://fayclick.com`, `https://fayclick.net`, `http://localhost:3000` (dev)

---

## 5. Formats de réponse

### 5.1 Succès (HTTP 200)

```json
{
  "success": true,
  "message": "Message WhatsApp envoye avec succes",
  "timestamp": "2026-04-12T23:32:30.093Z",
  "recipient": "+2217*****221",
  "message_id": "wamid.HBgMMjIxNzc3MzAxMjIxFQIAERgSNDEyRkUwNkQwMjAxQTI3QTU4AA=="
}
```

| Champ | Description |
|---|---|
| `success` | `true` |
| `message` | Message humain de succès |
| `timestamp` | ISO 8601 UTC |
| `recipient` | Numéro masqué (jamais loggé en clair) |
| `message_id` | ID de message WhatsApp retourné par Meta (à conserver pour tracking) |

### 5.2 Erreur — réponses normalisées

Toutes les erreurs suivent le format unifié :

```json
{
  "success": false,
  "message": "Message humain en francais",
  "error_code": "CODE_STABLE_POUR_FRONT",
  "timestamp": "2026-04-12T23:32:30.093Z"
}
```

#### 5.2.1 Erreurs de validation (HTTP 400)

| `error_code` | Déclencheur | Champ `details` ? |
|---|---|---|
| `INVALID_REQUEST` | `telephone` manquant, mal formaté, `code` invalide, etc. | ✅ Oui (tableau des erreurs par champ) |

Exemple :
```json
{
  "success": false,
  "message": "Requete invalide",
  "error_code": "INVALID_REQUEST",
  "details": [
    { "field": "telephone", "msg": "telephone doit etre au format E.164 (+indicatif...)" }
  ],
  "timestamp": "2026-04-12T23:32:30.093Z"
}
```

#### 5.2.2 Erreurs métier Meta (HTTP 200)

Ces erreurs sont retournées **en HTTP 200** pour ne pas être confondues avec des erreurs d'infra. La distinction réussite/échec se lit dans `success`.

| `error_code` | Signification | Action côté FayClick |
|---|---|---|
| `META_INVALID_NUMBER` | Le numéro n'est pas enregistré sur WhatsApp | Basculer sur fallback Email |
| `META_INVALID_TEMPLATE` | Template existe mais paramètres incorrects | Ne pas réessayer — bug backend à signaler |
| `META_TEMPLATE_NOT_FOUND` | Template inexistant sur le WABA | Vérifier `template`/`langue` envoyés ou fallback Email |
| `META_TEMPLATE_PARAM_MISMATCH` | Mauvais nombre de paramètres | Bug backend à signaler |
| `META_GENERIC_ERROR` | Erreur temporaire Meta | Retry automatique 1×, puis fallback Email |
| `META_UNKNOWN_ERROR` | Erreur non mappée | Fallback Email |

#### 5.2.3 Rate limiting (HTTP 429)

| `error_code` | Déclencheur | Action |
|---|---|---|
| `RATE_LIMITED` | Plus de 20 req/min depuis la même IP | Attendre, puis retry |
| `META_RATE_LIMIT` | Quota Meta atteint côté API | Attendre, puis fallback Email |
| `META_PAIR_RATE_LIMIT` | Trop de messages vers le même numéro | Ne pas retry sur ce numéro avant 1 h |
| `DAILY_QUOTA_EXCEEDED` | Quota journalier (250/jour en free tier) épuisé | Fallback Email pour toute la journée |

#### 5.2.4 Erreurs serveur (HTTP 5xx)

| `error_code` | HTTP | Signification | Action |
|---|---|---|---|
| `META_TOKEN_EXPIRED` | 500 | Token Meta invalide/expiré côté serveur | Alerte ICELABSOFT auto-déclenchée, fallback Email impératif |
| `INTERNAL_ERROR` | 500 | Erreur inattendue | Retry 1×, puis fallback Email |

#### 5.2.5 Autres

| `error_code` | HTTP | Signification |
|---|---|---|
| `CORS_FORBIDDEN` | 403 | Origine HTTP non autorisée (vérifier domaine appelant) |
| `NOT_FOUND` | 404 | URL de l'endpoint erronée |

---

## 6. Cascade recommandée côté frontend

```
1. Sénégal (+221)        → SMS (send_o_sms)        → fallback Email
2. Pays francophones     → WhatsApp (fr, fayclick_auth_code)        → fallback Email
3. Pays anglophones      → WhatsApp (en, fayclick_otp_verification) → fallback Email
```

**Logique de fallback WhatsApp → Email** : déclencher Email si l'une des conditions suivantes :
- `success: false` avec `error_code` ∈ `{META_INVALID_NUMBER, META_GENERIC_ERROR, META_UNKNOWN_ERROR, META_TOKEN_EXPIRED, META_RATE_LIMIT, DAILY_QUOTA_EXCEEDED, INTERNAL_ERROR}`
- Timeout réseau (> 20 s)

---

## 7. Exemples cURL prêts à l'emploi

### 7.1 FR — Sénégal, Côte d'Ivoire, Maroc, Burkina Faso, Mali, Bénin, Togo, Niger, Guinée, Algérie, Tunisie…

```bash
curl -X POST https://api.icelabsoft.com/whatsapp_service/api/send_otp \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+221777301221",
    "code": "12345",
    "langue": "fr"
  }'
```

### 7.2 EN — Ghana, Nigeria, Gambie, Liberia, Sierra Leone, Cap-Vert…

```bash
curl -X POST https://api.icelabsoft.com/whatsapp_service/api/send_otp \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+233241234567",
    "code": "98765",
    "langue": "en"
  }'
```

### 7.3 Langue omise → défaut `fr`

```bash
curl -X POST https://api.icelabsoft.com/whatsapp_service/api/send_otp \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+221781043505",
    "code": "54321"
  }'
```

### 7.4 Override manuel (cas rare — tester un template spécifique)

```bash
curl -X POST https://api.icelabsoft.com/whatsapp_service/api/send_otp \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+212612345678",
    "code": "11111",
    "template": "fayclick_otp_verification",
    "langue": "en"
  }'
```

### 7.5 Vérification status (monitoring + découverte mapping)

```bash
curl https://api.icelabsoft.com/whatsapp_service/api/status
```

Retour :
```json
{
  "success": true,
  "service": "whatsapp_service",
  "version": "1.0.0",
  "quota": { "used": 2, "limit": 250, "date": "2026-04-12" },
  "template_default": "fayclick_auth_code",
  "language_default": "fr",
  "supported_languages": ["fr", "en"],
  "template_map": {
    "fr": "fayclick_auth_code",
    "en": "fayclick_otp_verification"
  },
  "timestamp": "2026-04-12T23:32:30.000Z"
}
```

> 💡 Le frontend peut interroger `/status` au démarrage pour savoir dynamiquement quelles langues sont supportées, sans hardcoder.

### 7.5 Health check

```bash
curl https://api.icelabsoft.com/whatsapp_service/api/health
```

---

## 8. Exemple d'intégration TypeScript

```ts
// services/whatsapp.service.ts
export type WhatsAppLang = 'fr' | 'en';

export interface SendOtpResponse {
  success: boolean;
  message: string;
  timestamp: string;
  recipient?: string;
  message_id?: string;
  error_code?: string;
  details?: Array<{ field: string; msg: string }>;
}

/**
 * Envoie un OTP via WhatsApp. Le template est resolu automatiquement cote backend
 * selon la langue (fr -> fayclick_auth_code, en -> fayclick_otp_verification).
 */
export async function sendWhatsAppOtp(
  telephone: string,
  code: string,
  langue: WhatsAppLang = 'fr'
): Promise<SendOtpResponse> {
  const res = await fetch(
    'https://api.icelabsoft.com/whatsapp_service/api/send_otp',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telephone, code, langue }),
    }
  );
  return res.json();
}
```

### 8.1 Helper pour déduire la langue depuis l'indicatif pays

```ts
// Mapping indicatif -> langue par defaut
const ANGLOPHONE_PREFIXES = ['+233', '+234', '+220', '+231', '+232', '+238'];

export function languageFromPhone(telephone: string): WhatsAppLang {
  return ANGLOPHONE_PREFIXES.some(p => telephone.startsWith(p)) ? 'en' : 'fr';
}

// Usage dans otp-router.service.ts
const langue = languageFromPhone(user.telephone);
await sendWhatsAppOtp(user.telephone, otpCode, langue);
```

---

## 9. Points d'attention sécurité

- Le token Meta **n'est jamais exposé** dans les réponses, logs ou headers
- Les numéros sont **masqués** dans les logs d'audit (format `+2217*****221`)
- Toute erreur `META_TOKEN_EXPIRED` déclenche automatiquement une **alerte interne ICELABSOFT** (renouvellement de token nécessaire)
- Les logs Nginx spécifiques : `/var/log/nginx/whatsapp_service_{access,error}.log`
- Les logs applicatifs : `whatsapp_service/logs/whatsapp.log` (rotation 10 MB × 5)

---

## 10. Tests de validation effectués

| # | Scénario | Résultat |
|---|---|---|
| 1 | `langue:"fr"` sans `template` → résolution auto `fayclick_auth_code` | ✅ `success: true`, `message_id` reçu |
| 2 | `langue:"en"` sans `template` → résolution auto `fayclick_otp_verification` | ✅ `success: true`, `message_id` reçu |
| 3 | Aucun `langue` ni `template` → défaut FR | ✅ `success: true`, `message_id` reçu |
| 4 | Override manuel avec `template` explicite | ✅ `success: true`, `message_id` reçu |
| 5 | `langue:"es"` (non supportée) | ✅ `400 INVALID_REQUEST` avec liste des langues valides |
| 6 | Body sans `telephone` | ✅ `400 INVALID_REQUEST` avec `details` |
| 7 | `telephone` au format local (sans `+` ni indicatif) | ✅ `400 INVALID_REQUEST` |
| 8 | Template inexistant | ✅ `200 META_TEMPLATE_NOT_FOUND` |
| 9 | Health check public HTTPS | ✅ `200` |
| 10 | Status + quota + mapping templates | ✅ `200` avec `supported_languages` et `template_map` |

---

## 11. Ressources complémentaires

- **URL endpoint** : `https://api.icelabsoft.com/whatsapp_service/api/send_otp`
- **URL status** : `https://api.icelabsoft.com/whatsapp_service/api/status`
- **URL health** : `https://api.icelabsoft.com/whatsapp_service/api/health`
- **Monitoring logs** côté ICELABSOFT : `docker logs whatsapp_service_icelabsoft -f`
- **Contact backend** : équipe ICELABSOFT

---

## 12. Prochaines étapes

1. FayClick intègre `services/whatsapp.service.ts` (≈ 30 min avec l'exemple §8)
2. FayClick étend `services/otp-router.service.ts` pour la cascade (§6)
3. Tests bout-en-bout FayClick sur 2–3 pays (SN, CI, GH)
4. Go-live international

---

**L'endpoint est immédiatement utilisable. Toute question ou retour à signaler à l'équipe ICELABSOFT.**
