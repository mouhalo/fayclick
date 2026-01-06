/**
 * Script de test pour l'API save_product_embedding
 * Usage: node scripts/test-embedding-api.js
 */

const API_URL = 'https://api.icelabsoft.com/api/psql_request/api/psql_request';

// Exemple d'embedding simplifié pour le test
const embeddingCourt = 'd0.405,0.107,0.346,m0.323,m0.120,0.027,m0.330,0.433,0.211,m0.515f';

// Requête SQL de test
const sqlQuery = `SELECT * FROM save_product_embedding(1036, 183, '${embeddingCourt}', 'test_hash_123', NULL, '224x224', 1)`;

// Construction XML sans CDATA
function buildXmlRequest(sql) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>${sql}</requete_sql>
</request>`;
}

// Construction XML avec CDATA
function buildXmlRequestWithCdata(sql) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql><![CDATA[${sql}]]></requete_sql>
</request>`;
}

async function testApi(xmlBody, description) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${description}`);
  console.log('='.repeat(60));
  console.log('\n📤 XML envoyé:');
  console.log(xmlBody);

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

    const text = await response.text();
    console.log('\n📄 Réponse brute:');
    console.log(text);

    try {
      const json = JSON.parse(text);
      console.log('\n✅ Réponse JSON parsée:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('\n⚠️ Réponse non-JSON');
    }

  } catch (error) {
    console.log('\n❌ Erreur:', error.message);
  }
}

async function main() {
  console.log('🔧 Test API save_product_embedding');
  console.log('📍 URL:', API_URL);
  console.log('📝 SQL:', sqlQuery);

  // Test 1: Sans CDATA
  await testApi(buildXmlRequest(sqlQuery), 'Sans CDATA');

  // Test 2: Avec CDATA
  await testApi(buildXmlRequestWithCdata(sqlQuery), 'Avec CDATA');

  // Test 3: Requête simple pour vérifier la connectivité
  const simpleQuery = 'SELECT 1 as test';
  await testApi(buildXmlRequest(simpleQuery), 'Requête simple (SELECT 1)');

  console.log('\n' + '='.repeat(60));
  console.log('Tests terminés');
  console.log('='.repeat(60));
}

main();
