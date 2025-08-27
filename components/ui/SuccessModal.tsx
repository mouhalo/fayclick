'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from './Button';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  login?: string;
  password?: string;
  structureName: string;
}

export default function SuccessModal({ 
  isOpen, 
  onClose, 
  message, 
  login, 
  password, 
  structureName 
}: SuccessModalProps) {
  const router = useRouter();
  const [showCredentials, setShowCredentials] = useState(true);
  const [copied, setCopied] = useState<{ login: boolean; password: boolean }>({
    login: false,
    password: false
  });

  // Animation d'entrée
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Bloquer le scroll du body
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurer le scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const copyToClipboard = async (text: string, type: 'login' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [type]: true }));
      
      // Réinitialiser après 2 secondes
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  };

  const handleLogin = () => {
    if (login) {
      const params = new URLSearchParams({ login });
      router.push(`/login?${params.toString()}`);
    } else {
      router.push('/login');
    }
    onClose();
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full max-w-md transform transition-all duration-300 ${
            isAnimating 
              ? 'translate-y-0 opacity-100 scale-100' 
              : 'translate-y-4 opacity-0 scale-95'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header avec animation de succès */}
            <div className="bg-gradient-to-br from-green-400 via-green-500 to-green-600 px-6 py-8 text-center relative overflow-hidden">
              {/* Particules de fond */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-sparkle" />
              </div>
              
              {/* Contenu header */}
              <div className="relative z-10">
                {/* Animation d'icône de succès */}
                <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
                  <span className="text-4xl">🎉</span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">
                  Inscription Réussie !
                </h2>
                <p className="text-white/90 text-sm">
                  Bienvenue dans l&apos;écosystème FayClick
                </p>
              </div>
            </div>

            {/* Corps du modal */}
            <div className="px-6 py-6 space-y-6">
              {/* Message de bienvenue */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {structureName}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Identifiants de connexion */}
              {login && password && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-800">
                      Vos identifiants
                    </h4>
                    <button
                      onClick={() => setShowCredentials(!showCredentials)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      {showCredentials ? '👁️ Masquer' : '🙈 Afficher'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Login */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nom d&apos;utilisateur :
                      </label>
                      <div className="flex rounded-lg overflow-hidden">
                        <input
                          type="text"
                          value={showCredentials ? login : '•'.repeat(login.length)}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 text-sm font-mono text-gray-800"
                        />
                        <button
                          onClick={() => copyToClipboard(login, 'login')}
                          className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs"
                          title="Copier le login"
                        >
                          {copied.login ? '✅' : '📋'}
                        </button>
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mot de passe temporaire :
                      </label>
                      <div className="flex rounded-lg overflow-hidden">
                        <input
                          type="text"
                          value={showCredentials ? password : '•'.repeat(password.length)}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 text-sm font-mono text-gray-800"
                        />
                        <button
                          onClick={() => copyToClipboard(password, 'password')}
                          className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs"
                          title="Copier le mot de passe"
                        >
                          {copied.password ? '✅' : '📋'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Note de sécurité */}
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      ⚠️ <strong>Important :</strong> Changez votre mot de passe dès la première connexion via le menu &quot;Mon Compte&quot;
                    </p>
                  </div>
                </div>
              )}

              {/* Prochaines étapes */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  🚀 Prochaines étapes :
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-2">1</span>
                    <span>Connectez-vous à votre dashboard</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-2">2</span>
                    <span>Changez votre mot de passe</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-2">3</span>
                    <span>Configurez votre structure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer avec boutons */}
            <div className="px-6 py-4 bg-gray-50 space-y-3">
              <Button
                onClick={handleLogin}
                variant="gradient"
                size="lg"
                className="w-full"
              >
                Se connecter maintenant
              </Button>
              
              <button
                onClick={handleClose}
                className="w-full text-center text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors py-2"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}