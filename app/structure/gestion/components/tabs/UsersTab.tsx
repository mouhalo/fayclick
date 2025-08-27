'use client';

import React, { useState, useEffect } from 'react';
import { TabContentProps, UserCardData, UserActionType, UserFormData } from '../../types/structure-page';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/types/auth';
import UserCard from '../ui/UserCard';
import useStructureData from '../../hooks/useStructureData';

const UsersTab: React.FC<TabContentProps> = ({ isActive, structure }) => {
  const { isMobile } = useBreakpoint();
  const { permissions } = useAuth();
  const { filteredUsers, updateFilters, filters, loadStructureUsers } = useStructureData();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserCardData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Données mockées pour les utilisateurs
  const mockUsers: UserCardData[] = [
    {
      id: '1',
      name: 'Admin ISMTHIES',
      role: 'ADMIN',
      email: 'admin@ismthies.edu.sn',
      phone: '221771234567',
      structureType: 'SCOLAIRE',
      structureName: 'ISMTHIES',
      isActive: true,
      permissions: [Permission.ADMIN_FULL_ACCESS],
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date('2024-01-27')
    },
    {
      id: '2',
      name: 'Comptable Structure',
      role: 'COMPTABLE',
      email: 'comptable@ismthies.edu.sn',
      phone: '221779876543',
      structureType: 'SCOLAIRE',
      structureName: 'ISMTHIES',
      isActive: true,
      permissions: [Permission.ACCESS_FINANCES, Permission.VIEW_DASHBOARD],
      createdAt: new Date('2024-01-20'),
      lastLogin: new Date('2024-01-26')
    },
    {
      id: '3',
      name: 'Assistant Pédagogique',
      role: 'ASSISTANT',
      email: 'assistant@ismthies.edu.sn',
      phone: '221765432109',
      structureType: 'SCOLAIRE',
      structureName: 'ISMTHIES',
      isActive: false,
      permissions: [Permission.VIEW_DASHBOARD, Permission.MANAGE_STUDENTS],
      createdAt: new Date('2024-01-10'),
      lastLogin: new Date('2024-01-22')
    }
  ];

  useEffect(() => {
    if (isActive) {
      loadStructureUsers();
    }
  }, [isActive, loadStructureUsers]);

  if (!isActive) return null;

  const canManageUsers = permissions?.canManageUsers || false;
  const canCreateUser = canManageUsers;
  
  const handleUserAction = async (action: UserActionType) => {
    switch (action.type) {
      case 'edit':
        setEditingUser(action.user);
        break;
        
      case 'activate':
      case 'deactivate':
        // TODO: Implémenter l'activation/désactivation
        console.log(`${action.type} user:`, action.user.id);
        break;
        
      case 'permissions':
        // TODO: Ouvrir modal de gestion des permissions
        console.log('Manage permissions for user:', action.user.id);
        break;
        
      case 'delete':
        setShowDeleteConfirm(action.user.id);
        break;
    }
  };

  const handleCreateUser = (userData: UserFormData) => {
    // TODO: Implémenter la création d'utilisateur
    console.log('Create user:', userData);
    setShowCreateModal(false);
  };

  const handleUpdateUser = (userData: UserFormData) => {
    // TODO: Implémenter la mise à jour d'utilisateur
    console.log('Update user:', editingUser?.id, userData);
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    // TODO: Implémenter la suppression d'utilisateur
    console.log('Delete user:', userId);
    setShowDeleteConfirm(null);
  };

  const renderFilters = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
          <input
            type="text"
            placeholder="Nom, email, téléphone..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
          <select
            value={filters.role}
            onChange={(e) => updateFilters({ role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les rôles</option>
            <option value="ADMIN">Admin</option>
            <option value="GERANT">Gérant</option>
            <option value="COMPTABLE">Comptable</option>
            <option value="ASSISTANT">Assistant</option>
            <option value="SURVEILLANT">Surveillant</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={() => updateFilters({ search: '', role: '', status: 'all' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsersGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Utiliser les données mockées pour le moment */}
      {mockUsers.filter(user => {
        if (filters.search) {
          const search = filters.search.toLowerCase();
          const matchesSearch = 
            user.name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            user.phone.includes(search);
          if (!matchesSearch) return false;
        }

        if (filters.role && user.role !== filters.role) {
          return false;
        }

        if (filters.status !== 'all') {
          const isActive = user.isActive;
          if (filters.status === 'active' && !isActive) return false;
          if (filters.status === 'inactive' && isActive) return false;
        }

        return true;
      }).map(user => (
        <UserCard
          key={user.id}
          user={user}
          onAction={handleUserAction}
        />
      ))}
      
      {/* Carte d'ajout d'utilisateur */}
      {canCreateUser && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 lg:p-8 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
        >
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 group-hover:text-blue-600">
              Nouveau utilisateur
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Ajouter un membre à votre équipe
            </p>
          </div>
        </button>
      )}
    </div>
  );

  const renderStats = () => {
    const totalUsers = mockUsers.length;
    const activeUsers = mockUsers.filter(u => u.isActive).length;
    const adminUsers = mockUsers.filter(u => u.role === 'ADMIN').length;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Utilisateurs</p>
              <p className="text-2xl font-semibold text-blue-900">{totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Utilisateurs Actifs</p>
              <p className="text-2xl font-semibold text-green-900">{activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Administrateurs</p>
              <p className="text-2xl font-semibold text-purple-900">{adminUsers}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gestion des Utilisateurs
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les membres de votre équipe et leurs permissions
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter
          </button>
          
          {canCreateUser && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouvel utilisateur
            </button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      {renderStats()}

      {/* Filtres */}
      {renderFilters()}

      {/* Grille des utilisateurs */}
      {renderUsersGrid()}

      {/* États vides */}
      {mockUsers.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun utilisateur</h3>
          <p className="mt-2 text-gray-600">
            Commencez par ajouter des membres à votre équipe.
          </p>
          {canCreateUser && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Ajouter le premier utilisateur
            </button>
          )}
        </div>
      )}

      {/* Confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;