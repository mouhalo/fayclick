/**
 * Composant de debug pour visualiser les droits utilisateur PostgreSQL
 * Affiche toutes les fonctionnalités avec leurs autorisations
 * Utile pour le développement et le debug
 */

'use client';

import { useState } from 'react';
import { useRights, useHasRight, useUserProfil } from '@/hooks/useRights';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Shield, User } from 'lucide-react';

export default function RightsDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    rights,
    hasRight,
    allowedFunctionalities,
    deniedFunctionalities,
    profil,
    totalFunctionalities,
    allowedCount,
    deniedCount,
    isReady
  } = useRights();

  // Exemples de vérification de droits
  const canAddInvoice = useHasRight("AJOUTER FACTURE");
  const canDeleteInvoice = useHasRight("SUPPRIMER FACTURE");
  const canViewDashboard = useHasRight("VOIR DASHBOARD");
  const userProfil = useUserProfil();

  if (!isReady) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm font-medium">⏳ Chargement des droits...</p>
      </div>
    );
  }

  if (!rights) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-800 px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm font-medium">❌ Droits non disponibles</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-2xl max-w-md z-50">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Droits Utilisateur</h3>
            <p className="text-xs text-gray-600">
              {allowedCount}/{totalFunctionalities} autorisations
            </p>
          </div>
        </div>

        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Profil Badge */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Profil</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-md">
              <span>{userProfil}</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="p-4 grid grid-cols-2 gap-3 bg-gray-50">
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-gray-600">Autorisés</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{allowedCount}</p>
            </div>

            <div className="bg-white rounded-lg p-3 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-gray-600">Refusés</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{deniedCount}</p>
            </div>
          </div>

          {/* Exemples de Vérifications */}
          <div className="p-4 bg-blue-50 border-t border-blue-100">
            <h4 className="text-xs font-bold text-blue-900 mb-3 uppercase tracking-wide">
              Exemples de Vérifications
            </h4>
            <div className="space-y-2">
              <TestRight
                name="AJOUTER FACTURE"
                allowed={canAddInvoice}
              />
              <TestRight
                name="SUPPRIMER FACTURE"
                allowed={canDeleteInvoice}
              />
              <TestRight
                name="VOIR DASHBOARD"
                allowed={canViewDashboard}
              />
            </div>
          </div>

          {/* Liste des Fonctionnalités Autorisées */}
          <div className="p-4 max-h-60 overflow-y-auto">
            <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
              ✅ Fonctionnalités Autorisées
            </h4>
            <div className="space-y-1">
              {allowedFunctionalities.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune fonctionnalité autorisée</p>
              ) : (
                allowedFunctionalities.map((func) => (
                  <div
                    key={func}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{func}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Liste des Fonctionnalités Refusées */}
          <div className="p-4 max-h-60 overflow-y-auto border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
              ❌ Fonctionnalités Refusées
            </h4>
            <div className="space-y-1">
              {deniedFunctionalities.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Toutes les fonctionnalités sont autorisées</p>
              ) : (
                deniedFunctionalities.map((func) => (
                  <div
                    key={func}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-sm text-gray-500">{func}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Code Example */}
          <div className="p-4 bg-gray-900 text-white text-xs font-mono border-t border-gray-700">
            <p className="text-green-400 mb-1">// Utilisation dans votre code:</p>
            <p className="text-gray-300">const &#123; hasRight &#125; = useRights();</p>
            <p className="text-gray-300">if (hasRight(&quot;AJOUTER FACTURE&quot;)) &#123;</p>
            <p className="text-gray-300 ml-4">// Afficher le formulaire</p>
            <p className="text-gray-300">&#125;</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant helper pour afficher un test de droit
interface TestRightProps {
  name: string;
  allowed: boolean;
}

function TestRight({ name, allowed }: TestRightProps) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
      allowed ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
    }`}>
      <span className="text-sm font-medium text-gray-700">{name}</span>
      {allowed ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600" />
      )}
    </div>
  );
}