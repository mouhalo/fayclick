/**
 * Composant de gestion des utilisateurs
 * Affiche et permet l'édition des utilisateurs d'une structure
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Phone, Shield, Edit3, X, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHasRight } from '@/hooks/useRights';
import UsersService from '@/services/users.service';
import {
  UtilisateurData,
  isAdmin,
  getUserInitials,
  formatUserDate
} from '@/types/users';

interface EditingUser {
  id: number;
  username: string;
  telephone: string;
  id_profil: number;
}

interface UsersManagementProps {
  onShowMessage?: (message: string, type: 'success' | 'error') => void;
}

export default function UsersManagement({ onShowMessage }: UsersManagementProps) {
  const { user } = useAuth();
  const canManageUsers = useHasRight("GESTION DES UTILISATEURS");

  const [users, setUsers] = useState<UtilisateurData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Récupération des utilisateurs
  const loadUsers = useCallback(async () => {
    if (!user?.id_structure) return;

    try {
      setIsLoading(true);
      const response = await UsersService.getListUtilisateurs(user.id_structure);

      console.log('🔍 [USERS MANAGEMENT] Données reçues du service:', {
        total: response.total_utilisateurs,
        dataLength: response.data.length,
        users: response.data.map(u => ({
          id: u.id,
          username: u.username,
          profil: u.profil.nom_profil,
          id_profil: u.profil.id_profil
        }))
      });

      setUsers(response.data);

      console.log('✅ [USERS MANAGEMENT] State users mis à jour avec', response.data.length, 'utilisateurs');
    } catch (error) {
      console.error('❌ [USERS MANAGEMENT] Erreur chargement utilisateurs:', error);
      onShowMessage?.(
        'Impossible de charger les utilisateurs',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id_structure, onShowMessage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Ouvrir le modal d'édition
  const handleEditUser = (userData: UtilisateurData) => {
    if (isAdmin(userData)) {
      onShowMessage?.('L\'utilisateur admin ne peut pas être modifié', 'error');
      return;
    }

    setEditingUser({
      id: userData.id,
      username: userData.username,
      telephone: userData.telephone,
      id_profil: userData.profil.id_profil
    });
    setShowEditModal(true);
  };

  // Sauvegarder les modifications
  const handleSaveUser = async () => {
    if (!editingUser || !user?.id_structure) return;

    try {
      setIsSaving(true);

      await UsersService.addEditUtilisateur({
        id_structure: user.id_structure,
        id_profil: editingUser.id_profil,
        username: editingUser.username,
        telephone: editingUser.telephone,
        id_user: editingUser.id
      });

      onShowMessage?.('Utilisateur modifié avec succès', 'success');
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers(); // Recharger la liste

    } catch (error) {
      console.error('Erreur sauvegarde utilisateur:', error);
      onShowMessage?.(
        error instanceof Error ? error.message : 'Erreur lors de la sauvegarde',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  if (!canManageUsers) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">
          Vous n&apos;avez pas les droits pour gérer les utilisateurs
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
        <span className="ml-3 text-gray-600 font-medium">Chargement des utilisateurs...</span>
      </div>
    );
  }

  console.log('🎨 [USERS MANAGEMENT] Rendu de', users.length, 'utilisateurs:', users.map(u => u.username));

  return (
    <div className="space-y-6">
      {/* Liste des utilisateurs */}
      {users.map((userData, index) => {
        const userIsAdmin = isAdmin(userData);
        const initials = getUserInitials(userData.username);
        const formattedDate = formatUserDate(userData.user_createdat);

        console.log(`👤 [RENDER] User ${index + 1}:`, {
          id: userData.id,
          username: userData.username,
          profil: userData.profil.nom_profil,
          isAdmin: userIsAdmin
        });

        return (
          <motion.div
            key={userData.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border-2 ${
              userIsAdmin
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
            } transition-all duration-200`}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  userIsAdmin
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}
              >
                {initials}
              </div>

              {/* Informations */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{userData.username}</h3>
                  {userIsAdmin && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-600">
                  {userData.profil.nom_profil}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {userData.telephone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {userData.fonctionnalites.filter(f => f.autorise).length} droits
                  </span>
                  <span className="text-xs">Créé le {formattedDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!userIsAdmin && (
                  <button
                    onClick={() => handleEditUser(userData)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier l'utilisateur"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Message si aucun utilisateur */}
      {users.length === 0 && (
        <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Aucun utilisateur trouvé</p>
        </div>
      )}

      {/* Modal d'édition */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleCancelEdit}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Modifier l&apos;utilisateur
                  </h2>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Formulaire */}
                <div className="space-y-4">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, username: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                      placeholder="Ex: Abdou Diallo"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={editingUser.telephone}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, telephone: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                      placeholder="Ex: 77 123 45 67"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveUser}
                    disabled={isSaving || !editingUser.username.trim() || !editingUser.telephone.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}