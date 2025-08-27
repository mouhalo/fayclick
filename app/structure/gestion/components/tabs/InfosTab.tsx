'use client';

import React from 'react';
import { TabContentProps } from '../../types/structure-page';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatDate } from '@/utils/formatters';
import InfoCard from '../ui/InfoCard';

const InfosTab: React.FC<TabContentProps> = ({ isActive, structure }) => {
  const { isMobile } = useBreakpoint();

  if (!isActive) return null;

  const handleDownloadGuide = (type: 'client' | 'gerant') => {
    // TODO: Implémenter le téléchargement des guides PDF
    console.log(`Téléchargement du guide ${type}`);
  };

  const handleEditStructure = () => {
    // TODO: Implémenter la modification des informations structure
    console.log('Modifier les informations de la structure');
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête avec titre et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Informations de la structure
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Détails et configuration de votre organisation
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => handleDownloadGuide('client')}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Guide Clients.PDF
          </button>
          
          <button
            onClick={() => handleDownloadGuide('gerant')}
            className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Guide Gérant.PDF
          </button>
        </div>
      </div>

      {/* Cartes d'informations principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon="#"
          label="Code Structure"
          value={structure.code_structure}
          description="Identifiant unique de la structure"
          color="blue"
        />
        
        <InfoCard
          icon="📍"
          label="Adresse"
          value={structure.adresse || 'Non renseignée'}
          description="Localisation de la structure"
          color="green"
        />
        
        <InfoCard
          icon="🏢"
          label="Type"
          value={structure.type_structure}
          description="Catégorie de la structure"
          color="orange"
        />
        
        <InfoCard
          icon="📅"
          label="Date de création"
          value={structure.created_at ? formatDate(structure.created_at) : 'Non disponible'}
          description="Date d'enregistrement"
          color="purple"
        />
      </div>

      {/* Informations détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Contact et Communication */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-3">📞</span>
            Contact & Communication
          </h3>
          
          <div className="space-y-4">
            {structure.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {structure.email}
                </dd>
              </div>
            )}
            
            {structure.mobile_om && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Mobile Money (OM)</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <span className="text-orange-500 mr-2">📱</span>
                  {structure.mobile_om}
                </dd>
              </div>
            )}
            
            {structure.mobile_wave && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Mobile Money (Wave)</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <span className="text-blue-500 mr-2">〰️</span>
                  {structure.mobile_wave}
                </dd>
              </div>
            )}
            
            {(!structure.email && !structure.mobile_om && !structure.mobile_wave) && (
              <p className="text-sm text-gray-500 italic">
                Aucune information de contact renseignée
              </p>
            )}
          </div>
        </div>

        {/* Configuration et Statut */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-3">⚙️</span>
            Configuration & Statut
          </h3>
          
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Statut</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  structure.actif 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className="mr-2">{structure.actif ? '✅' : '❌'}</span>
                  {structure.actif ? 'Structure Active' : 'Structure Inactive'}
                </span>
              </dd>
            </div>
            
            {structure.numautorisatioon && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Numéro d'autorisation</dt>
                <dd className="mt-1 text-sm text-gray-900">{structure.numautorisatioon}</dd>
              </div>
            )}
            
            {structure.nummarchand && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Numéro marchand</dt>
                <dd className="mt-1 text-sm text-gray-900">{structure.nummarchand}</dd>
              </div>
            )}
            
            {structure.num_unik_reversement && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Numéro de reversement</dt>
                <dd className="mt-1 text-sm text-gray-900">{structure.num_unik_reversement}</dd>
              </div>
            )}
            
            {structure.updated_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Dernière mise à jour</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(structure.updated_at)}</dd>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-3">🚀</span>
          Actions rapides
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={handleEditStructure}
            className="flex items-center justify-center px-4 py-3 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier les infos
          </button>
          
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter les données
          </button>
          
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Générer rapport
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfosTab;