# Mémo Frontend — Endpoint WhatsApp `send_message` opérationnel

**De** : Équipe Backend ICELABSOFT
**À** : Équipe FayClick (Frontend V2)
**Date** : 2026-04-30
**Objet** : Livraison de l'endpoint `whatsapp_service/api/send_message` — 11 templates opérationnels disponibles
**Référence** : Mémo FayClick du 2026-04-30 (templates opérationnels & dashboard admin)
**Version service** : `1.1.0`

---

## 1. Statut de livraison

| Élément | Statut |
|---|---|
| Service Docker `whatsapp_service_icelabsoft` (port 3200) | ✅ Déployé |
| Nginx reverse proxy sur `api.icelabsoft.com` | ✅ Configuré |
| 11 templates opérationnels (FR + EN) | ✅ APPROVED côté Meta |
| Endpoint `POST /send_message` | ✅ Opérationnel |
| Endpoint `GET /status` (introspection templates) | ✅ Disponible |
| Tests end-to-end (les 11 templates) | ✅ Validés sur `+221777301221` |
| Repo Git privé | ✅ `mouhalo/whatsapp_service` |

---

## 2. URLs

| Endpoint | Méthode | Usage |
|---|---|---|
| `https://api.icelabsoft.com/whatsapp_service/api/send_otp` | POST | OTP (inchangé, voir mémo précédent) |
| `https://api.icelabsoft.com/whatsapp_service/api/send_message` | **POST** | **Nouveau — messages opérationnels** |
| `https://api.icelabsoft.com/whatsapp_service/api/status` | GET | Quota + liste des templates supportés |
| `https://api.icelabsoft.com/whatsapp_service/api/health` | GET | Health check |

---

## 3. Format de requête commun

```http
POST /whatsapp_service/api/send_message
Content-Type: application/json

{
  "telephone": "+221777301221",
  "template": "<nom_ou_alias>",
  "langue": "fr",
  "variables": [...],
  "header_image_url": "https://...",
  "button_url_param": "..."
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `telephone` | string | ✅ | Format E.164 strict — regex `^\+\d{8,15}$` (ex: `+221777301221`, `+2126XXXXXXXX`) |
| `template` | string | ✅ | Nom Meta exact OU **nom de base** (ex: `payment_confirmed` accepté pour `achat_confirme_ok`) |
| `langue` | string | ❌ (défaut `fr`) | `fr` ou `en` — sert à résoudre automatiquement le bon template selon la base |
| `variables` | string[] | ✅ | Tableau ordonné des `{{1}}`, `{{2}}`, … du body. Tableau vide `[]` si template sans variable body |
| `header_image_url` | string | conditionnel | URL **https** publique d'image, requise pour les templates avec header IMAGE (`present_shop`, `present_product`) |
| `button_url_param` | string | conditionnel | Paramètre du button URL dynamique (cf. § 5). Auto-déduit pour `achat_confirme_ok` / `payment_confirmed` |

---

## 4. Catalogue des 11 templates

### 4.1 Vue d'ensemble

| Nom Meta | Alias accepté | Langue | Body vars | Header | Button URL | Usage |
|---|---|---|---|---|---|---|
| `fayclick_admin_message` | — | fr | 2 | TEXT statique | — | Message admin générique FR |
| `fayclick_admin_message_en` | `fayclick_admin_message` | en | 2 | TEXT statique | — | Message admin générique EN |
| `achat_confirme_ok` | `achat_confirme`, `payment_confirmed` | fr | 4 | TEXT statique | dyn (auto) | Confirmation paiement FR |
| `payment_confirmed` | `achat_confirme`, `payment_confirmed` | en | 4 | TEXT statique | dyn (auto) | Confirmation paiement EN |
| `fayclick_subscription_offered` | — | fr | 3 | TEXT statique | — | Cadeau abonnement FR |
| `fayclick_subscription_offered_en` | `fayclick_subscription_offered` | en | 3 | TEXT statique | — | Cadeau abonnement EN |
| `fayclick_subscription_expiring` | — | fr | 3 | TEXT statique | — | Rappel expiration FR |
| `fayclick_subscription_expiring_en` | `fayclick_subscription_expiring` | en | 3 | TEXT statique | — | Rappel expiration EN |
| `fayclick_password_reset` | — | fr | 2 | TEXT statique | — | Reset MDP (FR uniquement) |
| `present_product` | `present_shop` | fr | 0 | **IMAGE** | dyn (explicite) | Présenter sa boutique FR |
| `present_shop` | `present_product` | en | 0 | **IMAGE** | dyn (explicite) | Présenter sa boutique EN |

> **Astuce résolution** : passez le nom de base (ex. `payment_confirmed`) avec `langue: "fr"` ou `langue: "en"`, le backend choisit automatiquement la bonne version Meta. Vous pouvez aussi utiliser le nom Meta exact directement.

### 4.2 Détail par template

#### A. `fayclick_admin_message` / `fayclick_admin_message_en`

**Rendu** : `📢 Message de l'équipe FayClick — Sujet : {{1}} — {{2}} …`

