'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

        {/* Header */}
        <div className="header py-12 px-6 relative overflow-hidden">
          {/* Pattern d'arrière-plan */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-sparkle" />
          </div>

          {/* Bouton Retour */}
          <Link
            href="/"
            className="absolute top-5 left-5 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 z-10"
          >
            ←
          </Link>

          {/* Contenu du header */}
          <div className="text-center pt-8 relative z-10">
            <div className="w-20 h-20 mx-auto mb-5 bg-white rounded-full flex items-center justify-center shadow-xl animate-icon-pulse">
              <span className="text-3xl">🔐</span>
            </div>
            
            <h1 className="heading-lg text-white mb-2">
              Connexion
            </h1>
            <p className="text-white/90 text-base">
              Accédez à votre espace FayClick
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 -mt-6 relative bg-gradient-to-b from-sky-100 to-blue-50 min-h-[60vh]">
          {/* Section de Bienvenue */}
          <Card className="mb-6 bg-white/95 backdrop-blur-sm border-0 shadow-lg">
            <div className="p-6 text-center">
              <h2 className="heading-sm text-gray-800 mb-2">
                Bon retour !
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Connectez-vous pour gérer votre business et développer votre activité.
              </p>
            </div>
          </Card>

          {/* Formulaire de Connexion */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-gray-700 font-semibold mb-2 text-sm">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="votre@email.com"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-gray-700 font-semibold mb-2 text-sm">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Mot de passe oublié */}
              <div className="text-right">
                <Link 
                  href="/forgot-password" 
                  className="text-primary-600 text-sm hover:text-primary-700 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Bouton de connexion */}
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                loading={isLoading}
                className="shadow-lg hover:shadow-xl"
              >
                {isLoading ? 'Connexion...' : 'Se Connecter'}
              </Button>
            </form>
          </Card>

          {/* Options de connexion alternatives */}
          <div className="mt-6 text-center">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-gray-500 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Connexion avec réseaux sociaux */}
            <div className="space-y-3">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                className="border-gray-300 hover:border-gray-400"
              >
                <span className="mr-2">📱</span>
                Continuer avec Orange Money
              </Button>
              
              <Button
                variant="secondary"
                size="md"
                fullWidth
                className="border-gray-300 hover:border-gray-400"
              >
                <span className="mr-2">💳</span>
                Continuer avec Wave
              </Button>
            </div>
          </div>

          {/* Lien vers inscription */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Nouveau sur FayClick ?{' '}
              <Link 
                href="/register" 
                className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-6 text-center text-gray-600 text-xs">
          <p>En vous connectant, vous acceptez nos</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/terms" className="hover:text-primary-600 transition-colors">
              Conditions d'utilisation
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-primary-600 transition-colors">
              Politique de confidentialité
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}