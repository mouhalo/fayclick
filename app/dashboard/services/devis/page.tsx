/**
 * Page Liste des Devis
 * Affiche tous les devis du prestataire avec filtres
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Search,
  FileText,
  Loader2,
  RefreshCw,
  Filter,
  TrendingUp
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { prestationService } from '@/services/prestation.service';
import { DevisFromDB, FiltreDevis } from '@/types/prestation';
import { User } from '@/types/auth';
import { CarteDevis } from '@/components/services/CarteDevis';
import { ModalNouveauDevis } from '@/components/services/ModalNouveauDevis';
import { ModalEditDevis } from '@/components/services/ModalEditDevis';
import { ModalCreerFacture, FactureFromDevisData } from '@/components/services/ModalCreerFacture';
import PopMessage from '@/components/ui/PopMessage';

type PeriodeFilter = 'mois' | 'annee' | 'tout';

export default function ListeDevisPage() {
  const router = useRouter();

  // États
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [devisList, setDevisList] = useState<DevisFromDB[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriode, setSelectedPeriode] = useState<PeriodeFilter>('mois');
  const [showFilters, setShowFilters] = useState(false);

  // Calcul des stats à partir de la liste des devis affichés (se met à jour avec les filtres)
  const computedStats = {
    nombre_devis: devisList.length,
    montant_total: devisList.reduce((sum, d) => {
      // Montant services/produits + équipements
      const montantProduits = d.devis.montant || 0;
      const montantEquipements = d.devis.montant_equipement || 0;
      return sum + montantProduits + montantEquipements;
    }, 0)
  };

  // Modal nouveau devis
  const [showModalDevis, setShowModalDevis] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState<DevisFromDB | null>(null);

  // Modal édition devis
  const [showModalEditDevis, setShowModalEditDevis] = useState(false);
  const [devisToEdit, setDevisToEdit] = useState<DevisFromDB | null>(null);

  // Modal créer facture depuis devis
  const [showModalFacture, setShowModalFacture] = useState(false);
  const [devisForFacture, setDevisForFacture] = useState<DevisFromDB | null>(null);

  // Messages
  const [popMessage, setPopMessage] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  // Vérification authentification
  useEffect(() => {
    const checkAuth = () => {
      if (!authService.isAuthenticated()) {
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      if (!userData || userData.type_structure !== 'PRESTATAIRE DE SERVICES') {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      setIsAuthLoading(false);
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Charger les devis
  const loadDevis = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const filtres: FiltreDevis = {
        periode: selectedPeriode,
        searchTerm: searchTerm || undefined
      };

      const response = await prestationService.getListeDevis(filtres);

      if (response.success) {
        setDevisList(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      showMessage('error', 'Impossible de charger les devis');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedPeriode, searchTerm]);

  // Charger au montage et quand filtres changent
  useEffect(() => {
    if (user) {
      loadDevis();
    }
  }, [user, loadDevis]);

  // Afficher message
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  // Ouvrir modal création
  const handleAddDevis = () => {
    setSelectedDevis(null);
    setShowModalDevis(true);
  };

  // Voir/Éditer détails devis
  const handleViewDevis = (devis: DevisFromDB) => {
    setDevisToEdit(devis);
    setShowModalEditDevis(true);
  };

  // Callback succès édition devis
  const handleDevisUpdated = () => {
    loadDevis();
    showMessage('success', 'Devis mis à jour avec succès');
  };

  // Callback succès modal devis
  const handleDevisCreated = () => {
    loadDevis();
    showMessage('success', 'Devis créé avec succès');
  };

  // Ouvrir modal création facture
  const handleCreerFacture = (devis: DevisFromDB) => {
    setDevisForFacture(devis);
    setShowModalFacture(true);
  };

  // Créer facture depuis devis
  const handleCreateFacture = async (data: FactureFromDevisData) => {
    // TODO: Implémenter la création de facture via API
    console.log('Créer facture avec données:', data);
    showMessage('success', 'Facture créée avec succès');
    setShowModalFacture(false);
    loadDevis(); // Recharger pour mettre à jour le statut
  };

  // Supprimer un devis
  const handleDeleteDevis = async (devis: DevisFromDB) => {
    const confirmDelete = window.confirm(
      `Voulez-vous vraiment supprimer le devis ${devis.devis.num_devis} ?\n\nClient: ${devis.devis.nom_client_payeur}\nMontant: ${devis.devis.montant.toLocaleString('fr-FR')} F\n\nCette action est irréversible.`
    );

    if (!confirmDelete) return;

    try {
      const response = await prestationService.deleteDevis(devis.devis.id_devis);

      if (response.success) {
        showMessage('success', response.message || 'Devis supprimé avec succès');
        loadDevis(); // Recharger la liste
      } else {
        showMessage('error', response.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression devis:', error);
      showMessage('error', 'Impossible de supprimer le devis');
    }
  };

  // Formatage montant
  const formatMontant = (montant: number) =>
    `${montant.toLocaleString('fr-FR')} F`;

  // Loading state
  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-500 to-blue-300">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg font-medium animate-pulse">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white sticky top-0 z-40"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h1 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mes Devis
            </h1>

            <button
              onClick={loadDevis}
              disabled={isLoading}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un devis, client..."
              className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Filtres */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex gap-2">
                  {(['mois', 'annee', 'tout'] as PeriodeFilter[]).map((periode) => (
                    <button
                      key={periode}
                      onClick={() => setSelectedPeriode(periode)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedPeriode === periode
                          ? 'bg-white text-blue-600'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      {periode === 'mois' ? 'Ce mois' : periode === 'annee' ? 'Cette année' : 'Tous'}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Contenu */}
        <div className="p-4 pb-24">
          {/* Stats rapides - Calculées dynamiquement depuis la liste filtrée */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600">Devis</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{computedStats.nombre_devis}</p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-600">Montant total</span>
              </div>
              <p className="text-lg font-bold text-green-700">{formatMontant(computedStats.montant_total)}</p>
            </div>
          </motion.div>

          {/* Liste des devis */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : devisList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? 'Aucun devis ne correspond à votre recherche'
                  : 'Vous n\'avez pas encore de devis'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddDevis}
                  className="px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  Créer mon premier devis
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {devisList.map((devisData, index) => (
                <CarteDevis
                  key={devisData.devis.id_devis}
                  devisData={devisData}
                  index={index}
                  onClick={handleViewDevis}
                  onCreerFacture={handleCreerFacture}
                  onDelete={handleDeleteDevis}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bouton flottant Ajouter */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAddDevis}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all z-50"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      </div>

      {/* Modal Nouveau Devis */}
      <ModalNouveauDevis
        isOpen={showModalDevis}
        onClose={() => setShowModalDevis(false)}
        onSuccess={handleDevisCreated}
      />

      {/* Modal Édition Devis */}
      <ModalEditDevis
        isOpen={showModalEditDevis}
        onClose={() => {
          setShowModalEditDevis(false);
          setDevisToEdit(null);
        }}
        onSuccess={handleDevisUpdated}
        devisData={devisToEdit}
      />

      {/* Modal Créer Facture depuis Devis */}
      <ModalCreerFacture
        isOpen={showModalFacture}
        onClose={() => {
          setShowModalFacture(false);
          setDevisForFacture(null);
        }}
        onCreerFacture={handleCreateFacture}
        devisData={devisForFacture}
      />

      {/* Messages */}
      <PopMessage
        show={popMessage.show}
        type={popMessage.type}
        title={popMessage.title}
        message={popMessage.message}
        onClose={() => setPopMessage({ ...popMessage, show: false })}
      />
    </div>
  );
}
