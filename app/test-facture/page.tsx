/**
 * Page de test pour les URLs de factures cryptées
 * TEMPORAIRE - Pour valider la fonctionnalité
 */

'use client';

import { useState } from 'react';
import { encodeFactureParams, decodeFactureParams, generateTestToken } from '@/lib/url-encoder';
import { getFactureUrl } from '@/lib/url-config';

export default function TestFacturePage() {
  const [idStructure, setIdStructure] = useState(123);
  const [idFacture, setIdFacture] = useState(456);
  const [token, setToken] = useState('');
  const [urlGeneree, setUrlGeneree] = useState('');
  const [testDecode, setTestDecode] = useState<any>(null);

  const handleGenererToken = () => {
    try {
      const nouveauToken = encodeFactureParams(idStructure, idFacture);
      setToken(nouveauToken);
      
      const url = getFactureUrl(idStructure, idFacture);
      setUrlGeneree(url);
      
      console.log('Token généré:', nouveauToken);
      console.log('URL générée:', url);
    } catch (error) {
      console.error('Erreur génération:', error);
    }
  };

  const handleTesterDecode = () => {
    if (!token) return;
    
    try {
      const decoded = decodeFactureParams(token);
      setTestDecode(decoded);
      console.log('Décodage:', decoded);
    } catch (error) {
      console.error('Erreur décodage:', error);
      setTestDecode({ error: 'Erreur décodage' });
    }
  };

  const handleGenererAléatoire = () => {
    const test = generateTestToken();
    setIdStructure(test.id_structure);
    setIdFacture(test.id_facture);
    setToken(test.token);
    
    const url = `http://localhost:3000/fay_${test.token}`;
    setUrlGeneree(url);
    
    console.log('Test aléatoire généré:', test);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            🧪 Test Factures Cryptées FayClick
          </h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Panneau de génération */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-700">Génération</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  ID Structure
                </label>
                <input
                  type="number"
                  value={idStructure}
                  onChange={(e) => setIdStructure(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  ID Facture
                </label>
                <input
                  type="number"
                  value={idFacture}
                  onChange={(e) => setIdFacture(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleGenererToken}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Générer Token
                </button>
                
                <button
                  onClick={handleGenererAléatoire}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Aléatoire
                </button>
              </div>
              
              {token && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-2">Token généré :</p>
                  <p className="font-mono text-lg text-blue-600 break-all">{token}</p>
                </div>
              )}
              
              {urlGeneree && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-2">URL complète :</p>
                  <a 
                    href={urlGeneree}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {urlGeneree}
                  </a>
                </div>
              )}
            </div>

            {/* Panneau de test */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-700">Test de décodage</h2>
              
              <button
                onClick={handleTesterDecode}
                disabled={!token}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium"
              >
                Tester Décodage
              </button>
              
              {testDecode && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-2">Résultat décodage :</p>
                  <pre className="text-sm text-gray-800 font-mono">
                    {JSON.stringify(testDecode, null, 2)}
                  </pre>
                  
                  {testDecode.id_structure && testDecode.id_facture && (
                    <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                      <p className="text-green-800 font-medium">✅ Décodage réussi !</p>
                      <p className="text-green-700 text-sm">
                        Structure: {testDecode.id_structure} • Facture: {testDecode.id_facture}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 font-medium text-sm">💡 Comment tester</p>
                <ol className="text-yellow-700 text-sm mt-2 space-y-1">
                  <li>1. Générez un token</li>
                  <li>2. Cliquez sur l'URL pour ouvrir la page</li>
                  <li>3. Vérifiez que la facture se décode correctement</li>
                </ol>
              </div>
            </div>
          </div>
          
          {/* Exemples */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Exemples d'URLs générées</h3>
            <div className="grid gap-3">
              <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                http://localhost:3000/fay_YWJjZGVmZ2hpams
              </div>
              <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                https://v2.fayclick.net/fay_MTIzLTQ1Njo
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}