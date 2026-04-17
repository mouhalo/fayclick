# Guide i18n — FayClick V2

Guide rapide pour ajouter/maintenir les traductions FR/EN.

## Architecture

```
contexts/LanguageContext.tsx     ← locale + setLocale + persistance localStorage
hooks/useTranslations.ts         ← hook t(key, params?) avec fallback FR
messages/fr.json                 ← traductions françaises (défaut)
messages/en.json                 ← traductions anglaises
lib/format-locale.ts             ← helpers formatDate / formatNumber / formatCurrency
components/ui/LanguageSwitcher   ← dropdown FR/EN
scripts/check-i18n-keys.mjs      ← lint parité clés
```

## Utilisation dans un composant

```tsx
'use client';

import { useTranslations } from '@/hooks/useTranslations';

export default function MyComponent() {
  const t = useTranslations('myNamespace');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome', { name: 'Amadou' })}</p>
      <button>{t('actions.save')}</button>
    </div>
  );
}
```

## Ajouter une clé

1. Ouvrir `messages/fr.json` et `messages/en.json`
2. Ajouter la clé dans **les deux fichiers** dans le bon namespace
3. Lancer `npm run i18n:check` pour vérifier la parité

**Exemple** :
```json
// messages/fr.json
{
  "myNamespace": {
    "title": "Mon titre",
    "welcome": "Bienvenue {name}"
  }
}

// messages/en.json
{
  "myNamespace": {
    "title": "My title",
    "welcome": "Welcome {name}"
  }
}
```

## Créer un nouveau namespace

1. Ajouter le namespace dans `messages/fr.json` ET `messages/en.json`
2. Aucune autre configuration nécessaire — le typage est automatique via `Namespace = keyof typeof fr`.

## Clés imbriquées

Jusqu'à 3 niveaux autorisés :

```json
{
  "settings": {
    "profile": {
      "name": "Nom"
    }
  }
}
```

```tsx
t('profile.name')
```

## Interpolation

Placeholders `{variable}` :

```json
{ "step": "Étape {current}/{total}" }
```

```tsx
t('step', { current: 2, total: 4 }) // "Étape 2/4"
```

## Formatage de données

### Dates

```tsx
import { formatDate, formatDateTime } from '@/lib/format-locale';
import { useLanguage } from '@/contexts/LanguageContext';

const { locale } = useLanguage();
formatDate(new Date(), locale);     // "14/04/2026" (fr) | "4/14/2026" (en)
formatDateTime(new Date(), locale); // "14/04/2026 12:30"
```

### Nombres

```tsx
import { formatNumber } from '@/lib/format-locale';

formatNumber(1234.56, locale);
// fr → "1 234,56"
// en → "1,234.56"
```

### Devise

La devise vient de `structure.devise` / `structure.code_devise`. Fallback : `FCFA`.

```tsx
import { formatCurrency } from '@/lib/format-locale';
import { useStructure } from '@/hooks/useStructure';

const { structure } = useStructure();
const { locale } = useLanguage();

formatCurrency(1500, locale, structure);
// "1 500 FCFA" ou "1,500 XOF" selon structure + locale
```

## Conventions

### Noms de clés
- En anglais technique : `submitButton`, `errorNetworkTimeout`, pas en français.
- camelCase : `maxCharacters`, pas `max_characters`.
- Hiérarchique : `step1.title`, `errors.network`.

### Namespaces
- Par surface fonctionnelle : `auth`, `register`, `landing`, `dashboard-commerce`, etc.
- Un seul `common` pour les strings partagées (boutons, labels génériques).

