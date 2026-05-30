/**
 * PanierSidePanel - Panneau lateral non-modal pour le panier
 * Reserve au desktop (>=1024px), affiche a droite de la grille produits
 * Reprend le contenu de ModalPanier dans un format sticky panel
 *
 * EPIC 4 — Phase 6 (FR-017) :
 *   Dropdown 3 modes : Facture / Proforma / Bon de Commande
 *   Visible uniquement si compte_prive === true (sinon mode 'facture' force)
 *   Persistance localStorage par structure : 'fayclick_panier_mode_{id_structure}'
 *
 *   3 stores Zustand independants coexistent en localStorage :
 *     - usePanierStore               (mode 'facture')
 *     - usePanierProformaStore       (mode 'proforma')
 *     - usePanierBonCommandeStore    (mode 'bonCommande')
 *
 *   L'utilisateur peut basculer entre les 3 modes sans perdre son travail.
 *
 *   Feature flag ENABLE_DOCUMENT_DROPDOWN : passer a false pour revenir
 *   instantanement au comportement legacy (checkbox proforma) en cas
 *   de regression critique en production.
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  ShoppingCart, Trash2, Plus, Minus,
  Calculator, CreditCard, User, XCircle, GripVertical, X,
  FileCheck, FileText, Package, AlertTriangle
} from 'lucide-react';
import { usePanierStore } from '@/stores/panierStore';
import { usePanierProformaStore } from '@/stores/panierProformaStore';
import { usePanierBonCommandeStore } from '@/stores/panierBonCommandeStore';
import { factureService } from '@/services/facture.service';
import { proformaService } from '@/services/proforma.service';
import { bonCommandeService } from '@/services/bon-commande.service';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentMode, type DocumentMode } from '@/contexts/DocumentModeContext';
import { useToast } from '@/components/ui/Toast';
import { useFactureSuccessStore } from '@/hooks/useFactureSuccess';
import { ModalRechercheClient } from './ModalRechercheClient';
import { ModalImpressionProforma } from '@/components/proformas/ModalImpressionProforma';
import { ModalImpressionBonCommande } from '@/components/boncommandes/ModalImpressionBonCommande';
import { ModalGestionFournisseurs } from '@/components/fournisseurs/ModalGestionFournisseurs';
import { Client } from '@/types/client';
import { Proforma, ProformaDetail } from '@/types/proforma';
import { BonCommande, BonCommandeDetail, BonCommandeFournisseurEnrichi } from '@/types/bon-commande';
import { Fournisseur } from '@/types/fournisseur';
import { ArticlePanier } from '@/types/produit';
import { useTranslations } from '@/hooks/useTranslations';

// =============================================================================
// FEATURE FLAG (mitigation R1 — rollback rapide)
// =============================================================================
//
// true  -> Nouveau dropdown 3 modes (Facture / Proforma / Bon de Commande)
// false -> Comportement legacy (checkbox Proforma + mode Facture seul)
//
// En cas de regression critique en production, passer ce flag a false +
// rebuild + redeploy. Le code legacy est preserve dans une branche isolee
// du render pour une bascule sans risque.
const ENABLE_DOCUMENT_DROPDOWN = true;

// =============================================================================
// TYPES
// =============================================================================

// DocumentMode est exporte depuis DocumentModeContext (source de verite unique)

interface PanierSidePanelProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

/**
 * Contrat commun pour les 3 stores (adaptateur).
 * Aplatit les differences d'API (infosClient vs infosFournisseur,
 * getMontantsFacture vs getMontantsProforma vs getMontantsBonCommande).
 */
interface PanierAdapter {
  articles: ArticlePanier[];
  remise: number;
  montants: { sous_total: number; remise: number; montant_net: number };
  // Cible generique (client OU fournisseur)
  targetIsSet: boolean;
  targetPrimaryLabel: string;    // Nom client OU nom fournisseur
  targetSecondaryLabel: string;  // Tel client OU tel/email fournisseur
  // Actions communes (memes signatures dans les 3 stores)
  updateQuantity: (id_produit: number, quantity: number) => void;
  removeArticle: (id_produit: number) => void;
  updateRemiseArticle: (id_produit: number, remise_val: number) => void;
  clearRemisesArticles: () => void;
  updateRemise: (remise: number) => void;
  clearPanier: () => void;
}

