'use client';

import { ResponsiveCard, CardContent, InfoRow } from '@/components/patterns';

interface AdvantagesSectionProps {
  isLoaded: boolean;
}

export default function AdvantagesSection({ isLoaded }: AdvantagesSectionProps) {
  const features = [
    { icon: '⚡', title: 'Instantané', text: 'Facturation automatisée en temps réel' },
    { icon: '📊', title: 'Analytics', text: 'Gestion de stock et rapports avancés' },
    { icon: '💳', title: 'Paiements', text: 'Orange Money & Wave intégrés' },
    { icon: '🌐', title: 'Offline', text: 'Fonctionne même sans connexion' },
    { icon: '🔒', title: 'Sécurisé', text: 'Sécurité bancaire garantie' },
    { icon: '🎯', title: 'Adapté', text: 'Optimisé pour le Sénégal' }
  ];

  return (
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
          {features.map((feature, index) => (
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
  );
}