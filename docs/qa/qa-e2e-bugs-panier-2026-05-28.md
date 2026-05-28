# Rapport QA E2E — Bugs Proforma + Bon de Commande (panier flottant)

**Date** : 2026-05-28
**Auteur** : Mansour Thiam (Ingenieur QA Senior)
**Branche** : `feature/bons-commande-fournisseurs`
**Environnement** : http://localhost:3000 (dev server)
**Compte test** : `admin@chezkelefa.fay` / structure 218 LIBRAIRIE CHEZ KELEFA SCAT URBAM (compte_prive=true)
**Outil** : Chrome DevTools MCP en pilotage automatise

---

## 1. Resume executif

| Indicateur | Valeur |
|------------|--------|
| **Bugs reproduits** | 2 / 2 (Proforma + BC) |
| **Severite** | P0 — BLOQUANTE production |
| **Root cause** | Identifiee precisement, unique pour les deux bugs |
| **Score global** | 35 / 100 (Rouge) |
| **Issues critiques** | 1 (cause racine commune) |
| **Issues majeures** | 1 (collision cle localStorage) |
| **Effort correctif** | ~30 lignes de code dans `app/dashboard/commerce/produits/page.tsx` |

### Verdict

> **Les modes Proforma et Bon de Commande sont totalement inutilisables depuis la page Produits.**
> Aucun article ne peut etre ajoute aux panniers Proforma/BC, ce qui rend impossible la creation de tout document autre qu'une facture. La bascule entre les 3 modes du dropdown (Phase 6) montre bien des paniers distincts mais **un seul est alimente** : celui de la facture.

---

## 2. Root cause commune (CRIT-001)

### 2.1 Diagnostic

La page Produits (`app/dashboard/commerce/produits/page.tsx`) n'a **jamais ete adaptee** au pattern Phase 6 (3 stores Zustand independants). Elle utilise uniquement le store facture pour tous les ajouts au panier :

```typescript
// app/dashboard/commerce/produits/page.tsx:207
const addArticle = usePanierStore(state => state.addArticle);

// app/dashboard/commerce/produits/page.tsx:518 (dans handleModeVenteConfirm)
addArticle(modeVenteProduit, modeVenteQuantity, prixChoisi);
```

**Aucune reference** a `usePanierProformaStore` ni `usePanierBonCommandeStore` dans ce fichier (verifie par `grep` exhaustif).

### 2.2 Consequences

- En mode Facture : panier alimente correctement, bouton "Commander" visible et fonctionnel.
- En mode Proforma : panier Proforma toujours vide, footer non rendu (`{articles.length > 0 && ...}` du `PanierSidePanel.tsx` ligne 834), bouton "Proforma" indisponible, **soumission impossible**.
- En mode BC : memes symptomes, **soumission impossible**.

### 2.3 Preuve empirique (localStorage)

Apres avoir ajoute 2 produits au panier en mode Facture, puis bascule sur Proforma puis BC :

```json
{
  "activeMode": "bonCommande",
  "factureStoreKeys": ["panier"],
  "proformaStoreExists": false,
  "bcStoreExists": false
}
```

