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
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin, isAuthenticated, isLoading: authLoading, error: authError, clearError, user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    // Vérifier si on doit forcer la déconnexion (par exemple après une erreur 401)
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogout = urlParams.get('logout') === 'true';
    
    if (forceLogout) {
      // Nettoyer la session
      authService.clearSession();
      // Retirer le paramètre de l'URL
      window.history.replaceState({}, document.title, '/login');
      return;
    }
    
    // Vérifier si déjà connecté SEULEMENT si pas de logout forcé
    if (isAuthenticated && user) {
      // Redirection automatique gérée par AuthContext
      console.log('Déjà connecté, redirection...', user.login);
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      // Validation basique
      if (!formData.login || !formData.password) {
        throw new Error('Veuillez remplir tous les champs');
      }

      // Utiliser le login du contexte AuthContext
      await authLogin({
        login: formData.login.toLowerCase().trim(),
        pwd: formData.password
      });

      // La redirection est gérée automatiquement par AuthContext après connexion réussie

    } catch (error) {
      console.error('Erreur de connexion:', error);
      // L'erreur est gérée par AuthContext et disponible via authError
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Effacer l'erreur quand l'utilisateur tape
    if (authError) clearError();
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
                    {/* Login/Identifiant */}
                    <div>
                      <label htmlFor="login" className="block text-gray-700 font-semibold mb-3 text-responsive-small">
                        Identifiant <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="login"
                        name="login"
                        value={formData.login}
                        onChange={handleChange}
                        className="input-premium w-full max-w-full focus-responsive touch-surface transform transition-all duration-300 hover:scale-[1.01] focus:scale-[1.01]"
                        placeholder="Votre identifiant"
                        required
                        autoComplete="username"
                        disabled={isLoading || authLoading}
                      />
                    </div>

                    {/* Mot de passe optimisé */}
                    <div>
                      <label htmlFor="password" className="block text-gray-700 font-semibold mb-3 text-responsive-small">
                        Mot de passe <span className="text-error-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="input-premium w-full max-w-full focus-responsive touch-surface transform transition-all duration-300 hover:scale-[1.01] focus:scale-[1.01] pr-12"
                          placeholder="••••••••"
                          required
                          autoComplete="current-password"
                          disabled={isLoading || authLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
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
                    {authError && (
                      <div className="bg-error-50 border border-error-200 text-error-700 padding-compact rounded-xl text-responsive-small animate-fade-in">
                        <div className="flex items-center gap-2">
                          <span>❌</span>
                          {authError}
                        </div>
                      </div>
                    )}

                    {/* Bouton de connexion optimisé */}
                    <button
                      type="submit"
                      disabled={isLoading || authLoading}
                      className={`btn-gradient btn-touch-optimized w-full text-responsive-base ${(isLoading || authLoading) ? 'animate-pulse' : 'animate-glow'} transform transition-all duration-300 hover:scale-[1.02] focus-responsive`}
                    >
                      {(isLoading || authLoading) ? (
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

                  {/* Séparateur avec texte */}
                  <div className={`my-6 flex items-center transform transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-4 text-gray-500 text-responsive-small">ou</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  {/* Lien vers inscription */}
                  <div className={`text-center transform transition-all duration-1000 delay-800 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <p className="text-gray-600 text-responsive-small mb-4">
                      Nouveau sur FayClick ?
                    </p>
                    <Link href="/register">
                      <button className="btn-secondary btn-touch-optimized w-full bg-white/90 backdrop-blur-sm border-white/30">
                        <span>Créer un compte gratuitement</span>
                      </button>
                    </Link>
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
