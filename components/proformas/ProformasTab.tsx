/**
 * Onglet Proformas — liste, filtres, stats + actions (détails, modifier, imprimer, convertir, supprimer)
 * La création de proforma se fait depuis le panier (PanierSidePanel checkbox "Proforma")
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { proformaService } from '@/services/proforma.service';
import { StatsCardsProformas } from './StatsCardsProformas';
import { ProformasList } from './ProformasList';
import { ModalCreerProforma } from './ModalCreerProforma';
import { ModalProformaDetails } from './ModalProformaDetails';
import { ModalConvertirProforma } from './ModalConvertirProforma';
import { ModalImpressionProforma } from './ModalImpressionProforma';
import { ModalConfirmation } from '@/components/ui/ModalConfirmation';
import { useToast } from '@/components/ui/Toast';
import { GlassPagination } from '@/components/ui/GlassPagination';
import {
  Proforma,
  ProformaResumeGlobal,
  FiltresProformas,
  ProformaStatut,
  ProformaDetail,
  ConvertProformaResponse,
} from '@/types/proforma';

interface ProformasTabProps {
  canViewMontants?: boolean;
}

export function ProformasTab({ canViewMontants = true }: ProformasTabProps) {
  const { structure } = useAuth();
  const { showToast } = useToast();

  // --- Données proformas ---
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [resume, setResume] = useState<ProformaResumeGlobal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Filtres proformas ---
  const [filtres, setFiltres] = useState<FiltresProformas>({
    search: '',
    statut: 'TOUS',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- Modals ---
  const [modalDetails, setModalDetails] = useState<{ isOpen: boolean; proforma: Proforma | null }>({ isOpen: false, proforma: null });
  const [modalConvertir, setModalConvertir] = useState<{ isOpen: boolean; proforma: Proforma | null }>({ isOpen: false, proforma: null });
  const [modalSupprimer, setModalSupprimer] = useState<{ isOpen: boolean; proforma: Proforma | null }>({ isOpen: false, proforma: null });
  const [modalEditer, setModalEditer] = useState<{ isOpen: boolean; proforma: Proforma | null; details: ProformaDetail[] }>({ isOpen: false, proforma: null, details: [] });
  const [modalImprimer, setModalImprimer] = useState<{ isOpen: boolean; proforma: Proforma | null; details: ProformaDetail[] }>({ isOpen: false, proforma: null, details: [] });

  // --- Chargement proformas ---
  useEffect(() => {
    loadProformas();
  }, []);

  const loadProformas = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      const response = await proformaService.getListProformas(forceRefresh);
      setProformas(response.proformas || []);
      setResume(response.resume || null);
    } catch (error) {
      console.error('Erreur chargement proformas:', error);
      showToast('error', 'Erreur', 'Impossible de charger les proformas');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // --- Filtrage local ---
  const filteredProformas = useMemo(() => {
    let result = [...proformas];

    if (filtres.statut && filtres.statut !== 'TOUS') {
      result = result.filter(p => p.libelle_etat === filtres.statut);
    }

    if (filtres.search) {
      const search = filtres.search.toLowerCase();
      result = result.filter(p =>
        p.num_proforma.toLowerCase().includes(search) ||
        p.nom_client.toLowerCase().includes(search) ||
        p.tel_client.includes(search)
      );
    }

    result.sort((a, b) => {
      const order = filtres.sortOrder === 'asc' ? 1 : -1;
      switch (filtres.sortBy) {
        case 'montant': return (a.montant_net - b.montant_net) * order;
        case 'client': return a.nom_client.localeCompare(b.nom_client) * order;
        default: return (new Date(a.date_creation).getTime() - new Date(b.date_creation).getTime()) * order;
      }
    });

    return result;
  }, [proformas, filtres]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredProformas.length / ITEMS_PER_PAGE);
  const paginatedProformas = filteredProformas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // --- Handlers actions proformas ---
  const handleVoirDetails = (proforma: Proforma) => {
    setModalDetails({ isOpen: true, proforma });
  };

  const handleModifier = async (proforma: Proforma) => {
    try {
      const details = await proformaService.getProformaDetails(proforma.id_proforma);
      setModalEditer({ isOpen: true, proforma, details: details.details || [] });
    } catch {
      showToast('error', 'Erreur', 'Impossible de charger les détails');
    }
  };

  const handleConvertir = (proforma: Proforma) => {
    setModalConvertir({ isOpen: true, proforma });
  };

  const handleConversionSuccess = (result: ConvertProformaResponse) => {
    showToast('success', 'Proforma convertie', `Facture ${result.num_facture || '#' + result.id_facture} créée avec succès`);
    loadProformas(true);
  };

  const handleImprimer = async (proforma: Proforma) => {
    try {
      const response = await proformaService.getProformaDetails(proforma.id_proforma);
      setModalImprimer({ isOpen: true, proforma, details: response.details || [] });
    } catch {
      showToast('error', 'Erreur', 'Impossible de charger les détails pour impression');
    }
  };

  const handleSupprimer = (proforma: Proforma) => {
    setModalSupprimer({ isOpen: true, proforma });
  };

  const confirmSupprimer = async () => {
    if (!modalSupprimer.proforma) return;
    try {
      const result = await proformaService.deleteProforma(modalSupprimer.proforma.id_proforma);
      if (result.success) {
        showToast('success', 'Supprimée', 'Proforma supprimée avec succès');
        loadProformas(true);
      } else {
        showToast('error', 'Erreur', result.message);
      }
    } catch (error: any) {
      showToast('error', 'Erreur', error.message || 'Impossible de supprimer');
    } finally {
      setModalSupprimer({ isOpen: false, proforma: null });
    }
  };

  const statuts: { value: 'TOUS' | ProformaStatut; label: string }[] = [
    { value: 'TOUS', label: 'Tous' },
    { value: 'BROUILLON', label: 'Brouillons' },
    { value: 'ACCEPTEE', label: 'Acceptées' },
    { value: 'CONVERTIE', label: 'Converties' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <StatsCardsProformas resume={resume} loading={loading} canViewMontants={canViewMontants} />

      {/* Header : Refresh */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => loadProformas(true)}
          disabled={isRefreshing}
          className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white hover:bg-white/20 transition-colors"
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
            onChange={(e) => { setFiltres(f => ({ ...f, search: e.target.value })); setCurrentPage(1); }}
            placeholder="Rechercher par numéro, client, téléphone..."
            className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filtre statut */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuts.map(s => (
            <button
              key={s.value}
              onClick={() => { setFiltres(f => ({ ...f, statut: s.value })); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filtres.statut === s.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compteur */}
      <p className="text-white/60 text-xs">
        {filteredProformas.length} proforma{filteredProformas.length > 1 ? 's' : ''}
        {filtres.statut && filtres.statut !== 'TOUS' && ` (${filtres.statut.toLowerCase()})`}
      </p>

      {/* Liste */}
      <ProformasList
        proformas={paginatedProformas}
        loading={loading}
        onVoirDetails={handleVoirDetails}
        onModifier={handleModifier}
        onImprimer={handleImprimer}
        onConvertir={handleConvertir}
        onSupprimer={handleSupprimer}
        canViewMontants={canViewMontants}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <GlassPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProformas.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal Éditer Proforma */}
      <ModalCreerProforma
        isOpen={modalEditer.isOpen}
        onClose={() => setModalEditer({ isOpen: false, proforma: null, details: [] })}
        onSuccess={() => loadProformas(true)}
        editMode
        proformaToEdit={modalEditer.proforma}
        proformaDetails={modalEditer.details}
      />

      {/* Modal Détails */}
      <ModalProformaDetails
        isOpen={modalDetails.isOpen}
        onClose={() => setModalDetails({ isOpen: false, proforma: null })}
        proforma={modalDetails.proforma}
        onModifier={handleModifier}
        onImprimer={handleImprimer}
        onConvertir={handleConvertir}
        onSupprimer={handleSupprimer}
        canViewMontants={canViewMontants}
      />

      {/* Modal Convertir */}
      <ModalConvertirProforma
        isOpen={modalConvertir.isOpen}
        onClose={() => setModalConvertir({ isOpen: false, proforma: null })}
        proforma={modalConvertir.proforma}
        onSuccess={handleConversionSuccess}
      />

      {/* Modal Supprimer */}
      <ModalConfirmation
        isOpen={modalSupprimer.isOpen}
        onClose={() => setModalSupprimer({ isOpen: false, proforma: null })}
        onConfirm={confirmSupprimer}
        title="Supprimer la proforma"
        message={`Êtes-vous sûr de vouloir supprimer la proforma ${modalSupprimer.proforma?.num_proforma} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        type="danger"
      />

      {/* Modal Impression Proforma */}
      {modalImprimer.proforma && (
        <ModalImpressionProforma
          isOpen={modalImprimer.isOpen}
          onClose={() => setModalImprimer({ isOpen: false, proforma: null, details: [] })}
          proforma={modalImprimer.proforma}
          details={modalImprimer.details}
          configFacture={structure?.config_facture}
          infoFacture={structure?.info_facture}
          logo={structure?.logo}
          nomStructure={structure?.nom_structure || ''}
        />
      )}
    </div>
  );
}
