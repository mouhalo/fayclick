# Documentation Technique - Composant Gestion des Clients FayClick

## 📋 Vue d'Ensemble

Ce document guide l'équipe pour créer le composant de gestion des clients en suivant l'architecture existante de FayClick, notamment le pattern établi dans la gestion des produits.

## 🏗️ Architecture des Composants

### Structure Hiérarchique (Identique à Produits)
```
app/dashboard/commerce/clients/
└── page.tsx                    # Page principale
    
components/clients/
├── ClientsFilterHeader.tsx     # Barre de recherche et filtres
├── StatsCardsClients.tsx       # Cartes de statistiques
├── ClientsList.tsx             # Liste avec états vides
├── CarteClient.tsx             # Carte client individuelle
└── ModalAjoutClient.tsx        # Modal création/édition

hooks/
└── useClients.ts               # Hook de gestion d'état

services/
└── clients.service.ts          # Service API
```

## 📊 Types et Interfaces

```typescript
// types/client.ts (À CRÉER)
export interface Client {
  id_client: number;
  nom_client: string;
  tel_client: string;
  adresse: string;
  date_creation: string;
  date_modification: string;
}

export interface StatistiquesFactures {
  nombre_factures: number;
  montant_total_factures: number;
  montant_paye: number;
  montant_impaye: number;
  nombre_factures_payees: number;
  nombre_factures_impayees: number;
  pourcentage_paiement: number;
  date_premiere_facture: string;
  date_derniere_facture: string;
}

export interface ClientWithStats {
  client: Client;
  statistiques_factures: StatistiquesFactures;
  factures: Facture[];
}

export interface ClientsApiResponse {
  success: boolean;
  structure_id: number;
  clients: ClientWithStats[];
  statistiques_globales: StatistiquesGlobales;
  timestamp_generation: string;
}

// Pour la création/édition
export interface AddEditClientResponse {
  result_id_client: number;
  result_nom_client: string;
  result_tel_client: string;
  result_adresse: string;
  result_date_creation: string;
  result_date_modification: string;
  result_id_structure: number;
  result_action_effectuee: 'CREATION' | 'MODIFICATION';
  result_factures_mises_a_jour: number;
}
```

## 🔌 Service API (IMPORTANT)

### clients.service.ts (À CRÉER en suivant le pattern de produits.service.ts)

```typescript
import { authService } from './auth.service';
import database from './database.service';
import SecurityService from './security.service';

export class ClientsApiException extends Error {
  constructor(public message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ClientsApiException';
  }
}

export class ClientsService {
  private static instance: ClientsService;

  private constructor() {}

  public static getInstance(): ClientsService {
    if (!ClientsService.instance) {
      ClientsService.instance = new ClientsService();
    }
    return ClientsService.instance;
  }

  /**
   * Récupérer la liste des clients avec leurs statistiques
   */
  async getListeClients(): Promise<ClientsApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Récupération liste clients', {
        id_structure: user.id_structure
      });

      // Utilisation de la fonction PostgreSQL
      const query = `SELECT * FROM get_list_clients(${user.id_structure})`;
      const results = await database.query(query);
      
      // L'API retourne un seul objet contenant toutes les données
      const data = Array.isArray(results) && results.length > 0 ? results[0] : null;
      
      if (!data || !data.success) {
        throw new ClientsApiException('Erreur lors de la récupération des clients', 500);
      }
      
      SecurityService.secureLog('log', 'Clients récupérés', {
        nombre_clients: data.clients.length,
        structure_id: data.structure_id
      });
      
      return data as ClientsApiResponse;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération clients', error);
      
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
   * Créer ou modifier un client
   */
  async createOrUpdateClient(
    clientData: {
      nom_client: string;
      tel_client: string;
      adresse: string;
      id_client?: number; // Si fourni = modification
    }
  ): Promise<AddEditClientResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ClientsApiException('Utilisateur non authentifié', 401);
      }

      // Validation
      if (!clientData.nom_client?.trim()) {
        throw new ClientsApiException('Le nom du client est requis', 400);
      }

      // Appel fonction PostgreSQL
      const query = `
        SELECT * FROM add_edit_client(
          ${user.id_structure},
          '${clientData.nom_client.replace(/'/g, "''")}',
          '${clientData.tel_client.replace(/'/g, "''")}',
          '${clientData.adresse.replace(/'/g, "''")}',
          ${clientData.id_client || 0}
        )
      `;

      const results = await database.query(query);
      const result = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!result) {
        throw new ClientsApiException('Erreur lors de l\'enregistrement du client', 500);
      }

      SecurityService.secureLog('log', 'Client enregistré', {
        id_client: result.result_id_client,
        action: result.result_action_effectuee
      });

      return result as AddEditClientResponse;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur enregistrement client', error);
      
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
}

export const clientsService = ClientsService.getInstance();
```

