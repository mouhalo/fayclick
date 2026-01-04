/**
 * Service d'extraction de données structurées via Claude IA
 * Prompts spécifiques par contexte (client/service/équipement)
 */

import SecurityService from './security.service';
import {
  VoiceInputContext,
  ExtractedClientData,
  ExtractedServiceData,
  ExtractedEquipementData,
  ExtractedEquipementsMultiplesData,
  ExtractedServicesMatchData,
  ServiceDisponible,
  VoiceExtractionResult
} from '@/types/voice-input';

// URL du proxy PHP pour contourner CORS
// En production: utilise le proxy PHP déployé sur le serveur
// En dev: utilise aussi le proxy (ou directement Anthropic si localhost autorisé)
const getProxyUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // En développement, on peut essayer direct ou via proxy local
      return '/api/voice-extract.php';
    }
    // En production
    return '/api/voice-extract.php';
  }
  return '/api/voice-extract.php';
};

// Note: Les prompts sont maintenant dans le proxy PHP pour réduire la taille des requêtes
// Prompts système par contexte (gardés ici pour référence)
const SYSTEM_PROMPTS: Record<VoiceInputContext, string> = {
  client: `Tu es un assistant qui extrait des informations client d'un texte dicté en français.
Extrais les informations suivantes si présentes:
- nom_client: nom complet du client (prénom et nom)
- tel_client: numéro de téléphone (format sénégalais: 9 chiffres commençant par 7, ex: 771234567)
- adresse_client: adresse complète

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"nom_client": "...", "tel_client": "...", "adresse_client": "...", "confidence": 0.0-1.0}

Si une information n'est pas claire ou absente, ne l'inclus pas dans la réponse (omets le champ).
Pour le téléphone: retire les espaces et le préfixe +221 s'il y en a.
Le champ confidence indique ta confiance globale dans l'extraction (0 à 1).

Exemples:
- "Le client s'appelle Amadou Diallo, son numéro c'est le 77 123 45 67, il habite à Dakar Médina"
  → {"nom_client": "Amadou Diallo", "tel_client": "771234567", "adresse_client": "Dakar Médina", "confidence": 0.95}
- "Monsieur Diop au 78 456 78 90"
  → {"nom_client": "Monsieur Diop", "tel_client": "784567890", "confidence": 0.8}`,

  service: `Tu es un assistant qui identifie un service mentionné dans un texte dicté en français.
Extrais le terme de recherche clé pour trouver ce service dans une liste.

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"search_term": "terme de recherche", "confidence": 0.0-1.0}

Le search_term doit être un mot-clé simple et court pour filtrer une liste de services.

Exemples:
- "je veux ajouter une réparation de climatisation" → {"search_term": "climatisation", "confidence": 0.9}
- "installation électrique dans la maison" → {"search_term": "électrique", "confidence": 0.95}
- "il faut faire la plomberie" → {"search_term": "plomberie", "confidence": 0.9}
- "pose de carrelage" → {"search_term": "carrelage", "confidence": 0.85}
- "service de peinture" → {"search_term": "peinture", "confidence": 0.9}`,

  equipement: `Tu es un assistant qui extrait des informations d'équipement d'un texte dicté en français.
Extrais les informations suivantes:
- designation: nom ou description de l'équipement/article
- marque: marque si mentionnée
- prix_unitaire: prix en FCFA si mentionné (nombre entier sans espaces)
- quantite: quantité si mentionnée (nombre entier, défaut 1)

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"designation": "...", "marque": "...", "prix_unitaire": 0, "quantite": 1, "confidence": 0.0-1.0}

Si une information n'est pas mentionnée, omets le champ (sauf confidence).
Les prix sont en FCFA (francs CFA).

Exemples:
- "un compresseur Samsung à 150000 francs"
  → {"designation": "compresseur", "marque": "Samsung", "prix_unitaire": 150000, "quantite": 1, "confidence": 0.9}
- "3 filtres à 5000 francs pièce"
  → {"designation": "filtres", "prix_unitaire": 5000, "quantite": 3, "confidence": 0.85}
- "câble électrique de 10 mètres"
  → {"designation": "câble électrique 10m", "quantite": 1, "confidence": 0.7}
- "2 robinets Grohe à 25000"
  → {"designation": "robinets", "marque": "Grohe", "prix_unitaire": 25000, "quantite": 2, "confidence": 0.9}`,

  equipements_multiples: `Tu es un assistant qui extrait une LISTE d'équipements d'un texte dicté en français.
Analyse le texte et détecte TOUS les équipements/articles mentionnés avec leurs quantités.

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"equipements": [{"quantite": 1, "designation": "..."}, ...], "confidence": 0.0-1.0}

Règles:
- Si aucune quantité mentionnée, utiliser 1 par défaut
- Détecter les pluriels pour déduire la quantité si non précisée (ex: "des robinets" → quantite: 1)
- Séparer les articles distincts même s'ils sont dans la même phrase
- Garder les descriptions complètes (ex: "câble 10 mètres" reste "câble 10 mètres")
- Les mots comme "un", "une", "deux", "trois" indiquent la quantité
- Ignorer les mots de liaison (et, avec, puis, aussi, également)

Exemples:
- "2 compresseurs, 5 filtres et un câble de 10 mètres"
  → {"equipements": [{"quantite": 2, "designation": "compresseurs"}, {"quantite": 5, "designation": "filtres"}, {"quantite": 1, "designation": "câble 10 mètres"}], "confidence": 0.9}
- "il me faut des robinets, 3 tuyaux PVC et 2 coudes"
  → {"equipements": [{"quantite": 1, "designation": "robinets"}, {"quantite": 3, "designation": "tuyaux PVC"}, {"quantite": 2, "designation": "coudes"}], "confidence": 0.85}
- "une télécommande, deux piles AA et un support mural"
  → {"equipements": [{"quantite": 1, "designation": "télécommande"}, {"quantite": 2, "designation": "piles AA"}, {"quantite": 1, "designation": "support mural"}], "confidence": 0.9}
- "10 mètres de câble électrique, 5 prises et 3 interrupteurs"
  → {"equipements": [{"quantite": 1, "designation": "câble électrique 10 mètres"}, {"quantite": 5, "designation": "prises"}, {"quantite": 3, "designation": "interrupteurs"}], "confidence": 0.85}`,

  // Note: services_match utilise un prompt dynamique avec la liste des services
  services_match: `Tu es un assistant qui identifie des services dans un texte dicté.`
};