- `fayclick-panier-proforma` : **inexistant** en localStorage (jamais ecrit -> jamais d'articles)
- `fayclick-panier-bon-commande` : **inexistant** en localStorage (idem)
- Le mode est bien persiste correctement par `PanierSidePanel.tsx:143` mais ne sert a rien si aucun store n'est alimente.

---

## 3. Bug #1 — Proforma (PROF-001)

### 3.1 Reproduction steps

1. Login `admin@chezkelefa.fay` / `777301221@`
2. Navigation `Mes Produits` -> `/dashboard/commerce/produits`
3. Click bouton "Afficher le panier lateral"
4. Click "Vendre" sur produit "100 TRUCS POUR REUSSIR SA VIE DANS LES SIMS 4" -> modal Mode Vente
5. Click "Ajouter au panier" -> compteur panier passe a 1
6. Repeter avec "16 HISTOIRES DE BELLES PRINCESSES" -> compteur a 2
7. **Click sur le bouton "Proforma" du dropdown 3 modes** (segmented control en haut du panier)

### 3.2 Resultat attendu

Les 2 articles ajoutes restent visibles dans le panel (mode Proforma), un bouton "Proforma" en bas pour soumettre. Le panier-proforma doit etre persiste sous la cle `fayclick-panier-proforma`.

### 3.3 Resultat constate

- Le panier affiche "0 article" et "Panier vide" immediatement apres le switch.
- Le footer (zone bouton "Proforma" / "Annuler") n'est **pas rendu** (condition `articles.length > 0` echoue).
- **Aucune erreur console, aucun appel reseau** : c'est un bug purement de state management, pas une erreur runtime.
- Si l'utilisateur ajoute un nouveau produit alors que le mode "Proforma" est actif, le produit va quand meme dans le store Facture (revisible apres switch retour Facture).

### 3.4 Captures de preuve

- `docs/qa/screenshots/02-bug-proforma-panier-vide.png` : panier vide en mode Proforma alors qu'il y avait 2 articles avant le switch.
- `docs/qa/screenshots/03-bug-proforma-impossible-soumettre.png` : aucun bouton submit visible.

### 3.5 Root cause

**Identique a CRIT-001** : la page Produits n'alimente que `usePanierStore`. Le store Proforma (`usePanierProformaStore`, cle `fayclick-panier-proforma`) n'est jamais ecrit. L'adaptateur `PanierSidePanel.tsx:168-227` lit bien `proformaPanier.articles` mais ce tableau est toujours vide.

### 3.6 Patch suggere

Modifier `app/dashboard/commerce/produits/page.tsx` pour brancher l'ajout d'article au store actif selon le mode. Le mode est gere localement dans `PanierSidePanel.tsx` (state React + localStorage). La page Produits doit observer ce mode pour router les ajouts. **Le `storage` event natif ne fonctionne PAS pour des changements intra-onglet** ; il faut donc soit un Context React (recommande), soit un CustomEvent.

#### Option A — RECOMMANDEE : Context React partage (propre, robuste)

**1. Creer `contexts/DocumentModeContext.tsx`** :
```typescript
'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type DocumentMode = 'facture' | 'proforma' | 'bonCommande';

interface DocumentModeContextValue {
  mode: DocumentMode;
  setMode: (m: DocumentMode) => void;
}

const DocumentModeContext = createContext<DocumentModeContextValue | null>(null);

export function DocumentModeProvider({ children }: { children: ReactNode }) {
  const { structure } = useAuth();
  const idStructure = structure?.id_structure ?? 0;
  const storageKey = `fayclick_panier_mode_${idStructure}`;

  const [mode, setModeState] = useState<DocumentMode>(() => {
    if (typeof window === 'undefined' || !idStructure) return 'facture';
    const stored = localStorage.getItem(storageKey);
    if (stored === 'facture' || stored === 'proforma' || stored === 'bonCommande') return stored;
    return 'facture';
  });

  // Re-hydrater si idStructure change apres mount (login tardif)
  useEffect(() => {
    if (!idStructure) return;
    const stored = localStorage.getItem(storageKey);
    if (stored === 'facture' || stored === 'proforma' || stored === 'bonCommande') {
      setModeState(stored);
    }
  }, [idStructure, storageKey]);

  const setMode = useCallback((m: DocumentMode) => {
    setModeState(m);
    if (typeof window !== 'undefined' && idStructure) {
      localStorage.setItem(storageKey, m);
    }
  }, [idStructure, storageKey]);

  return (
    <DocumentModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DocumentModeContext.Provider>
  );
}

export function useDocumentMode() {
  const ctx = useContext(DocumentModeContext);
  if (!ctx) throw new Error('useDocumentMode must be used within DocumentModeProvider');
  return ctx;
}
```

**2. Wrapper l'arbre dashboard commerce** (dans `app/dashboard/commerce/layout.tsx` ou un layout proche) avec `<DocumentModeProvider>`.

**3. Refactor `PanierSidePanel.tsx`** :
- Remplacer le `useState<DocumentMode>` ligne 122-130 et le `useEffect` de persistance ligne 140-144 par `const { mode: documentMode, setMode: setDocumentMode } = useDocumentMode()`.
- Supprimer la duplication de logique localStorage.

**4. Refactor `app/dashboard/commerce/produits/page.tsx`** :
```typescript
// Imports
import { usePanierProformaStore } from '@/stores/panierProformaStore';
import { usePanierBonCommandeStore } from '@/stores/panierBonCommandeStore';
import { useDocumentMode } from '@/contexts/DocumentModeContext';

// Dans le composant — remplacer la ligne 207 (un seul addArticle)
const facturePanier = usePanierStore();
const proformaPanier = usePanierProformaStore();
const bcPanier = usePanierBonCommandeStore();
const { mode: documentMode } = useDocumentMode();

// Conserver les usages existants pour la facture (compteur, etc.) :
const panierArticles = facturePanier.articles;  // ou selon mode actif si besoin
const setModalOpen = facturePanier.setModalOpen;

// Remplacer la ligne 518 :
// AVANT : addArticle(modeVenteProduit, modeVenteQuantity, prixChoisi);
// APRES :
if (documentMode === 'proforma') {
  proformaPanier.addArticle(modeVenteProduit, modeVenteQuantity, prixChoisi);
} else if (documentMode === 'bonCommande') {
  // ATTENTION : signature 2 args seulement. Le prix est resolu via cout_revient
  // dans le store (panierBonCommandeStore.ts:118 resolvePrixBC).
  bcPanier.addArticle(modeVenteProduit, modeVenteQuantity);
} else {
  facturePanier.addArticle(modeVenteProduit, modeVenteQuantity, prixChoisi);
}
```

**5. Verifier le `useEffect` cleanup ligne 212-217** : le `clearPanier()` au unmount ne nettoie que la facture. Selon souhait UX, il faudrait soit conserver le state cross-page (ne rien clean), soit clean les 3 stores. Recommande **ne pas clean** au unmount — l'utilisateur s'attend a retrouver son brouillon de proforma/BC en revenant.

**6. Verifier les signatures `addArticle`** (verifie 2026-05-28) :
- `usePanierStore.addArticle(produit, quantity?, prixApplique?)` — **3 args**
- `usePanierProformaStore.addArticle(produit, quantity?, prixApplique?)` — **3 args** (identique facture)
- `usePanierBonCommandeStore.addArticle(produit, quantity?)` — **2 args seulement** (prix BC = cout_revient, resolu en interne)

**Ne pas passer `prixChoisi` au store BC** sous peine de TS error (signature) ou bug silencieux (ignore).

#### Option B — Minimaliste avec CustomEvent (acceptable si pas de temps pour Context)

Si refactor de Context indisponible, ajouter dans `PanierSidePanel.tsx:140-144` (apres le `localStorage.setItem`) :
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  if (!comptePrive || !ENABLE_DOCUMENT_DROPDOWN) return;
  localStorage.setItem(`fayclick_panier_mode_${idStructure}`, documentMode);
  // Emettre un event intra-onglet pour que la page Produits puisse reagir
  window.dispatchEvent(new CustomEvent('fayclick:document-mode-changed', { detail: { mode: documentMode, idStructure } }));
}, [documentMode, comptePrive, idStructure]);
```

Puis cote page Produits, hook custom :
```typescript
function useDocumentMode(idStructure: number): DocumentMode {
  const [mode, setMode] = useState<DocumentMode>(() => {
    if (typeof window === 'undefined' || !idStructure) return 'facture';
    const stored = localStorage.getItem(`fayclick_panier_mode_${idStructure}`);
    return (stored === 'facture' || stored === 'proforma' || stored === 'bonCommande') ? stored : 'facture';
  });
  useEffect(() => {
    if (!idStructure) return;
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ mode: DocumentMode; idStructure: number }>;
      if (ce.detail?.idStructure === idStructure) setMode(ce.detail.mode);
    };
    window.addEventListener('fayclick:document-mode-changed', onChange);
    return () => window.removeEventListener('fayclick:document-mode-changed', onChange);
  }, [idStructure]);
  return mode;
}
```

L'event `storage` natif **N'EST PAS UTILISABLE** ici — il ne s'emet qu'entre onglets distincts (limitation MDN documentee). C'est la raison pour laquelle l'Option B utilise un CustomEvent.

#### Recommandation finale

**Option A (Context React)**. Elle est :
- propre architecturalement (single source of truth)
- testable
- evite les race conditions de hydratation
- elimine la duplication de logique localStorage entre `PanierSidePanel.tsx` et la page Produits
- s'etend naturellement a d'autres composants qui auront besoin du mode (mobile `ModalPanier.tsx`, etc.)

L'Option B est acceptable comme **hotfix court terme** mais a refactoriser en Option A dans le sprint suivant.

### 3.7 Verification recommandee apres patch

1. Sur la page Produits, mode "Facture" : ajouter 2 articles -> panier facture peuple, panier proforma/BC vides.
2. Switch sur "Proforma" : panier proforma vide (normal a ce stade), ajouter 1 article -> panier proforma peuple, panier facture inchange.
3. Switch sur "BC" : panier BC vide, ajouter 1 article -> panier BC peuple, panier proforma + facture inchanges.
4. Switch retour "Facture" : retrouver les 2 articles initiaux.
5. Verifier `localStorage` : `fayclick-panier`, `fayclick-panier-proforma`, `fayclick-panier-bon-commande` doivent contenir leurs articles respectifs.

---

## 4. Bug #2 — Bon de Commande (BC-001)

### 4.1 Reproduction steps

Identique au Bug Proforma jusqu'a l'etape 6, puis :

7. **Click sur le bouton "BC"** du dropdown (segmented control)

### 4.2 Resultat attendu

Idem que pour proforma : 2 articles visibles dans le panel BC (color sky/blue), badges "PV" oranges sur articles a `cout_revient = 0`, bouton "Selectionner le fournisseur" cliquable, bouton "Bon de Commande" en bas.

### 4.3 Resultat constate

- Panier vide -> impossible d'aller plus loin.
- Aucune erreur console / network.
- Si on ajoute un produit en mode BC actif, il va dans le store Facture (preuve : `localStorage` ne contient toujours pas `fayclick-panier-bon-commande`).

### 4.4 Captures de preuve

- `docs/qa/screenshots/04-bug-bc-panier-vide.png`

### 4.5 Root cause

**Identique a PROF-001 / CRIT-001**. La page Produits n'a aucune connaissance des stores Proforma/BC.

Le service `bon-commande.service.ts` est par ailleurs correctement implemente (verifie ligne 159-168 : signature PG conforme a la spec, escapeSql, format `articles_string` "id-qty-cout#" avec trailing #). Le store `panierBonCommandeStore.ts` est conforme a la spec aussi (resolvePrixBC ligne 87-90, persistance ligne 286). Le bug est **purement cote integration** avec la page Produits.

### 4.6 Patch suggere

Identique a la section 3.6 — **un seul patch corrige les deux bugs**. Le routage cote `handleModeVenteConfirm` doit traiter le mode `bonCommande` :

```typescript
} else if (documentMode === 'bonCommande') {
  // ATTENTION : signature 2 args (pas 3 comme facture/proforma).
  // Le store BC resout lui-meme prix_applique = cout_revient (fallback prix_vente)
  // via resolvePrixBC() dans panierBonCommandeStore.ts:87-90.
  bcPanier.addArticle(modeVenteProduit, modeVenteQuantity);
}
```

**Signature confirmee par lecture du code** :
- `stores/panierBonCommandeStore.ts:34` : `addArticle: (produit: Produit, quantity?: number) => void;`
- vs `stores/panierStore.ts:35` et `stores/panierProformaStore.ts:34` : `addArticle: (produit: any, quantity?: number, prixApplique?: number) => void;`

C'est **volontaire** (cf. spec Phase 5 dans `docs/dba/bon-commande-spec.md`) : le prix BC est toujours `cout_revient` (resolu via `resolvePrixBC` au moment de l'add). **Ne pas passer `prixChoisi` au store BC** sous peine de TS error ou bug silencieux.

**Si un workflow futur necessite un prix BC custom** (override manuel par le user), passer plutot par `bcPanier.updatePrixArticle(id_produit, prix)` qui existe deja (ligne 180-186 du store).

---

## 5. Findings annexes

### 5.0 CRIT-002 — Meme bug sur la version MOBILE du panier (ModalPanier.tsx)

**Verifie par grep** : `components/panier/ModalPanier.tsx:16` importe et utilise `usePanierStore` exclusivement (ligne 31 : `} = usePanierStore()`). **Aucune reference** a `usePanierProformaStore` ni `usePanierBonCommandeStore`.

**Consequence** : sur mobile (< 1024px), le meme bug se manifeste. Si l'utilisateur ouvre la modal panier en mode Proforma ou BC, le panier sera vide.

**Mais — verification a faire** : il faut s'assurer que le dropdown 3 modes est aussi expose en version mobile. Si le mode Proforma/BC n'est accessible qu'en desktop (panel lateral), alors le bug mobile est theorique uniquement. **Tester en viewport < 1024px** apres patch desktop.

**Recommandation** : appliquer le meme correctif (router selon `documentMode`) a `ModalPanier.tsx` apres la refacto Context.

### 5.0bis OK — VenteFlash N'EST PAS impacte

`app/dashboard/commerce/venteflash/page.tsx` utilise correctement DEUX stores selectionnes selon un mode local (`panierVFMultiStore` vs `panierStore`). Le pattern y est correct. **Pas de bug ici**.

### 5.1 MAJ-001 — Collision de cle localStorage `fayclick-panier` (preexistant)

Deux stores Zustand utilisent la meme cle de persistance :

| Fichier | Cle | Structure persistee |
|---------|-----|---------------------|
| `stores/panierStore.ts:256` | `fayclick-panier` | `{ articles, infosClient, remise, acompte }` |
| `stores/produitsStore.ts:271` | `fayclick-panier` | `{ panier: { items, total, nombreArticles, isOpen } }` |

Le dernier middleware Zustand a `set` ecrase l'autre. Constate empiriquement : apres ajout d'articles via la page Produits, `localStorage.fayclick-panier` contient la structure `{ panier: { items: [] } }` de `produitsStore`, pas celle de `panierStore`. Heureusement les articles restent en memoire React, donc le bug n'est visible qu'apres reload (perte du panier facture sur F5).

**Recommandation** : Renommer la cle de `produitsStore.ts` en `fayclick-produits-store` (plus semantiquement correct vu qu'il stocke deja un objet produits).

**Severite** : MAJEURE — perte de panier facture apres reload de la page. Non lie aux 2 bugs P0 mais a corriger.

### 5.2 MIN-001 — Console log non gardee en production

`app/dashboard/commerce/produits/page.tsx:214` : `console.log('🧹 [PRODUITS] Nettoyage panier - sortie de page')`. A wrap dans `process.env.NODE_ENV !== 'production'` ou supprimer.

### 5.3 MIN-002 — Useless `void stockDisponible` dans store BC

`stores/panierBonCommandeStore.ts:143` : `void stockDisponible` apres avoir declare la variable mais ne l'avoir jamais consommee. A nettoyer.

### 5.4 SUG-001 — Pattern context React partage pour le mode document

Le mode (`facture` / `proforma` / `bonCommande`) est actuellement gere en state local dans `PanierSidePanel.tsx`. La page Produits doit le re-lire (via localStorage + storage event ou polling). Une refactorisation en context partage (`DocumentModeContext`) eviterait :
- la duplication de la logique de lecture
- les bugs de synchro inter-onglets vs intra-onglets
- les race conditions de hydratation

---

## 6. Plan d'action prioritaire

### Immediat (P0 — bloquant prod)

1. **Creer `contexts/DocumentModeContext.tsx`** (Option A, recommande). Voir section 3.6.
2. **Refactorer `PanierSidePanel.tsx`** pour consommer le context au lieu du state local + localStorage duplique.
3. **Patcher `app/dashboard/commerce/produits/page.tsx`** :
   - Importer les 3 stores
   - Utiliser `useDocumentMode()` du context
   - Router `handleModeVenteConfirm` (ligne 518) selon le mode
   - **Attention aux signatures** : facture/proforma = 3 args, BC = 2 args (cf. 3.6 point 6)
   - Verifier le useEffect cleanup ligne 212-217 (eviter de clean les 3 stores au unmount sans accord PO)
4. **Verifier scan code-barres** : chercher dans `page.tsx` un autre endroit qui appelle `addArticle` (recherche `addArticle\(` complete). Memes patch a appliquer.
5. **Patcher `components/panier/ModalPanier.tsx` (mobile)** si le dropdown 3 modes est expose sur mobile (a confirmer par test viewport < 1024px). Memes ajustements que pour PanierSidePanel.
6. **Tester manuellement** les 3 modes apres patch (procedure section 3.7) + version mobile.

### Court terme (P1)

7. **Corriger la collision de cle `fayclick-panier`** entre `panierStore.ts` et `produitsStore.ts`. Renommer celle de `produitsStore` en `fayclick-produits-store`. **Migration de donnees** : code de migration pour les utilisateurs existants (lire ancienne cle, ecrire nouvelle).
8. Couvrir par **tests unitaires** :
   - Routage page Produits selon documentMode (mock context + verifier le bon store recoit l'article)
   - Stores Proforma + BC : signatures `addArticle`, persistance
9. **Tests E2E Playwright** : scenario complet pour les 3 modes (ajout / switch / soumission).

### Moyen terme (P2)

10. Documenter dans `CLAUDE.md` le pattern : "page consommatrice de panier = utiliser useDocumentMode() + router selon mode".
11. Auditer toutes les pages utilisant `usePanierStore` directement pour verifier qu'elles gerent bien les 3 modes ou qu'elles sont volontairement scope facture seulement (ex : page factures = facture only).
12. Nettoyer les findings mineurs (MIN-001, MIN-002).

---

## 7. Donnees techniques captures

### 7.1 Etat localStorage final (apres scenario complet)

```json
{
  "fayclick_panier_mode_218": "bonCommande",
  "fayclick-panier": { "state": { "panier": { "items": [], "total": 0, "nombreArticles": 0 } } },
  "fayclick-panier-proforma": null,
  "fayclick-panier-bon-commande": null
}
```

### 7.2 Network requests pendant le scenario

Aucune requete liee a la creation Proforma / BC (les boutons submit n'apparaissent jamais a cause du panier vide). Seules les requetes de chargement initial (`/api/sql` pour produits, parametres, droits) ont eu lieu, toutes 200 OK.

### 7.3 Console errors / warnings

Aucun. Le bug est silencieux cote runtime — c'est purement un probleme de logique d'integration store / UI.

---

## 8. Points positifs constates

- L'architecture Phase 6 (3 stores Zustand independants) est **correctement implementee** au niveau des stores eux-memes.
- L'adaptateur `PanierAdapter` dans `PanierSidePanel.tsx:168-227` est elegant et bien pense — il ne souffre d'aucun bug intrinseque.
- Le service `bon-commande.service.ts` respecte la spec PG (signature `create_bon_commande`, format `articles_string`, escapeSql, gestion des erreurs).
- Le store `panierBonCommandeStore.ts` est complet et conforme a la spec (resolvePrixBC, getArticlesAvecCoutManquant, persistance correcte).
- Le feature flag `ENABLE_DOCUMENT_DROPDOWN` permet un rollback rapide vers la version legacy (checkbox proforma) si necessaire.
- La separation legacy / nouveau render dans `PanierSidePanelLegacy` est bien isolee (pas de bit-rot).

**Le bug est donc une omission ciblee** : la page Produits a ete oubliee lors de l'implementation Phase 6. Un patch chirurgical (~30 lignes) suffit a la mise en conformite.

---

## 9. Conclusion

Les deux bugs signales par le PO ont la meme root cause unique : **la page `app/dashboard/commerce/produits/page.tsx` n'a jamais ete adaptee a l'architecture Phase 6 a 3 stores**. Elle continue a alimenter exclusivement le store facture, rendant les modes Proforma et BC totalement inutilisables.

Le correctif est simple, focalise (un seul fichier + un helper hook ou context) et n'a aucun impact sur :
- le code BD (pas de migration necessaire)
- les services API (deja conformes)
- le feature flag rollback (preserve)
- le code legacy

**Recommandation** : appliquer le patch en P0, deployer en local, executer le scenario de verification (section 3.7), puis merger sur main apres validation PO.

---

**Fichiers references** :
- `D:\React_Prj\fayclick\components\panier\PanierSidePanel.tsx` (correct — adaptateur fonctionnel)
- `D:\React_Prj\fayclick\app\dashboard\commerce\produits\page.tsx` (a patcher — ligne 207 + 518)
- `D:\React_Prj\fayclick\stores\panierStore.ts` (correct)
- `D:\React_Prj\fayclick\stores\panierProformaStore.ts` (correct — jamais utilise)
- `D:\React_Prj\fayclick\stores\panierBonCommandeStore.ts` (correct — jamais utilise)
- `D:\React_Prj\fayclick\stores\produitsStore.ts` (a patcher — ligne 271 collision cle)
- `D:\React_Prj\fayclick\services\bon-commande.service.ts` (correct)
- `D:\React_Prj\fayclick\services\proforma.service.ts` (correct)

**Captures** : `D:\React_Prj\fayclick\docs\qa\screenshots\01..04-*.png`
