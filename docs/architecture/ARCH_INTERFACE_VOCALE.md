# Architecture : Interface Vocale FayClick

> **Document Architecture BMAD** | Projet: FayClick V2

---

## Informations

| Champ | Valeur |
|-------|--------|
| **Projet** | FayClick V2 |
| **Fonctionnalite** | Interface Vocale |
| **PRD Source** | `docs/bmad/prd/PRD_INTERFACE_VOCALE.md` |
| **Version** | 1.0 |
| **Date** | 2026-01-21 |
| **Auteur** | System Architect Agent |
| **Statut** | Draft |

---

## Vue d'Ensemble

### Objectif Architectural

Concevoir une interface vocale permettant aux commercants senegalais d'interagir avec FayClick par commandes vocales en francais, avec une architecture extensible pour le Wolof en Phase 2. Le systeme doit fonctionner entierement cote client pour minimiser les couts et la latence.

### Principes Directeurs

1. **Client-Side First** : Traitement vocal local via Web Speech API (0 cout serveur)
2. **Progressive Enhancement** : L'app fonctionne sans vocal, le vocal est un bonus
3. **Performance Mobile** : Optimise pour reseaux 3G et appareils entree de gamme
4. **Securite** : Aucun audio stocke, traitement ephemere uniquement
5. **Extensibilite** : Architecture modulaire pour ajout langues (Wolof Phase 2)

### Architectural Drivers

| ID | NFR | Exigence | Impact |
|----|-----|----------|--------|
| AD-001 | Performance | STT < 2s, Feedback < 500ms | Web Speech API local, pas de serveur |
| AD-002 | Precision | > 85% francais, > 90% intention | NLU local avec patterns + fuzzy match |
| AD-003 | Securite | Aucun audio stocke | Traitement streaming, pas de persistence |
| AD-004 | Compatibilite | Chrome Android, Safari iOS | Web Speech API + fallback Google Cloud |
| AD-005 | i18n | Extensible FR -> Wolof | Modules langues chargeables dynamiquement |

---

## Diagramme d'Architecture

```
+======================================================================+
|                          FayClick PWA (Next.js)                       |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  |                    COUCHE PRESENTATION                          |  |
|  |  +---------------+  +---------------+  +---------------------+  |  |
|  |  |  VoiceButton  |  |VoiceFeedback  |  |  TranscriptOverlay  |  |  |
|  |  |  (FAB flott.) |  | (Waveform)    |  |  (Texte+Intent)     |  |  |
|  |  +-------+-------+  +-------+-------+  +----------+----------+  |  |
|  +----------|-----------------|----------------------|-------------+  |
|             |                 |                      |                |
|             v                 v                      v                |
|  +----------------------------------------------------------------+  |
|  |                    COUCHE SERVICES (Hooks)                      |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |
|  |  |                     useVoice() Hook                         |  |
|  |  |  +------------+  +------------+  +-----------------------+  |  |
|  |  |  |AudioCapture|->| STT API    |->| VoiceState Management |  |  |
|  |  |  |(MediaRec.) |  |(WebSpeech) |  | (Zustand voiceStore)  |  |  |
|  |  |  +------------+  +------------+  +-----------------------+  |  |
|  |  +------------------------------------------------------------+  |
|  |                              |                                    |
|  |                              v                                    |
|  |  +------------------------------------------------------------+  |
|  |  |                     NLU Service (Local)                     |  |
|  |  |  +------------+  +-------------+  +----------------------+  |  |
|  |  |  |IntentParser|->|EntityExtract|->| ConfidenceScorer     |  |  |
|  |  |  |(Patterns)  |  |(RegEx+Fuzzy)|  | (0-1 score)          |  |  |
|  |  |  +------------+  +-------------+  +----------------------+  |  |
|  |  +------------------------------------------------------------+  |
|  |                              |                                    |
|  |                              v                                    |
|  |  +------------------------------------------------------------+  |
|  |  |                  Command Dispatcher                         |  |
|  |  |  +------------+  +-------------+  +----------------------+  |  |
|  |  |  |Navigation  |  |Search       |  | Action               |  |  |
|  |  |  |Handler     |  |Handler      |  | Handler              |  |  |
|  |  |  +------------+  +-------------+  +----------------------+  |  |
|  |  +------------------------------------------------------------+  |
|  +----------------------------------------------------------------+  |
|                              |                                        |
|                              v                                        |
|  +----------------------------------------------------------------+  |
|  |              INTEGRATIONS EXISTANTES FayClick                   |  |
|  |  +------------+  +------------+  +------------+  +------------+ |  |
|  |  |panierStore |  |produitsAPI |  |clientsAPI  |  |Next Router | |  |
|  |  |(Zustand)   |  |(service)   |  |(service)   |  |            | |  |
|  |  +------------+  +------------+  +------------+  +------------+ |  |
|  +----------------------------------------------------------------+  |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  |                     APIS EXTERNES                               |  |
|  |  +------------------------+  +-------------------------------+  |  |
|  |  |   Web Speech API       |  | Google Cloud Speech (Fallback)|  |  |
|  |  |   (Navigateur natif)   |  | (Si Web Speech indisponible)  |  |  |
|  |  +------------------------+  +-------------------------------+  |  |
|  +----------------------------------------------------------------+  |
+======================================================================+
```

