# PRD — Encaissement multimode (paiement mixte Cash + Wallet)

- **Date** : 2026-08-19
- **Statut** : Brouillon pour revue
- **Périmètre validé** : Vente Flash **+** Factures normales (Commerce & Prestataires de services)
- **Mécanisme retenu** : réutilisation de l'acompte existant (`add_acompte_facture`), appelé plusieurs fois sur la même facture avec un mode de paiement différent à chaque tranche

---

## 1. Contexte & problème

Aujourd'hui, l'encaissement (Vente Flash comme facture normale) impose **un seul mode de paiement pour tout le montant dû**. Or il arrive régulièrement qu'un client n'ait pas assez de cash sur lui et complète avec Wave/OM (ou l'inverse), pour une **même vente**.

### Besoin exprimé (verbatim)
> « Il nous faut rédiger un PRD permettant d'implémenter cette fonctionnalité sans casser l'existant [...] on peut considérer que le client paie d'abord un acompte avec le mode cash, puis solde avec un autre mode [...] ajouter sur le modal d'encaissement un champ qui s'auto-désactive à chaque nouvelle vente et qui, une fois coché, permet de garder ouvert le modal et de faire plusieurs encaissements. »

### Constat clé (feasibility)
La fonction PostgreSQL `add_acompte_facture` (7 paramètres, cf. `CLAUDE.md`) **supporte déjà nativement les paiements en plusieurs tranches** : elle calcule `mt_restant = GREATEST(0, montant_net - mt_acompte_cumulé)`, insère **un `recus_paiement` distinct par tranche** (avec son propre `mode_paiement`), et ne clôture la facture (`id_etat = 2`) que lorsque `mt_restant = 0`. C'est exactement le mécanisme qu'utilise déjà `ModalPaiement.tsx` (factures normales) pour les acomptes partiels.

**Encore mieux** : chaque appel à `add_acompte_facture` renvoie dans `recus_paiement` **la liste complète et cumulée** de tous les reçus de la facture (requête `SELECT ... FROM recus_paiement WHERE id_facture = pid_facture`, sans filtre sur la transaction courante). Le **dernier appel** d'une vente en plusieurs tranches contient donc déjà, dans sa réponse, l'historique complet {mode, montant} de tous les paiements de la vente — **aucune nouvelle fonction backend n'est nécessaire**.

Ce qui manque réellement :
1. **Vente Flash** (`ModalEncaissementVenteFlash.tsx` + `PanierVenteFlashInline.tsx`) : le flow est **one-shot** — il encaisse toujours le **total** en un seul appel `add_acompte_facture`, jamais un montant partiel. Il n'y a aucune notion d'acompte dans ce parcours.
2. **Factures normales** (`ModalPaiement.tsx`, dupliqué à l'identique dans `components/factures/` et `components/services-factures/`) : l'acompte partiel existe déjà, mais le modal **se ferme automatiquement 2s après chaque paiement réussi** (`setTimeout(() => onClose(), 2000)`), forçant le caissier à rouvrir manuellement le modal pour encaisser le complément. Pas de mécanisme pour enchaîner deux modes dans la foulée.
3. **Reçu/ticket** : `lib/generate-ticket-html.ts` (`TicketData.methodePaiement: string`) et `ModalRecuGenere` n'affichent qu'**un seul** mode de paiement — aucun des deux ne sait afficher "700 F CASH + 500 F OM".

---

## 2. Objectifs

- Permettre au caissier d'encaisser une vente (Vente Flash ou facture) en **plusieurs tranches, chacune avec son propre mode de paiement** (CASH, OM, WAVE), sans dépasser le montant net dû.
- Introduire une **case à cocher "Paiement multimode"** dans les modals d'encaissement :
  - **Décochée par défaut** (comportement actuel inchangé, zéro régression).
  - **Cochée** : après une tranche qui ne solde pas totalement la vente, le modal **reste ouvert** (ou se rouvre automatiquement) sur le **montant restant**, prêt pour le mode suivant.
  - **Se réinitialise automatiquement à décoché** dès que la vente en cours est totalement soldée ou abandonnée — jamais persistée d'une vente à l'autre.
- À la fin d'une vente en plusieurs tranches, imprimer **un seul ticket consolidé** listant chaque tranche (mode + montant), pas un ticket par tranche.
- **Zéro changement de contrat backend** : réutiliser `add_acompte_facture` tel quel (aucune migration DDL requise pour le cœur de la fonctionnalité).

### Hors périmètre (V1)
- ❌ Factures **Scolaire** / **Immobilier** (pas de flux d'encaissement wallet équivalent identifié dans le repo — à confirmer si besoin futur).
- ❌ Paiement mixte impliquant le **crédit client** (`credit_autorise`) — reste un mode séparé, non combiné ici.
- ❌ Annulation/remboursement partiel d'une tranche déjà encaissée (hors sujet — géré par les mécanismes de suppression/modification existants).
- ❌ Limite du nombre de tranches par vente (V1 : illimité tant que `mt_restant > 0`, mais l'UX est pensée pour 2, éventuellement 3 tranches).
- ❌ Repenser `useMultiModePayment` comme hook générique partagé Vente Flash / Factures — les deux flows restent des implémentations locales dans un premier temps (diffèrent trop sur la création de facture), une factorisation pourra venir en V2 si le pattern se stabilise.

---

## 3. Décisions de cadrage (validées avec le PO)

| Décision | Choix retenu |
|---|---|
| **Périmètre** | Vente Flash **+** Factures normales (Commerce & Prestataires) |
| **Reçu / ticket** | **Un seul ticket consolidé** à la fin de la vente (pas un ticket par tranche) |
| **Monnaie à rendre (CASH)** | Calculée sur le **montant de la tranche en cours** (= restant dû à cet instant), pas sur le total de la vente. Seule la tranche qui **solde** la vente peut générer de la monnaie à rendre. |
| **État de la case à cocher** | Décochée par défaut · reste cochée entre les tranches d'une même vente · se réinitialise automatiquement dès que la vente est soldée, annulée, ou qu'une nouvelle vente commence |
| **Backend** | Aucune nouvelle fonction PostgreSQL — réutilisation de `add_acompte_facture` (déjà idempotent sur les tranches successives et déjà porteur de `recus_paiement` cumulés) |

---

## 4. État des lieux technique (vérifié dans le repo)

### 4.1 Vente Flash — flow actuel (one-shot)

`PanierVenteFlashInline.tsx:219-362` (`handlePaymentComplete`) :
```
1. factureService.createFacture(articles, client, { remise, acompte: 0 }, false)
2. add_acompte_facture(id_structure, idFacture, TOTAL, transactionId, uuid, method, telephone)
   → un seul appel, montant = TOTAL intégral
3. clearPanier() + affichage ModalRecuTicket (via lib/generate-ticket-html.ts)
```
`ModalEncaissementVenteFlash.tsx` : 3 flip-cards (CASH/WAVE/OM), chaque carte appelle directement `onPaymentComplete()` avec le **montantTotal** complet — pas de concept de montant partiel.

### 4.2 Factures normales — flow actuel (acompte déjà partiel, mais mono-tranche par ouverture)

`ModalPaiement.tsx` (identique dans `components/factures/` et `components/services-factures/`) :
```
1. Caissier saisit montantAcompte (peut être < mt_restant → acompte partiel, déjà supporté)
2. processCashPayment() / processWalletDirectPayment() / handleWalletPaymentComplete()
   → factureService.addAcompte({ id_structure, id_facture, montant_acompte, transaction_id, uuid, mode_paiement, telephone })
   → add_acompte_facture(...)
3. setSuccess(true) + affichage ModalRecuGenere + setTimeout(() => onClose(), 2000)
```
Le caissier peut déjà, en théorie, rouvrir le modal une 2e fois pour compléter avec un autre mode — mais rien ne l'accompagne dans cet enchaînement (fermeture forcée, pas de bandeau "reste à encaisser", 2 reçus séparés imprimés).

### 4.3 `add_acompte_facture` — contrat déjà multi-tranches

Signature (`docs/database/PATCH_PHASE1C_ADD_ACOMPTE_UNIFIE.sql`, déployée en prod) :
```sql
add_acompte_facture(pid_structure, pid_facture, pmontant_acompte, ptransactionid, puuid, pmode_paiement, ptel_client)
```
- Calcule `v_montant_net = montant_brut - mt_remise` (immuable, jamais muté).
- `v_nouveau_acompte = mt_acompte_existant + pmontant_acompte` → rejette (`AMOUNT_EXCEEDED`) si ça dépasse le net.
- `v_nouveau_restant = GREATEST(0, net - nouveau_acompte)` → `id_etat = 2` (payée) seulement si `restant = 0`, sinon reste `id_etat = 1`.
- **Chaque appel insère UNE ligne `recus_paiement`** avec son propre `mode_paiement`, `montant_paye`, `reference_transaction`.
- Le JSON retourné contient `recus_paiement` = **TOUS** les reçus de la facture (pas seulement celui qu'on vient de créer) → le dernier appel d'une vente en 2 tranches renvoie déjà `[{mode: CASH, montant: 700}, {mode: OM, montant: 500}]`.

**Conséquence** : le mécanisme d'acompte existant est *déjà* un mécanisme de paiement multimode côté backend. Il ne manque que l'orchestration front (créer la facture une seule fois en Vente Flash, ne pas fermer le modal, agréger l'affichage du reçu).

### 4.4 Reçu / ticket — limitation actuelle

- `lib/generate-ticket-html.ts` → `TicketData.methodePaiement: string` (une seule valeur, ligne `Paiement` unique dans le HTML du ticket 80mm).
- `ModalRecuGenere` (factures) → props `walletUsed: PaymentMethod` + `montantPaye: number` (singulier).
- Utilisés par : `ModalRecuVenteFlash.tsx`, `ModalFactureSuccess.tsx`, `ModalRecuGenere.tsx`.

### 4.5 Reporting — déjà compatible sans changement

Le rapport d'encaissements par mode (`ListePaiements.tsx`, `get_historic_recu`, cf. mémoire *Rapport encaissements par modes*) liste les `recus_paiement` **ligne par ligne**, chacune avec son propre `methode_paiement`. Une vente encaissée en 2 tranches apparaîtra naturellement comme **2 lignes distinctes** (une CASH, une OM) rattachées à la même `num_facture` — c'est le comportement correct et attendu, **aucune modification requise** côté rapport.

---

## 5. Conception fonctionnelle

### 5.1 Vente Flash

```
Panier (total = 1200 F) → case "Paiement multimode" cochée
  ↓
Ouverture ModalEncaissement (montant à encaisser = 1200 F, bandeau "Reste à encaisser : 1200 F" masqué tant qu'aucune tranche n'est passée)
  ↓ Caissier choisit CASH, saisit 700 F reçu exact (≤ restant → pas de monnaie)
1er appel : createFacture(acompte: 0) PUIS add_acompte_facture(montant = 700, mode = CASH)
  → mt_restant facture = 500 F, id_etat reste 1 (impayée/partielle)
  ↓ case cochée ET restant > 0 → le modal NE se ferme PAS,
    se rouvre sur "Reste à encaisser : 500 F"
  ↓ Caissier choisit OM, saisit le numéro, complète le paiement (montant = 500 F, mode = OM)
2e appel : add_acompte_facture(montant = 500, mode = OM)  ← PAS de nouvelle createFacture
  → mt_restant = 0, id_etat = 2 (payée)
  ↓ restant = 0 → finalisation : clearPanier(), case décochée automatiquement,
    ticket consolidé imprimé à partir de recus_paiement du DERNIER appel
    (contient déjà les 2 tranches : CASH 700 + OM 500)
```

Changements requis dans `PanierVenteFlashInline.tsx` :
- État local `idFactureEnCours`, `montantRestantVente` (initialisé à `total`), `paiementsCumules` (dérivé du dernier `recus_paiement` reçu).
- `handlePaymentComplete` : ne crée la facture **que si `idFactureEnCours` est vide** (1ère tranche) ; encaisse `Math.min(montant saisi, montantRestantVente)` au lieu du `total` fixe.
- Si case cochée et `montantRestantVente > 0` après un appel réussi → ne pas vider le panier, ne pas fermer le modal ; passer `montantAEncaisser = montantRestantVente` au modal pour la tranche suivante.
- Si case décochée ou `montantRestantVente = 0` → comportement actuel (finalisation).

Changements requis dans `ModalEncaissementVenteFlash.tsx` :
- Nouvelle prop `montantAEncaisser` (au lieu d'utiliser `montantTotal` comme cible d'encaissement — `montantTotal` reste pour l'affichage du total de la vente si on veut un bandeau "Total vente / Reste à encaisser" distinct).
- Case à cocher "Paiement multimode" (contrôlée par le parent, PAS réinitialisée par `resetModal()` — sinon elle retomberait à chaque tranche).
- Libellés dynamiques ("Reste à encaisser : X F" au lieu de "Total : X F" dès qu'une tranche a déjà été passée).

### 5.2 Factures normales (Commerce & Prestataires)

```
ModalPaiement ouvert sur une facture à 1200 F restant → case "Paiement multimode" cochée
  ↓ Caissier saisit 700 F, choisit CASH → processCashPayment()
add_acompte_facture(montant = 700, mode = CASH) → mt_restant = 500, id_etat = 1
  ↓ case cochée ET nouveauRestant > 0 → PAS de setTimeout(onClose)
    → mise à jour de `facture` en mémoire (mt_acompte/mt_restant), reset montantAcompte = 500,
      retour à l'étape sélection de méthode (pas de fermeture)
  ↓ Caissier saisit 500 F, choisit OM → processWalletDirectPayment() ou flow QR
add_acompte_facture(montant = 500, mode = OM) → mt_restant = 0, id_etat = 2
  ↓ restant = 0 → finalisation : ModalRecuGenere affiché avec recus_paiement CUMULÉS
    (2 lignes), onSuccess(response) appelé, fermeture après 2s, case décochée
```

Changements requis dans `ModalPaiement.tsx` (factures + services-factures, appliquer le même diff aux 2 fichiers dupliqués) :
- Nouvel état `multiModeActif: boolean` (case à cocher, ne PAS la réinitialiser dans le `useEffect` de reset tant que `success && !estSoldee`).
- Dans `processCashPayment`, `processWalletDirectPayment`, `handleWalletPaymentComplete` : après un succès, si `multiModeActif && !montants.estSoldee` → ne pas déclencher `setTimeout(onClose)`, remettre `montantAcompte` à la nouvelle valeur de `mt_restant`, garder le modal en étape "sélection méthode".
- `ModalRecuGenere` : adapter pour accepter la liste `recus_paiement[]` (mode + montant par ligne) au lieu d'un seul `walletUsed`/`montantPaye` — n'afficher qu'**une fois**, à la fin (quand `estSoldee`).

### 5.3 Ticket / reçu consolidé

- `TicketData` (`lib/generate-ticket-html.ts`) : ajouter un champ optionnel `paiements?: { mode: string; montant: number }[]`.
  - Si présent (≥ 2 tranches) → afficher N lignes "Paiement" au lieu de la ligne unique `methodePaiement`.
  - Si absent → comportement 100% inchangé (rétrocompatibilité totale avec les ventes mono-mode).
- `ModalRecuGenere` : même logique, prend `recusUsed: RecuPaiement[]` au lieu de `walletUsed` singulier (ou garde une prop singulière pour le cas mono-tranche + une prop optionnelle liste pour le cas multimode — au choix de l'implémentation, contrat à trancher en story).

### 5.4 Cas limites à couvrir

| Cas | Comportement attendu |
|---|---|
| Caissier décoche la case en cours de split (avant de solder) | La tranche suivante se comporte comme une vente/facture normale mono-mode : fermeture/finalisation classique dès cette tranche, même si elle ne solde pas totalement (comportement actuel des acomptes : rien de nouveau) |
| Caissier ferme le modal (croix) alors qu'une tranche est déjà passée et `restant > 0` | La facture reste en base avec `id_etat = 1` (partielle) — visible dans Factures > Impayées avec le bon `mt_restant`. Pour Vente Flash, c'est un **nouveau cas** : une vente Vente Flash peut désormais rester "en attente" (auparavant toujours payée intégralement à la création) → à tester dans les listings Vente Flash (`VenteFlashEncaissementsCards.tsx`) |
| Tranche CASH avec montant reçu > restant dû, alors qu'il reste des tranches à venir côté caissier | Le caissier ne devrait normalement saisir que ≤ restant en cours de split ; si le montant saisi dépasse le restant, cette tranche **solde automatiquement** la vente (traité comme la tranche finale) et calcule la monnaie à rendre sur l'excédent — pas d'erreur bloquante |
| Masquage montants CAISSIER (`canViewCA`) | Ne s'applique **pas** au montant "reste à encaisser" affiché pendant l'encaissement (le caissier doit voir ce chiffre pour faire son travail) — seul le CA agrégé du dashboard est masqué. Aucun changement ici, juste à ne pas régresser par erreur |
| Double-clic / rappel de callback (paiement wallet avec polling) | Réutiliser le pattern `paymentCompletedRef` existant, mais le **réinitialiser explicitement** entre deux tranches (sinon la 2e tranche serait ignorée par le guard anti-doublon) |

---

## 6. Epics & stories

### EPIC 1 — Vente Flash multimode
- Story 1.1 : État "vente en cours multi-tranches" dans `PanierVenteFlashInline.tsx` (facture créée une seule fois, tranches suivantes = acompte uniquement)
- Story 1.2 : Case à cocher + affichage "Reste à encaisser" dans `ModalEncaissementVenteFlash.tsx`
- Story 1.3 : Gestion de l'abandon en cours de split (facture partielle visible dans Factures)

### EPIC 2 — Factures normales multimode
- Story 2.1 : Case à cocher + enchaînement sans fermeture dans `ModalPaiement.tsx` (factures + services-factures, même diff)
- Story 2.2 : Rafraîchissement de `facture.mt_restant`/`mt_acompte` en mémoire entre deux tranches (sans re-fetch complet si possible, via la réponse de `add_acompte_facture`)

### EPIC 3 — Reçu consolidé
- Story 3.1 : Extension `TicketData`/`generate-ticket-html.ts` pour lister N paiements
- Story 3.2 : Extension `ModalRecuGenere` pour lister N reçus (factures)
- Story 3.3 : Vérification affichage `ModalRecuVenteFlash.tsx` / `ModalFactureSuccess.tsx`

### EPIC 4 — Non-régression & QA
- Story 4.1 : Vérifier `ListePaiements.tsx` / rapport encaissements par mode avec une vente à 2 tranches (doit afficher 2 lignes, pas de doublon de montant)
- Story 4.2 : Vérifier `VenteFlashEncaissementsCards.tsx` avec une vente Vente Flash partiellement payée (nouveau cas)
- Story 4.3 : Tests manuels croisés — mode `walletPaiement` (direct) vs mode QR classique, sur les deux flows

---

## 7. Risques & mitigations

| Risque | Mitigation |
|---|---|
| Régression sur le flow mono-mode existant (VenteFlash & factures), très utilisé en prod | Case décochée par défaut = chemin de code **inchangé** ; le code multimode est un branchement additif, pas une réécriture du chemin existant |
| Vente Flash partiellement payée abandonnée, jamais vue jusqu'ici dans ce module | Story 1.3 dédiée + vérification explicite des listings Vente Flash (Story 4.2) |
| Callback de polling wallet rappelé après la 2e tranche (closure stale) | Respecter le pattern déjà en mémoire (passer les valeurs en paramètres, pas via `useState` capturé — cf. règle projet) |
| Ticket/reçu qui casse l'affichage pour les ventes mono-mode existantes | Champs additionnels **optionnels** uniquement, aucun champ existant renommé/supprimé |

---

## 8. Plan de test (manuel, avant merge)

1. Vente Flash mono-mode (case décochée) : CASH puis WAVE puis OM — vérifier zéro changement de comportement.
2. Vente Flash multimode : 700 CASH + 500 OM sur une vente à 1200 F → 1 ticket consolidé, 2 lignes `recus_paiement` en base, `id_etat = 2`.
3. Vente Flash multimode abandonnée après la 1ère tranche → facture visible en "Impayée" avec le bon `mt_restant`.
4. Facture normale (Commerce) : acompte multimode 2 tranches → `ModalRecuGenere` consolidé, rapport encaissements affiche 2 lignes.
5. Facture Prestataire (`services-factures`) : même scénario que #4.
6. CASH en tranche finale avec surplus → monnaie à rendre correcte sur le **reste**, pas sur le total.
7. Profil CAISSIER : montant "reste à encaisser" bien visible pendant l'encaissement malgré `canViewCA = false`.
8. Mode `walletPaiement = true` (paiement direct sans QR) en multimode, sur les 2 flows.
