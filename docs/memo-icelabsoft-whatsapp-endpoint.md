# Mémo à l'équipe Backend ICELABSOFT — Endpoint WhatsApp OTP

**De** : Équipe FayClick
**Date** : 2026-04-12
**Objet** : Création d'un endpoint proxy `whatsapp_service/api/send_otp` pour l'envoi de codes OTP via WhatsApp Business API (Meta)
**Priorité** : Haute — bloquant pour l'ouverture de FayClick aux pays CEDEAO/Maghreb

---

## 1. Contexte

FayClick V2 vient d'ouvrir son inscription à **17 pays** (CEDEAO + UEMOA + Maghreb). L'API SMS `send_o_sms` ne couvre que l'indicatif `+221`. Actuellement, pour les pays non-SN, les OTP sont envoyés par email (`email_sender/api/send`), mais l'équipe produit souhaite passer à **WhatsApp** comme canal primaire hors Sénégal :

| Pays | Canal primaire | Canal fallback |
|------|----------------|-----------------|
| 🇸🇳 Sénégal | SMS (`send_o_sms`) | Email |
| 🌍 Autres (16 pays) | **WhatsApp (nouveau)** | Email |

FayClick V2 étant une app **statique** (hébergement FTP), **aucun token Meta ne peut être stocké côté frontend** : il serait exposé dans le bundle JavaScript et tout visiteur pourrait l'extraire, compromettant le WABA complet (spam, facturation, ban Meta).

Solution : un endpoint proxy côté `api.icelabsoft.com` qui :
1. Reçoit une requête simple du frontend
2. Appelle l'API Graph de Meta avec le token stocké côté serveur
3. Retourne le résultat au frontend

Pattern **identique** aux endpoints existants `sms_service/api/send_o_sms` et `email_sender/api/send`.

---

## 2. Credentials Meta WhatsApp Business (fournis par FayClick)

```
Phone Number ID  : 1035744049616511
WABA ID          : 4028677147420630
Numéro expéditeur: +221 71 165 13 30 (iceSupport)
Token Bearer     : [À stocker dans la config serveur ICELABSOFT, jamais commité]
```

**Templates WhatsApp approuvés** :

| Nom template | Langue | Catégorie | Variables | Usage |
|--------------|--------|-----------|-----------|-------|
| `fayclick_otp_verification` | `en` | Authentication (Copy code) | `{{1}}` = code OTP | Fallback anglophone (optionnel) |
| `fayclick_auth_code` | `fr` | Authentication (Copy code) | `{{1}}` = code OTP | **Template principal** (FayClick est FR) |

---

## 3. Spécification de l'endpoint à créer

### 3.1 Route

```
POST https://api.icelabsoft.com/whatsapp_service/api/send_otp
Content-Type: application/json
```

### 3.2 Body (requête du frontend FayClick)

