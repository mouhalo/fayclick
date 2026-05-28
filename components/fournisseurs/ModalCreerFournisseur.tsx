/**
 * ModalCreerFournisseur — Formulaire creation/edition d'un fournisseur
 *
 * EPIC 1 — Phase 4 (UI Module Fournisseurs)
 * Reference : docs/prd-bons-commande-fournisseurs-2026-05-25.md (FR-007)
 *
 * Pattern : framer-motion + sonner + validation locale + FournisseurApiException
 * Mode :
 *   - Creation  : tous champs vides, bouton "Creer fournisseur"
 *   - Edition   : prerempli depuis fournisseurToEdit, bouton "Enregistrer modifications"
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  StickyNote,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fournisseurService,
  FournisseurApiException,
} from '@/services/fournisseur.service';
import type {
  CreateFournisseurInput,
  EditFournisseurInput,
  Fournisseur,
} from '@/types/fournisseur';

interface ModalCreerFournisseurProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback succes — recoit le fournisseur cree/modifie (createur : id_fournisseur en retour, mais le parent fait refresh) */
  onSuccess: (fournisseur: Fournisseur) => void;
  /** Si fourni → mode edition */
  fournisseurToEdit?: Fournisseur;
}

interface FormState {
  nom_fournisseur: string;
  tel_fournisseur: string;
  email_fournisseur: string;
  adresse: string;
  ninea: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  nom_fournisseur: '',
  tel_fournisseur: '',
  email_fournisseur: '',
  adresse: '',
  ninea: '',
  notes: '',
};

// Regex email simple (HTML5-like)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Telephone senegalais : 9 chiffres commencant par 7 (recommandation, non bloquant)
const TEL_REGEX = /^7\d{8}$/;

