/**
 * Hook personnalisé pour accéder facilement aux droits utilisateur PostgreSQL
 * Simplifie l'utilisation du système de droits get_mes_droits()
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasRight, rights } = useRights();
 *
 *   if (!hasRight("AJOUTER FACTURE")) {
 *     return <AccessDenied />;
 *   }
 *
 *   return <Button>Ajouter Facture</Button>;
 * }
 * ```
 */

import { useAuth } from '@/contexts/AuthContext';
import { UserRights } from '@/types/auth';
import { getAllowedFunctionalities, getDeniedFunctionalities } from '@/utils/permissions';

export interface UseRightsReturn {
  /** Droits utilisateur complets */
  rights: UserRights | null;

  /** Vérifie si l'utilisateur a un droit spécifique */
  hasRight: (functionalityName: string) => boolean;

  /** Vérifie si l'utilisateur a TOUS les droits spécifiés (ET logique) */
  hasAllRights: (functionalityNames: string[]) => boolean;

  /** Vérifie si l'utilisateur a AU MOINS UN des droits spécifiés (OU logique) */
  hasAnyRight: (functionalityNames: string[]) => boolean;

  /** Liste de toutes les fonctionnalités autorisées */
  allowedFunctionalities: string[];

  /** Liste de toutes les fonctionnalités refusées */
  deniedFunctionalities: string[];

  /** Profil de l'utilisateur (ex: "ADMIN", "USER") */
  profil: string | null;

  /** Nombre total de fonctionnalités */
  totalFunctionalities: number;

  /** Nombre de fonctionnalités autorisées */
  allowedCount: number;

  /** Nombre de fonctionnalités refusées */
  deniedCount: number;

  /** Indicateur de chargement */
  isLoading: boolean;

  /** Indicateur si les droits sont chargés */
  isReady: boolean;
}

/**
 * Hook pour accéder aux droits utilisateur depuis n'importe quel composant
 *
 * @returns Objet contenant les droits et fonctions utilitaires
 *
 * @example
 * ```tsx
 * // Vérifier un seul droit
 * const { hasRight } = useRights();
 * if (hasRight("AJOUTER FACTURE")) {
 *   // Afficher le formulaire
 * }
 *
 * // Vérifier plusieurs droits
 * const { hasAllRights, hasAnyRight } = useRights();
 * if (hasAllRights(["AJOUTER FACTURE", "MODIFIER FACTURE"])) {
 *   // L'utilisateur peut ajouter ET modifier
 * }
 * if (hasAnyRight(["VOIR DASHBOARD", "LISTER LES ENCAISSEMENTS"])) {
 *   // L'utilisateur peut faire au moins une de ces actions
 * }
 *
 * // Accéder aux statistiques
 * const { allowedCount, deniedCount, profil } = useRights();
 * console.log(`${profil}: ${allowedCount}/${totalFunctionalities} droits`);
 * ```
 */
export function useRights(): UseRightsReturn {
  const { rights, hasRight, hasAllRights, hasAnyRight, isLoading, isHydrated } = useAuth();

  // Calculer les fonctionnalités autorisées et refusées
  const allowedFunctionalities = getAllowedFunctionalities(rights);
  const deniedFunctionalities = getDeniedFunctionalities(rights);

  return {
    rights,
    hasRight,
    hasAllRights,
    hasAnyRight,
    allowedFunctionalities,
    deniedFunctionalities,
    profil: rights?.profil || null,
    totalFunctionalities: rights?.fonctionnalites.length || 0,
    allowedCount: allowedFunctionalities.length,
    deniedCount: deniedFunctionalities.length,
    isLoading: isLoading,
    isReady: isHydrated && !isLoading && rights !== null
  };
}

/**
 * Hook pour vérifier rapidement un seul droit
 * Version raccourcie de useRights() pour les cas simples
 *
 * @param functionalityName - Nom de la fonctionnalité à vérifier
 * @returns true si autorisé, false sinon
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = useHasRight("SUPPRIMER FACTURE");
 *
 *   if (!canDelete) return null;
 *
 *   return <button onClick={handleDelete}>Supprimer</button>;
 * }
 * ```
 */
export function useHasRight(functionalityName: string): boolean {
  const { hasRight } = useAuth();
  return hasRight(functionalityName);
}

/**
 * Hook pour obtenir le profil utilisateur
 *
 * @returns Nom du profil (ex: "ADMIN") ou null
 *
 * @example
 * ```tsx
 * function UserBadge() {
 *   const profil = useUserProfil();
 *   return <span className="badge">{profil}</span>;
 * }
 * ```
 */
export function useUserProfil(): string | null {
  const { rights } = useAuth();
  return rights?.profil || null;
}