```json
{
  "telephone": "+212612345678",
  "code": "12345",
  "template": "fayclick_auth_code",
  "langue": "fr"
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `telephone` | string | ✅ | Numéro au format E.164 avec `+` et indicatif pays (ex: `+212612345678`, `+2250712345678`) |
| `code` | string | ✅ | Code OTP à injecter dans le template (5 chiffres) |
| `template` | string | ❌ | Nom du template. Défaut : `fayclick_auth_code` |
| `langue` | string | ❌ | Code langue ISO du template. Défaut : `fr` |

### 3.3 Logique côté serveur ICELABSOFT

Le serveur doit construire l'appel à Meta Graph API comme suit :

```http
POST https://graph.facebook.com/v25.0/1035744049616511/messages
Authorization: Bearer {TOKEN_META_SERVER_SIDE}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "{{telephone sans le + mais avec indicatif, ex: 212612345678}}",
  "type": "template",
  "template": {
    "name": "{{template fourni, ex: fayclick_auth_code}}",
    "language": { "code": "{{langue, ex: fr}}" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "{{code OTP}}" }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [
          { "type": "text", "text": "{{code OTP}}" }
        ]
      }
    ]
  }
}
```

> **Note** : Le bloc `"type": "button"` est requis par Meta pour les templates de catégorie **Authentication avec Copy code**. Sans ce bloc, Meta rejette avec erreur `131009`.

### 3.4 Réponse attendue (du proxy vers FayClick)

**Succès (HTTP 200)** :
```json
{
  "success": true,
  "message": "Message WhatsApp envoyé avec succès",
  "timestamp": "2026-04-12T21:00:00.000Z",
  "recipient": "+2126*****678",
  "message_id": "wamid.HBgMMjEyNj..."
}
```

**Erreur (HTTP 4xx/5xx)** :
```json
{
  "success": false,
  "message": "Numéro WhatsApp invalide ou non inscrit",
  "error_code": "META_INVALID_NUMBER",
  "timestamp": "2026-04-12T21:00:00.000Z"
}
```

### 3.5 Gestion des erreurs Meta à mapper

| Code Meta | Signification | Message à renvoyer |
|-----------|---------------|--------------------|
| 131026 | Numéro pas sur WhatsApp | "Le numéro n'est pas enregistré sur WhatsApp" |
| 131009 | Template invalide / paramètres manquants | "Erreur de configuration du template" |
| 131000 | Erreur générique | "Erreur temporaire, réessayez" |
| 190 | Token expiré | "Erreur d'authentification (contacter support)" — **critique, logger** |
| Rate limit | Limite Meta atteinte (250/24h en free tier) | "Limite d'envoi atteinte, patientez" |

Toute erreur `190` doit **déclencher une alerte** côté ICELABSOFT (token à renouveler).

---

## 4. Sécurité

- ✅ Token Meta **stocké dans les variables d'environnement du serveur** `api.icelabsoft.com`, jamais dans un fichier commité ni dans un header retourné
- ✅ Endpoint accessible **uniquement via HTTPS**
- ✅ Ajouter un filtre par origine si possible : accepter les requêtes venant de `https://v2.fayclick.net`, `https://fayclick.com` (CORS)
- ✅ Log des envois (numéro masqué + timestamp + succès/échec) pour audit
- ⚠️ **Ne jamais logger le token** ni retourner son contenu, même partiel

---

## 5. Rate Limiting & Coûts

- **Free tier Meta** : 250 conversations / 24h
- **Au-delà** : tarif par message selon pays destinataire (~0.02 à 0.05 USD)
- Prévoir un compteur côté ICELABSOFT pour monitorer la consommation mensuelle et alerter si seuil dépassé

---

## 6. Tests attendus

Avant mise en production, valider les 4 cas suivants :

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| 1 | Envoi vers un numéro CI valide sur WhatsApp | 200 + `success: true` + message reçu |
| 2 | Envoi vers un numéro sans WhatsApp | 200 + `success: false` + code `META_INVALID_NUMBER` |
| 3 | Template inexistant | 200 + `success: false` + code `META_INVALID_TEMPLATE` |
| 4 | Body invalide (telephone manquant) | 400 + `success: false` + code `INVALID_REQUEST` |

---

## 7. Livrables attendus de l'équipe ICELABSOFT

1. **URL de l'endpoint** une fois déployé : `https://api.icelabsoft.com/whatsapp_service/api/send_otp`
2. **Environnement** : prod accessible (même hôte que les autres API ICELABSOFT)
3. **Test cURL** validé fourni à FayClick pour vérification
4. **Date de mise à disposition** estimée

Une fois l'endpoint livré, FayClick intègre côté frontend en ~2h :
- Création de `services/whatsapp.service.ts`
- Extension de `services/otp-router.service.ts` pour implémenter la cascade (WhatsApp → Email)
- Tests bout-en-bout sur 2-3 pays

---

## 8. Contact FayClick

Pour toute question technique sur les besoins FayClick, répondre à ce mémo avec vos estimations et questions éventuelles. Une fois l'endpoint prêt, FayClick se charge de l'intégration frontend.

**Merci pour votre réactivité — cette intégration est le dernier bloqueur pour l'ouverture internationale.**
