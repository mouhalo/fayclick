/**
 * Service de gestion des clients pour FayClick V2
 * Centralise toutes les opérations API pour les clients
 * Suit le pattern des services existants (produits.service.ts)
 */

import { authService } from './auth.service';
import database from './database.service';
import SecurityService from './security.service';
import {
  Client,
  ClientWithStats,
  ClientDetailComplet,
  ClientsApiResponse,
  InfosClientsApiResponse,
  AddEditClientResponse,
  ClientFormData,
  StatistiquesGlobales,
  FactureClient,
  HistoriqueProduitClient,
  StatsHistoriqueProduits,
  ClientsApiException,
  calculateAnciennete,
  CheckOneClientResponse
} from '@/types/client';

/**
 * Service singleton pour la gestion des clients
 */
export class ClientsService {
  private static instance: ClientsService;
  
  // Cache simple pour éviter les requêtes répétées (5 minutes de validité)
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  // Pattern Singleton
  public static getInstance(): ClientsService {
    if (!ClientsService.instance) {
      ClientsService.instance = new ClientsService();
    }
    return ClientsService.instance;
  }

  /**
   * Vérifier si une donnée en cache est encore valide
   */
  private isCacheValid(cacheEntry: { data: any; timestamp: number }): boolean {
    return Date.now() - cacheEntry.timestamp < this.CACHE_DURATION;
  }

  /**
   * Nettoyer le cache des entrées expirées
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Vider complètement le cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 [CLIENTS] Cache vidé');
  }

  /**
   * Récupérer la liste des clients avec leurs statistiques
   * ✅ Optimisé : Suppression du test de connectivité redondant + cache
   */
  async getListeClients(): Promise<ClientsApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      // Clé de cache basée sur la structure
      const cacheKey = `clients_${user.id_structure}`;
      
      // Vérifier le cache d'abord
      const cachedData = this.cache.get(cacheKey);
      if (cachedData && this.isCacheValid(cachedData)) {
        console.log('📦 [CLIENTS] Données récupérées depuis le cache');
        return cachedData.data;
      }

      // Nettoyer le cache expiré
      this.cleanExpiredCache();
      SecurityService.secureLog('log', '📋 [CLIENTS] Récupération liste clients (depuis API)', {
        id_structure: user.id_structure,
        timestamp: new Date().toISOString()
      });

      // Utilisation de la fonction PostgreSQL get_list_clients
      // ⚠️ IMPORTANT: La fonction attend 2 paramètres (id_structure, tel_client)
      // Si on ne cherche pas un client spécifique, on passe une chaîne vide
      const query = `SELECT * FROM get_list_clients(${user.id_structure}, '')`;
      
      console.log('🔍 [CLIENTS] Requête SQL générée:', query);
      console.log('🔍 [CLIENTS] Utilisateur:', {
        id: user.id,
        login: user.login,
        id_structure: user.id_structure,
        type_structure: user.type_structure
      });
      
      const results = await database.query(query);
      
      console.log('🔍 [CLIENTS] Résultats bruts de l\'API:', results);
      
      // L'API retourne un tableau avec un objet contenant les données
      const rawData = Array.isArray(results) && results.length > 0 ? results[0] : null;
      
      console.log('🔍 [CLIENTS] Données extraites:', rawData);
      
      if (!rawData) {
        throw new ClientsApiException('Aucune donnée retournée par l\'API', 500);
      }

      // La fonction PostgreSQL get_list_clients retourne un objet avec propriété get_list_clients
      let data;
      
      try {
        if (rawData.get_list_clients) {
          const clientData = rawData.get_list_clients;
          console.log('🔍 [CLIENTS] Type de get_list_clients:', typeof clientData);
          console.log('🔍 [CLIENTS] Valeur get_list_clients:', clientData);
          
          if (typeof clientData === 'string') {
            // C'est une chaîne JSON à parser
            data = JSON.parse(clientData);
            console.log('🔍 [CLIENTS] Parsing string JSON réussi');
          } else if (typeof clientData === 'object' && clientData !== null) {
            // C'est déjà un objet
            data = clientData;
            console.log('🔍 [CLIENTS] Utilisation objet direct');
          } else {
            throw new Error('Format get_list_clients inattendu');
          }
        } else if (typeof rawData === 'string') {
          // rawData est directement une chaîne JSON
          data = JSON.parse(rawData);
          console.log('🔍 [CLIENTS] Parsing rawData string réussi');
        } else {
          // rawData est directement l'objet de données
          data = rawData;
          console.log('🔍 [CLIENTS] Utilisation rawData direct');
        }
      } catch (parseError) {
        console.error('❌ [CLIENTS] Erreur parsing:', parseError);
        console.error('❌ [CLIENTS] rawData:', rawData);
        console.error('❌ [CLIENTS] get_list_clients:', rawData.get_list_clients);
        throw new ClientsApiException('Erreur de format des données client', 500);
      }

