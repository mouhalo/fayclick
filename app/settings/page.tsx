'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import databaseService from '@/services/database.service';
import { authService } from '@/services/auth.service';
import ImageUpload from '@/components/ui/ImageUpload';
import PopMessage from '@/components/ui/PopMessage';

interface StructureData {
  id_structure: number;
  nom_structure: string;
  adresse: string;
  mobile_om: string;
  mobile_wave: string;
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

export default function StructureEditPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [structure, setStructure] = useState<StructureData>({
    id_structure: 0,
    nom_structure: '',
    adresse: '',
    mobile_om: '',
    mobile_wave: '',
    email: '',
    logo: '',
    id_type: 1,
    actif: true
  });
  const [originalStructure, setOriginalStructure] = useState<StructureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
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
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Récupération des données de la structure actuelle
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
          const structureData = data[0] as any;
          const mappedStructure: StructureData = {
            id_structure: structureData.id_structure || user.id_structure,
            nom_structure: structureData.nom_structure || '',
            adresse: structureData.adresse || '',
            mobile_om: structureData.mobile_om || '',
            mobile_wave: structureData.mobile_wave || '',
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
        // En cas d'erreur, utiliser les données de base de l'utilisateur
        if (user.id_structure) {
          const fallbackStructure: StructureData = {
            id_structure: user.id_structure,
            nom_structure: user.username || '',
            adresse: '',
            mobile_om: '',
            mobile_wave: '',
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

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!structure.nom_structure.trim()) {
      newErrors.nom_structure = 'Le nom de la structure est requis';
    }

    if (!structure.adresse.trim()) {
      newErrors.adresse = 'L\'adresse est requise';
    }

    if (!structure.mobile_om.trim()) {
      newErrors.mobile_om = 'Le numéro Orange Money est requis';
    } else if (!/^\d{9}$/.test(structure.mobile_om)) {
      newErrors.mobile_om = 'Le numéro Orange Money doit contenir 9 chiffres';
    }

    if (structure.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(structure.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    setErrors(newErrors);

    // Afficher les erreurs dans un PopMessage
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showMessage('warning', firstError, 'Veuillez corriger les erreurs');
    }

    return Object.keys(newErrors).length === 0;
  };

  // Sauvegarde des modifications
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id_structure) {
      console.error('ID structure manquant');
      return;
    }

    try {
      setIsSaving(true);

      // Construction de la requête SQL de mise à jour
      const updateQuery = `
        UPDATE structures
        SET
          nom_structure = '${structure.nom_structure.replace(/'/g, "''")}',
          adresse = '${structure.adresse.replace(/'/g, "''")}',
          mobile_om = '${structure.mobile_om}',
          mobile_wave = '${structure.mobile_wave || ''}',
          email = '${structure.email || ''}'
        WHERE id_structure = ${structure.id_structure}
      `;

      console.log('🔄 Mise à jour structure:', {
        id_structure: structure.id_structure,
        query: updateQuery
      });

      const result = await databaseService.executeQuery('fayclick', updateQuery);

      console.log('✅ Résultat mise à jour:', result);

      // Afficher le message de succès
      showMessage('success', 'Structure mise à jour avec succès !', 'Sauvegarde réussie');

      // Mettre à jour la structure originale
      setOriginalStructure({ ...structure });

      // Optionnellement, mettre à jour le contexte d'authentification
      if (authService.getUser()) {
        await authService.refreshUserData();
      }

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setPopMessage({
        show: true,
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les modifications. Veuillez réessayer.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Gestion du changement de logo
  const handleLogoChange = (url: string, file?: File) => {
    setStructure({ ...structure, logo: url });
    if (file) {
      setLogoFile(file);
    }
  };

  // Fonction utilitaire pour afficher un message
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({
      show: true,
      type,
      title,
      message
    });
  };

  // Vérifier s'il y a des modifications
  const hasChanges = originalStructure && (
    structure.nom_structure !== originalStructure.nom_structure ||
    structure.adresse !== originalStructure.adresse ||
    structure.mobile_om !== originalStructure.mobile_om ||
    structure.mobile_wave !== originalStructure.mobile_wave ||
    structure.email !== originalStructure.email
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white/70 backdrop-blur-sm border border-white/30 hover:bg-white/90 transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres de structure</h1>
            <p className="text-gray-600">Gérez les informations de votre structure</p>
          </div>
        </motion.div>


        {/* Formulaire principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-md rounded-xl border border-white/30 shadow-xl p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Informations générales
              </h2>

              {/* Nom de la structure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la structure *
                </label>
                <input
                  type="text"
                  value={structure.nom_structure}
                  onChange={(e) => setStructure({ ...structure, nom_structure: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.nom_structure ? 'border-red-300' : 'border-gray-300'
                  } bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="Nom de votre structure"
                />
                {errors.nom_structure && (
                  <p className="mt-1 text-sm text-red-600">{errors.nom_structure}</p>
                )}
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Adresse *
                </label>
                <textarea
                  value={structure.adresse}
                  onChange={(e) => setStructure({ ...structure, adresse: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.adresse ? 'border-red-300' : 'border-gray-300'
                  } bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none`}
                  placeholder="Adresse complète de votre structure"
                />
                {errors.adresse && (
                  <p className="mt-1 text-sm text-red-600">{errors.adresse}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={structure.email}
                  onChange={(e) => setStructure({ ...structure, email: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="email@exemple.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Informations de contact */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-5 w-5 text-orange-600" />
                Informations de contact
              </h2>

              {/* Mobile Orange Money */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Orange Money *
                </label>
                <input
                  type="tel"
                  value={structure.mobile_om}
                  onChange={(e) => setStructure({ ...structure, mobile_om: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.mobile_om ? 'border-red-300' : 'border-gray-300'
                  } bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200`}
                  placeholder="123456789"
                  maxLength={9}
                />
                {errors.mobile_om && (
                  <p className="mt-1 text-sm text-red-600">{errors.mobile_om}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Format: 9 chiffres (ex: 123456789)</p>
              </div>

              {/* Mobile Wave */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Wave (optionnel)
                </label>
                <input
                  type="tel"
                  value={structure.mobile_wave}
                  onChange={(e) => setStructure({ ...structure, mobile_wave: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="123456789"
                  maxLength={9}
                />
                <p className="mt-1 text-xs text-gray-500">Format: 9 chiffres (ex: 123456789)</p>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Logo de la structure
                </label>
                <div className="flex items-center gap-4">
                  <ImageUpload
                    defaultImage={structure.logo}
                    onImageChange={handleLogoChange}
                    size={100}
                    shape="rounded"
                    withFile={true}
                    accept="image/jpeg,image/png,image/gif"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">
                      Formats acceptés : JPG, PNG, GIF
                    </p>
                    <p className="text-xs text-gray-500">
                      Taille maximale : 5MB
                    </p>
                    <p className="text-xs text-gray-500">
                      Dimensions recommandées : 200x200px
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white/70 hover:bg-white/90 transition-all duration-200"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 flex items-center gap-2 ${
                hasChanges && !isSaving
                  ? 'bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 shadow-lg'
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
        </motion.div>

        {/* PopMessage pour les notifications */}
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