// Prompt dynamique pour le matching de services
const getServicesMatchPrompt = (servicesJson: string) => `Tu es un assistant qui identifie des services dans un texte dicté en français.
Tu disposes d'une liste de services disponibles et tu dois trouver les correspondances.

LISTE DES SERVICES DISPONIBLES:
${servicesJson}

RÈGLES DE MATCHING:
1. Cherche des correspondances partielles (ex: "clim" → "Installation climatiseur")
2. Utilise des synonymes (ex: "frigo" → "Réparation réfrigérateur")
3. Ignore les mots de liaison (et, avec, puis, aussi)
4. Si plusieurs services sont mentionnés, retourne-les tous
5. Pour chaque service trouvé, utilise l'ID et le prix de la liste
6. La quantité est 1 par défaut sauf si précisée ("deux installations")
7. Si un service dicté ne correspond à AUCUN service de la liste, ignore-le

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"services": [{"id_service": 1, "nom_service": "...", "cout": 0, "quantite": 1}, ...], "confidence": 0.0-1.0}

Exemples avec liste: [{"id": 1, "nom": "Installation climatiseur", "prix": 50000}, {"id": 2, "nom": "Réparation électrique", "prix": 25000}, {"id": 3, "nom": "Plomberie", "prix": 15000}]

- "je veux installer un clim et faire la plomberie"
  → {"services": [{"id_service": 1, "nom_service": "Installation climatiseur", "cout": 50000, "quantite": 1}, {"id_service": 3, "nom_service": "Plomberie", "cout": 15000, "quantite": 1}], "confidence": 0.9}
- "réparation électricité"
  → {"services": [{"id_service": 2, "nom_service": "Réparation électrique", "cout": 25000, "quantite": 1}], "confidence": 0.85}
- "deux installations de climatisation"
  → {"services": [{"id_service": 1, "nom_service": "Installation climatiseur", "cout": 50000, "quantite": 2}], "confidence": 0.9}`;

export class VoiceExtractionService {
  private static instance: VoiceExtractionService;

