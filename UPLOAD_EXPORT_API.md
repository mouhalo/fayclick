# Approche Upload - Mode Export + API Backend

## Configuration
- `output: 'export'` dans next.config.ts (statique)
- Upload via API backend PostgreSQL existante
- Déploiement Apache/Nginx standard

## Architecture
1. Frontend compresse l'image (browser-image-compression)
2. Envoie vers API backend existante (api.icelabsoft.com)
3. API backend gère l'upload FTP
4. Retourne URL publique

## Avantages
✅ Déploiement statique simple (Apache)
✅ Compatible avec infrastructure actuelle
✅ Pas de serveur Node.js nécessaire
✅ Même déploiement que le reste de l'app

## Inconvénients
❌ Dépendance API backend externe
❌ Nécessite endpoint API dédié
❌ Possibles problèmes CORS

## Modifications requises
- Revenir à `output: 'export'`
- Créer/utiliser endpoint API backend pour upload
- Adapter logo-upload-simple.service.ts

## Test
```bash
npm run build
npm run deploy
# Tester upload logo en production
```

