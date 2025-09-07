/**
 * Service de gestion de la liste des factures pour FayClick V2
 * Utilise la fonction PostgreSQL get_my_facture()
 */

import { authService } from './auth.service';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import { 
  GetMyFactureResponse,
  FiltresFactures,
  StatsFactures,
  FactureComplete 
} from '@/types/facture';

// Exception personnalisée pour la liste des factures
export class FactureListApiException extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: any) {
    super(message);
    this.name = 'FactureListApiException';
  }
}

class FactureListService {
  private static instance: FactureListService;

  static getInstance(): FactureListService {
    if (!this.instance) {
      this.instance = new FactureListService();
    }
    return this.instance;
  }

  /**
   * Récupérer toutes les factures de la structure
   */
  async getMyFactures(id_facture: number = 0): Promise<GetMyFactureResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new FactureListApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Récupération factures structure', {
        id_structure: user.id_structure,
        id_facture
      });

      // Appel de la fonction PostgreSQL get_my_facture
      const query = `SELECT * FROM get_my_facture(${user.id_structure}, ${id_facture})`;
      
      const result = await DatabaseService.query(query);
      
      if (!result || result.length === 0) {
        throw new FactureListApiException('Aucune donnée retournée par get_my_facture', 404);
      }

      // Récupération du JSON depuis la première ligne
      const factureData = result[0].get_my_facture;
      
      if (!factureData) {
        throw new FactureListApiException('Format de données invalide', 500);
      }

      // Parse du JSON si c'est une chaîne
      const parsedData = typeof factureData === 'string' 
        ? JSON.parse(factureData) 
        : factureData;

      SecurityService.secureLog('log', 'Factures récupérées avec succès', {
        nombre_factures: parsedData.resume_global?.nombre_factures || 0,
        montant_total: parsedData.resume_global?.montant_total || 0
      });

      return parsedData;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération factures', error);
      
      if (error instanceof FactureListApiException) {
        throw error;
      }
      
      throw new FactureListApiException(
        'Impossible de récupérer les factures',
        500,
        error
      );
    }
  }

  /**
   * Récupérer une facture spécifique par son ID
   */
  async getFactureById(id_facture: number): Promise<FactureComplete | null> {
    try {
      const response = await this.getMyFactures(id_facture);
      
      // Si on demande une facture spécifique, elle devrait être dans la liste
      if (response.factures && response.factures.length > 0) {
        return response.factures.find(f => f.facture.id_facture === id_facture) || null;
      }
      
      return null;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération facture par ID', { id_facture, error });
      throw error;
    }
  }

  /**
   * Filtrer les factures selon les critères
   */
  filterFactures(factures: FactureComplete[], filtres: FiltresFactures): FactureComplete[] {
    let facturesFiltrees = [...factures];

    // Filtre par terme de recherche (num_facture, nom_client, tel_client)
    if (filtres.searchTerm) {
      const terme = filtres.searchTerm.toLowerCase();
      facturesFiltrees = facturesFiltrees.filter(fc => 
        fc.facture.num_facture.toLowerCase().includes(terme) ||
        fc.facture.nom_client.toLowerCase().includes(terme) ||
        fc.facture.tel_client.includes(terme) ||
        fc.facture.description.toLowerCase().includes(terme)
      );
    }

    // Filtre par nom de client
    if (filtres.nom_client) {
      const client = filtres.nom_client.toLowerCase();
      facturesFiltrees = facturesFiltrees.filter(fc => 
        fc.facture.nom_client.toLowerCase().includes(client)
      );
    }

    // Filtre par téléphone
    if (filtres.tel_client) {
      facturesFiltrees = facturesFiltrees.filter(fc => 
        fc.facture.tel_client.includes(filtres.tel_client!)
      );
    }

    // Filtre par statut
    if (filtres.statut && filtres.statut !== 'TOUS') {
      facturesFiltrees = facturesFiltrees.filter(fc => 
        fc.facture.libelle_etat === filtres.statut
      );
    }

    // Filtre par période
    if (filtres.periode) {
      const debut = new Date(filtres.periode.debut);
      const fin = new Date(filtres.periode.fin);
      
      facturesFiltrees = facturesFiltrees.filter(fc => {
        const dateFacture = new Date(fc.facture.date_facture);
        return dateFacture >= debut && dateFacture <= fin;
      });
    }

    // Tri
    if (filtres.sortBy) {
      facturesFiltrees.sort((a, b) => {
        let valeurA: any, valeurB: any;
        
        switch (filtres.sortBy) {
          case 'date':
            valeurA = new Date(a.facture.date_facture);
            valeurB = new Date(b.facture.date_facture);
            break;
          case 'montant':
            valeurA = a.facture.montant;
            valeurB = b.facture.montant;
            break;
          case 'client':
            valeurA = a.facture.nom_client;
            valeurB = b.facture.nom_client;
            break;
          case 'statut':
            valeurA = a.facture.libelle_etat;
            valeurB = b.facture.libelle_etat;
            break;
          default:
            valeurA = a.facture.id_facture;
            valeurB = b.facture.id_facture;
        }

        if (valeurA < valeurB) return filtres.sortOrder === 'asc' ? -1 : 1;
        if (valeurA > valeurB) return filtres.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return facturesFiltrees;
  }

  /**
   * Calculer les statistiques des factures pour les 4 cards
   */
  calculateStats(response: GetMyFactureResponse): StatsFactures {
    const { factures, resume_global } = response;

    // Calculs depuis le résumé global
    const totalVentes = resume_global.nombre_factures;
    const montantTotal = resume_global.montant_total;
    const montantPaye = resume_global.montant_paye;
    const restantPayer = resume_global.montant_impaye;

    // Calculs détaillés depuis les factures
    const produitsUniques = new Set<number>();
    let quantiteTotale = 0;
    let margeTotale = 0;
    const clientsUniques = new Set<string>();

    factures.forEach(factureComplete => {
      // Clients uniques
      clientsUniques.add(factureComplete.facture.nom_client);
      
      // Produits et quantités
      factureComplete.details.forEach(detail => {
        produitsUniques.add(detail.id_produit);
        quantiteTotale += detail.quantite;
        margeTotale += detail.marge;
      });
    });

    return {
      totalVentes,
      montantTotal,
      montantPaye,
      restantPayer,
      totalProduitsDifferents: produitsUniques.size,
      quantiteTotale,
      clientsUniques: clientsUniques.size,
      margeTotale
    };
  }

  /**
   * Recherche rapide par numéro de facture
   */
  async searchByNumero(numeroFacture: string): Promise<FactureComplete | null> {
    try {
      const response = await this.getMyFactures();
      const facture = response.factures.find(f => 
        f.facture.num_facture.toLowerCase().includes(numeroFacture.toLowerCase())
      );
      
      return facture || null;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur recherche par numéro', { numeroFacture, error });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques rapides sans charger toutes les factures
   */
  async getQuickStats(): Promise<StatsFactures> {
    try {
      const response = await this.getMyFactures();
      return this.calculateStats(response);
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération stats rapides', error);
      throw error;
    }
  }

  /**
   * Valider les filtres avant application
   */
  validateFiltres(filtres: FiltresFactures): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation période
    if (filtres.periode) {
      const debut = new Date(filtres.periode.debut);
      const fin = new Date(filtres.periode.fin);
      
      if (debut > fin) {
        errors.push('La date de début ne peut pas être supérieure à la date de fin');
      }
      
      if (debut > new Date()) {
        errors.push('La date de début ne peut pas être dans le futur');
      }
    }

    // Validation téléphone
    if (filtres.tel_client && !/^[0-9+\-\s]+$/.test(filtres.tel_client)) {
      errors.push('Format de téléphone invalide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton
export const factureListService = FactureListService.getInstance();
export default factureListService;