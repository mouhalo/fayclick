'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import depenseService from '@/services/depense.service';
import type { DepensesData, Depense, DepenseFormData } from '@/types/depense.types';

import DepensesHeader from '@/components/depenses/DepensesHeader';
import DepensesStatCards from '@/components/depenses/DepensesStatCards';
import DepensesSearchBar from '@/components/depenses/DepensesSearchBar';
import DepensesPagination from '@/components/depenses/DepensesPagination';
import DepensesList from '@/components/depenses/DepensesList';
import AddEditDepenseModal from '@/components/depenses/AddEditDepenseModal';
import DeleteDepenseModal from '@/components/depenses/DeleteDepenseModal';
import GererTypesModal from '@/components/depenses/GererTypesModal';
import { Plus, Settings } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

/**
 * Page principale de Gestion des Dépenses
 * Module FayClick V2
 */
export default function DepensesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DepensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États des modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);
  const [selectedDepense, setSelectedDepense] = useState<Depense | null>(null);

  // États de recherche et pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Charger les données
  useEffect(() => {
    if (user?.id_structure) {
      chargerDepenses();
    }
  }, [user]);

  const chargerDepenses = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id_structure) {
        throw new Error('Structure non identifiée');
      }

      console.log('🔄 [DepensesPage] Chargement dépenses:', {
        id_structure: user.id_structure
      });

      const result = await depenseService.getListeDepenses(
        user.id_structure,
        new Date().getFullYear(),
        'annee'
      );

      console.log('✅ [DepensesPage] Données reçues:', result);
      setData(result);
    } catch (err: any) {
      console.error('❌ [DepensesPage] Erreur chargement dépenses:', err);
      setError(err.message || 'Impossible de charger les dépenses');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les dépenses par recherche
  const depensesFiltrees = useMemo(() => {
    if (!data?.liste_depenses) return [];

    if (!searchQuery) return data.liste_depenses;

    const query = searchQuery.toLowerCase();
    return data.liste_depenses.filter((depense) =>
      depense.nom_type.toLowerCase().includes(query) ||
      depense.description.toLowerCase().includes(query) ||
      depense.montant.toString().includes(query)
    );
  }, [data, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(depensesFiltrees.length / ITEMS_PER_PAGE);
  const depensesPaginees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return depensesFiltrees.slice(start, start + ITEMS_PER_PAGE);
  }, [depensesFiltrees, currentPage]);

  // Handlers
  const handleAjouterDepense = () => {
    setSelectedDepense(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditerDepense = (depense: Depense) => {
    setSelectedDepense(depense);
    setIsAddEditModalOpen(true);
  };

  const handleSupprimerDepense = (depense: Depense) => {
    setSelectedDepense(depense);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitDepense = async (formData: DepenseFormData, depenseId?: number) => {
    try {
      if (!user?.id_structure) return;

      if (depenseId) {
        await depenseService.modifierDepense(user.id_structure, depenseId, formData);
      } else {
        await depenseService.ajouterDepense(user.id_structure, formData);
      }
      await chargerDepenses();
      setIsAddEditModalOpen(false);
    } catch (error) {
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDepense || !user?.id_structure) return;

    try {
      await depenseService.supprimerDepense(
        user.id_structure,
        selectedDepense.id_depense
      );
      await chargerDepenses();
      setIsDeleteModalOpen(false);
      setSelectedDepense(null);
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  // Écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DepensesHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des dépenses...</p>
          </div>
        </div>
      </div>
    );
  }

  // Écran d'erreur
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DepensesHeader />
        <div className="p-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-2">Erreur de chargement</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button
              onClick={chargerDepenses}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <DepensesHeader />

      <DepensesStatCards
        resume={data.resume_depenses}
        typesDepenses={data.depenses_par_type}
      />

      <DepensesSearchBar
        onSearch={setSearchQuery}
        onRefresh={chargerDepenses}
        isLoading={loading}
      />

      <DepensesPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={depensesFiltrees.length}
      />

      <DepensesList
        depenses={depensesPaginees}
        onEdit={handleEditerDepense}
        onDelete={handleSupprimerDepense}
      />

      {/* Boutons d'action flottants */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => setIsTypesModalOpen(true)}
          className="bg-gray-600 text-white p-4 rounded-full shadow-lg hover:bg-gray-700 transition"
          title="Gérer les types"
        >
          <Settings size={24} />
        </button>
        <button
          onClick={handleAjouterDepense}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
          title="Nouvelle dépense"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Modals */}
      <AddEditDepenseModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onSubmit={handleSubmitDepense}
        depense={selectedDepense}
        typesDepenses={data.depenses_par_type}
      />

      <DeleteDepenseModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        depense={selectedDepense}
      />

      <GererTypesModal
        isOpen={isTypesModalOpen}
        onClose={() => setIsTypesModalOpen(false)}
        structureId={user!.id_structure}
        onTypesUpdated={chargerDepenses}
        typesDepenses={data.depenses_par_type}
      />
    </div>
  );
}
