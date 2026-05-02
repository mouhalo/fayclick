# Mémo à l'équipe Backend ICELABSOFT — Templates WhatsApp opérationnels & endpoint `send_message`

**De** : Équipe FayClick
**À** : Équipe Backend ICELABSOFT
**Date** : 2026-04-30
**Objet** : Création de **5 templates WhatsApp Meta** (FR + EN) et d'un nouvel endpoint `whatsapp_service/api/send_message` permettant l'envoi de messages opérationnels au-delà des OTP
**Priorité** : Haute — débloque le module Admin (PRD `prd-admin-gestion-structures-2026-04-30.md`) et la communication client opérationnelle
**Référence précédente** : `memo-icelabsoft-whatsapp-endpoint.md` (2026-04-12, livraison `send_otp`)

---

## 1. Contexte

L'endpoint actuel `https://api.icelabsoft.com/whatsapp_service/api/send_otp` ne supporte que des templates de catégorie **Authentication** avec un code OTP (4 à 8 chiffres) en variable. Il a parfaitement répondu au besoin OTP de l'inscription multi-pays.

FayClick V2 livre actuellement :
1. Un **dashboard administrateur** (gestion des structures, abonnements, reset password) → besoin d'envoyer un MDP texte ou des notifications opérationnelles.
2. Un **système de rappels d'abonnement** automatique (J-7, J-3, J-1 avant échéance).
3. Une **gestion des factures impayées** avec relance client.

Aucun de ces flux ne peut passer par `send_otp` car :
- Le template `fayclick_auth_code` est limité aux chiffres → impossible d'envoyer un mot de passe alphanumérique.
- La catégorie *Authentication* exclut tout message non-OTP (politique Meta stricte).
- Pas de support des messages avec plusieurs variables texte.

Solution demandée : **créer un nouvel endpoint `send_message`** + soumettre **5 templates Meta supplémentaires** (FR + EN, soit 10 versions linguistiques au total).

---

## 2. Templates Meta WhatsApp à créer

### 2.1 Template 1 — Reset password (URGENT, bloquant pour l'admin)

**Nom** : `fayclick_password_reset` (FR) / `fayclick_password_reset_en` (EN)
**Catégorie Meta** : **UTILITY**
**Langue** : `fr` / `en`
**Variables** :
- `{{1}}` = login utilisateur (ex: `loitdevexpert@kelefa.fay`)
- `{{2}}` = nouveau mot de passe (ex: `Tx9zKp2!a`)

**Texte FR proposé** :
```
🔐 Bonjour, votre mot de passe FayClick a été réinitialisé par l'équipe administrative.

Login : {{1}}
Nouveau mot de passe : {{2}}

⚠️ Connectez-vous immédiatement et changez ce mot de passe depuis vos paramètres.

L'équipe FayClick
```

**Texte EN proposé** :
```
🔐 Hello, your FayClick password has been reset by the admin team.

Login: {{1}}
New password: {{2}}

⚠️ Please log in immediately and change this password from your settings.

The FayClick Team
```

---

### 2.2 Template 2 — Rappel échéance abonnement

**Nom** : `fayclick_subscription_expiring` / `fayclick_subscription_expiring_en`
**Catégorie Meta** : **UTILITY**
**Langue** : `fr` / `en`
**Variables** :
- `{{1}}` = nom de la structure
- `{{2}}` = nombre de jours restants (ex: `3`)
- `{{3}}` = montant à régler (ex: `3 100 FCFA`)

**Texte FR proposé** :
```
⏰ Bonjour, l'abonnement FayClick de votre structure « {{1}} » expire dans {{2}} jour(s).

Montant à régler : {{3}}

Renouvelez dès maintenant via votre compte FayClick (Orange Money / Wave / Free Money) pour éviter toute interruption de service.

L'équipe FayClick
```

**Texte EN proposé** :
```
⏰ Hello, the FayClick subscription for your structure "{{1}}" expires in {{2}} day(s).

Amount due: {{3}}

Please renew now via your FayClick account (Orange Money / Wave / Free Money) to avoid service interruption.

The FayClick Team
```

