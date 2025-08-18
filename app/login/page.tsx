'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PageContainer, 
  ResponsiveContainer, 
  ResponsiveHeader,
  ResponsiveCard,
  CardHeader,
  CardContent
} from '@/components/patterns';
import { useBreakpoint } from '@/hooks';

export default function LoginPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulation de connexion
    setTimeout(() => {
      if (formData.email && formData.password) {
        console.log('Connexion réussie', formData);
        router.push('/dashboard');
      } else {
        setError('Veuillez remplir tous les champs');
      }
      setIsLoading(false);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <PageContainer className="relative gradient-primary overflow-hidden">
      <div className="relative z-10 animate-slide-up">
        {/* Header responsive avec bouton retour */}
        <ResponsiveHeader
          title="Connexion"
          subtitle="Accédez à votre espace FayClick"
          navigation={{
            backButton: {
              href: "/",
              label: "Retour à l'accueil"
            }
          }}
        />

        <ResponsiveContainer maxWidth="lg" padding="comfortable">
          {/* Container pour centrer la carte de connexion */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className={`w-full max-w-sm sm:max-w-md lg:max-w-lg transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {/* Carte de connexion premium */}
              <ResponsiveCard variant="featured" className="overflow-hidden">
                {/* Header avec icône clé dorée */}
                <CardHeader className="text-center bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100">
                  <div className="padding-comfortable">
                    {/* Icône clé dorée animée */}
                    <div className={`transform transition-all duration-1000 delay-200 ${isLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl animate-icon-pulse">
                        <svg 
                          className="w-8 h-8 sm:w-10 sm:h-10 text-white" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                        </svg>
                      </div>
                    </div>
                    
                    <h2 className={`text-responsive-title font-bold text-gray-800 mb-2 transform transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}>
                      Bon retour ! 👋
                    </h2>
                    <p className={`text-responsive-small text-gray-600 transform transition-all duration-1000 delay-400 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}>
                      Connectez-vous pour gérer votre business
                    </p>
                  </div>
                </CardHeader>

                {/* Contenu formulaire optimisé */}
                <CardContent padding="comfortable">
                  {/* Formulaire de Connexion Premium */}
                  <form onSubmit={handleSubmit} className={`spacing-normal transform transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    {/* Email optimisé */}
                    <div>
                      <label htmlFor="email" className="block text-gray-700 font-semibold mb-3 text-responsive-small">
                        Adresse email <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input-premium w-full max-w-full focus-responsive touch-surface transform transition-all duration-300 hover:scale-[1.01] focus:scale-[1.01]"
                        placeholder="votre@email.com"
                        required
                      />
                    </div>

                    {/* Mot de passe optimisé */}
                    <div>
                      <label htmlFor="password" className="block text-gray-700 font-semibold mb-3 text-responsive-small">
                        Mot de passe <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="input-premium w-full max-w-full focus-responsive touch-surface transform transition-all duration-300 hover:scale-[1.01] focus:scale-[1.01]"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    {/* Mot de passe oublié */}
                    <div className="text-right">
                      <Link 
                        href="/forgot-password" 
                        className="text-primary-600 text-responsive-small font-medium hover:text-primary-700 transition-colors hover:underline focus-responsive"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>

                    {/* Message d'erreur */}
                    {error && (
                      <div className="bg-error-50 border border-error-200 text-error-700 padding-compact rounded-xl text-responsive-small animate-fade-in">
                        <div className="flex items-center gap-2">
                          <span>❌</span>
                          {error}
                        </div>
                      </div>
                    )}

                    {/* Bouton de connexion optimisé */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`btn-gradient btn-touch-optimized w-full text-responsive-base ${isLoading ? 'animate-pulse' : 'animate-glow'} transform transition-all duration-300 hover:scale-[1.02] focus-responsive`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center spacing-tight">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="mobile-only">Connexion...</span>
                          <span className="hidden-mobile">Connexion en cours...</span>
                        </div>
                      ) : (
                        <>
                          <span className="mobile-only">Se Connecter</span>
                          <span className="hidden-mobile">Se Connecter</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider avec design premium */}
                  <div className={`flex items-center spacing-normal my-6 transform transition-all duration-1000 delay-600 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    <span className="text-gray-500 text-responsive-small font-medium px-4">ou</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  </div>

                  {/* Options de connexion alternatives optimisées */}
                  <div className={`spacing-normal transform transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <button className="btn-secondary btn-touch-optimized w-full flex items-center justify-center spacing-tight bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 focus-responsive">
                      <span className="text-xl">📱</span>
                      <span className="font-semibold text-responsive-small">
                        <span className="mobile-only">Orange Money</span>
                        <span className="hidden-mobile">Continuer avec Orange Money</span>
                      </span>
                    </button>
                    
                    <button className="btn-secondary btn-touch-optimized w-full flex items-center justify-center spacing-tight bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 focus-responsive">
                      <span className="text-xl">💳</span>
                      <span className="font-semibold text-responsive-small">
                        <span className="mobile-only">Wave</span>
                        <span className="hidden-mobile">Continuer avec Wave</span>
                      </span>
                    </button>
                  </div>

                  {/* Lien vers inscription */}
                  <div className={`mt-6 text-center transform transition-all duration-1000 delay-800 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <p className="text-gray-600 text-responsive-small">
                      Nouveau sur FayClick ?{' '}
                      <Link 
                        href="/register" 
                        className="text-primary-600 font-bold hover:text-primary-700 transition-colors hover:underline focus-responsive"
                      >
                        Créer un compte gratuitement
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </ResponsiveCard>
            </div>
          </div>
        </ResponsiveContainer>

        {/* Footer responsive optimisé */}
        <footer className="responsive-container bg-gradient-to-t from-gray-100 to-white text-center border-t safe-area-bottom">
          <div className="padding-normal">
            <p className="text-gray-500 text-micro mb-3">
              En vous connectant, vous acceptez nos{' '}
              <Link href="/terms" className="text-primary-600 hover:underline focus-responsive">
                Conditions d&apos;utilisation
              </Link>{' '}
              et notre{' '}
              <Link href="/privacy" className="text-primary-600 hover:underline focus-responsive">
                Politique de confidentialité
              </Link>
            </p>
            
            <div className="flex items-center justify-center gap-1 text-gray-400 text-micro">
              <span>🔒</span>
              <span>Connexion sécurisée SSL</span>
            </div>
          </div>
        </footer>
      </div>
    </PageContainer>
  );
}