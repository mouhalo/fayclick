# FayClick V2 - API Endpoints

> **Document BMAD** | Version: 1.0 | Dernière mise à jour: 2026-01-21

---

## 1. Vue d'Ensemble

FayClick utilise une API REST centralisée sur `api.icelabsoft.com`.

| Environnement | Base URL |
|---------------|----------|
| Development | `http://127.0.0.1:5000` |
| Production | `https://api.icelabsoft.com` |

---

## 2. Endpoint Principal - PostgreSQL

### POST `/api/psql_request/api/psql_request`

Point d'entrée unique pour toutes les requêtes PostgreSQL.

**Request:**
```typescript
{
  sql: string;      // Requête SQL ou appel de fonction
  params?: any[];   // Paramètres optionnels
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

**Exemple:**
```typescript
// Appel depuis database.service.ts
const result = await databaseService.query(
  "SELECT * FROM get_list_clients($1, $2)",
  [id_structure, tel_client]
);
```

---

## 3. Endpoints Paiements

### 3.1 Orange Money / Free Money (OFMS)

**POST** `/pay_services/api/payment`

Initier un paiement mobile.

**Request:**
```json
{
  "pservicename": "OFMS",
  "app_name": "FAYCLICK",
  "pReference": "FAY183173629",
  "pAmount": "5000",
  "pTelnumber": "777301221",
  "pDescription": "Facture FAY-001"
}
```

**Response:**
```json
{
  "success": true,
  "uuid": "abc123-def456",
  "status": "PENDING"
}
```

**Contrainte:** `pReference` max 19 caractères

---

### 3.2 Wave (INTOUCH)

**POST** `/pay_services/api/payment`

**Request:**
```json
{
  "pservicename": "INTOUCH",
  "app_name": "FAYCLICK",
  "pReference": "FAY183173629",
  "pAmount": "5000",
  "pTelnumber": "777301221",
  "pDescription": "Facture FAY-001"
}
```

---

### 3.3 Statut Paiement

**GET** `/pay_services/api/payment_status/{uuid}`

**Response:**
```json
{
  "status": "COMPLETED",
  "uuid": "abc123-def456",
  "transaction_id": "TXN123456",
  "reference_externe": "REF789"
}
```

**Statuts possibles:**
| Status | Description |
|--------|-------------|
| `PENDING` | En attente |
| `PROCESSING` | En cours |
| `COMPLETED` | Réussi |
| `FAILED` | Échoué |
| `CANCELLED` | Annulé |

---

### 3.4 Send Cash (Retraits)

**POST** `/pay_services/api/send_cash`

Envoyer de l'argent vers un numéro mobile.

**Request:**
```json
{
  "pservicename": "OFMS",
  "app_name": "FAYCLICK",
  "pmethode": "OM",
  "ptelnumber": "777301221",
  "pamount": 1000,
  "pmotif": "Retrait OM KALPE 260111193045",
  "pnomstructure": "MA BOUTIQUE"
}
```

**Response Success:**
```json
{
  "status": "SUCCESS",
  "transaction_id": "CI260111.1924.A12345",
  "message": "Transfert effectué"
}
```

**Méthodes:**
| pmethode | pservicename |
|----------|--------------|
| OM | OFMS |
| WAVE | INTOUCH |
| FREE | OFMS |

---

## 4. Endpoint SMS

### POST `/sms_service/api/send_o_sms`

Envoyer un SMS (OTP, notifications).

**Request:**
```json
{
  "numtel": "777301221",
  "message": "Entrez le code : 12345 pour valider le retrait de 1000 FCFA. Code valide 2 min.",
  "sender": "ICELABOSOFT"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "SMS123456"
}
```

---

## 5. Fonctions PostgreSQL (via psql_request)

### 5.1 Authentification

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `check_user_credentials` | `(login, pwd)` | User + Structure |
| `get_mes_droits` | `(id_structure, id_profil)` | JSON permissions |

### 5.2 Structures

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `get_une_structure` | `(id_structure)` | JSON structure |
| `add_edit_structure` | `(id_type, nom, ...)` | INTEGER id |

### 5.3 Clients

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `get_list_clients` | `(id_structure, tel?)` | JSON clients + stats |
| `add_edit_client` | `(id_structure, nom, tel, ...)` | TABLE |

### 5.4 Produits

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_produit` | `(id_structure, nom, prix, ...)` | JSON |
| `add_edit_photo` | `(id_produit, url, ordre, ...)` | INTEGER |