### Acces Base de Donnees

> **Note importante** : L'Interface Vocale n'accede PAS directement a la base de donnees.
> Elle utilise les services existants (produits, clients, panier) qui eux appellent l'API.

| Contexte | Methode | Service |
|----------|---------|---------|
| Recherche produit | `produits.service.ts` | Existant |
| Recherche client | `clients.service.ts` | Existant |
| Ajout panier | `panierStore` | Existant |
| Navigation | `next/router` | Existant |

---

## Structure des Fichiers

### Nouveaux Fichiers a Creer

```
fayclick/
+-- components/
|   +-- voice/
|       +-- VoiceButton.tsx           # Bouton micro flottant (FAB)
|       +-- VoiceFeedback.tsx         # Animation + waveform ecoute
|       +-- TranscriptOverlay.tsx     # Affichage texte reconnu + intent
|       +-- VoiceProvider.tsx         # Context React global
|       +-- ConfirmationDialog.tsx    # Dialog confirmation (70-85% conf.)
|       +-- index.ts                  # Exports centralises
|
+-- hooks/
|   +-- useVoice.ts                   # Hook principal gestion vocale
|   +-- useAudioLevel.ts              # Hook niveau audio (waveform)
|   +-- useSpeechRecognition.ts       # Hook abstraction STT
|
+-- services/
|   +-- voice/
|       +-- nlu.service.ts            # Natural Language Understanding
|       +-- command-dispatcher.ts     # Dispatch vers handlers
|       +-- patterns/
|           +-- patterns.fr.ts        # Patterns francais
|           +-- patterns.wo.ts        # Patterns Wolof (Phase 2)
|           +-- synonyms.fr.ts        # Synonymes francais
|
+-- stores/
|   +-- voiceStore.ts                 # Zustand store etat vocal
|
+-- types/
|   +-- voice.types.ts                # Interfaces TypeScript vocales
|
+-- lib/
|   +-- voice/
|       +-- handlers/
|           +-- navigation.handler.ts # Handler commandes navigation
|           +-- search.handler.ts     # Handler commandes recherche
|           +-- action.handler.ts     # Handler commandes actions
|       +-- audio/
|           +-- audio-capture.ts      # Capture MediaRecorder
|           +-- silence-detector.ts   # Detection fin parole
|
+-- public/
|   +-- sounds/
|       +-- voice-start.wav           # Son activation micro
|       +-- voice-success.wav         # Son commande reussie
|       +-- voice-error.wav           # Son erreur
|
+-- docs/
    +-- architecture/
        +-- ARCH_INTERFACE_VOCALE.md  # Ce document
```

### Fichiers Existants a Modifier

