'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Vérifier l'état de connexion
    setIsOnline(navigator.onLine);

    // Écouter les changements de connexion
    const handleOnline = () => {
      setIsOnline(true);
      // Recharger après un court délai
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Animation de l'icône */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gray-300 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-white rounded-full p-8 shadow-lg">
              <WifiOff className="w-16 h-16 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Vous êtes hors ligne
          </h1>
          <p className="text-gray-600 mb-8">
            {isOnline
              ? "Reconnexion en cours..."
              : "Vérifiez votre connexion internet pour continuer à utiliser FayClick"
            }
          </p>

          {/* Boutons d'action */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isOnline}
              className={`w-full px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                isOnline
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/20'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${isOnline ? 'animate-spin' : ''}`} />
              <span>{isOnline ? 'Reconnexion...' : 'Réessayer'}</span>
            </button>

            <Link
              href="/"
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Retour à l'accueil</span>
            </Link>
          </div>

          {/* Informations supplémentaires */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Certaines fonctionnalités peuvent être disponibles hors ligne si vous avez déjà visité les pages.
            </p>
          </div>

          {/* Status indicator */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-xs text-gray-500">
              {isOnline ? 'Connexion rétablie' : 'Pas de connexion'}
            </span>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Astuce : L'application FayClick fonctionne mieux lorsqu'elle est installée
          </p>
        </div>
      </div>
    </div>
  );
}