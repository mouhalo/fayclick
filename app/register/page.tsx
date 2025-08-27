'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Étape 1: Type d'activité
    businessType: '',
    
    // Étape 2: Informations personnelles
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Étape 3: Informations business
    businessName: '',
    businessAddress: '',
    businessCategory: '',
    
    // Étape 4: Sécurité
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const businessTypes = [
    { id: 'services', name: 'Prestataires de Services', icon: '🛠️', desc: 'Tailleurs, menuisiers, plombiers...' },
    { id: 'commerce', name: 'Commerce', icon: '🏪', desc: 'Boutiques, magasins, ateliers...' },
    { id: 'education', name: 'Scolaire', icon: '🎓', desc: 'Écoles, instituts, formation...' },
    { id: 'real-estate', name: 'Immobilier', icon: '🏢', desc: 'Location, gestion immobilière...' },
  ];

  const categories = {
    services: ['Tailleur', 'Menuisier', 'Plombier', 'Électricien', 'Mécanique', 'Traiteur', 'Autre'],
    commerce: ['Alimentation', 'Vêtements', 'Électronique', 'Cosmétiques', 'Pharmacie', 'Autre'],
    education: ['École Primaire', 'Collège', 'Lycée', 'Institut', 'Centre de Formation', 'Autre'],
    'real-estate': ['Location Maisons', 'Location Appartements', 'Auberge', 'Agence Immobilière', 'Autre'],
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleBusinessTypeSelect = (type: string) => {
    setFormData(prev => ({ ...prev, businessType: type }));
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      setError('');
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setError('');
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.businessType) {
          setError('Veuillez sélectionner un type d&apos;activité');
          return false;
        }
        break;
      case 2:
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
          setError('Veuillez remplir tous les champs obligatoires');
          return false;
        }
        break;
      case 3:
        if (!formData.businessName || !formData.businessAddress || !formData.businessCategory) {
          setError('Veuillez remplir toutes les informations business');
          return false;
        }
        break;
      case 4:
        if (!formData.password || !formData.confirmPassword) {
          setError('Veuillez remplir tous les champs de mot de passe');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          return false;
        }
        if (!formData.acceptTerms) {
          setError('Veuillez accepter les conditions d&apos;utilisation');
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    
    setIsLoading(true);
    setError('');

    // Simulation d'inscription
    setTimeout(() => {
      console.log('Inscription réussie', formData);
      router.push('/welcome');
      setIsLoading(false);
    }, 2000);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="heading-sm text-gray-800 mb-2">
                Quel est votre secteur d&apos;activité ?
              </h2>
              <p className="text-gray-600 text-sm">
                Choisissez le domaine qui correspond à votre business
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {businessTypes.map((type) => (
                <Card
                  key={type.id}
                  hover
                  onClick={() => handleBusinessTypeSelect(type.id)}
                  className={`cursor-pointer transition-all duration-200 ${
                    formData.businessType === type.id
                      ? 'ring-2 ring-primary-500 bg-primary-50 border-primary-200'
                      : 'hover:border-primary-300'
                  }`}
                >
                  <div className="p-4 flex items-center space-x-4">
                    <div className="text-3xl">{type.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-montserrat font-semibold text-gray-800">{type.name}</h3>
                      <p className="text-sm text-gray-600">{type.desc}</p>
                    </div>
                    {formData.businessType === type.id && (
                      <div className="text-primary-500 text-xl">✓</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="heading-sm text-gray-800 mb-2">
                Informations personnelles
              </h2>
              <p className="text-gray-600 text-sm">
                Renseignez vos informations de contact
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Prénom"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nom"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+221 77 123 45 67"
                required
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="heading-sm text-gray-800 mb-2">
                Informations business
              </h2>
              <p className="text-gray-600 text-sm">
                Détails sur votre activité professionnelle
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Nom de l&apos;entreprise/Activité <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Nom de votre business"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Adresse <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Adresse complète"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                name="businessCategory"
                value={formData.businessCategory}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Sélectionnez une catégorie</option>
                {formData.businessType && categories[formData.businessType as keyof typeof categories]?.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="heading-sm text-gray-800 mb-2">
                Sécurité du compte
              </h2>
              <p className="text-gray-600 text-sm">
                Créez un mot de passe sécurisé
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Minimum 8 caractères avec lettres et chiffres
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                required
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                J&apos;accepte les{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                  conditions d&apos;utilisation
                </Link>{' '}
                et la{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                  politique de confidentialité
                </Link>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Container Mobile */}
      <div className="max-w-[425px] mx-auto min-h-screen bg-white shadow-2xl relative">
        {/* Status Bar */}
        <div className="status-bar">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Header */}
        <div className="header py-8 px-6 relative overflow-hidden">
          {/* Pattern d'arrière-plan */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-sparkle" />
          </div>

          {/* Bouton Retour */}
          <button
            onClick={step === 1 ? () => router.push('/') : prevStep}
            className="absolute top-5 left-5 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 z-10"
          >
            ←
          </button>

          {/* Contenu du header */}
          <div className="text-center pt-8 relative z-10">
            <div className="w-20 h-20 mx-auto mb-5 bg-white rounded-full flex items-center justify-center shadow-xl animate-icon-pulse">
              <span className="text-3xl">👤</span>
            </div>
            
            <h1 className="heading-lg text-white mb-2">
              Inscription
            </h1>
            <p className="text-white/90 text-base">
              Étape {step} sur 4
            </p>
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 -mt-6 relative bg-gradient-to-b from-sky-100 to-blue-50 min-h-[70vh]">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
            <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="p-6">
              {renderStep()}

              {/* Message d'erreur */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Boutons de navigation */}
              <div className="mt-8 flex gap-4">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={prevStep}
                    className="flex-1"
                  >
                    Précédent
                  </Button>
                )}
                
                <Button
                  type="submit"
                  variant={step === 4 ? "gradient" : "primary"}
                  size="lg"
                  loading={step === 4 && isLoading}
                  className={`${step === 1 ? 'w-full' : 'flex-1'} shadow-lg`}
                >
                  {step === 4 
                    ? (isLoading ? 'Création...' : 'Créer mon compte') 
                    : 'Suivant'
                  }
                </Button>
              </div>
            </form>
          </Card>

          {/* Lien vers connexion */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Déjà inscrit ?{' '}
              <Link 
                href="/login" 
                className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}