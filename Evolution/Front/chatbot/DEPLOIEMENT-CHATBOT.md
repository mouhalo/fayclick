# Déploiement du chatbot IA FayClick

## Architecture

```
Navigateur (fayclick.com)
   │  POST /api/chatbot.php  (même origine → aucun CORS, aucun changement CSP)
   ▼
public/api/chatbot.php        ← proxy PHP déployé avec le front
   │  clé lue dans chatbot-config.php (côté serveur UNIQUEMENT)
   ▼
https://api.groq.com/openai/v1/chat/completions  (Llama 3.3 70B)
```

Le front filtre d'abord les questions courantes **localement** (FAQ instantanée,
zéro coût) et n'appelle le proxy que pour le reste.

## Mise en place de la clé (une seule fois)

1. Créer une clé sur https://console.groq.com/keys (idéalement dédiée au chatbot).
2. Éditer `public/api/chatbot-config.php` : remplacer `REMPLACER_PAR_LA_CLE_GROQ`.
3. ⚠️ **Ne jamais committer ni déployer ce fichier** : il est gitignoré.
4. Uploader **manuellement** `chatbot-config.php` via FTP dans `/public_html/api/`
   (à côté de `chatbot.php`, qui lui est déployé normalement par `npm run deploy`).
   - `v2.fayclick.net` : `/api/chatbot-config.php` (test)
   - `fayclick.com` : `/public_html/api/chatbot-config.php` (prod)

## Vérification

```bash
# Après upload sur v2.fayclick.net :
curl -X POST https://v2.fayclick.net/api/chatbot.php \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"C'est gratuit ?"}],"lang":"fr"}'
# → {"reply":"..."}

# Sans config (fichier absent) → erreur 500, le front bascule en mode FAQ locale
# Rate-limit : 10 req/min et 100 req/jour par IP → 429 avec message
```

## Garde-fous

| Garde-fou | Valeur |
|---|---|
| Rate-limit | 10 req/min, 100 req/jour par IP (fichiers compteurs dans /tmp du serveur) |
| Corps max | 4 000 caractères (413 au-delà) |
| Historique | 6 derniers messages max, 1 500 chars/message |
| Modèle | `llama-3.3-70b-versatile`, max 300 tokens, température 0.5 |
| Timeouts | connect 5 s, appel 15 s → repli 502 géré par le front (message WhatsApp) |
| Clé | jamais exposée au client, jamais loguée |

## Mise à jour du prompt système

Les prompts (fr/en/wo) vivent dans `public/api/chatbot.php` (§ `$systemPrompts`) —
modifier le PHP et relancer `npm run deploy` (le fichier est déployé normalement,
seule la config de clé est manuelle).
