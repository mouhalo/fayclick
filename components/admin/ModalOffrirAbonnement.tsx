/**
 * Modal d'offre d'abonnement gratuit (admin)
 *
 * PRD: docs/prd-admin-gestion-structures-2026-04-30.md § 3.4 (US-4)
 *
 * Backend : `add_abonnement_offert(p_id_structure, p_nb_jours, p_motif, p_id_admin)`
 * - methode='OFFERT', montant=0
 * - Calcul des dates côté serveur : date_debut = MAX(date_fin_dernier_abonnement+1, today)
 * - Le frontend affiche un preview indicatif (peut différer si abonnement existant)
 *
 * UX :
 * - Radios de durées prédéfinies + option Personnalisé (1-730 jours)
 * - Textarea motif requis (10-500 caractères)
 * - Preview dates calculé côté frontend avec note d'avertissement
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Gift,
  Save,
  Loader2,
  Calendar,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/admin.service';
import whatsAppMessageService from '@/services/whatsapp-message.service';
import { useAuth } from '@/contexts/AuthContext';
import SecurityService from '@/services/security.service';

interface ModalOffrirAbonnementProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number | null;
  /** Callback exécuté après l'offre d'abonnement réussie — typiquement recharge le détail */
  onSaved?: () => void;
}

interface DureeOption {
  value: number;
  label: string;
}

const DUREES_PREDEFINIES: DureeOption[] = [
  { value: 7, label: '7 jours' },
  { value: 15, label: '15 jours' },
  { value: 30, label: '1 mois' },
  { value: 90, label: '3 mois' },
  { value: 180, label: '6 mois' },
  { value: 365, label: '1 an' }
];

const MIN_MOTIF = 10;
const MAX_MOTIF = 500;
const MIN_JOURS_PERSO = 1;
const MAX_JOURS_PERSO = 730;

