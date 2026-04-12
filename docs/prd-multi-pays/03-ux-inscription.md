# PRD UX — Inscription multi-pays FayClick V2

> **Agent** : UX Designer
> **Date** : 2026-04-12
> **Scope** : Refonte du champ téléphone sur `app/register/page.tsx` (Step 1) + apparition dynamique du champ Email Gmail pour les pays hors Sénégal.
> **Langue UI** : FR uniquement (MVP)
> **Thème** : Glassmorphism vert émeraude (cohérent avec l'existant — `reg_glass-input`, `reg_glass-card`)

---

## 1. Spec du composant `CountryPhoneInput`

### 1.1 Objectif

Remplacer le préfixe statique `+221` (lignes 576-591 de `app/register/page.tsx`) par un dropdown drapeau + indicatif **intégré visuellement au champ téléphone**, permettant à l'utilisateur de sélectionner son pays parmi les 17 pays CEDEAO + Maghreb supportés au MVP.

### 1.2 Anatomie

```
┌─────────────────────────────────────────────────────────────┐
│  [ 🇸🇳 +221 ▾ ]  │  77 123 45 67                            │
│   └─ trigger ─┘    └─── input tel ─────┘                    │
└─────────────────────────────────────────────────────────────┘
       ↑ bouton-dropdown                ↑ input[type="tel"]
       (largeur fixe ~110px)            (flex-1)
```

- **Conteneur** : `div.flex.rounded-xl` reprenant les bordures et backdrop-blur de `reg_glass-input` (le conteneur englobe visuellement les deux zones).
- **Trigger (gauche)** : `button[type="button"]` — drapeau emoji + indicatif (`+221`) + chevron `▾`.
- **Input (droite)** : `input[type="tel"]` flex-1 avec `borderTopLeftRadius: 0; borderBottomLeftRadius: 0`.

### 1.3 États

| État | Rendu |
|------|-------|
| **Fermé (défaut)** | `🇸🇳 +221 ▾` — Sénégal actif par défaut |
| **Ouvert** | Dropdown panel glassmorphism sous le champ, liste des 17 pays scrollable, chevron devient `▴` |
| **Focus input** | Bordure verte emeraude (`#10b981`) comme `reg_glass-input:focus` |
| **Erreur** | Bordure rouge + message sous le champ |
| **Disabled** | Opacity 50%, cursor `not-allowed` |

### 1.4 Props TypeScript

```tsx
interface CountryPhoneInputProps {
  /** Valeur actuelle du numéro de téléphone (sans indicatif) */
  value: string;
  /** Code ISO 2 lettres du pays sélectionné (ex: 'SN', 'CI') */
  countryCode: string;
  /** Callback appelé à chaque changement — fournit phone ET countryCode */
  onChange: (phone: string, countryCode: string) => void;
  /** Message d'erreur à afficher sous le champ (optionnel) */
  error?: string;
  /** Nom du champ HTML (pour compatibilité form) — défaut: 'phoneOM' */
  name?: string;
  /** Label ARIA personnalisé */
  ariaLabel?: string;
  /** Désactive le composant */
  disabled?: boolean;
}
```

### 1.5 Comportement du change handler

```tsx
// Changement de pays
const handleCountrySelect = (newIso: string) => {
  setOpen(false);
  // On garde le numéro saisi mais on notifie le parent
  onChange(value, newIso);
  // Revalidation automatique côté parent via useEffect sur countryCode
  // Focus auto sur l'input téléphone
  phoneInputRef.current?.focus();
};

// Changement de numéro
const handlePhoneChange = (e) => {
  // On nettoie tout caractère non numérique ni espace
  const cleaned = e.target.value.replace(/[^\d\s]/g, '');
  onChange(cleaned, countryCode);
};
```

Le **placeholder** de l'input est reformaté selon le pays (voir section 2 — colonne "exemple placeholder").

---

## 2. Liste des 17 pays — Métadonnées UX

| code_iso | drapeau | nom français       | indicatif | longueur tel | exemple placeholder |
|----------|---------|--------------------|-----------|--------------|---------------------|
| **SN**   | 🇸🇳     | Sénégal (défaut)   | +221      | 9            | `77 123 45 67`      |
| CI       | 🇨🇮     | Côte d'Ivoire      | +225      | 10           | `01 23 45 67 89`    |
| ML       | 🇲🇱     | Mali               | +223      | 8            | `70 12 34 56`       |
| BF       | 🇧🇫     | Burkina Faso       | +226      | 8            | `70 12 34 56`       |
| TG       | 🇹🇬     | Togo               | +228      | 8            | `90 12 34 56`       |
| BJ       | 🇧🇯     | Bénin              | +229      | 8            | `90 12 34 56`       |
| NE       | 🇳🇪     | Niger              | +227      | 8            | `90 12 34 56`       |
| GN       | 🇬🇳     | Guinée             | +224      | 9            | `620 12 34 56`      |
| GW       | 🇬🇼     | Guinée-Bissau      | +245      | 9            | `955 123 456`       |
| SL       | 🇸🇱     | Sierra Leone       | +232      | 8            | `76 123 456`        |
| LR       | 🇱🇷     | Libéria            | +231      | 8            | `77 123 456`        |
| GH       | 🇬🇭     | Ghana              | +233      | 9            | `24 123 4567`       |
| NG       | 🇳🇬     | Nigéria            | +234      | 10           | `803 123 4567`      |
| CV       | 🇨🇻     | Cap-Vert           | +238      | 7            | `991 2345`          |
| MA       | 🇲🇦     | Maroc              | +212      | 9            | `612 345 678`       |
| DZ       | 🇩🇿     | Algérie            | +213      | 9            | `551 23 45 67`      |
| TN       | 🇹🇳     | Tunisie            | +216      | 8            | `20 123 456`        |

### 2.1 Structure du fichier de données

À placer dans `lib/countries.ts` (création phase implémentation) :

```tsx
export interface Country {
  iso: string;            // 'SN'
  flag: string;           // '🇸🇳'
  nameFr: string;         // 'Sénégal'
  dialCode: string;       // '+221'
  phoneLength: number;    // 9
  placeholder: string;    // '77 123 45 67'
}

export const COUNTRIES: Country[] = [ /* 17 entrées */ ];
export const DEFAULT_COUNTRY = 'SN';
```

---

## 3. Flow dynamique du champ Email

### 3.1 Condition d'apparition

Le champ email apparaît **uniquement si `countryCode !== 'SN'`**. Position : **après le champ téléphone, avant le Benefits Grid** (Step 1 — `app/register/page.tsx` ligne ~596).

### 3.2 Animation (framer-motion)

```tsx
<AnimatePresence initial={false}>
  {formData.countryCode !== 'SN' && (
    <motion.div
      key="email-field"
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ overflow: 'hidden' }}
    >
      {/* champ email avec label + input + validation inline */}
    </motion.div>
  )}
</AnimatePresence>
```

### 3.3 Règles de validation inline

- **Requis** (`*` rouge dans le label) dès que `countryCode !== 'SN'`.
- **Regex Gmail stricte** : `/^[^\s@]+@gmail\.com$/i`
- **Messages** :
  - Erreur : `Email Gmail requis (ex: vous@gmail.com)` — couleur `text-red-400`
  - Succès : `✓ Email Gmail valide` — couleur `text-emerald-400`
- **Déclenchement** : onBlur + onChange (après premier blur — pattern "touched")

### 3.4 Justification UX

Hors Sénégal, le SMS transactionnel (OTP PIN connexion) est indisponible au MVP (voir audit 00). L'email Gmail est le canal de secours — **imposer Gmail** garantit la délivrabilité OTP (pas de filtrage spam agressif) et simplifie le routeur SMS/Email côté back.

---

## 4. Validation téléphone par pays

### 4.1 Mapping longueurs attendues

```tsx
export const PHONE_LENGTH_BY_COUNTRY: Record<string, number> = {
  SN: 9, CI: 10, ML: 8, BF: 8, TG: 8, BJ: 8, NE: 8,
  GN: 9, GW: 9, SL: 8, LR: 8, GH: 9, NG: 10, CV: 7,
  MA: 9, DZ: 9, TN: 8
};
```

### 4.2 Fonction de validation

```tsx
export function validatePhoneByCountry(phone: string, countryIso: string): {
  valid: boolean;
  message?: string;
} {
  const cleaned = phone.replace(/\D/g, '');
  const expected = PHONE_LENGTH_BY_COUNTRY[countryIso];
  const country = COUNTRIES.find(c => c.iso === countryIso);

  if (!expected || !country) {
    return { valid: false, message: 'Pays non supporté' };
  }
  if (cleaned.length === 0) {
    return { valid: false, message: 'Numéro requis' };
  }
  if (cleaned.length !== expected) {
    return {
      valid: false,
      message: `Numéro invalide : attendu ${expected} chiffres pour ${country.nameFr}`
    };
  }
  return { valid: true };
}
```

### 4.3 Revalidation au changement de pays

Quand `countryCode` change alors que `phone` est déjà rempli :
- Le numéro **est conservé** (on ne vide pas le champ).
- La validation est relancée immédiatement avec la nouvelle longueur attendue.
- Si invalide, le message d'erreur s'affiche (mais sans bloquer l'UI avant blur).

---

## 5. Wireframes ASCII

### 5.1 Avant (existant)

```
┌─────────────────────────────────────────────────────────┐
│  📱 Téléphone Orange Money *                            │
│  ┌──────┬──────────────────────────────────────────┐   │
│  │ +221 │ 77 123 45 67                             │   │
│  └──────┴──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Après — état fermé (Sénégal par défaut)

```
┌─────────────────────────────────────────────────────────┐
│  📱 Téléphone Orange Money *                            │
│  ┌────────────┬────────────────────────────────────┐   │
│  │ 🇸🇳 +221 ▾ │ 77 123 45 67                       │   │
│  └────────────┴────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Après — état ouvert (dropdown visible)

```
┌─────────────────────────────────────────────────────────┐
│  📱 Téléphone Orange Money *                            │
│  ┌────────────┬────────────────────────────────────┐   │
│  │ 🇸🇳 +221 ▴ │ 77 123 45 67                       │   │
│  └────────────┴────────────────────────────────────┘   │
│  ╔═══════════════════════════════════════════════════╗ │
│  ║ 🔍 Rechercher...                                  ║ │
│  ║───────────────────────────────────────────────────║ │
│  ║ 🇸🇳  +221   Sénégal                           ✓  ║ │
│  ║ 🇨🇮  +225   Côte d'Ivoire                         ║ │
│  ║ 🇲🇱  +223   Mali                                  ║ │
│  ║ 🇧🇫  +226   Burkina Faso                          ║ │
│  ║ 🇹🇬  +228   Togo                                  ║ │
│  ║ 🇧🇯  +229   Bénin                                 ║ │
│  ║ 🇳🇪  +227   Niger           ↓ (scroll pour 11+)   ║ │
│  ╚═══════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Après — pays ≠ SN sélectionné (email apparaît)

```
┌─────────────────────────────────────────────────────────┐
│  📱 Téléphone Orange Money *                            │
│  ┌────────────┬────────────────────────────────────┐   │
│  │ 🇨🇮 +225 ▾ │ 01 23 45 67 89                     │   │
│  └────────────┴────────────────────────────────────┘   │
│                                                         │
│  ✉️  Email Gmail *                   ← slide-down 250ms │
│  ┌─────────────────────────────────────────────────┐   │
│  │ vous@gmail.com                                  │   │
│  └─────────────────────────────────────────────────┘   │
│  ✓ Email Gmail valide                                  │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Après — retour à SN (email disparaît)

```
┌─────────────────────────────────────────────────────────┐
│  📱 Téléphone Orange Money *                            │
│  ┌────────────┬────────────────────────────────────┐   │
│  │ 🇸🇳 +221 ▾ │ 77 123 45 67                       │   │
│  └────────────┴────────────────────────────────────┘   │
│                                                         │
│  (champ email disparu — animation exit 250ms)          │
│  (valeur email gardée en state pour retour éventuel)   │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Micro-interactions

| Interaction | Comportement | Timing |
|-------------|--------------|--------|
| Clic sur trigger pays | Dropdown slide-down + fade-in | 150ms `ease-out` |
| Sélection d'un pays | Dropdown se ferme + flash emeraude sur trigger (box-shadow pulse) + focus auto input téléphone | 200ms |
| Changement pays (tel rempli) | Numéro conservé, validation relancée, placeholder mis à jour | Instantané |
| Changement vers non-SN | Champ email slide-down + focus auto sur email | 250ms |
| Changement vers SN | Champ email slide-up (exit), **valeur gardée en state** (restaurée si retour à non-SN) | 250ms |
| Hover sur option pays | Background `rgba(16, 185, 129, 0.15)` | 100ms |
| Option sélectionnée | Check vert `✓` à droite | — |
| Clic en dehors | Fermeture du dropdown | Instantané |
| Esc | Fermeture + focus retourne au trigger | Instantané |

---

## 7. Impact CSS / Classes Tailwind

### 7.1 Réutilisation de l'existant

- **Conteneur input** : même base que `reg_glass-input` (voir `app/globals.css` L865-887) — bordure glassmorphism, focus vert emeraude.
- **Carte dropdown** : dérive de `reg_glass-card` (blur 20px, border white/15, shadow).

### 7.2 Nouvelles classes à ajouter dans `globals.css` (section `@layer components`)

```css
/* === Multi-country phone input === */

/* Trigger bouton (partie gauche du champ tel) */
.reg_country-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.875rem 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-right: none;
  border-top-left-radius: 0.75rem;
  border-bottom-left-radius: 0.75rem;
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 110px;
}

.reg_country-trigger:hover {
  background: rgba(255, 255, 255, 0.12);
}

.reg_country-trigger:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

.reg_country-trigger[aria-expanded="true"] {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
}

/* Dropdown panel */
.reg_country-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  background: rgba(20, 40, 30, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 0.875rem;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
  z-index: 50;
  padding: 0.375rem;
}

/* Scrollbar custom (cohérent thème vert) */
.reg_country-dropdown::-webkit-scrollbar {
  width: 6px;
}
.reg_country-dropdown::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.4);
  border-radius: 3px;
}