---

### 2.3 Template 3 — Notification abonnement offert

**Nom** : `fayclick_subscription_offered` / `fayclick_subscription_offered_en`
**Catégorie Meta** : **UTILITY**
**Langue** : `fr` / `en`
**Variables** :
- `{{1}}` = nom de la structure
- `{{2}}` = nombre de jours offerts (ex: `30`)
- `{{3}}` = date de fin (ex: `30/05/2026`)

**Texte FR proposé** :
```
🎁 Bonne nouvelle ! L'équipe FayClick a offert {{2}} jour(s) d'abonnement gratuit à votre structure « {{1}} ».

Validité jusqu'au : {{3}}

Profitez pleinement de toutes les fonctionnalités FayClick durant cette période.

L'équipe FayClick
```

**Texte EN proposé** :
```
🎁 Good news! The FayClick team has gifted {{2}} day(s) of free subscription to your structure "{{1}}".

Valid until: {{3}}

Enjoy all FayClick features during this period.

The FayClick Team
```

---

### 2.4 Template 4 — Message libre administrateur

**Nom** : `fayclick_admin_message` / `fayclick_admin_message_en`
**Catégorie Meta** : **MARKETING** (catégorie UTILITY non éligible — message non transactionnel)
**Langue** : `fr` / `en`
**Variables** :
- `{{1}}` = sujet du message (ex: `Mise à jour importante`)
- `{{2}}` = corps du message (ex: `Cher client, nous vous informons que...`)

**Texte FR proposé** :
```
📢 Message de l'équipe FayClick

Sujet : {{1}}

{{2}}

Pour toute question, contactez-nous via le support FayClick.

L'équipe FayClick
```

**Texte EN proposé** :
```
📢 Message from the FayClick team

Subject: {{1}}

{{2}}

For any question, please contact us via FayClick support.

The FayClick Team
```

> **Note Meta** : la catégorie MARKETING nécessite l'opt-in préalable du destinataire. Côté FayClick, l'inscription d'un utilisateur via téléphone vaut consentement implicite à recevoir des notifications opérationnelles WhatsApp — formulation à valider avec le juridique côté ICELABSOFT.

---

### 2.5 Template 5 — Rappel facture impayée

**Nom** : `fayclick_payment_reminder` / `fayclick_payment_reminder_en`
**Catégorie Meta** : **UTILITY**
**Langue** : `fr` / `en`
**Variables** :
- `{{1}}` = nom du client
- `{{2}}` = numéro de facture (ex: `FA-2026-1247`)
- `{{3}}` = montant restant à payer (ex: `12 500 FCFA`)
- `{{4}}` = nom de la structure créancière (ex: `CHEZ KELEFA NT`)

**Bouton (call-to-action)** : « Voir la facture » → URL dynamique passée en variable.

**Texte FR proposé** :
```
🧾 Bonjour {{1}},

La facture {{2}} de {{4}} reste impayée.

Montant restant : {{3}}

Cliquez sur le bouton ci-dessous pour régler en ligne.

Merci de votre confiance.
```

**Texte EN proposé** :
```
🧾 Hello {{1}},

Invoice {{2}} from {{4}} is still unpaid.

Remaining amount: {{3}}

Click the button below to pay online.

Thank you for your trust.
```

---

## 3. Endpoint `send_message` à créer

### 3.1 Route

```
POST https://api.icelabsoft.com/whatsapp_service/api/send_message
Content-Type: application/json
```

### 3.2 Body (requête FayClick → proxy ICELABSOFT)