export function PanierSidePanel({ onSuccess, onClose }: PanierSidePanelProps) {
  // =========================================================================
  // AUTH & STRUCTURE
  // =========================================================================
  const { structure } = useAuth();
  const comptePrive = structure?.compte_prive === true;
  // idStructure n'est plus utilise ici — la persistance du mode est geree
  // par DocumentModeContext (par structure).

  const { showToast } = useToast();
  const t = useTranslations('panier');
  const { openModal: openFactureSuccess } = useFactureSuccessStore();

  // =========================================================================
  // STORES (3 panniers independants)
  // =========================================================================
  const facturePanier = usePanierStore();
  const proformaPanier = usePanierProformaStore();
  const bonCommandePanier = usePanierBonCommandeStore();

  // =========================================================================
  // STATE LOCAL
  // =========================================================================
  const [isLoading, setIsLoading] = useState(false);
  const [isModalRechercheOpen, setIsModalRechercheOpen] = useState(false);
  const [isModalFournisseurOpen, setIsModalFournisseurOpen] = useState(false);

  // Mode document — source de verite via DocumentModeContext
  // (persistance localStorage + hydratation cross-structure geres dans le provider)
  const { mode: documentModeRaw, setMode: setDocumentModeCtx } = useDocumentMode();

  // Si feature flag OFF, on force 'facture' (le legacy render se charge du reste).
  // Sinon, le mode reflete directement le context.
  const documentMode: DocumentMode = ENABLE_DOCUMENT_DROPDOWN ? documentModeRaw : 'facture';

  // Wrapper : ne propage le setMode au context que si le flag est ON
  const setDocumentMode = (m: DocumentMode) => {
    if (ENABLE_DOCUMENT_DROPDOWN) setDocumentModeCtx(m);
  };

  // Garde de coherence : si feature flag OFF mais mode != facture en localStorage,
  // forcer le retour a 'facture' dans le context (reset propre)
  useEffect(() => {
    if (!ENABLE_DOCUMENT_DROPDOWN && documentModeRaw !== 'facture') {
      setDocumentModeCtx('facture');
    }
  }, [documentModeRaw, setDocumentModeCtx]);

  // Modal impression proforma apres creation
  const [modalImpressionProforma, setModalImpressionProforma] = useState<{
    isOpen: boolean;
    proforma: Proforma | null;
    details: ProformaDetail[];
  }>({ isOpen: false, proforma: null, details: [] });

  // Modal impression bon de commande apres creation (FR-024 — workflow miroir proforma)
  const [modalImpressionBC, setModalImpressionBC] = useState<{
    isOpen: boolean;
    bc: BonCommande | null;
    details: BonCommandeDetail[];
    fournisseur: BonCommandeFournisseurEnrichi | null;
  }>({ isOpen: false, bc: null, details: [], fournisseur: null });

  // Legacy : ancien checkbox proforma (preserve pour la branche feature flag OFF)
  const [isProformaLegacy, setIsProformaLegacy] = useState(false);

  // Mode remise : '%' (pourcentage) ou 'F' (valeur fixe)
  const [remiseMode, setRemiseMode] = useState<'%' | 'F'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vf_remise_mode') as '%' | 'F') || '%';
    }
    return '%';
  });
  const [remiseInput, setRemiseInput] = useState<number>(0);

  // =========================================================================
  // ADAPTATEUR : aplatit les 3 stores vers une API commune
  // =========================================================================
  const adapter: PanierAdapter = useMemo(() => {
    if (documentMode === 'proforma') {
      const m = proformaPanier.getMontantsProforma();
      const client = proformaPanier.infosClient;
      const hasClient = !!(client.id_client || (client.nom_client_payeur && client.nom_client_payeur !== 'CLIENT_ANONYME'));
      return {
        articles: proformaPanier.articles,
        remise: proformaPanier.remise,
        montants: { sous_total: m.sous_total, remise: m.remise, montant_net: m.montant_net },
        targetIsSet: hasClient,
        targetPrimaryLabel: hasClient ? (client.nom_client_payeur || '') : '',
        targetSecondaryLabel: hasClient ? (client.tel_client || '') : '',
        updateQuantity: proformaPanier.updateQuantity,
        removeArticle: proformaPanier.removeArticle,
        updateRemiseArticle: proformaPanier.updateRemiseArticle,
        clearRemisesArticles: proformaPanier.clearRemisesArticles,
        updateRemise: proformaPanier.updateRemise,
        clearPanier: proformaPanier.clearPanier,
      };
    }

    if (documentMode === 'bonCommande') {
      const m = bonCommandePanier.getMontantsBonCommande();
      const f = bonCommandePanier.infosFournisseur;
      const hasFournisseur = !!(f.id_fournisseur && f.id_fournisseur > 0);
      return {
        articles: bonCommandePanier.articles,
        remise: bonCommandePanier.remise,
        montants: { sous_total: m.sous_total, remise: m.remise, montant_net: m.montant_net },
        targetIsSet: hasFournisseur,
        targetPrimaryLabel: hasFournisseur ? (f.nom_fournisseur || '') : '',
        targetSecondaryLabel: hasFournisseur ? (f.tel_fournisseur || f.description || '') : '',
        updateQuantity: bonCommandePanier.updateQuantity,
        removeArticle: bonCommandePanier.removeArticle,
        updateRemiseArticle: bonCommandePanier.updateRemiseArticle,
        clearRemisesArticles: bonCommandePanier.clearRemisesArticles,
        updateRemise: bonCommandePanier.updateRemise,
        clearPanier: bonCommandePanier.clearPanier,
      };
    }

    // Mode facture (par defaut)
    const m = facturePanier.getMontantsFacture();
    const client = facturePanier.infosClient;
    const hasClient = !!(client.id_client || (client.nom_client_payeur && client.nom_client_payeur !== 'CLIENT_ANONYME'));
    return {
      articles: facturePanier.articles,
      remise: facturePanier.remise,
      montants: { sous_total: m.sous_total, remise: m.remise, montant_net: m.montant_net },
      targetIsSet: hasClient,
      targetPrimaryLabel: hasClient ? (client.nom_client_payeur || '') : '',
      targetSecondaryLabel: hasClient ? (client.tel_client || '') : '',
      updateQuantity: facturePanier.updateQuantity,
      removeArticle: facturePanier.removeArticle,
      updateRemiseArticle: facturePanier.updateRemiseArticle,
      clearRemisesArticles: facturePanier.clearRemisesArticles,
      updateRemise: facturePanier.updateRemise,
      clearPanier: facturePanier.clearPanier,
    };
  }, [documentMode, facturePanier, proformaPanier, bonCommandePanier]);

  const { articles, montants } = adapter;
  const sousTotal = montants.sous_total;

  // =========================================================================
  // HANDLERS REMISE
  // =========================================================================
  const handleRemiseModeChange = (mode: '%' | 'F') => {
    setRemiseMode(mode);
    localStorage.setItem('vf_remise_mode', mode);
    setRemiseInput(0);
    adapter.updateRemise(0);
    adapter.clearRemisesArticles();
  };

  const handleRemiseInputChange = (value: number) => {
    setRemiseInput(value);
    if (remiseMode === '%') {
      const pct = Math.max(0, Math.min(100, value));
      adapter.updateRemise(Math.round(sousTotal * pct / 100));
    } else {
      adapter.updateRemise(Math.max(0, Math.min(sousTotal, value)));
    }
  };

  // Recalculer la remise store si le sous-total change en mode %
  useEffect(() => {
    if (remiseMode === '%' && remiseInput > 0) {
      adapter.updateRemise(Math.round(sousTotal * Math.min(100, remiseInput) / 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sousTotal, documentMode]);

  // Reset l'input remise au switch de mode (la remise stored reste dans son store)
  useEffect(() => {
    setRemiseInput(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentMode]);

  // =========================================================================
  // HANDLERS ARTICLES
  // =========================================================================
  const handleUpdateQuantity = (id_produit: number, newQuantity: number) => {
    adapter.updateQuantity(id_produit, newQuantity);
  };

  const handleRemoveArticle = (id_produit: number) => {
    adapter.removeArticle(id_produit);
    showToast('info', 'Article supprime', 'L\'article a ete retire du panier');
  };

  // =========================================================================
  // HANDLERS CIBLE (client / fournisseur)
  // =========================================================================
  const handleSelectClient = (client: Partial<Client> & { nom_client: string; tel_client: string }) => {
    const infos = {
      id_client: client.id_client,
      nom_client_payeur: client.nom_client,
      tel_client: client.tel_client,
    };
    if (documentMode === 'proforma') {
      proformaPanier.updateInfosClient(infos);
    } else {
      facturePanier.updateInfosClient(infos);
    }
    showToast('success', 'Client selectionne', `${client.nom_client} - ${client.tel_client}`);
  };

  const handleSelectFournisseur = (fournisseur: Fournisseur) => {
    bonCommandePanier.updateInfosFournisseur({
      id_fournisseur: fournisseur.id_fournisseur,
      nom_fournisseur: fournisseur.nom_fournisseur,
      tel_fournisseur: fournisseur.tel_fournisseur || '',
      description: bonCommandePanier.infosFournisseur.description || '',
    });
    setIsModalFournisseurOpen(false);
    showToast('success', 'Fournisseur selectionne', fournisseur.nom_fournisseur);
  };

  const handleOpenTargetModal = () => {
    if (documentMode === 'bonCommande') {
      setIsModalFournisseurOpen(true);
    } else {
      setIsModalRechercheOpen(true);
    }
  };

  // =========================================================================
  // VIDER PANIER
  // =========================================================================
  const handleAnnulerPanier = () => {
    if (articles.length === 0) {
      showToast('info', 'Panier vide', 'Le panier est deja vide');
      return;
    }
    const modeLabel = documentMode === 'proforma' ? 'proforma' : documentMode === 'bonCommande' ? 'bon de commande' : 'facture';
    if (window.confirm(`Voulez-vous vraiment vider le panier (${modeLabel}) ?\n${articles.length} article(s) seront supprimes.`)) {
      adapter.clearPanier();
      setRemiseInput(0);
      showToast('success', 'Panier vide', 'Tous les articles ont ete supprimes');
    }
  };

  // =========================================================================
  // SUBMIT (handler unique selon mode)
  // =========================================================================
  const handleCommander = async () => {
    try {
      setIsLoading(true);

      if (articles.length === 0) {
        showToast('error', 'Erreur', 'Aucun article dans le panier');
        return;
      }

      // ---------------------------------------------------------------------
      // MODE PROFORMA
      // ---------------------------------------------------------------------
      if (documentMode === 'proforma') {
        if (!adapter.targetIsSet) {
          showToast('error', 'Client obligatoire', 'Veuillez selectionner un client pour la proforma');
          return;
        }

        const client = proformaPanier.infosClient;
        const result = await proformaService.createProforma(
          proformaPanier.articles,
          {
            nom_client_payeur: client.nom_client_payeur || '',
            tel_client: client.tel_client || '',
          },
          { remise: proformaPanier.remise }
        );

        if (result.success) {
          try {
            const detailsResponse = await proformaService.getProformaDetails(result.id_proforma);
            const now = new Date().toISOString();
            const proformaData: Proforma = {
              id_proforma: result.id_proforma,
              num_proforma: result.num_proforma || `PRO-${result.id_proforma}`,
              nom_client: client.nom_client_payeur || '',
              tel_client: client.tel_client || '',
              description: '',
              date_proforma: now,
              date_creation: now,
              date_modification: now,
              montant: montants.sous_total,
              mt_remise: montants.remise,
              montant_net: montants.montant_net,
              id_etat: 1,
              libelle_etat: 'BROUILLON',
              id_structure: 0,
              id_utilisateur: 0,
              id_facture_liee: null,
              nb_articles: proformaPanier.articles.length,
            };
            proformaPanier.clearPanier();
            setRemiseInput(0);
            onSuccess?.();
            showToast('success', 'Proforma creee', `${proformaData.num_proforma} — ${proformaData.nom_client}`);
            setModalImpressionProforma({
              isOpen: true,
              proforma: proformaData,
              details: detailsResponse.details || [],
            });
          } catch {
            proformaPanier.clearPanier();
            setRemiseInput(0);
            onSuccess?.();
            showToast('success', 'Proforma creee', 'Impression non disponible — consultez l\'onglet Proformas');
          }
        } else {
          showToast('error', 'Erreur', result.message || 'Impossible de creer la proforma');
        }
        return;
      }

      // ---------------------------------------------------------------------
      // MODE BON DE COMMANDE
      // ---------------------------------------------------------------------
      if (documentMode === 'bonCommande') {
        const fournisseur = bonCommandePanier.infosFournisseur;
        if (!fournisseur.id_fournisseur || fournisseur.id_fournisseur <= 0) {
          showToast('error', 'Fournisseur obligatoire', 'Veuillez selectionner un fournisseur pour le bon de commande');
          return;
        }

        const result = await bonCommandeService.createBonCommande(
          bonCommandePanier.articles,
          {
            id_fournisseur: fournisseur.id_fournisseur,
            description: fournisseur.description || '',
          },
          { remise: bonCommandePanier.remise }
        );

        if (result.success && result.id_bon_commande) {
          const numBc = result.num_bc || `BC-${result.id_bon_commande}`;
          const nomFournisseur = fournisseur.nom_fournisseur || '';

          // Recuperation details serveur pour ouvrir le modal d'impression
          // (pattern miroir proforma — voir bloc MODE PROFORMA ci-dessus)
          try {
            const detailsResponse = await bonCommandeService.getBonCommandeDetails(result.id_bon_commande);
            const bcAvecDetails = detailsResponse.bon_commande;

            bonCommandePanier.clearPanier();
            setRemiseInput(0);
            onSuccess?.();
            showToast('success', 'Bon de commande cree', `${bcAvecDetails.num_bc} — ${bcAvecDetails.nom_fournisseur_snap || nomFournisseur}`);
            setModalImpressionBC({
              isOpen: true,
              bc: bcAvecDetails,
              details: bcAvecDetails.articles || [],
              fournisseur: bcAvecDetails.fournisseur || null,
            });
          } catch {
            bonCommandePanier.clearPanier();
            setRemiseInput(0);
            onSuccess?.();
            showToast('success', 'Bon de commande cree', `${numBc} — Impression indisponible, voir l'onglet Bons de commande`);
          }
        } else {
          showToast('error', 'Erreur', result.message || 'Impossible de creer le bon de commande');
        }
        return;
      }

      // ---------------------------------------------------------------------
      // MODE FACTURE (par defaut)
      // ---------------------------------------------------------------------
      const result = await factureService.createFacture(
        facturePanier.articles,
        facturePanier.infosClient,
        { remise: facturePanier.remise, acompte: 0 },
        false
      );

      if (result.success) {
        facturePanier.clearPanier();
        setRemiseInput(0);
        onSuccess?.();
        openFactureSuccess(result.id_facture, facturePanier.articles);
      } else {
        showToast('error', 'Erreur', result.message || 'Impossible de creer la facture');
      }
    } catch (error: any) {
      console.error('Erreur creation:', error);
      showToast('error', 'Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // DRAG
  // =========================================================================
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // HELPERS UI
  // =========================================================================
  const targetIsMissing = !adapter.targetIsSet && (documentMode === 'proforma' || documentMode === 'bonCommande');
  const targetLabel = documentMode === 'bonCommande' ? 'Selectionner le fournisseur' : t('loyalizeClient');
  const targetIcon = documentMode === 'bonCommande' ? Package : User;
  const TargetIconComponent = targetIcon;

  // Couleur + libelle bouton submit selon mode
  const submitConfig = {
    facture: {
      bgClass: 'bg-gradient-to-r from-blue-600 to-blue-700',
      label: t('orderBtn'),
      icon: CreditCard,
    },
    proforma: {
      bgClass: 'bg-gradient-to-r from-amber-600 to-amber-700',
      label: t('proformaBtn'),
      icon: FileCheck,
    },
    bonCommande: {
      bgClass: 'bg-gradient-to-r from-sky-600 to-sky-700',
      label: 'Bon de Commande',
      icon: Package,
    },
  }[documentMode];
  const SubmitIconComponent = submitConfig.icon;

  // =========================================================================
  // RENDER LEGACY (feature flag OFF) — preserve a l'identique pour rollback
  // =========================================================================
  if (!ENABLE_DOCUMENT_DROPDOWN) {
    return (
      <PanierSidePanelLegacy
        onSuccess={onSuccess}
        onClose={onClose}
        isProforma={isProformaLegacy}
        setIsProforma={setIsProformaLegacy}
      />
    );
  }

  // =========================================================================
  // RENDER PRINCIPAL (dropdown 3 modes)
  // =========================================================================
  return (
    <>
      {/* Contraintes de drag = viewport entier */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[60]" />

      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={constraintsRef}
        dragElastic={0.05}
        dragMomentum={false}
        className="fixed top-2 right-2 z-[60] w-[380px]"
        style={{ touchAction: 'none' }}
      >
        <div className="h-[calc(100vh-16px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header - zone de drag */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center gap-3 p-3 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-blue-100/50 cursor-grab active:cursor-grabbing select-none"
          >
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900">{t('title')}</h2>
              <p className="text-xs text-gray-500">{articles.length} article{articles.length > 1 ? 's' : ''}</p>
            </div>
            <span className="text-[10px] text-gray-400">{t('dragHint')}</span>
            {onClose && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-7 h-7 bg-gray-200 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                title="Fermer le panier lateral"
              >
                <X className="w-3.5 h-3.5 text-gray-600 hover:text-red-600" />
              </button>
            )}
          </div>

          {/* DROPDOWN 3 MODES (FR-017) — toujours visible si compte_prive */}
          {comptePrive && (
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setDocumentMode('facture')}
                  title="Creer une facture (client peut etre anonyme)"
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                    documentMode === 'facture'
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Facture</span>
                </button>
                <button
                  onClick={() => setDocumentMode('proforma')}
                  title="Creer un devis (client obligatoire)"
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                    documentMode === 'proforma'
                      ? 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Proforma</span>
                </button>
                <button
                  onClick={() => setDocumentMode('bonCommande')}
                  title="Commander aupres d'un fournisseur (prix = cout de revient)"
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                    documentMode === 'bonCommande'
                      ? 'bg-white text-sky-700 shadow-sm ring-1 ring-sky-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>BC</span>
                </button>
              </div>
            </div>
          )}

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto">
            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">{t('empty')}</p>
                <p className="text-xs mt-1">
                  {documentMode === 'bonCommande'
                    ? 'Ajoutez des articles pour creer un bon de commande'
                    : t('emptyHint')}
                </p>
              </div>
            ) : (
              <>
                {/* Bouton Selection cible (client OU fournisseur) */}
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <button
                    onClick={handleOpenTargetModal}
                    className={`flex-1 flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${
                      targetIsMissing
                        ? 'bg-red-50 hover:bg-red-100 ring-1 ring-red-300'
                        : documentMode === 'bonCommande'
                          ? 'hover:bg-sky-50'
                          : 'hover:bg-blue-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      targetIsMissing
                        ? 'bg-gradient-to-br from-red-500 to-red-600'
                        : documentMode === 'bonCommande'
                          ? 'bg-gradient-to-br from-sky-500 to-sky-600'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      <TargetIconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      {adapter.targetIsSet ? (
                        <>
                          <span className="font-semibold text-gray-900 block truncate text-sm">
                            {adapter.targetPrimaryLabel}
                          </span>
                          <span className="text-xs text-gray-500 truncate block">
                            {adapter.targetSecondaryLabel}
                          </span>
                        </>
                      ) : (
                        <span className={`font-bold text-sm ${targetIsMissing ? 'text-red-600' : 'text-gray-900'}`}>
                          {targetLabel}{targetIsMissing ? ' *' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                {/* Liste articles (tries par ordre alphabetique) */}
                <div className="px-4 py-2 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {[...articles].sort((a, b) => a.nom_produit.localeCompare(b.nom_produit, 'fr')).map((article) => {
                      const prixUnitaire = article.prix_applique ?? article.prix_vente ?? 0;
                      const coutManquantBC = documentMode === 'bonCommande' && (!article.cout_revient || article.cout_revient <= 0);
                      return (
                        <motion.div
                          key={article.id_produit}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={`rounded-lg p-2.5 border ${
                            documentMode === 'bonCommande'
                              ? 'bg-gradient-to-r from-sky-50 to-sky-100/50 border-sky-200/50'
                              : documentMode === 'proforma'
                                ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200/50'
                                : 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 text-xs flex-1 pr-2 line-clamp-2 leading-tight">
                              {article.nom_produit}
                            </h3>
                            <button
                              onClick={() => handleRemoveArticle(article.id_produit)}
                              className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                <span>{prixUnitaire.toLocaleString('fr-FR')} x {article.quantity}</span>
                                {article.prix_applique && article.prix_applique !== article.prix_vente && documentMode !== 'bonCommande' && (
                                  <span className="px-1 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded">GROS</span>
                                )}
                                {coutManquantBC && (
                                  <span
                                    title="Cout de revient non renseigne — utilisation prix de vente"
                                    className="inline-flex items-center px-1 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-bold rounded gap-0.5"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    PV
                                  </span>
                                )}
                              </div>
                              <div className={`font-bold text-xs ${
                                documentMode === 'bonCommande' ? 'text-sky-700' :
                                documentMode === 'proforma' ? 'text-amber-700' :
                                'text-blue-600'
                              }`}>
                                {(prixUnitaire * article.quantity).toLocaleString('fr-FR')} F
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateQuantity(article.id_produit, article.quantity - 1)}
                                className="w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                disabled={article.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                value={article.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  // En mode BC : pas de cap stock (on commande pour reapprovisionner)
                                  const maxQty = documentMode === 'bonCommande' ? 999999 : (article.niveau_stock || 0);
                                  if (!isNaN(val) && val >= 1 && val <= maxQty) {
                                    handleUpdateQuantity(article.id_produit, val);
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                                min={1}
                                max={documentMode === 'bonCommande' ? 999999 : (article.niveau_stock || 0)}
                                className="w-10 h-6 text-center font-semibold text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(article.id_produit, article.quantity + 1)}
                                className="w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                disabled={documentMode !== 'bonCommande' && article.quantity >= (article.niveau_stock || 0)}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {documentMode !== 'bonCommande' && article.quantity >= (article.niveau_stock || 0) && (
                            <div className="mt-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                              Stock maximum atteint
                            </div>
                          )}

                          {/* Remise par article */}
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-500">{t('discountColon')}</span>
                              <input
                                type="number"
                                min={0}
                                max={remiseMode === '%' ? 100 : prixUnitaire * article.quantity}
                                value={article.remise_article || 0}
                                onChange={(e) => adapter.updateRemiseArticle(article.id_produit, Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className="w-14 h-5 text-center text-[10px] border border-gray-300 rounded focus:outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-[10px] text-gray-500">{remiseMode === '%' ? '%' : 'F'}</span>
                            </div>
                            {(article.remise_article || 0) > 0 && (
                              <span className="text-[10px] font-medium text-green-600">
                                -{(remiseMode === '%'
                                  ? Math.round(prixUnitaire * article.quantity * (article.remise_article || 0) / 100)
                                  : (article.remise_article || 0)
                                ).toLocaleString('fr-FR')} F
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Section Remise globale */}
                <div className="px-4 pb-3">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-gray-900 text-sm">{t('calculations')}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700">{t('discount')}</label>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300">
                          <button
                            onClick={() => handleRemiseModeChange('%')}
                            className={`px-2 py-0.5 text-xs font-bold transition-colors ${
                              remiseMode === '%'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-blue-500 hover:bg-blue-50'
                            }`}
                          >
                            %
                          </button>
                          <button
                            onClick={() => handleRemiseModeChange('F')}
                            className={`px-2 py-0.5 text-xs font-bold transition-colors ${
                              remiseMode === 'F'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-blue-500 hover:bg-blue-50'
                            }`}
                          >
                            FCFA
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        value={remiseInput}
                        onChange={(e) => handleRemiseInputChange(Number(e.target.value))}
                        min="0"
                        max={remiseMode === '%' ? 100 : sousTotal}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder={remiseMode === '%' ? '0 %' : '0 FCFA'}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer sticky */}
          {articles.length > 0 && (
            <div className="border-t border-gray-200 bg-white flex-shrink-0">
              <div className="px-4 pt-3 pb-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('subtotalColon')}</span>
                  <span className="font-medium">{montants.sous_total.toLocaleString('fr-FR')} F</span>
                </div>
                {montants.remise > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{remiseMode === '%' ? t('discountWithPct', { pct: remiseInput }) : t('discountColon')}</span>
                    <span>-{montants.remise.toLocaleString('fr-FR')} F</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-1.5">
                  <span>{t('totalColon')}</span>
                  <span className={
                    documentMode === 'bonCommande' ? 'text-sky-700' :
                    documentMode === 'proforma' ? 'text-amber-700' :
                    'text-blue-600'
                  }>{montants.montant_net.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnnulerPanier}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  {t('cancelBtn')}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCommander}
                  disabled={isLoading}
                  className={`text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm ${submitConfig.bgClass}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('processingBtn')}
                    </>
                  ) : (
                    <>
                      <SubmitIconComponent className="w-4 h-4" />
                      {submitConfig.label}
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal Recherche Client (mode facture / proforma) */}
      <ModalRechercheClient
        isOpen={isModalRechercheOpen}
        onClose={() => setIsModalRechercheOpen(false)}
        onSelectClient={handleSelectClient}
        initialPhone={
          documentMode === 'proforma'
            ? (proformaPanier.infosClient.tel_client || '')
            : (facturePanier.infosClient.tel_client || '')
        }
        initialName={
          documentMode === 'proforma'
            ? (proformaPanier.infosClient.nom_client_payeur || '')
            : (facturePanier.infosClient.nom_client_payeur || '')
        }
      />

      {/* Modal Gestion Fournisseurs (mode BC) */}
      <ModalGestionFournisseurs
        isOpen={isModalFournisseurOpen}
        onClose={() => setIsModalFournisseurOpen(false)}
        onSelectFournisseur={handleSelectFournisseur}
        selectionMode={true}
      />

      {/* Modal Impression Proforma (apres creation) */}
      {modalImpressionProforma.proforma && (
        <ModalImpressionProforma
          isOpen={modalImpressionProforma.isOpen}
          onClose={() => setModalImpressionProforma({ isOpen: false, proforma: null, details: [] })}
          proforma={modalImpressionProforma.proforma}
          details={modalImpressionProforma.details}
          configFacture={structure?.config_facture}
          infoFacture={structure?.info_facture}
          logo={structure?.logo}
          nomStructure={structure?.nom_structure || ''}
        />
      )}

      {/* Modal Impression Bon de Commande (apres creation — FR-024) */}
      {modalImpressionBC.bc && (
        <ModalImpressionBonCommande
          isOpen={modalImpressionBC.isOpen}
          onClose={() => setModalImpressionBC({ isOpen: false, bc: null, details: [], fournisseur: null })}
          bonCommande={modalImpressionBC.bc}
          details={modalImpressionBC.details}
          fournisseur={modalImpressionBC.fournisseur}
          configFacture={structure?.config_facture}
          infoFacture={structure?.info_facture}
          logo={structure?.logo}
          nomStructure={structure?.nom_structure || ''}
        />
      )}
    </>
  );
}

// =============================================================================
// LEGACY RENDER (feature flag OFF) — preserve a l'identique pour rollback rapide
// =============================================================================
//
// NE PAS MODIFIER cette fonction sans tester soigneusement.
// Elle reproduit le comportement EXACT de la version pre-Phase 6
// (checkbox Proforma + mode Facture seul) pour permettre une bascule
// instantanee via la constante ENABLE_DOCUMENT_DROPDOWN en cas de
// regression critique en production.
//
// Cette branche est volontairement isolee pour eviter le bit-rot
// (mix de logique nouvelle/ancienne dans le meme arbre de render).
function PanierSidePanelLegacy({
  onSuccess,
  onClose,
  isProforma,
  setIsProforma,
}: {
  onSuccess?: () => void;
  onClose?: () => void;
  isProforma: boolean;
  setIsProforma: (v: boolean) => void;
}) {
  const {
    articles, infosClient, remise,
    updateQuantity, removeArticle, clearPanier,
    updateInfosClient, updateRemise, updateRemiseArticle, clearRemisesArticles,
    getMontantsFacture
  } = usePanierStore();

  const { structure } = useAuth();
  const comptePrive = structure?.compte_prive === true;
  const { showToast } = useToast();
  const t = useTranslations('panier');
  const [isLoading, setIsLoading] = useState(false);
  const { openModal: openFactureSuccess } = useFactureSuccessStore();
  const [isModalRechercheOpen, setIsModalRechercheOpen] = useState(false);

  const [modalImpressionProforma, setModalImpressionProforma] = useState<{
    isOpen: boolean;
    proforma: Proforma | null;
    details: ProformaDetail[];
  }>({ isOpen: false, proforma: null, details: [] });

  const [remiseMode, setRemiseMode] = useState<'%' | 'F'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vf_remise_mode') as '%' | 'F') || '%';
    }
    return '%';
  });
  const [remiseInput, setRemiseInput] = useState<number>(0);

  const montants = getMontantsFacture();
  const sousTotal = montants.sous_total;

  const handleRemiseModeChange = (mode: '%' | 'F') => {
    setRemiseMode(mode);
    localStorage.setItem('vf_remise_mode', mode);
    setRemiseInput(0);
    updateRemise(0);
    clearRemisesArticles();
  };

  const handleRemiseInputChange = (value: number) => {
    setRemiseInput(value);
    if (remiseMode === '%') {
      const pct = Math.max(0, Math.min(100, value));
      updateRemise(Math.round(sousTotal * pct / 100));
    } else {
      updateRemise(Math.max(0, Math.min(sousTotal, value)));
    }
  };

  useEffect(() => {
    if (remiseMode === '%' && remiseInput > 0) {
      updateRemise(Math.round(sousTotal * Math.min(100, remiseInput) / 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sousTotal]);

  const handleUpdateQuantity = (id_produit: number, newQuantity: number) => {
    updateQuantity(id_produit, newQuantity);
  };

  const handleRemoveArticle = (id_produit: number) => {
    removeArticle(id_produit);
    showToast('info', 'Article supprime', 'L\'article a ete retire du panier');
  };

  const handleSelectClient = (client: Partial<Client> & { nom_client: string; tel_client: string }) => {
    updateInfosClient({
      id_client: client.id_client,
      nom_client_payeur: client.nom_client,
      tel_client: client.tel_client
    });
    showToast('success', 'Client selectionne', `${client.nom_client} - ${client.tel_client}`);
  };

  const handleAnnulerPanier = () => {
    if (articles.length === 0) {
      showToast('info', 'Panier vide', 'Le panier est deja vide');
      return;
    }
    if (window.confirm(`Voulez-vous vraiment vider le panier ?\n${articles.length} article(s) seront supprimes.`)) {
      clearPanier();
      showToast('success', 'Panier vide', 'Tous les articles ont ete supprimes');
    }
  };

  const handleCommander = async () => {
    try {
      setIsLoading(true);
      if (articles.length === 0) {
        showToast('error', 'Erreur', 'Aucun article dans le panier');
        return;
      }
      if (isProforma) {
        const hasClient = infosClient.id_client || (infosClient.nom_client_payeur && infosClient.nom_client_payeur !== 'CLIENT_ANONYME');
        if (!hasClient) {
          showToast('error', 'Client obligatoire', 'Veuillez selectionner un client pour la proforma');
          return;
        }
        const result = await proformaService.createProforma(
          articles,
          { nom_client_payeur: infosClient.nom_client_payeur || '', tel_client: infosClient.tel_client || '' },
          { remise }
        );
        if (result.success) {
          try {
            const detailsResponse = await proformaService.getProformaDetails(result.id_proforma);
            const now = new Date().toISOString();
            const proformaData: Proforma = {
              id_proforma: result.id_proforma,
              num_proforma: result.num_proforma || `PRO-${result.id_proforma}`,
              nom_client: infosClient.nom_client_payeur || '',
              tel_client: infosClient.tel_client || '',
              description: '',
              date_proforma: now, date_creation: now, date_modification: now,
              montant: montants.sous_total,
              mt_remise: montants.remise,
              montant_net: montants.montant_net,
              id_etat: 1, libelle_etat: 'BROUILLON',
              id_structure: 0, id_utilisateur: 0, id_facture_liee: null,
              nb_articles: articles.length,
            };
            clearPanier();
            setIsProforma(false);
            onSuccess?.();
            showToast('success', 'Proforma creee', `${proformaData.num_proforma} — ${proformaData.nom_client}`);
            setModalImpressionProforma({ isOpen: true, proforma: proformaData, details: detailsResponse.details || [] });
          } catch {
            clearPanier();
            setIsProforma(false);
            onSuccess?.();
            showToast('success', 'Proforma creee', 'Impression non disponible — consultez l\'onglet Proformas');
          }
        } else {
          showToast('error', 'Erreur', result.message || 'Impossible de creer la proforma');
        }
        return;
      }
      const result = await factureService.createFacture(articles, infosClient, { remise, acompte: 0 }, false);
      if (result.success) {
        clearPanier();
        onSuccess?.();
        openFactureSuccess(result.id_facture, articles);
      } else {
        showToast('error', 'Erreur', result.message || 'Impossible de creer la facture');
      }
    } catch (error: any) {
      console.error('Erreur creation:', error);
      showToast('error', 'Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[60]" />
      <motion.div
        drag dragControls={dragControls} dragListener={false}
        dragConstraints={constraintsRef} dragElastic={0.05} dragMomentum={false}
        className="fixed top-2 right-2 z-[60] w-[380px]"
        style={{ touchAction: 'none' }}
      >
        <div className="h-[calc(100vh-16px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center gap-3 p-3 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-blue-100/50 cursor-grab active:cursor-grabbing select-none"
          >
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900">{t('title')}</h2>
              <p className="text-xs text-gray-500">{articles.length} article{articles.length > 1 ? 's' : ''}</p>
            </div>
            <span className="text-[10px] text-gray-400">{t('dragHint')}</span>
            {onClose && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-7 h-7 bg-gray-200 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                title="Fermer le panier lateral"
              >
                <X className="w-3.5 h-3.5 text-gray-600 hover:text-red-600" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">{t('empty')}</p>
                <p className="text-xs mt-1">{t('emptyHint')}</p>
              </div>
            ) : (
              <>
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <button
                    onClick={() => setIsModalRechercheOpen(true)}
                    className={`flex-1 flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${
                      isProforma && !infosClient.id_client && (!infosClient.nom_client_payeur || infosClient.nom_client_payeur === 'CLIENT_ANONYME')
                        ? 'bg-red-50 hover:bg-red-100 ring-1 ring-red-300'
                        : 'hover:bg-blue-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isProforma && !infosClient.id_client && (!infosClient.nom_client_payeur || infosClient.nom_client_payeur === 'CLIENT_ANONYME')
                        ? 'bg-gradient-to-br from-red-500 to-red-600'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      {infosClient.id_client || (infosClient.nom_client_payeur && infosClient.nom_client_payeur !== 'CLIENT_ANONYME') ? (
                        <>
                          <span className="font-semibold text-gray-900 block truncate text-sm">{infosClient.nom_client_payeur}</span>
                          <span className="text-xs text-gray-500">{infosClient.tel_client}</span>
                        </>
                      ) : (
                        <span className={`font-bold text-sm ${isProforma ? 'text-red-600' : 'text-gray-900'}`}>
                          {t('loyalizeClient')}{isProforma ? ' *' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                  {comptePrive && (
                    <label
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 cursor-pointer transition-all flex-shrink-0 ${
                        isProforma ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-200 hover:bg-amber-50/30'
                      }`}
                      title="Creer une proforma au lieu d'une facture"
                    >
                      <input
                        type="checkbox" checked={isProforma}
                        onChange={(e) => setIsProforma(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <FileCheck className={`w-4 h-4 ${isProforma ? 'text-amber-600' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${isProforma ? 'text-amber-700' : 'text-gray-500'}`}>Proforma</span>
                    </label>
                  )}
                </div>
                <div className="px-4 py-2 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {[...articles].sort((a, b) => a.nom_produit.localeCompare(b.nom_produit, 'fr')).map((article) => (
                      <motion.div
                        key={article.id_produit} layout
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg p-2.5 border border-blue-200/50"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-xs flex-1 pr-2 line-clamp-2 leading-tight">{article.nom_produit}</h3>
                          <button
                            onClick={() => handleRemoveArticle(article.id_produit)}
                            className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-gray-500">
                              {(article.prix_applique ?? article.prix_vente).toLocaleString('fr-FR')} x {article.quantity}
                              {article.prix_applique && article.prix_applique !== article.prix_vente && (
                                <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded">GROS</span>
                              )}
                            </div>
                            <div className="font-bold text-blue-600 text-xs">
                              {((article.prix_applique ?? article.prix_vente) * article.quantity).toLocaleString('fr-FR')} F
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateQuantity(article.id_produit, article.quantity - 1)}
                              className="w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                              disabled={article.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number" value={article.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1 && val <= (article.niveau_stock || 0)) {
                                  handleUpdateQuantity(article.id_produit, val);
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              min={1} max={article.niveau_stock || 0}
                              className="w-10 h-6 text-center font-semibold text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(article.id_produit, article.quantity + 1)}
                              className="w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                              disabled={article.quantity >= (article.niveau_stock || 0)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {article.quantity >= (article.niveau_stock || 0) && (
                          <div className="mt-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Stock maximum atteint</div>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">{t('discountColon')}</span>
                            <input
                              type="number" min={0}
                              max={remiseMode === '%' ? 100 : (article.prix_applique ?? article.prix_vente) * article.quantity}
                              value={article.remise_article || 0}
                              onChange={(e) => updateRemiseArticle(article.id_produit, Number(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-14 h-5 text-center text-[10px] border border-gray-300 rounded focus:outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-gray-500">{remiseMode === '%' ? '%' : 'F'}</span>
                          </div>
                          {(article.remise_article || 0) > 0 && (
                            <span className="text-[10px] font-medium text-green-600">
                              -{(remiseMode === '%'
                                ? Math.round((article.prix_applique ?? article.prix_vente) * article.quantity * (article.remise_article || 0) / 100)
                                : (article.remise_article || 0)
                              ).toLocaleString('fr-FR')} F
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="px-4 pb-3">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-gray-900 text-sm">{t('calculations')}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700">{t('discount')}</label>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300">
                          <button
                            onClick={() => handleRemiseModeChange('%')}
                            className={`px-2 py-0.5 text-xs font-bold transition-colors ${remiseMode === '%' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 hover:bg-blue-50'}`}
                          >%</button>
                          <button
                            onClick={() => handleRemiseModeChange('F')}
                            className={`px-2 py-0.5 text-xs font-bold transition-colors ${remiseMode === 'F' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 hover:bg-blue-50'}`}
                          >FCFA</button>
                        </div>
                      </div>
                      <input
                        type="number" value={remiseInput}
                        onChange={(e) => handleRemiseInputChange(Number(e.target.value))}
                        min="0" max={remiseMode === '%' ? 100 : sousTotal}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder={remiseMode === '%' ? '0 %' : '0 FCFA'}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {articles.length > 0 && (
            <div className="border-t border-gray-200 bg-white flex-shrink-0">
              <div className="px-4 pt-3 pb-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('subtotalColon')}</span>
                  <span className="font-medium">{montants.sous_total.toLocaleString('fr-FR')} F</span>
                </div>
                {montants.remise > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{remiseMode === '%' ? t('discountWithPct', { pct: remiseInput }) : t('discountColon')}</span>
                    <span>-{montants.remise.toLocaleString('fr-FR')} F</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-1.5">
                  <span>{t('totalColon')}</span>
                  <span className="text-blue-600">{montants.montant_net.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleAnnulerPanier} disabled={isLoading}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  {t('cancelBtn')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCommander} disabled={isLoading}
                  className={`text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm ${
                    isProforma ? 'bg-gradient-to-r from-amber-600 to-amber-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('processingBtn')}
                    </>
                  ) : isProforma ? (
                    <><FileCheck className="w-4 h-4" />{t('proformaBtn')}</>
                  ) : (
                    <><CreditCard className="w-4 h-4" />{t('orderBtn')}</>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      <ModalRechercheClient
        isOpen={isModalRechercheOpen}
        onClose={() => setIsModalRechercheOpen(false)}
        onSelectClient={handleSelectClient}
        initialPhone={infosClient.tel_client || ''}
        initialName={infosClient.nom_client_payeur || ''}
      />
      {modalImpressionProforma.proforma && (
        <ModalImpressionProforma
          isOpen={modalImpressionProforma.isOpen}
          onClose={() => setModalImpressionProforma({ isOpen: false, proforma: null, details: [] })}
          proforma={modalImpressionProforma.proforma}
          details={modalImpressionProforma.details}
          configFacture={structure?.config_facture}
          infoFacture={structure?.info_facture}
          logo={structure?.logo}
          nomStructure={structure?.nom_structure || ''}
        />
      )}
    </>
  );
}
