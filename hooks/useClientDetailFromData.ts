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
  FactureBrute,
  HistoriqueProduitClient,
  StatsHistoriqueProduits,
  StatCard,
  calculateAnciennete
} from '@/types/client';

// Fonction utilitaire pour mapper les statuts PostgreSQL vers les statuts de l'interface
function mapLibelleEtatToStatut(libelle: string): 'PAYEE' | 'IMPAYEE' | 'PARTIELLE' {
  switch (libelle.toUpperCase()) {
    case 'PAYEE':
    case 'PAYÉ':
    case 'PAID':
      return 'PAYEE';
    case 'PARTIELLE':
    case 'PARTIAL':
    case 'PARTIELLEMENT_PAYEE':
      return 'PARTIELLE';
    case 'IMPAYEE':
    case 'IMPAYÉ':
    case 'UNPAID':
    case 'NON_PAYEE':
    default:
      return 'IMPAYEE';
  }
}

// Fonction pour créer l'historique des produits depuis les factures
function createHistoriqueProduits(factures: FactureBrute[]): HistoriqueProduitClient[] {
  const produitsMap = new Map<string, {
    quantite_totale: number;
    montant_total: number;
    dates_commandes: string[];
    prix_unitaires: number[];
  }>();

  // Parcourir toutes les factures et leurs articles
  factures.forEach(facture => {
    facture.details_articles?.forEach(article => {
      const key = article.nom_produit;
      const existing = produitsMap.get(key);
      
      if (existing) {
        existing.quantite_totale += article.quantite;
        existing.montant_total += article.sous_total;
        existing.dates_commandes.push(facture.date_facture);
        existing.prix_unitaires.push(article.prix);
      } else {
        produitsMap.set(key, {
          quantite_totale: article.quantite,
          montant_total: article.sous_total,
          dates_commandes: [facture.date_facture],
          prix_unitaires: [article.prix]
        });
      }
    });
  });

  // Transformer en HistoriqueProduitClient[]
  return Array.from(produitsMap.entries()).map(([nom_produit, data], index) => ({
    id_produit: index + 1,
    nom_produit,
    quantite_totale: data.quantite_totale,
    montant_total: data.montant_total,
    date_derniere_commande: Math.max(...data.dates_commandes.map(d => new Date(d).getTime())) 
      ? new Date(Math.max(...data.dates_commandes.map(d => new Date(d).getTime()))).toISOString().split('T')[0]
      : data.dates_commandes[0],
    nombre_commandes: data.dates_commandes.length,
    prix_unitaire_moyen: data.prix_unitaires.reduce((sum, prix) => sum + prix, 0) / data.prix_unitaires.length
  }));
}

// Fonction pour créer les statistiques de l'historique
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

  // Article favori (plus grande quantité)
  const articleFavori = historique.reduce((prev, current) => 
    (prev.quantite_totale > current.quantite_totale) ? prev : current
  );

  // Montant max et min
  const montantMax = Math.max(...historique.map(h => h.montant_total));
  const montantMin = Math.min(...historique.map(h => h.montant_total));
  const produitMontantMax = historique.find(h => h.montant_total === montantMax);
  const produitMontantMin = historique.find(h => h.montant_total === montantMin);

  return {
    article_favori: articleFavori.nom_produit,
    article_favori_quantite: articleFavori.quantite_totale,
    nombre_articles_differents: historique.length,
    montant_max_achat: montantMax,
    date_montant_max: produitMontantMax?.date_derniere_commande || '',
    produit_montant_max: produitMontantMax?.nom_produit || '',
    montant_min_achat: montantMin,
    date_montant_min: produitMontantMin?.date_derniere_commande || '',
    produit_montant_min: produitMontantMin?.nom_produit || ''
  };
}

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
      statut_paiement: mapLibelleEtatToStatut(facture.libelle_etat),
      date_paiement: undefined, // Pas disponible dans les données PostgreSQL actuelles
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
      client: clientWithStats.client,
      statistiques_factures: clientWithStats.statistiques_factures,
      factures: facturesTransformees,
      factures_brutes: clientWithStats.factures,
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
      factures: facturesTransformees.length,
      historique_produits: historique_produits.length,
      anciennete: ancienneteData.texte,
      premier_article_favori: stats_historique.article_favori
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