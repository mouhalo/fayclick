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
  otpCode?: string;
  phoneOM?: string;
}

export default function SuccessModal({
  isOpen,
  onClose,
  message,
  login,
  password,
  structureName,
  otpCode,
  phoneOM
}: SuccessModalProps) {
  const router = useRouter();
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState<{ login: boolean; password: boolean; otp: boolean }>({
    login: false,
    password: false,
    otp: false
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

  const copyToClipboard = async (text: string, type: 'login' | 'password' | 'otp') => {
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
    // Si OTP configuré, rediriger vers la page login en mode PIN
    if (otpCode) {
      router.push('/login?mode=pin');
    } else if (login) {
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

      {/* Modal */}
      <div
        className={`relative w-full max-w-xs sm:max-w-sm transform transition-all duration-300 ${
          isAnimating
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95'
        }`}
      >
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
          {/* Header */}
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

          {/* Corps */}
          <div className="px-3 py-3 space-y-3">
            {/* Nom structure */}
            <div className="text-center">
              <h3 className="text-sm font-semibold text-gray-800">
                {structureName}
              </h3>
            </div>

            {/* Code OTP - Section principale en évidence */}
            {otpCode && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-3">
                <div className="text-center mb-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Votre code de connexion rapide
                  </h4>
                  {phoneOM && (
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      Envoyé par SMS au +221 {phoneOM}
                    </p>
                  )}
                </div>

                {/* Affichage du code OTP en grand */}
                <div className="flex justify-center gap-1.5 mb-2">
                  {otpCode.split('').map((digit, index) => (
                    <div
                      key={index}
                      className="w-9 h-11 bg-white border-2 border-emerald-400 rounded-lg flex items-center justify-center shadow-sm"
                    >
                      <span className="text-xl font-bold text-emerald-700">{digit}</span>
                    </div>
                  ))}
                </div>

                {/* Bouton copier le code */}
                <button
                  onClick={() => copyToClipboard(otpCode, 'otp')}
                  className="w-full py-1.5 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md transition-colors"
                >
                  {copied.otp ? '✅ Code copié !' : '📋 Copier le code'}
                </button>

                <p className="text-[10px] text-emerald-600 text-center mt-1.5">
                  Utilisez ce code pour vous connecter rapidement
                </p>
              </div>
            )}

            {/* Identifiants avancés - Section rétractable */}
            {login && password && (
              <div className="border border-gray-200 rounded-md">
                <button
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>Identifiants classiques (login / mot de passe)</span>
                  <span className="text-gray-400">{showCredentials ? '▲' : '▼'}</span>
                </button>

                {showCredentials && (
                  <div className="px-2 pb-2 space-y-1.5 border-t border-gray-100">
                    {/* Login */}
                    <div className="mt-1.5">
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Utilisateur :
                      </label>
                      <div className="flex rounded-sm overflow-hidden">
                        <input
                          type="text"
                          value={login}
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
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Mot de passe :
                      </label>
                      <div className="flex rounded-sm overflow-hidden">
                        <input
                          type="text"
                          value={password}
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

                    <div className="p-1 bg-amber-50 border border-amber-200 rounded-sm">
                      <p className="text-[10px] text-amber-800">
                        ⚠️ <strong>Important :</strong> Changez le mot de passe via &quot;Mon Compte&quot;
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prochaines étapes */}
            <div className="bg-gray-50 rounded-md p-2">
              <h4 className="text-xs font-semibold text-gray-800 mb-1.5">
                🚀 Prochaines étapes :
              </h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-1.5 flex-shrink-0" style={{fontSize: '8px'}}>1</span>
                  <span>{otpCode ? 'Se connecter avec le code' : 'Se connecter'}</span>
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

          {/* Footer */}
          <div className="px-3 py-2 bg-gray-50 space-y-1.5">
            <Button
              onClick={handleLogin}
              variant="gradient"
              size="lg"
              className="w-full py-1.5 text-xs"
            >
              {otpCode ? 'Se connecter avec le code' : 'Se connecter'}
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