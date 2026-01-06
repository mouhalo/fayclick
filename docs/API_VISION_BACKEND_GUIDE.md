# Guide d'Implémentation API Vision Backend

## Documentation pour l'Ingénieur Backend
**FayClick V2 - Reconnaissance Visuelle de Produits**

**Date:** Janvier 2026
**Version:** 1.0
**Auteur:** Équipe FayClick

---

## Table des Matières

1. [Contexte et Objectif](#1-contexte-et-objectif)
2. [Architecture Globale](#2-architecture-globale)
3. [Endpoints à Créer](#3-endpoints-à-créer)
4. [Endpoint 1: OCR Claude Vision](#4-endpoint-1-ocr-claude-vision)
5. [Endpoint 2: CLIP Embeddings](#5-endpoint-2-clip-embeddings)
6. [Configuration des Clés API](#6-configuration-des-clés-api)
7. [Sécurité](#7-sécurité)
8. [Tests et Validation](#8-tests-et-validation)
9. [Annexes](#9-annexes)

---

## 1. Contexte et Objectif

### 1.1 Besoin Fonctionnel

FayClick V2 permet aux commerçants d'enrôler leurs produits en prenant simplement une photo. Le système doit :

1. **Extraire automatiquement le nom du produit** depuis la photo (OCR via Claude Vision)
2. **Générer un embedding vectoriel** de l'image pour permettre la recherche visuelle future (CLIP)

### 1.2 Pourquoi un Backend ?

Les APIs externes (Anthropic, Replicate) ne peuvent pas être appelées directement depuis le navigateur car :
- **CORS** : Les APIs bloquent les appels cross-origin depuis les navigateurs
- **Sécurité** : Les clés API ne doivent JAMAIS être exposées côté client
- **Contrôle** : Le backend permet de logger, limiter, et monitorer les appels

### 1.3 Flux de Données

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│  Backend        │────▶│  APIs Externes  │
│  FayClick   │     │  icelabsoft.com │     │  (Anthropic,    │
│             │◀────│                 │◀────│   Replicate)    │
└─────────────┘     └─────────────────┘     └─────────────────┘
     POST               Proxy +                  Traitement
   image/base64        Sécurité                    IA
```

---

## 2. Architecture Globale

### 2.1 Endpoints à Implémenter

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/vision/ocr` | POST | Extraction du nom de produit via Claude Vision |
| `/api/vision/clip` | POST | Génération d'embedding CLIP via Replicate |

### 2.2 Base URL

```
https://api.icelabsoft.com/api/vision/ocr
https://api.icelabsoft.com/api/vision/clip
```

### 2.3 Format d'Échange

- **Content-Type** : `application/json`
- **Encodage Images** : Base64 (avec ou sans préfixe `data:image/...`)

---

## 3. Endpoints à Créer

### 3.1 Vue d'Ensemble

```
POST /api/vision/ocr
├── Input:  { imageBase64: string, mimeType?: string }
├── Output: { success: bool, nomProduit: string, confidence: string }
└── Appelle: Anthropic Claude Vision API

POST /api/vision/clip
├── Input:  { imageBase64: string }
├── Output: { success: bool, embedding: number[] }
└── Appelle: Replicate CLIP API
```

---

## 4. Endpoint 1: OCR Claude Vision

### 4.1 Spécifications

| Propriété | Valeur |
|-----------|--------|
| **URL** | `/api/vision/ocr` |
| **Méthode** | `POST` |
| **Content-Type** | `application/json` |
| **Timeout recommandé** | 30 secondes |

### 4.2 Requête (Input)

```json
{
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "mimeType": "image/jpeg"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `imageBase64` | string | ✅ Oui | Image encodée en Base64. Peut inclure le préfixe `data:image/jpeg;base64,` ou non |
| `mimeType` | string | ❌ Non | Type MIME de l'image. Défaut: `image/jpeg`. Valeurs possibles: `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

### 4.3 Réponse (Output)

**Succès (200 OK)**
```json
{
  "success": true,
  "nomProduit": "Lait Nido 400g",
  "confidence": "high",
  "rawText": "Lait Nido 400g"
}
```

**Erreur (4xx/5xx)**
```json
{
  "success": false,
  "nomProduit": "Produit non identifié",
  "confidence": "low",
  "error": "Description de l'erreur"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` si extraction réussie |
| `nomProduit` | string | Nom du produit extrait, ou "Produit non identifié" |
| `confidence` | string | Niveau de confiance: `high`, `medium`, `low` |
| `rawText` | string | (optionnel) Texte brut retourné par l'IA |
| `error` | string | (si erreur) Description de l'erreur |

### 4.4 Logique de Confiance

```python
def determiner_confidence(nom_produit):
    if not nom_produit or "non identifié" in nom_produit.lower():
        return "low"
    elif len(nom_produit) < 3:
        return "low"
    elif len(nom_produit) < 8:
        return "medium"
    else:
        return "high"
```

### 4.5 Implémentation Backend (Python/Flask)

```python
import requests
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

@app.route("/api/vision/ocr", methods=["POST"])
def ocr_extract():
    try:
        data = request.get_json()
        image_base64 = data.get("imageBase64", "")
        mime_type = data.get("mimeType", "image/jpeg")

        # Nettoyer le base64 (retirer le préfixe data:image si présent)
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        # Appel à l'API Anthropic
        response = requests.post(
            ANTHROPIC_API_URL,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 256,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": PROMPT_OCR  # Voir section 4.6
                            }
                        ]
                    }
                ]
            },
            timeout=30
        )

        if not response.ok:
            return jsonify({
                "success": False,
                "nomProduit": "Produit non identifié",
                "confidence": "low",
                "error": f"Erreur API Anthropic: {response.status_code}"
            }), response.status_code

        result = response.json()
        extracted_text = result.get("content", [{}])[0].get("text", "").strip()

        # Nettoyer le résultat
        nom_produit = extracted_text.replace('"', '').replace("'", "").strip()
        nom_produit = nom_produit.replace("Nom du produit:", "").strip()

        # Déterminer la confiance
        confidence = determiner_confidence(nom_produit)

        if confidence == "low" and "non identifié" not in nom_produit.lower():
            nom_produit = "Produit non identifié"

        return jsonify({
            "success": True,
            "nomProduit": nom_produit,
            "confidence": confidence,
            "rawText": extracted_text
        })

    except requests.Timeout:
        return jsonify({
            "success": False,
            "nomProduit": "Produit non identifié",
            "confidence": "low",
            "error": "Timeout - L'API n'a pas répondu à temps"
        }), 504

    except Exception as e:
        return jsonify({
            "success": False,
            "nomProduit": "Produit non identifié",
            "confidence": "low",
            "error": str(e)
        }), 500
```

### 4.6 Prompt OCR (Important)

Le prompt envoyé à Claude Vision est crucial pour la qualité des résultats :

```python
PROMPT_OCR = """Analyse cette image d'un produit (emballage, étiquette, ou article).

TÂCHE: Extraire UNIQUEMENT le nom commercial du produit.

RÈGLES:
- Retourne SEULEMENT le nom du produit, rien d'autre
- Inclus la marque si visible (ex: "Lait Nido 400g", "Coca-Cola 1.5L")
- Inclus le format/poids si visible
- Si plusieurs produits, prends le plus visible/central
- Si aucun nom lisible, retourne "Produit non identifié"
- Ne mets PAS de guillemets autour du nom
- Pas d'explication, juste le nom

EXEMPLES de réponses attendues:
- Lait Nido 400g
- Coca-Cola 1.5L
- Savon Palmolive Original
- Riz Uncle Bens 1kg
- Produit non identifié

Nom du produit:"""
```

### 4.7 Implémentation Backend (Node.js/Express)

```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const PROMPT_OCR = `Analyse cette image d'un produit (emballage, étiquette, ou article).

TÂCHE: Extraire UNIQUEMENT le nom commercial du produit.

RÈGLES:
- Retourne SEULEMENT le nom du produit, rien d'autre
- Inclus la marque si visible (ex: "Lait Nido 400g", "Coca-Cola 1.5L")
- Inclus le format/poids si visible
- Si plusieurs produits, prends le plus visible/central
- Si aucun nom lisible, retourne "Produit non identifié"
- Ne mets PAS de guillemets autour du nom
- Pas d'explication, juste le nom

EXEMPLES de réponses attendues:
- Lait Nido 400g
- Coca-Cola 1.5L
- Savon Palmolive Original
- Riz Uncle Bens 1kg
- Produit non identifié

Nom du produit:`;

function determineConfidence(nomProduit) {
  if (!nomProduit || nomProduit.toLowerCase().includes('non identifié')) {
    return 'low';
  } else if (nomProduit.length < 3) {
    return 'low';
  } else if (nomProduit.length < 8) {
    return 'medium';
  }
  return 'high';
}

router.post('/ocr', async (req, res) => {
  try {
    let { imageBase64, mimeType = 'image/jpeg' } = req.body;

    // Nettoyer le base64
    if (imageBase64.includes(',')) {
      imageBase64 = imageBase64.split(',')[1];
    }

    const response = await axios.post(ANTHROPIC_API_URL, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: PROMPT_OCR
            }
          ]
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    });

    const extractedText = response.data.content?.[0]?.text?.trim() || '';

    // Nettoyer
    let nomProduit = extractedText
      .replace(/^["']|["']$/g, '')
      .replace(/^Nom du produit:\s*/i, '')
      .trim();

    const confidence = determineConfidence(nomProduit);

    if (confidence === 'low' && !nomProduit.toLowerCase().includes('non identifié')) {
      nomProduit = 'Produit non identifié';
    }

    res.json({
      success: true,
      nomProduit,
      confidence,
      rawText: extractedText
    });

  } catch (error) {
    console.error('[OCR] Erreur:', error.message);

    res.status(error.response?.status || 500).json({
      success: false,
      nomProduit: 'Produit non identifié',
      confidence: 'low',
      error: error.message
    });
  }
});

module.exports = router;
```

---

## 5. Endpoint 2: CLIP Embeddings

### 5.1 Spécifications

| Propriété | Valeur |
|-----------|--------|
| **URL** | `/api/vision/clip` |
| **Méthode** | `POST` |
| **Content-Type** | `application/json` |
| **Timeout recommandé** | 60 secondes (traitement IA plus long) |

### 5.2 Requête (Input)

```json
{
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB..."
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `imageBase64` | string | ✅ Oui | Image encodée en Base64 |

### 5.3 Réponse (Output)

**Succès (200 OK)**
```json
{
  "success": true,
  "embedding": [0.0234, -0.1567, 0.0891, ..., 0.0123]
}
```

**Erreur (4xx/5xx)**
```json
{
  "success": false,
  "embedding": null,
  "error": "Description de l'erreur"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` si génération réussie |
| `embedding` | number[] | Vecteur de 512 dimensions (floats) |
| `error` | string | (si erreur) Description de l'erreur |

### 5.4 À Propos des Embeddings CLIP

- **Dimension** : 512 valeurs float
- **Utilisation** : Recherche par similarité visuelle
- **Stockage** : Ces vecteurs seront stockés en base de données pour permettre la recherche de produits similaires

### 5.5 Implémentation Backend (Python/Flask)

```python
import requests
import os
import time
from flask import Flask, request, jsonify

REPLICATE_API_URL = "https://api.replicate.com/v1/predictions"
REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")

# Modèle CLIP sur Replicate
CLIP_MODEL_VERSION = "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a"

@app.route("/api/vision/clip", methods=["POST"])
def clip_embedding():
    try:
        data = request.get_json()
        image_base64 = data.get("imageBase64", "")

        # S'assurer que le préfixe data URL est présent
        if not image_base64.startswith("data:"):
            image_base64 = f"data:image/jpeg;base64,{image_base64}"

        # Créer la prédiction
        create_response = requests.post(
            REPLICATE_API_URL,
            headers={
                "Authorization": f"Token {REPLICATE_API_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "version": CLIP_MODEL_VERSION,
                "input": {
                    "image": image_base64
                }
            },
            timeout=30
        )

        if not create_response.ok:
            return jsonify({
                "success": False,
                "embedding": None,
                "error": f"Erreur création prédiction: {create_response.status_code}"
            }), create_response.status_code

        prediction = create_response.json()
        prediction_id = prediction.get("id")

        # Polling pour attendre le résultat
        max_attempts = 30
        for attempt in range(max_attempts):
            status_response = requests.get(
                f"{REPLICATE_API_URL}/{prediction_id}",
                headers={
                    "Authorization": f"Token {REPLICATE_API_TOKEN}"
                },
                timeout=10
            )

            if not status_response.ok:
                continue

            result = status_response.json()
            status = result.get("status")

            if status == "succeeded":
                output = result.get("output", {})
                embedding = output.get("embedding") or output

                if isinstance(embedding, list):
                    return jsonify({
                        "success": True,
                        "embedding": embedding
                    })
                else:
                    return jsonify({
                        "success": False,
                        "embedding": None,
                        "error": "Format d'embedding invalide"
                    }), 500

            elif status == "failed":
                return jsonify({
                    "success": False,
                    "embedding": None,
                    "error": result.get("error", "Génération échouée")
                }), 500

            # Attendre avant le prochain polling
            time.sleep(1)

        # Timeout
        return jsonify({
            "success": False,
            "embedding": None,
            "error": "Timeout - La génération n'a pas terminé à temps"
        }), 504

    except Exception as e:
        return jsonify({
            "success": False,
            "embedding": None,
            "error": str(e)
        }), 500
```

### 5.6 Implémentation Backend (Node.js/Express)

```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const CLIP_MODEL_VERSION = 'andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post('/clip', async (req, res) => {
  try {
    let { imageBase64 } = req.body;

    // S'assurer que le préfixe data URL est présent
    if (!imageBase64.startsWith('data:')) {
      imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
    }

    // Créer la prédiction
    const createResponse = await axios.post(REPLICATE_API_URL, {
      version: CLIP_MODEL_VERSION,
      input: {
        image: imageBase64
      }
    }, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const predictionId = createResponse.data.id;

    // Polling pour attendre le résultat
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await axios.get(
        `${REPLICATE_API_URL}/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`
          },
          timeout: 10000
        }
      );

      const { status, output, error } = statusResponse.data;

      if (status === 'succeeded') {
        const embedding = output?.embedding || output;

        if (Array.isArray(embedding)) {
          return res.json({
            success: true,
            embedding
          });
        } else {
          return res.status(500).json({
            success: false,
            embedding: null,
            error: 'Format d\'embedding invalide'
          });
        }
      }

      if (status === 'failed') {
        return res.status(500).json({
          success: false,
          embedding: null,
          error: error || 'Génération échouée'
        });
      }

      // Attendre avant le prochain polling
      await sleep(1000);
    }

    // Timeout
    res.status(504).json({
      success: false,
      embedding: null,
      error: 'Timeout - La génération n\'a pas terminé à temps'
    });

  } catch (error) {
    console.error('[CLIP] Erreur:', error.message);

    res.status(error.response?.status || 500).json({
      success: false,
      embedding: null,
      error: error.message
    });
  }
});

module.exports = router;
```

---

## 6. Configuration des Clés API

### 6.1 Clés Requises

| Variable d'Environnement | Service | Où l'obtenir |
|--------------------------|---------|--------------|
| `ANTHROPIC_API_KEY` | Claude Vision (OCR) | https://console.anthropic.com |
| `REPLICATE_API_TOKEN` | CLIP Embeddings | https://replicate.com/account |

### 6.2 Format des Clés

```bash
# Anthropic (commence par sk-ant-)
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXX

# Replicate (commence par r8_)
REPLICATE_API_TOKEN=r8_XXXXXXXXXXXXXXXXXXXXXXXX
```

### 6.3 Coûts Estimés

| Service | Coût Approximatif |
|---------|-------------------|
| Claude Vision | ~$0.003 par image (Sonnet) |
| Replicate CLIP | ~$0.0001 par image |

**Estimation mensuelle** : Pour 1000 produits enrôlés = ~$3-4

---

## 7. Sécurité

### 7.1 Bonnes Pratiques

1. **Ne JAMAIS exposer les clés API** dans le code ou les logs
2. **Valider les entrées** : Vérifier que `imageBase64` est bien du Base64 valide
3. **Limiter la taille** : Rejeter les images > 10MB
4. **Rate limiting** : Limiter à 10 requêtes/minute par utilisateur
5. **Authentification** : Vérifier que l'appelant est authentifié (token JWT FayClick)

### 7.2 Validation de l'Image Base64

```python
import base64
import re

def validate_base64_image(image_base64, max_size_mb=10):
    """Valide une image Base64"""

    # Retirer le préfixe data URL si présent
    if "," in image_base64:
        header, image_base64 = image_base64.split(",", 1)
        # Vérifier le type MIME
        if not re.match(r"data:image/(jpeg|png|webp|gif);base64", header):
            return False, "Type d'image non supporté"

    # Vérifier que c'est du Base64 valide
    try:
        decoded = base64.b64decode(image_base64)
    except Exception:
        return False, "Base64 invalide"

    # Vérifier la taille
    size_mb = len(decoded) / (1024 * 1024)
    if size_mb > max_size_mb:
        return False, f"Image trop grande ({size_mb:.1f}MB > {max_size_mb}MB)"

    return True, None
```

### 7.3 Headers CORS

```python
# Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={
    r"/api/vision/*": {
        "origins": ["https://v2.fayclick.net", "http://localhost:3000"],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

```javascript
// Express
const cors = require('cors');

app.use('/api/vision', cors({
  origin: ['https://v2.fayclick.net', 'http://localhost:3000'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 8. Tests et Validation

### 8.1 Test avec cURL

**Test OCR :**
```bash
# Encoder une image en Base64
IMAGE_BASE64=$(base64 -w 0 test_product.jpg)

# Appeler l'API
curl -X POST https://api.icelabsoft.com/api/vision/ocr \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\": \"$IMAGE_BASE64\", \"mimeType\": \"image/jpeg\"}"
```

**Réponse attendue :**
```json
{
  "success": true,
  "nomProduit": "Coca-Cola 1.5L",
  "confidence": "high"
}
```

**Test CLIP :**
```bash
curl -X POST https://api.icelabsoft.com/api/vision/clip \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\": \"$IMAGE_BASE64\"}"
```

**Réponse attendue :**
```json
{
  "success": true,
  "embedding": [0.0234, -0.1567, ..., 0.0123]
}
```

### 8.2 Checklist de Validation

- [ ] L'endpoint `/api/vision/ocr` répond en < 30s
- [ ] L'endpoint `/api/vision/clip` répond en < 60s
- [ ] Les erreurs retournent le bon format JSON
- [ ] Les clés API ne sont pas exposées dans les réponses
- [ ] CORS autorise `https://v2.fayclick.net`
- [ ] Les images > 10MB sont rejetées
- [ ] Le rate limiting fonctionne

---

## 9. Annexes

### 9.1 Codes d'Erreur HTTP

| Code | Signification | Quand l'utiliser |
|------|---------------|------------------|
| 200 | Succès | Extraction/génération réussie |
| 400 | Bad Request | Image invalide, paramètres manquants |
| 401 | Unauthorized | Token FayClick invalide |
| 413 | Payload Too Large | Image > 10MB |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |
| 502 | Bad Gateway | API externe non disponible |
| 504 | Gateway Timeout | Timeout API externe |

### 9.2 Modèles Alternatifs

Si Replicate n'est pas disponible, voici des alternatives pour CLIP :

| Fournisseur | Modèle | Coût |
|-------------|--------|------|
| Replicate | andreasjansson/clip-features | $0.0001/image |
| Hugging Face | openai/clip-vit-base-patch32 | Gratuit (self-hosted) |
| OpenAI | CLIP API (si disponible) | Variable |

### 9.3 Configuration Frontend

Une fois les endpoints déployés, modifier le fichier frontend :

**`services/visual-recognition/claude-vision.service.ts`**
```typescript
// Remplacer cette ligne :
const OCR_API_URL = '/api/vision/ocr';

// Par :
const OCR_API_URL = 'https://api.icelabsoft.com/api/vision/ocr';
```

**`services/visual-recognition/clip-client.ts`**
```typescript
// Remplacer cette ligne :
const CLIP_API_URL = '/api/vision/clip';

// Par :
const CLIP_API_URL = 'https://api.icelabsoft.com/api/vision/clip';
```

### 9.4 Contact Support

Pour toute question technique :
- **Email** : support@fayclick.net
- **Documentation API FayClick** : https://docs.fayclick.net

---

## Résumé des Actions

1. ✅ Créer l'endpoint `/api/vision/ocr` (section 4)
2. ✅ Créer l'endpoint `/api/vision/clip` (section 5)
3. ✅ Configurer les clés API (section 6)
4. ✅ Activer CORS pour `v2.fayclick.net` (section 7)
5. ✅ Tester avec cURL (section 8)
6. ✅ Informer l'équipe frontend pour mise à jour des URLs

---

*Document généré pour FayClick V2 - Janvier 2026*