/* Ligne option */
.reg_country-option {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.1s ease;
}

.reg_country-option:hover,
.reg_country-option[data-focused="true"] {
  background: rgba(16, 185, 129, 0.18);
}

.reg_country-option[aria-selected="true"] {
  background: rgba(16, 185, 129, 0.28);
  font-weight: 600;
}

.reg_country-option .flag {
  font-size: 1.25rem;
  line-height: 1;
}

.reg_country-option .dial {
  color: rgba(255, 255, 255, 0.65);
  min-width: 44px;
}

.reg_country-option .check {
  margin-left: auto;
  color: #10b981;
}

/* Flash confirmation sélection */
@keyframes reg_country-flash {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
  100% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}

.reg_country-trigger.reg_country-flash {
  animation: reg_country-flash 400ms ease-out;
}
```

### 7.3 Snippet JSX de référence

```tsx
<div className="relative flex">
  <button
    type="button"
    className="reg_country-trigger"
    aria-label={`Pays sélectionné : ${country.nameFr}, indicatif ${country.dialCode}`}
    aria-expanded={open}
    aria-haspopup="listbox"
    onClick={() => setOpen(!open)}
  >
    <span className="text-lg">{country.flag}</span>
    <span>{country.dialCode}</span>
    <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>

  <input
    ref={phoneInputRef}
    type="tel"
    inputMode="numeric"
    className="reg_glass-input flex-1"
    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
    placeholder={country.placeholder}
    maxLength={country.phoneLength + 3} // marge espaces
    value={value}
    onChange={handlePhoneChange}
  />

  {open && (
    <ul role="listbox" className="reg_country-dropdown">
      {COUNTRIES.map((c, idx) => (
        <li
          key={c.iso}
          role="option"
          aria-selected={c.iso === countryCode}
          data-focused={idx === focusedIndex}
          className="reg_country-option"
          onClick={() => handleCountrySelect(c.iso)}
        >
          <span className="flag">{c.flag}</span>
          <span className="dial">{c.dialCode}</span>
          <span>{c.nameFr}</span>
          {c.iso === countryCode && <Check className="check w-4 h-4" />}
        </li>
      ))}
    </ul>
  )}
