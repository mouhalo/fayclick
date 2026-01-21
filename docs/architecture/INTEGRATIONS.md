# FayClick V2 - Intégrations Externes

> **Document BMAD** | Version: 1.0 | Dernière mise à jour: 2026-01-21

---

## 1. Vue d'Ensemble

FayClick intègre plusieurs services externes pour les paiements et notifications.

| Service | Type | API | Statut |
|---------|------|-----|--------|
| Orange Money | Paiement | OFMS | ✅ Production |
| Wave | Paiement | INTOUCH | ✅ Production |
| Free Money | Paiement | OFMS | ✅ Production |
| SMS Gateway | Notification | send_o_sms | ✅ Production |

---

## 2. Orange Money (OM)

### 2.1 Configuration

| Paramètre | Valeur |
|-----------|--------|
| Service Name | `OFMS` |
| App Name | `FAYCLICK` |
| API Base | `api.icelabsoft.com/pay_services` |

### 2.2 Flux de Paiement

```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐
│ FayClick │────▶│  API OFMS   │────▶│ Orange   │────▶│  Client  │
│  (Init)  │     │  (payment)  │     │  Money   │     │  (USSD)  │
└──────────┘     └─────────────┘     └──────────┘     └────┬─────┘
                                                           │
┌──────────┐     ┌─────────────┐     ┌──────────┐         │
│ FayClick │◀────│  Callback   │◀────│  OM API  │◀────────┘
│ (Confirm)│     │  /Polling   │     │(Confirm) │
└──────────┘     └─────────────┘     └──────────┘
```

### 2.3 Endpoints

**Initier paiement:**
```json
POST /pay_services/api/payment
{
  "pservicename": "OFMS",
  "app_name": "FAYCLICK",
  "pReference": "FAY183173629",
  "pAmount": "5000",
  "pTelnumber": "777301221",
  "pDescription": "Facture #123"
}
```

**Vérifier statut:**
```
GET /pay_services/api/payment_status/{uuid}
```

**Envoyer argent (retrait):**
```json
POST /pay_services/api/send_cash
{
  "pservicename": "OFMS",
  "pmethode": "OM",
  "ptelnumber": "777301221",
  "pamount": 1000,
  "pmotif": "Retrait KALPE",
  "pnomstructure": "MA BOUTIQUE"
}
```

### 2.4 Codes Réponse

| Code | Statut | Action |
|------|--------|--------|
| `PENDING` | En attente | Continuer polling |
| `PROCESSING` | En cours | Continuer polling |
| `COMPLETED` | Succès | Enregistrer paiement |
| `FAILED` | Échec | Afficher erreur |

---

## 3. Wave

### 3.1 Configuration

| Paramètre | Valeur |
|-----------|--------|
| Service Name | `INTOUCH` |
| App Name | `FAYCLICK` |
| API Base | `api.icelabsoft.com/pay_services` |

### 3.2 Particularités

- **QR Code** : Généré avec l'UUID de transaction
- **Double bouton** : App Wave + Web Wave
- **Timeout** : 5 minutes max

### 3.3 Endpoints

**Initier paiement:**
```json
POST /pay_services/api/payment
{
  "pservicename": "INTOUCH",
  "app_name": "FAYCLICK",
  "pReference": "FAY183173629",
  "pAmount": "5000",
  "pTelnumber": "777301221",
  "pDescription": "Facture #123"
}
```

**Retrait:**
```json
POST /pay_services/api/send_cash
{
  "pservicename": "INTOUCH",
  "pmethode": "WAVE",
  "ptelnumber": "777301221",
  "pamount": 1000,
  "pmotif": "Retrait KALPE"
}
```

---

## 4. Free Money

### 4.1 Configuration

| Paramètre | Valeur |
|-----------|--------|
| Service Name | `OFMS` |
| App Name | `FAYCLICK` |
| Méthode | `FREE` |

### 4.2 Particularités

- Utilise la même API qu'Orange Money (OFMS)
- Numéros commençant par 76

### 4.3 Endpoints

Mêmes endpoints qu'Orange Money avec `pmethode: "FREE"` pour send_cash.

---

## 5. SMS Gateway

### 5.1 Configuration

| Paramètre | Valeur |
|-----------|--------|
| API Base | `api.icelabsoft.com/sms_service` |
| Sender | `ICELABOSOFT` |

### 5.2 Usages

