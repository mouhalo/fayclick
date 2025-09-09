'use client';

import { useState, useEffect } from 'react';
import { useAdaptiveNavigation } from '@/hooks/useAdaptiveNavigation';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WelcomeCard from '@/components/ui/WelcomeCard';
import AdvantageCard from '@/components/ui/AdvantageCard';
import LogoUpload from '@/components/ui/LogoUpload';
import ServiceCarousel from '@/components/ui/ServiceCarousel';
import SuccessModal from '@/components/ui/SuccessModal';
import { 
  StructureType, 
  RegistrationFormData, 
  VALIDATION_RULES,
  AdvantageItem,
  ServiceType,
  SERVICE_ICONS
} from '@/types/registration';
import LogoFayclick from '@/components/ui/LogoFayclick';
import { UploadResult, UploadProgress } from '@/types/upload.types';
import registrationService from '@/services/registration.service';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Hook pour la navigation adaptative intelligente
  const { navStyle, isVisible, spacerHeight, currentZone, scrollProgress } = useAdaptiveNavigation();
  const [structureTypes, setStructureTypes] = useState<StructureType[]>([]);
  const [formData, setFormData] = useState<RegistrationFormData>({
    // Étape 1: Bienvenue et nom du business
    businessName: '',
    
    // Étape 2: Configuration détaillée
    structureTypeId: 0,           // OBLIGATOIRE
    serviceType: 'SERVICES',      // OPTIONNEL, défaut: SERVICES
    phoneOM: '',
    phoneWave: '',
    address: '',
    logoUrl: '',                  // URL du logo uploadé
    
    // Étape 3: Récapitulatif et validation
    acceptTerms: false,
  });

  // Validation temps réel du nom de structure
  const validateBusinessName = (name: string) => {
    const length = name.trim().length;
    if (length === 0) return { isValid: false, message: '', status: 'empty' };
    if (length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH) {
      return { 
        isValid: false, 
        message: `Minimum ${VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH} caractères`, 
        status: 'too-short' 
      };
    }
    if (length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH) {
      return { 
        isValid: false, 
        message: `Maximum ${VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH} caractères`, 
        status: 'too-long' 
      };
    }
    return { isValid: true, message: 'Parfait ! ✓', status: 'valid' };
  };

  // État pour la validation temps réel
  const businessNameValidation = validateBusinessName(formData.businessName);
  
  // État pour l'upload de logo
  const [logoUploadState, setLogoUploadState] = useState({
    isUploaded: false,
    fileName: '',
    uploadProgress: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal de succès
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: '',
    login: '',
    password: '',
    structureName: ''
  });

  // Charger les types de structure
  useEffect(() => {
    fetchStructureTypes();
  }, []);

  const fetchStructureTypes = async () => {
    try {
      console.log('🔍 [DEBUG] Chargement des types de structure...');
      const types = await registrationService.getStructureTypes();
      console.log('✅ [DEBUG] Types chargés:', types);
      setStructureTypes(types);
      console.log('📊 [DEBUG] State structureTypes mis à jour:', types.length, 'éléments');
    } catch (error) {
      console.error('❌ [DEBUG] Erreur chargement types:', error);
      setError('Impossible de charger les types de structure');
    }
  };

  // Avantages FayClick
  const advantages: AdvantageItem[] = [
    { icon: '🚀', text: 'Inscription gratuite et rapide' },
    { icon: '💰', text: 'Paiement Orange Money instantané' },
    { icon: '🔒', text: 'Sécurisé et fiable' },
    { icon: '📊', text: 'Gestion complète de votre activité' },
    { icon: '📱', text: 'QR Code personnel pour vos clients' },
    { icon: '📈', text: 'Statistiques et rapports détaillés' }
  ];

  // Services désormais indépendants des types de structure
  const handleServiceSelect = (service: ServiceType) => {
    setFormData(prev => ({ ...prev, serviceType: service }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue = value;
    
    // Transformation spécifique pour le nom du business (majuscules)
    if (name === 'businessName') {
      processedValue = value.toUpperCase();
    }
    
    // Pour les numéros de téléphone (nettoyer)
    if (name === 'phoneOM' || name === 'phoneWave') {
      processedValue = value.replace(/\D/g, '');
      if (processedValue.length > VALIDATION_RULES.PHONE_LENGTH) {
        processedValue = processedValue.slice(0, VALIDATION_RULES.PHONE_LENGTH);
      }
    }

    // Type de structure (conversion en nombre)
    if (name === 'structureTypeId') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : processedValue,
    }));
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setError('');
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  // Callbacks pour l'upload de logo
  const handleLogoUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      setFormData(prev => ({ ...prev, logoUrl: result.url! }));
      setLogoUploadState({
        isUploaded: true,
        fileName: result.filename || 'logo.png',
        uploadProgress: 100
      });
      console.log('✅ [REGISTER] Logo uploadé avec succès:', result.url);
    }
  };

  const handleLogoUploadProgress = (progress: UploadProgress) => {
    setLogoUploadState(prev => ({
      ...prev,
      uploadProgress: progress.progress
    }));
  };

  const handleLogoFileSelect = (file: File) => {
    console.log('📁 [REGISTER] Fichier logo sélectionné:', file.name);
    setLogoUploadState(prev => ({
      ...prev,
      fileName: file.name,
      isUploaded: false
    }));
  };

  // Fonction pour réinitialiser complètement le formulaire
  const resetForm = () => {
    setFormData({
      businessName: '',
      structureTypeId: 0,
      serviceType: 'SERVICES',
      phoneOM: '',
      phoneWave: '',
      address: '',
      logoUrl: '',
      acceptTerms: false,
    });
    setLogoUploadState({
      isUploaded: false,
      fileName: '',
      uploadProgress: 0
    });
    setStep(1);
    setError('');
    console.log('🔄 Formulaire réinitialisé après inscription réussie');
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.businessName || formData.businessName.trim().length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH) {
          setError(`Nom du business requis (minimum ${VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH} caractères)`);
          return false;
        }
        break;
      case 2:
        // Validation type de structure
        if (!formData.structureTypeId || formData.structureTypeId <= 0) {
          setError('Veuillez sélectionner un type de structure');
          return false;
        }
        // serviceType est optionnel - pas de validation
        // Validation téléphone Orange Money
        if (!formData.phoneOM || !registrationService.validateSenegalMobileOM(formData.phoneOM)) {
          setError('Téléphone Orange Money invalide (9 chiffres, préfixes: 77, 78, 70, 76, 75)');
          return false;
        }
        // Validation adresse
        if (!formData.address || formData.address.trim().length === 0) {
          setError('Adresse requise');
          return false;
        }
        if (formData.address.length > VALIDATION_RULES.ADDRESS_MAX_LENGTH) {
          setError(`Adresse trop longue (maximum ${VALIDATION_RULES.ADDRESS_MAX_LENGTH} caractères)`);
          return false;
        }
        break;
      case 3:
        if (!formData.acceptTerms) {
          setError('Veuillez accepter les conditions générales');
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Préparation des données pour l'API
      const registrationData = {
        p_id_type: formData.structureTypeId,
        p_nom_structure: formData.businessName,
        p_adresse: formData.address,
        p_mobile_om: formData.phoneOM,
        p_mobile_wave: formData.phoneWave || '',
        p_nom_service: formData.serviceType || 'SERVICES',
        p_logo: formData.logoUrl || ''  // URL du logo uploadé (optionnel)
      };

      // Appel direct du service d'inscription
      const result = await registrationService.registerMerchant(registrationData);
      
      console.log('✅ Inscription réussie:', result);
      
      // Extraction des informations de login depuis le message
      const loginInfo = registrationService.extractLoginInfo(result.message);
      
      // Afficher le modal de succès
      setSuccessModal({
        isOpen: true,
        message: result.message,
        login: loginInfo.login || '',
        password: loginInfo.password || '0000',
        structureName: formData.businessName
      });

      // Réinitialiser le formulaire après inscription réussie
      resetForm();
      
    } catch (error) {
      console.error('❌ Erreur inscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 md:space-y-6">
            {/* Cartes de bienvenue et avantages */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
              <WelcomeCard
                title="Bienvenue sur FayClick !"
                description="Transformez votre business avec notre solution de paiement et gestion commerciale. Recevez des paiements Orange Money instantanément."
                icon="🎉"
                className="h-full"
              />
               {/* Champ nom du business */}
            <Card className="bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-2xl border border-green-200/30 shadow-2xl hover:shadow-green-500/20 transition-all duration-300 will-change-transform drop-shadow-[0_0_15px_rgba(34,197,94,0.15)] glass-card-3d green-glow-effect gpu-accelerated">
              <div className="p-3 md:p-6 lg:p-8">
                <label className="block text-gray-700 font-semibold mb-1.5 md:mb-3 text-sm md:text-base lg:text-lg">
                  Nom de votre business/entreprise/commerce <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className={`w-full px-2.5 md:px-4 py-2 md:py-3 lg:py-4 border rounded-xl focus:outline-none focus:ring-2 text-sm md:text-lg lg:text-xl font-semibold uppercase bg-gray-50 transition-all ${
                      businessNameValidation.status === 'valid' 
                        ? 'border-green-400 focus:ring-green-400 bg-green-50/50' 
                        : businessNameValidation.status === 'empty'
                        ? 'border-gray-300 focus:ring-primary-500'
                        : 'border-red-400 focus:ring-red-400 bg-red-50/50'
                    }`}
                    placeholder="NOM DE VOTRE COMMERCE"
                    maxLength={VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                    required
                  />
                  
                  {/* Indicateur visuel de validation */}
                  {formData.businessName && (
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                      businessNameValidation.isValid ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {businessNameValidation.isValid ? '✓' : '⚠'}
                    </div>
                  )}
                </div>
                
                {/* Message de validation et compteur */}
                <div className="space-y-1 mt-1 md:mt-2">
                  <div className={`text-xs font-medium ${
                    businessNameValidation.status === 'valid' 
                      ? 'text-green-600' 
                      : businessNameValidation.status === 'empty'
                      ? 'text-gray-500'
                      : 'text-red-600'
                  }`}>
                    {businessNameValidation.message}
                  </div>
                  <div className="text-xs text-gray-600">
                    Le nom doit contenir entre 5 et 20 caractères
                  </div>
                  <div className="flex justify-end">
                    <div className={`text-xs ${
                      formData.businessName.length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH * 0.8 
                        ? 'text-orange-600 font-medium' 
                        : 'text-gray-500'
                    }`}>
                      {formData.businessName.length}/{VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
              <AdvantageCard
                title="Avantages FayClick"
                advantages={advantages}
                icon="💎"
                className="h-full"
              />
            </div>

           
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 md:space-y-6">
            {/* Debug : Affichage des états */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                <strong>🔍 Debug Étape 2:</strong> 
                - structureTypes: {structureTypes.length} éléments
                - formData.structureTypeId: {formData.structureTypeId}
                - step: {step}
              </div>
            )}
            
            {/* Type de structure - Placé en premier et en dehors du grid pour garantir sa visibilité */}
            <Card className="bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-2xl border border-green-200/30 shadow-2xl hover:shadow-green-500/20 transition-all duration-300 will-change-transform drop-shadow-[0_0_15px_rgba(34,197,94,0.15)] glass-card-3d green-glow-effect gpu-accelerated">
              <div className="p-3 md:p-6">
                {/* Header avec icône */}
                <div className="flex items-center mb-2 md:mb-4">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-2 md:mr-3">
                    <span className="text-blue-500 text-sm md:text-lg">🏢</span>
                  </div>
                  <h3 className="text-sm md:text-lg font-semibold text-gray-800">
                    Type de structure <span className="text-red-500">*</span>
                  </h3>
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                    Obligatoire
                  </span>
                </div>
                
                <p className="text-gray-600 text-xs md:text-sm mb-3 md:mb-4">
                  Choisissez le type qui correspond à votre activité
                </p>
                
                <div>
                  <select
                    name="structureTypeId"
                    value={formData.structureTypeId}
                    onChange={handleChange}
                    className="w-full px-2.5 md:px-4 py-2 md:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm md:text-base transition-all bg-white"
                    required
                  >
                    <option value={0}>Sélectionnez un type de structure</option>
                    {structureTypes.map((type) => (
                      <option key={type.id_type} value={type.id_type}>
                        {type.nom_type}
                      </option>
                    ))}
                  </select>
                  
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-2 text-xs text-gray-500">
                      Debug: {structureTypes.length} types disponibles
                    </div>
                  )}
                </div>
              </div>
            </Card>
            
            {/* Layout pour Logo et Services : 2 colonnes sur desktop */}
            <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
              {/* Colonne gauche : Logo */}
              <div>
                {/* Upload de logo */}
                <LogoUpload 
                  onUploadComplete={handleLogoUploadComplete}
                  onUploadProgress={handleLogoUploadProgress}
                  onFileSelect={handleLogoFileSelect}
                />
              </div>

              {/* Colonne droite : Services */}
              <ServiceCarousel 
                selectedService={formData.serviceType as ServiceType}
                onServiceSelect={handleServiceSelect}
                className="h-full"
              />
            </div>
            
            {/* Configuration détaillée - Full width */}
            <Card className="bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-2xl border border-green-200/30 shadow-2xl hover:shadow-green-500/20 transition-all duration-300 will-change-transform drop-shadow-[0_0_15px_rgba(34,197,94,0.15)] glass-card-3d green-glow-effect gpu-accelerated">
              <div className="p-3 md:p-6 lg:p-8 space-y-3 md:space-y-6">
                <h3 className="text-sm md:text-lg lg:text-xl font-semibold text-gray-800 mb-2 md:mb-4">
                  Informations obligatoires
                </h3>

                {/* Layout responsive pour les champs */}
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  {/* Téléphone Orange Money */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1.5 md:mb-2 text-sm md:text-base">
                      Téléphone Orange Money <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 md:px-3 text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-xl text-xs md:text-sm">
                        +221
                      </span>
                      <input
                        type="tel"
                        name="phoneOM"
                        value={formData.phoneOM}
                        onChange={handleChange}
                        className="flex-1 px-2.5 md:px-4 py-2 md:py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm md:text-base transition-all"
                        placeholder="77 123 45 67"
                        maxLength={9}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Format: 77/78/70/76/75 XXX XX XX</p>
                  </div>

                  {/* Téléphone Wave Money (Optionnel) */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1.5 md:mb-2 text-sm md:text-base">
                      Téléphone Wave <span className="text-gray-400 text-xs">(optionnel)</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 md:px-3 text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-xl text-xs md:text-sm">
                        +221
                      </span>
                      <input
                        type="tel"
                        name="phoneWave"
                        value={formData.phoneWave || ''}
                        onChange={handleChange}
                        className="flex-1 px-2.5 md:px-4 py-2 md:py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm md:text-base transition-all"
                        placeholder="70 XXX XX XX"
                        maxLength={9}
                      />
                    </div>
                  </div>
                </div>

                {/* Adresse - Full width */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm md:text-base">
                    Adresse complète <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-2.5 md:px-4 py-2 md:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm md:text-base transition-all"
                    placeholder="Adresse complète de votre structure"
                    rows={3}
                    maxLength={VALIDATION_RULES.ADDRESS_MAX_LENGTH}
                    required
                  />
                  <div className="text-xs md:text-sm text-gray-500 mt-1">
                    {formData.address.length}/{VALIDATION_RULES.ADDRESS_MAX_LENGTH} caractères
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 md:space-y-6">
            {/* Récapitulatif */}
            <Card className="bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-2xl border border-green-200/30 shadow-2xl hover:shadow-green-500/20 transition-all duration-300 will-change-transform drop-shadow-[0_0_15px_rgba(34,197,94,0.15)] glass-card-3d green-glow-effect gpu-accelerated">
              <div className="p-3 md:p-6 lg:p-8">
                <h3 className="text-sm md:text-lg lg:text-xl font-semibold text-gray-800 mb-3 md:mb-6">
                  📋 Récapitulatif de votre inscription
                </h3>
                
                <div className="bg-gray-50 rounded-xl p-2.5 md:p-4 lg:p-6 space-y-1.5 md:space-y-3 mb-3 md:mb-6">
                  <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                    <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">Nom du business :</span>
                      <span className="text-xs md:text-sm lg:text-base font-semibold text-gray-800">{formData.businessName}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">Type de structure :</span>
                      <span className="text-xs md:text-sm lg:text-base font-semibold text-gray-800">
                        {structureTypes.find(t => t.id_type === formData.structureTypeId)?.nom_type || 'Non sélectionné'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">Service :</span>
                      <span className="text-xs md:text-sm lg:text-base font-semibold text-gray-800 flex items-center">
                        <span className="mr-2">{SERVICE_ICONS[formData.serviceType as ServiceType]}</span>
                        {formData.serviceType}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">Téléphone OM :</span>
                      <span className="text-xs md:text-sm lg:text-base font-semibold text-gray-800">+221 {formData.phoneOM}</span>
                    </div>
                  </div>
                  
                  {formData.phoneWave && (
                    <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">Téléphone Wave :</span>
                      <span className="text-xs md:text-sm lg:text-base font-semibold text-gray-800">+221 {formData.phoneWave}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start py-2">
                    <span className="text-xs md:text-sm font-medium text-gray-600">Adresse :</span>
                    <span className="text-xs md:text-sm lg:text-base font-semibold text-gray-800 text-right max-w-xs md:max-w-md">{formData.address}</span>
                  </div>
                  
                  {/* Affichage du logo uploadé */}
                  {logoUploadState.isUploaded && formData.logoUrl && (
                    <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-3">
                      <span className="text-xs font-medium text-gray-600">Logo :</span>
                      <div className="flex items-center">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mr-2">
                          ✓ Uploadé
                        </span>
                        <span className="text-xs md:text-sm font-semibold text-gray-800">{logoUploadState.fileName}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Acceptation des conditions */}
                <div className="border-t pt-4 md:pt-6">
                  <div className="flex items-start space-x-2 md:space-x-3">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                      className="mt-0.5 md:mt-1 w-4 h-4 md:w-5 md:h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <label htmlFor="acceptTerms" className="text-xs md:text-sm lg:text-base text-gray-700 leading-relaxed">
                      J&apos;accepte les{' '}
                      <a href="/terms" target="_blank" className="text-primary-600 hover:text-primary-700 font-medium underline">
                        conditions générales d&apos;utilisation
                      </a>{' '}
                      et les{' '}
                      <a href="/privacy" target="_blank" className="text-primary-600 hover:text-primary-700 font-medium underline">
                        termes de service
                      </a>{' '}
                      de FayClick.
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Layout Desktop */}
      <div className="min-h-screen bg-gradient-to-br from-green-50/95 via-white/90 to-emerald-50/95 backdrop-blur-3xl relative overflow-hidden drop-shadow-[0_0_30px_rgba(34,197,94,0.1)]">
        {/* Background Pattern pour desktop */}
        <div className="hidden lg:block absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-400/20 animate-gradient" />
        </div>

        {/* Container Responsive */}
        <div className="relative z-10 min-h-screen">
          <div className="lg:flex min-h-screen">
            
            {/* Panel Gauche - Header/Sidebar pour Desktop */}
            <div className="bg-gradient-to-br from-green-400/95 via-green-500/90 to-green-600/95 backdrop-blur-2xl relative overflow-hidden lg:w-[380px] xl:w-[420px] lg:flex-shrink-0 shadow-2xl border-r border-green-300/30 drop-shadow-[0_0_20px_rgba(34,197,94,0.25)]">
              {/* Pattern d'arrière-plan */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-sparkle" />
              </div>

              {/* Bouton Retour */}
              <button
                onClick={() => router.push('/')}
                className="absolute top-4 left-4 md:top-5 md:left-5 lg:top-8 lg:left-8 w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-all duration-300 z-20 shadow-xl hover:shadow-green-500/20 border border-white/20 will-change-transform hover:scale-105"
                title="Retour à l'accueil"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Contenu du header/sidebar */}
              <div className="flex flex-col justify-center items-center h-full text-center px-6 py-8 md:px-8 lg:px-8 xl:px-10 relative z-10">
                {/* Logo FayClick */}
                <div className="mx-auto mb-4 md:mb-6 lg:mb-6">
                  <LogoFayclick className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32" />
                </div>
                
                <h1 className="text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold text-white mb-2 md:mb-4">
                  Inscription Marchand
                </h1>
                <p className="text-white/90 text-sm md:text-base lg:text-base xl:text-lg mb-6 md:mb-8 lg:mb-8">
                  Rejoignez l&apos;écosystème FayClick
                </p>

                {/* Progress pour Desktop - Vertical */}
                <div className="lg:hidden flex items-center justify-center space-x-2 md:space-x-3 mb-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${step >= i ? 'bg-white' : 'bg-white/30'} flex items-center justify-center transition-all duration-300`}>
                        <span className={`font-bold text-sm md:text-base ${step >= i ? 'text-green-600' : 'text-white/70'}`}>{i}</span>
                      </div>
                      {i < 3 && <div className={`w-8 md:w-12 h-0.5 ${step > i ? 'bg-white' : 'bg-white/30'} transition-all duration-300`}></div>}
                    </div>
                  ))}
                </div>

                {/* Progress pour Desktop Uniquement - Vertical */}
                <div className="hidden lg:flex flex-col space-y-4 w-full max-w-sm">
                  {[
                    { num: 1, label: 'Informations de base' },
                    { num: 2, label: 'Configuration détaillée' },
                    { num: 3, label: 'Validation finale' }
                  ].map((item) => (
                    <div key={item.num} className="flex items-center space-x-3">
                      <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-full ${step >= item.num ? 'bg-white' : 'bg-white/30'} flex items-center justify-center transition-all duration-300 shadow-lg flex-shrink-0`}>
                        {step > item.num ? (
                          <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className={`font-bold text-base lg:text-lg ${step >= item.num ? 'text-green-600' : 'text-white/70'}`}>{item.num}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${step >= item.num ? 'text-white' : 'text-white/70'} transition-all duration-300`}>
                          Étape {item.num}
                        </p>
                        <p className={`text-xs ${step >= item.num ? 'text-white/90' : 'text-white/50'} transition-all duration-300 leading-tight`}>
                          {item.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="lg:hidden text-white/80 text-xs md:text-sm">
                  {step === 1 && 'Informations de base'}
                  {step === 2 && 'Configuration détaillée'}
                  {step === 3 && 'Validation finale'}
                </p>

                {/* Info additionnelle pour desktop */}
                <div className="hidden lg:block mt-auto pt-6 lg:pt-8">
                  <p className="text-white/70 text-sm">
                    Besoin d&apos;aide ?
                  </p>
                  <p className="text-white font-medium text-sm">
                    support@fayclick.net
                  </p>
                </div>
              </div>
            </div>

            {/* Panel Droit - Contenu pour Desktop */}
            <div className="flex-1 lg:flex-shrink lg:min-w-0">
              <main className="max-w-[380px] md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 xl:px-12 py-6 md:py-8 lg:py-12">
                
                {/* Header Mobile/Tablet (caché sur desktop car dans sidebar) */}
                <div className="lg:hidden mb-6 md:mb-8">
                  {/* Le header est déjà dans le panel gauche pour desktop */}
                </div>

                {/* Formulaire */}
                <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
                  
                  {/* Navigation adaptative mobile - Suit le scroll intelligemment */}
                  <div 
                    className={`lg:hidden fixed transition-opacity duration-300 ${
                      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    style={navStyle}
                  >
                    <div className="bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] border-t border-gray-200">
                      
                      <div className="px-4 py-3 safe-area-inset">
                        <div className="flex gap-3 max-w-lg mx-auto">
                          {step > 1 && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              onClick={prevStep}
                              className="flex-1 py-3 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-all duration-300 shadow-lg rounded-xl"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Précédent
                            </Button>
                          )}
                          <Button
                            type="submit"
                            variant={step === 3 ? "gradient" : "primary"}
                            size="lg"
                            loading={step === 3 && isLoading}
                            disabled={step === 1 && !businessNameValidation.isValid}
                            className={`${step === 1 ? 'w-full' : 'flex-1'} py-3 text-sm font-semibold transition-all duration-300 rounded-xl ${
                              step === 1 && !businessNameValidation.isValid
                                ? 'bg-gray-400 cursor-not-allowed opacity-60 text-white'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl'
                            }`}
                          >
                            {step === 3 
                              ? (isLoading ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Création...
                                </>
                              ) : '🚀 Créer ma structure') 
                              : (
                                <>
                                  Suivant
                                  <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </>
                              )
                            }
                          </Button>
                        </div>
                      </div>
                      
                      {/* Barre de progression intégrée */}
                      <div className="h-2 bg-gray-200 mx-4 mb-1 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${(step / 3) * 100}%` }}
                        />
                      </div>
                      
                      {/* Indicateur textuel de l'étape */}
                      <p className="text-xs text-gray-600 text-center pb-2">
                        Étape {step} sur 3
                      </p>
                    </div>
                  </div>
                  
                  {/* Spacer dynamique pour éviter que le contenu soit caché */}
                  <div className="lg:hidden" style={{ height: `${spacerHeight}px` }}></div>

                  {renderStep()}

                  {/* Message d'erreur */}
                  {error && (
                    <div className="mt-4 md:mt-6 bg-red-50 border border-red-200 text-red-700 px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                      </div>
                    </div>
                  )}

                  {/* Boutons de navigation desktop - EN BAS */}
                  <div className="hidden lg:flex mt-6 md:mt-8 gap-3 md:gap-4">
                    {step > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        onClick={prevStep}
                        className="flex-1 py-2.5 md:py-3 text-sm md:text-base"
                      >
                        Précédent
                      </Button>
                    )}
                    
                    <Button
                      type="submit"
                      variant={step === 3 ? "gradient" : "primary"}
                      size="lg"
                      loading={step === 3 && isLoading}
                      className={`${step === 1 ? 'w-full' : 'flex-1'} shadow-lg py-2.5 md:py-3 text-sm md:text-base`}
                    >
                      {step === 3 
                        ? (isLoading ? 'Création en cours...' : 'Créer ma structure') 
                        : 'Suivant'
                      }
                    </Button>
                  </div>
                </form>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de succès */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
        message={successModal.message}
        login={successModal.login}
        password={successModal.password}
        structureName={successModal.structureName}
      />
    </>
  );
}