```json
{
  "telephone": "+221777301221",
  "template": "fayclick_admin_message",
  "langue": "fr",
  "variables": [
    "Maintenance prévue dimanche",
    "Le service sera indisponible de 02h à 04h du matin pour mise à jour."
  ]
}
```

#### B. `achat_confirme_ok` / `payment_confirmed`

**Rendu** : `🎁 Paiement confirmé! Le client avec le numéro *{{1}}* vient de payer *{{2}}* par *{{3}}*. Facture : {{4}}` + bouton *Facture*.

```json
{
  "telephone": "+221777301221",
  "template": "payment_confirmed",
  "langue": "fr",
  "variables": [
    "+221781043505",
    "1500 FCFA",
    "Orange Money",
    "https://fayclick.com/facture?token=MjE4LTE1MTExMg"
  ]
}
```

> Le bouton *Facture* pointe vers `https://fayclick.com/facture{{1}}`. Le suffixe (`?token=...`) est **automatiquement extrait** du 4e variable. Aucune action requise côté frontend.

#### C. `fayclick_subscription_offered` / `_en`

**Rendu** : `🎁 Bonne nouvelle! L'équipe FayClick a offert {{2}} jour(s) d'abonnement gratuit à votre structure « {{1}} ». Validité jusqu'au : {{3}}`

```json
{
  "telephone": "+221777301221",
  "template": "fayclick_subscription_offered",
  "langue": "fr",
  "variables": [
    "Cabinet Dentaire ICELAB",
    "30",
    "2026-05-30"
  ]
}
```

#### D. `fayclick_subscription_expiring` / `_en`

**Rendu** : `⏰ Bonjour, l'abonnement FayClick de votre structure « {{1}} » expire dans {{2}} jour(s). Montant à régler : {{3}} …`

```json
{
  "telephone": "+221777301221",
  "template": "fayclick_subscription_expiring",
  "langue": "fr",
  "variables": [
    "Cabinet Dentaire ICELAB",
    "3",
    "15000 FCFA"
  ]
}
```

#### E. `fayclick_password_reset` (FR uniquement)

**Rendu** : `🔐 Bonjour, votre mot de passe FayClick a été réinitialisé. Login : {{1}} — Nouveau mot de passe : *{{2}}* …`

```json
{
  "telephone": "+221777301221",
  "template": "fayclick_password_reset",
  "langue": "fr",
  "variables": [
    "loitdevexpert@kelefa.fay",
    "Tx9zKp2!a"
  ]
}
```

> ⚠️ Pas de version EN approuvée à ce jour. Si requis, demander à l'équipe Meta de FayClick de soumettre `fayclick_password_reset_en`.

#### F. `present_product` (FR) / `present_shop` (EN)

**Rendu** : Image (logo/photo boutique) + texte fixe « Tous mes produits sont sur FayClick » + bouton *Ma boutique* / *Visit me*.

```json
{
  "telephone": "+221777301221",
  "template": "present_shop",
  "langue": "en",
  "variables": [],
  "header_image_url": "https://fayclick.com/img/structure-218.png",
  "button_url_param": "218"
}
```

