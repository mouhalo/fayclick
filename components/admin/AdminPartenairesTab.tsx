'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Handshake,
  UserCheck,
  UserX,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Power,
  Calendar,
  RefreshCw,
  Loader2,
  X,
  Tag,
  Phone,
  Mail,
  MapPin,
  Percent,
  CalendarClock,
  CheckCircle,
  XCircle,
  Building2,
  Clock
} from 'lucide-react';
import adminService from '@/services/admin.service';
import {
  AdminPartenaire,
  AdminPartenairesStats,
  AdminListPartenairesParams,
  AddEditPartenaireParams
} from '@/types/admin.types';
import { toast } from 'sonner';

// ========================================
// Types locaux
// ========================================
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

// ========================================
// Composant KPI Card
// ========================================
function KPICard({ title, value, subtitle, icon, color }: KPICardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-white shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-white/70 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 bg-white/20 rounded-lg">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ========================================
// Composant Badge
// ========================================
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.gray}`}>
      {children}
    </span>
  );
}

// ========================================
// Composant Modal Add/Edit Partenaire
// ========================================
interface ModalPartenaireProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddEditPartenaireParams) => Promise<void>;
  partenaire?: AdminPartenaire | null;
  loading?: boolean;
}

function ModalPartenaire({ isOpen, onClose, onSave, partenaire, loading }: ModalPartenaireProps) {
  const isEdit = !!partenaire;
  const [formData, setFormData] = useState<AddEditPartenaireParams>({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    code_promo: '',
    commission_pct: 5,
    valide_jusqua: ''
  });

  // Initialiser les données du formulaire
  useEffect(() => {
    if (isOpen) {
      if (partenaire) {
        setFormData({
          nom: partenaire.nom_partenaire || '',
          telephone: partenaire.telephone || '',
          email: partenaire.email || '',
          adresse: partenaire.adresse || '',
          code_promo: partenaire.code_promo || '',
          commission_pct: partenaire.commission_pct || 5,
          valide_jusqua: partenaire.valide_jusqua?.split('T')[0] || '',
          id_partenaire: partenaire.id_partenaire
        });
      } else {
        // Date par défaut : 1 an à partir d'aujourd'hui
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() + 1);
        setFormData({
          nom: '',
          telephone: '',
          email: '',
          adresse: '',
          code_promo: '',
          commission_pct: 5,
          valide_jusqua: defaultDate.toISOString().split('T')[0]
        });
      }
    }
  }, [isOpen, partenaire]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.nom?.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    if (!formData.telephone?.trim()) {
      toast.error('Le téléphone est obligatoire');
      return;
    }
    if (!formData.valide_jusqua) {
      toast.error('La date de validité est obligatoire');
      return;
    }

    await onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Handshake className="w-5 h-5 text-orange-400" />
              {isEdit ? 'Modifier le partenaire' : 'Nouveau partenaire'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Nom */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Nom du partenaire <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="Ex: Orange Sénégal"
                required
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                <Phone className="w-3 h-3 inline mr-1" />
                Téléphone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="771234567"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                <Mail className="w-3 h-3 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="contact@partenaire.com"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                Adresse
              </label>
              <input
                type="text"
                value={formData.adresse}
                onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="Dakar, Sénégal"
              />
            </div>

            {/* Code Promo */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                <Tag className="w-3 h-3 inline mr-1" />
                Code Promo
                <span className="text-gray-500 text-xs ml-2">(auto-généré si vide)</span>
              </label>
              <input
                type="text"
                value={formData.code_promo}
                onChange={e => setFormData({ ...formData, code_promo: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white uppercase focus:outline-none focus:border-orange-500"
                placeholder="ORANGE2026"
                maxLength={11}
              />
            </div>

            {/* Commission % et Date validité en 2 colonnes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <Percent className="w-3 h-3 inline mr-1" />
                  Commission %
                </label>
                <input
                  type="number"
                  value={formData.commission_pct}
                  onChange={e => setFormData({ ...formData, commission_pct: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  min={0}
                  max={50}
                  step={0.5}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <CalendarClock className="w-3 h-3 inline mr-1" />
                  Valide jusqu'au <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.valide_jusqua}
                  onChange={e => setFormData({ ...formData, valide_jusqua: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ========================================
// Composant Modal Prolonger
// ========================================
interface ModalProlongerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (duration: number | string) => Promise<void>;
  partenaire?: AdminPartenaire | null;
  loading?: boolean;
}

function ModalProlonger({ isOpen, onClose, onSave, partenaire, loading }: ModalProlongerProps) {
  const [mode, setMode] = useState<'months' | 'date'>('months');
  const [months, setMonths] = useState(6);
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('months');
      setMonths(6);
      // Date par défaut : 6 mois après la date actuelle de validité
      if (partenaire?.valide_jusqua) {
        const newDate = new Date(partenaire.valide_jusqua);
        newDate.setMonth(newDate.getMonth() + 6);
        setCustomDate(newDate.toISOString().split('T')[0]);
      }
    }
  }, [isOpen, partenaire]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'months') {
      await onSave(months);
    } else {
      await onSave(customDate);
    }
  };

  if (!isOpen || !partenaire) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-800 rounded-2xl w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-400" />
              Prolonger la validité
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Info partenaire */}
          <div className="p-4 bg-gray-700/30 border-b border-gray-700">
            <p className="text-white font-medium">{partenaire.nom_partenaire}</p>
            <p className="text-sm text-gray-400">
              Expire le : {new Date(partenaire.valide_jusqua).toLocaleDateString('fr-FR')}
              {partenaire.est_expire && (
                <span className="ml-2 text-red-400">(Expiré)</span>
              )}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Toggle mode */}
            <div className="flex rounded-lg bg-gray-700 p-1">
              <button
                type="button"
                onClick={() => setMode('months')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'months' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Par durée
              </button>
              <button
                type="button"
                onClick={() => setMode('date')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'date' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Date précise
              </button>
            </div>

            {mode === 'months' ? (
              <div className="space-y-3">
                <label className="block text-sm text-gray-400">Prolonger de :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 6, 12].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonths(m)}
                      className={`py-3 rounded-lg text-sm font-medium transition-colors ${
                        months === m
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {m} mois
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nouvelle date de fin :</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Prolonger
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ========================================
// Composant Principal
// ========================================
export default function AdminPartenairesTab() {
  // États
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [partenaires, setPartenaires] = useState<AdminPartenaire[]>([]);
  const [stats, setStats] = useState<AdminPartenairesStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 15;

  // Filtres
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActif, setFilterActif] = useState<boolean | undefined>();

  // Modals
  const [showModalPartenaire, setShowModalPartenaire] = useState(false);
  const [showModalProlonger, setShowModalProlonger] = useState(false);
  const [selectedPartenaire, setSelectedPartenaire] = useState<AdminPartenaire | null>(null);

  // Chargement des partenaires
  const loadPartenaires = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: AdminListPartenairesParams = {
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE
      };

      if (search) params.search = search;
      if (filterActif !== undefined) params.actif = filterActif;

      const response = await adminService.getListPartenaires(params);

      if (response.success && response.data) {
        setPartenaires(response.data.partenaires || []);
        setStats(response.data.stats);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError('Erreur lors du chargement des partenaires');
      }
    } catch (err) {
      console.error('Erreur chargement partenaires:', err);
      setError('Impossible de charger les partenaires');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterActif]);

  // Chargement initial
  useEffect(() => {
    loadPartenaires();
  }, [loadPartenaires]);

  // Reset page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [search, filterActif]);

  // Formatage date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handlers
  const handleAddEdit = async (data: AddEditPartenaireParams) => {
    setActionLoading(true);
    try {
      const response = await adminService.addEditPartenaire(data);
      if (response.success) {
        toast.success(response.message || (data.id_partenaire ? 'Partenaire modifié' : 'Partenaire créé'));
        setShowModalPartenaire(false);
        setSelectedPartenaire(null);
        loadPartenaires();
      } else {
        toast.error(response.message || 'Erreur lors de la sauvegarde');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActif = async (partenaire: AdminPartenaire) => {
    setActionLoading(true);
    try {
      const response = await adminService.togglePartenaireActif(partenaire.id_partenaire);
      if (response.success) {
        toast.success(response.message);
        loadPartenaires();
      } else {
        toast.error(response.message || 'Erreur');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProlonger = async (duration: number | string) => {
    if (!selectedPartenaire) return;

    setActionLoading(true);
    try {
      const response = await adminService.prolongerPartenaire(selectedPartenaire.id_partenaire, duration);
      if (response.success) {
        toast.success(response.message);
        setShowModalProlonger(false);
        setSelectedPartenaire(null);
        loadPartenaires();
      } else {
        toast.error(response.message || 'Erreur');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  // Statut badge
  const getStatutBadge = (partenaire: AdminPartenaire) => {
    if (!partenaire.actif) {
      return <Badge color="gray">Inactif</Badge>;
    }
    if (partenaire.est_expire) {
      return <Badge color="red">Expiré</Badge>;
    }
    if (partenaire.jours_restants <= 30) {
      return <Badge color="orange">Expire bientôt</Badge>;
    }
    return <Badge color="green">Actif</Badge>;
  };

  if (loading && partenaires.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="ml-3 text-gray-400">Chargement des partenaires...</span>
      </div>
    );
  }

  if (error && partenaires.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadPartenaires}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Handshake className="w-6 h-6 text-orange-400" />
            Gestion des Partenaires
          </h2>
          <p className="text-gray-400 text-sm">{total} partenaires au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedPartenaire(null);
              setShowModalPartenaire(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtres
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={loadPartenaires}
            disabled={loading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Partenaires"
            value={stats.total_partenaires}
            icon={<Handshake className="w-5 h-5" />}
            color="orange"
          />
          <KPICard
            title="Actifs"
            value={stats.partenaires_actifs}
            subtitle={`${Math.round((stats.partenaires_actifs / Math.max(stats.total_partenaires, 1)) * 100)}%`}
            icon={<UserCheck className="w-5 h-5" />}
            color="green"
          />
          <KPICard
            title="Expirés"
            value={stats.partenaires_expires}
            icon={<Clock className="w-5 h-5" />}
            color="red"
          />
          <KPICard
            title="Structures parrainées"
            value={stats.structures_parraines}
            subtitle={`+${stats.structures_ce_mois} ce mois`}
            icon={<Building2 className="w-5 h-5" />}
            color="blue"
          />
        </div>
      )}

      {/* Filtres dépliables */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
        >
          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, code promo, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Filtre Statut */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Statut</label>
            <select
              value={filterActif === undefined ? '' : filterActif.toString()}
              onChange={(e) => setFilterActif(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700 bg-gray-800/50">
                <th className="p-3 font-medium">Partenaire</th>
                <th className="p-3 font-medium">Code Promo</th>
                <th className="p-3 font-medium">Commission</th>
                <th className="p-3 font-medium">Validité</th>
                <th className="p-3 font-medium">Structures</th>
                <th className="p-3 font-medium">Statut</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partenaires.map((partenaire) => (
                <tr key={partenaire.id_partenaire} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-white">{partenaire.nom_partenaire}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {partenaire.telephone}
                      </p>
                      {partenaire.email && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {partenaire.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-orange-400" />
                      <span className="font-mono text-orange-400 font-medium">{partenaire.code_promo}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-white">{partenaire.commission_pct}%</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className={partenaire.est_expire ? 'text-red-400' : 'text-gray-300'}>
                        {formatDate(partenaire.valide_jusqua)}
                      </span>
                    </div>
                    {!partenaire.est_expire && partenaire.jours_restants > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {partenaire.jours_restants} jour{partenaire.jours_restants > 1 ? 's' : ''} restant{partenaire.jours_restants > 1 ? 's' : ''}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-center">
                      <p className="text-white font-medium">{partenaire.stats.nombre_structures}</p>
                      <p className="text-xs text-gray-500">
                        {partenaire.stats.structures_actives} actives
                      </p>
                    </div>
                  </td>
                  <td className="p-3">
                    {getStatutBadge(partenaire)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Éditer */}
                      <button
                        onClick={() => {
                          setSelectedPartenaire(partenaire);
                          setShowModalPartenaire(true);
                        }}
                        className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {/* Prolonger */}
                      <button
                        onClick={() => {
                          setSelectedPartenaire(partenaire);
                          setShowModalProlonger(true);
                        }}
                        className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-gray-400 hover:text-blue-400"
                        title="Prolonger"
                      >
                        <CalendarClock className="w-4 h-4" />
                      </button>
                      {/* Toggle actif */}
                      <button
                        onClick={() => handleToggleActif(partenaire)}
                        disabled={actionLoading}
                        className={`p-2 hover:bg-gray-600 rounded-lg transition-colors ${
                          partenaire.actif ? 'text-emerald-400 hover:text-red-400' : 'text-gray-400 hover:text-emerald-400'
                        }`}
                        title={partenaire.actif ? 'Désactiver' : 'Activer'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {partenaires.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Aucun partenaire trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t border-gray-700 bg-gray-800/30">
          <span className="text-sm text-gray-400">
            {total} partenaire{total > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-300">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModalPartenaire
        isOpen={showModalPartenaire}
        onClose={() => {
          setShowModalPartenaire(false);
          setSelectedPartenaire(null);
        }}
        onSave={handleAddEdit}
        partenaire={selectedPartenaire}
        loading={actionLoading}
      />

      <ModalProlonger
        isOpen={showModalProlonger}
        onClose={() => {
          setShowModalProlonger(false);
          setSelectedPartenaire(null);
        }}
        onSave={handleProlonger}
        partenaire={selectedPartenaire}
        loading={actionLoading}
      />
    </div>
  );
}
