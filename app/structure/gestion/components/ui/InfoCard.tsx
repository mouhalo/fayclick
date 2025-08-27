'use client';

import React from 'react';
import { InfoCardProps } from '../../types/structure-page';

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  label,
  value,
  description,
  color = 'blue',
  onClick
}) => {
  const colorClasses = {
    blue: 'border-blue-500 bg-blue-50',
    green: 'border-green-500 bg-green-50',
    orange: 'border-orange-500 bg-orange-50',
    purple: 'border-purple-500 bg-purple-50',
    red: 'border-red-500 bg-red-50',
    gray: 'border-gray-500 bg-gray-50'
  };

  const iconColorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100',
    gray: 'text-gray-600 bg-gray-100'
  };

  const baseClasses = `
    bg-white rounded-2xl p-4 md:p-6 shadow-sm border-l-4
    transition-all duration-300 hover:shadow-lg
    ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}
    ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}
  `;

  return (
    <div className={baseClasses} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm text-gray-600 font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xl md:text-2xl font-bold mt-2 text-gray-900 break-words">
            {typeof value === 'string' && value.length > 20 && window.innerWidth < 768
              ? `${value.substring(0, 20)}...`
              : value
            }
          </p>
          {description && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {/* Icône */}
        <div className={`
          flex-shrink-0 p-3 rounded-lg ml-4
          ${iconColorClasses[color as keyof typeof iconColorClasses] || iconColorClasses.blue}
        `}>
          {typeof icon === 'string' ? (
            // Si c'est un emoji ou texte
            <span className="text-lg md:text-xl">{icon}</span>
          ) : (
            // Si c'est un composant SVG
            <div className="h-5 w-5 md:h-6 md:w-6">{icon}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoCard;