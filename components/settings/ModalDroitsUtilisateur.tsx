'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, X, Loader2, BarChart3, Package, Wallet, Settings } from 'lucide-react';
import UsersService from '@/services/users.service';
import DatabaseService from '@/services/database.service';
import { UtilisateurData } from '@/types/users';

interface ModalDroitsUtilisateurProps {
  userData: UtilisateurData;
  id_structure: number;
  onClose: () => void;
  onShowMessage?: (message: string, type: 'success' | 'error') => void;
  onRightsUpdated?: () => void;
}

// Mapping statique id → nom (table fonctionnalite)
const FONCTIONNALITES: { id: number; nom: string }[] = [
  { id: 1,  nom: 'VOIR VALEUR STOCK PA' },
  { id: 2,  nom: 'VOIR NOMBRE PRODUITS' },
  { id: 3,  nom: "VOIR CHIFFRE D'AFFAIRE" },
  { id: 4,  nom: 'VOIR BENEFICE' },
  { id: 5,  nom: 'VOIR VALEUR MARCH PV' },
  { id: 6,  nom: 'MODIFIER PRODUIT' },
  { id: 7,  nom: 'SUPPRIMER PRODUIT' },
  { id: 8,  nom: 'EXPORTER PRODUIT' },
  { id: 10, nom: 'AJOUTER DEPENSE' },
  { id: 11, nom: 'GERER PARAMETRAGES' },
  { id: 12, nom: 'VOIR INVENTAIRE' },
  { id: 13, nom: 'VOIR TOTAL FACTURES' },
];

// Index par nom pour lookup rapide
const NOM_TO_ID: Record<string, number> = {};
FONCTIONNALITES.forEach(f => { NOM_TO_ID[f.nom] = f.id; });

// Groupes par catégorie
const CATEGORIES: { label: string; icon: React.ReactNode; ids: number[] }[] = [
  {
    label: 'Dashboard',
    icon: <BarChart3 className="h-4 w-4" />,
    ids: [3, 4, 1, 5, 2, 13]
  },
  {
    label: 'Produits',
    icon: <Package className="h-4 w-4" />,
    ids: [6, 7, 8]
  },
  {
    label: 'Dépenses & Inventaire',
    icon: <Wallet className="h-4 w-4" />,
    ids: [10, 12]
  },
  {
    label: 'Système',
    icon: <Settings className="h-4 w-4" />,
    ids: [11]
  }
];

// Labels lisibles
const LABELS: Record<number, string> = {
  1:  'Voir valeur stock (PA)',
  2:  'Voir nombre de produits',
  3:  "Voir chiffre d'affaires",
  4:  'Voir bénéfice',
  5:  'Voir valeur marchande (PV)',
  6:  'Modifier un produit',
  7:  'Supprimer un produit',
  8:  'Exporter les produits',
  10: 'Ajouter une dépense',
  11: 'Accéder aux paramètres',
  12: 'Voir inventaire',
  13: 'Voir total factures'
};

// État local d'un droit
interface DroitLocal {
  id: number;
  nom: string;
  autorise: boolean;
}

export default function ModalDroitsUtilisateur({
  userData,
  id_structure,
  onClose,
  onShowMessage,
  onRightsUpdated
}: ModalDroitsUtilisateurProps) {
  const [droits, setDroits] = useState<DroitLocal[]>([]);
  const [isLoadingRights, setIsLoadingRights] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const activesCount = droits.filter(d => d.autorise).length;

  // Charger les droits via get_mes_droits à l'ouverture
  useEffect(() => {
    const loadRights = async () => {
      try {
        setIsLoadingRights(true);
        const results = await DatabaseService.getUserRights(id_structure, userData.profil.id_profil);

        console.log('🛡️ [MODAL DROITS] Résultat get_mes_droits:', results);

        // Parser la réponse PostgreSQL
        let rightsData: any;
        if (Array.isArray(results) && results.length > 0) {
          const raw = results[0] as any;
          if (typeof raw === 'string') {
            rightsData = JSON.parse(raw);
          } else if (raw.get_mes_droits) {
            const d = raw.get_mes_droits;
            rightsData = typeof d === 'string' ? JSON.parse(d) : d;
          } else {
            rightsData = raw;
          }
        }

        // Transformer en DroitLocal[]
        // get_mes_droits retourne : { fonctionnalites: [{"NOM": "oui"}, {"NOM2": "non"}, ...] }
        const foncs: Record<string, string>[] = rightsData?.fonctionnalites || [];
        const mapped: DroitLocal[] = [];

        for (const obj of foncs) {
          const nom = Object.keys(obj)[0];
          const valeur = obj[nom];
          const id = NOM_TO_ID[nom];
          if (id) {
            mapped.push({ id, nom, autorise: valeur === 'oui' });
          }
        }

        console.log('✅ [MODAL DROITS] Droits chargés:', mapped.length, 'fonctionnalités');
        setDroits(mapped);
      } catch (error) {
        console.error('❌ [MODAL DROITS] Erreur chargement droits:', error);
        onShowMessage?.('Impossible de charger les droits', 'error');
      } finally {
        setIsLoadingRights(false);
      }
    };

    loadRights();
  }, [id_structure, userData.profil.id_profil, onShowMessage]);

  const handleToggle = useCallback(async (droit: DroitLocal) => {
    const newValue = !droit.autorise;
    setLoadingId(droit.id);

    try {
      await UsersService.updateUserRight(
        id_structure,
        userData.profil.id_profil,
        droit.id,
        newValue
      );

      setDroits(prev =>
        prev.map(d => d.id === droit.id ? { ...d, autorise: newValue } : d)
      );

      onShowMessage?.(
        newValue ? 'Droit activé' : 'Droit révoqué',
        'success'
      );
      onRightsUpdated?.();
    } catch (error) {
      console.error('Erreur toggle droit:', error);
      onShowMessage?.(
        error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
        'error'
      );
    } finally {
      setLoadingId(null);
    }
  }, [id_structure, userData.profil.id_profil, onShowMessage, onRightsUpdated]);

  const getDroit = (id: number) => droits.find(d => d.id === id);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  Droits de {userData.username}
                </h2>
                <p className="text-indigo-100 text-sm">{userData.profil.nom_profil}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {isLoadingRights ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-gray-600">Chargement des droits...</span>
              </div>
            ) : (
              CATEGORIES.map((cat) => {
                const foncs = cat.ids.map(id => getDroit(id)).filter(Boolean) as DroitLocal[];
                if (foncs.length === 0) return null;

                return (
                  <div key={cat.label}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-indigo-600">{cat.icon}</span>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        {cat.label}
                      </h3>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                      {foncs.map((droit) => {
                        const isLoading = loadingId === droit.id;
                        const label = LABELS[droit.id] || droit.nom;

                        return (
                          <div
                            key={droit.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <span className="text-sm text-gray-700 font-medium">{label}</span>

                            {isLoading ? (
                              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggle(droit)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                                  droit.autorise ? 'bg-indigo-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    droit.autorise ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer - compteur */}
          {!isLoadingRights && (
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {activesCount}/{droits.length} droits activés
                </span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${droits.length > 0 ? (activesCount / droits.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
