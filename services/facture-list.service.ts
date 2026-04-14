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

// Types temporaires pour l'API (plus stricts que any mais compatibles avec Facture)
interface ApiFactureItem {
  facture?: Record<string, unknown>;
  details?: Record<string, unknown>[];
  resume?: Record<string, unknown>;
}

// Type compatible avec l'interface Facture tout en restant flexible
type ApiFactureData = Record<string, unknown>;

// Exception personnalisée pour la liste des factures
export class FactureListApiException extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: unknown) {
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
   * Récupérer les factures de la structure (mois en cours par défaut)
   * Utilise get_my_factures1 avec filtrage par année/mois pour optimiser les performances
   */
  async getMyFactures(id_facture: number = 0): Promise<GetMyFactureResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new FactureListApiException('Utilisateur non authentifié', 401);
      }

      // Paramètres pour get_my_factures1: année et mois en cours
      const currentDate = new Date();
      const annee = currentDate.getFullYear();
      const mois = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

      console.log('📋 [FACTURE-LIST] Récupération factures pour structure:', {
        id_structure: user.id_structure,
        annee,
        mois,
        id_facture
      });

      // Appel de la fonction PostgreSQL get_my_factures1 (optimisée avec année/mois)
      const query = `SELECT * FROM get_my_factures1(${user.id_structure}, ${annee}, ${mois}, ${id_facture})`;

      const result = await DatabaseService.query(query);

      console.log('📊 [FACTURE-LIST] Résultat brut de la requête:', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        length: Array.isArray(result) ? result.length : 0,
        firstElement: result?.[0] ? Object.keys(result[0]) : null,
        fullResult: result
      });

      if (!result || result.length === 0) {
        // Retourner une réponse vide structurée au lieu d'une erreur
        console.warn('⚠️ [FACTURE-LIST] Aucune donnée, retour structure vide');
        return {
          factures: [],
          resume_global: {
            nombre_factures: 0,
            montant_total: 0,
            montant_paye: 0,
            montant_impaye: 0,
            nombre_payees: 0,
            nombre_impayees: 0
          },
          total_factures: 0,
          montant_total: 0,
          montant_paye: 0,
          montant_impaye: 0
        };
      }

      // Récupération du JSON depuis la première ligne
      const firstRow = result[0];
      console.log('🔍 [FACTURE-LIST] Première ligne:', firstRow);

      // Structure réelle: result[0].get_my_factures1.factures
      let factureData = firstRow.get_my_factures1 || firstRow.get_my_factures || firstRow;

      console.log('📦 [FACTURE-LIST] Données facture extraites:', {
        type: typeof factureData,
        keys: typeof factureData === 'object' ? Object.keys(factureData) : 'not-object',
        hasFactures: factureData?.factures ? 'OUI' : 'NON',
        facturesCount: Array.isArray(factureData?.factures) ? factureData.factures.length : 0
      });

      // Parse du JSON si c'est une chaîne
      if (typeof factureData === 'string') {
        try {
          factureData = JSON.parse(factureData);
          console.log('✅ [FACTURE-LIST] JSON parsé avec succès');
        } catch (parseError) {
          console.error('❌ [FACTURE-LIST] Erreur parsing JSON:', parseError);
          throw new FactureListApiException('Impossible de parser les données des factures', 500);
        }
      }

      // Vérification de la structure et extraction des factures
      console.log('🎯 [FACTURE-LIST] Structure factureData:', {
        type: typeof factureData,
        keys: Object.keys(factureData || {}),
        factures: factureData?.factures ? 'EXISTE' : 'MANQUANT'
      });

      // Vérifier et formater la structure de réponse
      // Normaliser les factures au format attendu
      let facturesFormatees: FactureComplete[] = [];

      if (Array.isArray(factureData.factures)) {
        console.log('🔄 [FACTURE-LIST] Traitement tableau de factures, count:', factureData.factures.length);

        facturesFormatees = factureData.factures.map((f: unknown, index: number) => {
          // Type guard pour vérifier que f est un objet avec les bonnes propriétés
          const factureItem = f as ApiFactureItem;

          console.log(`📋 [FACTURE-LIST] Facture ${index}:`, {
            hasFacture: factureItem.facture ? 'OUI' : 'NON',
            hasDetails: factureItem.details ? 'OUI' : 'NON',
            hasResume: factureItem.resume ? 'OUI' : 'NON',
            numFacture: (factureItem.facture as { num_facture?: string })?.num_facture || 'MANQUANT',
            factureKeys: factureItem.facture ? Object.keys(factureItem.facture) : []
          });

          // La structure de l'API est { facture: {...}, details: [...], resume: {...}, recus_paiements: [...] }
          if (factureItem.facture) {
            // Extraire recus_paiements si disponible
            const recusPaiements = (factureItem as any).recus_paiements;

            return {
              facture: factureItem.facture as ApiFactureData,
              details: (factureItem.details as Record<string, unknown>[]) || [],
              resume: (factureItem.resume as Record<string, unknown>) || {
                nombre_articles: 0,
                quantite_totale: 0,
                cout_total_revient: 0,
                marge_totale: 0
              },
              recus_paiements: Array.isArray(recusPaiements) ? recusPaiements : undefined
            };
          }

          // Fallback si la structure est différente
          console.warn('⚠️ [FACTURE-LIST] Structure inattendue pour facture:', f);
          return {
            facture: f as ApiFactureData,
            details: [],
            resume: {
              nombre_articles: 0,
              quantite_totale: 0,
              cout_total_revient: 0,
              marge_totale: 0
            }
          };
        });
      } else if (Array.isArray(factureData)) {
        // Si factureData est directement un tableau de factures
        console.log('🔄 [FACTURE-LIST] Traitement direct tableau de factures');
        facturesFormatees = factureData.map((f: unknown) => ({
          facture: f as ApiFactureData,
          details: [],
          resume: {
            nombre_articles: 0,
            quantite_totale: 0,
            cout_total_revient: 0,
            marge_totale: 0
          }
        }));
      } else {
        console.error('❌ [FACTURE-LIST] Structure non reconnue:', factureData);
      }

      const response: GetMyFactureResponse = {
        factures: facturesFormatees,
        resume_global: factureData.resume_global || {
          nombre_factures: facturesFormatees.length,
          montant_total: 0,
          montant_paye: 0,
          montant_impaye: 0,
          nombre_payees: 0,
          nombre_impayees: 0
        },
        // Ajouter les champs au niveau racine pour compatibilité
        total_factures: factureData.resume_global?.nombre_factures || factureData.total_factures || facturesFormatees.length,
        montant_total: factureData.resume_global?.montant_total || factureData.montant_total || 0,
        montant_paye: factureData.resume_global?.montant_paye || factureData.montant_paye || 0,
        montant_impaye: factureData.resume_global?.montant_impaye || factureData.montant_impaye || 0
      };

      console.log('📈 [FACTURE-LIST] Réponse formatée FINALE:', {
        nombre_factures: response.factures.length,
        total_factures: response.total_factures,
        montant_total: response.montant_total,
        hasFactures: response.factures.length > 0,
        firstFacture: response.factures[0] ? {
          hasFactureProperty: response.factures[0].facture ? 'OUI' : 'NON',
          num: response.factures[0].facture?.num_facture,
          client: response.factures[0].facture?.nom_client,
          montant: response.factures[0].facture?.montant,
          statut: response.factures[0].facture?.libelle_etat
        } : 'PAS_DE_FACTURES',
        allFacturesValid: response.factures.every(f => f.facture && f.facture.num_facture)
      });

      return response;

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
   * Récupérer les factures avec filtres côté BD via get_my_factures_filtered
   * Supporte la pagination serveur (page + limit)
   */
  async getMyFacturesFiltered(filtres?: {
    dateDebut?: string;
    dateFin?: string;
    nomClient?: string;
    telClient?: string;
    statut?: string;
    page?: number;
    limit?: number;
  }): Promise<GetMyFactureResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new FactureListApiException('Utilisateur non authentifié', 401);
      }

      const pDateDebut = filtres?.dateDebut || '';
      const pDateFin = filtres?.dateFin || '';
      const pNomClient = filtres?.nomClient || '';
      const pTelClient = filtres?.telClient || '';
      const pStatut = filtres?.statut || '';
      const pPage = filtres?.page || 1;
      const pLimit = filtres?.limit || 20;

      console.log('📋 [FACTURE-LIST] getMyFacturesFiltered:', {
        id_structure: user.id_structure,
        pDateDebut, pDateFin, pNomClient, pTelClient, pStatut,
        page: pPage, limit: pLimit
      });

      const query = `SELECT * FROM get_my_factures_filtered(${user.id_structure}, '${pDateDebut}', '${pDateFin}', '${pNomClient}', '${pTelClient}', '${pStatut}', ${pPage}, ${pLimit})`;

      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        return {
          factures: [],
          resume_global: {
            nombre_factures: 0, montant_total: 0, montant_paye: 0,
            montant_impaye: 0, nombre_payees: 0, nombre_impayees: 0
          },
          pagination: { page_courante: pPage, taille_page: pLimit, total_factures: 0, total_pages: 0 },
          total_factures: 0, montant_total: 0, montant_paye: 0, montant_impaye: 0
        };
      }

      // Parse identique à getMyFactures
      const firstRow = result[0];
      let factureData = firstRow.get_my_factures_filtered || firstRow;

      if (typeof factureData === 'string') {
        try {
          factureData = JSON.parse(factureData);
        } catch (parseError) {
          throw new FactureListApiException('Impossible de parser les données des factures', 500);
        }
      }

      let facturesFormatees: FactureComplete[] = [];

      if (Array.isArray(factureData.factures)) {
        facturesFormatees = factureData.factures.map((f: unknown) => {
          const factureItem = f as ApiFactureItem;
          if (factureItem.facture) {
            const recusPaiements = (factureItem as any).recus_paiements;
            return {
              facture: factureItem.facture as ApiFactureData,
              details: (factureItem.details as Record<string, unknown>[]) || [],
              resume: (factureItem.resume as Record<string, unknown>) || {
                nombre_articles: 0, quantite_totale: 0, cout_total_revient: 0, marge_totale: 0
              },
              recus_paiements: Array.isArray(recusPaiements) ? recusPaiements : undefined
            };
          }
          return {
            facture: f as ApiFactureData,
            details: [],
            resume: { nombre_articles: 0, quantite_totale: 0, cout_total_revient: 0, marge_totale: 0 }
          };
        });
      } else if (Array.isArray(factureData)) {
        facturesFormatees = factureData.map((f: unknown) => ({
          facture: f as ApiFactureData,
          details: [],
          resume: { nombre_articles: 0, quantite_totale: 0, cout_total_revient: 0, marge_totale: 0 }
        }));
      }

      // Extraire pagination depuis la réponse PostgreSQL
      const pagination = factureData.pagination || {
        page_courante: pPage,
        taille_page: pLimit,
        total_factures: factureData.resume_global?.nombre_factures || facturesFormatees.length,
        total_pages: Math.ceil((factureData.resume_global?.nombre_factures || facturesFormatees.length) / pLimit)
      };

      return {
        factures: facturesFormatees,
        resume_global: factureData.resume_global || {
          nombre_factures: facturesFormatees.length, montant_total: 0,
          montant_paye: 0, montant_impaye: 0, nombre_payees: 0, nombre_impayees: 0
        },
        pagination,
        total_factures: factureData.resume_global?.nombre_factures || pagination.total_factures || facturesFormatees.length,
        montant_total: factureData.resume_global?.montant_total || 0,
        montant_paye: factureData.resume_global?.montant_paye || 0,
        montant_impaye: factureData.resume_global?.montant_impaye || 0
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération factures filtrées', error);
      if (error instanceof FactureListApiException) throw error;
      throw new FactureListApiException('Impossible de récupérer les factures filtrées', 500, error);
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
        let valeurA: string | number | Date, valeurB: string | number | Date;
        
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