### 5.5 Factures

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `create_facture_complete1` | `(date, id_structure, ...)` | TABLE (id, success) |
| `add_acompte_facture` | `(id_structure, id_facture, montant, txn_id, uuid)` | JSON |

### 5.6 Wallet

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `get_soldes_wallet_structure` | `(id_structure)` | JSON soldes |
| `get_wallet_structure` | `(id_structure)` | JSON complet |
| `add_retrait_marchand` | `(id_structure, txn_id, tel, amount, methode, frais)` | JSON |

### 5.7 Abonnements

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `calculer_montant_abonnement` | `(type, date_debut)` | NUMERIC |
| `add_abonnement_structure` | `(id_structure, type, ...)` | JSON |
| `renouveler_abonnement` | `(id_structure, type, ...)` | JSON |

### 5.8 Utilisateurs

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `get_list_utilisateurs` | `(id_structure)` | JSON users |
| `add_edit_utilisateur` | `(id_structure, id_profil, ...)` | INTEGER |
| `change_user_password` | `(id_user, old_pwd, new_pwd)` | BOOLEAN |

### 5.9 Dépenses

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `get_list_depenses` | `(id_structure, annee, periode)` | JSON |
| `add_edit_depense` | `(id_structure, type, montant, ...)` | JSON |

---

## 6. Codes d'Erreur

### HTTP Status

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 400 | Bad Request |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Non trouvé |
| 500 | Erreur serveur |

### Erreurs Métier (dans response.error)

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Identifiants incorrects |
| `STRUCTURE_NOT_FOUND` | Structure inexistante |
| `INSUFFICIENT_BALANCE` | Solde insuffisant |
| `PAYMENT_FAILED` | Échec paiement |
| `OTP_INVALID` | Code OTP incorrect |
| `OTP_EXPIRED` | Code OTP expiré |

---

## 7. Authentification

### Headers requis

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${jwt_token}`  // Si authentifié
}
```

### Endpoints sans auth

| Endpoint | Usage |
|----------|-------|
| `/api/psql_request` avec `check_user_credentials` | Login |
| `/facture?token=` | Facture publique |
| `/catalogue` | Catalogue public |

---

## 8. Rate Limiting

| Endpoint | Limite |
|----------|--------|
| `psql_request` | 100 req/min |
| `payment` | 50 req/min |
| `send_cash` | 20 req/min |
| `send_o_sms` | 30 req/min |

---

## 9. Exemples d'Utilisation

### Login
```typescript
const result = await databaseService.query(
  "SELECT * FROM check_user_credentials($1, $2)",
  [login, password]
);
```

### Créer une facture
```typescript
const result = await databaseService.query(
  `SELECT * FROM create_facture_complete1($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
  [date, id_structure, tel_client, nom_client, montant, desc, articles_string, remise, acompte, avec_frais, est_devis, id_user]
);
```

### Paiement wallet
```typescript
const response = await fetch(`${API_BASE}/pay_services/api/payment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pservicename: 'OFMS',
    app_name: 'FAYCLICK',
    pReference: `FAY${id_structure}${Date.now()}`.slice(0, 19),
    pAmount: montant.toString(),
    pTelnumber: telephone,
    pDescription: description
  })
});
```

---

## 10. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | System Architect Agent | Documentation initiale |