</div>
```

---

## 8. Accessibilité (WCAG 2.1 AA)

### 8.1 ARIA

| Élément | Attributs ARIA |
|---------|----------------|
| Trigger `<button>` | `aria-label="Sélectionner le pays"`, `aria-expanded={open}`, `aria-haspopup="listbox"`, `aria-controls="country-listbox"` |
| Dropdown `<ul>` | `role="listbox"`, `id="country-listbox"`, `aria-activedescendant={idFocusedOption}` |
| Option `<li>` | `role="option"`, `aria-selected={true/false}`, `id="country-opt-{iso}"` |
| Input tel | `aria-describedby="phone-error"` quand erreur, `aria-invalid={hasError}` |
| Champ email (conditionnel) | `aria-required="true"`, `aria-describedby="email-help email-error"` |

### 8.2 Navigation clavier

| Touche | Action |
|--------|--------|
| `Tab` | Focus séquentiel : trigger → input tel → (email si visible) |
| `Enter` / `Space` sur trigger | Ouvre/ferme le dropdown |
| `↓` dans dropdown | Focus option suivante (wrap au début) |
| `↑` dans dropdown | Focus option précédente (wrap à la fin) |
| `Home` / `End` | Première / dernière option |
| `Enter` sur option | Sélectionne + ferme + focus input tel |
| `Esc` | Ferme dropdown, focus revient au trigger |
| Tap lettre (A-Z) | Saute à la 1re option dont `nameFr` commence par cette lettre |

### 8.3 Contraste

- Drapeaux emoji : rendu natif OS — contraste garanti car **fond sombre vert translucide** (`rgba(20,40,30,0.92)` dans dropdown).
- Indicatif `+XXX` : blanc 65% opacité sur fond sombre ≈ ratio 7:1 (AAA).
- Option hover : fond vert 18% opacité — lisibilité préservée.

### 8.4 Lecteurs d'écran

Annonce attendue NVDA/VoiceOver à l'ouverture : *"Sénégal, sélectionné, option 1 sur 17, liste déroulante"*.

---

## 9. Cohérence responsive

### 9.1 Breakpoints respectés

Le composant suit la grille existante du register (voir `space-y-3 md:space-y-6` ligne 570+) :
- Mobile (<768px) : padding 0.875rem, font 0.875rem, trigger minWidth **100px** (au lieu de 110).
- Desktop (≥768px) : padding 1rem, font 1rem, trigger minWidth 120px.

### 9.2 Dropdown mobile

```css
/* Mobile : dropdown plein cadre du champ, pas de débordement */
.reg_country-dropdown {
  max-height: 280px; /* ≈ 7 options visibles, scroll pour voir les 10 autres */
}

