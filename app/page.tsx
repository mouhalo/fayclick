'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Particules animées
  const particles = Array.from({ length: 20 }, (_, i) => (
    <div
      key={i}
      className="particle absolute w-1 h-1 bg-orange-400/60 rounded-full animate-float-particles"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 12}s`,
        animationDuration: `${12 + Math.random() * 8}s`,
      }}
    />
  ));

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Particules d'arrière-plan */}
      <div className="background-animation fixed inset-0 z-0">
        {particles}
      </div>

      {/* Container Mobile */}
      <div className="relative z-10 max-w-[425px] mx-auto min-h-screen bg-white shadow-2xl">
        {/* Status Bar */}
        <div className="status-bar">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Hero Section avec Animation */}
        <div className="relative overflow-hidden">
          <div className="header py-16 px-6 text-center relative">
            {/* Pattern d'arrière-plan */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-sparkle" />
            </div>

            {/* Logo animé */}
            <div className={`transform transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
              <div className="w-32 h-32 mx-auto mb-6 bg-white rounded-full flex items-center justify-center shadow-2xl animate-icon-pulse">
                <span className="text-5xl font-bold gradient-text">FC</span>
              </div>
            </div>

            {/* Titre principal */}
            <h1 className={`heading-xl text-white mb-4 transform transition-all duration-1000 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              FayClick
            </h1>
            
            {/* Sous-titre */}
            <p className={`text-lg text-white/90 mb-2 transform transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              La Super App du Sénégal
            </p>
            
            {/* Tagline */}
            <p className={`text-sm text-white/80 transform transition-all duration-1000 delay-400 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Gérez votre business en toute simplicité
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-6 py-8 -mt-8 relative">
          {/* Cards de fonctionnalités */}
          <div className={`grid grid-cols-2 gap-4 mb-8 transform transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <Card 
              hover 
              className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
            >
              <div className="text-3xl mb-2">🛠️</div>
              <h3 className="font-montserrat font-semibold text-gray-800">Prestataires</h3>
              <p className="text-xs text-gray-600 mt-1">Services & Artisans</p>
            </Card>
            
            <Card 
              hover 
              className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
            >
              <div className="text-3xl mb-2">🏪</div>
              <h3 className="font-montserrat font-semibold text-gray-800">Commerce</h3>
              <p className="text-xs text-gray-600 mt-1">Boutiques & Ventes</p>
            </Card>
            
            <Card 
              hover 
              className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200"
            >
              <div className="text-3xl mb-2">🎓</div>
              <h3 className="font-montserrat font-semibold text-gray-800">Scolaire</h3>
              <p className="text-xs text-gray-600 mt-1">Écoles & Formation</p>
            </Card>
            
            <Card 
              hover 
              className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
            >
              <div className="text-3xl mb-2">🏢</div>
              <h3 className="font-montserrat font-semibold text-gray-800">Immobilier</h3>
              <p className="text-xs text-gray-600 mt-1">Location & Gestion</p>
            </Card>
          </div>

          {/* Section CTA */}
          <div className={`space-y-4 transform transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="text-center mb-6">
              <h2 className="heading-md text-gray-800 mb-2">
                Commencez Maintenant
              </h2>
              <p className="text-gray-600">
                Rejoignez des milliers d'entrepreneurs
              </p>
            </div>

            {/* Boutons d'action */}
            <Link href="/login" className="block">
              <Button 
                variant="gradient" 
                size="lg" 
                fullWidth
                className="shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Se Connecter
              </Button>
            </Link>
            
            <Link href="/register" className="block">
              <Button 
                variant="secondary" 
                size="lg" 
                fullWidth
                className="shadow-md hover:shadow-lg"
              >
                Créer un Compte
              </Button>
            </Link>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-gray-500 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Demo Button */}
            <Button 
              variant="ghost" 
              size="md" 
              fullWidth
              className="text-primary-600"
            >
              Explorer la Démo
            </Button>
          </div>

          {/* Features List */}
          <div className={`mt-12 space-y-3 transform transition-all duration-1000 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-700">Facturation instantanée</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-700">Gestion de stock en temps réel</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-700">Paiements mobiles intégrés</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-700">Rapports et statistiques</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto px-6 py-8 text-center text-gray-600 text-sm">
          <p className="mb-2">© 2025 FayClick - Tous droits réservés</p>
          <p className="text-xs">
            Fait avec ❤️ au Sénégal
          </p>
        </footer>
      </div>
    </div>
  );
}
