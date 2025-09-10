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
  AddEditClientResponse,
  ClientFormData,
  StatistiquesGlobales,
  FactureClient,
  HistoriqueProduitClient,
  StatsHistoriqueProduits,
  ClientsApiException,
  calculateAnciennete
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
      const query = `SELECT * FROM get_list_clients(${user.id_structure})`;
      
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
      
      // Vérification que les clients existent
      if (!data.clients || !Array.isArray(data.clients)) {
        console.error('❌ [CLIENTS] Tableau clients invalide:', data.clients);
        throw new ClientsApiException('Format de données clients invalide', 500);
      }
      
      console.log(`✅ [CLIENTS] ${data.clients.length} clients parsés avec succès`);
      
      SecurityService.secureLog('log', '✅ [CLIENTS] Clients récupérés avec succès', {
        nombre_clients: data.clients?.length || 0,
        structure_id: data.structure_id,
        timestamp_generation: data.timestamp_generation
      });

      // Mettre les données en cache
      this.cache.set(cacheKey, {
        data: data as ClientsApiResponse,
        timestamp: Date.now()
      });
      
      return data as ClientsApiResponse;

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
   * Récupérer les détails complets d'un client (pour modal multi-onglets)
   * ⚠️ FONCTION OBSOLÈTE - Remplacée par l'utilisation directe des données de getListeClients()
   * Les données complètes (factures, historique) sont déjà disponibles via get_list_clients
   * Cette fonction est conservée mais non utilisée pour compatibilité.
   */
  /*
  async getClientDetailComplet(idClient: number): Promise<ClientDetailComplet> {
    console.warn('⚠️ [CLIENTS] getClientDetailComplet() est obsolète - utiliser les données de getListeClients() directement');
    throw new ClientsApiException('Fonction obsolète - utiliser les données existantes du client', 501);
  }
  */

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
      const query = `SELECT * FROM get_list_clients(${user.id_structure})`;
      
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
      const query = `SELECT * FROM get_list_clients(${user.id_structure})`;
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
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

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

      const results = await database.query(query);
      const result = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!result) {
        throw new ClientsApiException('Erreur lors de l\'enregistrement du client', 500);
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