@media (max-width: 360px) {
  .reg_country-dropdown {
    max-height: 240px;
  }
  .reg_country-option {
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
  }
  .reg_country-trigger {
    min-width: 96px;
    padding: 0.75rem 0.5rem;
    font-size: 0.8125rem;
  }
}
```

### 9.3 Zéro débordement sub-360px

- Drapeau (1.25rem) + dialCode (`+XXX` ≈ 36px) + chevron (16px) + gaps (6+6) = **~96px** → tient dans un écran 320px avec input à droite (≥ 200px restants).
- Test obligatoire : iPhone SE 1 (320×568) et Galaxy Fold plié (280px logical — hors scope, fallback accepté).

### 9.4 Cohérence avec les changements récents

- Conserver `space-y-3 md:space-y-6` sur le parent (step 1).
- Ne pas introduire de `space-y-4` intermédiaire — le slide-down de l'email gère son propre `marginTop`.
- Le Benefits Grid (ligne 598+) reste après l'email et conserve son `hidden sm:grid` — pas d'impact.

---

## 10. Critères d'acceptation UX

- [ ] Dropdown listant les 17 pays dans l'ordre défini (SN en premier).
- [ ] Sélection SN par défaut au chargement.
- [ ] Placeholder du tel change selon pays sélectionné.
- [ ] Email Gmail apparaît uniquement si `countryCode !== 'SN'` avec animation < 300ms.
- [ ] Validation tel par pays avec message dynamique incluant longueur attendue + nom pays.
- [ ] Navigation clavier complète (Tab, flèches, Enter, Esc) fonctionnelle.
- [ ] Aucun débordement horizontal sur viewport 320px.
- [ ] Glassmorphism vert cohérent avec `reg_glass-input` / `reg_glass-card`.
- [ ] Flash de confirmation visible à la sélection d'un pays.
- [ ] Changement de pays revalide tel sans vider le champ.
- [ ] Retour vers SN masque email mais **préserve la valeur en state**.

---

## 11. Hors scope (pour rappel)

- Recherche texte dans le dropdown : **optionnelle MVP** (prévue mais non bloquante — cf. wireframe 5.3, ligne "🔍 Rechercher..." en pointillé).
- Détection auto du pays via IP / navigator.language : **hors MVP**.
- i18n des noms de pays : FR only.
- Validation regex complète par opérateur mobile local : **hors MVP** (seule la longueur est validée).
- Wallets non-SN (OM CI, MTN GH, etc.) : **hors MVP** — le champ tel reste unique.

---

**Fin du PRD UX — 03-ux-inscription.md**
