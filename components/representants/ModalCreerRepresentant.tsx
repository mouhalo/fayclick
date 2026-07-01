'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  Wallet,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import representantService from '@/services/representant.service';
import {
  CreateRepresentantParams,
  ModeEncaissementRep,
  RepresentantData,
  LocaliteRep,
} from '@/types/representant';

interface ModalCreerRepresentantProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number;
  /** Si défini → mode édition (le formulaire est pré-rempli) */
  representantToEdit?: RepresentantData | null;
  /** Callback succès : reçoit le password initial à la création (pour transmission) */
  onSuccess?: (passwordInitial?: string) => void;
}

interface FormState {
  username: string;
  telephone: string;
  telephone_terrain: string;
  nom_rep: string;
  prenom_rep: string;
  email_rep: string;
  id_localite: number;
  mode_encaissement: ModeEncaissementRep;
}

const DEFAULT_FORM: FormState = {
  username: '',
  telephone: '',
  telephone_terrain: '',
  nom_rep: '',
  prenom_rep: '',
  email_rep: '',
  id_localite: 0,
  mode_encaissement: 'WALLET_STRUCTURE',
};

export function ModalCreerRepresentant({
  isOpen,
  onClose,
  idStructure,
  representantToEdit,
  onSuccess,
}: ModalCreerRepresentantProps) {
  const isEdit = !!representantToEdit;
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordInitial, setPasswordInitial] = useState<string | null>(null);

  // Localités pour dropdown (chargées à la première ouverture)
  const [localites, setLocalites] = useState<LocaliteRep[]>([]);
  const [loadingLocalites, setLoadingLocalites] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (representantToEdit) {
        setForm({
          username: representantToEdit.username || '',
          telephone: representantToEdit.telephone || '',
          telephone_terrain: representantToEdit.telephone_terrain || '',
          nom_rep: representantToEdit.nom_rep || '',
          prenom_rep: representantToEdit.prenom_rep || '',
          email_rep: representantToEdit.email_rep || '',
          id_localite: representantToEdit.id_localite || 0,
          mode_encaissement: representantToEdit.mode_encaissement || 'WALLET_STRUCTURE',
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setError(null);
      setPasswordInitial(null);

      // Charger les localités si pas déjà fait
      if (localites.length === 0) {
        setLoadingLocalites(true);
        representantService
          .getLocalites()
          .then((data) => setLocalites(Array.isArray(data) ? data : []))
          .catch(() => setLocalites([]))
          .finally(() => setLoadingLocalites(false));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, representantToEdit]);

  const handleClose = () => {
    if (saving) return;
    setForm(DEFAULT_FORM);
    setError(null);
    setPasswordInitial(null);
    onClose();
  };

  const handleSave = async () => {
    setError(null);

    // Validation client basique (service.validateParams() refera la validation)
    if (!form.nom_rep.trim() || !form.prenom_rep.trim()) {
      setError('Le nom et le prénom du représentant sont obligatoires');
      return;
    }
    if (!/^\d{9}$/.test(form.telephone)) {
      setError('Le téléphone doit contenir 9 chiffres (format sénégalais)');
      return;
    }
    if (form.telephone_terrain && !/^\d{9}$/.test(form.telephone_terrain)) {
      setError('Le téléphone terrain doit contenir 9 chiffres');
      return;
    }
    if (form.id_localite <= 0) {
      setError("La localité d'affectation est obligatoire");
      return;
    }
    if (!form.username.trim() || form.username.trim().length < 2) {
      setError('Le username doit contenir au moins 2 caractères');
      return;
    }

    const payload: CreateRepresentantParams = {
      id_user: isEdit ? representantToEdit?.id_representant : 0,
      id_structure: idStructure,
      username: form.username.trim(),
      telephone: form.telephone.trim(),
      telephone_terrain: form.telephone_terrain.trim() || undefined,
      nom_rep: form.nom_rep.trim(),
      prenom_rep: form.prenom_rep.trim(),
      email_rep: form.email_rep.trim() || undefined,
      id_localite: form.id_localite,
      mode_encaissement: form.mode_encaissement,
    };

    setSaving(true);
    try {
      const response = await representantService.createOrEdit(payload);
      if (response.success) {
        toast.success(
          response.message ||
            (isEdit ? 'Représentant modifié avec succès' : 'Représentant créé avec succès')
        );

        if (!isEdit && response.data?.password_initial) {
          // Garder la modal ouverte pour afficher le password initial
          setPasswordInitial(response.data.password_initial);
        } else {
          if (onSuccess) onSuccess();
          handleClose();
        }
      } else {
        setError(response.message || "Erreur lors de l'opération");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inattendue';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPassword = () => {
    if (onSuccess) onSuccess(passwordInitial || undefined);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={passwordInitial ? undefined : handleClose}
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
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-fuchsia-500 to-purple-600">
            <div className="flex items-center gap-2 text-white">
              <User className="w-5 h-5" />
              <h2 className="text-lg font-semibold">
                {isEdit ? 'Modifier le représentant' : 'Nouveau représentant'}
              </h2>
            </div>
            {!passwordInitial && (
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white disabled:opacity-50"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Contenu — soit formulaire, soit affichage password initial post-création */}
          <div className="p-5 overflow-y-auto flex-1">
            {passwordInitial ? (
              /* Écran post-création : mot de passe initial à transmettre (affiché 1x) */
              <div className="space-y-4 text-center">
                <div className="inline-flex p-3 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Représentant créé</h3>
                <p className="text-sm text-gray-600">
                  Transmettez ces identifiants au représentant. Il devra changer son mot de
                  passe à la première connexion. Ce mot de passe ne sera plus jamais affiché.
                </p>
                <div className="bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-4 space-y-3 text-left">
                  <div>
                    <p className="text-xs text-fuchsia-700 font-bold uppercase flex items-center gap-1">
                      Identifiant de connexion
                    </p>
                    <p className="text-base font-mono font-bold text-gray-900 select-all">
                      {form.telephone}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Le représentant se connecte avec son numéro de téléphone
                    </p>
                  </div>
                  <div className="border-t border-fuchsia-200" />
                  <div>
                    <p className="text-xs text-fuchsia-700 font-bold uppercase">
                      Mot de passe initial
                    </p>
                    <p className="text-base font-mono font-bold text-gray-900 select-all">
                      {passwordInitial}
                    </p>
                  </div>
                  <div className="border-t border-fuchsia-200" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">
                      Username (info uniquement)
                    </p>
                    <p className="text-sm font-mono text-gray-600">{form.username}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Formulaire création/édition */
              <div className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* SECTION 1 : Identité */}
                <section>
                  <h3 className="text-xs font-bold text-fuchsia-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Identité
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="rep-prenom"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Prénom *
                      </label>
                      <input
                        id="rep-prenom"
                        type="text"
                        value={form.prenom_rep}
                        onChange={(e) => setForm({ ...form, prenom_rep: e.target.value })}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                        placeholder="Ex: Aminata"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="rep-nom"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Nom *
                      </label>
                      <input
                        id="rep-nom"
                        type="text"
                        value={form.nom_rep}
                        onChange={(e) => setForm({ ...form, nom_rep: e.target.value })}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                        placeholder="Ex: Diop"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label
                      htmlFor="rep-email"
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email (optionnel)
                    </label>
                    <input
                      id="rep-email"
                      type="email"
                      value={form.email_rep}
                      onChange={(e) => setForm({ ...form, email_rep: e.target.value })}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                      placeholder="aminata.diop@example.com"
                    />
                  </div>
                </section>

                {/* SECTION 2 : Accès */}
                <section>
                  <h3 className="text-xs font-bold text-fuchsia-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Accès &amp; contact
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="rep-username"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Username de connexion *
                      </label>
                      <input
                        id="rep-username"
                        type="text"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        disabled={saving || isEdit}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 disabled:bg-gray-100"
                        placeholder="ex: aminata.diop"
                      />
                      {isEdit && (
                        <p className="text-xs text-gray-500 mt-1">
                          Le username ne peut pas être modifié après création.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="rep-tel"
                          className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Téléphone (login) *
                        </label>
                        <input
                          id="rep-tel"
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          value={form.telephone}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              telephone: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          disabled={saving || isEdit}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 disabled:bg-gray-100"
                          placeholder="771234567"
                        />
                        {isEdit && (
                          <p className="text-xs text-gray-500 mt-1">
                            Le téléphone de connexion n&apos;est pas modifiable.
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="rep-tel-terrain"
                          className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Téléphone terrain
                        </label>
                        <input
                          id="rep-tel-terrain"
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          value={form.telephone_terrain}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              telephone_terrain: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          disabled={saving}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                          placeholder="Si différent du login"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 3 : Paramètres réseau */}
                <section>
                  <h3 className="text-xs font-bold text-fuchsia-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Paramètres réseau
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="rep-localite"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Localité d&apos;affectation *
                      </label>
                      <select
                        id="rep-localite"
                        value={form.id_localite || 0}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            id_localite: Number(e.target.value) || 0,
                          })
                        }
                        disabled={saving || loadingLocalites}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 bg-white disabled:bg-gray-50"
                      >
                        <option value={0}>
                          {loadingLocalites
                            ? 'Chargement des localités…'
                            : localites.length === 0
                              ? 'Aucune localité disponible'
                              : '— Sélectionner une localité —'}
                        </option>
                        {/* Groupement par région pour navigation rapide */}
                        {Array.from(new Set(localites.map((l) => l.nom_region || 'Autre'))).map(
                          (region) => (
                            <optgroup key={region} label={region}>
                              {localites
                                .filter((l) => (l.nom_region || 'Autre') === region)
                                .map((l) => (
                                  <option key={l.id_localite} value={l.id_localite}>
                                    {l.nom_localite}
                                    {l.nom_commune ? ` · ${l.nom_commune}` : ''}
                                  </option>
                                ))}
                            </optgroup>
                          )
                        )}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {localites.length} localité{localites.length > 1 ? 's' : ''} disponible
                        {localites.length > 1 ? 's' : ''} ·{' '}
                        {localites.length === 0
                          ? "Contactez l'administrateur pour ajouter des localités."
                          : 'Triées par région.'}
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                        <Wallet className="w-3.5 h-3.5" />
                        Mode d&apos;encaissement *
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-fuchsia-50 has-[:checked]:border-fuchsia-500 has-[:checked]:bg-fuchsia-50">
                          <input
                            type="radio"
                            name="mode_encaissement"
                            value="WALLET_STRUCTURE"
                            checked={form.mode_encaissement === 'WALLET_STRUCTURE'}
                            onChange={() =>
                              setForm({
                                ...form,
                                mode_encaissement: 'WALLET_STRUCTURE',
                              })
                            }
                            disabled={saving}
                            className="mt-1 accent-fuchsia-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Wallet structure</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Les paiements wallet (OM/WAVE/FREE) vont directement au KALPE de la
                              structure. Traçabilité automatique.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-fuchsia-50 has-[:checked]:border-fuchsia-500 has-[:checked]:bg-fuchsia-50">
                          <input
                            type="radio"
                            name="mode_encaissement"
                            value="LIBRE"
                            checked={form.mode_encaissement === 'LIBRE'}
                            onChange={() => setForm({ ...form, mode_encaissement: 'LIBRE' })}
                            disabled={saving}
                            className="mt-1 accent-fuchsia-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Encaissement libre
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Le rep encaisse en CASH ou wallet manuel. Il devra reverser à
                              l&apos;admin (suivi solde dû).
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
            {passwordInitial ? (
              <button
                type="button"
                onClick={handleConfirmPassword}
                className="flex-1 py-2.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>J&apos;ai noté les identifiants</span>
              </button>
            ) : (
              <>
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
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enregistrement…</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isEdit ? 'Enregistrer' : 'Créer'}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalCreerRepresentant;