| Usage | Template |
|-------|----------|
| OTP Retrait | `Entrez le code : {code} pour valider le retrait de {montant} FCFA. Code valide 2 min.` |
| Notification Facture | `Nouvelle facture #{num} de {montant} FCFA. Payer: {url}` |
| Rappel Paiement | `Rappel: Facture #{num} impayée. Montant: {montant} FCFA` |

### 5.3 Endpoint

```json
POST /sms_service/api/send_o_sms
{
  "numtel": "777301221",
  "message": "Votre code OTP : 12345",
  "sender": "ICELABOSOFT"
}
```

### 5.4 Réponse

```json
{
  "success": true,
  "message_id": "SMS-2026012119304512345"
}
```

---

## 6. Gestion des Erreurs

### 6.1 Erreurs Paiement

| Erreur | Cause | Action |
|--------|-------|--------|
| `INSUFFICIENT_FUNDS` | Solde client insuffisant | Message utilisateur |
| `INVALID_NUMBER` | Numéro incorrect | Vérifier format |
| `SERVICE_UNAVAILABLE` | API indisponible | Retry + fallback |
| `TIMEOUT` | Pas de réponse client | Annuler transaction |

### 6.2 Erreurs SMS

| Erreur | Cause | Action |
|--------|-------|--------|
| `INVALID_PHONE` | Format numéro incorrect | Valider avant envoi |
| `QUOTA_EXCEEDED` | Limite SMS atteinte | Alerter admin |

---

## 7. Sécurité

### 7.1 Validation Numéros

```typescript
// Format Sénégal : 9 chiffres commençant par 7
const isValidPhone = (tel: string) => /^7[0-9]{8}$/.test(tel);

// Préfixes par opérateur
const OM_PREFIXES = ['77', '78'];  // Orange
const WAVE_PREFIXES = ['77', '78', '76', '70'];
const FREE_PREFIXES = ['76'];
```

### 7.2 Références de Paiement

```typescript
// Max 19 caractères
const generateRef = (id_structure: number) => {
  const timestamp = Date.now().toString().slice(-10);
  return `FAY${id_structure}${timestamp}`.slice(0, 19);
};
```

### 7.3 OTP

| Paramètre | Valeur |
|-----------|--------|
| Longueur | 5 chiffres |
| Validité | 2 minutes |
| Tentatives max | 3 |
| Stockage | Mémoire serveur |

---

## 8. Polling et Webhooks

### 8.1 Stratégie Polling

```typescript
// Polling toutes les 3 secondes
const POLL_INTERVAL = 3000;
const MAX_ATTEMPTS = 100; // 5 minutes

const startPolling = async (uuid: string, onComplete: Function) => {
  let attempts = 0;
  const poll = async () => {
    const status = await checkPaymentStatus(uuid);
    if (status === 'COMPLETED') {
      onComplete(status);
      return;
    }
    if (status === 'FAILED' || attempts >= MAX_ATTEMPTS) {
      onError(status);
      return;
    }
    attempts++;
    setTimeout(poll, POLL_INTERVAL);
  };
  poll();
};
```

### 8.2 Timeout Handling

| Service | Timeout |
|---------|---------|
| OM/Free | 5 minutes |
| Wave | 5 minutes |
| SMS | 30 secondes |

---

## 9. Monitoring

### 9.1 Métriques à Surveiller

| Métrique | Seuil alerte |
|----------|--------------|
| Taux succès paiements | < 95% |
| Temps réponse API | > 5s |
| Échecs SMS | > 5% |

### 9.2 Logs

```typescript
// Log chaque transaction
console.log(`[PAYMENT] ${method} ${amount} FCFA -> ${tel} | Status: ${status}`);
console.log(`[SMS] ${tel} | Status: ${success ? 'OK' : 'FAIL'}`);
```

---

## 10. Configuration Environnement

### Variables

```env
# API Base URLs
API_BASE_DEV=http://127.0.0.1:5000
API_BASE_PROD=https://api.icelabsoft.com

# Services
PAYMENT_SERVICE=/pay_services/api
SMS_SERVICE=/sms_service/api

# App
APP_NAME=FAYCLICK
SMS_SENDER=ICELABOSOFT
```

### Détection Automatique

```typescript
// lib/api-config.ts
const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = isDev ? API_BASE_DEV : API_BASE_PROD;
```

---

## 11. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | System Architect Agent | Documentation initiale |
