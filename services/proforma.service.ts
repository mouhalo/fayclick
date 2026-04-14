/**
 * Service de gestion des factures proformes pour FayClick V2
 * CRUD complet + conversion proforma → facture
 * Uniquement pour les comptes prives (compte_prive = true)
 */

import { authService } from './auth.service';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import { ArticlePanier } from '@/types/produit';
import {
  Proforma,
  ProformaComplete,
  ProformaListResponse,
  CreateProformaResponse,
  ConvertProformaResponse,
  ProformaActionResponse,
} from '@/types/proforma';

export class ProformaApiException extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: unknown) {
    super(message);
    this.name = 'ProformaApiException';
  }
}

class ProformaService {
  private static instance: ProformaService;
  private listCache: { data: ProformaListResponse | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 min

  static getInstance(): ProformaService {
    if (!this.instance) {
      this.instance = new ProformaService();
    }
    return this.instance;
  }

  /**
   * Invalider le cache liste
   */
  private invalidateCache(): void {
    this.listCache = { data: null, timestamp: 0 };
  }

  /**
   * Creer une nouvelle proforma
   */
  async createProforma(
    articles: ArticlePanier[],
    clientInfo: { tel_client: string; nom_client_payeur: string; description?: string },
    montants: { remise?: number }
  ): Promise<CreateProformaResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new ProformaApiException('Utilisateur non authentifie', 401);

      if (!articles || articles.length === 0) {
        throw new ProformaApiException('Aucun article selectionne', 400);
      }

      if (!clientInfo.tel_client || !clientInfo.nom_client_payeur || clientInfo.nom_client_payeur === 'CLIENT_ANONYME') {
        throw new ProformaApiException('Client obligatoire pour une proforma', 400);
      }

      // Calcul du montant total
      const sousTotal = articles.reduce((total, article) => {
        return total + ((article.prix_applique ?? article.prix_vente) * article.quantity);
      }, 0);

      const remise = montants.remise || 0;
      if (remise > sousTotal) {
        throw new ProformaApiException('La remise ne peut pas etre superieure au sous-total', 400);
      }

      // Format articles string: "id-qty-prix#id-qty-prix#"
      const articlesString = articles
        .map(article => `${article.id_produit}-${article.quantity}-${article.prix_applique ?? article.prix_vente}`)
        .join('#') + '#';

      const escapedNom = clientInfo.nom_client_payeur.replace(/'/g, "''");
      const escapedDesc = (clientInfo.description || `Proforma ${articles.length} article(s)`).replace(/'/g, "''");
      const escapedTel = clientInfo.tel_client.replace(/'/g, "''");

      // La fonction PostgreSQL reconstitue montant = p_montant + p_remise
      // Il faut donc passer montant_net (sousTotal - remise), pas sousTotal brut
      const montantNet = sousTotal - remise;

      const query = `SELECT * FROM create_proforma(
        ${user.id_structure},
        '${new Date().toISOString().split('T')[0]}',
        '${escapedTel}',
        '${escapedNom}',
        '${escapedDesc}',
        ${montantNet},
        '${articlesString}',
        ${remise},
        ${user.id ?? 0}
      )`;

      SecurityService.secureLog('log', 'Creation proforma', {
        id_structure: user.id_structure,
        montant: sousTotal,
        nb_articles: articles.length
      });

      const result = await DatabaseService.query(query);
      if (!result || result.length === 0) {
        throw new ProformaApiException('Aucune reponse de create_proforma', 500);
      }

      const raw = (result[0] as Record<string, unknown>).create_proforma;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new ProformaApiException(parsed.message || 'Erreur creation proforma', 500);
      }

      this.invalidateCache();

      SecurityService.secureLog('log', 'Proforma creee', {
        id_proforma: parsed.id_proforma,
        num_proforma: parsed.num_proforma
      });

      return parsed;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur creation proforma', error);
      if (error instanceof ProformaApiException) throw error;
      throw new ProformaApiException('Impossible de creer la proforma', 500, error);
    }
  }

  /**
   * Recuperer la liste des proformas de la structure
   */
  async getListProformas(forceRefresh: boolean = false): Promise<ProformaListResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new ProformaApiException('Utilisateur non authentifie', 401);

      // Cache check
      if (!forceRefresh && this.listCache.data && (Date.now() - this.listCache.timestamp < this.CACHE_DURATION)) {
        return this.listCache.data;
      }

      const query = `SELECT * FROM get_list_proformas(${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        return { success: true, proformas: [], resume: { total_proformas: 0, montant_total: 0, nb_brouillons: 0, nb_acceptees: 0, nb_converties: 0 } };
      }

      const raw = (result[0] as Record<string, unknown>).get_list_proformas;
      const parsed: ProformaListResponse = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // Cache update
      this.listCache = { data: parsed, timestamp: Date.now() };

      return parsed;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur liste proformas', error);
      if (error instanceof ProformaApiException) throw error;
      throw new ProformaApiException('Impossible de recuperer les proformas', 500, error);
    }
  }

  /**
   * Recuperer les details d'une proforma
   */
  async getProformaDetails(idProforma: number): Promise<ProformaComplete> {
    try {
      const user = authService.getUser();
      if (!user) throw new ProformaApiException('Utilisateur non authentifie', 401);

      const query = `SELECT * FROM get_proforma_details(${idProforma}, ${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        throw new ProformaApiException('Proforma introuvable', 404);
      }

      const raw = (result[0] as Record<string, unknown>).get_proforma_details;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new ProformaApiException(parsed.message || 'Proforma introuvable', 404);
      }

      return parsed;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur details proforma', error);
      if (error instanceof ProformaApiException) throw error;
      throw new ProformaApiException('Impossible de recuperer les details', 500, error);
    }
  }

  /**
   * Modifier une proforma existante
   */
  async editProforma(
    idProforma: number,
    articles?: ArticlePanier[],
    clientInfo?: { tel_client?: string; nom_client_payeur?: string; description?: string },
    montants?: { remise?: number; montant?: number },
    nouveauStatut?: number
  ): Promise<ProformaActionResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new ProformaApiException('Utilisateur non authentifie', 401);

      // Construire les parametres SQL avec NULL pour les champs non modifies
      const telClient = clientInfo?.tel_client ? `'${clientInfo.tel_client.replace(/'/g, "''")}'` : 'NULL';
      const nomClient = clientInfo?.nom_client_payeur ? `'${clientInfo.nom_client_payeur.replace(/'/g, "''")}'` : 'NULL';
      const description = clientInfo?.description !== undefined ? `'${clientInfo.description.replace(/'/g, "''")}'` : 'NULL';
      // La fonction PostgreSQL reconstitue montant = p_montant + p_remise
      // Il faut donc passer montant_net (montant - remise), pas le montant brut
      const remiseVal = montants?.remise ?? 0;
      const montant = montants?.montant !== undefined ? `${montants.montant - remiseVal}` : 'NULL';
      const remise = montants?.remise !== undefined ? `${montants.remise}` : 'NULL';
      const idEtat = nouveauStatut !== undefined ? `${nouveauStatut}` : 'NULL';

      let articlesStr = 'NULL';
      if (articles && articles.length > 0) {
        const str = articles
          .map(a => `${a.id_produit}-${a.quantity}-${a.prix_applique ?? a.prix_vente}`)
          .join('#') + '#';
        articlesStr = `'${str}'`;
      }

      const query = `SELECT * FROM edit_proforma(
        ${idProforma},
        ${user.id_structure},
        ${telClient},
        ${nomClient},
        ${description},
        ${montant},
        ${articlesStr},
        ${remise},
        ${idEtat}
      )`;

      const result = await DatabaseService.query(query);
      if (!result || result.length === 0) {
        throw new ProformaApiException('Aucune reponse de edit_proforma', 500);
      }

      const raw = (result[0] as Record<string, unknown>).edit_proforma;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new ProformaApiException(parsed.message || 'Erreur modification', 400);
      }

      this.invalidateCache();
      return parsed;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur edition proforma', error);
      if (error instanceof ProformaApiException) throw error;
      throw new ProformaApiException('Impossible de modifier la proforma', 500, error);
    }
  }

  /**
   * Supprimer une proforma
   */
  async deleteProforma(idProforma: number): Promise<ProformaActionResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new ProformaApiException('Utilisateur non authentifie', 401);

      const query = `SELECT * FROM delete_proforma(${idProforma}, ${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        throw new ProformaApiException('Aucune reponse de delete_proforma', 500);
      }

      const raw = (result[0] as Record<string, unknown>).delete_proforma;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new ProformaApiException(parsed.message || 'Erreur suppression', 400);
      }

      this.invalidateCache();
      return parsed;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur suppression proforma', error);
      if (error instanceof ProformaApiException) throw error;
      throw new ProformaApiException('Impossible de supprimer la proforma', 500, error);
    }
  }

  /**
   * Convertir une proforma en facture reelle (mouvemente le stock)
   */
  async convertToFacture(idProforma: number): Promise<ConvertProformaResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new ProformaApiException('Utilisateur non authentifie', 401);

      SecurityService.secureLog('log', 'Conversion proforma en facture', {
        id_proforma: idProforma,
        id_structure: user.id_structure
      });

      const query = `SELECT * FROM convert_proforma_to_facture(
        ${idProforma},
        ${user.id_structure},
        ${user.id ?? 0}
      )`;

      const result = await DatabaseService.query(query);
      if (!result || result.length === 0) {
        throw new ProformaApiException('Aucune reponse de convert_proforma_to_facture', 500);
      }

      const raw = (result[0] as Record<string, unknown>).convert_proforma_to_facture;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed.success) {
        throw new ProformaApiException(parsed.message || 'Erreur conversion', 400);
      }

      this.invalidateCache();

      SecurityService.secureLog('log', 'Proforma convertie en facture', {
        id_proforma: idProforma,
        id_facture: parsed.id_facture,
        num_facture: parsed.num_facture
      });

      return parsed;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur conversion proforma', error);
      if (error instanceof ProformaApiException) throw error;
      throw new ProformaApiException('Impossible de convertir la proforma', 500, error);
    }
  }

  /**
   * Changer le statut d'une proforma (BROUILLON <-> ACCEPTEE)
   */
  async updateStatut(idProforma: number, nouveauStatut: 1 | 2): Promise<ProformaActionResponse> {
    return this.editProforma(idProforma, undefined, undefined, undefined, nouveauStatut);
  }
}

// Export singleton
export const proformaService = ProformaService.getInstance();
export default proformaService;