| Champ spécifique | Description |
|---|---|
| `header_image_url` | **Obligatoire**. URL **https** publique vers une image (PNG/JPEG ≤ 5 Mo). Meta télécharge l'image au moment de l'envoi. |
| `button_url_param` | **Obligatoire**. ID structure (ex: `"218"`). Le bouton pointera vers `https://fayclick.com/catalogue?id=218`. |

> **Important** : l'image doit être accessible publiquement (Meta la télécharge depuis ses serveurs). Pas d'authentification, pas de redirection.

---

## 5. Réponses

### 5.1 Succès — HTTP 200

```json
{
  "success": true,
  "message": "Message WhatsApp envoye avec succes",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "recipient": "+2217*****221",
  "message_id": "wamid.HBgMMjIxNzc3MzAxMjIxFQI..."
}
```

> `recipient` est masqué pour éviter de leaker le numéro complet dans les logs frontend.
> `message_id` est l'identifiant Meta — utile pour traçabilité côté Business Manager.

### 5.2 Erreur — format unique

```json
{
  "success": false,
  "message": "<message lisible>",
  "error_code": "<CODE_MACHINE>",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "details": [...]   // present uniquement pour INVALID_REQUEST
}
```

### 5.3 Codes d'erreur

| HTTP | `error_code` | Cause | Action frontend |
|---|---|---|---|
| 400 | `INVALID_REQUEST` | Body invalide, telephone non E.164, template hors whitelist, variables incorrectes, image/button manquant | Corriger la requête, lire `details[]` |
| 200 | `META_INVALID_NUMBER` | Numéro non enregistré sur WhatsApp | Fallback (email/SMS) |
| 200 | `META_INVALID_TEMPLATE` | Template invalide / paramètres mal formés | Bug : signaler au backend |
| 200 | `META_TEMPLATE_NOT_FOUND` | Template absent du WABA | Bug : signaler au backend |
| 200 | `META_TEMPLATE_PARAM_MISMATCH` | Nombre de paramètres incorrect | Bug : signaler au backend |
| 200 | `META_GENERIC_ERROR` | Erreur Meta non spécifique | Réessayer, sinon fallback |
| 429 | `RATE_LIMITED` | 20 req/min/IP dépassé | Attendre 1 min |
| 429 | `META_RATE_LIMIT` | Quota global Meta atteint | Attendre |
| 429 | `META_PAIR_RATE_LIMIT` | Trop de messages vers ce numéro précis | Attendre |
| 429 | `DAILY_QUOTA_EXCEEDED` | Quota service ICELABSOFT atteint (250/24h) | Reporter au lendemain |
| 500 | `META_TOKEN_EXPIRED` | Token Meta expiré (rare, alerte automatique côté ICELABSOFT) | Signaler urgent au backend |
| 500 | `INTERNAL_ERROR` | Erreur interne | Signaler au backend |
| 403 | `CORS_FORBIDDEN` | Origine non autorisée | Vérifier le domaine d'appel |
| 404 | `NOT_FOUND` | Endpoint inexistant | Vérifier l'URL |

---

## 6. Sécurité & limitations

| Élément | Valeur |
|---|---|
| HTTPS uniquement | ✅ Let's Encrypt |
| CORS autorisés | `https://v2.fayclick.net`, `https://fayclick.com`, `https://fayclick.net`, `http://localhost:3000` |
| Rate limit IP | **20 req/minute** par IP source |
| Quota global service | **250 envois / 24h** (free tier Meta) |
| Token Meta | Stocké côté serveur, jamais retourné, jamais loggué |
| Numéro masqué dans logs | `+2217*****221` |

---

## 7. Snippet TypeScript pour intégration

```ts
// services/whatsapp.service.ts
const API_BASE = 'https://api.icelabsoft.com/whatsapp_service/api';

interface SendMessageRequest {
  telephone: string;             // E.164, ex: "+221777301221"
  template: string;              // nom ou alias
  langue?: 'fr' | 'en';
  variables: string[];
  header_image_url?: string;
  button_url_param?: string;
}

interface SendMessageResponse {
  success: boolean;
  message: string;
  timestamp: string;
  recipient?: string;
  message_id?: string;
  error_code?: string;
  details?: Array<{ field: string; msg: string }>;
}

export async function sendWhatsAppMessage(
  payload: SendMessageRequest
): Promise<SendMessageResponse> {
  const res = await fetch(`${API_BASE}/send_message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Exemples d'usage

