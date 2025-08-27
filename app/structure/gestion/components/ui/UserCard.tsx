'use client';

import React, { useState } from 'react';
import { UserCardData, UserActionType } from '../../types/structure-page';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatDate } from '@/utils/formatters';

interface UserCardProps {
  user: UserCardData;
  onAction: (action: UserActionType) => void;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({ user, onAction, className = '' }) => {
  const { isMobile } = useBreakpoint();
  const [showActions, setShowActions] = useState(false);

  const handleActionClick = (actionType: UserActionType['type'], e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(false);
    onAction({ type: actionType, user });
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'GERANT': 'bg-green-100 text-green-800',
      'ASSISTANT': 'bg-yellow-100 text-yellow-800',
      'COMPTABLE': 'bg-purple-100 text-purple-800',
      'SURVEILLANT': 'bg-gray-100 text-gray-800',
      'USER': 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`
      bg-blue-50 rounded-xl p-4 lg:p-6 border border-blue-100 
      hover:shadow-lg transition-all duration-300 hover:bg-blue-100
      relative ${className}
    `}>
      {/* Header avec avatar et info principale */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {getAvatarFallback(user.name)}
              </div>
            )}
            
            {/* Indicateur de statut */}
            <div className={`
              w-3 h-3 rounded-full border-2 border-white shadow-sm absolute mt-8 ml-8
              ${user.isActive ? 'bg-green-400' : 'bg-gray-400'}
            `} />
          </div>

          {/* Info utilisateur */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {user.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${getRoleColor(user.role)}
              `}>
                {user.role}
              </span>
              <span className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${user.isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
                }
              `}>
                {user.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Menu dropdown */}
          {showActions && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
              <button
                onClick={(e) => handleActionClick('edit', e)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
              
              <button
                onClick={(e) => handleActionClick('permissions', e)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Permissions
              </button>
              
              <button
                onClick={(e) => handleActionClick(user.isActive ? 'deactivate' : 'activate', e)}
                className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 ${
                  user.isActive ? 'text-red-700' : 'text-green-700'
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {user.isActive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                {user.isActive ? 'Désactiver' : 'Activer'}
              </button>
              
              <hr className="my-1" />
              
              <button
                onClick={(e) => handleActionClick('delete', e)}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Informations de contact */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{user.email}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>{user.phone}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="truncate">{user.structureType} - {user.structureName}</span>
        </div>
      </div>

      {/* Informations supplémentaires */}
      <div className="border-t border-blue-200 pt-3 space-y-2">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Créé le:</span>
          <span>{formatDate(user.createdAt.toISOString())}</span>
        </div>
        
        {user.lastLogin && (
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Dernière connexion:</span>
            <span>{formatDate(user.lastLogin.toISOString())}</span>
          </div>
        )}
      </div>

      {/* Click overlay pour fermer le menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
};

export default UserCard;