### Interpolation
- Variables entre accolades simples : `{name}`, `{count}`.
- Pas de logique conditionnelle dans les strings (pluriels : créer 2 clés `oneItem`/`manyItems` pour l'instant).

## Fallback

Si une clé est absente de la locale active :
1. Essai en FR (français = source de vérité).
2. Si absent partout → la clé brute s'affiche + warning console.

Toujours renseigner les deux fichiers pour éviter les warnings en prod.

## Switch de langue

```tsx
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

<LanguageSwitcher variant="dark" />  // fond sombre (landing, dashboards)
<LanguageSwitcher variant="light" /> // fond clair (pages publiques)
<LanguageSwitcher variant="glass" /> // glassmorphism
<LanguageSwitcher compact />         // sans label texte (juste drapeau)
```

## Lint

```bash
npm run i18n:check
```

Sort avec code 1 si divergence FR↔EN. À lancer avant chaque commit i18n.

## Checklist PR i18n

- [ ] Toutes les strings visibles sont passées par `t(...)`.
- [ ] Les deux fichiers `fr.json` + `en.json` mis à jour.
- [ ] `npm run i18n:check` passe.
- [ ] `npm run build` passe (0 erreur TS).
- [ ] Test visuel FR + EN sur les pages modifiées.
- [ ] Aucun warning console `[i18n] Missing ...`.

## Support Wolof (`wo`)

Ajouté en avril 2026. Troisième locale après FR et EN.

### Orthographe : Wolof pragmatique francisé

Choix assumé : écriture proche du français pour un public sénégalais alphabétisé en français, plutôt que l'orthographe officielle du décret 2005-981 (qui utilise `ñ`, `ë`, `à`, `é`).

**Règles :**
- Pas de diacritiques : `ñ` → `gn`, `ë` → `e`, `x` → `kh`
- Les doubles voyelles sont simplifiées quand le sens reste clair
- Emprunts modernes au français conservés tels quels (voir liste ci-dessous)

### Glossaire terminologique (appliquer à tous les namespaces)

#### Actions UI

| Français | Wolof |
|---|---|
| Retour | Dellu |
| Suivant | Topp |
| Précédent | Kanam |
| Chargement... | Dafay ñëw... |
| Soumettre | Yonnee |
| Annuler | Bañ |
| Enregistrer | Denc |
| Modifier | Soppi |
| Supprimer | Far |
| Requis | Laajtelu na |
| Optionnel | Du fàww |
| Fermer | Tëj |
| Confirmer | Nangu |
| Continuer | Jëkk ba noppi |
| Réessayer | Jéem waat |
| Rechercher | Seet |
| Oui | Waaw |
| Non | Déedéet |
| Connexion | Dugg |
| Déconnexion | Génn |
| Ajouter | Yokk |
| Imprimer | Imprimé |
| Partager | Séddale |
| Télécharger | Téléchargé |
| Voir | Xool |
| Détails | Détails |

#### Statuts

| Français | Wolof |
|---|---|
| Payé | Fay na |
| Impayé | Feyul |
| En attente | Xaar |
| Brouillon | Brouillon |
| Actif | Dafa dox |
| Inactif | Doxul |
| Validé | Nangu na |
| Annulé | Bañ na |
| Terminé | Jeex na |
| En cours | Àngi doxee |
| Nouveau | Bees |

#### Rôles & personnes

| Français | Wolof |
|---|---|
| Administrateur | Admin |
| Caissier | Keesu |
| Client | Jaaykat / Client |
| Marchand | Jaaykat |
| Prestataire | Jëfandikoo |
| Élève | Jàngalekat |
| Parent | Waajur |
| Utilisateur | Jëfandikoo |

#### Domaine métier FayClick

| Français | Wolof |
|---|---|
| Facture | Facture |
| Reçu | Reçu |
| Panier | Panier |
| Article / Produit | Jumtukaay |
| Stock | Stock |
| Dépense | Dépense |
| Prestation | Liggéey |
| Devis | Devis |
| Proforma | Proforma |
| Wallet | Wallet |
| Retrait | Génn xaalis |
| Abonnement | Abonnement |
| Structure | Mbootaay |
| Boutique | Bitig |
| École | Daara / École |
| Argent | Xaalis |
| Prix | Njëg |
| Total | Total |
| Montant | Xaalis bi |
| Quantité | Limu |
| Nom | Tur |
| Téléphone | Telefon |
| Adresse | Adrees |
| Vente | Jaay |
| Achat | Jënd |
| Paiement | Paiement |
| Remise | Wàññi |
| Acompte | Acompte |
| Solde | Solde |

#### Emprunts conservés en français

Ces termes modernes sont utilisés tels quels en Wolof urbain (Dakar) et doivent rester en français dans les traductions :

`facture`, `wallet`, `paiement`, `Orange Money`, `Wave`, `Free Money`, `QR code`, `SMS`, `PIN`, `code`, `email`, `login`, `admin`, `abonnement`, `menu`, `option`, `page`, `stock`, `proforma`, `devis`, `dashboard`.

### Principes de traduction

1. **Garder les placeholders `{param}`** tels quels — ne jamais les traduire (`{count}`, `{length}`, etc.)
2. **Ton** : informel et direct, comme un commerçant s'adresse à un autre
3. **Cohérence** : toujours appliquer les termes du glossaire, même si une autre traduction serait possible
4. **Longueur** : rester proche de la longueur FR pour ne pas casser les layouts UI
5. **Noms propres** : "FayClick", "Orange Money", "Wave", "ICELABSOFT" ne se traduisent jamais

### Validation

Après toute modification de `wo.json` :
```bash
npm run i18n:check
```

Doit afficher : `✅ Parité parfaite FR / EN / WO (clés + placeholders).`
