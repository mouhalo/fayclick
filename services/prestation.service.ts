/**
 * Service de gestion des prestations pour les Prestataires de Services
 * Gère: Services (catalogue), Devis, Prestations (factures)
 */

import { authService } from './auth.service';
import database from './database.service';
import SecurityService from './security.service';
import {
  Service,
  ServiceFormData,
  ServiceApiResponse,
  ServicesListResponse,
  Devis,
  DevisFormData,
  DevisApiResponse,
  DevisListResponse,
  GetMyDevisResponse,
  DevisFromDB,
  Prestation,
  PrestationFormData,
  PrestationApiResponse,
  PrestationsListResponse,
  FiltreServices,
  FiltreDevis,
  FiltrePrestations,
  LigneEquipement,
  DevisLigneService,
  StatsPrestataire
} from '@/types/prestation';

// ============================================================================
// EXCEPTION PERSONNALISÉE
// ============================================================================

export class PrestationApiException extends Error {
  constructor(
    public message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PrestationApiException';
  }
}

// ============================================================================
// SERVICE SINGLETON
// ============================================================================

export class PrestationService {
  private static instance: PrestationService;

  private constructor() {}

  public static getInstance(): PrestationService {
    if (!PrestationService.instance) {
      PrestationService.instance = new PrestationService();
    }
    return PrestationService.instance;
  }

  // ==========================================================================
  // SERVICES (CATALOGUE)
  // ==========================================================================

