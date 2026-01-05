/**
 * Types pour le système de notifications FayClick
 */

// Types de notifications disponibles
export type NotificationType = 'abonnement' | 'retrait' | 'paiement' | 'system' | 'commande';

// Interface pour une notification
export interface Notification {
  id: number;
  id_utilisateur: number;
  titre: string;
  message: string;
  type: NotificationType;
  lue: boolean;
  date_creation: string;
  date_lecture?: string;
}

// Interface pour les statistiques de notifications
export interface NotificationStats {
  total: number;
  non_lues: number;
  lues: number;
}

// Interface pour la réponse de get_my_notifications
export interface NotificationsResponse {
  stats: NotificationStats;
  notifications: Notification[];
}

// Interface pour créer une notification
export interface CreateNotificationParams {
  userId: number;
  titre: string;
  message: string;
  type: NotificationType;
}

// Interface pour la réponse API standard
export interface NotificationApiResponse {
  success: boolean;
  code?: string;
  message: string;
  data?: any;
}