| Fichier | Modification | Impact |
|---------|-------------|--------|
| `app/dashboard/layout.tsx` | Ajouter `<VoiceProvider>` et `<VoiceButton>` | Faible |
| `stores/panierStore.ts` | Exporter types pour integration | Faible |
| `services/produits.service.ts` | Ajouter `searchProduits(query)` si absent | Moyen |
| `tailwind.config.ts` | Ajouter animations vocales custom | Faible |

---

## Schema Base de Donnees

### Aucune Nouvelle Table Requise

L'Interface Vocale fonctionne entierement cote client et utilise les services existants.
Aucune modification de base de donnees n'est necessaire pour Phase 1.

### Fonctions PostgreSQL Utilisees (Existantes)

```sql
-- Recherche produits (existant)
SELECT * FROM get_mes_produits(pid_structure);

-- Recherche clients (existant)
SELECT * FROM get_list_clients(pid_structure, ptel_client);

-- Creation produit (existant)
SELECT * FROM add_edit_produit(pid_structure, ...);
```

### Future Consideration (Analytics Phase 2+)

```sql
-- Table potentielle pour analytics vocales (NON REQUIS Phase 1)
-- voice_analytics (
--     id SERIAL PRIMARY KEY,
--     id_structure INTEGER,
--     command_text VARCHAR(500),
--     intent VARCHAR(50),
--     confidence NUMERIC(4,3),
--     executed BOOLEAN,
--     created_at TIMESTAMP DEFAULT NOW()
-- );
```

---

## API Design

### Architecture API

**Principe cle** : Tout le traitement vocal est cote client.
Aucune API serveur supplementaire n'est requise pour Phase 1.

### APIs Externes Utilisees

#### 1. Web Speech API (Navigateur - Primaire)

```typescript
// Initialisation
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Configuration
recognition.lang = 'fr-FR';
recognition.continuous = false;
recognition.interimResults = true;
recognition.maxAlternatives = 1;

// Events
recognition.onresult = (event: SpeechRecognitionEvent) => {
  const result = event.results[0];
  const transcript = result[0].transcript;
  const confidence = result[0].confidence;
  const isFinal = result.isFinal;
};

recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  // Handle: 'no-speech', 'audio-capture', 'not-allowed', 'network'
};
```

#### 2. Google Cloud Speech (Fallback - Firefox)

```typescript
// Configuration API
const GOOGLE_SPEECH_API = 'https://speech.googleapis.com/v1/speech:recognize';

interface GoogleSpeechRequest {
  config: {
    encoding: 'WEBM_OPUS';
    sampleRateHertz: 48000;
    languageCode: 'fr-FR';
    alternativeLanguageCodes: ['fr-SN'];  // Francais Senegal
    enableAutomaticPunctuation: false;
    model: 'command_and_search';  // Optimise commandes courtes
  };
  audio: {
    content: string;  // Base64 audio
  };
}
```

### APIs Internes FayClick (Existantes)

| Action | Service | Methode |
|--------|---------|---------|
| Recherche produit | `produits.service.ts` | `getProduits()` + filtre local |
| Recherche client | `clients.service.ts` | `getListeClients()` + filtre local |
| Ajout panier | `panierStore` | `addArticle(produit, quantite)` |
| Creation produit | `produits.service.ts` | `createProduit(data)` |
| Navigation | `next/navigation` | `router.push(path)` |

---

## Specifications Composants

### Hook useVoice()

```typescript
// hooks/useVoice.ts

interface UseVoiceOptions {
  language?: 'fr-FR' | 'wo-SN';
  onTranscript?: (text: string, isFinal: boolean) => void;
  onIntent?: (result: NLUResult) => void;
  onError?: (error: VoiceError) => void;
  autoStop?: boolean;        // Default: true
  silenceThreshold?: number; // Default: 1500ms
  maxDuration?: number;      // Default: 10000ms
}

interface UseVoiceReturn {
  // Etat
  state: 'idle' | 'listening' | 'processing' | 'success' | 'error';
  transcript: string;
  interimTranscript: string;
  intent: NLUResult | null;
  confidence: number;
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  hasPermission: boolean | null;
  error: VoiceError | null;
  audioLevel: number;  // 0-100

  // Actions
  startListening: () => Promise<void>;
  stopListening: () => void;
  cancelCommand: () => void;
  confirmCommand: () => Promise<CommandResult>;
  requestPermission: () => Promise<boolean>;
  reset: () => void;
}

// Usage
function MonComposant() {
  const {
    state,
    transcript,
    intent,
    confidence,
    isListening,
    startListening,
    stopListening,
  } = useVoice({
    language: 'fr-FR',
    onIntent: (result) => {
      if (result.confidence > 0.85) {
        // Execution auto
        dispatcher.dispatch(result);
      }
    }
  });
}
```