  private constructor() {}

  public static getInstance(): VoiceExtractionService {
    if (!VoiceExtractionService.instance) {
      VoiceExtractionService.instance = new VoiceExtractionService();
    }
    return VoiceExtractionService.instance;
  }

  /**
   * Extrait les données structurées via Claude (via proxy PHP pour CORS)
   */
  async extract<T extends ExtractedClientData | ExtractedServiceData | ExtractedEquipementData>(
    transcription: string,
    context: VoiceInputContext,
    apiKey: string
  ): Promise<VoiceExtractionResult<T>> {
    SecurityService.secureLog('log', '[Extraction IA]', { context, textLength: transcription.length });

    try {
      // Utiliser le proxy PHP pour contourner CORS
      const proxyUrl = getProxyUrl();

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: apiKey,
          transcription: transcription,
          context: context
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error?.message || errorData.error || `Erreur proxy: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '{}';

      // Parser le JSON de la réponse
      // Nettoyer le contenu (enlever les éventuels backticks markdown)
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extracted = JSON.parse(cleanContent) as T;

      SecurityService.secureLog('log', '[Extraction IA] Succès', { extracted });

      return {
        success: true,
        data: extracted,
        rawTranscription: transcription
      };

    } catch (error) {
      SecurityService.secureLog('error', '[Extraction IA] Erreur', error);

      return {
        success: false,
        data: null,
        rawTranscription: transcription,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Extraction spécialisée pour les données client
   */
  async extractClient(
    transcription: string,
    apiKey: string
  ): Promise<VoiceExtractionResult<ExtractedClientData>> {
    return this.extract<ExtractedClientData>(transcription, 'client', apiKey);
  }

  /**
   * Extraction spécialisée pour la recherche de service
   */
  async extractService(
    transcription: string,
    apiKey: string
  ): Promise<VoiceExtractionResult<ExtractedServiceData>> {
    return this.extract<ExtractedServiceData>(transcription, 'service', apiKey);
  }

  /**
   * Extraction spécialisée pour les données équipement (un seul)
   */
  async extractEquipement(
    transcription: string,
    apiKey: string
  ): Promise<VoiceExtractionResult<ExtractedEquipementData>> {
    return this.extract<ExtractedEquipementData>(transcription, 'equipement', apiKey);
  }

  /**
   * Extraction spécialisée pour les équipements multiples (dictée libre)
   * Retourne un tableau d'équipements avec quantité et désignation
   */
  async extractEquipementsMultiples(
    transcription: string,
    apiKey: string
  ): Promise<VoiceExtractionResult<ExtractedEquipementsMultiplesData>> {
    return this.extract<ExtractedEquipementsMultiplesData>(transcription, 'equipements_multiples', apiKey);
  }

  /**
   * Matching de services avec liste disponible
   * Utilise un prompt dynamique incluant les services disponibles
   */
  async matchServices(
    transcription: string,
    servicesDisponibles: ServiceDisponible[],
    apiKey: string
  ): Promise<VoiceExtractionResult<ExtractedServicesMatchData>> {
    SecurityService.secureLog('log', '[Matching Services]', {
      textLength: transcription.length,
      nbServices: servicesDisponibles.length
    });

    try {
      // Construire le JSON des services disponibles
      const servicesJson = JSON.stringify(servicesDisponibles, null, 2);
      const systemPrompt = getServicesMatchPrompt(servicesJson);

      // Appel direct à l'API Anthropic via proxy avec prompt personnalisé
      const proxyUrl = getProxyUrl();

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: apiKey,
          transcription: transcription,
          context: 'services_match',
          customPrompt: systemPrompt  // Prompt personnalisé avec liste des services
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error?.message || errorData.error || `Erreur proxy: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '{}';

      // Parser le JSON de la réponse
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extracted = JSON.parse(cleanContent) as ExtractedServicesMatchData;

      SecurityService.secureLog('log', '[Matching Services] Succès', { extracted });

      return {
        success: true,
        data: extracted,
        rawTranscription: transcription
      };

    } catch (error) {
      SecurityService.secureLog('error', '[Matching Services] Erreur', error);

      return {
        success: false,
        data: null,
        rawTranscription: transcription,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

export const voiceExtractionService = VoiceExtractionService.getInstance();
