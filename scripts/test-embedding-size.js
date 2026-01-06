/**
 * Test de la taille de l'embedding avec précision réduite
 */

// Simuler 768 valeurs avec des nombres aléatoires
const embedding = Array.from({ length: 768 }, () => (Math.random() * 2 - 1));

// Format avec précision réduite (5 décimales)
function formatEmbeddingForPostgres(embedding) {
  const formatted = embedding.map(val => {
    const rounded = Math.abs(val).toFixed(5);
    if (val < 0) {
      return 'm' + rounded;
    }
    return rounded;
  }).join(',');
  return `d${formatted}f`;
}

const embeddingText = formatEmbeddingForPostgres(embedding);

// Construire la requête SQL complète
const sqlQuery = `SELECT * FROM save_product_embedding(1036, 183, '${embeddingText}', 'hash_test_123456', NULL, '224x224', 1)`;

const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>fayclick</application>
    <requete_sql>${sqlQuery}</requete_sql>
</request>`;

console.log('📊 Analyse de la taille:');
console.log('   Embedding seul:', embeddingText.length, 'caractères');
console.log('   SQL complet:', sqlQuery.length, 'caractères');
console.log('   XML complet:', xmlBody.length, 'caractères');
console.log('   Limite API:', 10000, 'caractères');
console.log('');
console.log(xmlBody.length <= 10000 ? '✅ SOUS LA LIMITE' : '❌ DÉPASSE LA LIMITE');
console.log('');
console.log('📝 Exemple embedding (10 premières valeurs):');
console.log('   ' + embeddingText.substring(0, 80) + '...');