### NLU Service

```typescript
// services/voice/nlu.service.ts

type IntentType =
  | 'NAVIGATION'
  | 'RECHERCHE_PRODUIT'
  | 'RECHERCHE_CLIENT'
  | 'AJOUT_PANIER'
  | 'CREATION_PRODUIT'
  | 'CONTROLE'
  | 'AIDE'
  | 'UNKNOWN';

interface NLUResult {
  intent: IntentType;
  entities: {
    produit?: string;
    quantite?: number;
    client?: string;
    page?: string;
    prix?: number;
    telephone?: string;
  };
  confidence: number;  // 0-1
  rawText: string;
  normalized: string;
  alternatives?: NLUResult[];
}

class NLUService {
  private patterns: Map<IntentType, CommandPattern[]>;
  private synonyms: Map<string, string[]>;

  parse(text: string, language: string = 'fr-FR'): NLUResult {
    const normalized = this.normalize(text);

    for (const [intent, patterns] of this.patterns) {
      for (const pattern of patterns) {
        const match = normalized.match(pattern.regex);
        if (match) {
          const entities = this.extractEntities(match, pattern);
          const confidence = this.calculateConfidence(normalized, intent, match);
          return { intent, entities, confidence, rawText: text, normalized };
        }
      }
    }

    return { intent: 'UNKNOWN', entities: {}, confidence: 0, rawText: text, normalized };
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Supprime accents
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateConfidence(text: string, intent: IntentType, match: RegExpMatchArray): number {
    // Facteurs: longueur match, presence entites, synonymes resolus
    let base = 0.7;
    if (match[0].length / text.length > 0.8) base += 0.15;
    if (Object.keys(this.extractEntities(match, null)).length > 0) base += 0.1;
    return Math.min(base, 1.0);
  }
}
```

### Patterns Francais

