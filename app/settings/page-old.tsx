'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Save, Loader2, Users, DollarSign, Crown, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import databaseService from '@/services/database.service';
import { authService } from '@/services/auth.service';
import PopMessage from '@/components/ui/PopMessage';
import { StructureDetails, CompleteAuthData } from '@/types/auth';
import LogoUpload from '@/components/ui/LogoUpload';
import { UploadResult, UploadProgress } from '@/types/upload.types';

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

// Interface pour les données brutes de structure depuis la DB
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
  [key: string]: unknown; // Pour les propriétés supplémentaires
}

// Interface pour la réponse de la fonction add_edit_structure
interface AddEditStructureResponse {
  add_edit_structure?: string;
  [key: string]: unknown;
}

type TabId = 'general' | 'wallets' | 'users' | 'sales' | 'subscription';

export default function StructureEditPage() {
  const router = useRouter();
  const { user } = useAuth();
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

  // État pour l'upload de logo (comme dans register)
  const [logoUploadState, setLogoUploadState] = useState({
    isUploaded: false,
    fileName: '',
    uploadProgress: 0
  });

  const tabs = [
    { id: 'general' as TabId,  icon: Building2, color: 'text-blue-600' },
    { id: 'wallets' as TabId,  icon: CreditCard, color: 'text-orange-600' },
    { id: 'users' as TabId,  icon: Users, color: 'text-purple-600' },
    { id: 'sales' as TabId,  icon: DollarSign, color: 'text-green-600' },
    { id: 'subscription' as TabId,  icon: Crown, color: 'text-yellow-600' }
  ];

  // Données fictives pour les utilisateurs
  const mockUsers = [
    { id: 'AD', name: 'Aminata Diallo', role: 'GÉRANT PRINCIPAL', phone: '77 123 45 67', access: 'Accès complet', created: '15/01/2025' },
    { id: 'MF', name: 'Moussa Fall', role: 'CAISSIER', phone: '70 987 65 43', access: 'Ventes uniquement', created: '20/01/2025' },
    { id: 'FK', name: 'Fatou Kane', role: 'CAISSIER', phone: '76 456 78 90', access: 'Ventes uniquement', created: '22/01/2025' }
  ];

  // Données fictives pour l'historique des abonnements
  const mockSubscriptions = [
    { period: 'Janvier 2025', amount: 15000, status: 'Payé' },
    { period: 'Décembre 2024', amount: 15000, status: 'Payé' },
    { period: 'Novembre 2024', amount: 15000, status: 'Payé' },
    { period: 'Octobre 2024', amount: 15000, status: 'Payé' }
  ];

  // Récupération des données
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
      
      console.log('🔄 Mise à jour de la structure...');

      // Utilisation de la méthode dédiée updateStructure
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

      console.log('✅ Résultat mise à jour:', result);

      // La fonction retourne un message de confirmation
      if (result && result.length > 0) {
        const response = result[0] as AddEditStructureResponse;
        let message = 'Structure mise à jour avec succès !';
        
        // Extraire le message de retour de la fonction
        if (typeof response === 'object' && response.add_edit_structure) {
          message = response.add_edit_structure;
        } else if (typeof response === 'string') {
          message = response;
        }
        
        showMessage('success', message, 'Sauvegarde réussie');
      } else {
        showMessage('success', 'Structure mise à jour avec succès !', 'Sauvegarde réussie');
      }

      // Mettre à jour la structure originale
      setOriginalStructure({ ...structure });

      // Rafraîchir les données utilisateur si la méthode existe
      try {
        const currentUser = authService.getUser();
        if (currentUser) {
          // Recharger les données de structure depuis la base
          const updatedStructureData = await databaseService.getStructureDetails(structure.id_structure);
          if (updatedStructureData && updatedStructureData.length > 0) {
            console.log('✅ Données de structure rafraîchies');
            
            // Optionnel: Mettre à jour le localStorage avec les nouvelles données
            const updatedStructure = updatedStructureData[0] as RawStructureData;
            const currentAuthData = authService.getCompleteAuthData();
            
            // Sauvegarder les données mises à jour uniquement si des données d'auth existent
            if (currentAuthData) {
              const structureDetails: StructureDetails = {
                ...currentAuthData.structure,
                nom_structure: updatedStructure.nom_structure,
                adresse: updatedStructure.adresse,
                mobile_om: updatedStructure.mobile_om,
                mobile_wave: updatedStructure.mobile_wave,
                email: updatedStructure.email,
                logo: updatedStructure.logo,
                // Assurer que created_at et updated_at sont présents (types requis en string)
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
        // Ne pas faire échouer la sauvegarde pour cette erreur
      }

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      let errorMessage = 'Impossible de sauvegarder les modifications. Veuillez réessayer.';
      
      if (error instanceof Error) {
        if (error.message.includes('n\'existe pas dans la table type_structure')) {
          errorMessage = 'Type de structure invalide. Contactez l\'administrateur.';
        } else if (error.message.includes('Aucune structure trouvée')) {
          errorMessage = 'Structure non trouvée. Rechargez la page et réessayez.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showMessage('error', errorMessage, 'Erreur de sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Callbacks pour l'upload de logo (comme dans register)
  const handleLogoUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      setStructure(prev => ({ ...prev, logo: result.url! }));
      setLogoUploadState({
        isUploaded: true,
        fileName: result.filename || 'logo.png',
        uploadProgress: 100
      });
      console.log('✅ [SETTINGS] Logo uploadé avec succès:', result.url);
    }
  };

  const handleLogoUploadProgress = (progress: UploadProgress) => {
    setLogoUploadState(prev => ({
      ...prev,
      uploadProgress: progress.progress
    }));
  };

  const handleLogoFileSelect = (file: File) => {
    console.log('📁 [SETTINGS] Fichier logo sélectionné:', file.name);
    setLogoUploadState(prev => ({
      ...prev,
      fileName: file.name,
      isUploaded: false
    }));
  };

  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/80">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header avec design similaire aux images */}
      <div className="bg-gradient-to-r from-slate-800 to-purple-800 p-4 text-center relative">
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Paramètres</h1>
        <p className="text-white/80">Configuration du compte</p>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Onglets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-4 overflow-x-auto"
        >
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${activeTab === tab.id ? tab.color : ''}`} />
                 
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Contenu des onglets */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/95 backdrop-blur-sm rounded-lg p-4 mb-4"
        >
          {/* Onglet Infos générales */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
              
              {/* Logo de la structure avec LogoUpload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la structure</label>
                <LogoUpload 
                  onUploadComplete={handleLogoUploadComplete}
                  onUploadProgress={handleLogoUploadProgress}
                  onFileSelect={handleLogoFileSelect}
                  initialPreview={structure.logo}
                />
                {/* Affichage du statut d'upload si un logo est uploadé */}
                {logoUploadState.isUploaded && (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-2">
                      ✓ Uploadé
                    </span>
                    <span className="text-gray-600">{logoUploadState.fileName}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la structure *</label>
                <input
                  type="text"
                  value={structure.nom_structure}
                  onChange={(e) => setStructure({ ...structure, nom_structure: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md border ${errors.nom_structure ? 'border-red-300' : 'border-gray-300'} bg-white/80 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                  placeholder="Nom de votre structure"
                />
                {errors.nom_structure && <p className="mt-1 text-sm text-red-600">{errors.nom_structure}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse *</label>
                <textarea
                  value={structure.adresse}
                  onChange={(e) => setStructure({ ...structure, adresse: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-md border ${errors.adresse ? 'border-red-300' : 'border-gray-300'} bg-white/80 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none`}
                  placeholder="Adresse complète"
                />
                {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={structure.email}
                  onChange={(e) => setStructure({ ...structure, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md border ${errors.email ? 'border-red-300' : 'border-gray-300'} bg-white/80 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                  placeholder="email@exemple.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>
          )}

          {/* Onglet N° Compte Wallet */}
          {activeTab === 'wallets' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Comptes de réception</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orange Money</label>
                <p className="text-sm text-gray-600 mb-2">Numéro qui recevra les paiements Orange Money</p>
                <input
                  type="tel"
                  value={structure.mobile_om}
                  onChange={(e) => setStructure({ ...structure, mobile_om: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className={`w-full px-3 py-2 rounded-md border ${errors.mobile_om ? 'border-red-300' : 'border-gray-300'} bg-white/80 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200`}
                  placeholder="77 123 45 67"
                  maxLength={9}
                />
                {errors.mobile_om && <p className="mt-1 text-sm text-red-600">{errors.mobile_om}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wave</label>
                <p className="text-sm text-gray-600 mb-2">Numéro qui recevra les paiements Wave</p>
                <input
                  type="tel"
                  value={structure.mobile_wave}
                  onChange={(e) => setStructure({ ...structure, mobile_wave: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white/80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="70 987 65 43"
                  maxLength={9}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Free Money</label>
                <p className="text-sm text-gray-600 mb-2">Numéro qui recevra les paiements Free Money</p>
                <input
                  type="tel"
                  value={structure.mobile_free}
                  onChange={(e) => setStructure({ ...structure, mobile_free: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white/80 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="76 456 78 90"
                  maxLength={9}
                />
              </div>
            </div>
          )}

          {/* Onglet Gestion utilisateurs */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Comptes utilisateurs</h2>
              
              <div className="space-y-3">
                {mockUsers.map((user, index) => (
                  <div key={user.id} className={`p-3 rounded-lg border-2 ${index === 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-orange-500' : 'bg-gray-500'}`}>
                        {user.id}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.role}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>📞 {user.phone}</span>
                          <span>• {user.access}</span>
                          <span>• Créé le {user.created}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                        <button className="p-2 text-orange-600 hover:bg-orange-50 rounded">💰</button>
                        {index > 0 && <button className="p-2 text-red-600 hover:bg-red-50 rounded">🗑️</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Onglet Gestion Règles ventes */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestion des ventes</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">Crédit autorisé</h3>
                    <p className="text-sm text-gray-600">Permettre aux clients d&apos;acheter à crédit</p>
                  </div>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={true} readOnly />
                    <div className="w-12 h-6 bg-green-500 rounded-full shadow-inner">
                      <div className="w-6 h-6 bg-white rounded-full shadow transform translate-x-6 transition-transform"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Limite max crédit</label>
                  <p className="text-sm text-gray-600 mb-2">Montant maximum autorisé en crédit par client</p>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={50000}
                      className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white/80"
                      readOnly
                    />
                    <span className="ml-2 text-gray-600">FCFA</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">Acompte autorisé</h3>
                    <p className="text-sm text-gray-600">Permettre les paiements par acompte</p>
                  </div>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={true} readOnly />
                    <div className="w-12 h-6 bg-green-500 rounded-full shadow-inner">
                      <div className="w-6 h-6 bg-white rounded-full shadow transform translate-x-6 transition-transform"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Formule Abonnement */}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Formule Abonnement</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code d&apos;activation</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subscriptionCode}
                    onChange={(e) => setSubscriptionCode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white/80 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Saisir le code d'activation"
                  />
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                    Activer
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Historique des abonnements</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Mois + Année</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Montant</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockSubscriptions.map((sub, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="px-3 py-2 text-sm text-gray-900">{sub.period}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{sub.amount.toLocaleString()} FCFA</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-white/30 rounded-md text-white bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center gap-2 ${
              hasChanges && !isSaving
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Sauvegarder
              </>
            )}
          </button>
        </div>

        <PopMessage
          show={popMessage.show}
          type={popMessage.type}
          title={popMessage.title}
          message={popMessage.message}
          onClose={() => setPopMessage({ ...popMessage, show: false })}
        />
      </div>
    </div>
  );
}