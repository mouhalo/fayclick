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
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3">
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal - Plus compact */}
      <div 
        className={`relative w-full max-w-xs sm:max-w-sm transform transition-all duration-300 ${
          isAnimating 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-4 opacity-0 scale-95'
        }`}
      >
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
          {/* Header ultra-compact */}
          <div className="bg-gradient-to-br from-green-400 via-green-500 to-green-600 px-3 py-3 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-sparkle" />
            </div>
            
            <div className="relative z-10">
              <div className="w-8 h-8 mx-auto mb-1.5 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="text-lg">🎉</span>
              </div>
              
              <h2 className="text-base font-bold text-white mb-0.5">
                Inscription Réussie !
              </h2>
              <p className="text-white/90 text-xs">
                Bienvenue dans l&apos;écosystème FayClick
              </p>
            </div>
          </div>

          {/* Corps ultra-compact */}
          <div className="px-3 py-3 space-y-3">
            {/* Message de bienvenue */}
            <div className="text-center">
              <h3 className="text-sm font-semibold text-gray-800">
                {structureName}
              </h3>                
            </div>

            {/* Identifiants de connexion */}
            {login && password && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-semibold text-gray-800">
                    Vos identifiants
                  </h4>
                  <button
                    onClick={() => setShowCredentials(!showCredentials)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    {showCredentials ? '👁️' : '🙈'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {/* Login */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Utilisateur :
                    </label>
                    <div className="flex rounded-sm overflow-hidden">
                      <input
                        type="text"
                        value={showCredentials ? login : '•'.repeat(Math.min(login.length, 10))}
                        readOnly
                        className="flex-1 px-1.5 py-1 bg-white border border-gray-300 text-xs font-mono text-gray-800 min-w-0"
                      />
                      <button
                        onClick={() => copyToClipboard(login, 'login')}
                        className="px-1.5 py-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs flex-shrink-0"
                        title="Copier"
                      >
                        {copied.login ? '✅' : '📋'}
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Mot de passe :
                    </label>
                    <div className="flex rounded-sm overflow-hidden">
                      <input
                        type="text"
                        value={showCredentials ? password : '•'.repeat(Math.min(password.length, 10))}
                        readOnly
                        className="flex-1 px-1.5 py-1 bg-white border border-gray-300 text-xs font-mono text-gray-800 min-w-0"
                      />
                      <button
                        onClick={() => copyToClipboard(password, 'password')}
                        className="px-1.5 py-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs flex-shrink-0"
                        title="Copier"
                      >
                        {copied.password ? '✅' : '📋'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Note de sécurité ultra-compacte */}
                <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded-sm">
                  <p className="text-xs text-amber-800">
                    ⚠️ <strong>Important :</strong> Changez le mot de passe via &quot;Mon Compte&quot;
                  </p>
                </div>
              </div>
            )}

            {/* Prochaines étapes ultra-compactes */}
            <div className="bg-gray-50 rounded-md p-2">
              <h4 className="text-xs font-semibold text-gray-800 mb-1.5">
                🚀 Prochaines étapes :
              </h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-1.5 flex-shrink-0" style={{fontSize: '8px'}}>1</span>
                  <span>Se connecter</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-1.5 flex-shrink-0" style={{fontSize: '8px'}}>2</span>
                  <span>Changer le mot de passe</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-1.5 flex-shrink-0" style={{fontSize: '8px'}}>3</span>
                  <span>Configurer la structure</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer ultra-compact */}
          <div className="px-3 py-2 bg-gray-50 space-y-1.5">
            <Button
              onClick={handleLogin}
              variant="gradient"
              size="lg"
              className="w-full py-1.5 text-xs"
            >
              Se connecter
            </Button>
            
            <button
              onClick={handleClose}
              className="w-full text-center text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors py-0.5"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}