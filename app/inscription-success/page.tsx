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
}

function InscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<InscriptionSuccessData | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState<{ login: boolean; password: boolean }>({
    login: false,
    password: false
  });

  useEffect(() => {
    // Récupérer les données depuis les paramètres d'URL
    const message = searchParams.get('message');
    const structureName = searchParams.get('structureName');
    const phoneOM = searchParams.get('phoneOM');
    const login = searchParams.get('login');
    const password = searchParams.get('password');

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
      password: password || undefined
    });
  }, [searchParams, router]);

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

  const handleGoToDashboard = () => {
    // Rediriger vers la page de connexion avec le login pré-rempli
    if (data?.login) {
      const params = new URLSearchParams({ login: data.login });
      router.push(`/login?${params.toString()}`);
    } else {
      router.push('/login');
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Container Mobile */}
      <div className="max-w-[425px] mx-auto min-h-screen bg-white shadow-2xl relative">
        {/* Status Bar */}
        <div className="status-bar">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Header avec animation de succès */}
        <div className="header py-8 px-6 relative overflow-hidden bg-gradient-to-br from-green-400 via-green-500 to-green-600">
          {/* Pattern d'arrière-plan */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-sparkle" />
          </div>

          {/* Contenu du header */}
          <div className="text-center pt-4 relative z-10">
            {/* Icône de succès animée */}
            <div className="w-24 h-24 mx-auto mb-5 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
              <span className="text-4xl">✅</span>
            </div>
            
            <h1 className="heading-lg text-white mb-2">
              Inscription Réussie !
            </h1>
            <p className="text-white/90 text-base">
              Votre compte a été créé avec succès
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 -mt-6 relative bg-gradient-to-b from-green-50 to-blue-50 min-h-[70vh]">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="p-6 space-y-6">
              {/* Message de bienvenue */}
              <div className="text-center">
                <h2 className="heading-sm text-gray-800 mb-4">
                  Bienvenue dans FayClick ! 🎉
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {data.message}
                </p>
              </div>

              {/* Informations de la structure */}
              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4">
                  Récapitulatif de votre inscription
                </h3>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
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

              {/* Informations de connexion */}
              {data.login && data.password && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-semibold text-gray-800">
                      Vos identifiants de connexion
                    </h3>
                    <button
                      onClick={() => setShowCredentials(!showCredentials)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {showCredentials ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  
                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 space-y-4">
                    <div className="text-center text-xs text-primary-700 mb-3">
                      ⚠️ Notez bien ces informations et changez votre mot de passe dès la première connexion
                    </div>
                    
                    {/* Login */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom d'utilisateur :
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={showCredentials ? data.login : '•'.repeat(data.login.length)}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-l-lg text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(data.login!, 'login')}
                          className="px-3 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 transition-colors"
                          title="Copier le login"
                        >
                          {copied.login ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe temporaire :
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={showCredentials ? data.password : '•'.repeat(data.password.length)}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-l-lg text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(data.password!, 'password')}
                          className="px-3 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 transition-colors"
                          title="Copier le mot de passe"
                        >
                          {copied.password ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prochaines étapes */}
              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4">
                  Prochaines étapes
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Connectez-vous à votre dashboard</p>
                      <p className="text-xs text-gray-600">Utilisez vos identifiants pour accéder à votre espace</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Changez votre mot de passe</p>
                      <p className="text-xs text-gray-600">Menu Mon Compte → Changer mot de passe</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Configurez votre structure</p>
                      <p className="text-xs text-gray-600">Complétez vos informations et personnalisez votre espace</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Boutons d'action */}
          <div className="space-y-4">
            <Button
              onClick={handleGoToDashboard}
              variant="gradient"
              size="lg"
              className="w-full shadow-lg"
            >
              Accéder à mon Dashboard
            </Button>
            
            <div className="text-center">
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>

          {/* Contact support */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mt-6">
            <div className="p-4 text-center">
              <p className="text-xs text-gray-600 mb-2">
                Besoin d'aide ? Contactez notre support :
              </p>
              <div className="flex justify-center space-x-4 text-xs">
                <a href="tel:+221771234567" className="text-primary-600 hover:text-primary-700 font-medium">
                  📞 +221 77 123 45 67
                </a>
                <span className="text-gray-400">|</span>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <InscriptionSuccessContent />
    </Suspense>
  );
}