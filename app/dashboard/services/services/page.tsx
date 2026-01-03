/**
 * Page Catalogue des Services
 * Liste tous les services proposés par le prestataire
 * CRUD via ModalService
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Search,
  Wrench,
  Loader2,
  RefreshCw,
  Filter
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { prestationService } from '@/services/prestation.service';
import { Service, CATEGORIES_SERVICES } from '@/types/prestation';
import { User } from '@/types/auth';
import { ModalService } from '@/components/services/ModalService';
import { CarteService } from '@/components/services/CarteService';
import PopMessage from '@/components/ui/PopMessage';

export default function CatalogueServicesPage() {
  const router = useRouter();

  // États
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

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

  // Charger les services
  const loadServices = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await prestationService.getListeServices({
        searchTerm: searchTerm || undefined,
        nom_categorie: selectedCategorie || undefined
      });

      if (response.success) {
        setServices(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
      showMessage('error', 'Impossible de charger les services');
    } finally {
      setIsLoading(false);
    }
  }, [user, searchTerm, selectedCategorie]);

  // Charger au montage et quand filtres changent
  useEffect(() => {
    if (user) {
      loadServices();
    }
  }, [user, loadServices]);

  // Afficher message
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  // Ouvrir modal création
  const handleAddService = () => {
    setServiceToEdit(null);
    setShowModal(true);
  };

  // Ouvrir modal édition
  const handleEditService = (service: Service) => {
    setServiceToEdit(service);
    setShowModal(true);
  };

  // Supprimer service
  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Supprimer le service "${service.nom_service}" ?`)) {
      return;
    }

    try {
      await prestationService.deleteService(service.id_service);
      showMessage('success', 'Service supprimé');
      loadServices();
    } catch (error) {
      console.error('Erreur suppression:', error);
      showMessage('error', 'Impossible de supprimer le service');
    }
  };

  // Callback succès modal
  const handleModalSuccess = () => {
    loadServices();
  };

  // Filtrer les services localement (en plus du filtre API)
  const servicesFiltres = services;

  // Loading state
  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-indigo-300">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Wrench className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg font-medium animate-pulse">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white sticky top-0 z-40"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h1 className="text-lg font-bold flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Mes Services
            </h1>

            <button
              onClick={loadServices}
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
              placeholder="Rechercher un service..."
              className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                showFilters || selectedCategorie ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
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
                <select
                  value={selectedCategorie}
                  onChange={(e) => setSelectedCategorie(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="" className="text-gray-800">Toutes les catégories</option>
                  {CATEGORIES_SERVICES.map(cat => (
                    <option key={cat} value={cat} className="text-gray-800">{cat}</option>
                  ))}
                </select>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Contenu */}
        <div className="p-4 pb-24">
          {/* Stats rapides */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 mb-4 border border-indigo-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total services</p>
                <p className="text-2xl font-bold text-indigo-700">{services.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Liste des services */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : servicesFiltres.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCategorie
                  ? 'Aucun service ne correspond à votre recherche'
                  : 'Vous n\'avez pas encore de services'}
              </p>
              {!searchTerm && !selectedCategorie && (
                <button
                  onClick={handleAddService}
                  className="px-6 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                >
                  Ajouter mon premier service
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {servicesFiltres.map((service, index) => (
                <CarteService
                  key={service.id_service}
                  service={service}
                  index={index}
                  onEdit={handleEditService}
                  onDelete={handleDeleteService}
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
          onClick={handleAddService}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all z-50"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      </div>

      {/* Modal Service */}
      <ModalService
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setServiceToEdit(null);
        }}
        onSuccess={handleModalSuccess}
        serviceToEdit={serviceToEdit}
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
