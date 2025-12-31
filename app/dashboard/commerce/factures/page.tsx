/**
 * Page de gestion des factures et paiements avec onglets
 * Interface mobile-first avec design glassmorphism
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { StatsCardsFacturesGlass } from '@/components/factures/StatsCardsFacturesGlass';
import { FilterHeaderGlass } from '@/components/factures/FilterHeaderGlass';
import { FacturesList } from '@/components/factures/FacturesList';
import { FacturesOnglets } from '@/components/factures/FacturesOnglets';
import { ListePaiements } from '@/components/factures/ListePaiements';
import { GlassPagination } from '@/components/ui/GlassPagination';
import { ModalPaiement } from '@/components/factures/ModalPaiement';
import { ModalPartage } from '@/components/factures/ModalPartage';
import { ModalFacturePrivee } from '@/components/facture/ModalFacturePrivee';
import { ModalRecuGenere } from '@/components/recu';
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
  const { user } = useAuth();

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

  // États de pagination
  const [currentPage, setCurrentPage] = useState(1);

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

  // Chargement initial des factures et paiements
  const loadFactures = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const response = await factureListService.getMyFactures();
      setFacturesResponse(response);

      // Charger aussi le nombre de paiements
      const paiements = await recuService.getHistoriqueRecus({
        id_structure: user.id_structure!,
        limite: 100
      });
      setPaiementsCount(paiements.length);

    } catch (err: unknown) {
      console.error('Erreur chargement factures:', err);
      const errorMessage = err instanceof Error ? err.message : 'Impossible de charger les factures';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFactures();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    loadFactures();
  }, [loadFactures]);

  // Réinitialiser la pagination quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filtres]);

  // Filtrer et trier les factures
  const facturesFiltreesEtTriees = useMemo(() => {
    if (!facturesResponse?.factures) return [];

    let resultat = [...facturesResponse.factures];

    // Filtrage par statut
    if (filtres.statut && filtres.statut !== 'TOUS') {
      resultat = resultat.filter(f => {
        // Support des deux formats possibles
        const statut = f.facture?.libelle_etat || (f as any).libelle_etat;
        return statut === filtres.statut;
      });
    }

    // Filtrage par période (dates début et fin)
    if (filtres.periode?.debut && filtres.periode?.fin) {
      const dateDebut = new Date(filtres.periode.debut);
      dateDebut.setHours(0, 0, 0, 0);
      const dateFin = new Date(filtres.periode.fin);
      dateFin.setHours(23, 59, 59, 999);

      resultat = resultat.filter(f => {
        const dateFacture = f.facture?.date_facture || (f as any).date_facture;
        if (!dateFacture) return false;
        const date = new Date(dateFacture);
        return date >= dateDebut && date <= dateFin;
      });
    }

    // Filtrage par nom client spécifique
    if (filtres.nom_client) {
      const recherche = filtres.nom_client.toLowerCase().trim();
      resultat = resultat.filter(f => {
        const nomClient = f.facture?.nom_client || (f as any).nom_client || '';
        return nomClient.toLowerCase().includes(recherche);
      });
    }

    // Filtrage par téléphone client
    if (filtres.tel_client) {
      // Nettoyer le numéro (enlever espaces, tirets, etc.)
      const telRecherche = filtres.tel_client.replace(/[\s\-\.]/g, '');
      resultat = resultat.filter(f => {
        const telClient = f.facture?.tel_client || (f as any).tel_client || '';
        const telNettoye = telClient.replace(/[\s\-\.]/g, '');
        return telNettoye.includes(telRecherche);
      });
    }

    // Recherche générale (numéro facture ou client)
    if (filtres.searchTerm) {
      const recherche = filtres.searchTerm.toLowerCase().trim();
      resultat = resultat.filter(f => {
        // Support des deux formats possibles
        const nomClient = f.facture?.nom_client || (f as any).nom_client || '';
        const numFacture = f.facture?.num_facture || (f as any).num_facture || '';
        const telClient = f.facture?.tel_client || (f as any).tel_client || '';
        return nomClient.toLowerCase().includes(recherche) ||
               numFacture.toLowerCase().includes(recherche) ||
               telClient.includes(recherche);
      });
    }

    // Tri
    resultat.sort((a, b) => {
      let comparaison = 0;

      switch (filtres.sortBy) {
        case 'date':
          const dateA = a.facture?.date_facture || (a as any).date_facture;
          const dateB = b.facture?.date_facture || (b as any).date_facture;
          comparaison = new Date(dateB).getTime() - new Date(dateA).getTime();
          break;
        case 'montant':
          const montantA = a.facture?.montant || (a as any).montant || 0;
          const montantB = b.facture?.montant || (b as any).montant || 0;
          comparaison = montantB - montantA;
          break;
        case 'client':
          const clientA = a.facture?.nom_client || (a as any).nom_client || '';
          const clientB = b.facture?.nom_client || (b as any).nom_client || '';
          comparaison = clientA.localeCompare(clientB);
          break;
        default:
          comparaison = 0;
      }

      return filtres.sortOrder === 'asc' ? -comparaison : comparaison;
    });

    return resultat;
  }, [facturesResponse, filtres]);

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(facturesFiltreesEtTriees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const facturesPage = facturesFiltreesEtTriees.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(page);

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
      message: `Êtes-vous sûr de vouloir supprimer la facture ${facture.facture.num_facture} ?`,
      onConfirm: () => executerSuppression(facture.facture.id_facture)
    });
  };

  const executerSuppression = async (idFacture: number) => {
    try {
      await facturePriveeService.deleteFacturePrivee(idFacture);

      setToast({
        isOpen: true,
        type: 'success',
        message: 'Facture supprimée avec succès'
      });

      // Recharger les factures
      await loadFactures();
    } catch (err) {
      console.error('Erreur suppression facture:', err);
      setToast({
        isOpen: true,
        type: 'error',
        message: 'Impossible de supprimer la facture'
      });
    }

    setModalConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
  };

  // Action pour voir le reçu depuis une carte de facture (factures PAYÉES)
  const handleVoirRecuFacture = (facture: FactureComplete) => {
    // Construire un objet paiement à partir des données de la facture
    const paiementSimule = {
      id_facture: facture.facture.id_facture,
      montant_paye: facture.facture.montant,
      date_paiement: facture.facture.date_facture,
      methode_paiement: 'CASH', // Par défaut, peut être amélioré si on a l'info
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
        message: 'Téléchargement du reçu démarré'
      });
    } catch (err) {
      console.error('❌ Erreur téléchargement reçu:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setToast({
        isOpen: true,
        type: 'error',
        message: `Impossible de télécharger le reçu: ${errorMessage}`
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#9c9125d9] via-[#203e2b] to-[#166534] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader className="animate-spin w-12 h-12 text-white mx-auto" />
          <p className="text-white/80">Chargement des factures...</p>
        </div>
      </div>
    );
  }

  // Vérifier si des filtres sont actifs (pour recalculer les stats)
  const hasActiveFilters = !!(
    filtres.searchTerm ||
    filtres.periode?.debut ||
    filtres.nom_client ||
    filtres.tel_client ||
    (filtres.statut && filtres.statut !== 'TOUS')
  );

  // Contenu de l'onglet Factures
  const facturesContent = (
    <>
      {/* Statistiques - basées sur les factures filtrées si filtres actifs */}
      {facturesResponse && (
        <StatsCardsFacturesGlass
          factures={facturesFiltreesEtTriees}
          resumeGlobal={hasActiveFilters ? undefined : facturesResponse.resume_global}
          totalFactures={facturesFiltreesEtTriees.length}
          montantTotal={facturesFiltreesEtTriees.reduce((sum, f) => sum + (f.facture?.montant || 0), 0)}
          montantPaye={facturesFiltreesEtTriees.reduce((sum, f) => sum + (f.facture?.mt_acompte || 0), 0)}
          montantImpaye={facturesFiltreesEtTriees.reduce((sum, f) => sum + (f.facture?.mt_restant || 0), 0)}
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
          totalItems={facturesFiltreesEtTriees.length}
          itemsPerPage={itemsPerPage}
        />
      )}

      {/* Liste des factures */}
      <FacturesList
        factures={facturesPage}
        onVoirDetailsModal={handleViewFacture}
        onAjouterAcompte={handlePayFacture}
        onPartager={handleShareFacture}
        onVoirRecu={handleVoirRecuFacture}
        onSupprimer={handleDeleteFacture}
        userProfileId={user?.id_profil}
      />
    </>
  );

  // Contenu de l'onglet Paiements
  const paiementsContent = (
    <ListePaiements
      onViewRecu={handleViewRecu}
      onDownloadRecu={handleDownloadRecu}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9c9125d9] via-[#203e2b] to-[#166534]">
      <div className="max-w-md mx-auto min-h-screen relative">
        {/* Header */}
        <GlassHeader
          title="Gestion des Factures"
          subtitle="Gérez vos factures et paiements"
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
            facturesCount={facturesResponse?.total_factures || 0}
            paiementsCount={paiementsCount}
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