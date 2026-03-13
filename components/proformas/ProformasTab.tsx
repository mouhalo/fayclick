/**
 * Onglet Proformas complet
 * Contient stats + filtre + liste + tous les modals
 * A integrer dans la page factures
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
// framer-motion import removed - not directly used here
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
// import { useHasRight } from '@/hooks/useRights';
import { proformaService } from '@/services/proforma.service';
import { StatsCardsProformas } from './StatsCardsProformas';
import { ProformasList } from './ProformasList';
import { ModalCreerProforma } from './ModalCreerProforma';
import { ModalProformaDetails } from './ModalProformaDetails';
import { ModalConvertirProforma } from './ModalConvertirProforma';
import { ModalConfirmation } from '@/components/ui/ModalConfirmation';
import { useToast } from '@/components/ui/Toast';
import { GlassPagination } from '@/components/ui/GlassPagination';
import {
  Proforma,
  ProformaListResponse,
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
  const { user, structure } = useAuth();
  const { showToast } = useToast();

  // Donnees
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [resume, setResume] = useState<ProformaResumeGlobal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtres
  const [filtres, setFiltres] = useState<FiltresProformas>({
    search: '',
    statut: 'TOUS',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modals
  const [modalCreer, setModalCreer] = useState(false);
  const [modalDetails, setModalDetails] = useState<{ isOpen: boolean; proforma: Proforma | null }>({ isOpen: false, proforma: null });
  const [modalConvertir, setModalConvertir] = useState<{ isOpen: boolean; proforma: Proforma | null }>({ isOpen: false, proforma: null });
  const [modalSupprimer, setModalSupprimer] = useState<{ isOpen: boolean; proforma: Proforma | null }>({ isOpen: false, proforma: null });
  const [modalEditer, setModalEditer] = useState<{ isOpen: boolean; proforma: Proforma | null; details: ProformaDetail[] }>({ isOpen: false, proforma: null, details: [] });

  // Chargement initial
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

  // Filtrage local
  const filteredProformas = useMemo(() => {
    let result = [...proformas];

    // Filtre par statut
    if (filtres.statut && filtres.statut !== 'TOUS') {
      result = result.filter(p => p.libelle_etat === filtres.statut);
    }

    // Recherche
    if (filtres.search) {
      const search = filtres.search.toLowerCase();
      result = result.filter(p =>
        p.num_proforma.toLowerCase().includes(search) ||
        p.nom_client.toLowerCase().includes(search) ||
        p.tel_client.includes(search)
      );
    }

    // Tri
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

  // Pagination
  const totalPages = Math.ceil(filteredProformas.length / ITEMS_PER_PAGE);
  const paginatedProformas = filteredProformas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handlers actions
  const handleVoirDetails = (proforma: Proforma) => {
    setModalDetails({ isOpen: true, proforma });
  };

  const handleModifier = async (proforma: Proforma) => {
    try {
      const details = await proformaService.getProformaDetails(proforma.id_proforma);
      setModalEditer({ isOpen: true, proforma, details: details.details || [] });
    } catch {
      showToast('error', 'Erreur', 'Impossible de charger les details');
    }
  };

  const handleConvertir = (proforma: Proforma) => {
    setModalConvertir({ isOpen: true, proforma });
  };

  const handleConversionSuccess = (result: ConvertProformaResponse) => {
    showToast('success', 'Proforma convertie', `Facture ${result.num_facture || '#' + result.id_facture} creee avec succes`);
    loadProformas(true);
  };

  const handleImprimer = (proforma: Proforma) => {
    // Impression via generate-ticket-html avec badge PROFORMA
    import('@/services/proforma.service').then(async () => {
      try {
        const details = await proformaService.getProformaDetails(proforma.id_proforma);
        const { generateTicketHTML, printViaIframe } = await import('@/lib/generate-ticket-html');

        const html = generateTicketHTML({
          nomStructure: structure?.nom_structure || '',
          logoUrl: structure?.logo || '',
          adresse: structure?.adresse || '',
          telephone: structure?.mobile_om || '',
          numFacture: proforma.num_proforma,
          dateFacture: new Date(proforma.date_proforma).toLocaleDateString('fr-FR'),
          nomClient: proforma.nom_client,
          telClient: proforma.tel_client,
          articles: (details.details || []).map((d: ProformaDetail) => ({
            nom_produit: d.nom_produit,
            quantite: d.quantite,
            prix: d.prix_unitaire,
            sous_total: d.sous_total,
          })),
          sousTotal: proforma.montant,
          remise: proforma.mt_remise,
          montantNet: proforma.montant_net,
          methodePaiement: 'PROFORMA',
          badge: 'FACTURE' as const,
          nomCaissier: user?.username || '',
        });

        printViaIframe(html);
      } catch (error) {
        console.error('Erreur impression:', error);
        showToast('error', 'Erreur', 'Impossible d\'imprimer la proforma');
      }
    });
  };

  const handleSupprimer = (proforma: Proforma) => {
    setModalSupprimer({ isOpen: true, proforma });
  };

  const confirmSupprimer = async () => {
    if (!modalSupprimer.proforma) return;
    try {
      const result = await proformaService.deleteProforma(modalSupprimer.proforma.id_proforma);
      if (result.success) {
        showToast('success', 'Supprimee', 'Proforma supprimee avec succes');
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
    { value: 'ACCEPTEE', label: 'Acceptees' },
    { value: 'CONVERTIE', label: 'Converties' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <StatsCardsProformas resume={resume} loading={loading} canViewMontants={canViewMontants} />

      {/* Header : Nouveau + Refresh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setModalCreer(true)}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-amber-700 transition-colors shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Nouvelle proforma
        </button>
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
            placeholder="Rechercher par numero, client, telephone..."
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

      {/* Modal Creer Proforma */}
      <ModalCreerProforma
        isOpen={modalCreer}
        onClose={() => setModalCreer(false)}
        onSuccess={() => loadProformas(true)}
      />

      {/* Modal Editer Proforma */}
      <ModalCreerProforma
        isOpen={modalEditer.isOpen}
        onClose={() => setModalEditer({ isOpen: false, proforma: null, details: [] })}
        onSuccess={() => loadProformas(true)}
        editMode
        proformaToEdit={modalEditer.proforma}
        proformaDetails={modalEditer.details}
      />

      {/* Modal Details */}
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
        message={`Etes-vous sur de vouloir supprimer la proforma ${modalSupprimer.proforma?.num_proforma} ? Cette action est irreversible.`}
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
}
