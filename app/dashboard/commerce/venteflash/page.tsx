/**
 * Page Vente Flash - Système de vente rapide
 * Scan code-barre + Recherche produits + Panier + Création factures
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { authService } from '@/services/auth.service';
import database from '@/services/database.service';
import { Produit } from '@/types/produit';
import { VenteFlash, VenteFlashStats, DetailVente, RecuPaiement } from '@/types/venteflash.types';
import { User } from '@/types/auth';
import { usePanierStore } from '@/stores/panierStore';
import { useToast } from '@/components/ui/Toast';
import { VenteFlashHeader, VenteFlashHeaderRef } from '@/components/venteflash/VenteFlashHeader';
import { VenteFlashStatsCards } from '@/components/venteflash/VenteFlashStatsCards';
import { VenteFlashListeVentes } from '@/components/venteflash/VenteFlashListeVentes';
import { PanierVenteFlashInline } from '@/components/venteflash/PanierVenteFlashInline';
import { ModalRecuGenere } from '@/components/recu/ModalRecuGenere';
import { ModalRecuVenteFlash } from '@/components/venteflash/ModalRecuVenteFlash';
import { ModalRefresh } from '@/components/venteflash/ModalRefresh';
import MainMenu from '@/components/layout/MainMenu';

export default function VenteFlashPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const { addArticle, getTotalItems, clearPanier } = usePanierStore();

  // Vider le panier quand on quitte la page venteflash
  useEffect(() => {
    return () => {
      console.log('🧹 [VENTE FLASH] Nettoyage panier - sortie de page');
      usePanierStore.getState().clearPanier();
    };
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [structure, setStructure] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // États des données
  const [produits, setProduits] = useState<Produit[]>([]);
  const [ventesJour, setVentesJour] = useState<VenteFlash[]>([]);
  const [stats, setStats] = useState<VenteFlashStats>({
    nb_ventes: 0,
    total_ventes: 0,
    ca_jour: 0,
    total_remises: 0
  });

  // États de chargement
  const [isLoadingProduits, setIsLoadingProduits] = useState(true);
  const [isLoadingVentes, setIsLoadingVentes] = useState(true);

  // État pour le modal de refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // États pour le modal de quantité (avant ajout au panier)
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [vfProduit, setVfProduit] = useState<Produit | null>(null);
  const [vfQuantity, setVfQuantity] = useState(1);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<VenteFlashHeaderRef>(null);

  // États pour le reçu (ancien modal)
  const [showRecu, setShowRecu] = useState(false);
  const [recuData, setRecuData] = useState<{
    idFacture: number;
    numFacture: string;
    montantTotal: number;
  } | null>(null);

  // États pour le nouveau modal reçu ticket
  const [showRecuTicket, setShowRecuTicket] = useState(false);
  const [recuTicketData, setRecuTicketData] = useState<{
    idFacture: number;
    numFacture: string;
    montantTotal: number;
    methodePaiement: 'CASH' | 'OM' | 'WAVE';
    dateVente: Date;
    detailFacture: Array<{
      id_detail?: number;
      nom_produit: string;
      quantite: number;
      prix: number;
      sous_total: number;
    }>;
  } | null>(null);

  /**
   * Charger tous les produits de la structure
   * Stockage local pour éviter va-et-vient serveur
   */
  const loadProduits = useCallback(async () => {
    if (!user) return;

    setIsLoadingProduits(true);
    try {
      const query = `SELECT * FROM get_mes_produits(${user.id_structure}, NULL)`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const response = results[0].get_mes_produits;
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        if (parsedResponse.success && parsedResponse.data) {
          setProduits(parsedResponse.data);
        }
      }
    } catch (error) {
      console.error('❌ [VF] Erreur chargement produits:', error);
    } finally {
      setIsLoadingProduits(false);
    }
  }, [user]);

  /**
   * Charger les factures du mois en cours
   * Utilise get_my_factures1 avec filtrage par année/mois pour optimiser les performances
   */
  const loadVentesJour = useCallback(async () => {
    if (!user) return;

    setIsLoadingVentes(true);
    try {
      const currentDate = new Date();
      const annee = currentDate.getFullYear();
      const mois = currentDate.getMonth() + 1;

      const query = `SELECT * FROM get_my_factures1(${user.id_structure}, ${annee}, ${mois}, 0)`;
      const results = await database.query(query, 30000);

      if (results && results.length > 0) {
        const response = results[0].get_my_factures1;
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        let facturesData: unknown[] = [];

        if (parsedResponse.factures && Array.isArray(parsedResponse.factures)) {
          facturesData = parsedResponse.factures.map((item: { facture?: unknown; details?: unknown[] }) => {
            if (item.facture && typeof item.facture === 'object') {
              return {
                ...(item.facture as Record<string, unknown>),
                details: item.details || []
              };
            }
            return item;
          });
        } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
          facturesData = parsedResponse.data;
        } else if (Array.isArray(parsedResponse)) {
          facturesData = parsedResponse;
        }

        if (facturesData.length > 0) {
          const today = new Date().toISOString().split('T')[0];

          const ventesAujourdhui = facturesData.filter((item: unknown) => {
            const facture = item as Record<string, unknown>;
            const dateFacture = (facture.date_facture as string) || (facture.date as string) || '';
            if (!dateFacture) return false;
            const factureDate = new Date(dateFacture).toISOString().split('T')[0];
            return factureDate === today;
          });

          const ventesFormatees: VenteFlash[] = ventesAujourdhui.map((item: unknown) => {
            const f = item as Record<string, unknown>;
            const nomCaissier = (f.nom_caissier as string) ||
                               (user.nom && user.prenom ? `${user.prenom} ${user.nom}` : user.login);

            const montantTotal = (f.montant as number) || (f.montant_total as number) || 0;
            const montantPaye = (f.mt_acompte as number) || (f.montant_paye as number) || 0;
            const montantImpaye = (f.mt_restant as number) || (f.montant_impaye as number) || 0;
            const modePaiement = (f.mode_paiement as string) || (f.libelle_etat as string) || 'ESPECES';

            const detailsArray = Array.isArray(f.details) ? f.details : [];
            const detailsFormates: DetailVente[] = detailsArray.map((item: unknown) => {
              const d = item as Record<string, unknown>;
              return {
                id_detail: d.id_detail as number,
                id_produit: d.id_produit as number,
                nom_produit: (d.nom_produit as string) || '',
                quantite: (d.quantite as number) || 0,
                prix_unitaire: (d.prix as number) || 0,
                total: (d.sous_total as number) || 0
              };
            });

            // Extraire les reçus de paiement si présents
            const recusArray = Array.isArray(f.recus_paiements) ? f.recus_paiements : [];
            const recusFormates: RecuPaiement[] = recusArray.map((item: unknown) => {
              const r = item as Record<string, unknown>;
              return {
                id_recu: r.id_recu as number,
                id_facture: r.id_facture as number,
                numero_recu: (r.numero_recu as string) || '',
                methode_paiement: (r.methode_paiement as string) || 'espèces',
                montant_paye: (r.montant_paye as number) || 0,
                reference_transaction: (r.reference_transaction as string) || undefined,
                telephone_client: (r.telephone_client as string) || undefined,
                date_paiement: (r.date_paiement as string) || ''
              };
            });

            return {
              id_facture: f.id_facture as number,
              num_facture: (f.num_facture as string) || '',
              date_facture: (f.date_facture as string) || '',
              montant_total: montantTotal,
              montant_paye: montantPaye,
              montant_impaye: montantImpaye,
              mt_remise: (f.mt_remise as number) || 0,
              mode_paiement: modePaiement,
              nom_client: (f.nom_client as string) || 'CLIENT ANONYME',
              tel_client: (f.tel_client as string) || '',
              nom_caissier: nomCaissier,
              id_utilisateur: f.id_utilisateur as number,
              statut: (f.libelle_etat as string) || (f.statut as string) || '',
              details: detailsFormates,
              recus_paiements: recusFormates.length > 0 ? recusFormates : undefined
            };
          });

          setVentesJour(ventesFormatees);

          const statsCalculees: VenteFlashStats = {
            nb_ventes: ventesFormatees.length,
            total_ventes: ventesFormatees.reduce((sum, v) => sum + v.montant_total, 0),
            ca_jour: ventesFormatees.reduce((sum, v) => sum + v.montant_paye, 0),
            total_remises: ventesFormatees.reduce((sum, v) => sum + (v.mt_remise || 0), 0)
          };

          setStats(statsCalculees);
        }
      }
    } catch (error) {
      console.error('❌ [VF] Erreur chargement ventes:', error instanceof Error ? error.message : error);
    } finally {
      setIsLoadingVentes(false);
    }
  }, [user]);

  /**
   * Charger UNE SEULE facture par son ID et l'ajouter aux ventes du jour
   * Optimisation : évite de recharger toutes les factures après chaque vente
   * Utilise get_my_factures1(id_structure, année, 0, id_facture) pour récupérer recus_paiements
   */
  const loadAndAddFacture = useCallback(async (idFacture: number): Promise<VenteFlash | null> => {
    if (!user) return null;

    try {
      const currentDate = new Date();
      const annee = currentDate.getFullYear();

      // Charger UNE SEULE facture avec son id_facture spécifique
      const query = `SELECT * FROM get_my_factures1(${user.id_structure}, ${annee}, 0, ${idFacture})`;
      console.log(`🔄 [VF] Chargement facture unique #${idFacture}`);

      const results = await database.query(query, 10000);

      if (!results || results.length === 0) {
        console.warn(`⚠️ [VF] Facture #${idFacture} non trouvée`);
        return null;
      }

      const response = results[0].get_my_factures1;
      const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;

      // Extraire la facture de la réponse
      let factureData: Record<string, unknown> | null = null;

      if (parsedResponse.factures && Array.isArray(parsedResponse.factures) && parsedResponse.factures.length > 0) {
        const item = parsedResponse.factures[0];
        if (item.facture && typeof item.facture === 'object') {
          factureData = { ...(item.facture as Record<string, unknown>), details: item.details || [], recus_paiements: item.recus_paiements || [] };
        } else {
          factureData = item;
        }
      } else if (parsedResponse.data && Array.isArray(parsedResponse.data) && parsedResponse.data.length > 0) {
        factureData = parsedResponse.data[0];
      } else if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
        factureData = parsedResponse[0];
      }

      if (!factureData) {
        console.warn(`⚠️ [VF] Structure facture invalide pour #${idFacture}`);
        return null;
      }

      // Formater la facture (même logique que loadVentesJour)
      const f = factureData;
      const nomCaissier = (f.nom_caissier as string) ||
                         (user.nom && user.prenom ? `${user.prenom} ${user.nom}` : user.login);

      const montantTotal = (f.montant as number) || (f.montant_total as number) || 0;
      const montantPaye = (f.mt_acompte as number) || (f.montant_paye as number) || 0;
      const montantImpaye = (f.mt_restant as number) || (f.montant_impaye as number) || 0;
      const modePaiement = (f.mode_paiement as string) || (f.libelle_etat as string) || 'ESPECES';

      // Formater les détails
      const detailsArray = Array.isArray(f.details) ? f.details : [];
      const detailsFormates: DetailVente[] = detailsArray.map((item: unknown) => {
        const d = item as Record<string, unknown>;
        return {
          id_detail: d.id_detail as number,
          id_produit: d.id_produit as number,
          nom_produit: (d.nom_produit as string) || '',
          quantite: (d.quantite as number) || 0,
          prix_unitaire: (d.prix as number) || 0,
          total: (d.sous_total as number) || 0
        };
      });

      // Formater les reçus de paiement - CRITIQUE pour afficher le bon mode de paiement
      const recusArray = Array.isArray(f.recus_paiements) ? f.recus_paiements : [];
      const recusFormates: RecuPaiement[] = recusArray.map((item: unknown) => {
        const r = item as Record<string, unknown>;
        return {
          id_recu: r.id_recu as number,
          id_facture: r.id_facture as number,
          numero_recu: (r.numero_recu as string) || '',
          methode_paiement: (r.methode_paiement as string) || 'espèces',
          montant_paye: (r.montant_paye as number) || 0,
          reference_transaction: (r.reference_transaction as string) || undefined,
          telephone_client: (r.telephone_client as string) || undefined,
          date_paiement: (r.date_paiement as string) || ''
        };
      });

      const nouvelleVente: VenteFlash = {
        id_facture: f.id_facture as number,
        num_facture: (f.num_facture as string) || '',
        date_facture: (f.date_facture as string) || new Date().toISOString(),
        montant_total: montantTotal,
        montant_paye: montantPaye,
        montant_impaye: montantImpaye,
        mt_remise: (f.mt_remise as number) || 0,
        mode_paiement: modePaiement,
        nom_client: (f.nom_client as string) || 'CLIENT ANONYME',
        tel_client: (f.tel_client as string) || '',
        nom_caissier: nomCaissier,
        id_utilisateur: f.id_utilisateur as number,
        statut: (f.libelle_etat as string) || (f.statut as string) || '',
        details: detailsFormates,
        recus_paiements: recusFormates.length > 0 ? recusFormates : undefined
      };

      console.log(`✅ [VF] Facture #${idFacture} chargée | Reçus: ${recusFormates.length} | Méthode: ${recusFormates[0]?.methode_paiement || 'N/A'}`);

      // Ajouter en tête de liste (plus récente en premier)
      setVentesJour(prev => {
        // Éviter les doublons
        const filtered = prev.filter(v => v.id_facture !== idFacture);
        return [nouvelleVente, ...filtered];
      });

      // Mettre à jour les stats localement
      setStats(prev => ({
        nb_ventes: prev.nb_ventes + 1,
        total_ventes: prev.total_ventes + montantTotal,
        ca_jour: prev.ca_jour + montantPaye,
        total_remises: prev.total_remises + (nouvelleVente.mt_remise || 0)
      }));

      return nouvelleVente;

    } catch (error) {
      console.error(`❌ [VF] Erreur chargement facture #${idFacture}:`, error);
      return null;
    }
  }, [user]);

  // Vérification authentification
  useEffect(() => {
    const checkAuthentication = () => {
      if (!authService.isAuthenticated()) {
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      if (!userData || userData.type_structure !== 'COMMERCIALE') {
        router.push('/dashboard');
        return;
      }

      setUser(userData);

      const completeData = authService.getCompleteAuthData();
      if (completeData && completeData.structure) {
        setStructure(completeData.structure);
      }

      setIsAuthLoading(false);
    };

    const timer = setTimeout(checkAuthentication, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Charger produits au montage
  useEffect(() => {
    if (user) {
      loadProduits();
      loadVentesJour();
    }
  }, [user, loadProduits, loadVentesJour]);

  // Auto-focus sur le champ quantité quand le modal s'ouvre
  useEffect(() => {
    if (showQuantityModal && quantityInputRef.current) {
      const timer = setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showQuantityModal]);

  /**
   * Rafraîchir manuellement les données
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    const safetyTimeout = setTimeout(() => {
      setIsRefreshing(false);
    }, 35000);

    try {
      await Promise.all([
        loadProduits(),
        loadVentesJour()
      ]);
    } catch (error) {
      console.error('❌ [VF] Erreur rafraîchissement:', error);
    } finally {
      clearTimeout(safetyTimeout);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [loadProduits, loadVentesJour]);

  /**
   * Ouvrir le modal de quantité avant d'ajouter au panier
   */
  const handleAddToPanier = useCallback((produit: Produit) => {
    // Vérifier que le mot de passe a été changé
    if (user && user.pwd_changed === false) {
      showToast('warning', 'Mot de passe requis', 'Veuillez d\'abord modifier votre mot de passe initial pour effectuer des ventes.');
      return;
    }

    const stockDisponible = produit.niveau_stock || 0;

    if (stockDisponible <= 0) {
      showToast('warning', 'Stock insuffisant', `${produit.nom_produit} n'est plus en stock`);
      return;
    }

    setVfProduit(produit);
    setVfQuantity(1);
    setShowQuantityModal(true);
  }, [showToast, user]);

  /**
   * Confirmer l'ajout au panier avec la quantité choisie
   */
  const handleConfirmQuantity = useCallback(() => {
    if (!vfProduit || vfQuantity < 1) return;

    addArticle(vfProduit, vfQuantity);
    showToast('success', 'Ajouté au panier', `${vfQuantity} x ${vfProduit.nom_produit}`);

    setShowQuantityModal(false);
    setVfProduit(null);
    setVfQuantity(1);

    // Auto-focus sur le champ de recherche pour enchaîner les scans
    headerRef.current?.focusSearch();
  }, [vfProduit, vfQuantity, addArticle, showToast]);

  /**
   * Annuler le modal de quantité
   */
  const handleCancelQuantity = useCallback(() => {
    setShowQuantityModal(false);
    setVfProduit(null);
    setVfQuantity(1);

    // Auto-focus sur le champ de recherche même après annulation
    headerRef.current?.focusSearch();
  }, []);

  /**
   * Supprimer une facture (Admin uniquement)
   */
  const handleDeleteVente = async (id_facture: number) => {
    if (!user) return;

    try {
      const query = `SELECT * FROM supprimer_facturecom(${user.id_structure}, ${id_facture}, ${user.id})`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const response = results[0].supprimer_facturecom;
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        if (parsedResponse.success) {
          showToast('success', 'Suppression réussie', 'La facture a été supprimée');
          loadVentesJour();
        } else {
          showToast('error', 'Erreur', parsedResponse.message || 'Suppression impossible');
        }
      }
    } catch (error) {
      console.error('❌ [VF] Erreur suppression:', error);
      showToast('error', 'Erreur', 'Impossible de supprimer la facture');
    }
  };

  /**
   * Afficher reçu (nouveau modal ticket)
   * Utilise recus_paiements local (chargé via loadAndAddFacture avec get_my_factures1)
   * Fallback: requête SQL si recus_paiements non disponible (anciennes factures)
   */
  const handleViewReceipt = async (id_facture: number) => {
    // Trouver la vente dans la liste
    const vente = ventesJour.find(v => v.id_facture === id_facture);
    if (!vente) {
      showToast('error', 'Erreur', 'Vente non trouvée');
      return;
    }

    let methodePaiement: 'CASH' | 'OM' | 'WAVE' = 'CASH';

    // PRIORITÉ 1: Utiliser recus_paiements local (données déjà chargées)
    if (vente.recus_paiements && vente.recus_paiements.length > 0) {
      const recu = vente.recus_paiements[0];
      const methodeFromData = (recu.methode_paiement || '').toLowerCase();

      if (methodeFromData === 'orange-money' || methodeFromData === 'om') {
        methodePaiement = 'OM';
      } else if (methodeFromData === 'wave') {
        methodePaiement = 'WAVE';
      }
      console.log(`📄 [VF-RECU] Mode depuis données locales: ${methodePaiement}`);
    } else {
      // FALLBACK: Requête SQL pour anciennes factures sans recus_paiements
      try {
        const recuQuery = `
          SELECT methode_paiement FROM recus_paiement
          WHERE id_facture = ${id_facture}
          ORDER BY date_paiement DESC LIMIT 1
        `;
        const recuResults = await database.query(recuQuery);

        if (recuResults && recuResults.length > 0) {
          const methodeFromDB = (recuResults[0].methode_paiement || '').toLowerCase();
          if (methodeFromDB === 'orange-money' || methodeFromDB === 'om') {
            methodePaiement = 'OM';
          } else if (methodeFromDB === 'wave') {
            methodePaiement = 'WAVE';
          }
          console.log(`📄 [VF-RECU] Mode depuis SQL fallback: ${methodePaiement}`);
        }
      } catch {
        console.warn(`⚠️ [VF-RECU] Fallback SQL échoué, défaut CASH`);
      }
    }

    // Mapper les détails de la vente au format attendu par le modal
    const detailFacture = (vente.details || []).map((d: any) => ({
      id_detail: d.id_detail,
      nom_produit: d.nom_produit || 'Produit',
      quantite: d.quantite || 1,
      prix: d.prix_unitaire || d.prix || 0,
      sous_total: d.total || (d.quantite * (d.prix_unitaire || d.prix || 0))
    }));

    console.log(`📄 [VF-RECU] Affichage reçu #${vente.num_facture} | Mode: ${methodePaiement} | Articles: ${detailFacture.length}`);

    // Afficher le modal ticket avec détails produits
    setRecuTicketData({
      idFacture: vente.id_facture,
      numFacture: vente.num_facture,
      montantTotal: vente.montant_total,
      methodePaiement,
      dateVente: new Date(vente.date_facture),
      detailFacture
    });
    setShowRecuTicket(true);
  };

  /**
   * Imprimer le rapport des ventes du jour
   */
  const handlePrintRapport = () => {
    // Regrouper les articles identiques et totaliser
    const produitsGroupes = new Map<string, {
      nom_produit: string;
      quantite_totale: number;
      prix_unitaire: number;
      total: number;
    }>();

    ventesJour.forEach((vente) => {
      if (vente.details && Array.isArray(vente.details)) {
        vente.details.forEach((detail: any) => {
          const nomProduit = detail.nom_produit || 'Produit inconnu';
          const quantite = detail.quantite || 0;
          const prixUnitaire = detail.prix_unitaire || 0;

          if (produitsGroupes.has(nomProduit)) {
            const existing = produitsGroupes.get(nomProduit)!;
            existing.quantite_totale += quantite;
            existing.total += (quantite * prixUnitaire);
          } else {
            produitsGroupes.set(nomProduit, {
              nom_produit: nomProduit,
              quantite_totale: quantite,
              prix_unitaire: prixUnitaire,
              total: quantite * prixUnitaire
            });
          }
        });
      }
    });

    // Convertir en tableau pour l'affichage
    const detailsVentes = Array.from(produitsGroupes.values()).map((produit, index) => ({
      num: index + 1,
      nom_produit: produit.nom_produit,
      quantite: produit.quantite_totale,
      prix_unitaire: produit.prix_unitaire,
      total: produit.total
    }));

    // Créer le contenu HTML du rapport
    const dateJour = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const rapportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Ventes Flash - ${dateJour}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #059669; text-align: center; border-bottom: 3px solid #059669; padding-bottom: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 30px 0; }
          .stat-card { background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #059669; }
          .stat-value { font-size: 24px; font-weight: bold; color: #059669; }
          .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #059669; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          .caissier { font-weight: bold; color: #059669; margin-top: 10px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${structure?.logo ? `<img src="${structure.logo}" alt="Logo" style="max-width: 120px; max-height: 80px; margin: 0 auto 15px; display: block;" />` : ''}
          <h1>⚡ Rapport Ventes Flash</h1>
          <p style="font-size: 18px; font-weight: bold; color: #059669; margin: 8px 0;">${structure?.nom_structure || 'Structure'}</p>
          <p style="font-size: 16px; color: #666;">${dateJour}</p>
          <p class="caissier">Caissier: ${user.nom_utilisateur}</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${stats.nb_ventes}</div>
            <div class="stat-label">Nombre de ventes</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${detailsVentes.length}</div>
            <div class="stat-label">Articles uniques</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.total_ventes.toLocaleString('fr-FR')} FCFA</div>
            <div class="stat-label">Total ventes</div>
            ${stats.total_remises > 0 ? `<div style="color: #d97706; font-size: 11px; font-weight: 500; margin-top: 4px;">(Remises: ${stats.total_remises.toLocaleString('fr-FR')} F)</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.ca_jour.toLocaleString('fr-FR')} FCFA</div>
            <div class="stat-label">CA du jour</div>
          </div>
        </div>

        <h2 style="color: #059669; margin-top: 30px;">Détail des ventes (${detailsVentes.length} articles uniques)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 8%;">N°</th>
              <th style="width: 40%;">Nom Produit</th>
              <th style="width: 17%; text-align: center;">Quantité</th>
              <th style="width: 17%; text-align: right;">Prix Unit.</th>
              <th style="width: 18%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${detailsVentes.map((detail) => `
              <tr>
                <td>${detail.num}</td>
                <td><strong>${detail.nom_produit}</strong></td>
                <td style="text-align: center; font-weight: bold; color: #059669;">${detail.quantite}</td>
                <td style="text-align: right;">${detail.prix_unitaire.toLocaleString('fr-FR')} FCFA</td>
                <td style="text-align: right; font-weight: bold;">${detail.total.toLocaleString('fr-FR')} FCFA</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
          <p>FayClick - La Super App des Marchands</p>
        </div>
      </body>
      </html>
    `;

    // Méthode robuste avec iframe caché (compatible mobile/tablette)
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(rapportHTML);
      frameDoc.close();

      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('Impression iframe échouée:', e);
            window.print();
          }
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      };
    } else {
      showToast('error', 'Erreur', 'Impossible d\'ouvrir la fenêtre d\'impression');
    }
  };

  // Loading initial
  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-400 to-emerald-200">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-teal-50 pb-20">
      {/* Header App */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4 safe-top flex items-center justify-between">
        {/* Bouton Retour */}
        <button
          onClick={() => router.push('/dashboard/commerce')}
          className="flex items-center gap-2 p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-semibold">Retour</span>
        </button>

        {/* Nom utilisateur */}
        <div className="font-bold">{user.nom_utilisateur}</div>

        {/* Menu hamburger */}
        <button
          onClick={() => setShowMenu(true)}
          className="p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors"
        >
          ☰
        </button>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Section 1: Header avec recherche + scan */}
        <VenteFlashHeader
          ref={headerRef}
          produits={produits}
          onAddToPanier={handleAddToPanier}
          onRefresh={handleRefresh}
          onPrint={handlePrintRapport}
        />

        {/* Section 2: Panier Inline (s'affiche automatiquement quand articles ajoutés) */}
        <PanierVenteFlashInline
          onSuccess={(venteData) => {
            // Ajout direct aux ventes du jour SANS appel API (données déjà disponibles)
            const nomCaissier = user.nom && user.prenom ? `${user.prenom} ${user.nom}` : user.login;
            const nouvelleVente: VenteFlash = {
              id_facture: venteData.id_facture,
              num_facture: venteData.num_facture,
              date_facture: new Date().toISOString(),
              montant_total: venteData.montant_total,
              montant_paye: venteData.montant_paye,
              montant_impaye: 0,
              mt_remise: venteData.mt_remise,
              mode_paiement: venteData.mode_paiement,
              nom_client: 'CLIENT ANONYME',
              tel_client: '',
              nom_caissier: nomCaissier,
              id_utilisateur: user.id,
              statut: 'PAYEE',
              details: venteData.details.map(d => ({
                id_detail: d.id_detail as number,
                id_produit: 0,
                nom_produit: d.nom_produit,
                quantite: d.quantite,
                prix_unitaire: d.prix_unitaire,
                total: d.total
              })),
              recus_paiements: venteData.recus_paiements?.map(r => ({
                id_recu: r.id_recu as number,
                id_facture: venteData.id_facture,
                numero_recu: r.numero_recu,
                methode_paiement: r.methode_paiement,
                montant_paye: r.montant_paye,
                date_paiement: r.date_paiement
              }))
            };

            // Ajouter en tête de liste (plus récente en premier)
            setVentesJour(prev => {
              const filtered = prev.filter(v => v.id_facture !== venteData.id_facture);
              return [nouvelleVente, ...filtered];
            });

            // Mettre à jour les stats localement
            setStats(prev => ({
              nb_ventes: prev.nb_ventes + 1,
              total_ventes: prev.total_ventes + venteData.montant_total,
              ca_jour: prev.ca_jour + venteData.montant_paye,
              total_remises: prev.total_remises + venteData.mt_remise
            }));

            console.log(`✅ [VF] Vente ajoutée localement (0 API call) | #${venteData.num_facture} | ${venteData.montant_total} FCFA`);
          }}
          onShowRecu={(idFacture: number, numFacture: string, montantTotal: number) => {
            setRecuData({ idFacture, numFacture, montantTotal });
            setShowRecu(true);
          }}
        />

        {/* Section 3: StatCards */}
        <VenteFlashStatsCards
          stats={stats}
          isLoading={isLoadingVentes}
        />

        {/* Section 3: Liste des ventes */}
        <VenteFlashListeVentes
          ventes={ventesJour}
          isLoading={isLoadingVentes}
          onDeleteVente={handleDeleteVente}
          onViewReceipt={handleViewReceipt}
        />
      </div>

      {/* Modal Quantité - Saisie rapide avant ajout au panier */}
      <AnimatePresence>
        {showQuantityModal && vfProduit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={handleCancelQuantity}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="text-white font-bold text-base truncate">{vfProduit.nom_produit}</h3>
                  <p className="text-white/80 text-sm">{vfProduit.prix_vente.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <button
                  onClick={handleCancelQuantity}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Stock disponible */}
                <div className="text-center text-sm text-gray-500">
                  Stock disponible : <span className="font-bold text-gray-900">{vfProduit.niveau_stock || 0}</span> unités
                </div>

                {/* Sélecteur quantité */}
                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setVfQuantity(q => Math.max(1, q - 1))}
                    disabled={vfQuantity <= 1}
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-40"
                  >
                    <Minus className="w-5 h-5 text-gray-600" />
                  </motion.button>

                  <input
                    ref={quantityInputRef}
                    type="number"
                    value={vfQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= (vfProduit.niveau_stock || 0)) {
                        setVfQuantity(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmQuantity();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    min={1}
                    max={vfProduit.niveau_stock || 0}
                    className="w-20 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setVfQuantity(q => Math.min((vfProduit.niveau_stock || 0), q + 1))}
                    disabled={vfQuantity >= (vfProduit.niveau_stock || 0)}
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </motion.button>
                </div>

                {/* Sous-total */}
                <div className="text-center bg-green-50 rounded-xl py-3">
                  <span className="text-sm text-gray-600">Sous-total : </span>
                  <span className="text-lg font-bold text-green-700">
                    {(vfProduit.prix_vente * vfQuantity).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Footer boutons */}
              <div className="grid grid-cols-2 gap-3 p-4 border-t border-gray-100">
                <button
                  onClick={handleCancelQuantity}
                  className="py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirmQuantity}
                  className="py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all shadow-md"
                >
                  Ajouter
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Reçu */}
      {recuData && (
        <ModalRecuGenere
          isOpen={showRecu}
          onClose={() => {
            setShowRecu(false);
            setRecuData(null);
          }}
          factureId={recuData.idFacture}
          numeroRecu={recuData.numFacture}
          montantPaye={recuData.montantTotal}
          montantFactureTotal={recuData.montantTotal}
          typePaiement="COMPLET"
          dateTimePaiement={new Date().toISOString()}
          walletUsed="CASH"
        />
      )}

      {/* Modal Refresh */}
      <ModalRefresh isOpen={isRefreshing} />

      {/* Modal Reçu Ticket (nouveau) */}
      {recuTicketData && (
        <ModalRecuVenteFlash
          isOpen={showRecuTicket}
          onClose={() => {
            setShowRecuTicket(false);
            setRecuTicketData(null);
          }}
          idFacture={recuTicketData.idFacture}
          numFacture={recuTicketData.numFacture}
          montantTotal={recuTicketData.montantTotal}
          methodePaiement={recuTicketData.methodePaiement}
          dateVente={recuTicketData.dateVente}
          detailFacture={recuTicketData.detailFacture}
        />
      )}

      {/* Menu Principal */}
      <MainMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        userType={user.type_structure}
      />

      {/* Toast Notifications */}
      <ToastComponent />
    </div>
  );
}