```json
{
  "telephone": "+221777301221",
  "template": "fayclick_password_reset",
  "langue": "fr",
  "variables": ["loitdevexpert@kelefa.fay", "Tx9zKp2!a"]
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `telephone` | string | ✅ | Format E.164 strict — regex : `^\+\d{8,15}$` |
| `template` | string | ✅ | Nom exact d'un template approuvé Meta (cf. § 2) |
| `langue` | string | ❌ (défaut `fr`) | `fr` ou `en` — le backend résout automatiquement le bon nom de template si `template_base` + `langue` sont fournis (alternative au nom exact) |
| `variables` | string[] | ✅ | Tableau ordonné des valeurs `{{1}}`, `{{2}}`, ... — taille variable selon template |

### 3.3 Logique côté serveur ICELABSOFT

Construire l'appel Meta Graph API en injectant les variables dans `components.parameters` :

```http
POST https://graph.facebook.com/v25.0/1035744049616511/messages
Authorization: Bearer {TOKEN_META}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "221777301221",
  "type": "template",
  "template": {
    "name": "fayclick_password_reset",
    "language": { "code": "fr" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "loitdevexpert@kelefa.fay" },
          { "type": "text", "text": "Tx9zKp2!a" }
        ]
      }
    ]
  }
}
```

> **Pour le template 5 (`fayclick_payment_reminder` avec bouton URL)** : ajouter un bloc `components.button` avec `sub_type: "url"` et `parameters: [{ type: "text", text: "<lien>" }]`. Voir Doc Meta : <https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components#buttons>

### 3.4 Réponse

**Succès (HTTP 200)** :
```json
{
  "success": true,
  "message": "Message WhatsApp envoyé avec succès",
  "timestamp": "2026-04-30T08:00:00.000Z",
  "recipient": "+2217*****221",
  "message_id": "wamid.HBgMMjIxNzc3MzAxMjIxFQI..."
}
```

**Erreur** : format identique à `send_otp` (cf. mémo précédent § 5.2). Codes d'erreur réutilisés à l'identique :
- `INVALID_REQUEST` (400)
- `META_INVALID_NUMBER`, `META_INVALID_TEMPLATE`, `META_TEMPLATE_NOT_FOUND`, `META_TEMPLATE_PARAM_MISMATCH`, `META_GENERIC_ERROR`, `META_UNKNOWN_ERROR`
- `RATE_LIMITED`, `META_RATE_LIMIT`, `META_PAIR_RATE_LIMIT`, `DAILY_QUOTA_EXCEEDED`
- `META_TOKEN_EXPIRED`, `INTERNAL_ERROR`
- `CORS_FORBIDDEN`, `NOT_FOUND`

**Nouveau code** (à ajouter) :
- `INVALID_VARIABLES_COUNT` (400) → nombre de variables fournies ne correspond pas au template

### 3.5 Sécurité (rappel)

- Token Meta stocké uniquement côté serveur (`.env` ICELABSOFT, jamais commité)
- HTTPS obligatoire
- CORS restreint : `https://v2.fayclick.net`, `https://fayclick.com`, `https://fayclick.net`, `http://localhost:3000`
- Rate limit : 30 req/min/IP (un peu plus large que `send_otp` car usage interne admin)
- Logs masqués (numéros et variables sensibles tronqués)
- ⚠️ **Variables sensibles** (mot de passe en template 1) : ne jamais logger en clair côté serveur. Masquer (`Tx9*****!a`).

---

## 4. Workflow de soumission Meta

| Étape | Responsable | Délai estimé |
|---|---|---|
| 1. Création des 10 templates dans Meta Business Manager (5 × FR/EN) | ICELABSOFT | J+1 |
| 2. Soumission à l'approbation Meta | ICELABSOFT | J+1 |
| 3. Approbation Meta (UTILITY automatique, MARKETING manuelle) | Meta | J+2 à J+3 |
| 4. Tests cURL côté ICELABSOFT (4 templates UTILITY + 1 MARKETING) | ICELABSOFT | J+3 |
| 5. Déploiement endpoint `/send_message` | ICELABSOFT | J+4 |
| 6. Mise à jour `/whatsapp_service/api/status` (ajout `template_map_messages`) | ICELABSOFT | J+4 |
| 7. Mémo de livraison à FayClick | ICELABSOFT | J+4 |
| 8. Intégration FayClick (Sprint 4 PRD admin) | FayClick | J+5 à J+7 |

