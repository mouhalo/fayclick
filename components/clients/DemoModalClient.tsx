/**
 * Composant de démonstration du Modal Client Multi-Onglets
 * Utilisé pour tester l'intégration complète
 */

'use client';

import React, { useState } from 'react';
import { ModalClientMultiOnglets } from './ModalClientMultiOnglets';
import { ClientWithStats, AddEditClientResponse } from '@/types/client';

// Données de test
const CLIENT_TEST: ClientWithStats = {
  client: {
    id_client: 1,
    nom_client: "Mamadou Diallo",
    tel_client: "+221 77 123 45 67",
    adresse: "Dakar, Plateau, Rue 15 x 20",
    date_creation: "2023-01-15T10:30:00Z",
    date_modification: "2025-01-05T14:20:00Z"
  },
  statistiques_factures: {
    nombre_factures: 15,
    montant_total_factures: 750000,
    montant_paye: 600000,
    montant_impaye: 150000,
    nombre_factures_payees: 12,
    nombre_factures_impayees: 3,
    pourcentage_paiement: 80,
    date_premiere_facture: "2023-02-01T08:00:00Z",
    date_derniere_facture: "2025-01-03T16:45:00Z"
  }
};

export function DemoModalClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);

  const handleOpenModal = (client?: ClientWithStats) => {
    setSelectedClient(client || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleSuccess = (response: AddEditClientResponse) => {
    console.log('✅ Client sauvegardé:', response);
    // Ici vous pouvez actualiser la liste des clients
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Démonstration Modal Client Multi-Onglets
        </h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6">Actions de Test</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Nouveau client */}
            <button
              onClick={() => handleOpenModal()}
              className="p-6 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl border border-emerald-400/30 transition-all group"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <span className="text-emerald-200 font-bold text-xl">+</span>
                </div>
                <h3 className="text-emerald-200 font-medium mb-2">Nouveau Client</h3>
                <p className="text-emerald-300/80 text-sm">
                  Créer un nouveau client avec le modal
                </p>
              </div>
            </button>

            {/* Client existant */}
            <button
              onClick={() => handleOpenModal(CLIENT_TEST)}
              className="p-6 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl border border-blue-400/30 transition-all group"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <span className="text-blue-200 font-bold text-xl">👤</span>
                </div>
                <h3 className="text-blue-200 font-medium mb-2">Client Existant</h3>
                <p className="text-blue-300/80 text-sm">
                  Voir les détails de {CLIENT_TEST.client.nom_client}
                </p>
              </div>
            </button>
          </div>

          {/* Informations sur la démo */}
          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/20">
            <h3 className="text-white font-medium mb-2">Fonctionnalités testées :</h3>
            <ul className="text-white/80 text-sm space-y-1">
              <li>• <strong>Onglet Général :</strong> Édition des infos client + statistiques</li>
              <li>• <strong>Onglet Factures :</strong> Liste des factures + filtres + actions de paiement</li>
              <li>• <strong>Onglet Historique :</strong> Produits achetés + recherche + insights</li>
              <li>• <strong>Navigation :</strong> Changement d'onglets fluide avec animations</li>
              <li>• <strong>Design :</strong> Glassmorphisme vert cohérent avec FayClick</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Client */}
      <ModalClientMultiOnglets
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        clientToEdit={selectedClient}
        defaultTab="general"
      />
    </div>
  );
}