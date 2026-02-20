'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Building2, 
  Save, 
  Loader2, 
  Users, 
  DollarSign, 
  Crown, 
  CreditCard,
  Edit3,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Settings,
  Shield,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import databaseService from '@/services/database.service';
import { authService } from '@/services/auth.service';
import PopMessage from '@/components/ui/PopMessage';
import { StructureDetails, CompleteAuthData } from '@/types/auth';
import LogoUpload from '@/components/ui/LogoUpload';
import { UploadResult, UploadProgress } from '@/types/upload.types';
import UsersManagement from '@/components/settings/UsersManagement';
import CategoriesManagement from '@/components/settings/CategoriesManagement';
import ModalPaiementAbonnement from '@/components/subscription/ModalPaiementAbonnement';
import SubscriptionHistory from '@/components/subscription/SubscriptionHistory';
import CurrentSubscriptionStatus from '@/components/subscription/CurrentSubscriptionStatus';
import subscriptionService from '@/services/subscription.service';
import { HistoriqueAbonnement, CurrentSubscriptionState, EtatAbonnement } from '@/types/subscription.types';

interface StructureData {
  id_structure: number;
  nom_structure: string;
  adresse: string;
  mobile_om: string;
  mobile_wave: string;
  mobile_free: string;
  email: string;
  logo: string;
  id_type: number;
  actif: boolean;
}

interface ValidationErrors {
  nom_structure?: string;
  adresse?: string;
  mobile_om?: string;
  email?: string;
}

interface RawStructureData {
  id_structure: number;
  nom_structure: string;
  adresse: string;
  mobile_om: string;
  mobile_wave: string;
  mobile_free: string;
  email: string;
  logo: string;
  id_type: number;
  actif: boolean;
  // État abonnement depuis get_une_structure() - objet complet avec jours_restants
  etat_abonnement?: EtatAbonnement | null;
  [key: string]: unknown;
}

interface AddEditStructureResponse {
  add_edit_structure?: string;
  [key: string]: unknown;
}

type TabId = 'general' | 'wallets' | 'users' | 'sales' | 'categories' | 'subscription';

// Règles de vente stockées en localStorage
interface SalesRules {
  creditAutorise: boolean;
  limiteCredit: number;
  acompteAutorise: boolean;
}

const SALES_RULES_KEY = 'fayclick_regles_ventes';

const DEFAULT_SALES_RULES: SalesRules = {
  creditAutorise: true,
  limiteCredit: 50000,
  acompteAutorise: true,
};

function getSalesRulesKey(idStructure: number): string {
  return `${SALES_RULES_KEY}_${idStructure}`;
}

function loadSalesRules(idStructure: number): SalesRules {
  try {
    const stored = localStorage.getItem(getSalesRulesKey(idStructure));
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SALES_RULES, ...parsed };
    }
  } catch (e) {
    console.warn('Erreur lecture règles ventes localStorage:', e);
  }
  return { ...DEFAULT_SALES_RULES };
}

function saveSalesRules(idStructure: number, rules: SalesRules): void {
  try {
    localStorage.setItem(getSalesRulesKey(idStructure), JSON.stringify(rules));
  } catch (e) {
    console.warn('Erreur sauvegarde règles ventes localStorage:', e);
  }
}

// Configuration des onglets avec les couleurs vert/orange
const TABS_CONFIG = [
  { 
    id: 'general' as TabId, 
    label: 'Infos Générales', 
    icon: Building2, 
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-600',
    iconColor: 'text-emerald-600'
  },
  { 
    id: 'wallets' as TabId, 
    label: 'Comptes Wallet', 
    icon: Wallet, 
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    iconColor: 'text-orange-600'
  },
  { 
    id: 'users' as TabId, 
    label: 'Utilisateurs', 
    icon: Users, 
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    iconColor: 'text-green-600'
  },
  { 
    id: 'sales' as TabId, 
    label: 'Règles Ventes', 
    icon: TrendingUp, 
    color: 'orange',
    gradient: 'from-amber-500 to-orange-600',
    iconColor: 'text-amber-600'
  },
  {
    id: 'categories' as TabId,
    label: 'Catégories',
    icon: Tag,
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    iconColor: 'text-orange-600'
  },
  {
    id: 'subscription' as TabId,
    label: 'Abonnement',
    icon: Crown,
    color: 'green',
    gradient: 'from-emerald-600 to-teal-600',
    iconColor: 'text-emerald-600'
  }
];