      console.log('🔍 [CLIENTS] Données parsées:', data);
      
      // Vérification du statut (success est un booléen true dans les données PostgreSQL)
      if (!data || (data.success !== true && data.status !== 'success')) {
        console.error('❌ [CLIENTS] Statut invalide:', { success: data?.success, status: data?.status });
        throw new ClientsApiException('Erreur lors de la récupération des clients', 500);
      }
      
      // ⚠️ IMPORTANT: La fonction PostgreSQL retourne {clients: [...]} selon la structure SQL
      // Vérification que les clients existent
      if (!data.clients || !Array.isArray(data.clients)) {
        console.error('❌ [CLIENTS] Tableau clients invalide:', data.clients);
        throw new ClientsApiException('Format de données clients invalide', 500);
      }
      
      console.log(`✅ [CLIENTS] ${data.clients.length} clients parsés avec succès`);
      
      SecurityService.secureLog('log', '✅ [CLIENTS] Clients récupérés avec succès', {
        nombre_clients: data.clients?.length || 0,
        structure_id: data.structure_id
      });

      // ✅ La fonction PostgreSQL retourne EXACTEMENT le bon format maintenant
      // Structure: { success, structure_id, clients: [...], statistiques_globales, filtre_telephone, timestamp_generation }
      const transformedData: ClientsApiResponse = {
        success: data.success,
        structure_id: data.structure_id,
        clients: data.clients || [], // Déjà au bon format ClientWithStats[]
        statistiques_globales: data.statistiques_globales || null,
        filtre_telephone: data.filtre_telephone || null,
        timestamp_generation: data.timestamp_generation || new Date().toISOString()
      };

      // Mettre les données en cache
      this.cache.set(cacheKey, {
        data: transformedData,
        timestamp: Date.now()
      });
      
      return transformedData;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur récupération clients', error);
      
      if (error instanceof ClientsApiException) {
        throw error;
      }
      