```typescript
// services/voice/patterns/patterns.fr.ts

export const FRENCH_PATTERNS: CommandPattern[] = [
  // NAVIGATION
  {
    intent: 'NAVIGATION',
    patterns: [
      /(?:va|aller|ouvre|montre|affiche)\s+(?:aux?|les?|la?|le?)?\s*(factures?|ventes?|tickets?)/i,
      /(?:va|aller|ouvre|montre|affiche)\s+(?:aux?|les?|la?|le?)?\s*(produits?|articles?|stock)/i,
      /(?:va|aller|ouvre|montre|affiche)\s+(?:aux?|les?|la?|le?)?\s*(clients?)/i,
      /(?:va|aller|ouvre|montre|affiche)\s+(?:le?)?\s*(panier)/i,
      /^retour$/i,
      /^page\s+precedente$/i,
      /^accueil$/i,
      /^dashboard$/i,
    ],
    extractors: {
      page: (match) => match[1] || 'accueil'
    }
  },

  // RECHERCHE PRODUIT
  {
    intent: 'RECHERCHE_PRODUIT',
    patterns: [
      /(?:cherche|trouve|ou\s+est)\s+(?:le?\s+)?(?:produit\s+)?(.+)/i,
      /(?:montre|affiche)\s+(?:le?\s+)?produit\s+(.+)/i,
    ],
    extractors: {
      produit: (match) => match[1].trim()
    }
  },

  // RECHERCHE CLIENT
  {
    intent: 'RECHERCHE_CLIENT',
    patterns: [
      /(?:cherche|trouve)\s+(?:le?\s+)?client\s+(.+)/i,
      /client\s+(\d{9})/i,  // Par telephone
      /(?:cherche|trouve)\s+(.+)/i,  // Fallback nom
    ],
    extractors: {
      client: (match) => match[1].trim(),
      telephone: (match) => /^\d{9}$/.test(match[1]) ? match[1] : undefined
    }
  },

  // AJOUT PANIER
  {
    intent: 'AJOUT_PANIER',
    patterns: [
      /(?:ajoute|mets|rajoute)\s+(\d+)?\s*(.+?)(?:\s+(?:au|dans\s+le)\s+panier)?$/i,
      /^(\d+)\s+(.+)$/i,  // Forme courte: "5 sacs de riz"
    ],
    extractors: {
      quantite: (match) => parseInt(match[1]) || 1,
      produit: (match) => match[2].trim()
    }
  },

  // CREATION PRODUIT
  {
    intent: 'CREATION_PRODUIT',
    patterns: [
      /(?:cree|nouveau)\s+produit\s+(.+?)\s+a\s+(\d+)\s*(?:francs?|fcfa)?/i,
    ],
    extractors: {
      produit: (match) => match[1].trim(),
      prix: (match) => parseInt(match[2])
    }
  },

  // CONTROLE
  {
    intent: 'CONTROLE',
    patterns: [
      /^annule$/i,
      /^stop$/i,
      /^arrete$/i,
      /^vide\s+(?:le\s+)?panier$/i,
    ],
    extractors: {}
  },

  // AIDE
  {
    intent: 'AIDE',
    patterns: [
      /^aide$/i,
      /^help$/i,
      /(?:qu.?est.?ce\s+que|comment)\s+(?:je\s+)?(?:peux|peut|faire)/i,
    ],
    extractors: {}
  }
];

export const FRENCH_SYNONYMS: Record<string, string[]> = {
  'factures': ['facture', 'ventes', 'vente', 'tickets', 'ticket', 'commandes', 'commande'],
  'produits': ['produit', 'articles', 'article', 'stock', 'inventaire'],
  'clients': ['client', 'clientele', 'acheteurs', 'acheteur'],
  'panier': ['chariot', 'caddie', 'commande'],
};
```

### Command Dispatcher

```typescript
// services/voice/command-dispatcher.ts

interface CommandHandler {
  intent: IntentType;
  execute: (entities: Record<string, any>, context: AppContext) => Promise<CommandResult>;
  validate: (entities: Record<string, any>) => ValidationResult;
  getConfirmationMessage: (entities: Record<string, any>) => string;
  getSuccessMessage: (entities: Record<string, any>, result: any) => string;
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  undoable: boolean;
  undoAction?: () => Promise<void>;
}

class CommandDispatcher {
  private handlers: Map<IntentType, CommandHandler>;
  private thresholds = { auto: 0.85, confirm: 0.70 };
  private lastCommand: { result: NLUResult; commandResult: CommandResult } | null = null;

  async dispatch(result: NLUResult, context: AppContext): Promise<DispatchResult> {
    const handler = this.handlers.get(result.intent);

    if (!handler) {
      return { action: 'error', message: 'Commande non reconnue' };
    }

    // Validation entites
    const validation = handler.validate(result.entities);
    if (!validation.valid) {
      return { action: 'error', message: validation.message };
    }

    // Decision basee sur confiance
    if (result.confidence >= this.thresholds.auto) {
      // Execution automatique
      const commandResult = await handler.execute(result.entities, context);
      this.lastCommand = { result, commandResult };
      return {
        action: 'executed',
        message: handler.getSuccessMessage(result.entities, commandResult.data),
        result: commandResult
      };
    } else if (result.confidence >= this.thresholds.confirm) {
      // Demande confirmation
      return {
        action: 'confirm',
        message: handler.getConfirmationMessage(result.entities),
        onConfirm: () => handler.execute(result.entities, context)
      };
    } else {
      // Rejet
      return {
        action: 'reject',
        message: 'Je n\'ai pas compris. Pouvez-vous reformuler?'
      };
    }
  }

  async undoLast(): Promise<boolean> {
    if (this.lastCommand?.commandResult.undoable && this.lastCommand.commandResult.undoAction) {
      await this.lastCommand.commandResult.undoAction();
      this.lastCommand = null;
      return true;
    }
    return false;
  }
}
```