export function ModalCreerFournisseur({
  isOpen,
  onClose,
  onSuccess,
  fournisseurToEdit,
}: ModalCreerFournisseurProps) {
  const isEdit = !!fournisseurToEdit;
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydratation au montage / changement de mode
  useEffect(() => {
    if (isOpen) {
      if (fournisseurToEdit) {
        setForm({
          nom_fournisseur: fournisseurToEdit.nom_fournisseur || '',
          tel_fournisseur: fournisseurToEdit.tel_fournisseur || '',
          email_fournisseur: fournisseurToEdit.email_fournisseur || '',
          adresse: fournisseurToEdit.adresse || '',
          ninea: fournisseurToEdit.ninea || '',
          notes: fournisseurToEdit.notes || '',
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setError(null);
    }
  }, [isOpen, fournisseurToEdit]);

  const handleClose = () => {
    if (saving) return;
    setForm(DEFAULT_FORM);
    setError(null);
    onClose();
  };

  /**
   * Validation client minimale avant submit.
   * Le service refera la validation cote PG (UNIQUE, format SQL, etc.).
   */
  const validate = (): string | null => {
    const nom = form.nom_fournisseur.trim();
    if (!nom) return 'Le nom du fournisseur est obligatoire';
    if (nom.length < 2) return 'Le nom doit contenir au moins 2 caracteres';
    if (nom.length > 200) return 'Le nom ne peut depasser 200 caracteres';

    const email = form.email_fournisseur.trim();
    if (email && !EMAIL_REGEX.test(email)) {
      return 'Format email invalide';
    }

    // Tel non bloquant — juste avertissement si format non conforme
    return null;
  };

  const handleSave = async () => {
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Avertissement non bloquant pour tel format
    const tel = form.tel_fournisseur.trim();
    if (tel && !TEL_REGEX.test(tel)) {
      // On laisse passer mais on prevent l'utilisateur via toast
      toast.warning(
        'Telephone : format senegalais recommande (9 chiffres commencant par 7)'
      );
    }

    setSaving(true);

    try {
      if (isEdit && fournisseurToEdit) {
        // Mode edition — n'envoyer que les champs effectivement modifies
        const payload: EditFournisseurInput = {};
        if (form.nom_fournisseur.trim() !== (fournisseurToEdit.nom_fournisseur || '')) {
          payload.nom_fournisseur = form.nom_fournisseur.trim();
        }
        if (form.tel_fournisseur.trim() !== (fournisseurToEdit.tel_fournisseur || '')) {
          payload.tel_fournisseur = form.tel_fournisseur.trim();
        }
        if (form.email_fournisseur.trim() !== (fournisseurToEdit.email_fournisseur || '')) {
          payload.email_fournisseur = form.email_fournisseur.trim();
        }
        if (form.adresse.trim() !== (fournisseurToEdit.adresse || '')) {
          payload.adresse = form.adresse.trim();
        }
        if (form.ninea.trim() !== (fournisseurToEdit.ninea || '')) {
          payload.ninea = form.ninea.trim();
        }
        if (form.notes.trim() !== (fournisseurToEdit.notes || '')) {
          payload.notes = form.notes.trim();
        }

        // Si aucun changement → ferme sans appel reseau
        if (Object.keys(payload).length === 0) {
          toast.info('Aucune modification a enregistrer');
          handleClose();
          return;
        }

        const res = await fournisseurService.editFournisseur(
          fournisseurToEdit.id_fournisseur,
          payload
        );

        if (res.success) {
          toast.success(res.message || 'Fournisseur modifie avec succes');
          // On reconstruit l'objet Fournisseur en patchant l'existant
          const updated: Fournisseur = {
            ...fournisseurToEdit,
            nom_fournisseur:
              payload.nom_fournisseur ?? fournisseurToEdit.nom_fournisseur,
            tel_fournisseur:
              payload.tel_fournisseur !== undefined
                ? payload.tel_fournisseur || null
                : fournisseurToEdit.tel_fournisseur,
            email_fournisseur:
              payload.email_fournisseur !== undefined
                ? payload.email_fournisseur || null
                : fournisseurToEdit.email_fournisseur,
            adresse:
              payload.adresse !== undefined
                ? payload.adresse || null
                : fournisseurToEdit.adresse,
            ninea:
              payload.ninea !== undefined
                ? payload.ninea || null
                : fournisseurToEdit.ninea,
            notes:
              payload.notes !== undefined
                ? payload.notes || null
                : fournisseurToEdit.notes,
            date_modification: new Date().toISOString(),
          };
          onSuccess(updated);
          handleClose();
        } else {
          setError(res.message || 'Erreur lors de la modification');
        }
      } else {
        // Mode creation
        const payload: CreateFournisseurInput = {
          nom_fournisseur: form.nom_fournisseur.trim(),
          tel_fournisseur: form.tel_fournisseur.trim() || undefined,
          email_fournisseur: form.email_fournisseur.trim() || undefined,
          adresse: form.adresse.trim() || undefined,
          ninea: form.ninea.trim() || undefined,
          notes: form.notes.trim() || undefined,
        };

        const res = await fournisseurService.createFournisseur(payload);

        if (res.success && res.id_fournisseur) {
          toast.success(res.message || 'Fournisseur cree avec succes');
          // On synthetise un objet Fournisseur minimal — le parent refera
          // un refresh complet via getListFournisseurs(true) si besoin
          const created: Fournisseur = {
            id_fournisseur: res.id_fournisseur,
            id_structure: 0, // sera ecrase au prochain refresh liste
            nom_fournisseur: payload.nom_fournisseur,
            tel_fournisseur: payload.tel_fournisseur || null,
            email_fournisseur: payload.email_fournisseur || null,
            adresse: payload.adresse || null,
            ninea: payload.ninea || null,
            notes: payload.notes || null,
            actif: true,
            date_creation: new Date().toISOString(),
            date_modification: null,
            nb_bons_commandes: 0,
          };
          onSuccess(created);
          handleClose();
        } else {
          setError(res.message || 'Erreur lors de la creation');
        }
      }
    } catch (err) {
      // FournisseurApiException ou autre
      if (err instanceof FournisseurApiException) {
        setError(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur inattendue';
        setError(msg);
      }
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
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-sky-500">
            <div className="flex items-center gap-2 text-white">
              <Building2 className="w-5 h-5" />
              <h2 className="text-lg font-semibold">
                {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-5 overflow-y-auto flex-1">
            <div className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* SECTION 1 : Identification */}
              <section>
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Identification
                </h3>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="four-nom"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Nom du fournisseur *
                    </label>
                    <input
                      id="four-nom"
                      type="text"
                      value={form.nom_fournisseur}
                      maxLength={200}
                      onChange={(e) =>
                        setForm({ ...form, nom_fournisseur: e.target.value })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Ex: Grossiste Cheikh Bara"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="four-ninea"
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      NINEA (optionnel)
                    </label>
                    <input
                      id="four-ninea"
                      type="text"
                      value={form.ninea}
                      maxLength={50}
                      onChange={(e) =>
                        setForm({ ...form, ninea: e.target.value })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Ex: 0123456789012"
                    />
                  </div>
                </div>
              </section>

              {/* SECTION 2 : Contact */}
              <section>
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Contact
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="four-tel"
                        className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Telephone (optionnel)
                      </label>
                      <input
                        id="four-tel"
                        type="tel"
                        inputMode="numeric"
                        maxLength={9}
                        value={form.tel_fournisseur}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            tel_fournisseur: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="771234567"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="four-email"
                        className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email (optionnel)
                      </label>
                      <input
                        id="four-email"
                        type="email"
                        value={form.email_fournisseur}
                        maxLength={150}
                        onChange={(e) =>
                          setForm({ ...form, email_fournisseur: e.target.value })
                        }
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="contact@fournisseur.sn"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="four-adresse"
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Adresse (optionnel)
                    </label>
                    <textarea
                      id="four-adresse"
                      value={form.adresse}
                      onChange={(e) =>
                        setForm({ ...form, adresse: e.target.value })
                      }
                      disabled={saving}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                      placeholder="Adresse complete (rue, ville, region)"
                    />
                  </div>
                </div>
              </section>

              {/* SECTION 3 : Notes internes */}
              <section>
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" />
                  Notes internes
                </h3>

                <div>
                  <label htmlFor="four-notes" className="sr-only">
                    Notes
                  </label>
                  <textarea
                    id="four-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    disabled={saving}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                    placeholder="Conditions de paiement, delais de livraison, contact prefere..."
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.nom_fournisseur.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    {isEdit ? 'Enregistrer modifications' : 'Creer fournisseur'}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalCreerFournisseur;
