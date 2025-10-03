'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Phone,
  MapPin,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Home
} from 'lucide-react';
import {
  StructureType,
  RegistrationFormData,
  VALIDATION_RULES,
  ServiceType,
  SERVICE_ICONS
} from '@/types/registration';
import LogoFayclick from '@/components/ui/LogoFayclick';
import { UploadResult, UploadProgress } from '@/types/upload.types';
import registrationService from '@/services/registration.service';
import SuccessModal from '@/components/ui/SuccessModal';
import LogoUpload from '@/components/ui/LogoUpload';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslations } from '@/hooks/useTranslations';

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations('register');
  const tCommon = useTranslations('common');
  const [step, setStep] = useState(1);
  const [structureTypes, setStructureTypes] = useState<StructureType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [formData, setFormData] = useState<RegistrationFormData>({
    businessName: '',
    structureTypeId: 0,
    serviceType: 'SERVICES',
    phoneOM: '',
    phoneWave: '',
    address: '',
    logoUrl: '',
    acceptTerms: false,
  });

  // Validation states
  const [nameCheckState, setNameCheckState] = useState<{
    checking: boolean;
    exists: boolean | null;
  }>({
    checking: false,
    exists: null
  });

  const [logoUploadState, setLogoUploadState] = useState({
    isUploaded: false,
    fileName: '',
    uploadProgress: 0
  });

  // Success modal
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: '',
    login: '',
    password: '',
    structureName: ''
  });

  // Refs for auto-focus
  const businessNameRef = useRef<HTMLInputElement>(null);
  const structureTypeRef = useRef<HTMLSelectElement>(null);

  // Load structure types
  useEffect(() => {
    fetchStructureTypes();
  }, []);

  // Auto-focus on step change
  useEffect(() => {
    if (step === 1 && businessNameRef.current) {
      setTimeout(() => businessNameRef.current?.focus(), 100);
    } else if (step === 2 && structureTypeRef.current) {
      setTimeout(() => structureTypeRef.current?.focus(), 100);
    }
  }, [step]);

  // Check structure name with debouncing
  useEffect(() => {
    const checkStructureName = async () => {
      const trimmedName = formData.businessName.trim();

      if (
        trimmedName.length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH ||
        trimmedName.length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH
      ) {
        setNameCheckState({ checking: false, exists: null });
        return;
      }

      setNameCheckState({ checking: true, exists: null });

      try {
        const exists = await registrationService.checkStructureNameExists(trimmedName);
        setNameCheckState({ checking: false, exists });
      } catch (error) {
        console.error('Erreur vérification nom structure:', error);
        setNameCheckState({ checking: false, exists: null });
      }
    };

    const timeoutId = setTimeout(checkStructureName, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.businessName]);

  const fetchStructureTypes = async () => {
    try {
      const types = await registrationService.getStructureTypes();
      setStructureTypes(types);
    } catch (error) {
      console.error('Erreur chargement types:', error);
      setError('Impossible de charger les types de structure');
    }
  };

  // Validation functions
  const validateBusinessName = (name: string) => {
    const length = name.trim().length;
    if (length === 0) return { isValid: false, message: '', status: 'empty' };
    if (length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH) {
      return {
        isValid: false,
        message: t('step1.tooShort', { min: VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH }),
        status: 'too-short'
      };
    }
    if (length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH) {
      return {
        isValid: false,
        message: t('step1.tooLong', { max: VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH }),
        status: 'too-long'
      };
    }
    if (nameCheckState.exists === true) {
      return {
        isValid: false,
        message: t('step1.alreadyTaken'),
        status: 'duplicate'
      };
    }
    return { isValid: true, message: t('step1.available'), status: 'valid' };
  };

  const businessNameValidation = validateBusinessName(formData.businessName);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue = value;

    if (name === 'businessName') {
      processedValue = value.toUpperCase();
    }

    if (name === 'phoneOM' || name === 'phoneWave') {
      processedValue = value.replace(/\D/g, '');
      if (processedValue.length > VALIDATION_RULES.PHONE_LENGTH) {
        processedValue = processedValue.slice(0, VALIDATION_RULES.PHONE_LENGTH);
      }
    }

    if (name === 'structureTypeId') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : processedValue,
    }));
  };

  const handleServiceSelect = (service: ServiceType) => {
    setFormData(prev => ({ ...prev, serviceType: service }));
  };

  const handleLogoUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      if (result.url.startsWith('data:')) {
        alert('Erreur: L\'upload vers le serveur a échoué. Veuillez réessayer.');
        return;
      }
      if (!result.url.startsWith('http://') && !result.url.startsWith('https://')) {
        alert('Erreur: URL de l\'image invalide. Veuillez réessayer.');
        return;
      }
      setFormData(prev => ({ ...prev, logoUrl: result.url! }));
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

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.businessName || formData.businessName.trim().length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH) {
          setError(`Nom du business requis (minimum ${VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH} caractères)`);
          return false;
        }
        if (nameCheckState.exists) {
          setError('Ce nom de structure est déjà pris');
          return false;
        }
        break;
      case 2:
        if (!formData.structureTypeId || formData.structureTypeId <= 0) {
          setError('Veuillez sélectionner un type de structure');
          return false;
        }
        if (!formData.phoneOM || !registrationService.validateSenegalMobileOM(formData.phoneOM)) {
          setError('Téléphone Orange Money invalide (9 chiffres, préfixes: 77, 78, 70, 76, 75)');
          return false;
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsLoading(true);
    setError('');

    try {
      const registrationData = {
        p_id_type: formData.structureTypeId,
        p_nom_structure: formData.businessName,
        p_adresse: formData.address,
        p_mobile_om: formData.phoneOM,
        p_mobile_wave: formData.phoneWave || '',
        p_nom_service: formData.serviceType || 'SERVICES',
        p_logo: formData.logoUrl || ''
      };

      const result = await registrationService.registerMerchant(registrationData);
      const loginInfo = registrationService.extractLoginInfo(result.message);

      setSuccessModal({
        isOpen: true,
        message: result.message,
        login: loginInfo.login || '',
        password: loginInfo.password || '0000',
        structureName: formData.businessName
      });

      resetForm();

    } catch (error) {
      console.error('Erreur inscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      transition: { duration: 0.2 }
    })
  };

  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-6"
          >
            {/* Welcome Message */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-3xl shadow-lg"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                {t('step1.title')}
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                {t('step1.subtitle')}
              </p>
            </div>

            {/* Business Name Input */}
            <div className="space-y-3">
              <label className="block text-gray-700 font-semibold text-lg">
                {t('step1.businessNameLabel')} <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  ref={businessNameRef}
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className={`w-full px-4 py-4 text-lg font-bold uppercase border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${
                    businessNameValidation.status === 'valid'
                      ? 'border-emerald-400 focus:ring-emerald-100 bg-emerald-50/30'
                      : businessNameValidation.status === 'empty'
                      ? 'border-gray-300 focus:ring-blue-100'
                      : businessNameValidation.status === 'duplicate'
                      ? 'border-red-500 focus:ring-red-100 bg-red-50/30'
                      : 'border-orange-400 focus:ring-orange-100 bg-orange-50/30'
                  }`}
                  placeholder={t('step1.businessNamePlaceholder')}
                  maxLength={VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                  required
                />

                {/* Status Indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {nameCheckState.checking ? (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  ) : formData.businessName && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                    >
                      {businessNameValidation.isValid ? (
                        <Check className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Validation Messages */}
              <AnimatePresence mode="wait">
                {formData.businessName && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-2 text-sm font-medium ${
                      businessNameValidation.status === 'valid'
                        ? 'text-emerald-600'
                        : businessNameValidation.status === 'empty'
                        ? 'text-gray-500'
                        : 'text-red-600'
                    }`}
                  >
                    {businessNameValidation.status === 'valid' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {businessNameValidation.message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Character Counter */}
              <div className="flex justify-between text-sm text-gray-500">
                <span>{t('step1.characterCount', { min: VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH, max: VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH })}</span>
                <span className={formData.businessName.length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH * 0.8 ? 'text-orange-600 font-semibold' : ''}>
                  {formData.businessName.length}/{VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                </span>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                { icon: '🚀', text: t('step1.benefits.free') },
                { icon: '💰', text: t('step1.benefits.instant') },
                { icon: '🔒', text: t('step1.benefits.secure') },
                { icon: '📱', text: t('step1.benefits.qrcode') }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2 p-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/40 shadow-lg hover:shadow-xl hover:bg-white/80 transition-all"
                >
                  <span className="text-2xl">{benefit.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{benefit.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-6"
          >
            {/* Step Title */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                {t('step2.title')}
              </h2>
              <p className="text-gray-600">
                {t('step2.subtitle')}
              </p>
            </div>

            {/* Structure Type */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-gray-700 font-semibold">
                <Building2 className="w-5 h-5 text-emerald-500" />
                {t('step2.structureType')} <span className="text-red-500">*</span>
              </label>
              <select
                ref={structureTypeRef}
                name="structureTypeId"
                value={formData.structureTypeId}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                required
              >
                <option value={0}>{t('step2.structureTypePlaceholder')}</option>
                {structureTypes.map((type) => (
                  <option key={type.id_type} value={type.id_type}>
                    {type.nom_type}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type Selector */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-semibold">
                {t('step2.serviceType')} <span className="text-gray-400 text-sm">({tCommon('optional')})</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['SERVICES', 'PRODUITS', 'MIXTE', 'AUTRE'] as ServiceType[]).map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => handleServiceSelect(service)}
                    className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                      formData.serviceType === service
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <span className="text-xl mb-1 block">{SERVICE_ICONS[service]}</span>
                    <span className="text-xs">{service}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4 p-4 bg-white/40 backdrop-blur-md rounded-xl border border-white/30 shadow-lg">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-500" />
                {t('step2.contact')}
              </h3>

              {/* Phone OM */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('step2.phoneOM')} <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl">
                    +221
                  </span>
                  <input
                    type="tel"
                    name="phoneOM"
                    value={formData.phoneOM}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder={t('step2.phoneOMPlaceholder')}
                    maxLength={9}
                    required
                  />
                </div>
              </div>

              {/* Phone Wave */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('step2.phoneWave')} <span className="text-gray-400 text-xs">({tCommon('optional')})</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl">
                    +221
                  </span>
                  <input
                    type="tel"
                    name="phoneWave"
                    value={formData.phoneWave || ''}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder={t('step2.phoneWavePlaceholder')}
                    maxLength={9}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {t('step2.address')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder={t('step2.addressPlaceholder')}
                  rows={3}
                  maxLength={VALIDATION_RULES.ADDRESS_MAX_LENGTH}
                  required
                />
                <div className="text-xs text-gray-500 text-right">
                  {formData.address.length}/{VALIDATION_RULES.ADDRESS_MAX_LENGTH}
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-500" />
                {t('step2.logo')} <span className="text-gray-400 text-sm">({tCommon('optional')})</span>
              </label>
              <LogoUpload
                onUploadComplete={handleLogoUploadComplete}
                onUploadProgress={handleLogoUploadProgress}
                onFileSelect={handleLogoFileSelect}
                registerMode={true}
              />
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-6"
          >
            {/* Step Title */}
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-3xl shadow-lg"
              >
                ✓
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                {t('step3.title')}
              </h2>
              <p className="text-gray-600">
                {t('step3.subtitle')}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="space-y-3">
              {/* Business Info */}
              <div className="p-4 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 backdrop-blur-lg rounded-xl border-2 border-emerald-200/50 shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-emerald-700">{t('step3.structure')}</span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {tCommon('edit')}
                  </button>
                </div>
                <p className="text-2xl font-bold text-gray-800 mb-1">{formData.businessName}</p>
                <p className="text-sm text-gray-600">
                  {structureTypes.find(t => t.id_type === formData.structureTypeId)?.nom_type}
                </p>
              </div>

              {/* Contact Info */}
              <div className="p-4 bg-white/60 backdrop-blur-lg rounded-xl border-2 border-white/40 shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">{t('step3.contact')}</span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {tCommon('edit')}
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium">{t('step3.orangeMoney')}:</span>
                    <span className="text-gray-600">+221 {formData.phoneOM}</span>
                  </div>
                  {formData.phoneWave && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{t('step3.wave')}:</span>
                      <span className="text-gray-600">+221 {formData.phoneWave}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span className="text-gray-600">{formData.address}</span>
                  </div>
                </div>
              </div>

              {/* Logo Preview */}
              {logoUploadState.isUploaded && formData.logoUrl && (
                <div className="p-4 bg-white/60 backdrop-blur-lg rounded-xl border-2 border-white/40 shadow-lg">
                  <span className="text-sm font-medium text-gray-700 block mb-2">{t('step3.logo')}</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                    />
                    <span className="text-sm text-gray-600">{logoUploadState.fileName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Terms Acceptance */}
            <div className="p-4 bg-white/40 backdrop-blur-md rounded-xl border border-white/30 shadow-lg">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  required
                />
                <span className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900">
                  J&apos;accepte les{' '}
                  <a href="/terms" target="_blank" className="text-emerald-600 hover:text-emerald-700 font-semibold underline">
                    {t('step3.termsLink')}
                  </a>{' '}
                  et les{' '}
                  <a href="/privacy" target="_blank" className="text-emerald-600 hover:text-emerald-700 font-semibold underline">
                    {t('step3.privacyLink')}
                  </a>{' '}
                  de FayClick.
                </span>
              </label>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Modern Layout */}
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">

        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Blob 1 - Top Right */}
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-300/40 to-teal-400/40 rounded-full blur-3xl"
          />

          {/* Blob 2 - Bottom Left */}
          <motion.div
            animate={{
              x: [0, -30, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-300/30 to-indigo-400/30 rounded-full blur-3xl"
          />

          {/* Blob 3 - Center */}
          <motion.div
            animate={{
              x: [0, 40, 0],
              y: [0, -40, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-teal-300/25 to-emerald-400/25 rounded-full blur-3xl"
          />

          {/* Blob 4 - Top Left */}
          <motion.div
            animate={{
              x: [0, -20, 0],
              y: [0, 40, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-green-300/30 to-emerald-400/30 rounded-full blur-3xl"
          />

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNiwxODUsMTI5LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        </div>

        {/* Header - Sticky on Mobile with Glass Effect */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-emerald-500/5">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Retour à l'accueil"
              >
                <Home className="w-5 h-5 text-gray-600" />
              </button>
              <LogoFayclick className="w-10 h-10" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-800">{t('title')}</h1>
                <p className="text-xs text-gray-500">{t('subtitle')}</p>
              </div>
            </div>

            {/* Progress Indicator & Language Switcher */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 hidden sm:block">
                  {t('step', { current: step, total: 3 })}
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <motion.div
                      key={s}
                      initial={{ scale: 0.8 }}
                      animate={{
                        scale: s === step ? 1 : 0.8,
                        backgroundColor: s <= step ? '#10b981' : '#e5e7eb'
                      }}
                      className="w-2 h-2 rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Language Switcher */}
              <LanguageSwitcher variant="compact" />
            </div>
          </div>

          {/* Progress Bar */}
          <motion.div
            className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={{ width: '33%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 py-6 md:py-12">
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>

            {/* Step Content with Animation - Glass Effect */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/40 p-6 md:p-8 mb-6 relative overflow-hidden"
              >
                {/* Glass shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />

                {/* Content */}
                <div className="relative z-10">
                  {renderStepContent()}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {step > 1 && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  type="button"
                  onClick={() => { prevStep(); paginate(-1); }}
                  className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {tCommon('previous')}
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={step === 1 && (!businessNameValidation.isValid || nameCheckState.checking)}
                className={`${step === 1 ? 'w-full' : 'flex-1'} px-6 py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
                  step === 1 && (!businessNameValidation.isValid || nameCheckState.checking)
                    ? 'bg-gray-300 cursor-not-allowed'
                    : step === 3
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                }`}
                onClick={() => step < 3 && paginate(1)}
              >
                {step === 3 ? (
                  isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('step3.creating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {t('step3.createButton')}
                    </>
                  )
                ) : (
                  <>
                    {tCommon('next')}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </main>
      </div>

      {/* Success Modal */}
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
