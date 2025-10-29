/**
 * Composant de gestion des utilisateurs
 * Affiche et permet l'édition des utilisateurs d'une structure
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Phone, Shield, Edit3, X, Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
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
  statut?: 'ACTIF' | 'DESACTIVE';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    telephone: '',
    id_profil: 9 // ID profil caissier
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; username: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      id_profil: userData.profil.id_profil,
      statut: userData.statut || 'ACTIF'
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

  // Ouvrir le modal d'ajout
  const handleOpenAddModal = () => {
    setNewUser({
      username: '',
      telephone: '',
      id_profil: 9
    });
    setShowAddModal(true);
  };

  // Ajouter un nouveau caissier
  const handleAddUser = async () => {
    if (!user?.id_structure || !newUser.username.trim() || !newUser.telephone.trim()) {
      onShowMessage?.('Veuillez remplir tous les champs', 'error');
      return;
    }

    // Validation du téléphone (9 chiffres, commence par 7)
    if (!/^7\d{8}$/.test(newUser.telephone)) {
      onShowMessage?.('Le téléphone doit contenir 9 chiffres et commencer par 7', 'error');
      return;
    }

    try {
      setIsSaving(true);

      await UsersService.addEditUtilisateur({
        id_structure: user.id_structure,
        id_profil: newUser.id_profil,
        username: newUser.username,
        telephone: newUser.telephone
        // Pas d'id_user pour un nouvel utilisateur
      });

      onShowMessage?.('Caissier ajouté avec succès', 'success');
      setShowAddModal(false);
      setNewUser({ username: '', telephone: '', id_profil: 9 });
      loadUsers(); // Recharger la liste

    } catch (error) {
      console.error('Erreur ajout utilisateur:', error);
      onShowMessage?.(
        error instanceof Error ? error.message : 'Erreur lors de l\'ajout',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Annuler l'ajout
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setNewUser({ username: '', telephone: '', id_profil: 9 });
  };

  // Ouvrir la modal de confirmation de suppression
  const handleOpenDeleteModal = (userData: UtilisateurData) => {
    setUserToDelete({
      id: userData.id,
      username: userData.username
    });
    setShowDeleteModal(true);
  };

  // Supprimer le caissier
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);

      const result = await UsersService.deleteCaissier(userToDelete.id);

      onShowMessage?.(
        `Caissier "${userToDelete.username}" supprimé avec succès`,
        'success'
      );

      setShowDeleteModal(false);
      setUserToDelete(null);
      loadUsers(); // Recharger la liste

    } catch (error) {
      console.error('Erreur suppression caissier:', error);
      onShowMessage?.(
        error instanceof Error ? error.message : 'Erreur lors de la suppression',
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Annuler la suppression
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
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

  // Séparer admin et caissiers
  const adminUser = users.find(u => isAdmin(u));
  const caissiers = users.filter(u => !isAdmin(u));
  const MAX_CAISSIERS = 2;
  const limiteAtteinte = caissiers.length >= MAX_CAISSIERS;

  return (
    <div className="space-y-4">
      {/* Header avec icône */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-t-2xl flex items-center gap-3">
        <Users className="h-6 w-6 text-white" />
        <h2 className="text-xl font-bold text-white">Utilisateurs</h2>
      </div>

      {/* Bouton Ajouter Caissier */}
      <button
        onClick={handleOpenAddModal}
        disabled={limiteAtteinte}
        className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-3 ${
          limiteAtteinte
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg'
        }`}
      >
        <Users className="h-5 w-5" />
        {limiteAtteinte
          ? `${caissiers.length}/${MAX_CAISSIERS} caissiers ajoutés`
          : `Ajouter un caissier (${caissiers.length}/${MAX_CAISSIERS})`
        }
      </button>

      {/* Bandeau limite atteinte */}
      {limiteAtteinte && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">
              Limite maximale atteinte
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Vous avez atteint la limite de {MAX_CAISSIERS} caissiers. Pour en ajouter un nouveau, vous devez d'abord supprimer un caissier existant.
            </p>
          </div>
        </div>
      )}

      {/* Administrateur Principal */}
      {adminUser && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {getUserInitials(adminUser.username)}
            </div>

            {/* Informations */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">{adminUser.username}</h3>
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded">
                  Principal
                </span>
              </div>
              <p className="text-sm font-medium text-gray-700 uppercase mb-2">
                {adminUser.profil.nom_profil}
              </p>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✉️</span>
                  <span>{adminUser.telephone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-green-600" />
                  <span>{adminUser.telephone}</span>
                </div>
                <p className="text-xs text-gray-500">Créé le {formatUserDate(adminUser.user_createdat)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Liste des Caissiers */}
      {caissiers.map((userData, index) => {
        const initials = getUserInitials(userData.username);
        const formattedDate = formatUserDate(userData.user_createdat);

        return (
          <motion.div
            key={userData.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 1) * 0.1 }}
            className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {initials}
              </div>

              {/* Informations */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{userData.username}</h3>
                  {userData.statut === 'DESACTIVE' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      Désactivé
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700 uppercase mb-2">
                  {userData.profil.nom_profil}
                </p>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">✉️</span>
                    <span>{userData.telephone}@sylviacom.fay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    <span>{userData.telephone}</span>
                  </div>
                  <p className="text-xs text-gray-500">Créé le {formattedDate}</p>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEditUser(userData)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier l'utilisateur"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleOpenDeleteModal(userData)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer le caissier"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
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
                      placeholder="Ex: MLOLO"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Login (email) - Généré automatiquement */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Login (email) <span className="text-xs text-gray-500 font-normal">(généré automatiquement)</span>
                    </label>
                    <div className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 flex items-center gap-2">
                      <span>✉️</span>
                      <span className="text-sm">{editingUser.telephone}@sylviacom.fay</span>
                    </div>
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      Le login est généré automatiquement et ne peut pas être modifié
                    </p>
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
                      placeholder="Ex: 777301221"
                      maxLength={9}
                      disabled={isSaving}
                    />
                  </div>

                  {/* État du compte avec toggle */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      État du compte
                    </label>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <span className="text-sm font-medium text-gray-700">
                        Compte {editingUser.statut === 'ACTIF' ? 'actif' : 'désactivé'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingUser({
                            ...editingUser,
                            statut: editingUser.statut === 'ACTIF' ? 'DESACTIVE' : 'ACTIF'
                          })
                        }
                        disabled={isSaving}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          editingUser.statut === 'ACTIF'
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            editingUser.statut === 'ACTIF' ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
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

        {/* Modal d'ajout de caissier */}
        {showAddModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop-add"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleCancelAdd}
            />

            {/* Modal */}
            <motion.div
              key="modal-add"
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
                    Ajouter un caissier
                  </h2>
                  <button
                    onClick={handleCancelAdd}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Info limite */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note :</strong> Vous pouvez ajouter jusqu&apos;à {MAX_CAISSIERS} caissiers ({caissiers.length}/{MAX_CAISSIERS} utilisés)
                  </p>
                </div>

                {/* Formulaire */}
                <div className="space-y-4">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) =>
                        setNewUser({ ...newUser, username: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      placeholder="Ex: Fatou Diop"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newUser.telephone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setNewUser({ ...newUser, telephone: value });
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      placeholder="Ex: 771234567"
                      maxLength={9}
                      disabled={isSaving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format : 9 chiffres commençant par 7
                    </p>
                  </div>

                  {/* Login généré (info) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Login (email) <span className="text-xs text-gray-500 font-normal">(généré automatiquement)</span>
                    </label>
                    <div className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 flex items-center gap-2">
                      <span>✉️</span>
                      <span className="text-sm">
                        {newUser.telephone ? `${newUser.telephone}@sylviacom.fay` : 'téléphone@sylviacom.fay'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <span>ℹ️</span>
                      Le login sera généré à partir du numéro de téléphone
                    </p>
                  </div>

                  {/* Profil (fixe à Caissier) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Profil
                    </label>
                    <div className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-medium">
                      Caissier
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCancelAdd}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddUser}
                    disabled={isSaving || !newUser.username.trim() || !newUser.telephone.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ajout...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && userToDelete && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop-delete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleCancelDelete}
            />

            {/* Modal */}
            <motion.div
              key="modal-delete"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header avec icône d'avertissement */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 text-center">
                    Supprimer le caissier ?
                  </h2>
                </div>

                {/* Message de confirmation */}
                <div className="mb-6 space-y-3">
                  <p className="text-center text-gray-700">
                    Êtes-vous sûr de vouloir supprimer le caissier :
                  </p>
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <p className="text-center font-bold text-red-900 text-lg">
                      {userToDelete.username}
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Attention :</strong> Cette action est irréversible.
                        Toutes les données associées à cet utilisateur seront définitivement supprimées.
                      </span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Supprimer
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