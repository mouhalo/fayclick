'use client';

import { useRef, useEffect } from 'react';
import { ServiceCarouselProps, SERVICE_ICONS, ServiceType } from '@/types/registration';

export default function ServiceCarousel({ 
  selectedService, 
  onServiceSelect, 
  className = '' 
}: ServiceCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Faire défiler vers l'élément sélectionné
  useEffect(() => {
    if (carouselRef.current && window.innerWidth < 1024) { // Seulement sur mobile/tablette
      const selectedElement = carouselRef.current.querySelector(`[data-service="${selectedService}"]`) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [selectedService]);

  const services = Object.entries(SERVICE_ICONS).map(([key, icon]) => ({
    key: key as ServiceType,
    label: key,
    icon,
    isSelected: selectedService === key
  }));

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-5 lg:p-6 shadow-lg border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center mb-3 md:mb-4">
        <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-2 md:mr-3">
          <span className="text-blue-500 text-base md:text-lg">🏷️</span>
        </div>
        <h3 className="text-base md:text-lg font-semibold text-gray-800">
          Type de service
        </h3>
        <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 md:py-1 rounded-full">
          Optionnel
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-xs md:text-sm mb-4 md:mb-6">
        Sélectionnez le type de service qui correspond le mieux à votre activité
      </p>

      {/* Carrousel horizontal pour mobile/tablette, grille pour desktop */}
      <div 
        ref={carouselRef}
        className="flex lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {services.map((service) => (
          <div
            key={service.key}
            data-service={service.key}
            onClick={() => onServiceSelect(service.key)}
            className={`
              flex-shrink-0 lg:flex-shrink w-28 md:w-32 lg:w-auto p-3 md:p-4 rounded-xl cursor-pointer transition-all duration-300
              border-2 text-center relative overflow-hidden
              ${service.isSelected 
                ? 'border-primary-500 bg-primary-50 shadow-lg transform scale-105' 
                : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-md'
              }
            `}
          >
            {/* Badge de sélection */}
            {service.isSelected && (
              <div className="absolute top-1 right-1 w-4 h-4 md:w-5 md:h-5 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] md:text-xs">✓</span>
              </div>
            )}

            {/* Icône du service */}
            <div className="text-2xl md:text-3xl mb-2 md:mb-3 transform transition-transform duration-200 hover:scale-110">
              {service.icon}
            </div>

            {/* Label du service */}
            <div className={`text-[10px] md:text-xs font-medium leading-tight ${
              service.isSelected ? 'text-primary-700' : 'text-gray-700'
            }`}>
              {service.label.split(' ').map((word, index) => (
                <div key={index}>{word}</div>
              ))}
            </div>

            {/* Animation de sélection */}
            {service.isSelected && (
              <div className="absolute inset-0 bg-primary-500/5 rounded-xl animate-pulse pointer-events-none" />
            )}
          </div>
        ))}
      </div>

      {/* Indicateur de navigation - Visible uniquement sur mobile/tablette */}
      <div className="flex lg:hidden justify-center mt-3 md:mt-4 space-x-1.5 md:space-x-2">
        {Array.from({ length: Math.ceil(services.length / 3) }).map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300 ${
              Math.floor(services.findIndex(s => s.isSelected) / 3) === index
                ? 'bg-primary-500 w-4 md:w-6'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Service sélectionné avec détail */}
      <div className="mt-3 md:mt-4 lg:mt-6 p-2.5 md:p-3 lg:p-4 bg-primary-50/50 rounded-lg border border-primary-200/50">
        <div className="flex items-center">
          <span className="text-xl md:text-2xl lg:text-3xl mr-2 md:mr-3">{SERVICE_ICONS[selectedService]}</span>
          <div className="flex-1">
            <p className="text-xs md:text-sm lg:text-base font-semibold text-primary-700">
              Service sélectionné : {selectedService}
            </p>
            <p className="text-[10px] md:text-xs lg:text-sm text-gray-600 mt-0.5 md:mt-1">
              {selectedService === 'SERVICES' && 'Catégorie par défaut pour tous types de services généraux'}
              {selectedService === 'COMMERCE GENERAL' && 'Vente de produits divers et commerce général'}
              {selectedService === 'ALIMENTATION' && 'Restauration, épicerie et produits alimentaires'}
              {selectedService === 'TEXTILE - MODE' && 'Vêtements, tissus et accessoires de mode'}
              {selectedService === 'ELECTRONIQUE' && 'Matériel électronique et services techniques'}
              {selectedService === 'ARTISANAT' && 'Création artistique et métiers d\'art'}
              {selectedService === 'AGRO-PRODUCT' && 'Produits agricoles et transformation'}
            </p>
          </div>
        </div>
      </div>

      {/* Note d'information */}
      <div className="mt-2 md:mt-3 text-[10px] md:text-xs text-gray-500 italic text-center">
        💡 Vous pourrez modifier ce choix plus tard dans votre espace de gestion
      </div>
    </div>
  );
}