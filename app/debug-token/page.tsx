'use client';

import { useState, useEffect } from 'react';
import { decodeFactureParams, encodeFactureParams } from '@/lib/url-encoder';

export default function DebugTokenPage() {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const tests = [
      { token: 'MTM5LTMxMA', expected: { id_structure: 139, id_facture: 310 } },
      { token: encodeFactureParams(139, 310), expected: { id_structure: 139, id_facture: 310 } },
      { token: encodeFactureParams(123, 456), expected: { id_structure: 123, id_facture: 456 } },
      // Test du format legacy avec ":" encodé en Base64
      { token: btoa('139:344'), expected: { id_structure: 139, id_facture: 344 } },
    ];

    const testResults = tests.map(test => {
      const decoded = decodeFactureParams(test.token);
      return {
        token: test.token,
        expected: test.expected,
        decoded: decoded,
        success: decoded && decoded.id_structure === test.expected.id_structure && decoded.id_facture === test.expected.id_facture
      };
    });

    setResults(testResults);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Token - Test de décodage</h1>
        
        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={index} className={`p-6 rounded-lg ${result.success ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
              <h3 className="text-lg font-semibold mb-4">Test #{index + 1}</h3>
              
              <div className="grid md:grid-cols-3 gap-4 text-sm font-mono">
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">Token</h4>
                  <p className="break-all bg-white p-2 rounded">{result.token}</p>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">Attendu</h4>
                  <pre className="bg-white p-2 rounded">{JSON.stringify(result.expected, null, 2)}</pre>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">Décodé</h4>
                  <pre className="bg-white p-2 rounded">{JSON.stringify(result.decoded, null, 2)}</pre>
                </div>
              </div>
              
              <div className="mt-4">
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  result.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                }`}>
                  {result.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}