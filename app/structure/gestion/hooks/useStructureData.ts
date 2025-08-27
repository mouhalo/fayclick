'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService } from '@/services/dashboard.service';
import { StructurePageState, TabId, FilterState } from '../types/structure-page';
import { StructureDetails, User } from '@/types/auth';

// Hook principal pour gérer les données de la page structure
export const useStructureData = () => {
  const { user, structure, permissions, isAuthenticated } = useAuth();
  
  const [state, setState] = useState<StructurePageState>({
    activeTab: 'infos',
    structure: structure,
    users: [],
    transactions: [],
    stats: null,
    loading: {
      structure: false,
      users: false,
      transactions: false,
      stats: false
    },
    filters: {
      search: '',
      role: '',
      status: 'all',
      dateRange: {
        start: null,
        end: null
      }
    },
    error: null
  });

  // Mettre à jour la structure depuis le contexte auth
  useEffect(() => {
    if (structure) {
      setState(prev => ({
        ...prev,
        structure
      }));
    }
  }, [structure]);

  // Charger les données dashboard
  const loadDashboardStats = useCallback(async () => {
    if (!structure || !isAuthenticated) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, stats: true },
      error: null
    }));

    try {
      const stats = await dashboardService.getDashboardStats(structure.id_structure);
      setState(prev => ({
        ...prev,
        stats,
        loading: { ...prev.loading, stats: false }
      }));
    } catch (error) {
      console.error('Erreur chargement stats dashboard:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, stats: false },
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
    }
  }, [structure, isAuthenticated]);

  // Charger les utilisateurs de la structure
  const loadStructureUsers = useCallback(async () => {
    if (!structure || !isAuthenticated) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, users: true },
      error: null
    }));

    try {
      // TODO: Implémenter l'API pour récupérer les utilisateurs
      // const users = await structureService.getUsers(structure.id_structure);
      
      // Mock data pour le moment
      const mockUsers: User[] = [
        {
          id: 1,
          login: 'admin.ismthies',
          username: 'Admin ISMTHIES',
          nom: 'Admin',
          prenom: 'ISMTHIES',
          email: 'admin@ismthies.edu.sn',
          telephone: '221771234567',
          nom_groupe: 'SCOLAIRE',
          nom_profil: 'ADMIN',
          id_structure: structure.id_structure,
          nom_structure: structure.nom_structure,
          type_structure: structure.type_structure as any,
          pwd_changed: true,
          actif: true,
          logo: structure.logo,
          pwd: '',
          id_groupe: 1,
          id_profil: 1
        }
      ];

      setState(prev => ({
        ...prev,
        users: mockUsers,
        loading: { ...prev.loading, users: false }
      }));
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, users: false },
        error: error instanceof Error ? error.message : 'Erreur chargement utilisateurs'
      }));
    }
  }, [structure, isAuthenticated]);

  // Charger les transactions
  const loadTransactions = useCallback(async () => {
    if (!structure || !isAuthenticated) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, transactions: true },
      error: null
    }));

    try {
      // TODO: Implémenter l'API pour récupérer les transactions
      // const transactions = await structureService.getTransactions(structure.id_structure);
      
      // Mock data pour le moment
      const mockTransactions = [
        {
          id: '1',
          mois: 'Janvier 2024',
          credits: 15000000,
          debits: 12000000,
          soldeNet: 3000000,
          totalTransactions: 150,
          date: new Date('2024-01-31')
        },
        {
          id: '2',
          mois: 'Février 2024',
          credits: 18000000,
          debits: 14000000,
          soldeNet: 4000000,
          totalTransactions: 180,
          date: new Date('2024-02-29')
        }
      ];

      setState(prev => ({
        ...prev,
        transactions: mockTransactions,
        loading: { ...prev.loading, transactions: false }
      }));
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, transactions: false },
        error: error instanceof Error ? error.message : 'Erreur chargement transactions'
      }));
    }
  }, [structure, isAuthenticated]);

  // Charger toutes les données nécessaires
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadDashboardStats(),
      loadStructureUsers(),
      loadTransactions()
    ]);
  }, [loadDashboardStats, loadStructureUsers, loadTransactions]);

  // Charger les données au montage et quand l'onglet actif change
  useEffect(() => {
    if (isAuthenticated && structure) {
      switch (state.activeTab) {
        case 'dashboard':
          loadDashboardStats();
          break;
        case 'utilisateurs':
          loadStructureUsers();
          break;
        case 'finance':
          loadTransactions();
          break;
        case 'infos':
          // Pas de données supplémentaires nécessaires
          break;
      }
    }
  }, [state.activeTab, isAuthenticated, structure, loadDashboardStats, loadStructureUsers, loadTransactions]);

  // Actions
  const setActiveTab = useCallback((tab: TabId) => {
    setState(prev => ({
      ...prev,
      activeTab: tab
    }));
  }, []);

  const updateFilters = useCallback((filters: Partial<FilterState>) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...filters
      }
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Getters calculés
  const isLoading = Object.values(state.loading).some(loading => loading);
  const hasError = state.error !== null;

  const filteredUsers = state.users.filter(user => {
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      const matchesSearch = 
        user.nom?.toLowerCase().includes(search) ||
        user.prenom?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.telephone?.includes(search);
      if (!matchesSearch) return false;
    }

    if (state.filters.role && user.nom_profil !== state.filters.role) {
      return false;
    }

    if (state.filters.status !== 'all') {
      const isActive = user.actif;
      if (state.filters.status === 'active' && !isActive) return false;
      if (state.filters.status === 'inactive' && isActive) return false;
    }

    return true;
  });

  return {
    // État
    ...state,
    isLoading,
    hasError,
    filteredUsers,
    
    // Actions
    setActiveTab,
    updateFilters,
    clearError,
    refreshData,
    loadAllData,
    loadDashboardStats,
    loadStructureUsers,
    loadTransactions,
    
    // Données calculées
    canManageUsers: permissions?.canManageUsers || false,
    canAccessFinances: permissions?.canAccessFinances || false,
    canExportData: permissions?.canExportData || false,
  };
};

export default useStructureData;