---

## Flux de Donnees

### Flux Principal Vocal

```
+-------------+     +-------------+     +-------------+
| User        |     | VoiceButton |     | useVoice    |
| Tap Micro   |---->|  onClick()  |---->| startListen |
+-------------+     +------+------+     +------+------+
                           |                   |
                    +------v------+     +------v------+
                    |VoiceFeedback|     |Web Speech   |
                    |  Animation  |     |   API       |
                    +------+------+     +------+------+
                           |                   |
                           |            +------v------+
                           |            | onresult()  |
                           |            | transcript  |
                           |            +------+------+
                           |                   |
                           |            +------v------+
                           |            | NLU Service |
                           |            | parse()     |
                           |            +------+------+
                           |                   |
                    +------v------+     +------v------+
                    |Transcript   |<----|  NLUResult  |
                    |  Overlay    |     | intent,conf |
                    +------+------+     +------+------+
                           |                   |
                           |            +------v------+
                           |            | Dispatcher  |
                           |            | dispatch()  |
                           |            +------+------+
                           |                   |
       +-------------------+-------------------+-------------------+
       |                   |                   |                   |
+------v------+     +------v------+     +------v------+     +------v------+
| Navigation  |     | Search      |     | Action      |     | Feedback    |
| Handler     |     | Handler     |     | Handler     |     | Vocal       |
| router.push |     | filter list |     | panierStore |     | "5 riz..."  |
+-------------+     +-------------+     +-------------+     +-------------+
```

### Sequence Detaillee

```
User          VoiceButton    useVoice       WebSpeech      NLU         Dispatcher
 |                |              |              |            |              |
 |--tap micro---->|              |              |            |              |
 |                |--startListen>|              |            |              |
 |                |              |--start()---->|            |              |
 |                |              |              |            |              |
 |--"ajoute 5"-->|              |              |            |              |
 |  sacs de riz   |              |              |            |              |
 |                |              |<--interim----|            |              |
 |                |<--transcript-|              |            |              |
 |                |              |<--final------|            |              |
 |                |              |--parse()----------------->|              |
 |                |              |<--NLUResult---------------|              |
 |                |              |--dispatch()------------------------------>|
 |                |              |                           |<--execute()--|
 |                |              |                           |   panier.add |
 |                |              |<--CommandResult--------------------------|
 |<--feedback-----|<--success----|              |            |              |
 |  "5 sacs..."   |              |              |            |              |
```

---

## Securite

### Principes

| Aspect | Implementation |
|--------|----------------|
| Pas de stockage audio | Stream audio traite en temps reel, jamais sauvegarde |
| HTTPS obligatoire | Web Speech API requiert contexte securise |
| Permission explicite | Bouton activation, pas d'ecoute passive |
| Revocation | Detection changement permission, arret immediat |
| Timeout | Max 10s ecoute, arret auto apres 1.5s silence |

### Implementation

```typescript
// Verification securite
const initVoice = async () => {
  // Verifier HTTPS
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    throw new VoiceError('HTTPS_REQUIRED');
  }

  // Verifier permission
  const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });

  if (permission.state === 'denied') {
    throw new VoiceError('PERMISSION_DENIED');
  }

  // Ecouter revocation
  permission.addEventListener('change', () => {
    if (permission.state === 'denied') {
      voiceStore.getState().stopListening();
      voiceStore.getState().setPermission(false);
    }
  });
};
```

### Validation Donnees

```typescript
// Validation entites avant execution
const validateEntities = (entities: Record<string, any>): ValidationResult => {
  // Sanitization
  if (entities.produit) {
    entities.produit = entities.produit.slice(0, 100);  // Max 100 chars
  }

  // Validation quantite
  if (entities.quantite && (entities.quantite < 1 || entities.quantite > 10000)) {
    return { valid: false, message: 'Quantite invalide (1-10000)' };
  }

  // Validation prix
  if (entities.prix && (entities.prix < 1 || entities.prix > 100000000)) {
    return { valid: false, message: 'Prix invalide' };
  }

  return { valid: true };
};
```

