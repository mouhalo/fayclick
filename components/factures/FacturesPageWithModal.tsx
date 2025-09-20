/**
 * Page exemple d'intégration des factures avec le modal privé
 * Démontre l'utilisation du nouveau système sans dépliable
 */

'use client';

import { useState } from 'react';
import { FacturesList } from './FacturesList';
import { ModalFacturePrivee } from '../facture/ModalFacturePrivee';
import { FactureComplete } from '@/types/facture';

interface FacturesPageWithModalProps {
  factures: FactureComplete[];
  loading?: boolean;
  onAjouterAcompte?: (facture: FactureComplete) => void;
  onPartager?: (facture: FactureComplete) => void;
  onFactureDeleted?: (idFacture: number) => void;
}

export function FacturesPageWithModal({
  factures,
  loading = false,
  onAjouterAcompte,
  onPartager,
  onFactureDeleted
}: FacturesPageWithModalProps) {
  const [selectedFacture, setSelectedFacture] = useState<FactureComplete | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleVoirDetailsModal = (facture: FactureComplete) => {
    setSelectedFacture(facture);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFacture(null);
  };

  const handleFactureDeleted = (idFacture: number) => {
    onFactureDeleted?.(idFacture);
    handleCloseModal();
  };

  const handlePaymentComplete = (idFacture: number) => {
    // Ici vous pourriez recharger les données de la facture
    // ou mettre à jour l'état local
    console.log('Paiement terminé pour facture:', idFacture);
  };

  return (
    <>
      <FacturesList
        factures={factures}
        loading={loading}
        onVoirDetailsModal={handleVoirDetailsModal}
        onAjouterAcompte={onAjouterAcompte}
        onPartager={onPartager}
      />

      {selectedFacture && (
        <ModalFacturePrivee
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          factureId={selectedFacture.facture.id_facture}
          onFactureDeleted={handleFactureDeleted}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </>
  );
}