      throw new ClientsApiException(
        'Impossible de récupérer la liste des clients',
        500,
        error
      );
    }
  }

  /**
   * 🚀 Liste allégée des clients (id, nom, tél, adresse) pour la recherche caisse
   * Utilise la fonction PostgreSQL get_list_infos_client : aucune facture ni
   * statistique embarquée, réponse en quelques Ko au lieu de dizaines de Mo.
   * Le filtrage nom/téléphone se fait côté client (dans le modal).
   */
  async getListeInfosClients(): Promise<InfosClientsApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      // Clé de cache distincte de la liste complète
      const cacheKey = `infos_clients_${user.id_structure}`;

      const cachedData = this.cache.get(cacheKey);
      if (cachedData && this.isCacheValid(cachedData)) {
        console.log('📦 [CLIENTS] Infos clients récupérées depuis le cache');
        return cachedData.data;
      }

      this.cleanExpiredCache();
      SecurityService.secureLog('log', '⚡ [CLIENTS] Récupération infos clients (liste légère)', {
        id_structure: user.id_structure,
        timestamp: new Date().toISOString()
      });

      // ⚠️ La fonction attend 2 paramètres (id_structure, tel_client)
      // Chaîne vide = tous les clients de la structure
      const query = `SELECT * FROM get_list_infos_client(${user.id_structure}, '')`;

      const results = await database.query(query);

      const rawData = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!rawData) {
        throw new ClientsApiException('Aucune donnée retournée par l\'API', 500);
      }

      let data;
      try {
        if (rawData.get_list_infos_client) {
          const clientData = rawData.get_list_infos_client;
          data = typeof clientData === 'string' ? JSON.parse(clientData) : clientData;
        } else if (typeof rawData === 'string') {
          data = JSON.parse(rawData);
        } else {
          data = rawData;
        }
      } catch (parseError) {
        console.error('❌ [CLIENTS] Erreur parsing infos clients:', parseError);
        throw new ClientsApiException('Erreur de format des données client', 500);
      }

      if (!data || data.success !== true || !Array.isArray(data.clients)) {
        console.error('❌ [CLIENTS] Réponse invalide get_list_infos_client:', {
          success: data?.success,
          clients: Array.isArray(data?.clients) ? `array(${data.clients.length})` : data?.clients
        });
        throw new ClientsApiException(
          data?.error || 'Erreur lors de la récupération des clients',
          500
        );
      }

      const transformedData: InfosClientsApiResponse = {
        success: true,
        structure_id: data.structure_id,
        clients: data.clients,
        nombre_clients: data.nombre_clients ?? data.clients.length,
        filtre_telephone: data.filtre_telephone || null,
        timestamp_generation: data.timestamp_generation || new Date().toISOString()
      };

      this.cache.set(cacheKey, {
        data: transformedData,
        timestamp: Date.now()
      });

      SecurityService.secureLog('log', '✅ [CLIENTS] Infos clients récupérées avec succès', {
        nombre_clients: transformedData.nombre_clients,
        structure_id: data.structure_id
      });

      return transformedData;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur récupération infos clients', error);

      if (error instanceof ClientsApiException) {
        throw error;
      }

      throw new ClientsApiException(
        'Impossible de récupérer la liste des clients',
        500,
        error
      );
    }
  }

  /**
   * Récupérer les détails complets d'un client (pour modal multi-onglets)
   * ⚠️ FONCTION OBSOLÈTE - Remplacée par l'utilisation directe des données de getListeClients()
   * Les données complètes (factures, historique) sont déjà disponibles via get_list_clients
   * Cette fonction est conservée pour compatibilité avec useClientDetail.
   */
  async getClientDetailComplet(idClient: number): Promise<ClientDetailComplet> {
    console.warn('⚠️ [CLIENTS] getClientDetailComplet() est obsolète - utiliser les données de getListeClients() directement');

    // Utiliser getClientFactureDetails pour obtenir les données
    const clientData = await this.getClientFactureDetails(idClient);

    // Calculer les statistiques manquantes
    const factures = clientData.factures || [];
    const nombreFactures = factures.length;
    const nombrePayees = factures.filter((f: any) => f.statut_paiement === 'PAYEE').length;
    const nombreImpayees = factures.filter((f: any) => f.statut_paiement === 'IMPAYEE').length;
    const montantTotal = factures.reduce((sum: number, f: any) => sum + (f.montant || 0), 0);
    const montantPaye = factures.reduce((sum: number, f: any) => sum + (f.mt_paye || 0), 0);
    const montantImpaye = factures.reduce((sum: number, f: any) => sum + (f.mt_restant || 0), 0);

    // Calculer l'ancienneté
    const dateCreation = clientData.client.date_creation || new Date().toISOString();
    const ancienneteMs = Date.now() - new Date(dateCreation).getTime();
    const ancienneteJours = Math.floor(ancienneteMs / (1000 * 60 * 60 * 24));
    const ancienneteTexte = ancienneteJours > 365
      ? `${Math.floor(ancienneteJours / 365)} an(s)`
      : `${ancienneteJours} jour(s)`;

    // Mapper les factures au format attendu
    const facturesMapped = (clientData.factures || []).map((f: any) => ({
      ...f,
      numero_facture: f.num_facture || f.numero_facture,
      montant_facture: f.montant || f.montant_facture,
      statut_paiement: f.statut_paiement || (f.id_etat === 2 ? 'PAYEE' : f.id_etat === 3 ? 'PARTIELLE' : 'IMPAYEE')
    }));

    // Transformer en format ClientDetailComplet attendu par le hook
    return {
      client: clientData.client,
      factures: facturesMapped,
      historique_produits: (clientData as any).historique_produits || [],
      stats_historique: (clientData as any).stats_historique || {
        total_produits_achetes: 0,
        montant_total_achats: 0,
        produit_prefere: null,
        dernier_achat: null
      },
      anciennete_jours: ancienneteJours,
      anciennete_texte: ancienneteTexte,
      statistiques_factures: {
        nombre_factures: nombreFactures,
        nombre_factures_payees: nombrePayees,
        nombre_factures_impayees: nombreImpayees,
        montant_total_factures: montantTotal,
        montant_paye: montantPaye,
        montant_impaye: montantImpaye,
        pourcentage_paiement: montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0,
        date_premiere_facture: factures.length > 0 ? factures[factures.length - 1].date_facture : '',
        date_derniere_facture: factures.length > 0 ? factures[0].date_facture : ''
      }
    };
  }

  /**
   * Récupérer les détails mis à jour d'un client spécifique avec ses factures
   * Utilisé pour la synchronisation après un paiement
   */
  async getClientFactureDetails(idClient: number): Promise<ClientWithStats> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      if (!idClient || idClient <= 0) {
        throw new ClientsApiException('ID client invalide', 400);
      }

      SecurityService.secureLog('log', '🔄 [CLIENTS] Récupération détails client spécifique', {
        id_client: idClient,
        id_structure: user.id_structure,
        timestamp: new Date().toISOString()
      });

      // Utilisation de la même fonction PostgreSQL get_list_clients
      // mais on filtrera le client spécifique côté JavaScript
      // ⚠️ IMPORTANT: La fonction attend 2 paramètres (id_structure, tel_client)
      const query = `SELECT * FROM get_list_clients(${user.id_structure}, '')`;
      
      console.log('🔍 [CLIENTS] Requête pour client spécifique:', query);
      
      const results = await database.query(query);
      const rawData = Array.isArray(results) && results.length > 0 ? results[0] : null;
      
      if (!rawData) {
        throw new ClientsApiException('Aucune donnée retournée par l\'API', 500);
      }

      // Parse des données comme dans getListeClients
      let data;
      try {
        if (rawData.get_list_clients) {
          const clientData = rawData.get_list_clients;
          if (typeof clientData === 'string') {
            data = JSON.parse(clientData);
          } else if (typeof clientData === 'object' && clientData !== null) {
            data = clientData;
          } else {
            throw new Error('Format get_list_clients inattendu');
          }
        } else if (typeof rawData === 'string') {
          data = JSON.parse(rawData);
        } else {
          data = rawData;
        }
      } catch (parseError) {
        console.error('❌ [CLIENTS] Erreur parsing données client spécifique:', parseError);
        throw new ClientsApiException('Erreur lors du parsing des données client', 500);
      }

      // Valider la structure des données
      if (!data || !data.clients || !Array.isArray(data.clients)) {
        console.error('❌ [CLIENTS] Structure de données invalide pour client spécifique:', data);
        throw new ClientsApiException('Structure de données client invalide', 500);
      }

      // Trouver le client spécifique dans la liste
      const clientSpecifique = data.clients.find((client: any) => 
        client.client && client.client.id_client === idClient
      );

      if (!clientSpecifique) {
        throw new ClientsApiException(`Client avec ID ${idClient} introuvable`, 404);
      }

      SecurityService.secureLog('log', '✅ [CLIENTS] Client spécifique récupéré avec succès', {
        id_client: idClient,
        nom_client: clientSpecifique.client.nom_client,
        nb_factures: clientSpecifique.factures?.length || 0
      });

      return clientSpecifique;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur récupération client spécifique', error);
      
      if (error instanceof ClientsApiException) {
        throw error;
      }
      
      throw new ClientsApiException(
        'Impossible de récupérer les détails du client',
        500,
        error
      );
    }
  }

  /**
   * Mettre à jour un client spécifique dans une liste existante
   * Optimisation pour éviter de recharger toute la liste
   */
  async updateClientInList(
    clientId: number, 
    currentClients: ClientWithStats[]
  ): Promise<ClientWithStats[]> {
    try {
      SecurityService.secureLog('log', '🔄 [CLIENTS] Mise à jour client dans liste', {
        id_client: clientId,
        nb_clients_actuels: currentClients.length
      });

      // Récupérer les données mises à jour du client
      const updatedClient = await this.getClientFactureDetails(clientId);
      
      // Remplacer le client dans la liste existante
      const updatedClients = currentClients.map(client => 
        client.client.id_client === clientId ? updatedClient : client
      );

      SecurityService.secureLog('log', '✅ [CLIENTS] Client mis à jour dans la liste', {
        id_client: clientId,
        nom_client: updatedClient.client.nom_client
      });

      return updatedClients;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur mise à jour client dans liste', error);
      throw error;
    }
  }

  /**
   * Récupérer uniquement les statistiques globales (optimisation)
   * Utilisé après un paiement pour mettre à jour les statistiques sans recharger toute la liste
   */
  async getStatistiquesGlobales(): Promise<StatistiquesGlobales | null> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }
      SecurityService.secureLog('log', '📊 [CLIENTS] Récupération statistiques globales uniquement', {
        id_structure: user.id_structure
      });

      // Utiliser get_list_clients mais extraire seulement les stats
      // ⚠️ IMPORTANT: La fonction attend 2 paramètres (id_structure, tel_client)
      const query = `SELECT * FROM get_list_clients(${user.id_structure}, '')`;
      const results = await database.query(query);
      const rawData = Array.isArray(results) && results.length > 0 ? results[0] : null;
      
      if (!rawData) {
        return null;
      }

      // Parse des données
      let data;
      try {
        if (rawData.get_list_clients) {
          const clientData = rawData.get_list_clients;
          if (typeof clientData === 'string') {
            data = JSON.parse(clientData);
          } else {
            data = clientData;
          }
        } else if (typeof rawData === 'string') {
          data = JSON.parse(rawData);
        } else {
          data = rawData;
        }
      } catch (parseError) {
        console.error('❌ [CLIENTS] Erreur parsing statistiques:', parseError);
        return null;
      }

      return data.statistiques_globales || null;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur récupération statistiques', error);
      return null;
    }
  }

  /**
   * 🆕 Recherche un client par numéro de téléphone (pour le panier)
   * Utilise la fonction PostgreSQL get_list_clients avec filtre téléphone
   *
   * @param telephone - Numéro de téléphone du client (9 chiffres minimum)
   * @returns Résultat de la recherche avec le client si trouvé
   */
  async searchClientByPhone(telephone: string): Promise<{
    found: boolean;
    client?: Client;
    message: string;
  }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      console.log('🔍 [CLIENTS] Recherche client par téléphone:', {
        id_structure: user.id_structure,
        telephone: telephone.substring(0, 3) + '***'
      });

      // Validation basique
      if (!telephone || telephone.length < 9) {
        return {
          found: false,
          message: 'Numéro de téléphone trop court (minimum 9 chiffres)'
        };
      }

      // Nettoyer le téléphone (supprimer espaces, tirets, etc.)
      const cleanedPhone = telephone.replace(/\D/g, '');

      // Appel de la fonction PostgreSQL get_list_clients avec filtre
      const results = await database.getListClients(user.id_structure, cleanedPhone);

      console.log('📊 [CLIENTS] Résultats recherche téléphone:', {
        hasResults: results && results.length > 0,
        resultCount: results?.length || 0
      });

      if (!results || results.length === 0) {
        return {
          found: false,
          message: 'Aucun client trouvé avec ce numéro'
        };
      }

      // Parser la réponse (même logique que getListeClients)
      const rawData = results[0] as Record<string, unknown>;
      let data;

      try {
        if (rawData.get_list_clients) {
          const clientData = rawData.get_list_clients;
          data = typeof clientData === 'string'
            ? JSON.parse(clientData)
            : clientData;
        } else if (typeof rawData === 'string') {
          data = JSON.parse(rawData);
        } else {
          data = rawData;
        }
      } catch (parseError) {
        console.error('❌ [CLIENTS] Erreur parsing recherche téléphone:', parseError);
        return {
          found: false,
          message: 'Erreur lors du traitement des données'
        };
      }

      console.log('✅ [CLIENTS] Données parsées recherche:', {
        success: data.success,
        total_clients: data.total_clients,
        hasData: !!data.data
      });

      // Vérifier si un client a été trouvé
      if (data.success && data.data && data.data.length > 0) {
        const client = data.data[0] as Client;

        console.log('🎯 [CLIENTS] Client trouvé:', {
          id_client: client.id_client,
          nom_client: client.nom_client,
          tel_client: client.tel_client
        });

        return {
          found: true,
          client,
          message: 'Client trouvé avec succès'
        };
      }

      return {
        found: false,
        message: data.message || 'Aucun client trouvé'
      };

    } catch (error) {
      console.error('❌ [CLIENTS] Erreur recherche client par téléphone:', error);

      return {
        found: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la recherche'
      };
    }
  }

  /**
   * Mise à jour hybride : client spécifique + statistiques globales
   * Solution optimale pour la synchronisation après paiement
   */
  async updateClientAndStats(
    clientId: number,
    currentClients: ClientWithStats[]
  ): Promise<{ clients: ClientWithStats[], stats: StatistiquesGlobales | null }> {
    try {
      SecurityService.secureLog('log', '🔄 [CLIENTS] Mise à jour hybride client + stats', {
        id_client: clientId
      });

      // Lancer les deux requêtes en parallèle pour optimiser
      const [updatedClient, newStats] = await Promise.all([
        this.getClientFactureDetails(clientId),
        this.getStatistiquesGlobales()
      ]);
      
      // Remplacer le client dans la liste
      const updatedClients = currentClients.map(client => 
        client.client.id_client === clientId ? updatedClient : client
      );

      SecurityService.secureLog('log', '✅ [CLIENTS] Mise à jour hybride réussie', {
        id_client: clientId,
        stats_updated: !!newStats
      });

      return {
        clients: updatedClients,
        stats: newStats
      };

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur mise à jour hybride', error);
      throw error;
    }
  }

  /**
   * Créer ou modifier un client
   */
  async createOrUpdateClient(clientData: ClientFormData): Promise<AddEditClientResponse> {
    try {
      console.log('🚀 [CLIENTS SERVICE] Début createOrUpdateClient');
      console.log('📋 [CLIENTS SERVICE] Données reçues:', {
        nom_client: clientData.nom_client,
        tel_client: clientData.tel_client,
        adresse: clientData.adresse,
        id_client: clientData.id_client
      });

      const user = authService.getUser();
      if (!user) {
        console.error('❌ [CLIENTS SERVICE] Utilisateur non authentifié');
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      console.log('✅ [CLIENTS SERVICE] Utilisateur:', { id: user.id, structure: user.id_structure });

      // Validation des données
      if (!clientData.nom_client?.trim()) {
        throw new ClientsApiException('Le nom du client est requis', 400);
      }

      if (!clientData.tel_client?.trim()) {
        throw new ClientsApiException('Le téléphone du client est requis', 400);
      }

      const isEdit = !!clientData.id_client;
      
      SecurityService.secureLog('log', `💾 [CLIENTS] ${isEdit ? 'Modification' : 'Création'} client`, {
        id_client: clientData.id_client,
        nom_client: clientData.nom_client.substring(0, 20) + '...',
        action: isEdit ? 'EDIT' : 'CREATE'
      });

      // Échapper les quotes dans les paramètres pour éviter les injections SQL
      const nomClientEscape = clientData.nom_client.replace(/'/g, "''");
      const telClientEscape = clientData.tel_client.replace(/'/g, "''");
      const adresseEscape = clientData.adresse.replace(/'/g, "''");

      // Appel fonction PostgreSQL add_edit_client
      const query = `
        SELECT * FROM add_edit_client(
          ${user.id_structure},
          '${nomClientEscape}',
          '${telClientEscape}',
          '${adresseEscape}',
          ${clientData.id_client || 0}
        )
      `;

      console.log('🔍 [CLIENTS SERVICE] Requête SQL générée:', query);

      const results = await database.query(query);

      console.log('🔍 [CLIENTS SERVICE] Résultats bruts:', results);
      console.log('🔍 [CLIENTS SERVICE] Nombre de résultats:', Array.isArray(results) ? results.length : 'non-array');

      const result = Array.isArray(results) && results.length > 0 ? results[0] : null;

      console.log('🔍 [CLIENTS SERVICE] Premier résultat:', result);
      console.log('🔍 [CLIENTS SERVICE] Type de résultat:', typeof result);
      console.log('🔍 [CLIENTS SERVICE] Clés du résultat:', result ? Object.keys(result) : 'null');

      if (!result) {
        throw new ClientsApiException('Erreur lors de l\'enregistrement du client', 500);
      }

      // Vérifier que tous les champs requis sont présents
      if (!result.result_id_client || !result.result_nom_client) {
        console.error('❌ [CLIENTS SERVICE] Champs manquants dans la réponse:', {
          result_id_client: result.result_id_client,
          result_nom_client: result.result_nom_client,
          result_complet: result
        });
        throw new ClientsApiException('Réponse incomplète de la base de données', 500);
      }

      SecurityService.secureLog('log', '✅ [CLIENTS] Client enregistré avec succès', {
        id_client: result.result_id_client,
        nom_client: result.result_nom_client,
        action: result.result_action_effectuee,
        factures_mises_a_jour: result.result_factures_mises_a_jour
      });

      return result as AddEditClientResponse;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur enregistrement client', error);
      
      if (error instanceof ClientsApiException) {
        throw error;
      }
      
      throw new ClientsApiException(
        'Impossible d\'enregistrer le client',
        500,
        error
      );
    }
  }

  /**
   * Supprimer un client (si pas de factures associées)
   */
  async deleteClient(idClient: number): Promise<void> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', '🗑️ [CLIENTS] Tentative suppression client', {
        id_client: idClient,
        id_structure: user.id_structure
      });

      // Utilisation de la fonction PostgreSQL delete_client
      const query = `SELECT * FROM delete_client(${user.id_structure}, ${idClient})`;
      const results = await database.query(query);
      
      const result = Array.isArray(results) && results.length > 0 ? results[0] : null;
      
      if (!result || !result.success) {
        throw new ClientsApiException(
          result?.message || 'Impossible de supprimer le client',
          400
        );
      }

      SecurityService.secureLog('log', '✅ [CLIENTS] Client supprimé avec succès', {
        id_client: idClient
      });

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur suppression client', error);
      
      if (error instanceof ClientsApiException) {
        throw error;
      }
      
      throw new ClientsApiException(
        'Impossible de supprimer le client',
        500,
        error
      );
    }
  }

  /**
   * Marquer une facture comme payée
   */
  async marquerFacturePayee(idFacture: number, montantPaye: number): Promise<void> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', '💰 [CLIENTS] Marquage facture payée', {
        id_facture: idFacture,
        montant_paye: montantPaye
      });

      // Utilisation de la fonction PostgreSQL marquer_facture_payee
      const query = `
        SELECT * FROM marquer_facture_payee(
          ${user.id_structure}, 
          ${idFacture}, 
          ${montantPaye}
        )
      `;
      const results = await database.query(query);
      
      const result = Array.isArray(results) && results.length > 0 ? results[0] : null;
      
      if (!result || !result.success) {
        throw new ClientsApiException(
          result?.message || 'Impossible de marquer la facture comme payée',
          400
        );
      }

      SecurityService.secureLog('log', '✅ [CLIENTS] Facture marquée payée', {
        id_facture: idFacture,
        nouveau_statut: result.nouveau_statut
      });

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur marquage facture', error);
      
      if (error instanceof ClientsApiException) {
        throw error;
      }
      
      throw new ClientsApiException(
        'Impossible de marquer la facture comme payée',
        500,
        error
      );
    }
  }

  /**
   * Méthode utilitaire pour formater les montants
   */
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant) + ' FCFA';
  }

  /**
   * Méthode utilitaire pour formater les dates
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Non définie';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Recherche rapide d'un client par téléphone OU par nom (optimisée pour le panier)
   * Utilise la fonction PostgreSQL check_one_client qui retourne uniquement les infos essentielles
   * @param searchValue - Numéro de téléphone (9 chiffres) OU nom du client
   * @returns Informations du client (nom, tél, adresse) + stats simplifiées
   */
  async checkOneClient(searchValue: string): Promise<CheckOneClientResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      // Nettoyer la valeur de recherche
      const cleanedValue = searchValue.replace(/[\s-]/g, '').trim();

      // Détecter si c'est un téléphone (9 chiffres commençant par 7) ou un nom
      const isPhone = /^7\d{8}$/.test(cleanedValue);
      const searchType = isPhone ? 'TÉLÉPHONE' : 'NOM';

      console.log('🔍 [CLIENTS] ═══════════════════════════════════════');
      console.log('🔍 [CLIENTS] DÉBUT RECHERCHE CLIENT');
      console.log('🔍 [CLIENTS] Type de recherche:', searchType);
      console.log('🔍 [CLIENTS] Valeur brute reçue:', searchValue);
      console.log('🔍 [CLIENTS] Valeur nettoyée:', cleanedValue);
      console.log('🔍 [CLIENTS] ID Structure:', user.id_structure);

      SecurityService.secureLog('log', `🔍 [CLIENTS] Recherche rapide client par ${searchType}`, {
        searchValue: isPhone ? cleanedValue : cleanedValue.substring(0, 20) + '...',
        id_structure: user.id_structure,
        searchType
      });

      // Échapper les quotes SQL pour éviter les injections
      const escapedValue = cleanedValue.replace(/'/g, "''");

      // Appel à la fonction PostgreSQL check_one_client
      const query = `SELECT * FROM check_one_client(${user.id_structure}, '${escapedValue}')`;

      console.log('🔍 [CLIENTS] ───────────────────────────────────────');
      console.log('🔍 [CLIENTS] REQUÊTE SQL GÉNÉRÉE:');
      console.log('🔍 [CLIENTS]', query);
      console.log('🔍 [CLIENTS] ───────────────────────────────────────');

      const results = await database.query(query);

      console.log('🔍 [CLIENTS] ───────────────────────────────────────');
      console.log('🔍 [CLIENTS] RÉSULTATS BRUTS DE POSTGRESQL:');
      console.log('🔍 [CLIENTS] Type:', typeof results);
      console.log('🔍 [CLIENTS] Is Array:', Array.isArray(results));
      console.log('🔍 [CLIENTS] Length:', Array.isArray(results) ? results.length : 'N/A');
      console.log('🔍 [CLIENTS] Contenu:', JSON.stringify(results, null, 2));

      // Parser la réponse JSON
      const rawData = Array.isArray(results) && results.length > 0 ? results[0] : null;

      console.log('🔍 [CLIENTS] ───────────────────────────────────────');
      console.log('🔍 [CLIENTS] RAW DATA (premier élément):');
      console.log('🔍 [CLIENTS] Type:', typeof rawData);
      console.log('🔍 [CLIENTS] Clés:', rawData ? Object.keys(rawData) : 'null');
      console.log('🔍 [CLIENTS] Contenu:', JSON.stringify(rawData, null, 2));

      if (!rawData) {
        console.error('❌ [CLIENTS] Aucune donnée retournée par PostgreSQL');
        throw new ClientsApiException('Aucune donnée retournée par l\'API', 500);
      }

      // La fonction PostgreSQL retourne un objet avec propriété check_one_client
      let data: CheckOneClientResponse;

      try {
        console.log('🔍 [CLIENTS] ───────────────────────────────────────');
        console.log('🔍 [CLIENTS] PARSING DES DONNÉES:');

        if (rawData.check_one_client) {
          const clientData = rawData.check_one_client;
          console.log('🔍 [CLIENTS] Propriété "check_one_client" trouvée');
          console.log('🔍 [CLIENTS] Type de check_one_client:', typeof clientData);

          if (typeof clientData === 'string') {
            console.log('🔍 [CLIENTS] Parsing string JSON...');
            data = JSON.parse(clientData);
          } else {
            console.log('🔍 [CLIENTS] Utilisation objet direct');
            data = clientData;
          }
        } else if (typeof rawData === 'string') {
          console.log('🔍 [CLIENTS] rawData est une string, parsing JSON...');
          data = JSON.parse(rawData);
        } else {
          console.log('🔍 [CLIENTS] Utilisation rawData comme objet direct');
          data = rawData;
        }
      } catch (parseError) {
        console.error('❌ [CLIENTS] ═══════════════════════════════════════');
        console.error('❌ [CLIENTS] ERREUR DE PARSING:');
        console.error('❌ [CLIENTS] Erreur:', parseError);
        console.error('❌ [CLIENTS] rawData:', rawData);
        console.error('❌ [CLIENTS] check_one_client:', rawData.check_one_client);
        console.error('❌ [CLIENTS] ═══════════════════════════════════════');
        throw new ClientsApiException('Erreur de format des données client', 500);
      }

      console.log('🔍 [CLIENTS] ───────────────────────────────────────');
      console.log('🔍 [CLIENTS] DONNÉES PARSÉES FINALES:');
      console.log('🔍 [CLIENTS] success:', data.success);
      console.log('🔍 [CLIENTS] client_found:', data.client_found);
      console.log('🔍 [CLIENTS] client:', data.client);
      console.log('🔍 [CLIENTS] statistiques:', data.statistiques);
      console.log('🔍 [CLIENTS] error:', data.error);
      console.log('🔍 [CLIENTS] Contenu complet:', JSON.stringify(data, null, 2));

      // Si pas de propriété client_found, déduire de success + présence client
      if (data.client_found === undefined) {
        console.log('⚠️ [CLIENTS] client_found absent, déduction automatique...');
        if (data.success && data.client) {
          console.log('✅ [CLIENTS] → client_found = true (success + client présent)');
          data.client_found = true;
        } else {
          console.log('❌ [CLIENTS] → client_found = false (success ou client absent)');
          data.client_found = false;
        }
      }

      if (!data.success) {
        if (data.client_found === false || !data.client) {
          console.log('❌ [CLIENTS] ═══════════════════════════════════════');
          console.log('❌ [CLIENTS] CLIENT NON TROUVÉ');
          console.log('❌ [CLIENTS] Recherche:', searchType);
          console.log('❌ [CLIENTS] Valeur:', cleanedValue);
          console.log('❌ [CLIENTS] ═══════════════════════════════════════');

          SecurityService.secureLog('log', `❌ [CLIENTS] Client non trouvé (${searchType})`, {
            searchValue: cleanedValue.substring(0, 20),
            searchType
          });
        } else {
          console.error('❌ [CLIENTS] ═══════════════════════════════════════');
          console.error('❌ [CLIENTS] ERREUR LORS DE LA RECHERCHE');
          console.error('❌ [CLIENTS] Message:', data.error);
          console.error('❌ [CLIENTS] ═══════════════════════════════════════');
          throw new ClientsApiException(data.error || 'Erreur lors de la recherche du client', 500);
        }
      } else {
        console.log('✅ [CLIENTS] ═══════════════════════════════════════');
        console.log('✅ [CLIENTS] CLIENT TROUVÉ AVEC SUCCÈS');
        console.log('✅ [CLIENTS] Type de recherche:', searchType);
        console.log('✅ [CLIENTS] Nom:', data.client?.nom_client);
        console.log('✅ [CLIENTS] Téléphone:', data.client?.tel_client);
        console.log('✅ [CLIENTS] Adresse:', data.client?.adresse);
        console.log('✅ [CLIENTS] ═══════════════════════════════════════');

        SecurityService.secureLog('log', `✅ [CLIENTS] Client trouvé (${searchType})`, {
          nom: data.client?.nom_client,
          telephone: data.client?.tel_client,
          searchType
        });
      }

      console.log('🔍 [CLIENTS] FIN RECHERCHE CLIENT');
      console.log('🔍 [CLIENTS] ═══════════════════════════════════════');

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [CLIENTS] Erreur recherche rapide client', error);

      if (error instanceof ClientsApiException) {
        throw error;
      }

      throw new ClientsApiException(
        error instanceof Error ? error.message : 'Erreur lors de la recherche du client',
        500
      );
    }
  }

  /**
   * Méthode utilitaire pour obtenir la couleur d'un statut de facture
   */
  getStatutFactureColor(statut: FactureClient['statut_paiement']): {
    bg: string;
    text: string;
    border: string;
  } {
    switch (statut) {
      case 'PAYEE':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-200',
          border: 'border-green-400/30'
        };
      case 'IMPAYEE':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-200',
          border: 'border-red-400/30'
        };
      case 'PARTIELLE':
        return {
          bg: 'bg-orange-500/20',
          text: 'text-orange-200',
          border: 'border-orange-400/30'
        };
      default:
        return {
          bg: 'bg-gray-500/20',
          text: 'text-gray-200',
          border: 'border-gray-400/30'
        };
    }
  }
}

// Export de l'instance singleton
export const clientsService = ClientsService.getInstance();

// Export de la classe d'exception pour utilisation externe
export { ClientsApiException };