export function ModalOffrirAbonnement({
  isOpen,
  onClose,
  idStructure,
  onSaved
}: ModalOffrirAbonnementProps) {
  const { user } = useAuth();

  // États
  const [selectedDuree, setSelectedDuree] = useState<number>(30);
  const [isPersonnalise, setIsPersonnalise] = useState(false);
  const [dureePerso, setDureePerso] = useState<number>(30);
  const [motif, setMotif] = useState('');
  const [saving, setSaving] = useState(false);

  // Infos structure pour notification WhatsApp post-succès (best-effort, non bloquant)
  const [structureInfo, setStructureInfo] = useState<{
    nom: string;
    mobileOm: string;
    mobileWave: string;
  } | null>(null);

  // Reset à l'ouverture + précharge des infos structure pour notification
  useEffect(() => {
    if (isOpen) {
      setSelectedDuree(30);
      setIsPersonnalise(false);
      setDureePerso(30);
      setMotif('');
      setSaving(false);
      setStructureInfo(null);

      if (idStructure) {
        adminService
          .getUneStructure(idStructure)
          .then((res) => {
            if (res.success && res.data) {
              setStructureInfo({
                nom: res.data.nom_structure || '',
                mobileOm: (res.data.mobile_om || '').trim(),
                mobileWave: (res.data.mobile_wave || '').trim(),
              });
            }
          })
          .catch((err) => {
            // Pré-chargement best-effort : si échec, l'envoi WhatsApp post-save sera juste skippé
            SecurityService.secureLog(
              'warn',
              '[ModalOffrirAbonnement] préchargement structure échoué',
              err
            );
          });
      }
    }
  }, [isOpen, idStructure]);

  const handleClose = () => {
    if (saving) return;
    setSelectedDuree(30);
    setIsPersonnalise(false);
    setDureePerso(30);
    setMotif('');
    setSaving(false);
    onClose();
  };

  // Nombre de jours effectif
  const nbJoursEffectif = isPersonnalise ? dureePerso : selectedDuree;

  // Preview des dates (indicatif côté frontend)
  const today = new Date();
  const dateFin = new Date(today);
  dateFin.setDate(today.getDate() + Math.max(0, nbJoursEffectif - 1));

  const formatDateFR = (d: Date) =>
    d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

  const handleSave = async () => {
    if (!idStructure || !user?.id) {
      toast.error('Session invalide, veuillez vous reconnecter');
      return;
    }

    // Validation côté client
    if (isPersonnalise) {
      if (
        !Number.isFinite(dureePerso) ||
        dureePerso < MIN_JOURS_PERSO ||
        dureePerso > MAX_JOURS_PERSO
      ) {
        toast.error(
          `La durée personnalisée doit être entre ${MIN_JOURS_PERSO} et ${MAX_JOURS_PERSO} jours`
        );
        return;
      }
    } else {
      if (selectedDuree <= 0) {
        toast.error('Veuillez sélectionner une durée');
        return;
      }
    }

    const motifTrim = motif.trim();
    if (motifTrim.length < MIN_MOTIF) {
      toast.error(`Le motif doit contenir au moins ${MIN_MOTIF} caractères`);
      return;
    }
    if (motifTrim.length > MAX_MOTIF) {
      toast.error(`Le motif ne peut pas dépasser ${MAX_MOTIF} caractères`);
      return;
    }

    setSaving(true);
    try {
      const response = await adminService.offrirAbonnement({
        id_structure: idStructure,
        nb_jours: nbJoursEffectif,
        motif: motifTrim,
        id_admin: user.id
      });

      if (response.success) {
        const dateDebutSrv = response.data?.date_debut;
        const dateFinSrv = response.data?.date_fin;
        let msg = `Abonnement offert : ${nbJoursEffectif} jours`;
        if (dateDebutSrv && dateFinSrv) {
          // Format YYYY-MM-DD → fr
          try {
            const d1 = formatDateFR(new Date(dateDebutSrv));
            const d2 = formatDateFR(new Date(dateFinSrv));
            msg = `Abonnement offert : ${nbJoursEffectif} jours du ${d1} au ${d2}`;
          } catch {
            msg = `Abonnement offert : ${nbJoursEffectif} jours du ${dateDebutSrv} au ${dateFinSrv}`;
          }
        }
        toast.success(msg);

        // ===== Notification WhatsApp BEST-EFFORT (non bloquant) =====
        // L'admin a offert un abonnement → on prévient la structure via WhatsApp.
        // En cas d'échec : toast warning séparé, l'offre reste validée.
        const phoneToNotify =
          structureInfo?.mobileOm || structureInfo?.mobileWave || '';
        const nomStructure = structureInfo?.nom || '';

        if (phoneToNotify && nomStructure && dateFinSrv) {
          try {
            const wa = await whatsAppMessageService.sendSubscriptionOfferedNotification(
              phoneToNotify,
              nomStructure,
              nbJoursEffectif,
              dateFinSrv
            );
            if (wa.success) {
              toast.success('Notification WhatsApp envoyée à la structure');
            } else {
              toast.warning(
                `WhatsApp non envoyé : ${wa.message || wa.error_code || 'erreur'}`
              );
            }
          } catch (waErr) {
            SecurityService.secureLog(
              'warn',
              '[ModalOffrirAbonnement] WhatsApp offre abo échec',
              waErr
            );
            toast.warning('WhatsApp non envoyé (réseau)');
          }
        } else if (!phoneToNotify) {
          toast.warning(
            'Aucun numéro WhatsApp configuré pour cette structure'
          );
        }

        if (onSaved) onSaved();
        handleClose();
      } else {
        toast.error(response.message || "Erreur lors de l'offre d'abonnement");
      }
    } catch (err) {
      SecurityService.secureLog('error', '[ModalOffrirAbonnement] erreur', err);
      toast.error("Erreur lors de l'offre d'abonnement");
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
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Gift className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Offrir un abonnement
              </h2>
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
            <div className="space-y-5">
              {/* Note explicative */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
                <Gift className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-200/90">
                  L&apos;abonnement offert est gratuit (méthode &laquo; OFFERT &raquo;,
                  montant 0 FCFA) et tracé dans le journal d&apos;audit.
                </p>
              </div>

              {/* Sélection durée */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Durée <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DUREES_PREDEFINIES.map((duree) => {
                    const checked = !isPersonnalise && selectedDuree === duree.value;
                    return (
                      <button
                        key={duree.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPersonnalise(false);
                          setSelectedDuree(duree.value);
                        }}
                        disabled={saving}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                          checked
                            ? 'bg-green-500/20 text-green-300 border-green-500/50'
                            : 'bg-gray-700/30 text-gray-300 border-gray-600 hover:bg-gray-700/60'
                        }`}
                      >
                        {duree.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPersonnalise(true);
                    }}
                    disabled={saving}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                      isPersonnalise
                        ? 'bg-green-500/20 text-green-300 border-green-500/50'
                        : 'bg-gray-700/30 text-gray-300 border-gray-600 hover:bg-gray-700/60'
                    }`}
                  >
                    Personnalisé
                  </button>
                </div>
              </div>

              {/* Input personnalisé */}
              <AnimatePresence initial={false}>
                {isPersonnalise && (
                  <motion.div
                    key="duree-perso"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <label
                      htmlFor="duree-perso-input"
                      className="block text-sm font-medium text-gray-300 mb-1.5"
                    >
                      Nombre de jours (1 - 730)
                    </label>
                    <input
                      id="duree-perso-input"
                      type="number"
                      min={MIN_JOURS_PERSO}
                      max={MAX_JOURS_PERSO}
                      step={1}
                      value={dureePerso}
                      onChange={(e) => setDureePerso(Number(e.target.value))}
                      disabled={saving}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Ex: 45"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Motif */}
              <div>
                <label
                  htmlFor="motif-offert"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Motif <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="motif-offert"
                  rows={3}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  maxLength={MAX_MOTIF}
                  disabled={saving}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:opacity-50 resize-none"
                  placeholder="Ex: Compensation incident production du 15/04/2026"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    Minimum {MIN_MOTIF} caractères, requis pour le journal d&apos;audit
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      motif.length < MIN_MOTIF
                        ? 'text-orange-400'
                        : motif.length > MAX_MOTIF
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {motif.length}/{MAX_MOTIF}
                  </p>
                </div>
              </div>

              {/* Preview des dates */}
              <div className="bg-gray-700/30 border border-gray-700 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-sm">
                    <p className="text-gray-400 text-xs mb-1">Aperçu (indicatif)</p>
                    <p className="text-white">
                      Date début :{' '}
                      <span className="font-semibold">{formatDateFR(today)}</span>
                    </p>
                    <p className="text-white">
                      Date fin :{' '}
                      <span className="font-semibold">{formatDateFR(dateFin)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-gray-600/50">
                  <Info className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    La date réelle peut être ajustée selon les abonnements existants
                    (le serveur démarre l&apos;abonnement après la fin du dernier
                    abonnement actif).
                  </p>
                </div>
              </div>
            </div>
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
              disabled={saving || motif.trim().length < MIN_MOTIF}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Offrir l&apos;abonnement</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalOffrirAbonnement;
