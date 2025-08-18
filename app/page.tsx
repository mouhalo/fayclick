'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PageContainer, 
  ResponsiveContainer, 
  ResponsiveHeader, 
  HeaderActionButton,
  ResponsiveCard,
  CardContent,
  InfoRow
} from '@/components/patterns';
import { useBreakpoint } from '@/hooks';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [particles, setParticles] = useState<React.ReactElement[]>([]);
  const { width } = useBreakpoint();

  // Génération des particules adaptatives
  useEffect(() => {
    setIsLoaded(true);
    
    const getParticleCount = () => {
      if (width < 480) return 12;   // Très petit mobile
      if (width < 640) return 18;   // Mobile
      if (width < 768) return 25;   // Mobile large
      if (width < 1024) return 30;  // Tablette
      if (width < 1280) return 40;  // Desktop
      return 50; // Large Desktop
    };

    const particleCount = getParticleCount();
    const generatedParticles = Array.from({ length: particleCount }, (_, i) => (
      <div
        key={`particle-${i}-${width}`}
        className="absolute w-1 h-1 bg-orange-400/40 rounded-full animate-float-particles gpu-accelerated"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 12}s`,
          animationDuration: `${12 + Math.random() * 8}s`,
        }}
      />
    ));
    
    setParticles(generatedParticles);
  }, [width]);

  return (
    <PageContainer className="relative gradient-primary overflow-hidden">
      {/* Particules d'arrière-plan optimisées */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {particles}
      </div>

      <div className="relative z-10 animate-slide-up">
        {/* Header responsive avec nouvelles classes */}
        <ResponsiveHeader
          title="FayClick"
          subtitle="La Super App du Sénégal"
          navigation={{
            logo: {
              icon: (
                <div className="w-8 h-8 sm:w-10 sm:w-10 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg animate-icon-pulse border border-white/20">
                  <span className="text-lg sm:text-xl font-bold gradient-text">FC</span>
                </div>
              ),
              text: "FayClick",
            }
          }}
          actions={
            <HeaderActionButton href="/login" aria-label="Mon espace">
              <span className="text-lg">👤</span>
              <span className="sr-only-sm">Mon Espace</span>
            </HeaderActionButton>
          }
        />

        <ResponsiveContainer>
          {/* Hero content amélioré */}
          <div className={`text-center mb-8 sm:mb-12 lg:mb-16 transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Logo principal responsive */}
            <div className="mb-6 sm:mb-8">
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 mx-auto bg-white/95 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl animate-icon-pulse border border-white/30">
                <span className="text-responsive-hero font-bold gradient-text">FC</span>
              </div>
            </div>

            {/* Tagline responsive */}
            <p className="text-responsive-base text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Gérez votre business en toute simplicité avec la première Super App du Sénégal
            </p>

            {/* CTA Buttons améliorés */}
            <div className="flex flex-col xs:flex-row gap-4 xs:gap-6 justify-center max-w-md mx-auto">
              <Link href="/login" className="flex-1">
                <button className="btn-gradient btn-touch-optimized w-full animate-glow">
                  <span className="mobile-only">Connexion</span>
                  <span className="hidden-mobile">Se Connecter</span>
                </button>
              </Link>
              
              <Link href="/register" className="flex-1">
                <button className="btn-secondary btn-touch-optimized w-full bg-white/90 backdrop-blur-sm border-white/30">
                  <span className="mobile-only">Inscription</span>
                  <span className="hidden-mobile">Créer un Compte</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Section Segments Métier avec patterns eTicket */}
          <div className="bg-gradient-to-b from-white to-gray-50 padding-spacious">
            {/* Titre section responsive */}
            <div className={`text-center mb-8 sm:mb-12 lg:mb-16 transform transition-all duration-1000 delay-600 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h2 className="text-responsive-heading font-bold text-gray-800 mb-4">
                Votre Secteur d&apos;Activité
              </h2>
              <p className="text-responsive-base text-gray-600 leading-relaxed max-w-3xl mx-auto">
                Une solution adaptée à chaque métier, optimisée pour le marché sénégalais
              </p>
            </div>

            {/* Grid responsive avec nouvelles classes */}
            <div className={`grid-responsive-1-2-4 auto-rows-fr mb-12 lg:mb-16 transform transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {[
                { icon: '🛠️', title: 'Prestataires', desc: 'Services & Artisans', gradient: 'from-blue-500 to-blue-600', features: ['Devis', 'Planning', 'Factures'] },
                { icon: '🏪', title: 'Commerce', desc: 'Boutiques & Ventes', gradient: 'from-orange-500 to-orange-600', features: ['POS', 'Stock', 'Clients'] },
                { icon: '🎓', title: 'Scolaire', desc: 'Écoles & Formation', gradient: 'from-green-500 to-green-600', features: ['Élèves', 'Notes', 'Parents'] },
                { icon: '🏢', title: 'Immobilier', desc: 'Location & Gestion', gradient: 'from-purple-500 to-purple-600', features: ['Biens', 'Contrats', 'Locataires'] }
              ].map((segment, index) => (
                <ResponsiveCard
                  key={segment.title}
                  variant="eticket"
                  className={`transform transition-all duration-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                >
                  {/* Header avec gradient */}
                  <div className={`card-header-gradient bg-gradient-to-br ${segment.gradient} text-white text-center relative overflow-hidden`}>
                    {/* Effet de lumière pour desktop */}
                    <div className="absolute inset-0 opacity-30 hidden sm:block">
                      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white rounded-full blur-3xl animate-float" />
                    </div>
                    
                    {/* Contenu header */}
                    <div className="relative padding-comfortable flex flex-col items-center justify-center">
                      <div className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 animate-float" style={{animationDelay: `${index * 0.5}s`}}>
                        {segment.icon}
                      </div>
                      <h3 className="text-responsive-title font-bold mb-2">
                        {segment.title}
                      </h3>
                      <p className="text-white/90 text-responsive-small">
                        {segment.desc}
                      </p>
                    </div>
                  </div>

                  {/* Contenu carte */}
                  <CardContent padding="comfortable">
                    <div className="text-center">
                      <h4 className="text-micro text-gray-600 uppercase tracking-wide font-bold mb-3">
                        Fonctionnalités clés
                      </h4>
                      <div className="flex justify-center gap-2 flex-wrap">
                        {segment.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-micro font-medium"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      
                      {/* CTA pour chaque segment */}
                      <div className="mt-4">
                        <button className="btn-gradient btn-touch-optimized w-full text-responsive-small">
                          <span className="mobile-only">Découvrir</span>
                          <span className="hidden-mobile">Découvrir {segment.title}</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </ResponsiveCard>
              ))}
            </div>

            {/* Section Avantages avec InfoRows */}
            <ResponsiveCard variant="featured" className={`mb-12 lg:mb-16 transform transition-all duration-1000 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <CardContent padding="comfortable">
                <div className="text-center mb-6">
                  <h3 className="text-responsive-title font-bold text-gray-800 mb-3">
                    Pourquoi choisir FayClick ?
                  </h3>
                  <p className="text-responsive-base text-gray-600">
                    Les avantages qui font la différence
                  </p>
                </div>
                
                <div className="spacing-normal grid grid-cols-1 sm:grid-cols-2">
                  {[
                    { icon: '⚡', title: 'Instantané', text: 'Facturation automatisée en temps réel' },
                    { icon: '📊', title: 'Analytics', text: 'Gestion de stock et rapports avancés' },
                    { icon: '💳', title: 'Paiements', text: 'Orange Money & Wave intégrés' },
                    { icon: '🌐', title: 'Offline', text: 'Fonctionne même sans connexion' },
                    { icon: '🔒', title: 'Sécurisé', text: 'Sécurité bancaire garantie' },
                    { icon: '🎯', title: 'Adapté', text: 'Optimisé pour le Sénégal' }
                  ].map((feature, index) => (
                    <InfoRow
                      key={index}
                      icon={<span className="text-xl">{feature.icon}</span>}
                      label={feature.title}
                      value={feature.text}
                      className={`transform transition-all duration-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
                    />
                  ))}
                </div>
              </CardContent>
            </ResponsiveCard>

            {/* CTA Section Finale optimisée */}
            <div className={`text-center transform transition-all duration-1000 delay-1100 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="mb-8">
                <h3 className="text-responsive-title font-bold text-gray-800 mb-3">
                  Prêt à transformer votre business ?
                </h3>
                <p className="text-responsive-base text-gray-600 mb-6">
                  Rejoignez plus de 10,000 entrepreneurs qui font confiance à FayClick
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                  <button className="btn-ghost btn-touch-optimized flex-1">
                    <span className="mobile-only">Démo</span>
                    <span className="hidden-mobile">Explorer la Démo</span>
                  </button>
                  <Link href="/register" className="flex-1">
                    <button className="btn-gradient btn-touch-optimized w-full">
                      <span className="mobile-only">Gratuit</span>
                      <span className="hidden-mobile">Commencer Gratuitement</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </ResponsiveContainer>

        {/* Footer responsive */}
        <footer className="responsive-container bg-gradient-to-t from-gray-100 to-white text-center border-t safe-area-bottom">
          <div className="padding-normal">
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-responsive-small text-gray-600 mb-4">
              <Link href="/terms" className="hover:text-primary-600 transition-colors focus-responsive">
                Conditions
              </Link>
              <span className="hidden xs:inline">•</span>
              <Link href="/privacy" className="hover:text-primary-600 transition-colors focus-responsive">
                Confidentialité
              </Link>
              <span className="hidden xs:inline">•</span>
              <Link href="/support" className="hover:text-primary-600 transition-colors focus-responsive">
                Support
              </Link>
            </div>
            
            <p className="text-gray-600 text-responsive-small mb-2">
              © 2025 FayClick - Tous droits réservés
            </p>
            <p className="text-micro text-gray-500 flex items-center justify-center gap-1">
              Conçu avec <span className="text-red-500 animate-pulse">❤️</span> au Sénégal
            </p>
          </div>
        </footer>
      </div>
    </PageContainer>
  );
}
