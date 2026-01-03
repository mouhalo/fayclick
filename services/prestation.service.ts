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

      const results = await database.query(query);
      const rawResult = Array.isArray(results) ? results[0] : results;

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
        return { success: false, data: null };
      }

      const devis = response.devis?.[0] || null;

      return {
        success: !!devis,
        data: devis
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération devis par ID', error);
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

      // Si paiement CASH, enregistrer l'encaissement
      let idFacture = factureResult.id_facture;
      if (data.mode_paiement === 'CASH' && idFacture) {
        const transactionId = `CASH-${user.id_structure}-${Date.now()}`;
        const queryAcompte = `SELECT * FROM add_acompte_facture(
          ${user.id_structure},
          ${idFacture},
          ${montantNet},
          '${transactionId}',
          'face2face'
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
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const prestationService = PrestationService.getInstance();