---

## Performance

### Optimisations

| Technique | Implementation | Impact |
|-----------|----------------|--------|
| Code splitting | `dynamic(() => import('./VoiceButton'), { ssr: false })` | -30KB initial |
| Lazy patterns | Charger patterns langue a la demande | -15KB si non utilise |
| Web Workers | NLU parsing dans worker si lourd | UI non bloquee |
| Preload sons | `<link rel="preload" href="/sounds/voice-start.wav">` | Feedback instantane |

### Metriques Cibles

| Metrique | Cible | Mesure |
|----------|-------|--------|
| Temps activation | < 200ms | performance.now() |
| Temps STT | < 2s | Latence WebSpeech |
| Temps NLU | < 50ms | Parsing local |
| Temps feedback | < 500ms | Total bout-en-bout |
| Bundle vocal | < 50KB | next/bundle-analyzer |

### Implementation Lazy Loading

```typescript
// app/dashboard/layout.tsx
const VoiceButton = dynamic(
  () => import('@/components/voice/VoiceButton'),
  {
    ssr: false,
    loading: () => null  // Pas de placeholder
  }
);

const VoiceFeedback = dynamic(
  () => import('@/components/voice/VoiceFeedback'),
  { ssr: false }
);
```

---

## Strategie de Test

### Tests Unitaires

| Module | Couverture | Outils |
|--------|------------|--------|
| NLU Service | 95% | Jest, patterns test set |
| Command Handlers | 90% | Jest, mocks services |
| useVoice hook | 80% | React Testing Library |

### Tests NLU

```typescript
// __tests__/nlu.service.test.ts
describe('NLUService', () => {
  const nlu = new NLUService();

  describe('AJOUT_PANIER', () => {
    it.each([
      ['ajoute 5 sacs de riz', { quantite: 5, produit: 'sacs de riz' }],
      ['mets 3 bouteilles d\'huile', { quantite: 3, produit: "bouteilles d'huile" }],
      ['5 sucre', { quantite: 5, produit: 'sucre' }],
      ['ajoute du riz', { quantite: 1, produit: 'riz' }],
    ])('parse "%s" correctly', (input, expected) => {
      const result = nlu.parse(input);
      expect(result.intent).toBe('AJOUT_PANIER');
      expect(result.entities).toMatchObject(expected);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('NAVIGATION', () => {
    it.each([
      ['va aux factures', 'factures'],
      ['ouvre le panier', 'panier'],
      ['montre les produits', 'produits'],
      ['retour', 'retour'],
    ])('parse "%s" -> page "%s"', (input, expectedPage) => {
      const result = nlu.parse(input);
      expect(result.intent).toBe('NAVIGATION');
      expect(result.entities.page).toBe(expectedPage);
    });
  });
});
```

### Tests Integration

```typescript
// __tests__/voice-flow.integration.test.ts
describe('Voice Flow Integration', () => {
  it('complete flow: voice -> NLU -> action -> feedback', async () => {
    // Mock WebSpeech
    mockWebSpeechRecognition('ajoute 3 sacs de riz');

    // Render avec providers
    render(
      <VoiceProvider>
        <PanierProvider>
          <VoiceButton />
        </PanierProvider>
      </VoiceProvider>
    );

    // Activer voice
    fireEvent.click(screen.getByRole('button', { name: /micro/i }));

    // Attendre traitement
    await waitFor(() => {
      expect(panierStore.getState().articles).toHaveLength(1);
      expect(panierStore.getState().articles[0].quantite).toBe(3);
    });

    // Verifier feedback
    expect(screen.getByText(/3 sacs de riz ajoutés/i)).toBeInTheDocument();
  });
});
```

### Test Set Commandes (100 phrases)

Un fichier `__tests__/fixtures/voice-commands.json` avec 100 commandes test reelles sera cree pour mesurer la precision.

---

## Notes d'Implementation

### Patterns a Suivre

