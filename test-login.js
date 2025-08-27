// Test de connexion directe à l'API
const testLogin = async () => {
  const url = 'https://api.icelabsoft.com/api/psql_request/api/psql_request';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>payecole</application>
    <requete_sql>SELECT * FROM check_user_credentials('sylviacassa','775588028')</requete_sql>
</request>`;

  console.log('🚀 Test de connexion API');
  console.log('📍 URL:', url);
  console.log('📝 XML envoyé:', xml);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/json'
      },
      body: xml
    });

    console.log('📊 Status HTTP:', response.status);
    console.log('📊 Headers:', response.headers);

    const responseText = await response.text();
    console.log('📄 Réponse brute:', responseText);

    const data = JSON.parse(responseText);
    console.log('✅ Données parsées:', JSON.stringify(data, null, 2));

    if (data.status === 'success' && data.datas && data.datas.length > 0) {
      console.log('✅ Connexion réussie!');
      console.log('👤 Utilisateur:', data.datas[0].username);
      console.log('🏢 Structure:', data.datas[0].nom_structure);
      console.log('🔑 Type:', data.datas[0].type_structure);
    } else {
      console.log('❌ Échec de connexion');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  }
};

// Exécution du test
testLogin();