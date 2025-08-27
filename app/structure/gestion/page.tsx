'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/auth/AuthGuard';
import { Permission } from '@/types/auth';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import useStructureData from './hooks/useStructureData';
import { TabId, TabItem } from './types/structure-page';

// Import des composants (seront créés dans les prochaines étapes)
import StructureHeader from './components/StructureHeader';
import TabNavigation from './components/TabNavigation';
import InfosTab from './components/tabs/InfosTab';
import FinanceTab from './components/tabs/FinanceTab';
import DashboardTab from './components/tabs/DashboardTab';
import UsersTab from './components/tabs/UsersTab';

// Configuration des onglets selon le type de structure
const getTabsForStructure = (structureType: string): TabItem[] => {
  const baseTabs: TabItem[] = [
    {
      id: 'infos',
      label: 'Infos',
      icon: '📱',
      requiredPermission: Permission.VIEW_DASHBOARD
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: '💰',
      requiredPermission: Permission.ACCESS_FINANCES
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      requiredPermission: Permission.VIEW_DASHBOARD
    }
  ];

  // Onglet utilisateurs pour les gestionnaires
  const userTab: TabItem = {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    icon: '👥',
    requiredPermission: Permission.MANAGE_USERS
  };

  return [...baseTabs, userTab];
};

export default function GestionStructurePage() {
  const { user, structure, permissions } = useAuth();
  const { isMobile } = useBreakpoint();
  const {
    activeTab,
    setActiveTab,
    isLoading,
    hasError,
    error,
    clearError
  } = useStructureData();

  if (!structure) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Aucune structure trouvée
          </h2>
          <p className="text-gray-600">
            Veuillez vous reconnecter pour accéder à la gestion de votre structure.
          </p>
        </div>
      </div>
    );
  }

  const tabs = getTabsForStructure(structure.type_structure);
  
  // Filtrer les onglets selon les permissions
  const accessibleTabs = tabs.filter(tab => {
    if (!tab.requiredPermission) return true;
    return permissions?.permissions.includes(tab.requiredPermission) || false;
  });

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={clearError}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'infos':
        return <InfosTab isActive structure={structure} />;
      case 'finance':
        return <FinanceTab isActive structure={structure} />;
      case 'dashboard':
        return <DashboardTab isActive structure={structure} />;
      case 'utilisateurs':
        return <UsersTab isActive structure={structure} />;
      default:
        return <InfosTab isActive structure={structure} />;
    }
  };

  return (
    <AuthGuard requiredPermission={Permission.VIEW_DASHBOARD}>
      <div className="min-h-screen bg-gray-50">
        {/* Header avec logo et informations structure */}
        <StructureHeader structure={structure} />

        {/* Navigation par onglets */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TabNavigation
              tabs={accessibleTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isMobile={isMobile}
            />
          </div>
        </div>

        {/* Contenu principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-sm">
            {renderTabContent()}
          </div>
        </main>

        {/* Navigation mobile bottom (si mobile) */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
            <div className="flex justify-around">
              {accessibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center p-2 rounded-lg transition-colors
                    ${activeTab === tab.id 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-400 hover:text-gray-600'
                    }
                  `}
                >
                  <span className="text-xl mb-1">{tab.icon}</span>
                  <span className="text-xs font-medium">{tab.label}</span>
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}