export default function StructureEditPage() {
  const router = useRouter();
  const { user, refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [structure, setStructure] = useState<StructureData>({
    id_structure: 0,
    nom_structure: '',
    adresse: '',
    mobile_om: '',
    mobile_wave: '',
    mobile_free: '',
    email: '',
    logo: '',
    id_type: 1,
    actif: true
  });
  const [originalStructure, setOriginalStructure] = useState<StructureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [subscriptionCode, setSubscriptionCode] = useState('');
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

  const [logoUploadState, setLogoUploadState] = useState({
    isUploaded: false,
    fileName: '',
    uploadProgress: 0
  });

  // États règles de vente
  const [salesRules, setSalesRules] = useState<SalesRules>(DEFAULT_SALES_RULES);

  // États abonnements
  const [showModalAbonnement, setShowModalAbonnement] = useState(false);
  const [historiqueAbonnements, setHistoriqueAbonnements] = useState<HistoriqueAbonnement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentStructureData, setCurrentStructureData] = useState<RawStructureData | null>(null);

  useEffect(() => {
    const loadStructureData = async () => {
      if (!user?.id_structure) {
        router.push('/dashboard');
        return;
      }

      try {
        setIsLoading(true);
        const data = await databaseService.getStructureDetails(user.id_structure);

        if (data && data.length > 0) {
          const structureData = data[0] as RawStructureData;

          // Stocker les données complètes pour les infos d'abonnement
          setCurrentStructureData(structureData);

          const mappedStructure: StructureData = {
            id_structure: structureData.id_structure || user.id_structure,
            nom_structure: structureData.nom_structure || '',
            adresse: structureData.adresse || '',
            mobile_om: structureData.mobile_om || '',
            mobile_wave: structureData.mobile_wave || '',
            mobile_free: structureData.mobile_free || '',
            email: structureData.email || '',
            logo: structureData.logo || '',
            id_type: structureData.id_type || 1,
            actif: structureData.actif !== false
          };

          setStructure(mappedStructure);
          setOriginalStructure(mappedStructure);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la structure:', error);
        if (user.id_structure) {
          const fallbackStructure: StructureData = {
            id_structure: user.id_structure,
            nom_structure: user.username || '',
            adresse: '',
            mobile_om: '',
            mobile_wave: '',
            mobile_free: '',
            email: '',
            logo: '',
            id_type: 1,
            actif: true
          };
          setStructure(fallbackStructure);
          setOriginalStructure(fallbackStructure);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStructureData();
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (activeTab === 'general') {
      if (!structure.nom_structure.trim()) {
        newErrors.nom_structure = 'Le nom de la structure est requis';
      }
      if (!structure.adresse.trim()) {
        newErrors.adresse = 'L\'adresse est requise';
      }
      if (structure.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(structure.email)) {
        newErrors.email = 'Format d\'email invalide';
      }
    }

    if (activeTab === 'wallets') {
      if (!structure.mobile_om.trim()) {
        newErrors.mobile_om = 'Le numéro Orange Money est requis';
      } else if (!/^\d{9}$/.test(structure.mobile_om)) {
        newErrors.mobile_om = 'Le numéro Orange Money doit contenir 9 chiffres';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showMessage('warning', firstError, 'Veuillez corriger les erreurs');
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !user?.id_structure) return;

    try {
      setIsSaving(true);
      
      const result = await databaseService.updateStructure({
        id_structure: structure.id_structure,
        id_type: structure.id_type,
        nom_structure: structure.nom_structure,
        adresse: structure.adresse,
        mobile_om: structure.mobile_om,
        mobile_wave: structure.mobile_wave,
        mobile_free: structure.mobile_free,
        email: structure.email,
        logo: structure.logo
      });

      if (result && result.length > 0) {
        const response = result[0] as AddEditStructureResponse;
        let message = 'Structure mise à jour avec succès !';
        
        if (typeof response === 'object' && response.add_edit_structure) {
          message = response.add_edit_structure;
        } else if (typeof response === 'string') {
          message = response;
        }
        
        showMessage('success', message, 'Sauvegarde réussie');
      }

      setOriginalStructure({ ...structure });

      try {
        const currentUser = authService.getUser();
        if (currentUser) {
          const updatedStructureData = await databaseService.getStructureDetails(structure.id_structure);
          if (updatedStructureData && updatedStructureData.length > 0) {
            const updatedStructure = updatedStructureData[0] as RawStructureData;
            const currentAuthData = authService.getCompleteAuthData();
            
            if (currentAuthData) {
              const structureDetails: StructureDetails = {
                ...currentAuthData.structure,
                nom_structure: updatedStructure.nom_structure,
                adresse: updatedStructure.adresse,
                mobile_om: updatedStructure.mobile_om,
                mobile_wave: updatedStructure.mobile_wave,
                email: updatedStructure.email,
                logo: updatedStructure.logo,
                created_at: currentAuthData.structure.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              const completeData: CompleteAuthData = {
                ...currentAuthData,
                structure: structureDetails
              };
              authService.saveCompleteAuthData(completeData);
            }
          }
        }
      } catch (refreshError) {
        console.warn('⚠️ Impossible de rafraîchir les données utilisateur:', refreshError);
      }

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      let errorMessage = 'Impossible de sauvegarder les modifications.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      showMessage('error', errorMessage, 'Erreur de sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      // Vérifier que l'URL n'est PAS une data URL
      if (result.url.startsWith('data:')) {
        console.error('❌ [SETTINGS] URL est une data URL (upload serveur a échoué)');
        alert('Erreur: L\'upload vers le serveur a échoué. Veuillez réessayer.');
        return;
      }

      // Vérifier que l'URL est bien une URL HTTP(S)
      if (!result.url.startsWith('http://') && !result.url.startsWith('https://')) {
        console.error('❌ [SETTINGS] URL invalide:', result.url);
        alert('Erreur: URL de l\'image invalide. Veuillez réessayer.');
        return;
      }

      setStructure(prev => ({ ...prev, logo: result.url! }));
      setLogoUploadState({
        isUploaded: true,
        fileName: result.filename || 'logo.png',
        uploadProgress: 100
      });
    }
  };

  const handleLogoUploadProgress = (progress: UploadProgress) => {
    setLogoUploadState(prev => ({
      ...prev,
      uploadProgress: progress.progress
    }));
  };

  const handleLogoFileSelect = (file: File) => {
    setLogoUploadState(prev => ({
      ...prev,
      fileName: file.name,
      isUploaded: false
    }));
  };

  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  // Charger les règles de vente depuis localStorage
  useEffect(() => {
    if (user?.id_structure) {
      setSalesRules(loadSalesRules(user.id_structure));
    }
  }, [user?.id_structure]);

  // Charger l'historique des abonnements quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'subscription' && user?.id_structure) {
      loadSubscriptionHistory();
    }
  }, [activeTab, user?.id_structure]);

  // Fonction pour charger l'historique
  const loadSubscriptionHistory = async () => {
    if (!user?.id_structure) return;

    setIsLoadingHistory(true);
    try {
      const response = await subscriptionService.getHistory({
        id_structure: user.id_structure,
        limite: 10
      });

      if (response.success && response.data) {
        setHistoriqueAbonnements(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handlers abonnement
  const handleSubscriptionSuccess = () => {
    showMessage('success', 'Abonnement activé avec succès !');
    loadSubscriptionHistory();
    // Rafraîchir le contexte global d'auth (propage l'état abonnement partout)
    refreshAuth();
    // Recharger les données de la structure pour mettre à jour l'état local
    if (user?.id_structure) {
      databaseService.getStructureDetails(user.id_structure).then((data) => {
        if (data && data.length > 0) {
          const structureData = data[0] as RawStructureData;

          // Mettre à jour les données complètes d'abonnement
          setCurrentStructureData(structureData);

          const mappedStructure: StructureData = {
            id_structure: structureData.id_structure || user.id_structure,
            nom_structure: structureData.nom_structure || '',
            adresse: structureData.adresse || '',
            mobile_om: structureData.mobile_om || '',
            mobile_wave: structureData.mobile_wave || '',
            mobile_free: structureData.mobile_free || '',
            email: structureData.email || '',
            logo: structureData.logo || '',
            id_type: structureData.id_type || 1,
            actif: structureData.actif !== false
          };
          setStructure(mappedStructure);
          setOriginalStructure(mappedStructure);
        }
      });
    }
  };

  const handleSubscriptionError = (message: string) => {
    showMessage('error', message || 'Erreur lors de l\'abonnement');
  };

  // Mise à jour des règles de vente avec sauvegarde localStorage
  const updateSalesRules = (updates: Partial<SalesRules>) => {
    if (!user?.id_structure) return;
    const newRules = { ...salesRules, ...updates };
    setSalesRules(newRules);
    saveSalesRules(user.id_structure, newRules);
  };

  // Fonction wrapper pour les composants enfants (utilisée par UsersManagement)
  const showPopMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    showMessage(type, message);
  };

  const hasChanges = originalStructure && (
    structure.nom_structure !== originalStructure.nom_structure ||
    structure.adresse !== originalStructure.adresse ||
    structure.mobile_om !== originalStructure.mobile_om ||
    structure.mobile_wave !== originalStructure.mobile_wave ||
    structure.mobile_free !== originalStructure.mobile_free ||
    structure.email !== originalStructure.email ||
    structure.logo !== originalStructure.logo
  );

  const getActiveTabConfig = () => {
    return TABS_CONFIG.find(tab => tab.id === activeTab);
  };

  const activeTabConfig = getActiveTabConfig();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-10 w-10 animate-spin text-green-600" />
          </div>
          <p className="text-gray-700 text-lg font-medium">Chargement des informations...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec gradient vert */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500 to-emerald-600 relative overflow-hidden"
      >
        {/* Pattern décoratif */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white rounded-full"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-400 rounded-full"></div>
        </div>

        <div className="relative p-6 pb-8">
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 p-2.5 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 group"
          >
            <ArrowLeft className="h-5 w-5 text-white group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl"
            >
              <Settings className="h-10 w-10 text-orange-500" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
            <p className="text-white/90 font-medium">Configuration de votre structure</p>
          </div>
        </div>

        {/* Navigation onglets intégrée dans le header */}
        <div className="px-4 pb-2">
          <div className="flex gap-1 p-1 bg-white/10 backdrop-blur-sm rounded-xl">
            {TABS_CONFIG.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                    font-medium transition-all duration-300 relative overflow-hidden
                    ${isActive 
                      ? 'bg-white text-gray-800 shadow-lg' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-orange-400/20"
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                  )}
                  <Icon className={`h-4 w-4 relative z-10 ${isActive ? tab.iconColor : ''}`} />
                  <span className="text-sm relative z-10 hidden sm:inline">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Contenu des onglets avec animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header de l'onglet actif */}
            <div className={`bg-gradient-to-r ${activeTabConfig?.gradient} p-6`}>
              <div className="flex items-center gap-3">
                {activeTabConfig && <activeTabConfig.icon className="h-6 w-6 text-white" />}
                <h2 className="text-xl font-bold text-white">{activeTabConfig?.label}</h2>
              </div>
            </div>

            <div className="p-6">
              {/* Onglet Infos générales */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Logo de la structure */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col sm:flex-row gap-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200"
                  >
                    <div className="flex-shrink-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Logo de la structure</label>
                      <LogoUpload 
                        onUploadComplete={handleLogoUploadComplete}
                        onUploadProgress={handleLogoUploadProgress}
                        onFileSelect={handleLogoFileSelect}
                        initialPreview={structure.logo}
                      />
                      {logoUploadState.isUploaded && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-3 flex items-center text-sm"
                        >
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
                            <Check className="h-4 w-4" />
                            <span className="font-medium">Uploadé</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Image de marque</h3>
                        <p className="text-sm text-gray-600">Votre logo apparaîtra sur vos factures et documents.</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Informations de base */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Building2 className="h-4 w-4 text-green-600" />
                      Nom de la structure *
                    </label>
                    <input
                      type="text"
                      value={structure.nom_structure}
                      onChange={(e) => setStructure({ ...structure, nom_structure: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        errors.nom_structure ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                      } focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
                      placeholder="Nom de votre structure"
                    />
                    {errors.nom_structure && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        {errors.nom_structure}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      Adresse *
                    </label>
                    <textarea
                      value={structure.adresse}
                      onChange={(e) => setStructure({ ...structure, adresse: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        errors.adresse ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                      } focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none`}
                      placeholder="Adresse complète de votre structure"
                    />
                    {errors.adresse && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        {errors.adresse}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Mail className="h-4 w-4 text-green-600" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={structure.email}
                      onChange={(e) => setStructure({ ...structure, email: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                      } focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
                      placeholder="email@exemple.com"
                    />
                    {errors.email && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        {errors.email}
                      </motion.p>
                    )}
                  </motion.div>
                </div>
              )}

              {/* Onglet Comptes Wallet */}
              {activeTab === 'wallets' && (
                <div className="space-y-6">
                  {/* Card Orange Money */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Orange Money</h3>
                        <p className="text-sm text-gray-600">Compte de réception principal</p>
                      </div>
                    </div>
                    <input
                      type="tel"
                      value={structure.mobile_om}
                      onChange={(e) => setStructure({ ...structure, mobile_om: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        errors.mobile_om ? 'border-red-300 bg-red-50' : 'border-orange-200 bg-white'
                      } focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-lg font-medium`}
                      placeholder="77 123 45 67"
                      maxLength={9}
                    />
                    {errors.mobile_om && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        {errors.mobile_om}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Card Wave */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Wave</h3>
                        <p className="text-sm text-gray-600">Compte secondaire</p>
                      </div>
                    </div>
                    <input
                      type="tel"
                      value={structure.mobile_wave}
                      onChange={(e) => setStructure({ ...structure, mobile_wave: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg font-medium"
                      placeholder="70 987 65 43"
                      maxLength={9}
                    />
                  </motion.div>

                  {/* Card Free Money */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Free Money</h3>
                        <p className="text-sm text-gray-600">Compte alternatif</p>
                      </div>
                    </div>
                    <input
                      type="tel"
                      value={structure.mobile_free}
                      onChange={(e) => setStructure({ ...structure, mobile_free: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-green-200 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-lg font-medium"
                      placeholder="76 456 78 90"
                      maxLength={9}
                    />
                  </motion.div>
                </div>
              )}

              {/* Onglet Gestion utilisateurs */}
              {activeTab === 'users' && (
                <UsersManagement onShowMessage={showPopMessage} />
              )}

              {/* Onglet Règles ventes */}
              {activeTab === 'sales' && (
                <div className="space-y-6">
                  {/* Crédit autorisé */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">Crédit autorisé</h3>
                          <p className="text-sm text-gray-600">Permettre aux clients d&apos;acheter à crédit</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={salesRules.creditAutorise}
                          onChange={(e) => updateSalesRules({ creditAutorise: e.target.checked })}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  </motion.div>

                  {/* Limite crédit */}
                  {salesRules.creditAutorise && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-6 bg-white rounded-xl border-2 border-gray-200"
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Limite maximum de crédit</label>
                      <p className="text-sm text-gray-600 mb-4">Montant maximum autorisé en crédit par client</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={salesRules.limiteCredit}
                          onChange={(e) => updateSalesRules({ limiteCredit: Math.max(0, Number(e.target.value)) })}
                          min={0}
                          step={1000}
                          className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-medium"
                        />
                        <span className="text-gray-600 font-medium">FCFA</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Acompte autorisé */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">Acompte autorisé</h3>
                          <p className="text-sm text-gray-600">Permettre les paiements par acompte</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={salesRules.acompteAutorise}
                          onChange={(e) => updateSalesRules({ acompteAutorise: e.target.checked })}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Onglet Catégories */}
              {activeTab === 'categories' && (
                <CategoriesManagement onShowMessage={showPopMessage} />
              )}

              {/* Onglet Abonnement */}
              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  {/* Section 1: Choix formule - Bouton unique pour ouvrir le modal */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <button
                      onClick={() => setShowModalAbonnement(true)}
                      className="w-full p-6 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                            <Crown className="w-7 h-7 text-white" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-xl font-bold mb-1">Souscrire un abonnement</h3>
                            <p className="text-sm text-emerald-50">
                              Choisissez entre MENSUEL et ANNUEL
                            </p>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </motion.div>

                  {/* Section 2: État actuel abonnement - données depuis get_une_structure() */}
                  <CurrentSubscriptionStatus
                    subscription={{
                      etat_abonnement: currentStructureData?.etat_abonnement?.statut || 'EXPIRE',
                      date_limite_abonnement: currentStructureData?.etat_abonnement?.date_fin || '',
                      type_abonnement: currentStructureData?.etat_abonnement?.type_abonnement || null,
                      jours_restants: currentStructureData?.etat_abonnement?.jours_restants,
                      id_abonnement: currentStructureData?.etat_abonnement?.id_abonnement,
                      montant: currentStructureData?.etat_abonnement?.montant,
                      methode: currentStructureData?.etat_abonnement?.methode
                    } as CurrentSubscriptionState}
                  />

                  {/* Section 3: Historique */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <SubscriptionHistory
                      historique={historiqueAbonnements}
                      isLoading={isLoadingHistory}
                    />
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions fixes en bas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex justify-end gap-3"
        >
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg ${
              hasChanges && !isSaving
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-400 cursor-not-allowed opacity-60'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Sauvegarder les modifications
              </>
            )}
          </button>
        </motion.div>

        <PopMessage
          show={popMessage.show}
          type={popMessage.type}
          title={popMessage.title}
          message={popMessage.message}
          onClose={() => setPopMessage({ ...popMessage, show: false })}
        />

        {/* Modal Paiement Abonnement */}
        {user && (
          <ModalPaiementAbonnement
            isOpen={showModalAbonnement}
            onClose={() => setShowModalAbonnement(false)}
            idStructure={user.id_structure}
            nomStructure={structure.nom_structure}
            telStructure={structure.mobile_om || structure.mobile_wave || ''}
            onSuccess={handleSubscriptionSuccess}
            onError={handleSubscriptionError}
          />
        )}
      </div>
    </div>
  );
}