> **Délai cible** : endpoint disponible **avant J+5** pour permettre l'intégration WhatsApp dans le Sprint 4 du PRD admin.

---

## 5. Tests d'acceptation

| # | Scénario | Résultat attendu |
|---|---|---|
| 1 | `template: "fayclick_password_reset"`, `langue: "fr"`, 2 variables | 200 + `success: true` + message reçu en français avec login + MDP |
| 2 | `template: "fayclick_subscription_expiring"`, `langue: "en"`, 3 variables | 200 + `success: true` + message anglais |
| 3 | `template: "fayclick_admin_message"`, 2 variables (sujet + corps) | 200 + `success: true` |
| 4 | `template: "fayclick_payment_reminder"` avec bouton URL | 200 + `success: true` + bouton cliquable |
| 5 | Template valide mais nombre de variables incorrect (1 fournie au lieu de 2) | 400 + `INVALID_VARIABLES_COUNT` |
| 6 | Template inexistant | 200 + `META_TEMPLATE_NOT_FOUND` |
| 7 | Numéro WhatsApp invalide | 200 + `META_INVALID_NUMBER` |
| 8 | Quota journalier dépassé | 200 + `DAILY_QUOTA_EXCEEDED` |
| 9 | CORS depuis origine non autorisée | 403 + `CORS_FORBIDDEN` |

---

## 6. Statistiques d'usage prévisionnelles

| Template | Volume estimé / mois | Pic |
|---|---|---|
| `fayclick_password_reset` | ~50 (admin uniquement) | <5/jour |
| `fayclick_subscription_expiring` | ~300 (auto rappels J-7, J-3, J-1) | ~30/jour |
| `fayclick_subscription_offered` | ~10-20 | <2/jour |
| `fayclick_admin_message` | ~50-200 (selon campagnes) | ~20/jour |
| `fayclick_payment_reminder` | ~500-1000 (toutes structures) | ~50/jour |

**Volume total prévisionnel** : ~1000-1500 messages/mois → bien sous le quota Meta gratuit (250/jour ≈ 7500/mois).

---

## 7. Points d'attention juridiques

- **Opt-in** : la mention "En vous inscrivant à FayClick, vous acceptez de recevoir des notifications WhatsApp de service" est-elle déjà incluse dans les CGU ? Sinon, ICELABSOFT recommande son ajout avant déploiement du template MARKETING (template 4).
- **Catégorie MARKETING** : nécessite la possibilité pour l'utilisateur de **se désabonner** (`STOP` ou bouton "Ne plus recevoir"). À implémenter côté FayClick V2 (paramètres utilisateur → préférences notifications).
- **RGPD / LCR Sénégal** : conserver les logs d'envoi (numéro, template, timestamp, success/fail) pour 12 mois, hors contenu sensible.

---

## 8. Livrables attendus de l'équipe ICELABSOFT

1. ✅ **5 templates** (10 versions FR/EN) créés et approuvés Meta
2. ✅ **Endpoint** `https://api.icelabsoft.com/whatsapp_service/api/send_message` opérationnel
3. ✅ **Tests cURL** validés pour les 9 scénarios du § 5
4. ✅ **Mise à jour** de `/whatsapp_service/api/status` (ajout du champ `templates_messages` listant les templates `send_message` disponibles)
5. ✅ **Mémo de livraison** à FayClick avec exemples cURL prêts à l'emploi (format identique au mémo `send_otp`)

---

## 9. Contact FayClick

Pour toute question, divergence sur les libellés de templates, ou contraintes Meta non anticipées : répondre directement à ce mémo. FayClick reste flexible sur la formulation finale tant que la **structure des variables** est respectée (l'intégration frontend dépend uniquement du nombre et de l'ordre des variables, pas du texte exact).

**Merci pour votre réactivité — cette livraison débloque le module Admin et la communication client opérationnelle de FayClick.**

---

**Référence interne** : PRD `docs/prd-admin-gestion-structures-2026-04-30.md` § 9
**Copie** : Product Owner FayClick, Lead Tech FayClick
