/**
 * Hook personnalisé pour gérer l'état et les actions du modal client multi-onglets
 * Inspiré du pattern useProduits.ts
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { clientsService, ClientsApiException } from '@/services/clients.service';
import {
  ClientDetailComplet,
  ClientFormData,
  TabClient,
  FiltreFactures,
  FiltreHistorique,
  FactureClient,
  HistoriqueProduitClient,
  StatCard
} from '@/types/client';

interface UseClientDetailReturn {
  // État principal
  clientDetail: ClientDetailComplet | null;
  isLoading: boolean;
  error: string | null;
  
  // Navigation onglets
  activeTab: TabClient;
  setActiveTab: (tab: TabClient) => void;
  
  // Mode édition
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  
  // Données formulaire
  formData: ClientFormData;
  setFormData: (data: ClientFormData) => void;
  updateFormField: (field: keyof ClientFormData, value: string) => void;
  
  // Filtres
  filtreFactures: FiltreFactures;
  setFiltreFactures: (filtre: FiltreFactures) => void;
  filtreHistorique: FiltreHistorique;
  setFiltreHistorique: (filtre: FiltreHistorique) => void;
  
  // Données filtrées
  facturesFiltered: FactureClient[];
  historiqueProduitsFiltred: HistoriqueProduitClient[];
  
  // Actions
  loadClientDetail: (idClient: number) => Promise<void>;
  saveClient: () => Promise<void>;
  marquerFacturePayee: (idFacture: number, montant: number) => Promise<void>;
  resetState: () => void;
  
  // Stats formatées pour les cartes
  statsGenerales: StatCard[];
  statsFactures: StatCard[];
  statsHistorique: StatCard[];
}

const initialFormData: ClientFormData = {
  nom_client: '',
  tel_client: '',
  adresse: ''
};

const initialFiltreFactures: FiltreFactures = {
  statut: 'TOUTES'
};

const initialFiltreHistorique: FiltreHistorique = {
  recherche: '',
  tri: 'quantite',
  ordre: 'desc'
};

export function useClientDetail(): UseClientDetailReturn {
  // Référence pour annuler les requêtes en cours
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // États principaux
  const [clientDetail, setClientDetail] = useState<ClientDetailComplet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation et interface
  const [activeTab, setActiveTab] = useState<TabClient>('general');
  const [isEditing, setIsEditing] = useState(false);
  
  // Formulaire
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  
  // Filtres
  const [filtreFactures, setFiltreFactures] = useState<FiltreFactures>(initialFiltreFactures);
  const [filtreHistorique, setFiltreHistorique] = useState<FiltreHistorique>(initialFiltreHistorique);

  // Charger les détails complets d'un client
  const loadClientDetail = useCallback(async (idClient: number) => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Créer un nouveau contrôleur d'annulation
    abortControllerRef.current = new AbortController();
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 [USE CLIENT DETAIL] Chargement détails client:', idClient);
      
      const detail = await clientsService.getClientDetailComplet(idClient);
      
      // Vérifier si la requête n'a pas été annulée
      if (abortControllerRef.current?.signal.aborted) {
        console.log('🚫 [USE CLIENT DETAIL] Requête annulée');
        return;
      }
      
      setClientDetail(detail);
      
      // Initialiser le formulaire avec les données client
      setFormData({
        nom_client: detail.client.nom_client,
        tel_client: detail.client.tel_client,
        adresse: detail.client.adresse,
        id_client: detail.client.id_client
      });
      
      console.log('✅ [USE CLIENT DETAIL] Détails chargés:', {
        nom: detail.client.nom_client,
        factures: detail.factures.length,
        produits: detail.historique_produits.length
      });
      
    } catch (err) {
      // Ignorer les erreurs d'annulation
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🚫 [USE CLIENT DETAIL] Requête annulée');
        return;
      }
      
      console.error('❌ [USE CLIENT DETAIL] Erreur chargement:', err);
      
      if (err instanceof ClientsApiException) {
        setError(err.message);
      } else {
        setError('Erreur lors du chargement du client');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Sauvegarder les modifications du client
  const saveClient = useCallback(async () => {
    if (!formData.nom_client.trim()) {
      setError('Le nom du client est requis');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('💾 [USE CLIENT DETAIL] Sauvegarde client:', formData);
      
      const response = await clientsService.createOrUpdateClient(formData);
      
      // Recharger les détails après modification
      if (response.result_id_client && clientDetail) {
        await loadClientDetail(response.result_id_client);
      }
      
      setIsEditing(false);
      
      console.log('✅ [USE CLIENT DETAIL] Client sauvegardé:', response.result_action_effectuee);
      
    } catch (err) {
      console.error('❌ [USE CLIENT DETAIL] Erreur sauvegarde:', err);
      
      if (err instanceof ClientsApiException) {
        setError(err.message);
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, clientDetail, loadClientDetail]);

  // Marquer une facture comme payée
  const marquerFacturePayee = useCallback(async (idFacture: number, montant: number) => {
    if (!clientDetail) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('💰 [USE CLIENT DETAIL] Marquage facture payée:', { idFacture, montant });
      
      await clientsService.marquerFacturePayee(idFacture, montant);
      
      // Recharger les détails pour avoir les données à jour
      await loadClientDetail(clientDetail.client.id_client);
      
      console.log('✅ [USE CLIENT DETAIL] Facture marquée payée');
      
    } catch (err) {
      console.error('❌ [USE CLIENT DETAIL] Erreur marquage facture:', err);
      
      if (err instanceof ClientsApiException) {
        setError(err.message);
      } else {
        setError('Erreur lors du marquage de la facture');
      }
    } finally {
      setIsLoading(false);
    }
  }, [clientDetail, loadClientDetail]);

  // Mettre à jour un champ du formulaire
  const updateFormField = useCallback((field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Effacer l'erreur quand l'utilisateur tape
    if (error) setError(null);
  }, [error]);

  // Reset de l'état
  const resetState = useCallback(() => {
    setClientDetail(null);
    setFormData(initialFormData);
    setActiveTab('general');
    setIsEditing(false);
    setError(null);
    setFiltreFactures(initialFiltreFactures);
    setFiltreHistorique(initialFiltreHistorique);
  }, []);

  // Filtrage des factures avec useMemo pour éviter les recalculs inutiles
  const facturesFiltered = useMemo(() => {
    if (!clientDetail?.factures) return [];
    
    let factures = [...clientDetail.factures];
    
    // Filtrage par statut
    if (filtreFactures.statut !== 'TOUTES') {
      // Mapping des statuts pour correspondance
      const mapStatut = (statutFiltre: string) => {
        switch(statutFiltre) {
          case 'PAYEES': return 'PAYEE';
          case 'IMPAYEES': return 'IMPAYEE';
          case 'PARTIELLES': return 'PARTIELLE';
          default: return statutFiltre;
        }
      };
      const statutRecherche = mapStatut(filtreFactures.statut);
      factures = factures.filter(f => f.statut_paiement === statutRecherche);
    }
    
    // Tri par date (plus récentes en premier)
    factures.sort((a, b) => new Date(b.date_facture).getTime() - new Date(a.date_facture).getTime());
    
    return factures;
  }, [clientDetail?.factures, filtreFactures.statut]);

  // Filtrage et tri de l'historique produits avec useMemo
  const historiqueProduitsFiltred = useMemo(() => {
    if (!clientDetail?.historique_produits) return [];
    
    let produits = [...clientDetail.historique_produits];
    
    // Recherche par nom de produit
    if (filtreHistorique.recherche) {
      const recherche = filtreHistorique.recherche.toLowerCase();
      produits = produits.filter(p => 
        p.nom_produit.toLowerCase().includes(recherche)
      );
    }
    
    // Tri
    produits.sort((a, b) => {
      let valueA: number | string = 0;
      let valueB: number | string = 0;
      
      switch (filtreHistorique.tri) {
        case 'quantite':
          valueA = a.quantite_totale;
          valueB = b.quantite_totale;
          break;
        case 'montant':
          valueA = a.montant_total;
          valueB = b.montant_total;
          break;
        case 'date':
          valueA = new Date(a.date_derniere_commande).getTime();
          valueB = new Date(b.date_derniere_commande).getTime();
          break;
        case 'nom':
          valueA = a.nom_produit.toLowerCase();
          valueB = b.nom_produit.toLowerCase();
          break;
      }
      
      const result = typeof valueA === 'string' 
        ? valueA.localeCompare(valueB as string)
        : (valueA as number) - (valueB as number);
        
      return filtreHistorique.ordre === 'asc' ? result : -result;
    });
    
    return produits;
  }, [clientDetail?.historique_produits, filtreHistorique.recherche, filtreHistorique.tri, filtreHistorique.ordre]);

  // Stats formatées pour les cartes - Onglet Général avec useMemo
  const statsGenerales: StatCard[] = useMemo(() => {
    if (!clientDetail) return [];
    
    const stats = clientDetail.statistiques_factures;
    
    return [
      {
        id: 'factures_total',
        label: 'Factures Total',
        value: stats.nombre_factures,
        icon: 'FileText',
        color: 'blue'
      },
      {
        id: 'montant_total',
        label: 'Montant Total',
        value: clientsService.formatMontant(stats.montant_total_factures),
        icon: 'DollarSign',
        color: 'green'
      },
      {
        id: 'premiere_facture',
        label: 'Première Facture',
        value: clientsService.formatDate(stats.date_premiere_facture),
        icon: 'Calendar',
        color: 'purple'
      },
      {
        id: 'derniere_facture',
        label: 'Dernière Facture',
        value: clientsService.formatDate(stats.date_derniere_facture),
        icon: 'Clock',
        color: 'orange'
      }
    ];
  }, [clientDetail]);

  // Stats formatées pour les cartes - Onglet Factures avec useMemo
  const statsFactures: StatCard[] = useMemo(() => {
    if (!clientDetail) return [];
    
    const stats = clientDetail.statistiques_factures;
    
    return [
      {
        id: 'factures_payees',
        label: 'Factures Payées',
        value: stats.nombre_factures_payees,
        icon: 'CheckCircle',
        color: 'green'
      },
      {
        id: 'factures_impayees',
        label: 'Factures Impayées',
        value: stats.nombre_factures_impayees,
        icon: 'XCircle',
        color: 'red'
      },
      {
        id: 'montant_paye',
        label: 'Montant Payé',
        value: clientsService.formatMontant(stats.montant_paye),
        icon: 'DollarSign',
        color: 'green'
      },
      {
        id: 'montant_impaye',
        label: 'Montant Impayé',
        value: clientsService.formatMontant(stats.montant_impaye),
        icon: 'AlertTriangle',
        color: 'red'
      }
    ];
  }, [clientDetail]);

  // Stats formatées pour les cartes - Onglet Historique avec useMemo
  const statsHistorique: StatCard[] = useMemo(() => {
    if (!clientDetail) return [];
    
    const stats = clientDetail.stats_historique;
    
    return [
      {
        id: 'article_favori',
        label: 'Article Favori',
        value: stats.article_favori,
        icon: 'Star',
        color: 'yellow',
        badge: `${stats.article_favori_quantite} fois`
      },
      {
        id: 'articles_differents',
        label: 'Articles Différents',
        value: stats.nombre_articles_differents,
        icon: 'Package',
        color: 'blue'
      },
      {
        id: 'montant_max',
        label: 'Plus Gros Achat',
        value: clientsService.formatMontant(stats.montant_max_achat),
        icon: 'TrendingUp',
        color: 'purple',
        badge: stats.produit_montant_max
      }
    ];
  }, [clientDetail]);

  // Cleanup lors du démontage du composant
  useEffect(() => {
    return () => {
      // Annuler toute requête en cours lors du démontage
      if (abortControllerRef.current) {
        console.log('🧹 [USE CLIENT DETAIL] Cleanup - annulation requêtes en cours');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    // État principal
    clientDetail,
    isLoading,
    error,
    
    // Navigation
    activeTab,
    setActiveTab,
    
    // Édition
    isEditing,
    setIsEditing,
    
    // Formulaire
    formData,
    setFormData,
    updateFormField,
    
    // Filtres
    filtreFactures,
    setFiltreFactures,
    filtreHistorique,
    setFiltreHistorique,
    
    // Données filtrées
    facturesFiltered,
    historiqueProduitsFiltred,
    
    // Actions
    loadClientDetail,
    saveClient,
    marquerFacturePayee,
    resetState,
    
    // Stats
    statsGenerales,
    statsFactures,
    statsHistorique
  };
}