1. **Hook composition** : `useVoice()` compose `useSpeechRecognition()` + `useAudioLevel()`
2. **Services singleton** : `NLUService.getInstance()`
3. **Handlers registrables** : Pattern plugin pour nouveaux handlers
4. **Zustand slices** : voiceStore separe de panierStore

### Points d'Attention

- **iOS Safari** : Web Speech API avec limitations, tester specificement
- **Accents africains** : Prevoir synonymes phonetiques (ex: "ri" = "riz")
- **Bruit ambiant** : Seuil confiance ajustable selon environnement
- **Timeout UX** : 10s max, sinon frustration utilisateur

### References

- Code similaire : `hooks/useBackgroundSync.ts` (pattern async)
- Code similaire : `stores/panierStore.ts` (Zustand pattern)
- MDN Web Speech API : https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

---

## Tracabilite FRs

| FR | Composant(s) | Handler |
|----|--------------|---------|
| FR-001 Bouton Micro | VoiceButton | - |
| FR-002 Capture Audio | useVoice, useSpeechRecognition | - |
| FR-003 Feedback | VoiceFeedback, TranscriptOverlay | - |
| FR-004 STT | useSpeechRecognition | - |
| FR-005 NLU | NLUService | - |
| FR-006 Mapping | CommandDispatcher | All handlers |
| FR-007 Navigation | - | navigation.handler.ts |
| FR-008 Recherche Produit | - | search.handler.ts |
| FR-009 Recherche Client | - | search.handler.ts |
| FR-010 Ajout Panier | - | action.handler.ts |
| FR-011 Creation Produit | - | action.handler.ts |
| FR-012 Facture Rapide | - | action.handler.ts |
| FR-013 Wolof (P2) | patterns.wo.ts | - |
| FR-014 Switch Langue (P2) | VoiceProvider | - |

## Tracabilite NFRs

| NFR | Solution | Validation |
|-----|----------|------------|
| NFR-001 Performance | Web Speech local, lazy loading | Lighthouse, performance.now() |
| NFR-002 Precision | NLU patterns + fuzzy + synonymes | Test set 100 commandes |
| NFR-003 Securite | Pas stockage, HTTPS, timeout | Audit code, DevTools Network |
| NFR-004 Accessibilite | 56px button, dual feedback | Manual + Lighthouse a11y |
| NFR-005 Compatibilite | WebSpeech + Google fallback | Test Chrome/Safari/Firefox |
| NFR-006 i18n | Modules langues dynamiques | Ajout Wolof Phase 2 |

---

## Trade-offs

### Decision : NLU Local vs API Cloud

**Choix** : NLU local (JavaScript)

| Aspect | Local | Cloud (ex: Dialogflow) |
|--------|-------|------------------------|
| Latence | < 50ms | 200-500ms |
| Cout | 0 | $$/mois |
| Offline | Possible | Non |
| Precision | ~90% | ~95% |
| Maintenance | Patterns manuels | Auto-learning |

**Rationale** : Pour des commandes structurees avec vocabulaire limite, le local suffit. L'economie de cout et latence est prioritaire pour le marche Senegal.

### Decision : Web Speech API vs Whisper

**Choix** : Web Speech API primaire

| Aspect | Web Speech | Whisper |
|--------|------------|---------|
| Cout | Gratuit | API payante |
| Support | Chrome/Safari | Universel |
| Precision FR | ~85% | ~95% |
| Offline | Non | Possible (lourd) |

**Rationale** : Chrome Android = 80%+ du marche cible. Fallback Google Cloud pour les autres.

---

## Checklist de Validation

### Avant Developpement

- [x] PRD approuve (PRD_INTERFACE_VOCALE.md)
- [x] Architecture review effectuee
- [x] Dependances identifiees (services existants)
- [x] Aucune modification BD requise

### Apres Developpement

- [ ] Tests unitaires NLU > 95% couverture
- [ ] Tests integration flow complet
- [ ] Test set 100 commandes > 85% precision
- [ ] Performance < 2s validee
- [ ] Test Chrome Android
- [ ] Test Safari iOS
- [ ] Documentation utilisateur

---

## Historique

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | System Architect Agent | Creation initiale |
