'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface InscriptionSuccessData {
  message: string;
  structureName: string;
  phoneOM: string;
  login?: string;
  password?: string;
  otpCode?: string;
}

function InscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<InscriptionSuccessData | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState<{ login: boolean; password: boolean; otp: boolean }>({
    login: false,
    password: false,
    otp: false
  });

  useEffect(() => {
    // Récupérer les données depuis les paramètres d'URL
    const message = searchParams.get('message');
    const structureName = searchParams.get('structureName');
    const phoneOM = searchParams.get('phoneOM');
    const login = searchParams.get('login');
    const password = searchParams.get('password');
    const otpCode = searchParams.get('otpCode');

    if (!message || !structureName || !phoneOM) {
      // Rediriger si les données sont manquantes
      router.push('/register');
      return;
    }

    setData({
      message,
      structureName,
      phoneOM,
      login: login || undefined,
      password: password || undefined,
      otpCode: otpCode || undefined
    });
  }, [searchParams, router]);

  const copyToClipboard = async (text: string, type: 'login' | 'password' | 'otp') => {
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

  const handleGoToDashboard = () => {
    // Rediriger vers la page de connexion
    if (data?.otpCode) {
      // Si OTP configuré, ouvrir en mode PIN
      router.push('/login?mode=pin');
    } else if (data?.login) {
      const params = new URLSearchParams({ login: data.login });
      router.push(`/login?${params.toString()}`);
    } else {
      router.push('/login');
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Container Responsive */}
      <div className="max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto min-h-screen bg-white shadow-2xl relative">
        {/* Status Bar - Plus compact */}
        <div className="status-bar">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Header avec animation de succès - Plus compact */}
        <div className="header py-5 px-4 relative overflow-hidden bg-gradient-to-br from-green-400 via-green-500 to-green-600">
          {/* Pattern d'arrière-plan */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-sparkle" />
          </div>

          {/* Contenu du header */}
          <div className="text-center pt-2 relative z-10">
            {/* Icône de succès animée - Plus petite */}
            <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
              <span className="text-2xl">✅</span>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-1">
              Inscription Réussie !
            </h1>
            <p className="text-white/90 text-sm">
              Votre compte a été créé avec succès
            </p>
          </div>
        </div>

        {/* Content - Plus compact */}
        <div className="px-4 py-4 -mt-4 relative bg-gradient-to-b from-green-50 to-blue-50 min-h-[70vh]">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg mb-4">
            <div className="p-4 space-y-4">
              {/* Message de bienvenue - Plus compact */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  Bienvenue dans FayClick ! 🎉
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {data.message}
                </p>
              </div>

              {/* Code OTP - Section principale en évidence */}
              {data.otpCode && (
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide">
                      Votre code de connexion rapide
                    </h3>
                    <p className="text-xs text-emerald-600 mt-1">
                      Envoyé par SMS au +221 {data.phoneOM}
                    </p>
                  </div>

                  {/* Affichage du code OTP en grand */}
                  <div className="flex justify-center gap-2 mb-3">
                    {data.otpCode.split('').map((digit, index) => (
                      <div
                        key={index}
                        className="w-10 h-12 bg-white border-2 border-emerald-400 rounded-lg flex items-center justify-center shadow-sm"
                      >
                        <span className="text-2xl font-bold text-emerald-700">{digit}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => copyToClipboard(data.otpCode!, 'otp')}
                    className="w-full py-2 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md transition-colors"
                  >
                    {copied.otp ? '✅ Code copié !' : '📋 Copier le code'}
                  </button>

                  <p className="text-xs text-emerald-600 text-center mt-2">
                    Utilisez ce code pour vous connecter rapidement
                  </p>
                </div>
              )}

              {/* Informations de la structure - Plus compact */}
              <div className="border-t pt-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Récapitulatif de votre inscription
                </h3>
                
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Structure :</span>
                    <span className="text-sm font-semibold text-gray-800">{data.structureName}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Téléphone :</span>
                    <span className="text-sm font-semibold text-gray-800">+221 {data.phoneOM}</span>
                  </div>
                </div>
              </div>

              {/* Informations de connexion - Plus compact */}
              {data.login && data.password && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-800">
                      Vos identifiants de connexion
                    </h3>
                    <button
                      onClick={() => setShowCredentials(!showCredentials)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {showCredentials ? '👁️' : '🙈'}
                    </button>
                  </div>
                  
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 space-y-3">
                    <div className="text-center text-xs text-primary-700 mb-2">
                      ⚠️ Changez votre mot de passe dès la première connexion
                    </div>
                    
                    {/* Login - Plus compact */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Utilisateur :
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={showCredentials ? data.login : '•'.repeat(Math.min(data.login.length, 12))}
                          readOnly
                          className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded-l-md text-xs font-mono min-w-0"
                        />
                        <button
                          onClick={() => copyToClipboard(data.login!, 'login')}
                          className="px-2 py-1.5 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors text-xs flex-shrink-0"
                          title="Copier"
                        >
                          {copied.login ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Password - Plus compact */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe :
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={showCredentials ? data.password : '•'.repeat(Math.min(data.password.length, 12))}
                          readOnly
                          className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded-l-md text-xs font-mono min-w-0"
                        />
                        <button
                          onClick={() => copyToClipboard(data.password!, 'password')}
                          className="px-2 py-1.5 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors text-xs flex-shrink-0"
                          title="Copier"
                        >
                          {copied.password ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prochaines étapes - Plus compact */}
              <div className="border-t pt-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Prochaines étapes
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Se connecter au dashboard</p>
                      <p className="text-xs text-gray-600">Utilisez vos identifiants</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Changer le mot de passe</p>
                      <p className="text-xs text-gray-600">Menu Mon Compte</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Configurer votre structure</p>
                      <p className="text-xs text-gray-600">Personnalisez votre espace</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Boutons d'action - Plus compacts */}
          <div className="space-y-3">
            <Button
              onClick={handleGoToDashboard}
              variant="gradient"
              size="lg"
              className="w-full shadow-lg py-2.5 text-sm"
            >
              {data?.otpCode ? 'Se connecter avec le code' : 'Accéder à mon Dashboard'}
            </Button>
            
            <div className="text-center">
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Retour à ld&apos;accueil
              </Link>
            </div>
          </div>

          {/* Contact support - Plus compact */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mt-4">
            <div className="p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">
                Besoin dd&apos;aide ? Contactez notre support :
              </p>
              <div className="flex flex-col sm:flex-row justify-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs">
                <a href="tel:+221771234567" className="text-primary-600 hover:text-primary-700 font-medium">
                  📞 +221 78 104 35 05
                </a>
                <span className="hidden sm:inline text-gray-400">|</span>
                <a href="mailto:support@fayclick.net" className="text-primary-600 hover:text-primary-700 font-medium">
                  ✉️ support@fayclick.net
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function InscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <InscriptionSuccessContent />
    </Suspense>
  );
}
//Ce code représente une page de succès d'inscription pour une application web, probablement un tableau de bord ou un service en ligne. Voici une explication détaillée de chaque partie du code :