// 1. Reset mot de passe (depuis dashboard admin)
await sendWhatsAppMessage({
  telephone: '+221777301221',
  template: 'fayclick_password_reset',
  langue: 'fr',
  variables: ['loitdevexpert@kelefa.fay', 'Tx9zKp2!a']
});

// 2. Rappel J-3 expiration abonnement
await sendWhatsAppMessage({
  telephone: '+221781043505',
  template: 'fayclick_subscription_expiring',
  langue: 'fr',
  variables: ['Cabinet Dentaire ICELAB', '3', '15000 FCFA']
});

// 3. Confirmation paiement (le suffixe URL est auto-deduit)
await sendWhatsAppMessage({
  telephone: '+221777301221',
  template: 'payment_confirmed',
  langue: 'fr',
  variables: [
    '+221781043505',
    '1500 FCFA',
    'Wave',
    'https://fayclick.com/facture?token=MjE4LTE1MTExMg'
  ]
});

// 4. Présentation boutique (image + button explicites)
await sendWhatsAppMessage({
  telephone: '+221777301221',
  template: 'present_shop',
  langue: 'fr',                      // resolution auto -> present_product (fr)
  variables: [],
  header_image_url: 'https://fayclick.com/img/structure-218.png',
  button_url_param: '218'
});
```

---

## 8. Introspection — endpoint `/status`

À tout moment :

```bash
curl -s https://api.icelabsoft.com/whatsapp_service/api/status | jq
```

Retourne :
- Quota journalier consommé
- Liste des `operational_templates` supportés (nom + langue + arité)
- Langues supportées et template par défaut

Pratique pour vérifier qu'un template a bien été ajouté au backend avant déploiement frontend.

---

## 9. Tests cURL prêts à l'emploi

```bash
# Reset mot de passe
curl -X POST https://api.icelabsoft.com/whatsapp_service/api/send_message \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+221777301221",
    "template": "fayclick_password_reset",
    "langue": "fr",
    "variables": ["loitdevexpert@kelefa.fay", "Tx9zKp2!a"]
  }'

# Présentation boutique avec image
curl -X POST https://api.icelabsoft.com/whatsapp_service/api/send_message \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+221777301221",
    "template": "present_product",
    "langue": "fr",
    "variables": [],
    "header_image_url": "https://fayclick.com/apple-touch-icon.png",
    "button_url_param": "218"
  }'
```

---

## 10. Flow recommandés côté frontend

| Cas d'usage | Template | Trigger |
|---|---|---|
| Reset MDP par admin | `fayclick_password_reset` | Bouton "Reset password" du dashboard admin |
| Achat client | `payment_confirmed` (auto fr/en) | Webhook callback OFMS/INTOUCH succès |
| Cadeau abonnement | `fayclick_subscription_offered` | Action admin (gratuité offerte) |
| Rappel J-7 / J-3 / J-1 | `fayclick_subscription_expiring` | Cron quotidien |
| Communication globale | `fayclick_admin_message` | Action admin (notifications) |
| Promotion boutique | `present_shop` / `present_product` | Action structure (partage) |

**Cascade fallback recommandée** (si `META_INVALID_NUMBER`) : `WhatsApp → Email (email_sender) → SMS (send_o_sms, SN uniquement)`.

---

## 11. Évolutions possibles

À court terme, peuvent être ajoutés sur demande :
- Template `fayclick_password_reset_en` (à soumettre côté Meta par FayClick)
- Support d'images en base64 (auto-upload Meta) au lieu d'URL publiques
- Webhook delivery / read status (Meta callback `messages.statuses`)
- Multi-instance avec compteur Redis pour le quota (actuellement in-memory, remis à 0 au restart)

---

## 12. Contact backend ICELABSOFT

Tout problème, question ou besoin de nouveau template :
- Repo Git : `https://github.com/mouhalo/whatsapp_service` (privé)
- Logs container : `docker logs whatsapp_service_icelabsoft`
- Logs fichier : `/home/apis_ice/whatsapp_service/logs/whatsapp.log` (et `error.log`)

**Bon dev !** L'équipe backend reste disponible pour ajustements.