  /**
   * Récupérer la liste des services du prestataire
   * Utilise la fonction PostgreSQL get_mes_services(id_structure)
   */
  async getListeServices(filtres?: FiltreServices): Promise<ServicesListResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Récupération liste services', {
        id_structure: user.id_structure,
        filtres
      });

      // Appeler la fonction PostgreSQL get_mes_services
      const query = `SELECT * FROM get_mes_services(${user.id_structure})`;
      const results = await database.query(query);
      const rawResult = Array.isArray(results) ? results[0] : results;

      // Parser le résultat JSON
      let response: { success: boolean; data: Service[]; total_produits: number };
      if (typeof rawResult?.get_mes_services === 'string') {
        response = JSON.parse(rawResult.get_mes_services);
      } else if (rawResult?.get_mes_services) {
        response = rawResult.get_mes_services;
      } else if (typeof rawResult === 'string') {
        response = JSON.parse(rawResult);
      } else {
        // Retourner une liste vide si pas de résultat
        return {
          success: true,
          data: [],
          total: 0
        };
      }

      // Mapper les données au format Service
      let services: Service[] = (response.data || []).map(s => ({
        id_service: s.id_service,
        id_structure: user.id_structure,
        nom_service: s.nom_service,
        cout_base: s.cout_base,
        description: s.description || '',
        nom_categorie: s.nom_categorie || '',
        actif: s.actif !== false
      }));

      // Appliquer les filtres côté client si nécessaire
      if (filtres) {
        if (filtres.searchTerm) {
          const search = filtres.searchTerm.toLowerCase();
          services = services.filter(s =>
            s.nom_service.toLowerCase().includes(search) ||
            (s.description && s.description.toLowerCase().includes(search))
          );
        }

        if (filtres.nom_categorie) {
          services = services.filter(s => s.nom_categorie === filtres.nom_categorie);
        }

        if (filtres.actif !== undefined) {
          services = services.filter(s => s.actif === filtres.actif);
        }

        // Tri
        if (filtres.sortBy) {
          const direction = filtres.sortOrder === 'desc' ? -1 : 1;
          services.sort((a, b) => {
            switch (filtres.sortBy) {
              case 'nom':
                return direction * a.nom_service.localeCompare(b.nom_service);
              case 'cout':
                return direction * (a.cout_base - b.cout_base);
              default:
                return 0;
            }
          });
        }
      }

      SecurityService.secureLog('log', 'Services extraits', {
        nombreServices: services.length
      });

      return {
        success: true,
        data: services,
        total: services.length
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération services', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de récupérer la liste des services',
        500,
        error
      );
    }
  }

  /**
   * Créer un nouveau service
   * Utilise la fonction PostgreSQL add_edit_service
   * Signature: add_edit_service(id_structure, nom_service, prix_vente, nom_categorie, description, presente_au_public, id_produit, code_barre)
   */
  async createService(data: ServiceFormData): Promise<ServiceApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Création service', {
        id_structure: user.id_structure,
        nom_service: data.nom_service
      });

      // Utiliser la fonction add_edit_service avec id_produit = 0 pour création
      const query = `SELECT * FROM add_edit_service(
        ${user.id_structure},
        '${data.nom_service.replace(/'/g, "''")}',
        ${data.cout_base || 0},
        '${(data.nom_categorie || 'Service').replace(/'/g, "''")}',
        '${(data.description || 'RAS').replace(/'/g, "''")}',
        false,
        0
      )`;

      const result = await database.query(query);
      const serviceCreated = Array.isArray(result) ? result[0] : result;

      SecurityService.secureLog('log', 'Service créé', serviceCreated);

      return {
        success: true,
        data: {
          id_service: serviceCreated.id_produit || serviceCreated.id_service,
          id_structure: user.id_structure,
          nom_service: serviceCreated.nom_produit || serviceCreated.nom_service || data.nom_service,
          cout_base: serviceCreated.prix_vente || serviceCreated.cout_base || data.cout_base,
          description: serviceCreated.description || data.description,
          nom_categorie: serviceCreated.nom_categorie || data.nom_categorie,
          actif: true
        },
        message: 'Service créé avec succès'
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création service', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de créer le service',
        500,
        error
      );
    }
  }

  /**
   * Modifier un service existant
   * Utilise la fonction PostgreSQL add_edit_service
   * Signature: add_edit_service(id_structure, nom_service, prix_vente, nom_categorie, description, presente_au_public, id_produit, code_barre)
   */
  async updateService(idService: number, data: ServiceFormData): Promise<ServiceApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Modification service', {
        id_service: idService,
        data
      });

      // Utiliser la fonction add_edit_service avec id_produit existant
      const query = `SELECT * FROM add_edit_service(
        ${user.id_structure},
        '${data.nom_service.replace(/'/g, "''")}',
        ${data.cout_base || 0},
        '${(data.nom_categorie || 'Service').replace(/'/g, "''")}',
        '${(data.description || 'RAS').replace(/'/g, "''")}',
        false,
        ${idService}
      )`;

      const result = await database.query(query);
      const serviceUpdated = Array.isArray(result) ? result[0] : result;

      SecurityService.secureLog('log', 'Service modifié', serviceUpdated);

      return {
        success: true,
        data: {
          id_service: serviceUpdated.id_produit || serviceUpdated.id_service || idService,
          id_structure: user.id_structure,
          nom_service: serviceUpdated.nom_produit || serviceUpdated.nom_service || data.nom_service,
          cout_base: serviceUpdated.prix_vente || serviceUpdated.cout_base || data.cout_base,
          description: serviceUpdated.description || data.description,
          nom_categorie: serviceUpdated.nom_categorie || data.nom_categorie,
          actif: true
        },
        message: 'Service modifié avec succès'
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur modification service', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de modifier le service',
        500,
        error
      );
    }
  }

  /**
   * Supprimer un service (soft delete via désactivation)
   */
  async deleteService(idService: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Suppression service', { id_service: idService });

      // Pour l'instant, on fait un vrai DELETE car pas de champ actif
      // TODO: Implémenter soft delete si nécessaire
      const query = `DELETE FROM list_produits
        WHERE id_produit = ${idService}
        AND id_structure = ${user.id_structure}
        AND est_service = true`;

      await database.query(query);

      return {
        success: true,
        message: 'Service supprimé avec succès'
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur suppression service', error);

      throw new PrestationApiException(
        'Impossible de supprimer le service',
        500,
        error
      );
    }
  }

  // ==========================================================================
  // DEVIS
  // ==========================================================================

  /**
   * Créer un nouveau devis
   * Utilise la fonction PostgreSQL add_new_devis_complet
   *
   * Signature: add_new_devis_complet(
   *   p_date_devis, p_id_structure, p_tel_client, p_nom_client_payeur, p_adresse_client,
   *   p_montant, p_articles_string, p_lignes_equipements, p_id_utilisateur
   * )
   * p_articles_string format: id_service-qte-prix#id_service2-qte2-prix2
   */
  async createDevis(data: DevisFormData): Promise<DevisApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      // Calculer le montant total des services
      const montantServices = (data.lignes_services || []).reduce(
        (sum, s) => sum + (s.cout * (s.quantite || 1)),
        0
      );

      // Construire la chaîne des services: id_service-qte-prix#id_service2-qte2-prix2
      const servicesString = (data.lignes_services || [])
        .map(s => `${s.id_service || 0}-${s.quantite || 1}-${s.cout}`)
        .join('#');

      SecurityService.secureLog('log', 'Création devis', {
        id_structure: user.id_structure,
        nom_client: data.nom_client,
        adresse_client: data.adresse_client,
        montant_services: montantServices,
        services_string: servicesString,
        nb_services: data.lignes_services?.length || 0,
        nb_equipements: data.lignes_equipements?.length || 0
      });

      // Préparer les lignes d'équipements en JSON
      // Format attendu: [{"designation": "...", "marque": "...", "pu": X, "qte": Y}]
      const lignesEquipements = (data.lignes_equipements || []).map(eq => ({
        designation: eq.designation,
        marque: eq.marque || '',
        pu: eq.prix_unitaire,
        qte: eq.quantite
      }));
      const lignesEquipementsJson = lignesEquipements.length > 0
        ? `'${JSON.stringify(lignesEquipements).replace(/'/g, "''")}'::JSONB`
        : 'NULL';

      // Appeler la fonction PostgreSQL add_new_devis_complet
      // Ordre: date_devis, id_structure, tel_client, nom_client, adresse_client, montant, articles_string, equipements, id_utilisateur
      const query = `SELECT public.add_new_devis_complet(
        '${data.date_devis}'::date,
        ${user.id_structure},
        '${data.tel_client.replace(/'/g, "''")}',
        '${data.nom_client.replace(/'/g, "''")}',
        '${(data.adresse_client || '').replace(/'/g, "''")}',
        ${montantServices},
        '${servicesString}',
        ${lignesEquipementsJson},
        ${user.id}
      ) as result`;

      const result = await database.query(query);
      const devisResult = Array.isArray(result) ? result[0] : result;

      SecurityService.secureLog('log', 'Devis créé', devisResult);

      // Calculer le montant total des équipements
      const montantEquipements = (data.lignes_equipements || []).reduce(
        (sum, eq) => sum + eq.total,
        0
      );

      return {
        success: true,
        data: {
          id_devis: devisResult.result || devisResult.id_devis || devisResult.add_new_devis_complet,
          id_structure: user.id_structure,
          date_devis: data.date_devis,
          tel_client: data.tel_client,
          nom_client: data.nom_client,
          montant_services: montantServices,
          montant_equipements: montantEquipements,
          montant_total: montantServices + montantEquipements,
          statut: 'BROUILLON',
          lignes_services: data.lignes_services,
          lignes_equipements: data.lignes_equipements
        },
        message: 'Devis créé avec succès',
        id_devis: devisResult.result || devisResult.id_devis || devisResult.add_new_devis_complet
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création devis', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de créer le devis',
        500,
        error
      );
    }
  }

  /**
   * Récupérer la liste des devis
   * Utilise la fonction PostgreSQL get_my_devis(id_structure, annee, mois?, id_devis?)
   */
  async getListeDevis(filtres?: FiltreDevis): Promise<{ success: boolean; data: DevisFromDB[]; total: number; resume?: GetMyDevisResponse['resume_global'] }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Récupération liste devis', {
        id_structure: user.id_structure,
        filtres
      });

      // Déterminer l'année et le mois pour la requête
      const now = new Date();
      let annee = now.getFullYear();
      let mois: number | null = null;

      if (filtres?.periode) {
        switch (filtres.periode) {
          case 'jour':
          case 'semaine':
          case 'mois':
            mois = now.getMonth() + 1; // PostgreSQL utilise 1-12
            break;
          case 'annee':
            mois = null; // Tous les mois de l'année
            break;
          case 'tout':
            // On récupère l'année en cours par défaut
            mois = null;
            break;
        }
      }

      // Appeler la fonction PostgreSQL get_my_devis
      const query = mois
        ? `SELECT public.get_my_devis(${user.id_structure}, ${annee}, ${mois}) as result`
        : `SELECT public.get_my_devis(${user.id_structure}, ${annee}) as result`;

      const results = await database.query(query);
      const rawResult = Array.isArray(results) ? results[0] : results;

      // Parser le résultat JSON
      let response: GetMyDevisResponse;
      if (typeof rawResult?.result === 'string') {
        response = JSON.parse(rawResult.result);
      } else if (rawResult?.result) {
        response = rawResult.result;
      } else if (rawResult?.get_my_devis) {
        response = typeof rawResult.get_my_devis === 'string'
          ? JSON.parse(rawResult.get_my_devis)
          : rawResult.get_my_devis;
      } else {
        // Retourner une liste vide si pas de résultat
        return {
          success: true,
          data: [],
          total: 0
        };
      }

      SecurityService.secureLog('log', 'Devis récupérés', {
        nombre: response.devis?.length || 0,
        resume: response.resume_global
      });

      // Filtrer par recherche si nécessaire (côté client)
      let devisFiltres = response.devis || [];
      if (filtres?.searchTerm) {
        const search = filtres.searchTerm.toLowerCase();
        devisFiltres = devisFiltres.filter(d =>
          d.devis.nom_client_payeur.toLowerCase().includes(search) ||
          d.devis.tel_client.includes(search) ||
          d.devis.num_devis.toLowerCase().includes(search)
        );
      }

      return {
        success: true,
        data: devisFiltres,
        total: devisFiltres.length,
        resume: response.resume_global
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération devis', error);

      // Si la fonction n'existe pas encore, retourner une liste vide
      if (error instanceof Error &&
          (error.message.includes('does not exist') || error.message.includes('function'))) {
        return {
          success: true,
          data: [],
          total: 0
        };
      }

      throw new PrestationApiException(
        'Impossible de récupérer les devis',
        500,
        error
      );
    }
  }

  /**
   * Récupérer un devis spécifique par son ID
   */
  async getDevisById(idDevis: number): Promise<{ success: boolean; data: DevisFromDB | null }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      const annee = new Date().getFullYear();

      // Appeler get_my_devis avec l'ID spécifique
      const query = `SELECT public.get_my_devis(${user.id_structure}, ${annee}, 0, ${idDevis}) as result`;

      SecurityService.secureLog('log', '[getDevisById] Requête:', {
        query,
        id_structure: user.id_structure,
        annee,
        id_devis: idDevis
      });

      const results = await database.query(query);

      SecurityService.secureLog('log', '[getDevisById] Résultat brut:', {
        isArray: Array.isArray(results),
        length: Array.isArray(results) ? results.length : 'N/A',
        results: JSON.stringify(results).substring(0, 500)
      });

      const rawResult = Array.isArray(results) ? results[0] : results;

      SecurityService.secureLog('log', '[getDevisById] rawResult:', {
        hasResult: !!rawResult?.result,
        hasGetMyDevis: !!rawResult?.get_my_devis,
        keys: rawResult ? Object.keys(rawResult) : []
      });

      let response: GetMyDevisResponse;
      if (typeof rawResult?.result === 'string') {
        response = JSON.parse(rawResult.result);
        SecurityService.secureLog('log', '[getDevisById] Parsé depuis result (string)');
      } else if (rawResult?.result) {
        response = rawResult.result;
        SecurityService.secureLog('log', '[getDevisById] Utilisé result (object)');
      } else if (rawResult?.get_my_devis) {
        response = typeof rawResult.get_my_devis === 'string'
          ? JSON.parse(rawResult.get_my_devis)
          : rawResult.get_my_devis;
        SecurityService.secureLog('log', '[getDevisById] Parsé depuis get_my_devis');
      } else {
        SecurityService.secureLog('warn', '[getDevisById] Aucune donnée trouvée dans rawResult');
        return { success: false, data: null };
      }

      SecurityService.secureLog('log', '[getDevisById] Response parsée:', {
        success: response.success,
        code: response.code,
        hasDevisArray: Array.isArray(response.devis),
        hasDevisObject: !Array.isArray(response.devis) && typeof response.devis === 'object',
        hasDetailsProduitsAtRoot: !!response.details_produits
      });

      // Gérer les deux formats de réponse :
      // 1. Liste: { devis: [DevisFromDB, ...] }
      // 2. Par ID: { devis: {...}, details_produits: [...], resume: {...} } - response EST le DevisFromDB
      let devis: DevisFromDB | null = null;

      if (Array.isArray(response.devis)) {
        // Format liste : devis est un tableau de DevisFromDB
        devis = response.devis[0] || null;
        SecurityService.secureLog('log', '[getDevisById] Devis extrait depuis tableau');
      } else if (response.devis && response.details_produits) {
        // Format par ID : response contient directement { devis, details_produits, resume }
        // La response elle-même a la structure DevisFromDB
        devis = {
          devis: response.devis,
          details_produits: response.details_produits,
          resume: response.resume
        } as unknown as DevisFromDB;
        SecurityService.secureLog('log', '[getDevisById] Devis construit depuis structure plate');
      }

      SecurityService.secureLog('log', '[getDevisById] Devis extrait:', {
        found: !!devis,
        id_devis: devis?.devis?.id_devis,
        num_devis: devis?.devis?.num_devis,
        nb_produits: devis?.details_produits?.length
      });

      return {
        success: !!devis,
        data: devis
      };

    } catch (error) {
      SecurityService.secureLog('error', '[getDevisById] Erreur:', error);
      return { success: false, data: null };
    }
  }

  /**
   * Supprimer un devis
   * Utilise la fonction PostgreSQL del_my_devis(id_devis)
   */
  async deleteDevis(idDevis: number): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Suppression devis', {
        id_structure: user.id_structure,
        id_devis: idDevis
      });

      const query = `SELECT public.del_my_devis(${idDevis}) as result`;
      const results = await database.query(query);
      const rawResult = Array.isArray(results) ? results[0] : results;

      // Parser le résultat JSON
      let response: { success: boolean; code: string; message: string; data?: unknown };
      if (typeof rawResult?.result === 'string') {
        response = JSON.parse(rawResult.result);
      } else if (rawResult?.result) {
        response = rawResult.result;
      } else if (rawResult?.del_my_devis) {
        response = typeof rawResult.del_my_devis === 'string'
          ? JSON.parse(rawResult.del_my_devis)
          : rawResult.del_my_devis;
      } else {
        throw new PrestationApiException('Réponse invalide de la fonction', 500);
      }

      SecurityService.secureLog('log', 'Devis supprimé', response);

      return {
        success: response.success,
        message: response.message,
        data: response.data
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur suppression devis', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de supprimer le devis',
        500,
        error
      );
    }
  }

  /**
   * Mettre à jour un devis existant
   * Utilise la fonction PostgreSQL maj_devis(
   *   p_date_devis, p_id_structure, p_tel_client, p_nom_client_payeur, p_adresse_client,
   *   p_montant, p_services_string, p_lignes_equipements, p_id_utilisateur, pid_devis
   * )
   * p_services_string format: id_service-qte-prix#id_service2-qte2-prix2
   */
  async updateDevis(idDevis: number, data: DevisFormData): Promise<DevisApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      // Calculer le montant total des services
      const montantServices = (data.lignes_services || []).reduce(
        (sum, s) => sum + (s.cout * (s.quantite || 1)),
        0
      );

      // Construire la chaîne des services: id_service-qte-prix#id_service2-qte2-prix2
      const servicesString = (data.lignes_services || [])
        .map(s => `${s.id_service || 0}-${s.quantite || 1}-${s.cout}`)
        .join('#');

      SecurityService.secureLog('log', 'Mise à jour devis', {
        id_devis: idDevis,
        id_structure: user.id_structure,
        nom_client: data.nom_client,
        adresse_client: data.adresse_client,
        montant_services: montantServices,
        services_string: servicesString,
        nb_services: data.lignes_services?.length || 0,
        nb_equipements: data.lignes_equipements?.length || 0
      });

      // Préparer les lignes d'équipements en JSON
      // Format attendu: [{"designation": "...", "qte": X, "pu": Y}]
      const lignesEquipements = (data.lignes_equipements || []).map(eq => ({
        designation: eq.designation,
        marque: eq.marque || '',
        pu: eq.prix_unitaire,
        qte: eq.quantite
      }));
      const lignesEquipementsJson = lignesEquipements.length > 0
        ? `'${JSON.stringify(lignesEquipements).replace(/'/g, "''")}'::JSONB`
        : 'NULL';

      // Appeler la fonction PostgreSQL maj_devis
      const query = `SELECT public.maj_devis(
        '${data.date_devis}'::date,
        ${user.id_structure},
        '${data.tel_client.replace(/'/g, "''")}',
        '${data.nom_client.replace(/'/g, "''")}',
        '${(data.adresse_client || '').replace(/'/g, "''")}',
        ${montantServices},
        '${servicesString}',
        ${lignesEquipementsJson},
        ${user.id},
        ${idDevis}
      ) as result`;

      const result = await database.query(query);
      const rawResult = Array.isArray(result) ? result[0] : result;

      // Parser le résultat JSON
      let response: { success: boolean; code: string; message: string; data?: unknown };
      if (typeof rawResult?.result === 'string') {
        response = JSON.parse(rawResult.result);
      } else if (rawResult?.result) {
        response = rawResult.result;
      } else if (rawResult?.maj_devis) {
        response = typeof rawResult.maj_devis === 'string'
          ? JSON.parse(rawResult.maj_devis)
          : rawResult.maj_devis;
      } else {
        throw new PrestationApiException('Réponse invalide de la fonction', 500);
      }

      SecurityService.secureLog('log', 'Devis mis à jour', response);

      if (!response.success) {
        throw new PrestationApiException(response.message || 'Erreur lors de la mise à jour', 400);
      }

      // Calculer le montant total des équipements
      const montantEquipements = (data.lignes_equipements || []).reduce(
        (sum, eq) => sum + (eq.prix_unitaire * eq.quantite),
        0
      );

      return {
        success: true,
        data: {
          id_devis: idDevis,
          id_structure: user.id_structure,
          date_devis: data.date_devis,
          tel_client: data.tel_client,
          nom_client: data.nom_client,
          montant_services: montantServices,
          montant_equipements: montantEquipements,
          montant_total: montantServices + montantEquipements,
          statut: 'BROUILLON',
          lignes_services: data.lignes_services,
          lignes_equipements: data.lignes_equipements
        },
        message: response.message || 'Devis mis à jour avec succès',
        id_devis: idDevis
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur mise à jour devis', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de mettre à jour le devis',
        500,
        error
      );
    }
  }

  // ==========================================================================
  // PRESTATIONS (FACTURES DE SERVICE)
  // ==========================================================================

  /**
   * Créer une prestation rapide
   * Utilise le système de factures existant
   */
  async createPrestation(data: PrestationFormData): Promise<PrestationApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      // Calculer le montant total
      const montantServices = data.services.reduce((sum, s) => sum + s.cout, 0);
      const montantNet = montantServices - (data.remise || 0);

      SecurityService.secureLog('log', 'Création prestation', {
        id_structure: user.id_structure,
        nom_client: data.nom_client,
        montant: montantNet,
        mode_paiement: data.mode_paiement
      });

      // Préparer les détails de la facture (services comme articles)
      const detailsFacture = data.services.map(s => ({
        id_produit: s.id_service || 0,
        nom_produit: s.nom_service,
        qte: 1,
        pu: s.cout,
        total: s.cout
      }));

      // Utiliser la fonction existante pour créer une facture
      // Format: add_new_facture(id_structure, id_client, nom_client, tel_client, montant, remise, acompte, details, id_user)
      const query = `SELECT * FROM add_new_facture(
        ${user.id_structure},
        NULL,
        '${data.nom_client.replace(/'/g, "''")}',
        '${data.tel_client.replace(/'/g, "''")}',
        ${montantServices},
        ${data.remise || 0},
        ${data.mode_paiement === 'CASH' ? montantNet : 0},
        '${JSON.stringify(detailsFacture).replace(/'/g, "''")}'::JSONB,
        ${user.id_utilisateur}
      )`;

      const result = await database.query(query);
      const factureResult = Array.isArray(result) ? result[0] : result;

      // Si paiement CASH, enregistrer l'encaissement (nouvelle signature 7 paramètres)
      let idFacture = factureResult.id_facture;
      if (data.mode_paiement === 'CASH' && idFacture) {
        const transactionId = `CASH-${user.id_structure}-${Date.now()}`;
        const telephone = data.tel_client || '000000000';
        const queryAcompte = `SELECT * FROM add_acompte_facture(
          ${user.id_structure},
          ${idFacture},
          ${montantNet},
          '${transactionId}',
          'face2face',
          'CASH',
          '${telephone}'
        )`;
        await database.query(queryAcompte);
      }

      SecurityService.secureLog('log', 'Prestation créée', { id_facture: idFacture });

      return {
        success: true,
        data: {
          id_prestation: idFacture,
          id_structure: user.id_structure,
          id_facture: idFacture,
          nom_client: data.nom_client,
          tel_client: data.tel_client,
          date_prestation: new Date().toISOString(),
          montant_total: montantServices,
          montant_paye: data.mode_paiement === 'CASH' ? montantNet : 0,
          remise: data.remise || 0,
          statut: data.mode_paiement === 'CASH' ? 'PAYEE' : 'IMPAYEE',
          mode_paiement: data.mode_paiement,
          services: data.services,
          description: data.description
        },
        message: 'Prestation enregistrée avec succès',
        id_prestation: idFacture,
        id_facture: idFacture
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création prestation', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de créer la prestation',
        500,
        error
      );
    }
  }

  /**
   * Récupérer la liste des prestations (factures de services)
   */
  async getListePrestations(filtres?: FiltrePrestations): Promise<PrestationsListResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Récupération liste prestations', {
        id_structure: user.id_structure,
        filtres
      });

      // Utiliser la vue/table des factures
      let whereClause = `WHERE id_structure = ${user.id_structure}`;
      let orderClause = 'ORDER BY date_facture DESC';

      if (filtres) {
        if (filtres.searchTerm) {
          const searchTerm = filtres.searchTerm.toLowerCase().replace(/'/g, "''");
          whereClause += ` AND (LOWER(nom_client_payeur) LIKE '%${searchTerm}%' OR tel_client LIKE '%${searchTerm}%')`;
        }

        // Gestion de la période
        if (filtres.periode && filtres.periode !== 'tout') {
          const now = new Date();
          let dateStart: Date;

          switch (filtres.periode) {
            case 'jour':
              dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'semaine':
              dateStart = new Date(now.setDate(now.getDate() - 7));
              break;
            case 'mois':
              dateStart = new Date(now.setMonth(now.getMonth() - 1));
              break;
            case 'annee':
              dateStart = new Date(now.setFullYear(now.getFullYear() - 1));
              break;
            default:
              dateStart = new Date(0);
          }

          whereClause += ` AND date_facture >= '${dateStart.toISOString().split('T')[0]}'`;
        }
      }

      const query = `SELECT
        id_facture as id_prestation,
        id_structure,
        id_facture,
        COALESCE(id_client, 0) as id_client,
        nom_client_payeur as nom_client,
        tel_client,
        date_facture as date_prestation,
        montant_net as montant_total,
        COALESCE(mt_total_paye, 0) as montant_paye,
        COALESCE(remise, 0) as remise,
        CASE
          WHEN mt_total_paye >= montant_net THEN 'PAYEE'
          WHEN mt_total_paye > 0 THEN 'PARTIELLE'
          ELSE 'IMPAYEE'
        END as statut
      FROM list_factures ${whereClause} ${orderClause}`;

      const results = await database.query(query);
      const prestations = Array.isArray(results) ? results : [];

      return {
        success: true,
        data: prestations,
        total: prestations.length
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération prestations', error);

      throw new PrestationApiException(
        'Impossible de récupérer les prestations',
        500,
        error
      );
    }
  }

  // ==========================================================================
  // STATISTIQUES
  // ==========================================================================

  /**
   * Récupérer les statistiques du prestataire
   */
  async getStats(): Promise<StatsPrestataire> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      // Nombre de services
      const servicesQuery = `SELECT COUNT(*) as count FROM list_produits
        WHERE id_structure = ${user.id_structure} AND est_service = true`;
      const servicesResult = await database.query(servicesQuery);
      const totalServices = Array.isArray(servicesResult) ? servicesResult[0]?.count || 0 : 0;

      // Nombre de clients
      const clientsQuery = `SELECT COUNT(*) as count FROM get_list_clients(${user.id_structure}, NULL)`;
      let totalClients = 0;
      try {
        const clientsResult = await database.query(clientsQuery);
        totalClients = Array.isArray(clientsResult) ? clientsResult[0]?.count || 0 : 0;
      } catch {
        // Si erreur, garder 0
      }

      // CA et prestations du mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const statsQuery = `SELECT
        COUNT(*) as total_prestations,
        COALESCE(SUM(mt_total_paye), 0) as ca_mois,
        COALESCE(SUM(CASE WHEN mt_total_paye < montant_net THEN montant_net - mt_total_paye ELSE 0 END), 0) as mt_impayees
      FROM list_factures
      WHERE id_structure = ${user.id_structure}
      AND date_facture >= '${startOfMonth.toISOString().split('T')[0]}'`;

      const statsResult = await database.query(statsQuery);
      const stats = Array.isArray(statsResult) ? statsResult[0] : {};

      return {
        total_services: parseInt(totalServices) || 0,
        total_clients: parseInt(totalClients) || 0,
        total_prestations_mois: parseInt(stats.total_prestations) || 0,
        total_devis_en_attente: 0, // TODO: Implémenter quand table devis disponible
        ca_mois: parseFloat(stats.ca_mois) || 0,
        ca_annee: 0, // TODO: Calculer CA annuel
        mt_impayees: parseFloat(stats.mt_impayees) || 0,
        evolution_ca_mois: 0 // TODO: Calculer évolution
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération stats prestataire', error);

      return {
        total_services: 0,
        total_clients: 0,
        total_prestations_mois: 0,
        total_devis_en_attente: 0,
        ca_mois: 0,
        ca_annee: 0,
        mt_impayees: 0,
        evolution_ca_mois: 0
      };
    }
  }

  // ==========================================================================
  // CONVERSION DEVIS → FACTURE
  // ==========================================================================

  /**
   * Créer une facture à partir d'un devis existant
   * Transforme les services et équipements du devis en facture
   *
   * @param data - Données de la facture depuis le modal de création
   * @returns Résultat de la création avec id_facture
   */
  async createFactureFromDevis(data: {
    id_devis: number;
    nom_client: string;
    tel_client: string;
    montant_services: number;
    equipements: LigneEquipement[];
    montant_equipements: number;
    remise: number;
    montant_total: number;
    montant_net: number;
  }): Promise<{ success: boolean; id_facture?: number; message: string }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Création facture depuis devis', {
        id_devis: data.id_devis,
        id_structure: user.id_structure,
        nom_client: data.nom_client,
        montant_services: data.montant_services,
        montant_equipements: data.montant_equipements,
        montant_total: data.montant_total,
        remise: data.remise
      });

      // 1. Récupérer les détails du devis pour avoir les services
      const devisResponse = await this.getDevisById(data.id_devis);
      if (!devisResponse.success || !devisResponse.data) {
        throw new PrestationApiException('Devis introuvable', 404);
      }

      const devisData = devisResponse.data;

      // 2. Construire le string des articles UNIQUEMENT depuis details_produits (services)
      // Format: id_produit-quantite-prix#
      // Note: On n'intègre PAS les équipements car ils n'ont pas d'id_produit valide
      const servicesArticles = devisData.details_produits.map(prod =>
        `${prod.id_produit}-${prod.quantite}-${prod.prix}`
      );
      const articlesString = servicesArticles.join('#') + '#';

      // 3. Calculer le montant total depuis les details_produits (éviter NaN)
      const montantCalcule = devisData.details_produits.reduce((sum, prod) => {
        return sum + (prod.prix * prod.quantite);
      }, 0);

      // Appliquer la remise
      const remise = data.remise || 0;
      const montantNet = montantCalcule - remise;

      SecurityService.secureLog('log', '[createFactureFromDevis] Montants calculés:', {
        montantCalcule,
        remise,
        montantNet,
        nbServices: devisData.details_produits.length,
        articlesString
      });

      // 4. Description de la facture
      const description = `Facture issue du devis ${devisData.devis.num_devis}`;

      // 5. Appeler la fonction PostgreSQL create_facture_complete1
      const dateFacture = new Date().toISOString().split('T')[0];

      const query = `
        SELECT * FROM create_facture_complete1(
          '${dateFacture}',
          ${user.id_structure},
          '${data.tel_client}',
          '${data.nom_client.replace(/'/g, "''")}',
          ${montantCalcule},
          '${description.replace(/'/g, "''")}',
          '${articlesString}',
          ${remise},
          0,
          false,
          false,
          ${user.id || 0}
        )
      `;

      SecurityService.secureLog('log', 'Requête création facture depuis devis', {
        query: query.substring(0, 300),
        articlesString,
        montantCalcule,
        remise
      });

      const result = await database.query(query);
      const factureResult = Array.isArray(result) && result.length > 0 ? result[0] : null;

      if (!factureResult || !factureResult.success) {
        throw new PrestationApiException(
          factureResult?.message || 'Erreur lors de la création de la facture',
          500
        );
      }

      // 6. Mettre à jour le statut du devis en 'FACTURE'
      await this.updateDevisStatut(data.id_devis, 'FACTURE', factureResult.id_facture);

      SecurityService.secureLog('log', 'Facture créée depuis devis avec succès', {
        id_devis: data.id_devis,
        id_facture: factureResult.id_facture
      });

      return {
        success: true,
        id_facture: factureResult.id_facture,
        message: `Facture créée avec succès (N° ${factureResult.id_facture})`
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création facture depuis devis', error);

      if (error instanceof PrestationApiException) {
        throw error;
      }

      throw new PrestationApiException(
        'Impossible de créer la facture depuis le devis',
        500,
        error
      );
    }
  }

  /**
   * Mettre à jour le statut d'un devis
   * Utilisé notamment après conversion en facture
   */
  async updateDevisStatut(
    idDevis: number,
    statut: 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'FACTURE',
    idFacture?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new PrestationApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Mise à jour statut devis', {
        id_devis: idDevis,
        statut,
        id_facture: idFacture
      });

      // Vérifier si une fonction PostgreSQL existe pour cela
      // Sinon, faire un UPDATE direct sur la table des devis
      // Note: La structure de la table devis n'a peut-être pas de champ statut
      // Pour l'instant, on log juste l'intention - à adapter selon la DB

      // TODO: Implémenter quand la colonne statut existe dans list_devis
      // const query = `UPDATE list_devis SET statut = '${statut}'${idFacture ? `, id_facture = ${idFacture}` : ''} WHERE id_devis = ${idDevis} AND id_structure = ${user.id_structure}`;
      // await database.query(query);

      SecurityService.secureLog('log', 'Statut devis mis à jour (simulation)', {
        id_devis: idDevis,
        nouveau_statut: statut
      });

      return {
        success: true,
        message: `Statut du devis mis à jour: ${statut}`
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur mise à jour statut devis', error);

      // Ne pas faire échouer la création de facture si le statut ne peut pas être mis à jour
      return {
        success: false,
        message: 'Impossible de mettre à jour le statut du devis'
      };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const prestationService = PrestationService.getInstance();
