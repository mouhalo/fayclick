'use client';

import { ResponsiveCard, CardContent } from '@/components/patterns';

interface BusinessSegmentsProps {
  isLoaded: boolean;
}

export default function BusinessSegments({ isLoaded }: BusinessSegmentsProps) {
  const segments = [
    { icon: '🛠️', title: 'Prestataires', desc: 'Services & Artisans', gradient: 'from-blue-500 to-blue-600', features: ['Devis', 'Planning', 'Factures'] },
    { icon: '🏪', title: 'Commerce', desc: 'Boutiques & Ventes', gradient: 'from-orange-500 to-orange-600', features: ['POS', 'Stock', 'Clients'] },
    { icon: '🎓', title: 'Scolaire', desc: 'Écoles & Formation', gradient: 'from-green-500 to-green-600', features: ['Élèves', 'Notes', 'Parents'] },
    { icon: '🏢', title: 'Immobilier', desc: 'Location & Gestion', gradient: 'from-purple-500 to-purple-600', features: ['Biens', 'Contrats', 'Locataires'] }
  ];

  return (
    <div className={`grid-responsive-1-2-4 auto-rows-fr mb-12 lg:mb-16 transform transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
      {segments.map((segment, index) => (
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
  );
}