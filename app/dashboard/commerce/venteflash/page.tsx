/**
 * Page Vente Flash - Système de vente rapide
 * Scan code-barre + Recherche produits + Panier + Création factures
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import database from '@/services/database.service';
import { Produit } from '@/types/produit';
import { VenteFlash, VenteFlashStats } from '@/types/venteflash.types';
import { User } from '@/types/auth';
import { usePanierStore } from '@/stores/panierStore';
import { useToast } from '@/components/ui/Toast';
import { useFactureSuccessStore } from '@/hooks/useFactureSuccess';
import { VenteFlashHeader } from '@/components/venteflash/VenteFlashHeader';
import { VenteFlashStatsCards } from '@/components/venteflash/VenteFlashStatsCards';
import { VenteFlashListeVentes } from '@/components/venteflash/VenteFlashListeVentes';
import { ModalPanier } from '@/components/panier/ModalPanier';
import { ModalFactureSuccess } from '@/components/panier/ModalFactureSuccess';
import MainMenu from '@/components/layout/MainMenu';

export default function VenteFlashPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const { addArticle } = usePanierStore();
  const { isOpen: isFactureSuccessOpen } = useFactureSuccessStore();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // États des données
  const [produits, setProduits] = useState<Produit[]>([]);
  const [ventesJour, setVentesJour] = useState<VenteFlash[]>([]);
  const [stats, setStats] = useState<VenteFlashStats>({
    nb_ventes: 0,
    total_ventes: 0,
    ca_jour: 0
  });

  // États de chargement
  const [isLoadingProduits, setIsLoadingProduits] = useState(true);
  const [isLoadingVentes, setIsLoadingVentes] = useState(true);

  // Vérification authentification
  useEffect(() => {
    const checkAuthentication = () => {
      if (!authService.isAuthenticated()) {
        console.log('❌ [VENTE FLASH] Utilisateur non authentifié');
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      if (!userData || userData.type_structure !== 'COMMERCIALE') {
        console.log('⚠️ [VENTE FLASH] Type structure incorrect');
        router.push('/dashboard');
        return;
      }

      console.log('✅ [VENTE FLASH] Authentification validée');
      setUser(userData);
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
  }, [user]);

  // Recharger ventes quand modal facture success se ferme
  useEffect(() => {
    if (!isFactureSuccessOpen && user) {
      // Petite pause pour laisser la facture s'enregistrer
      setTimeout(() => {
        loadVentesJour();
      }, 500);
    }
  }, [isFactureSuccessOpen, user]);

  /**
   * Charger tous les produits de la structure
   * Stockage local pour éviter va-et-vient serveur
   */
  const loadProduits = async () => {
    if (!user) return;

    setIsLoadingProduits(true);
    try {
      console.log('📦 [VENTE FLASH] Chargement produits...');

      const query = `SELECT * FROM get_mes_produits(${user.id_structure}, NULL)`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const response = results[0].get_mes_produits;
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        if (parsedResponse.success && parsedResponse.data) {
          console.log(`✅ [VENTE FLASH] ${parsedResponse.data.length} produits chargés`);
          setProduits(parsedResponse.data);
        }
      }
    } catch (error) {
      console.error('❌ [VENTE FLASH] Erreur chargement produits:', error);
      showToast('error', 'Erreur', 'Impossible de charger les produits');
    } finally {
      setIsLoadingProduits(false);
    }
  };

  /**
   * Charger les factures du jour
   * Filtrage côté client pour ventes du jour uniquement
   */
  const loadVentesJour = async () => {
    if (!user) return;

    setIsLoadingVentes(true);
    try {
      console.log('📊 [VENTE FLASH] Chargement factures du jour...');

      const query = `SELECT * FROM get_my_factures(${user.id_structure})`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const response = results[0].get_my_factures;
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        if (parsedResponse.success && parsedResponse.data) {
          // Filtrer uniquement les ventes du jour
          const today = new Date().toISOString().split('T')[0];
          const ventesAujourdhui = parsedResponse.data.filter((facture: any) => {
            const factureDate = new Date(facture.date_facture).toISOString().split('T')[0];
            return factureDate === today;
          });

          console.log(`✅ [VENTE FLASH] ${ventesAujourdhui.length} ventes du jour`);

          // Mapper au format VenteFlash
          const ventesFormatees: VenteFlash[] = ventesAujourdhui.map((f: any) => ({
            id_facture: f.id_facture,
            num_facture: f.num_facture,
            date_facture: f.date_facture,
            montant_total: f.montant_total || 0,
            montant_paye: f.montant_paye || 0,
            montant_impaye: f.montant_impaye || 0,
            mode_paiement: f.mode_paiement || 'ESPECES',
            nom_client: f.nom_client || 'CLIENT ANONYME',
            tel_client: f.tel_client || '',
            nom_caissier: f.nom_caissier || user.nom_utilisateur,
            id_utilisateur: f.id_utilisateur,
            statut: f.statut
          }));

          setVentesJour(ventesFormatees);

          // Calculer statistiques
          const statsCalculees: VenteFlashStats = {
            nb_ventes: ventesFormatees.length,
            total_ventes: ventesFormatees.reduce((sum, v) => sum + v.montant_total, 0),
            ca_jour: ventesFormatees.reduce((sum, v) => sum + v.montant_paye, 0)
          };

          setStats(statsCalculees);
        }
      }
    } catch (error) {
      console.error('❌ [VENTE FLASH] Erreur chargement ventes:', error);
      showToast('error', 'Erreur', 'Impossible de charger les ventes');
    } finally {
      setIsLoadingVentes(false);
    }
  };

  /**
   * Ajouter un produit au panier
   */
  const handleAddToPanier = useCallback((produit: Produit) => {
    console.log('🛒 [VENTE FLASH] Ajout panier:', produit.nom_produit);

    // Vérifier stock disponible
    const stockDisponible = produit.niveau_stock || 0;
    if (stockDisponible <= 0) {
      showToast('warning', 'Stock insuffisant', `${produit.nom_produit} n'est plus en stock`);
      return;
    }

    addArticle(produit);
    showToast('success', 'Ajouté au panier', produit.nom_produit);
  }, [addArticle, showToast]);

  /**
   * Supprimer une facture (Admin uniquement)
   */
  const handleDeleteVente = async (id_facture: number) => {
    if (!user) return;

    try {
      console.log('🗑️ [VENTE FLASH] Suppression facture:', id_facture);

      const query = `SELECT * FROM supprimer_facturecom(${user.id_structure}, ${id_facture}, ${user.id})`;
      const results = await database.query(query);

      if (results && results.length > 0) {
        const response = results[0].supprimer_facturecom;
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        if (parsedResponse.success) {
          showToast('success', 'Suppression réussie', 'La facture a été supprimée');
          // Recharger liste
          loadVentesJour();
        } else {
          showToast('error', 'Erreur', parsedResponse.message || 'Suppression impossible');
        }
      }
    } catch (error) {
      console.error('❌ [VENTE FLASH] Erreur suppression:', error);
      showToast('error', 'Erreur', 'Impossible de supprimer la facture');
    }
  };

  /**
   * Afficher reçu
   */
  const handleViewReceipt = (id_facture: number) => {
    console.log('📄 [VENTE FLASH] Affichage reçu:', id_facture);
    // TODO: Implémenter affichage reçu (réutiliser composant existant)
    showToast('info', 'Reçu', 'Fonctionnalité à implémenter');
  };

  /**
   * Afficher facture
   */
  const handleViewInvoice = (id_facture: number) => {
    console.log('📋 [VENTE FLASH] Affichage facture:', id_facture);
    // TODO: Implémenter affichage facture (réutiliser composant existant)
    showToast('info', 'Facture', 'Fonctionnalité à implémenter');
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
      {/* Header App (optionnel si besoin) */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4 safe-top flex items-center justify-between">
        <div>
          <div className="text-sm opacity-90">Bonjour,</div>
          <div className="font-bold">{user.nom_utilisateur}</div>
        </div>
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
          produits={produits}
          onAddToPanier={handleAddToPanier}
        />

        {/* Section 2: StatCards */}
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
          onViewInvoice={handleViewInvoice}
        />
      </div>

      {/* Modal Panier (réutilisation existante) */}
      <ModalPanier />

      {/* Modal Facture Success (réutilisation existante) */}
      <ModalFactureSuccess />

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
