/**
 * EmbeddingStore Service
 * Stockage des embeddings CLIP dans IndexedDB avec sync PostgreSQL
 * FayClick V2 - Reconnaissance Visuelle Commerce
 */

import databaseService from '@/services/database.service';

export interface ProductEmbedding {
  id: string;               // ID local unique
  idProduit: number;        // ID produit PostgreSQL
  idStructure: number;      // ID structure
  embedding: number[];      // Vecteur 512D
  imageHash: string;        // Hash SHA-256 de l'image
  thumbnailDataUrl?: string;// Miniature base64
  createdAt: Date;
  source: 'clip_api' | 'clip_local' | 'manual' | 'sync';
  confidence: number;       // Score de confiance 0-1
  syncedAt?: Date;          // Date de sync avec serveur
}

const DB_NAME = 'fayclick-visual-recognition';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

/**
 * Service de stockage des embeddings
 * Utilise IndexedDB pour le stockage local + sync PostgreSQL
 */
export class EmbeddingStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private idStructure: number;

  constructor(idStructure: number) {
    this.idStructure = idStructure;
  }

  /**
   * Initialise la connexion IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[EmbeddingStore] Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer le store s'il n'existe pas
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Index pour recherche rapide
          store.createIndex('idProduit', 'idProduit', { unique: false });
          store.createIndex('idStructure', 'idStructure', { unique: false });
          store.createIndex('imageHash', 'imageHash', { unique: false });
          store.createIndex('produit_hash', ['idProduit', 'imageHash'], { unique: true });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Sauvegarde un embedding localement et sur le serveur
   */
  async save(
    idProduit: number,
    embedding: number[],
    imageHash: string,
    options?: {
      thumbnailDataUrl?: string;
      confidence?: number;
      syncToServer?: boolean;
    }
  ): Promise<ProductEmbedding> {
    await this.init();

    const record: ProductEmbedding = {
      id: crypto.randomUUID(),
      idProduit,
      idStructure: this.idStructure,
      embedding,
      imageHash,
      thumbnailDataUrl: options?.thumbnailDataUrl,
      createdAt: new Date(),
      source: 'clip_api',
      confidence: options?.confidence ?? 1.0,
    };

    // Sauvegarder localement
    await this.saveLocal(record);

    // Sync avec serveur si demandé (défaut: true)
    if (options?.syncToServer !== false) {
      try {
        await this.syncToServer(record);
        record.syncedAt = new Date();
        await this.updateLocal(record.id, { syncedAt: record.syncedAt });
      } catch (error) {
        console.warn('[EmbeddingStore] Sync serveur échoué, disponible en local:', error);
      }
    }

    return record;
  }

  /**
   * Sauvegarde uniquement en local (IndexedDB)
   */
  private saveLocal(record: ProductEmbedding): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB non initialisé'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Supprimer l'ancien embedding du même produit si existe
      const index = store.index('produit_hash');
      const deleteRequest = index.openCursor(IDBKeyRange.only([record.idProduit, record.imageHash]));

      deleteRequest.onsuccess = () => {
        const cursor = deleteRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Ajouter le nouveau
      const addRequest = store.add(record);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  /**
   * Met à jour un enregistrement local
   */
  private updateLocal(id: string, updates: Partial<ProductEmbedding>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB non initialisé'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          const updated = { ...record, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Convertit un embedding en format TEXT PostgreSQL compatible XML
   * Remplacements pour éviter les caractères spéciaux XML :
   * - 'd' au lieu de '[' (début)
   * - 'f' au lieu de ']' (fin)
   * - 'm' au lieu de '-' (moins)
   * - Précision limitée à 5 décimales (limite API 10K chars)
   * PostgreSQL fera le remplacement inverse
   * Exemple: [0.40549105, -0.32347154] => 'd0.40549,m0.32347f'
   */
  private formatEmbeddingForPostgres(embedding: number[]): string {
    const formatted = embedding.map(val => {
      // Limiter à 5 décimales pour respecter la limite de 10K caractères
      const rounded = Math.abs(val).toFixed(5);
      if (val < 0) {
        // Remplacer le signe moins par 'm'
        return 'm' + rounded;
      }
      return rounded;
    }).join(',');
    // Utiliser 'd' et 'f' au lieu de '[' et ']' pour compatibilité XML
    return `d${formatted}f`;
  }

  /**
   * Synchronise un embedding vers le serveur PostgreSQL
   */
  private async syncToServer(record: ProductEmbedding): Promise<void> {
    // Formater l'embedding avec 'm' pour les nombres négatifs
    const embeddingText = this.formatEmbeddingForPostgres(record.embedding);

    const query = `
      SELECT * FROM save_product_embedding(
        ${record.idProduit},
        ${record.idStructure},
        '${embeddingText}',
        '${record.imageHash}',
        NULL,
        '224x224',
        ${record.confidence}
      )
    `;

    console.log('[EmbeddingStore] Sync vers serveur, embedding dimension:', record.embedding.length);

    const result = await databaseService.query(query);

    if (!result?.success) {
      throw new Error(result?.message || 'Erreur de synchronisation');
    }

    console.log('[EmbeddingStore] Embedding sauvegardé avec succès pour produit:', record.idProduit);
  }

  /**
   * Récupère tous les embeddings de la structure
   */
  async getAll(): Promise<ProductEmbedding[]> {
    await this.init();

    console.log(`[EmbeddingStore] getAll() pour structure: ${this.idStructure}`);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB non initialisé'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('idStructure');

      const request = index.getAll(this.idStructure);
      request.onsuccess = () => {
        console.log(`[EmbeddingStore] getAll() retourne: ${request.result?.length || 0} embeddings`);
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère l'embedding d'un produit spécifique
   */
  async getByProductId(idProduit: number): Promise<ProductEmbedding | undefined> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB non initialisé'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('idProduit');

      const request = index.get(idProduit);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Vérifie si un produit a déjà un embedding
   */
  async hasEmbedding(idProduit: number): Promise<boolean> {
    const existing = await this.getByProductId(idProduit);
    return !!existing;
  }

  /**
   * Supprime l'embedding d'un produit
   */
  async delete(idProduit: number, syncToServer = true): Promise<void> {
    await this.init();

    // Supprimer localement
    await new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB non initialisé'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('idProduit');

      const request = index.openCursor(IDBKeyRange.only(idProduit));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Sync suppression serveur
    if (syncToServer) {
      try {
        await databaseService.query(`
          SELECT * FROM delete_product_embedding(${idProduit}, ${this.idStructure})
        `);
      } catch (error) {
        console.warn('[EmbeddingStore] Erreur sync suppression:', error);
      }
    }
  }

  /**
   * Compte le nombre d'embeddings
   */
  async count(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  }

  /**
   * Synchronise les embeddings depuis le serveur
   * Utile après installation ou changement d'appareil
   */
  async syncFromServer(): Promise<number> {
    console.log(`[EmbeddingStore] syncFromServer() pour structure: ${this.idStructure}`);

    const query = `SELECT * FROM get_product_embeddings(${this.idStructure}, 1000)`;
    const result = await databaseService.query(query);

    // La réponse est: [{"get_product_embeddings": {"success": true, "data": {"embeddings": [...]}}}]
    const funcResult = Array.isArray(result) ? result[0]?.get_product_embeddings : result;

    console.log('[EmbeddingStore] syncFromServer résultat:', {
      isArray: Array.isArray(result),
      funcResult: funcResult ? 'présent' : 'null',
      success: funcResult?.success,
      embeddingsCount: funcResult?.data?.embeddings?.length
    });

    if (!funcResult?.success || !funcResult?.data?.embeddings) {
      throw new Error('Erreur de récupération des embeddings');
    }

    const serverEmbeddings = funcResult.data.embeddings as Array<{
      id: number;
      id_produit: number;
      embedding: number[];
      image_hash: string;
      confidence_score: number;
      date_creation: string;
    }>;

    let synced = 0;

    for (const serverEmbed of serverEmbeddings) {
      const exists = await this.hasEmbedding(serverEmbed.id_produit);

      if (!exists) {
        const record: ProductEmbedding = {
          id: crypto.randomUUID(),
          idProduit: serverEmbed.id_produit,
          idStructure: this.idStructure,
          embedding: serverEmbed.embedding,
          imageHash: serverEmbed.image_hash,
          createdAt: new Date(serverEmbed.date_creation),
          source: 'sync',
          confidence: serverEmbed.confidence_score || 1.0,
          syncedAt: new Date()
        };

        await this.saveLocal(record);
        synced++;
      }
    }

    return synced;
  }

  /**
   * Efface tous les embeddings locaux
   */
  async clearLocal(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB non initialisé'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ferme la connexion IndexedDB
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Factory pour créer une instance avec l'ID structure
export function createEmbeddingStore(idStructure: number): EmbeddingStore {
  return new EmbeddingStore(idStructure);
}

export default EmbeddingStore;
