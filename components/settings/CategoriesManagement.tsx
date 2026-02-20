/**
 * Composant de gestion des catégories de produits/services
 * Affiche la liste des catégories et permet CRUD complet
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Edit3, Trash2, X, Save, Loader2, AlertTriangle, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import categorieService from '@/services/categorie.service';

interface CategoriesManagementProps {
  onShowMessage?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function CategoriesManagement({ onShowMessage }: CategoriesManagementProps) {
  const { user } = useAuth();

  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal ajout
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategorie, setNewCategorie] = useState('');

  // Modal édition
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCategorie, setEditCategorie] = useState('');
  const [editOriginalName, setEditOriginalName] = useState('');

  // Modal suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCategorie, setDeleteCategorie] = useState('');

  // Charger les catégories
  const loadCategories = useCallback(async () => {
    if (!user?.id_structure) return;

    try {
      setIsLoading(true);
      const response = await categorieService.getListeCategories(user.id_structure);

      if (response.success && response.categories) {
        setCategories(response.categories.map(c => c.nom_categorie));
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id_structure]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Ajouter une catégorie
  const handleAdd = async () => {
    if (!user?.id_structure || !newCategorie.trim()) return;

    setIsSaving(true);
    try {
      const response = await categorieService.ajouterCategorie(user.id_structure, newCategorie.trim());

      if (response.success) {
        if (response.action === 'EXISTS') {
          onShowMessage?.('Cette catégorie existe déjà', 'warning');
        } else {
          onShowMessage?.('Catégorie ajoutée avec succès', 'success');
        }
        setShowAddModal(false);
        setNewCategorie('');
        await loadCategories();
      } else {
        const errorMsg = response.error_code === 'DUPLICATE_NAME'
          ? 'Cette catégorie existe déjà'
          : response.error || 'Erreur lors de l\'ajout';
        onShowMessage?.(errorMsg, 'error');
      }
    } catch (error) {
      onShowMessage?.('Erreur lors de l\'ajout de la catégorie', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Modifier une catégorie
  const handleEdit = async () => {
    if (!user?.id_structure || !editCategorie.trim() || !editOriginalName) return;

    if (editCategorie.trim() === editOriginalName) {
      setShowEditModal(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await categorieService.modifierCategorie(
        user.id_structure,
        editOriginalName,
        editCategorie.trim()
      );

      if (response.success) {
        onShowMessage?.('Catégorie modifiée avec succès', 'success');
        setShowEditModal(false);
        setEditCategorie('');
        setEditOriginalName('');
        await loadCategories();
      } else {
        const errorMsg = response.error_code === 'DUPLICATE_NAME'
          ? 'Ce nom de catégorie existe déjà'
          : response.error || 'Erreur lors de la modification';
        onShowMessage?.(errorMsg, 'error');
      }
    } catch (error) {
      onShowMessage?.('Erreur lors de la modification de la catégorie', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer une catégorie
  const handleDelete = async () => {
    if (!user?.id_structure || !deleteCategorie) return;

    setIsDeleting(true);
    try {
      const response = await categorieService.supprimerCategorie(user.id_structure, deleteCategorie);

      if (response.success) {
        onShowMessage?.('Catégorie supprimée avec succès', 'success');
        setShowDeleteModal(false);
        setDeleteCategorie('');
        await loadCategories();
      } else {
        const errorMsg = response.error_code === 'FOREIGN_KEY_VIOLATION'
          ? 'Impossible de supprimer : des produits utilisent cette catégorie'
          : response.error || 'Erreur lors de la suppression';
        onShowMessage?.(errorMsg, 'error');
      }
    } catch (error) {
      onShowMessage?.('Erreur lors de la suppression de la catégorie', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Ouvrir modal édition
  const openEditModal = (nom: string) => {
    setEditOriginalName(nom);
    setEditCategorie(nom);
    setShowEditModal(true);
  };

  // Ouvrir modal suppression
  const openDeleteModal = (nom: string) => {
    setDeleteCategorie(nom);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header avec compteur */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
            <Tag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Catégories</h3>
            <p className="text-sm text-gray-500">{categories.length} catégorie{categories.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setNewCategorie(''); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Liste des catégories */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
      ) : categories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">Aucune catégorie</p>
          <p className="text-gray-400 text-sm">Ajoutez votre première catégorie pour organiser vos produits</p>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          {categories.map((cat, index) => (
            <motion.div
              key={cat}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Tag className="h-4 w-4 text-orange-600" />
                </div>
                <span className="font-medium text-gray-800">{cat}</span>
                <span className="text-xs text-gray-400">{cat.length}/25</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(cat)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Modifier"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openDeleteModal(cat)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Ajout */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-orange-500" />
                  Nouvelle catégorie
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la catégorie
                </label>
                <input
                  type="text"
                  value={newCategorie}
                  onChange={(e) => setNewCategorie(e.target.value)}
                  maxLength={25}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Ex: Électronique, Alimentation..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategorie.trim()) handleAdd();
                  }}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{newCategorie.length}/25</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newCategorie.trim() || isSaving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Édition */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-blue-500" />
                  Modifier la catégorie
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau nom
                </label>
                <input
                  type="text"
                  value={editCategorie}
                  onChange={(e) => setEditCategorie(e.target.value)}
                  maxLength={25}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editCategorie.trim()) handleEdit();
                  }}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{editCategorie.length}/25</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEdit}
                  disabled={!editCategorie.trim() || isSaving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer la catégorie ?</h3>
                <p className="text-gray-600">
                  Voulez-vous vraiment supprimer la catégorie <strong>&quot;{deleteCategorie}&quot;</strong> ?
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Cette action est irréversible. Si des produits utilisent cette catégorie, la suppression sera refusée.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
