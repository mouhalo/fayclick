# 🧾 Système de Factures Privées - FayClick V2

## 🎯 Vue d'ensemble

Nouveau système de gestion des factures pour les commerçants avec :
- **Modal privé** harmonisé avec le design FayClick
- **Suppression du système dépliable** dans les cartes
- **Intégration paiement wallet** avec QR Code
- **Design modernisé** des factures publiques

## 🏗️ Architecture

### Composants Principaux

#### 1. `ModalFacturePrivee`
Modal principal pour afficher les détails d'une facture privée.

```typescript
<ModalFacturePrivee
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  factureId={123}                    // Mode 1: ID pour API call
  // ou
  factureData={factureObject}       // Mode 2: Data déjà chargée
  onFactureDeleted={(id) => {}}      // Callback suppression
  onPaymentComplete={(id) => {}}     // Callback paiement
/>
```

#### 2. `FactureCard` (Modifié)
Carte de facture sans système dépliable, intégrée avec le modal.

```typescript
<FactureCard
  facture={factureComplete}
  onVoirDetailsModal={(facture) => {}} // Nouveau callback modal
  onAjouterAcompte={(facture) => {}}
  onPartager={(facture) => {}}
/>
```

#### 3. `FacturesPageWithModal`
Composant d'exemple d'intégration complète.

## 🔌 API Service

### `facturePriveeService`

```typescript
// Récupérer une facture
const facture = await facturePriveeService.getFacturePrivee(idFacture);

// Supprimer une facture (état = 1 uniquement)
const result = await facturePriveeService.supprimerFacture(idFacture, idStructure);

// Historique des paiements
const paiements = await facturePriveeService.getHistoriquePaiements(idFacture);

// Générer URL de partage
const url = facturePriveeService.generateUrlPartage(idStructure, idFacture);
```

## 🎨 Nouvelles Fonctionnalités

### 1. **Modal Facture Privée**
- ✅ Design harmonisé avec les modals FayClick
- ✅ Informations complètes (client, facturation, montant)
- ✅ Historique des paiements dépliable
- ✅ URL de partage avec copie automatique
- ✅ Bouton supprimer (factures impayées uniquement)
- ✅ Icône QR Code → Modal paiement wallet

### 2. **Intégration Wallet**
- ✅ Icône QR Code devant le montant total
- ✅ Ouverture du `ModalPaiementWalletNew` existant
- ✅ Support Orange Money, Wave, Free Money
- ✅ Callback de confirmation de paiement

### 3. **Cartes Sans Dépliable**
- ✅ Suppression complète du système dépliable
- ✅ Bouton "Voir détails" → Ouverture modal
- ✅ Conservation des infos rapides (montant, statut)
- ✅ Actions contextuelles selon le statut

### 4. **Design Amélioré**
- ✅ Factures publiques avec glassmorphism
- ✅ Gradients harmonisés
- ✅ Animations fluides
- ✅ Responsive mobile/desktop

## 📱 Workflow Utilisateur

### Commerçant - Voir Facture
1. **Liste des factures** → Clic "Voir détails"
2. **Modal s'ouvre** avec toutes les informations
3. **Historique paiements** disponible
4. **URL de partage** générée automatiquement
5. **Bouton QR Code** → Configuration paiement wallet

### Commerçant - Supprimer Facture
1. **Modal ouvert** → Bouton "Supprimer" (si état = 1)
2. **Confirmation** de suppression
3. **Suppression API** + fermeture modal
4. **Callback** pour mise à jour de la liste

### Client - Facture Publique
1. **URL avec token** → Page facture publique
2. **Design modernisé** glassmorphism
3. **Bouton masquer/afficher** les prix
4. **Responsive** optimal mobile/desktop

## 🔧 Intégration

### Dans une page existante

```typescript
import { FacturesPageWithModal } from '@/components/factures/FacturesPageWithModal';

export default function MesFactures() {
  const [factures, setFactures] = useState<FactureComplete[]>([]);

  const handleFactureDeleted = (idFacture: number) => {
    setFactures(prev => prev.filter(f => f.facture.id_facture !== idFacture));
  };

  return (
    <FacturesPageWithModal
      factures={factures}
      onFactureDeleted={handleFactureDeleted}
      onAjouterAcompte={handleAjouterAcompte}
      onPartager={handlePartager}
    />
  );
}
```

### Modal seul

```typescript
import { ModalFacturePrivee } from '@/components/facture/ModalFacturePrivee';

const [showModal, setShowModal] = useState(false);

return (
  <ModalFacturePrivee
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    factureId={123}
    onFactureDeleted={(id) => console.log('Supprimée:', id)}
    onPaymentComplete={(id) => console.log('Payée:', id)}
  />
);
```

## 📦 Fichiers Créés/Modifiés

### Nouveaux Fichiers
- `services/facture-privee.service.ts` - Service API factures privées
- `types/facture-privee.ts` - Types spécifiques
- `components/facture/ModalFacturePrivee.tsx` - Modal principal
- `components/factures/FacturesPageWithModal.tsx` - Intégration exemple
- `components/facture/index.ts` - Exports centralisés

### Fichiers Modifiés
- `components/factures/FactureCard.tsx` - Suppression dépliable + modal
- `components/factures/FacturesList.tsx` - Nouveau callback modal
- `components/facture/FacturePubliqueClient.tsx` - Design amélioré

## 🚀 Déploiement

Cette branche `amelioration_facture_publique` est prête pour :
1. **Tests locaux** complets
2. **Review du code** par l'équipe
3. **Merge** vers la branche principale
4. **Déploiement** production

## 🎯 Avantages

- ✅ **UX uniforme** avec le design FayClick
- ✅ **Performance** améliorée (plus de DOM lourd)
- ✅ **Fonctionnalités** avancées (historique, suppression, wallet)
- ✅ **Mobile-first** responsive
- ✅ **Code maintenable** et réutilisable

---

**Développé avec expertise par l'équipe FayClick V2** 🚀