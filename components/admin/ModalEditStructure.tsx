/**
 * Modal de modification de la fiche d'une structure (admin)
 *
 * PRD: docs/prd-admin-gestion-structures-2026-04-30.md § 3.1 (US-1)
 * Champs autorisés (3 seulement) :
 *   - nom_structure (requis)
 *   - numautorisatioon (optionnel)
 *   - id_localite (requis, dropdown ou input number en fallback)
 *
 * Les autres champs (mobile_om/wave, email, adresse, logo, code_structure)
 * sont volontairement immuables côté admin.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Save, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/admin.service';
import databaseService from '@/services/database.service';
import { useAuth } from '@/contexts/AuthContext';
import SecurityService from '@/services/security.service';
import { StructureDetailData } from '@/types/admin.types';

interface Localite {
  id_localite: number;
  nom_localite: string;
}

interface ModalEditStructureProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number | null;
  onSaved?: () => void;
}

export function ModalEditStructure({
  isOpen,
  onClose,
  idStructure,
  onSaved
}: ModalEditStructureProps) {
  const { user } = useAuth();

  // États du formulaire
  const [nomStructure, setNomStructure] = useState('');
  const [numAutorisation, setNumAutorisation] = useState('');
  const [idLocalite, setIdLocalite] = useState<number>(0);

  // États UI
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Localités
  const [localites, setLocalites] = useState<Localite[]>([]);
  const [localitesAvailable, setLocalitesAvailable] = useState(true);

  // Charger les données au mount
  useEffect(() => {
    if (isOpen && idStructure) {
      loadStructure();
      loadLocalites();
    }
  }, [isOpen, idStructure]);

  // Reset state à la fermeture
  const handleClose = () => {
    setNomStructure('');
    setNumAutorisation('');
    setIdLocalite(0);
    setError(null);
    setSaving(false);
    onClose();
  };

  const loadStructure = async () => {
    if (!idStructure) return;
    setLoadingData(true);
    setError(null);
    try {
      const response = await adminService.getUneStructure(idStructure);
      if (response.success && response.data) {
        const data = response.data as StructureDetailData;
        setNomStructure(data.nom_structure || '');
        setNumAutorisation(data.numautorisatioon || '');
        setIdLocalite(data.id_localite || 0);
      } else {
        setError('Impossible de charger la structure');
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalEditStructure] erreur chargement', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoadingData(false);
    }
  };

  const loadLocalites = async () => {
    try {
      const result = await databaseService.query(
        'SELECT id_localite, nom_localite FROM localites ORDER BY nom_localite'
      );
      if (Array.isArray(result) && result.length > 0) {
        const list = result.map((row: Record<string, unknown>) => ({
          id_localite: Number(row.id_localite),
          nom_localite: String(row.nom_localite ?? '')
        }));
        setLocalites(list);
        setLocalitesAvailable(true);
      } else {
        setLocalitesAvailable(false);
      }
    } catch (err) {
      SecurityService.secureLog(
        'warn',
        '[ModalEditStructure] table localites inaccessible, fallback input',
        err
      );
      setLocalitesAvailable(false);
    }
  };

  const handleSave = async () => {
    if (!idStructure || !user?.id) {
      toast.error('Session invalide, veuillez vous reconnecter');
      return;
    }

    // Validation client
    const nomTrim = nomStructure.trim();
    if (!nomTrim) {
      toast.error('Le nom de la structure est requis');
      return;
    }
    if (nomTrim.length > 100) {
      toast.error('Le nom ne peut pas dépasser 100 caractères');
      return;
    }
    if (numAutorisation.length > 50) {
      toast.error("Le numéro d'autorisation ne peut pas dépasser 50 caractères");
      return;
    }
    if (!idLocalite || idLocalite <= 0) {
      toast.error('Veuillez sélectionner une localité valide');
      return;
    }

    setSaving(true);
    try {
      const response = await adminService.editStructure({
        id_structure: idStructure,
        nom_structure: nomTrim,
        numautorisatioon: numAutorisation.trim() || undefined,
        id_localite: idLocalite,
        id_admin: user.id
      });

      if (response.success) {
        toast.success(response.message || 'Structure modifiée avec succès');
        if (onSaved) onSaved();
        handleClose();
      } else {
        toast.error(response.message || 'Erreur lors de la modification');
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalEditStructure] erreur sauvegarde', err);
      toast.error('Erreur lors de la modification de la structure');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // z-[60] pour passer au-dessus du ModalDetailStructure (z-50)
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Edit className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Modifier la fiche</h2>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={saving}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-5 overflow-y-auto max-h-[70vh]">
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                <p className="text-gray-400">Chargement...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-red-400">{error}</p>
                <button
                  onClick={loadStructure}
                  className="mt-4 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Note explicative */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-200/90">
                    Seuls 3 champs sont modifiables ici. Les autres informations
                    (téléphone OM/WAVE, email, adresse, logo, code) sont
                    immuables.
                  </p>
                </div>

                {/* Nom Structure */}
                <div>
                  <label
                    htmlFor="edit-nom-structure"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Nom de la structure <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="edit-nom-structure"
                    type="text"
                    value={nomStructure}
                    onChange={(e) => setNomStructure(e.target.value)}
                    maxLength={100}
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Ex: SIMULA27"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {nomStructure.length} / 100 caractères
                  </p>
                </div>

                {/* Numéro d'autorisation */}
                <div>
                  <label
                    htmlFor="edit-num-autorisation"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Numéro d&apos;autorisation
                  </label>
                  <input
                    id="edit-num-autorisation"
                    type="text"
                    value={numAutorisation}
                    onChange={(e) => setNumAutorisation(e.target.value)}
                    maxLength={50}
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Optionnel"
                  />
                </div>

                {/* Localité */}
                <div>
                  <label
                    htmlFor="edit-id-localite"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Localité <span className="text-red-400">*</span>
                  </label>
                  {localitesAvailable && localites.length > 0 ? (
                    <select
                      id="edit-id-localite"
                      value={idLocalite}
                      onChange={(e) => setIdLocalite(Number(e.target.value))}
                      disabled={saving}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value={0}>-- Sélectionner --</option>
                      {localites.map((loc) => (
                        <option key={loc.id_localite} value={loc.id_localite}>
                          {loc.nom_localite}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        id="edit-id-localite"
                        type="number"
                        min={1}
                        value={idLocalite || ''}
                        onChange={(e) => setIdLocalite(Number(e.target.value))}
                        disabled={saving}
                        className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        placeholder="ID localité (entier)"
                      />
                      <p className="text-xs text-orange-400/80 mt-1">
                        Liste des localités indisponible — saisir l&apos;ID
                        manuellement.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/50 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={saving}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={saving || loadingData || !!error}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalEditStructure;
