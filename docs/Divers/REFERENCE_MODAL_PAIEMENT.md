# Référence Design Modal de Paiement

## Date: 09/01/2026

## 1. Design ACTUEL (PaymentMethodSelector) - À REFAIRE

**Fichier**: `components/factures/PaymentMethodSelector.tsx`

**Caractéristiques actuelles**:
- Carte "Espèces" avec badge "Par défaut" (bordure verte)
- 3 petites cartes en ligne: Orange Money, Wave, Free Money
- Bouton "Annuler"
- Style glassmorphisme léger

**Capture**: Modal "Ajouter un acompte" avec 4 options de paiement

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │ Espèces      [Par défaut]   │    │  ← Carte principale verte
│  │ 15 FCFA - Paiement immédiat │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Orange │ │  Wave  │ │  Free  │  │  ← 3 petites cartes
│  │ Money  │ │        │ │ Money  │  │
│  │ 15FCFA │ │ 15FCFA │ │ 15FCFA │  │
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  [        Annuler        ]          │
└─────────────────────────────────────┘
```

---

## 2. Design CIBLE (ModalEncaissementVenteFlash) - À REPRODUIRE

**Fichier**: `components/venteflash/ModalEncaissementVenteFlash.tsx`

**Caractéristiques**:
- Header vert avec titre "Encaissement" + montant
- 3 GRANDES cartes colorées qui flippent au clic
- **CASH** = Vert (#22c55e)
- **WAVE** = Bleu (#3b82f6)
- **OM** = Orange (#f97316)
- **PAS DE FREE MONEY**
- Animation flip sur sélection

**Capture**: Modal "Encaissement" style VenteFlash

```
┌─────────────────────────────────────┐
│ 🧮 Encaissement           ✕         │  ← Header vert
│    13 F CFA                         │
├─────────────────────────────────────┤
│  Choisissez le mode de paiement     │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  🧮     │ │  🐧     │ │  📱    ││
│  │         │ │  WAVE   │ │        ││
│  │  CASH   │ │  logo   │ │   OM   ││
│  │ (vert)  │ │ (bleu)  │ │(orange)││
│  └─────────┘ └─────────┘ └─────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## 3. Action à faire

Modifier `PaymentMethodSelector.tsx` pour :
1. Supprimer l'option FREE
2. Utiliser le design des 3 grandes cartes colorées
3. Ajouter animation flip au clic
4. Harmoniser avec le style VenteFlash

## Fichiers de référence

- `components/venteflash/ModalEncaissementVenteFlash.tsx` - Design cible
- `components/factures/PaymentMethodSelector.tsx` - À modifier
- `components/services-factures/PaymentMethodSelector.tsx` - À modifier aussi

## Couleurs

| Mode   | Background      | Hover           |
|--------|-----------------|-----------------|
| CASH   | #22c55e (green) | #16a34a         |
| WAVE   | #3b82f6 (blue)  | #2563eb         |
| OM     | #f97316 (orange)| #ea580c         |
