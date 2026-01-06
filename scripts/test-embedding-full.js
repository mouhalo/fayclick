/**
 * Test avec l'embedding complet (768 dimensions)
 */

const API_URL = 'https://api.icelabsoft.com/api/psql_request/api/psql_request';
const fs = require('fs');
const path = require('path');

// Lire le fichier SQL d'exemple
const sqlFile = fs.readFileSync(
  path.join(__dirname, '../docs/Capture_Photo/exemple_save_produit.sql'),
  'utf-8'
);

// Nettoyer le SQL (enlever les sauts de ligne)
const sqlQuery = sqlFile.replace(/\n/g, ' ').trim();

console.log('🔧 Test API avec embedding complet (768D)');
console.log('📍 URL:', API_URL);
console.log('📝 Longueur SQL:', sqlQuery.length, 'caractères');

// Compter les valeurs dans l'embedding
const embeddingMatch = sqlQuery.match(/'d([^f]+)f'/);
if (embeddingMatch) {
  const values = embeddingMatch[1].split(',');
  console.log('📊 Nombre de valeurs dans embedding:', values.length);
}

async function testFullEmbedding() {
  // Test sans CDATA
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>${sqlQuery}</requete_sql>
</request>`;

  console.log('\n📤 Envoi de la requête...');
  console.log('📏 Taille XML:', xmlBody.length, 'caractères');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Accept': 'application/json'
      },
      body: xmlBody
    });

    console.log('\n📥 Status:', response.status, response.statusText);
    console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('\n📄 Réponse (premiers 500 chars):');
    console.log(text.substring(0, 500));

    if (text.length > 500) {
      console.log('... (tronqué, total:', text.length, 'chars)');
    }

    try {
      const json = JSON.parse(text);
      console.log('\n✅ Réponse JSON:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('\n⚠️ Réponse non-JSON');
    }

  } catch (error) {
    console.log('\n❌ Erreur:', error.message);
    console.log(error.stack);
  }
}

testFullEmbedding();