## 🎯 Hook useClients (À CRÉER comme useProduits)

```typescript
// hooks/useClients.ts
import { useState, useMemo, useCallback } from 'react';
import { ClientWithStats } from '@/types/client';

export function useClients() {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingClients, setLoadingClients] = useState(true);
  const [errorClients, setErrorClients] = useState('');

  // Filtrage des clients
  const clientsFiltered = useMemo(() => {
    if (!searchTerm) return clients;
    
    const search = searchTerm.toLowerCase();
    return clients.filter(({ client }) =>
      client.nom_client.toLowerCase().includes(search) ||
      client.tel_client.includes(search) ||
      client.adresse.toLowerCase().includes(search)
    );
  }, [clients, searchTerm]);

  // Actions
  const ajouterClient = useCallback((newClient: ClientWithStats) => {
    setClients(prev => [newClient, ...prev]);
  }, []);

  const modifierClient = useCallback((id_client: number, updatedClient: ClientWithStats) => {
    setClients(prev => prev.map(c => 
      c.client.id_client === id_client ? updatedClient : c
    ));
  }, []);

  return {
    clients,
    clientsFiltered,
    searchTerm,
    isLoadingClients,
    errorClients,
    setClients,
    setSearchTerm,
    setLoadingClients,
    setErrorClients,
    ajouterClient,
    modifierClient
  };
}
```

## 🎨 Composants UI

### 1. ClientsFilterHeader (Copier ProduitsFilterHeader et adapter)
```typescript
// components/clients/ClientsFilterHeader.tsx
interface ClientsFilterHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}
```

### 2. StatsCardsClients (Pattern similaire à StatsCardsNouveaux)
```typescript
// components/clients/StatsCardsClients.tsx
interface StatsCardsClientsProps {
  stats: StatistiquesGlobales;
}

// 4 cartes à afficher:
// 1. Total Clients (nombre_total_clients) - Icône Users
// 2. CA Total (montant_total_structure) - Icône DollarSign
// 3. Impayés (montant_impaye_structure) - Icône AlertCircle
// 4. Taux Recouvrement (%) - Icône TrendingUp
```

### 3. CarteClient (Adapter CarteProduit)
```typescript
// components/clients/CarteClient.tsx
interface CarteClientProps {
  client: ClientWithStats;
  onEdit: (client: Client) => void;
  onViewDetails: (client: ClientWithStats) => void;
  compactMode?: boolean;
}

// Structure de la carte glassmorphism:
<motion.div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
  {/* Header */}
  <div className="flex justify-between items-start mb-3">
    <h3 className="text-lg font-semibold text-white">{client.nom_client}</h3>
    <Badge statut={client.statistiques_factures.nombre_factures_impayees > 0 ? 'impaye' : 'ok'} />
  </div>
  
  {/* Infos */}
  <div className="space-y-2 text-white/80 text-sm">
    <div className="flex items-center gap-2">
      <Phone className="w-4 h-4" />
      <span>{client.tel_client}</span>
    </div>
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4" />
      <span>{client.adresse}</span>
    </div>
  </div>
  
  {/* Stats */}
  <div className="mt-4 pt-4 border-t border-white/20">
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="bg-white/5 rounded-lg p-2">
        <p className="text-white/60 text-xs">Factures</p>
        <p className="text-white font-semibold">{stats.nombre_factures}</p>
      </div>
      <div className="bg-white/5 rounded-lg p-2">
        <p className="text-white/60 text-xs">Total</p>
        <p className="text-white font-semibold">{formatAmount(stats.montant_total_factures)}</p>
      </div>
    </div>
    
    {stats.montant_impaye > 0 && (
      <div className="mt-2 p-2 bg-red-500/20 rounded-lg">
        <p className="text-red-200 text-xs">Impayé: {formatAmount(stats.montant_impaye)} FCFA</p>
      </div>
    )}
  </div>
  
  {/* Actions */}
  <div className="flex gap-2 mt-4">
    <button onClick={() => onViewDetails(client)} 
      className="flex-1 py-2 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30">
      Détails
    </button>
    <button onClick={() => onEdit(client.client)} 
      className="flex-1 py-2 bg-emerald-500/20 rounded-lg text-emerald-200 text-sm hover:bg-emerald-500/30">
      Modifier
    </button>
  </div>
</motion.div>
```

