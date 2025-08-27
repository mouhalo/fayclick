'use client';

import React from 'react';
import { StructureHeaderProps } from '../types/structure-page';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatDate } from '@/utils/formatters';

const StructureHeader: React.FC<StructureHeaderProps> = ({ structure, className = '' }) => {
  const { isMobile, isTablet } = useBreakpoint();

  const handleDownloadGuide = (type: 'client' | 'gerant') => {
    // TODO: Implémenter le téléchargement des guides PDF
    console.log(`Téléchargement du guide ${type}`);
  };

  return (
    <div className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Logo et informations principales */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              {structure.logo ? (
                <img
                  src={structure.logo}
                  alt={`Logo ${structure.nom_structure}`}
                  className="h-12 w-12 lg:h-16 lg:w-16 rounded-lg object-cover border border-gray-200"
                />
              ) : (
                <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg lg:text-xl">
                    {structure.nom_structure.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Informations structure */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {structure.nom_structure}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {structure.code_structure}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {structure.type_structure}
                </span>
                {!isMobile && structure.created_at && (
                  <span className="text-sm text-gray-500">
                    Créé le {formatDate(structure.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Guides PDF et actions */}
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
            {/* Guide Clients */}
            <button
              onClick={() => handleDownloadGuide('client')}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isMobile ? 'Guide Clients.PDF' : 'Guide Clients.PDF'}
            </button>

            {/* Guide Gérant */}
            <button
              onClick={() => handleDownloadGuide('gerant')}
              className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isMobile ? 'Guide Gérant.PDF' : 'Guide Gérant.PDF'}
            </button>

            {/* Actions supplémentaires sur desktop */}
            {!isMobile && (
              <div className="flex items-center">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Informations complémentaires sur desktop */}
        {!isMobile && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <dt className="text-sm font-medium text-gray-500">Adresse</dt>
              <dd className="mt-1 text-sm text-gray-900 line-clamp-2">
                {structure.adresse || 'Non renseignée'}
              </dd>
            </div>
            
            {structure.email && (
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {structure.email}
                </dd>
              </div>
            )}
            
            {structure.mobile_om && (
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-sm font-medium text-gray-500">Mobile Money</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {structure.mobile_om}
                </dd>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-3">
              <dt className="text-sm font-medium text-gray-500">Statut</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  structure.actif 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {structure.actif ? 'Actif' : 'Inactif'}
                </span>
              </dd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StructureHeader;