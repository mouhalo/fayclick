/**
 * Hook simplifié pour le modal client qui utilise les données existantes
 * Au lieu de faire une requête supplémentaire, transforme ClientWithStats en ClientDetailComplet
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { clientsService } from '@/services/clients.service';
import {
  ClientDetailComplet,
  ClientWithStats,
  ClientFormData,
  TabClient,
  FiltreFactures,
  FiltreHistorique,
  FactureClient,
  HistoriqueProduitClient,
  StatsHistoriqueProduits,
  StatCard,
  calculateAnciennete
} from '@/types/client';

interface UseClientDetailFromDataReturn {
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
  initializeFromClientData: (clientWithStats: ClientWithStats) => void;
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

// Fonction utilitaire pour créer l'historique des produits depuis les factures PostgreSQL
function createHistoriqueProduits(factures: any[]): HistoriqueProduitClient[] {
  const produitsMap = new Map<string, HistoriqueProduitClient>();
  let idCounter = 1;
  
  factures.forEach(facture => {
    facture.details_articles?.forEach((article: any) => {
      const key = article.nom_produit;
      
      if (produitsMap.has(key)) {
        const existing = produitsMap.get(key)!;
        existing.quantite_totale += article.quantite;
        existing.montant_total += article.sous_total;
        existing.nombre_commandes += 1;
        
        // Mettre à jour la date si plus récente
        if (new Date(facture.date_facture) > new Date(existing.date_derniere_commande)) {
          existing.date_derniere_commande = facture.date_facture;
        }
        
        // Recalculer le prix moyen
        existing.prix_unitaire_moyen = existing.montant_total / existing.quantite_totale;
      } else {
        produitsMap.set(key, {
          id_produit: idCounter++, // ID généré
          nom_produit: article.nom_produit,
          quantite_totale: article.quantite,
          montant_total: article.sous_total,
          nombre_commandes: 1,
          date_derniere_commande: facture.date_facture,
          prix_unitaire_moyen: article.prix
        });
      }
    });
  });
  
  return Array.from(produitsMap.values());
}

// Fonction utilitaire pour créer les stats d'historique
function createStatsHistorique(historique: HistoriqueProduitClient[]): StatsHistoriqueProduits {
  if (historique.length === 0) {
    return {
      article_favori: 'Aucun',
      article_favori_quantite: 0,
      nombre_articles_differents: 0,
      montant_max_achat: 0,
      date_montant_max: '',
      produit_montant_max: '',
      montant_min_achat: 0,
      date_montant_min: '',
      produit_montant_min: ''
    };
  }
  
  // Article favori (plus commandé)
  const articleFavori = historique.reduce((prev, current) => 
    prev.quantite_totale > current.quantite_totale ? prev : current
  );
  
  // Plus gros montant
  const plusGrosMontant = historique.reduce((prev, current) => 
    prev.montant_total > current.montant_total ? prev : current
  );
  
  // Plus petit montant
  const plusPetitMontant = historique.reduce((prev, current) => 
    prev.montant_total < current.montant_total ? prev : current
  );
  
  return {
    article_favori: articleFavori.nom_produit,
    article_favori_quantite: articleFavori.quantite_totale,
    nombre_articles_differents: historique.length,
    montant_max_achat: plusGrosMontant.montant_total,
    date_montant_max: plusGrosMontant.date_derniere_commande,
    produit_montant_max: plusGrosMontant.nom_produit,
    montant_min_achat: plusPetitMontant.montant_total,
    date_montant_min: plusPetitMontant.date_derniere_commande,
    produit_montant_min: plusPetitMontant.nom_produit
  };
}

export function useClientDetailFromData(): UseClientDetailFromDataReturn {
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

  // Initialiser depuis ClientWithStats (pas de requête)
  const initializeFromClientData = useCallback((clientWithStats: ClientWithStats) => {
    console.log('🔄 [CLIENT DETAIL FROM DATA] Initialisation depuis données existantes');
    console.log('🔄 [CLIENT DETAIL FROM DATA] Factures disponibles:', clientWithStats.factures?.length || 0);
    
    // Transformer les factures PostgreSQL au format interface FactureClient
    const facturesTransformees: FactureClient[] = (clientWithStats.factures || []).map(facture => ({
      id_facture: facture.id_facture,
      numero_facture: facture.num_facture,
      date_facture: facture.date_facture,
      montant_facture: facture.montant,
      statut_paiement: facture.libelle_etat as 'PAYEE' | 'IMPAYEE' | 'PARTIELLE',
      date_paiement: undefined, // Pas dans les données PostgreSQL
      montant_paye: facture.mt_acompte || 0,
      montant_restant: facture.mt_restant
    }));
    
    // Créer l'historique des produits depuis les factures
    const historique_produits = createHistoriqueProduits(clientWithStats.factures || []);
    const stats_historique = createStatsHistorique(historique_produits);
    
    // Calculer l'ancienneté
    const ancienneteData = clientWithStats.statistiques_factures.date_premiere_facture
      ? calculateAnciennete(clientWithStats.statistiques_factures.date_premiere_facture)
      : { jours: 0, texte: 'Nouveau client' };
    
    // Créer ClientDetailComplet depuis ClientWithStats avec factures transformées
    const clientDetailComplet: ClientDetailComplet = {
      ...clientWithStats,
      factures: facturesTransformees,
      historique_produits,
      stats_historique,
      anciennete_jours: ancienneteData.jours,
      anciennete_texte: ancienneteData.texte
    };
    
    setClientDetail(clientDetailComplet);
    
    // Initialiser le formulaire
    setFormData({
      nom_client: clientWithStats.client.nom_client,
      tel_client: clientWithStats.client.tel_client,
      adresse: clientWithStats.client.adresse,
      id_client: clientWithStats.client.id_client
    });
    
    console.log('✅ [CLIENT DETAIL FROM DATA] Initialisation terminée:', {
      nom: clientWithStats.client.nom_client,
      factures: clientWithStats.factures?.length || 0,
      historique_produits: historique_produits.length,
      anciennete: ancienneteData.texte
    });
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
      
      console.log('💾 [CLIENT DETAIL FROM DATA] Sauvegarde client:', formData);
      
      await clientsService.createOrUpdateClient(formData);
      
      setIsEditing(false);
      
      console.log('✅ [CLIENT DETAIL FROM DATA] Client sauvegardé');
      
    } catch (err) {
      console.error('❌ [CLIENT DETAIL FROM DATA] Erreur sauvegarde:', err);
      
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  // Marquer une facture comme payée
  const marquerFacturePayee = useCallback(async (idFacture: number, montant: number) => {
    if (!clientDetail) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('💰 [CLIENT DETAIL FROM DATA] Marquage facture payée:', { idFacture, montant });
      
      await clientsService.marquerFacturePayee(idFacture, montant);
      
      console.log('✅ [CLIENT DETAIL FROM DATA] Facture marquée payée - Rechargement requis');
      
      // Note: Dans l'implémentation actuelle, nous devons recharger toutes les données
      // pour avoir les montants à jour. Une amélioration future serait de mettre à jour
      // uniquement la facture concernée localement.
      
    } catch (err) {
      console.error('❌ [CLIENT DETAIL FROM DATA] Erreur marquage facture:', err);
      
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur lors du marquage de la facture');
      }
    } finally {
      setIsLoading(false);
    }
  }, [clientDetail]);

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
    
    // Filtrage par statut (les factures sont maintenant transformées)
    if (filtreFactures.statut !== 'TOUTES') {
      factures = factures.filter(f => {
        switch (filtreFactures.statut) {
          case 'PAYEES':
            return f.statut_paiement === 'PAYEE';
          case 'IMPAYEES':
            return f.statut_paiement === 'IMPAYEE';
          case 'PARTIELLES':
            return f.statut_paiement === 'PARTIELLE';
          default:
            return true;
        }
      });
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
      },
      {
        id: 'montant_min',
        label: 'Plus petit Achat',
        value: clientsService.formatMontant(stats.montant_min_achat),
        icon: 'TrendingDown',
        color: 'orange',
        badge: stats.produit_montant_min
      }
    ];
  }, [clientDetail]);

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
    initializeFromClientData,
    saveClient,
    marquerFacturePayee,
    resetState,
    
    // Stats
    statsGenerales,
    statsFactures,
    statsHistorique
  };
}