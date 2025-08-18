'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [particles, setParticles] = useState<JSX.Element[]>([]);

  useEffect(() => {
    setIsLoaded(true);
    
    // Générer les particules adaptatives selon la taille d'écran
    const getParticleCount = () => {
      if (typeof window === 'undefined') return 20;
      const width = window.innerWidth;
      if (width < 640) return 15; // Mobile
      if (width < 1024) return 25; // Tablette
      if (width < 1440) return 35; // Desktop
      return 45; // Large Desktop
    };

    const particleCount = getParticleCount();
    const generatedParticles = Array.from({ length: particleCount }, (_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-orange-400/40 rounded-full animate-float-particles will-change-transform"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 12}s`,
          animationDuration: `${12 + Math.random() * 8}s`,
        }}
      />
    ));
    
    setParticles(generatedParticles);

    // Ajuster les particules lors du redimensionnement
    const handleResize = () => {
      const newCount = getParticleCount();
      if (newCount !== particleCount) {
        const newParticles = Array.from({ length: newCount }, (_, i) => (
          <div
            key={`resize-${i}`}
            className="absolute w-1 h-1 bg-orange-400/40 rounded-full animate-float-particles will-change-transform"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 12}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          />
        ));
        setParticles(newParticles);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen relative gradient-primary overflow-hidden">
      {/* Particules d'arrière-plan */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {particles}
      </div>

      {/* Container Principal Universel */}
      <div className="universal-container relative z-10 animate-slide-up">
        {/* Hero Section Immersive */}
        <div className="relative overflow-hidden gradient-hero">
          {/* Pattern d'arrière-plan animé */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-sparkle" />
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float" />
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-orange-400/20 rounded-full blur-lg animate-float" style={{animationDelay: '2s'}} />
          </div>

          {/* Contenu Hero Ultra-Responsive */}
          <div className="relative z-10 section-padding text-center">
            {/* Logo animé optimisé */}
            <div className={`transform transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 mx-auto mb-4 sm:mb-6 md:mb-8 bg-white/90 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl animate-icon-pulse border border-white/20">
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold gradient-text">FC</span>
              </div>
            </div>

            {/* Titre principal optimisé */}
            <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-3 md:mb-4 text-shadow-lg transform transition-all duration-1000 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              FayClick
            </h1>
            
            {/* Sous-titre compact */}
            <p className={`text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/95 mb-1 sm:mb-2 md:mb-3 font-semibold transform transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              La Super App du Sénégal
            </p>
            
            {/* Tagline compact */}
            <p className={`text-sm sm:text-base md:text-lg lg:text-xl text-white/85 mb-4 sm:mb-6 md:mb-8 transform transition-all duration-1000 delay-400 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Gérez votre business en toute simplicité
            </p>

            {/* CTA Buttons Ultra-Responsive */}
            <div className={`space-y-3 sm:space-y-4 md:space-y-0 md:space-x-4 lg:space-x-6 xl:space-x-8 md:flex md:justify-center md:items-center transform transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <Link href="/login" className="block md:inline-block">
                <button className="btn-gradient touch-target interactive-element px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-4 text-sm sm:text-base md:text-lg lg:text-xl w-full md:w-auto animate-glow">
                  Se Connecter
                </button>
              </Link>
              
              <Link href="/register" className="block md:inline-block">
                <button className="btn-secondary touch-target interactive-element px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-4 text-sm sm:text-base md:text-lg lg:text-xl w-full md:w-auto bg-white/90 backdrop-blur-sm border-white/30">
                  Créer un Compte
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Section Segments Métier Ultra-Responsive */}
        <div className="section-padding bg-gradient-to-b from-white to-gray-50">
          {/* Titre section adaptatif */}
          <div className={`text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16 xl:mb-20 transform transition-all duration-1000 delay-600 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
              Votre Secteur d'Activité
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
              Une solution adaptée à chaque métier
            </p>
          </div>

          {/* Grid des segments universel */}
          <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 mb-8 sm:mb-10 md:mb-12 lg:mb-16 xl:mb-20 transform transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {[
              { icon: '🛠️', title: 'Prestataires', desc: 'Services & Artisans', gradient: 'from-blue-500 to-blue-600' },
              { icon: '🏪', title: 'Commerce', desc: 'Boutiques & Ventes', gradient: 'from-orange-500 to-orange-600' },
              { icon: '🎓', title: 'Scolaire', desc: 'Écoles & Formation', gradient: 'from-green-500 to-green-600' },
              { icon: '🏢', title: 'Immobilier', desc: 'Location & Gestion', gradient: 'from-purple-500 to-purple-600' }
            ].map((segment, index) => (
              <div 
                key={segment.title}
                className={`segment-card card-hover interactive-element desktop-hover p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 text-center bg-gradient-to-br ${segment.gradient} text-white transform transition-all duration-300`}
                style={{animationDelay: `${800 + index * 100}ms`}}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-2 sm:mb-3 md:mb-4 lg:mb-6 animate-float" style={{animationDelay: `${index * 0.5}s`}}>
                  {segment.icon}
                </div>
                <h3 className="font-montserrat font-bold text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-1 sm:mb-2">{segment.title}</h3>
                <p className="text-white/90 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">{segment.desc}</p>
              </div>
            ))}
          </div>

          {/* Section Avantages */}
          <div className={`glass-strong rounded-2xl p-6 mb-10 transform transition-all duration-1000 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h3 className="heading-sm text-gray-800 mb-6 text-center">
              Pourquoi choisir FayClick ?
            </h3>
            
            <div className="space-y-4">
              {[
                { icon: '⚡', text: 'Facturation instantanée et automatisée' },
                { icon: '📊', text: 'Gestion de stock en temps réel' },
                { icon: '💳', text: 'Paiements Orange Money & Wave intégrés' },
                { icon: '📈', text: 'Rapports et analytics avancés' },
                { icon: '🌐', text: 'Fonctionne même hors ligne' },
                { icon: '🔒', text: 'Sécurité bancaire garantie' }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/50 backdrop-blur-sm transform transition-all duration-300 hover:bg-white/70 hover:scale-105"
                  style={{animationDelay: `${1000 + index * 100}ms`}}
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-gray-700 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section Finale */}
          <div className={`text-center transform transition-all duration-1000 delay-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="mb-6">
              <h3 className="heading-sm text-gray-800 mb-2">
                Prêt à transformer votre business ?
              </h3>
              <p className="text-gray-600">
                Rejoignez plus de 10,000 entrepreneurs
              </p>
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-1 px-6 py-3">
                Explorer la Démo
              </button>
              <Link href="/register" className="flex-1">
                <button className="btn-gradient px-6 py-3 w-full">
                  Commencer Gratuitement
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Premium */}
        <footer className="px-6 py-8 bg-gradient-to-t from-gray-100 to-white text-center border-t">
          <div className="mb-4">
            <div className="flex justify-center items-center gap-6 text-sm text-gray-600 mb-3">
              <Link href="/terms" className="hover:text-primary-600 transition-colors">
                Conditions
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-primary-600 transition-colors">
                Confidentialité
              </Link>
              <span>•</span>
              <Link href="/support" className="hover:text-primary-600 transition-colors">
                Support
              </Link>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-2">
            © 2025 FayClick - Tous droits réservés
          </p>
          <p className="text-gray-500 text-xs flex items-center justify-center gap-1">
            Conçu avec <span className="text-red-500 animate-pulse">❤️</span> au Sénégal
          </p>
        </footer>
      </div>
    </div>
  );
}
