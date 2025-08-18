'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen relative gradient-primary overflow-hidden">
      {/* Container Principal */}
      <div className="mobile-container relative z-10 animate-slide-up">
        {/* Header Premium */}
        <div className="relative overflow-hidden gradient-hero">
          {/* Bouton Retour Premium */}
          <Link
            href="/"
            className="absolute top-6 left-6 w-12 h-12 glass rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 z-20 animate-fade-in"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Pattern d'arrière-plan animé */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-sparkle" />
            <div className="absolute top-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float" />
            <div className="absolute bottom-20 right-10 w-32 h-32 bg-orange-400/20 rounded-full blur-lg animate-float" style={{animationDelay: '1s'}} />
          </div>

          {/* Contenu Hero Compact */}
          <div className="relative z-10 px-6 py-12 sm:py-16 text-center">
            {/* Icône animée */}
            <div className={`transform transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 glass rounded-3xl flex items-center justify-center shadow-2xl animate-icon-pulse border border-white/30">
                <span className="text-2xl sm:text-3xl md:text-4xl">🔐</span>
              </div>
            </div>
            
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 text-shadow-lg transform transition-all duration-1000 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Connexion
            </h1>
            <p className={`text-sm sm:text-base md:text-lg text-white/90 transform transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Accédez à votre espace FayClick
            </p>
          </div>
        </div>

        {/* Section Formulaire */}
        <div className="px-6 py-8 bg-gradient-to-b from-white to-gray-50">
          {/* Message de bienvenue */}
          <div className={`glass-strong rounded-2xl p-6 mb-8 text-center transform transition-all duration-1000 delay-400 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="heading-sm text-gray-800 mb-2">
              Bon retour ! 👋
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Connectez-vous pour gérer votre business et développer votre activité.
            </p>
          </div>

          {/* Formulaire de Connexion Premium */}
          <form onSubmit={handleSubmit} className={`space-y-6 transform transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-gray-700 font-semibold mb-3 text-sm">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-premium transform transition-all duration-300 hover:scale-[1.02] focus:scale-[1.02]"
                placeholder="votre@email.com"
                required
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-gray-700 font-semibold mb-3 text-sm">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-premium transform transition-all duration-300 hover:scale-[1.02] focus:scale-[1.02]"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Mot de passe oublié */}
            <div className="text-right">
              <Link 
                href="/forgot-password" 
                className="text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                <div className="flex items-center gap-2">
                  <span>❌</span>
                  {error}
                </div>
              </div>
            )}

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-gradient px-8 py-4 text-lg w-full ${isLoading ? 'animate-pulse' : 'animate-glow'} transform transition-all duration-300 hover:scale-[1.02]`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </div>
              ) : (
                'Se Connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={`flex items-center gap-4 my-8 transform transition-all duration-1000 delay-600 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            <span className="text-gray-500 text-sm font-medium px-4">ou</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          </div>

          {/* Options de connexion alternatives */}
          <div className={`space-y-4 transform transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <button className="btn-secondary w-full px-6 py-4 flex items-center justify-center gap-3 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100">
              <span className="text-xl">📱</span>
              <span className="font-semibold">Continuer avec Orange Money</span>
            </button>
            
            <button className="btn-secondary w-full px-6 py-4 flex items-center justify-center gap-3 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
              <span className="text-xl">💳</span>
              <span className="font-semibold">Continuer avec Wave</span>
            </button>
          </div>

          {/* Lien vers inscription */}
          <div className={`mt-10 text-center transform transition-all duration-1000 delay-800 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <p className="text-gray-600">
              Nouveau sur FayClick ?{' '}
              <Link 
                href="/register" 
                className="text-primary-600 font-bold hover:text-primary-700 transition-colors hover:underline"
              >
                Créer un compte gratuitement
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Premium */}
        <footer className="px-6 py-6 bg-gradient-to-t from-gray-100 to-white text-center border-t">
          <p className="text-gray-500 text-xs mb-3">
            En vous connectant, vous acceptez nos{' '}
            <Link href="/terms" className="text-primary-600 hover:underline">
              Conditions d'utilisation
            </Link>{' '}
            et notre{' '}
            <Link href="/privacy" className="text-primary-600 hover:underline">
              Politique de confidentialité
            </Link>
          </p>
          
          <div className="flex items-center justify-center gap-1 text-gray-400 text-xs">
            <span>🔒</span>
            <span>Connexion sécurisée SSL</span>
          </div>
        </footer>
      </div>
    </div>
  );
}