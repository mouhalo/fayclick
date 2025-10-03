# TODO: Créer endpoint API Backend pour upload logo

## Endpoint requis
POST https://api.icelabsoft.com/api/upload_logo

## Request
- Content-Type: multipart/form-data
- Body: 
  - file: File (image compressée)
  - filename: string (nom unique généré)

## Response
```json
{
  "success": true,
  "url": "https://fayclick.net/uploads/logo-xxx.png",
  "filename": "logo-xxx.png",
  "size": 84044
}
```

## Implementation backend
1. Recevoir fichier via multipart/form-data
2. Valider type et taille
3. Upload FTP vers fayclick.net/uploads/
4. Retourner URL publique

## Credentials FTP
- Host: node260-eu.n0c.com
- User: uploadv2@fayclick.net
- Password: (depuis .env)
- Path: / (racine pointe déjà vers /public_html/uploads/)

