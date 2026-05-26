/**
 * Orchestrateur Onglet Bons de Commande — chargement, filtres, pagination, modals
 *
 * FR-019 : Liste BC + filtres (search/statut/tri) + pagination 10/page
 * + modals création/édition/détails/statut/impression/suppression
 *
 * Couleur thématique : sky/bleu (vs amber/violet proforma)
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import bonCommandeService, {
  BonCommandeApiException,
} from '@/services/bon-commande.service';
import { StatsCardsBonsCommandes } from './StatsCardsBonsCommandes';
import { BonsCommandesList } from './BonsCommandesList';
import { ModalCreerBonCommande } from './ModalCreerBonCommande';
import { ModalBonCommandeDetails } from './ModalBonCommandeDetails';
import { ModalChangerStatutBC } from './ModalChangerStatutBC';
import { ModalImpressionBonCommande } from './ModalImpressionBonCommande';
import { ModalConfirmation } from '@/components/ui/ModalConfirmation';
import { GlassPagination } from '@/components/ui/GlassPagination';
import {
  BonCommande,
  BonCommandeComplete,
  BonCommandeResumeGlobal,
  BonCommandeStatut,
  FiltresBonsCommandes,
} from '@/types/bon-commande';

interface BonsCommandesTabProps {
  canViewMontants?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function BonsCommandesTab({ canViewMontants = true }: BonsCommandesTabProps) {
  const { structure } = useAuth();

  // --- Données ---
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [resume, setResume] = useState<BonCommandeResumeGlobal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Filtres ---
  const [filtres, setFiltres] = useState<FiltresBonsCommandes>({
    search: '',
    statut: 'TOUS',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);

  // --- Modals ---
  const [showCreerModal, setShowCreerModal] = useState(false);
  const [modalEditer, setModalEditer] = useState<{
    isOpen: boolean;
    bc: BonCommande | null;
    details: BonCommandeComplete | null;
  }>({ isOpen: false, bc: null, details: null });

  const [modalDetails, setModalDetails] = useState<{
    isOpen: boolean;
    bc: BonCommande | null;
  }>({ isOpen: false, bc: null });

  const [modalStatut, setModalStatut] = useState<{
    isOpen: boolean;
    bc: BonCommande | null;
  }>({ isOpen: false, bc: null });

  const [modalImpression, setModalImpression] = useState<{
    isOpen: boolean;
    bc: BonCommande | null;
    details: BonCommandeComplete | null;
  }>({ isOpen: false, bc: null, details: null });

  const [modalDelete, setModalDelete] = useState<{
    isOpen: boolean;
    bc: BonCommande | null;
    loading: boolean;
  }>({ isOpen: false, bc: null, loading: false });

  // --- Chargement initial ---
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      const response = await bonCommandeService.getListBonsCommandes(forceRefresh);
      setBonsCommandes(response.bons_commandes || []);
      setResume(response.resume || null);
    } catch (error) {
      const msg =
        error instanceof BonCommandeApiException
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur de chargement';
      console.error('Erreur chargement BC:', error);
      toast.error(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // --- Filtrage local ---
  const filteredBCs = useMemo(() => {
    let result = [...bonsCommandes];

    if (filtres.statut && filtres.statut !== 'TOUS') {
      result = result.filter((bc) => bc.libelle_etat === filtres.statut);
    }

    if (filtres.search) {
      const search = filtres.search.toLowerCase();
      result = result.filter(
        (bc) =>
          bc.num_bc.toLowerCase().includes(search) ||
          (bc.nom_fournisseur_snap?.toLowerCase().includes(search) ?? false) ||
          (bc.tel_fournisseur_snap?.includes(search) ?? false)
      );
    }

    result.sort((a, b) => {
      const order = filtres.sortOrder === 'asc' ? 1 : -1;
      switch (filtres.sortBy) {
        case 'montant':
          return (a.montant_net - b.montant_net) * order;
        case 'fournisseur':
          return (
            (a.nom_fournisseur_snap || '').localeCompare(b.nom_fournisseur_snap || '') * order
          );
        case 'num':
          return a.num_bc.localeCompare(b.num_bc) * order;
        default:
          return (
            (new Date(a.date_creation).getTime() - new Date(b.date_creation).getTime()) * order
          );
      }
    });

    return result;
  }, [bonsCommandes, filtres]);

  const totalPages = Math.ceil(filteredBCs.length / ITEMS_PER_PAGE);
  const paginatedBCs = filteredBCs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // --- Handlers actions ---
  const handleView = (bc: BonCommande) => {
    setModalDetails({ isOpen: true, bc });
  };

  const handleEdit = async (bc: BonCommande) => {
    try {
      const details = await bonCommandeService.getBonCommandeDetails(bc.id_bon_commande);
      setModalEditer({ isOpen: true, bc, details });
    } catch (error) {
      const msg =
        error instanceof BonCommandeApiException
          ? error.message
          : 'Impossible de charger les détails';
      toast.error(msg);
    }
  };

  const handlePrint = async (bc: BonCommande, preloaded?: BonCommandeComplete) => {
    try {
      const details =
        preloaded || (await bonCommandeService.getBonCommandeDetails(bc.id_bon_commande));
      setModalImpression({ isOpen: true, bc, details });
    } catch (error) {
      const msg =
        error instanceof BonCommandeApiException
          ? error.message
          : 'Impossible de charger les détails';
      toast.error(msg);
    }
  };

  const handleChangeStatus = (bc: BonCommande) => {
    setModalStatut({ isOpen: true, bc });
  };

  const handleDelete = (bc: BonCommande) => {
    setModalDelete({ isOpen: true, bc, loading: false });
  };

  const confirmDelete = async () => {
    if (!modalDelete.bc) return;
    setModalDelete((prev) => ({ ...prev, loading: true }));
    try {
      const result = await bonCommandeService.deleteBonCommande(modalDelete.bc.id_bon_commande);
      if (result.success) {
        toast.success(result.message || 'Bon de commande supprimé');
        loadData(true);
      } else {
        toast.error(result.message || 'Erreur suppression');
      }
    } catch (error) {
      const msg =
        error instanceof BonCommandeApiException
          ? error.message
          : 'Impossible de supprimer';
      toast.error(msg);
    } finally {
      setModalDelete({ isOpen: false, bc: null, loading: false });
    }
  };

  const statuts: { value: 'TOUS' | BonCommandeStatut; label: string }[] = [
    { value: 'TOUS', label: 'Tous' },
    { value: 'BROUILLON', label: 'Brouillons' },
    { value: 'CONFIRME', label: 'Confirmés' },
    { value: 'LIVRE', label: 'Livrés' },
    { value: 'ANNULE', label: 'Annulés' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <StatsCardsBonsCommandes
        resume={resume}
        loading={loading}
        canViewMontants={canViewMontants}
      />

      {/* Toolbar : refresh + bouton création */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowCreerModal(true)}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
        >
          <Plus className="w-4 h-4" />
          Nouveau Bon de Commande
        </button>
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          aria-label="Rafraîchir"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 space-y-3">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            value={filtres.search || ''}
            onChange={(e) => {
              setFiltres((f) => ({ ...f, search: e.target.value }));
              setCurrentPage(1);
            }}
            placeholder="Rechercher par numéro, fournisseur, téléphone..."
            className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Filtre statut */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuts.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setFiltres((f) => ({ ...f, statut: s.value }));
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filtres.statut === s.value
                  ? 'bg-sky-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tri */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/60">Trier par :</label>
          <select
            value={filtres.sortBy || 'date'}
            onChange={(e) =>
              setFiltres((f) => ({
                ...f,
                sortBy: e.target.value as FiltresBonsCommandes['sortBy'],
              }))
            }
            className="px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-xs focus:ring-2 focus:ring-sky-500"
          >
            <option value="date" className="text-gray-900">
              Date
            </option>
            <option value="montant" className="text-gray-900">
              Montant
            </option>
            <option value="fournisseur" className="text-gray-900">
              Fournisseur
            </option>
            <option value="num" className="text-gray-900">
              Numéro
            </option>
          </select>
          <button
            onClick={() =>
              setFiltres((f) => ({
                ...f,
                sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc',
              }))
            }
            className="px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-xs hover:bg-white/20 transition-colors"
            title={filtres.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
          >
            {filtres.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Compteur */}
      <p className="text-white/60 text-xs">
        {filteredBCs.length} bon{filteredBCs.length > 1 ? 's' : ''} de commande
        {filtres.statut && filtres.statut !== 'TOUS' && ` (${filtres.statut.toLowerCase()})`}
      </p>

      {/* Liste */}
      <BonsCommandesList
        items={paginatedBCs}
        loading={loading}
        canViewMontants={canViewMontants}
        onView={handleView}
        onEdit={handleEdit}
        onPrint={(bc) => handlePrint(bc)}
        onChangeStatus={handleChangeStatus}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <GlassPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredBCs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal Création */}
      <ModalCreerBonCommande
        isOpen={showCreerModal}
        onClose={() => setShowCreerModal(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Modal Édition */}
      <ModalCreerBonCommande
        isOpen={modalEditer.isOpen}
        onClose={() => setModalEditer({ isOpen: false, bc: null, details: null })}
        onSuccess={() => loadData(true)}
        bonCommandeToEdit={modalEditer.bc}
        bonCommandeDetails={modalEditer.details}
      />

      {/* Modal Détails */}
      <ModalBonCommandeDetails
        isOpen={modalDetails.isOpen}
        onClose={() => setModalDetails({ isOpen: false, bc: null })}
        bonCommande={modalDetails.bc}
        canViewMontants={canViewMontants}
        onEdit={handleEdit}
        onPrint={(bc, details) => {
          setModalDetails({ isOpen: false, bc: null });
          setModalImpression({ isOpen: true, bc, details });
        }}
        onChangeStatus={handleChangeStatus}
        onDelete={handleDelete}
      />

      {/* Modal Changement Statut */}
      {modalStatut.bc && (
        <ModalChangerStatutBC
          isOpen={modalStatut.isOpen}
          onClose={() => setModalStatut({ isOpen: false, bc: null })}
          bonCommande={modalStatut.bc}
          onSuccess={() => loadData(true)}
        />
      )}

      {/* Modal Impression */}
      {modalImpression.bc && modalImpression.details && (
        <ModalImpressionBonCommande
          isOpen={modalImpression.isOpen}
          onClose={() =>
            setModalImpression({ isOpen: false, bc: null, details: null })
          }
          bonCommande={modalImpression.bc}
          details={modalImpression.details.bon_commande.articles || []}
          fournisseur={modalImpression.details.bon_commande.fournisseur}
          configFacture={structure?.config_facture}
          infoFacture={structure?.info_facture}
          logo={structure?.logo}
          nomStructure={structure?.nom_structure || ''}
        />
      )}

      {/* Modal Confirmation Suppression */}
      <ModalConfirmation
        isOpen={modalDelete.isOpen}
        onClose={() => setModalDelete({ isOpen: false, bc: null, loading: false })}
        onConfirm={confirmDelete}
        title="Supprimer le bon de commande"
        message={`Êtes-vous sûr de vouloir supprimer le bon de commande ${modalDelete.bc?.num_bc} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        type="danger"
        loading={modalDelete.loading}
      />
    </div>
  );
}
