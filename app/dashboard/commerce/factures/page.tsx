/**
 * Page de gestion des factures et paiements avec onglets
 * Interface mobile-first avec design glassmorphism
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { useHasRight } from '@/hooks/useRights';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslations } from '@/hooks/useTranslations';
import { GlassHeader } from '@/components/ui/GlassHeader';
import ModalCoffreFort from '@/components/coffre-fort/ModalCoffreFort';
import { ModalDeconnexion } from '@/components/auth/ModalDeconnexion';
import MainMenu from '@/components/layout/MainMenu';
import { StatsCardsFacturesGlass } from '@/components/factures/StatsCardsFacturesGlass';
import { FilterHeaderGlass } from '@/components/factures/FilterHeaderGlass';
import { FacturesList } from '@/components/factures/FacturesList';
import { FacturesOnglets } from '@/components/factures/FacturesOnglets';
import { ListePaiements } from '@/components/factures/ListePaiements';
import FacturesDesktopView from '@/components/factures/FacturesDesktopView';
import { ProformasTab } from '@/components/proformas/ProformasTab';
import { GlassPagination } from '@/components/ui/GlassPagination';
import { ModalPaiement } from '@/components/factures/ModalPaiement';
import { ModalPartage } from '@/components/factures/ModalPartage';
import { ModalFacturePrivee } from '@/components/facture/ModalFacturePrivee';
import { ModalRecuGenere } from '@/components/recu';
import ModalImpressionDocuments from '@/components/impression/ModalImpressionDocuments';
import { ModalConfirmation } from '@/components/ui/ModalConfirmation';
import { Toast } from '@/components/ui/Toast';
import { factureListService } from '@/services/facture-list.service';
import { facturePriveeService } from '@/services/facture-privee.service';
import { recuService } from '@/services/recu.service';
import {
  GetMyFactureResponse,
  FactureComplete,
  FiltresFactures
} from '@/types/facture';

export default function FacturesGlassPage() {
  const router = useRouter();
  const { user, structure } = useAuth();
  const t = useTranslations('invoices');
  const canViewMontants = useHasRight("VOIR CHIFFRE D'AFFAIRE");

  // Hook responsive pour switch mobile/desktop
  const { isDesktop, isDesktopLarge, isTablet } = useBreakpoint();
  const isDesktopView = isDesktop || isDesktopLarge;

  // États principaux
  const [facturesResponse, setFacturesResponse] = useState<GetMyFactureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [filtres, setFiltres] = useState<FiltresFactures>({
    sortBy: 'date',
    sortOrder: 'desc',
    statut: 'TOUS'
  });
  const [paiementsCount, setPaiementsCount] = useState(0);

  // Pagination serveur (20/page) — navigation sans loader plein écran
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // États des modals
  const [modalPaiement, setModalPaiement] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

  const [modalPartage, setModalPartage] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

  const [modalFacturePrivee, setModalFacturePrivee] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

  const [modalRecuGenere, setModalRecuGenere] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
    paiement?: any;
  }>({ isOpen: false, facture: null, paiement: null });

  const [modalImpression, setModalImpression] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

  const [modalConfirmation, setModalConfirmation] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  // États des notifications
  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ isOpen: false, type: 'info', message: '' });

  // États sidebar desktop (coffre-fort, déconnexion)
  const [showCoffreModal, setShowCoffreModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Ref pour accéder aux filtres courants sans recréer loadFactures
  const filtresRef = useRef(filtres);
  filtresRef.current = filtres;

  // Mapper filtres UI vers paramètres get_my_factures_filtered
  const buildFiltresDB = useCallback((f: FiltresFactures, page: number = 1) => {
    const hasSearchTerm = !!f.searchTerm?.trim();
    const filtresDB: {
      dateDebut?: string;
      dateFin?: string;
      nomClient?: string;
      telClient?: string;
      statut?: string;
      page: number;
      limit: number;
    } = { page: hasSearchTerm ? 1 : page, limit: hasSearchTerm ? 200 : ITEMS_PER_PAGE };

    if (f.periode?.debut) filtresDB.dateDebut = f.periode.debut;
    if (f.periode?.fin) filtresDB.dateFin = f.periode.fin;
    if (f.nom_client) filtresDB.nomClient = f.nom_client;
    if (f.tel_client) filtresDB.telClient = f.tel_client;
    if (f.statut && f.statut !== 'TOUS') {
      const statutMap: Record<string, string> = { 'PAYEE': 'payee', 'IMPAYEE': 'impayee' };
      filtresDB.statut = statutMap[f.statut] || f.statut;
    }

    return filtresDB;
  }, []);

  // Chargement des factures avec pagination serveur (sans loader plein écran)
  const loadFactures = useCallback(async (page: number = 1) => {
    if (!user) return;

    try {
      setIsRefreshing(true);
      setError('');

      const filtresDB = buildFiltresDB(filtresRef.current, page);
      const response = await factureListService.getMyFacturesFiltered(filtresDB);
      setFacturesResponse(response);

      // Charger paiements count seulement au premier chargement
      if (loading) {
        const paiements = await recuService.getHistoriqueRecus({
          id_structure: user.id_structure!,
          limite: 100
        });
        setPaiementsCount(paiements.length);
      }

    } catch (err: unknown) {
      console.error('Erreur chargement factures:', err);
      const errorMessage = err instanceof Error ? err.message : t('loadError');
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, buildFiltresDB, loading]);

  // Rafraîchir les données (page courante)
  const handleRefresh = async () => {
    await loadFactures(currentPage);
  };

  // Chargement initial
  useEffect(() => {
    loadFactures(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Recharger depuis la BD quand les filtres changent (debounce 500ms)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setCurrentPage(1);

    const timer = setTimeout(() => {
      loadFactures(1);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres]);

  // Recherche locale par texte pour réactivité immédiate (sur la page courante)
  const facturesFiltreesEtTriees = useMemo(() => {
    if (!facturesResponse?.factures) return [];

    let resultat = [...facturesResponse.factures];

    if (filtres.searchTerm) {
      const recherche = filtres.searchTerm.toLowerCase().trim();
      resultat = resultat.filter(f => {
        const nomClient = f.facture?.nom_client || (f as any).nom_client || '';
        const numFacture = f.facture?.num_facture || (f as any).num_facture || '';
        const telClient = f.facture?.tel_client || (f as any).tel_client || '';
        return nomClient.toLowerCase().includes(recherche) ||
               numFacture.toLowerCase().includes(recherche) ||
               telClient.includes(recherche);
      });
    }

    return resultat;
  }, [facturesResponse, filtres.searchTerm]);

  // Pagination serveur — factures déjà paginées par la BD
  const pagination = facturesResponse?.pagination;
  const totalPages = pagination?.total_pages || 1;
  const totalFiltered = pagination?.total_factures || facturesResponse?.total_factures || 0;
  const facturesPage = facturesFiltreesEtTriees;

  const goToPage = (page: number) => {
    setCurrentPage(page);
    loadFactures(page);
  };

  // Actions sur les factures
  const handleViewFacture = (facture: FactureComplete) => {
    setModalFacturePrivee({ isOpen: true, facture });
  };

  const handlePayFacture = (facture: FactureComplete) => {
    setModalPaiement({ isOpen: true, facture });
  };

  const handleShareFacture = (facture: FactureComplete) => {
    setModalPartage({ isOpen: true, facture });
  };

  const handleDeleteFacture = (facture: FactureComplete) => {
    setModalConfirmation({
      isOpen: true,
      message: t('confirmDelete', { num: facture.facture.num_facture }),
      onConfirm: () => executerSuppression(facture.facture.id_facture)
    });
  };

  const executerSuppression = async (idFacture: number) => {
    try {
      await facturePriveeService.deleteFacturePrivee(idFacture);

      setToast({
        isOpen: true,
        type: 'success',
        message: t('toast.deleteSuccess')
      });

      // Recharger les factures
      await loadFactures();
    } catch (err) {
      console.error('Erreur suppression facture:', err);
      setToast({
        isOpen: true,
        type: 'error',
        message: t('toast.deleteError')
      });
    }

    setModalConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
  };

  // Déterminer si la structure a un compte privé
  const comptePrive = !!structure?.compte_prive;

  // Action pour imprimer un document (compte_prive)
  const handleImprimer = (facture: FactureComplete) => {
    setModalImpression({ isOpen: true, facture });
  };

  // Action pour voir le reçu depuis une carte de facture (factures PAYÉES)
  // Utilise recus_paiements si disponible (depuis get_my_factures1), sinon fallback
  const handleVoirRecuFacture = (facture: FactureComplete) => {
    // PRIORITÉ 1: Utiliser recus_paiements si disponible (données réelles)
    if (facture.recus_paiements && facture.recus_paiements.length > 0) {
      const recu = facture.recus_paiements[0]; // Premier reçu

      console.log('🧾 [FACTURES] Affichage reçu depuis recus_paiements:', {
        id_facture: facture.facture.id_facture,
        numero_recu: recu.numero_recu,
        methode_paiement: recu.methode_paiement,
        montant_paye: recu.montant_paye
      });

      setModalRecuGenere({
        isOpen: true,
        facture: facture,
        paiement: {
          id_facture: facture.facture.id_facture,
          montant_paye: recu.montant_paye,
          date_paiement: recu.date_paiement,
          methode_paiement: recu.methode_paiement,
          reference_transaction: recu.reference_transaction || recu.numero_recu
        }
      });
      return;
    }

    // FALLBACK: Construire un objet paiement simulé (anciennes factures sans recus_paiements)
    console.log('⚠️ [FACTURES] Fallback paiement simulé (pas de recus_paiements):', {
      id_facture: facture.facture.id_facture,
      numrecu: facture.facture.numrecu
    });

    const paiementSimule = {
      id_facture: facture.facture.id_facture,
      montant_paye: facture.facture.montant,
      date_paiement: facture.facture.date_facture,
      methode_paiement: 'CASH', // Par défaut pour les anciennes factures
      reference_transaction: facture.facture.numrecu || ''
    };

    setModalRecuGenere({
      isOpen: true,
      facture: facture,
      paiement: paiementSimule
    });
  };

  // Actions sur les paiements (onglet Paiements)
  const handleViewRecu = (paiement: any) => {
    // Ouvrir le modal de reçu avec les données du paiement
    const factureAssociee = facturesResponse?.factures.find(
      f => f.facture.id_facture === paiement.id_facture
    );

    if (factureAssociee) {
      setModalRecuGenere({
        isOpen: true,
        facture: factureAssociee,
        paiement
      });
    }
  };

  const handleDownloadRecu = async (paiement: any) => {
    try {
      // Générer l'URL de téléchargement
      const url = recuService.generateUrlPartage(
        user?.id_structure!,
        paiement.id_facture
      );

      // Ouvrir dans un nouvel onglet pour téléchargement
      window.open(url, '_blank');

      setToast({
        isOpen: true,
        type: 'success',
        message: t('toast.downloadStarted')
      });
    } catch (err) {
      console.error('❌ Erreur téléchargement reçu:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setToast({
        isOpen: true,
        type: 'error',
        message: t('toast.downloadError', { error: errorMessage })
      });
    }
  };

  // Vérifier si des filtres sont actifs (pour recalculer les stats)
  const hasActiveFilters = !!(
    filtres.searchTerm ||
    filtres.periode?.debut ||
    filtres.nom_client ||
    filtres.tel_client ||
    (filtres.statut && filtres.statut !== 'TOUS')
  );

  // Overlay de chargement centré (visible pendant loading initial ou changement de page)
  const loadingOverlay = (loading || isRefreshing) && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3"
      >
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-gray-700 font-medium text-sm">{t('loading')}</p>
        <p className="text-gray-400 text-xs">{t('loadingPlease')}</p>
      </motion.div>
    </motion.div>
  );

  // Desktop / Tablette : afficher la vue desktop
  if (isDesktopView || isTablet) {
    return (
      <>
        {loadingOverlay}
        <FacturesDesktopView
          user={user!}
          structure={structure}
          facturesResponse={facturesResponse}
          facturesFiltreesEtTriees={facturesFiltreesEtTriees}
          facturesPage={facturesPage}
          currentPage={currentPage}
          totalPages={totalPages}
          filtres={filtres}
          paiementsCount={paiementsCount}
          loading={loading}
          isRefreshing={isRefreshing}
          error={error}
          canViewMontants={canViewMontants}
          comptePrive={comptePrive}
          hasActiveFilters={hasActiveFilters}
          onFiltersChange={setFiltres}
          onRefresh={handleRefresh}
          onPageChange={goToPage}
          onViewFacture={handleViewFacture}
          onPayFacture={handlePayFacture}
          onShareFacture={handleShareFacture}
          onDeleteFacture={handleDeleteFacture}
          onImprimer={handleImprimer}
          onVoirRecu={handleVoirRecuFacture}
          onViewRecu={handleViewRecu}
          onDownloadRecu={handleDownloadRecu}
          onShowCoffreModal={() => setShowCoffreModal(true)}
          onShowLogoutModal={() => setShowLogoutModal(true)}
          onShowProfilModal={() => window.dispatchEvent(new Event('openProfileModal'))}
          isTablet={!isDesktopLarge}
        />

        {/* MainMenu (masque, monte pour ecouter openProfileModal) */}
        <MainMenu
          isOpen={false}
          onClose={() => {}}
          userName={user?.username}
          businessName={user?.nom_structure}
        />

        {/* Coffre-Fort Modal */}
        <ModalCoffreFort
          isOpen={showCoffreModal}
          onClose={() => setShowCoffreModal(false)}
          structureId={user?.id_structure || 0}
        />

        {/* Modal Deconnexion */}
        <ModalDeconnexion
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => {
            authService.logout();
            router.push('/login');
          }}
          userName={user?.username}
        />

        {/* Modals partages */}
        {modalPaiement.facture && (
          <ModalPaiement
            isOpen={modalPaiement.isOpen}
            onClose={() => setModalPaiement({ isOpen: false, facture: null })}
            facture={modalPaiement.facture}
            onSuccess={handleRefresh}
          />
        )}

        {modalPartage.facture && (
          <ModalPartage
            isOpen={modalPartage.isOpen}
            onClose={() => setModalPartage({ isOpen: false, facture: null })}
            facture={modalPartage.facture}
          />
        )}

        {modalFacturePrivee.facture && (
          <ModalFacturePrivee
            isOpen={modalFacturePrivee.isOpen}
            onClose={() => setModalFacturePrivee({ isOpen: false, facture: null })}
            factureId={modalFacturePrivee.facture.facture.id_facture}
            numFacture={modalFacturePrivee.facture.facture.num_facture}
            comptePrive={comptePrive}
            onImprimer={() => {
              const facture = modalFacturePrivee.facture;
              setModalFacturePrivee({ isOpen: false, facture: null });
              if (facture) {
                setModalImpression({ isOpen: true, facture });
              }
            }}
          />
        )}

        {modalRecuGenere.facture && modalRecuGenere.paiement && (
          <ModalRecuGenere
            isOpen={modalRecuGenere.isOpen}
            onClose={() => setModalRecuGenere({ isOpen: false, facture: null, paiement: null })}
            factureId={modalRecuGenere.facture.facture.id_facture}
            walletUsed={modalRecuGenere.paiement.methode_paiement || 'CASH'}
            montantPaye={modalRecuGenere.paiement.montant_paye || modalRecuGenere.facture.facture.montant}
            numeroRecu={modalRecuGenere.facture.facture.numrecu}
            dateTimePaiement={modalRecuGenere.paiement.date_paiement}
            referenceTransaction={modalRecuGenere.paiement.reference_transaction}
          />
        )}

        {modalImpression.facture && (
          <ModalImpressionDocuments
            isOpen={modalImpression.isOpen}
            onClose={() => setModalImpression({ isOpen: false, facture: null })}
            facture={modalImpression.facture}
            comptePrive={comptePrive}
            configFacture={structure?.config_facture}
            infoFacture={structure?.info_facture}
            logo={structure?.logo}
            nomStructure={structure?.nom_structure || ''}
            inclureTva={structure?.inclure_tva}
            tauxTva={structure?.taux_tva}
            onOpenRecu={() => {
              const facture = modalImpression.facture;
              setModalImpression({ isOpen: false, facture: null });
              if (facture) handleVoirRecuFacture(facture);
            }}
          />
        )}

        <ModalConfirmation
          isOpen={modalConfirmation.isOpen}
          onClose={() => setModalConfirmation({ isOpen: false, message: '', onConfirm: () => {} })}
          onConfirm={modalConfirmation.onConfirm}
          message={modalConfirmation.message}
          type="danger"
        />

        <Toast
          isVisible={toast.isOpen}
          onClose={() => setToast({ ...toast, isOpen: false })}
          title={toast.message}
          type={toast.type}
          duration={5000}
        />
      </>
    );
  }

  // Mobile : code existant inchange
  // Contenu de l'onglet Factures
  const facturesContent = (
    <>
      {/* Statistiques - basées sur les factures filtrées si filtres actifs */}
      {facturesResponse && (
        <StatsCardsFacturesGlass
          factures={facturesFiltreesEtTriees}
          resumeGlobal={facturesResponse.resume_global}
          totalFactures={totalFiltered || facturesResponse.total_factures}
          montantTotal={facturesResponse.resume_global.montant_total}
          montantPaye={facturesResponse.resume_global.montant_paye}
          montantImpaye={facturesResponse.resume_global.montant_impaye}
          canViewMontants={canViewMontants}
        />
      )}

      {/* Filtres */}
      <FilterHeaderGlass
        onFiltersChange={setFiltres}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Pagination positionnée juste après les filtres */}
      {totalPages > 1 && (
        <GlassPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          totalItems={totalFiltered}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Liste des factures */}
      <FacturesList
        factures={facturesPage}
        onVoirDetailsModal={handleViewFacture}
        onAjouterAcompte={handlePayFacture}
        onPartager={handleShareFacture}
        onVoirRecu={handleVoirRecuFacture}
        onImprimer={comptePrive ? handleImprimer : undefined}
        onSupprimer={handleDeleteFacture}
        userProfileId={user?.id_profil}
        comptePrive={comptePrive}
        canViewMontants={canViewMontants}
      />
    </>
  );

  // Contenu de l'onglet Paiements
  const paiementsContent = (
    <ListePaiements
      onViewRecu={handleViewRecu}
      onDownloadRecu={handleDownloadRecu}
      canViewMontants={canViewMontants}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9c9125d9] via-[#203e2b] to-[#166534]">
      {loadingOverlay}
      <div className="max-w-md mx-auto min-h-screen relative">
        {/* Header */}
        <GlassHeader
          title={t('pageTitle')}
          subtitle={t('pageSubtitle')}
          onBack={() => router.push('/dashboard/commerce')}
          showBackButton={true}
          backgroundGradient="bg-gradient-to-r from-green-400 to-orange-500"
        />

      {/* Message d'erreur global */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        </motion.div>
      )}

        {/* Contenu avec padding */}
        <div className="p-5 pb-24">
          {/* Onglets Factures et Paiements */}
          <FacturesOnglets
            facturesContent={facturesContent}
            paiementsContent={paiementsContent}
            proformasContent={comptePrive ? <ProformasTab canViewMontants={canViewMontants} /> : undefined}
            facturesCount={facturesResponse?.total_factures || 0}
            paiementsCount={paiementsCount}
            showProformas={comptePrive}
          />
        </div>

      {/* Modals */}
      {modalPaiement.facture && (
        <ModalPaiement
          isOpen={modalPaiement.isOpen}
          onClose={() => setModalPaiement({ isOpen: false, facture: null })}
          facture={modalPaiement.facture}
          onSuccess={handleRefresh}
        />
      )}

      {modalPartage.facture && (
        <ModalPartage
          isOpen={modalPartage.isOpen}
          onClose={() => setModalPartage({ isOpen: false, facture: null })}
          facture={modalPartage.facture}
        />
      )}

      {modalFacturePrivee.facture && (
        <ModalFacturePrivee
          isOpen={modalFacturePrivee.isOpen}
          onClose={() => setModalFacturePrivee({ isOpen: false, facture: null })}
          factureId={modalFacturePrivee.facture.facture.id_facture}
          numFacture={modalFacturePrivee.facture.facture.num_facture}
          comptePrive={comptePrive}
          onImprimer={() => {
            const facture = modalFacturePrivee.facture;
            setModalFacturePrivee({ isOpen: false, facture: null });
            if (facture) {
              setModalImpression({ isOpen: true, facture });
            }
          }}
        />
      )}

      {modalRecuGenere.facture && modalRecuGenere.paiement && (
        <ModalRecuGenere
          isOpen={modalRecuGenere.isOpen}
          onClose={() => setModalRecuGenere({ isOpen: false, facture: null, paiement: null })}
          factureId={modalRecuGenere.facture.facture.id_facture}
          walletUsed={modalRecuGenere.paiement.methode_paiement || 'CASH'}
          montantPaye={modalRecuGenere.paiement.montant_paye || modalRecuGenere.facture.facture.montant}
          numeroRecu={modalRecuGenere.facture.facture.numrecu}
          dateTimePaiement={modalRecuGenere.paiement.date_paiement}
          referenceTransaction={modalRecuGenere.paiement.reference_transaction}
        />
      )}

      {modalImpression.facture && (
        <ModalImpressionDocuments
          isOpen={modalImpression.isOpen}
          onClose={() => setModalImpression({ isOpen: false, facture: null })}
          facture={modalImpression.facture}
          comptePrive={comptePrive}
          configFacture={structure?.config_facture}
          infoFacture={structure?.info_facture}
          logo={structure?.logo}
          nomStructure={structure?.nom_structure || ''}
          inclureTva={structure?.inclure_tva}
          tauxTva={structure?.taux_tva}
          onOpenRecu={() => {
            const facture = modalImpression.facture;
            setModalImpression({ isOpen: false, facture: null });
            if (facture) handleVoirRecuFacture(facture);
          }}
        />
      )}

      <ModalConfirmation
        isOpen={modalConfirmation.isOpen}
        onClose={() => setModalConfirmation({ isOpen: false, message: '', onConfirm: () => {} })}
        onConfirm={modalConfirmation.onConfirm}
        message={modalConfirmation.message}
        type="danger"
      />

        {/* Toast notifications */}
        <Toast
          isVisible={toast.isOpen}
          onClose={() => setToast({ ...toast, isOpen: false })}
          title={toast.message}
          type={toast.type}
          duration={5000}
        />
      </div>
    </div>
  );
}