### 4. ModalAjoutClient (Pattern similaire à ModalAjoutProduitNew)
```typescript
// components/clients/ModalAjoutClient.tsx
interface ModalAjoutClientProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: AddEditClientResponse) => void;
  clientToEdit?: Client | null;
}
```

## 🎯 Page Principale (app/dashboard/commerce/clients/page.tsx)

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// ... imports similaires à ProduitsCommercePage

export default function ClientsCommercePage() {
  const router = useRouter();
  
  // États locaux
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [statsGlobales, setStatsGlobales] = useState<StatistiquesGlobales | null>(null);
  
  const itemsPerPage = 10;

  // Hook personnalisé
  const {
    clients,
    clientsFiltered,
    searchTerm,
    isLoadingClients,
    errorClients,
    setClients,
    setSearchTerm,
    setLoadingClients,
    setErrorClients,
    ajouterClient,
    modifierClient
  } = useClients();

  // Pagination
  const { totalPages, getPaginatedItems } = usePagination(
    clientsFiltered.length, 
    itemsPerPage
  );
  
  const paginatedClients = getPaginatedItems(clientsFiltered, currentPage);

  // Chargement des clients
  const loadClients = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingClients(true);
      const response = await clientsService.getListeClients();
      
      setClients(response.clients);
      setStatsGlobales(response.statistiques_globales);
      
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      setErrorClients('Impossible de charger les clients');
    } finally {
      setLoadingClients(false);
    }
  }, [user, setClients, setLoadingClients, setErrorClients]);

  // Structure similaire à ProduitsCommercePage...
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800">
      <div className="max-w-md mx-auto bg-yellow-180 min-h-screen relative">
        
        {/* Header glassmorphism */}
        <GlassHeader
          title="👥 Gestion Clients"
          subtitle={user?.nom_structure}
          onBack={() => router.push('/dashboard')}
          showBackButton={true}
          backgroundGradient="bg-gradient-to-r from-green-500 to-green-600"
          filterContent={
            <ClientsFilterHeader
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          }
        />

        {/* Contenu */}
        <div className="p-5 pb-24">
          
          {/* Stats */}
          {statsGlobales && (
            <StatsCardsClients stats={statsGlobales} />
          )}

          {/* Pagination */}
          <GlassPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={clientsFiltered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="clients"
            className="mb-6"
          />

          {/* Liste */}
          <ClientsList
            items={paginatedClients}
            loading={isLoadingClients}
            viewMode={viewMode}
            renderItem={(client) => (
              <CarteClient
                client={client}
                onEdit={handleEditClient}
                onViewDetails={handleViewDetails}
                compactMode={viewMode === 'list'}
              />
            )}
            onAddClient={handleAddClient}
            isEmpty={clients.length === 0}
            hasNoResults={clients.length > 0 && clientsFiltered.length === 0}
            searchTerm={searchTerm}
          />
        </div>

        {/* FAB */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAddClient}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Modals */}
      <ModalAjoutClient
        isOpen={isModalAjoutOpen}
        onClose={() => setModalAjoutOpen(false)}
        onSuccess={handleClientSuccess}
        clientToEdit={clientSelectionne}
      />
    </div>
  );
}
```

## 🚀 Étapes d'Implémentation

1. **Créer les types** dans `types/client.ts`
2. **Créer le service** `services/clients.service.ts` en suivant le pattern de `produits.service.ts`
3. **Créer le hook** `useClients` en adaptant `useProduits`
4. **Copier et adapter** les composants UI depuis les produits :
   - `ProduitsFilterHeader` → `ClientsFilterHeader`
   - `StatsCardsNouveaux` → `StatsCardsClients`
   - `CarteProduit` → `CarteClient`
   - `ProduitsList` → `ClientsList`
5. **Créer** `ModalAjoutClient` avec validation des champs
6. **Implémenter** la page principale en suivant le pattern de `ProduitsCommercePage`

## 📝 Points Importants

- **Utiliser database.service.ts** : NE PAS créer de nouvelles méthodes d'appel API
- **Pattern Singleton** : Tous les services utilisent ce pattern
- **Security Service** : Logger toutes les actions sensibles
- **Glass-morphism** : Utiliser `bg-white/10 backdrop-blur-lg border-white/20`
- **Animations** : Framer Motion avec les mêmes timings que les produits
- **Responsive** : Mobile-first, max-w-md pour mobile

Cette documentation suit exactement l'architecture existante de FayClick pour garantir la cohérence et la maintenabilité.