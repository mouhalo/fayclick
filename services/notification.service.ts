/**
 * Service de gestion des notifications FayClick
 * Utilise les fonctions PostgreSQL définies dans docs/Notifications/fonctions_postgresql.txt
 */

import DatabaseService from './database.service';
import SecurityService from './security.service';
import { extractSingleDataFromResult, extractArrayDataFromResult } from '@/utils/dataExtractor';
import type {
  Notification,
  NotificationType,
  NotificationsResponse,
  NotificationApiResponse,
  NotificationStats
} from '@/types/notification';

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  /**
   * Crée une nouvelle notification pour un utilisateur
   * Fonction PostgreSQL: add_new_notification(pid_user, ptitre, pmessage, ptype)
   */
  async addNotification(
    userId: number,
    titre: string,
    message: string,
    type: NotificationType
  ): Promise<NotificationApiResponse> {
    try {
      SecurityService.secureLog('log', 'Création notification', { userId, titre, type });

      const results = await DatabaseService.executeFunction('add_new_notification', [
        userId.toString(),
        titre,
        message,
        type
      ]);

      const response = extractSingleDataFromResult<NotificationApiResponse>(results);

      SecurityService.secureLog('log', 'Notification créée', {
        userId,
        success: response?.success
      });

      return response || { success: false, message: 'Erreur lors de la création' };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création notification', {
        userId,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      throw error;
    }
  }

  /**
   * Récupère les notifications d'un utilisateur avec pagination
   * Fonction PostgreSQL: get_my_notifications(pid_utilisateur, p_limit, p_offset, p_only_unread)
   */
  async getNotifications(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    onlyUnread: boolean = false
  ): Promise<NotificationsResponse> {
    try {
      SecurityService.secureLog('log', 'Récupération notifications', {
        userId,
        limit,
        offset,
        onlyUnread
      });

      const results = await DatabaseService.executeFunction('get_my_notifications', [
        userId.toString(),
        limit.toString(),
        offset.toString(),
        onlyUnread.toString()
      ]);

      // executeFunction retourne un tableau, prendre le premier élément
      // Structure: [{get_my_notifications: {data: {stats, notifications}, success, message}}]
      const firstResult = Array.isArray(results) ? results[0] : results;

      // Extraire le résultat de la fonction PostgreSQL
      const functionResult = firstResult?.get_my_notifications;

      // Extraire les données internes
      const innerData = functionResult?.data;

      console.log('📬 [NOTIFICATIONS] Parsing:', {
        resultsType: typeof results,
        isArray: Array.isArray(results),
        resultsLength: Array.isArray(results) ? results.length : 'N/A',
        firstResult,
        functionResult,
        innerData
      });

      // Parser la réponse selon le format PostgreSQL
      const response: NotificationsResponse = {
        stats: innerData?.stats || { total: 0, non_lues: 0, lues: 0 },
        notifications: innerData?.notifications || []
      };

      console.log('📬 [NOTIFICATIONS] Réponse finale:', {
        stats: response.stats,
        notificationsCount: response.notifications.length
      });

      SecurityService.secureLog('log', 'Notifications récupérées', {
        userId,
        count: response.notifications.length,
        unread: response.stats.non_lues
      });

      return response;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération notifications', {
        userId,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      throw error;
    }
  }

  /**
   * Marque une notification comme lue
   * Fonction PostgreSQL: edit_read_notification(pid_notification)
   */
  async markAsRead(notificationId: number): Promise<NotificationApiResponse> {
    try {
      SecurityService.secureLog('log', 'Marquage notification lue', { notificationId });

      const results = await DatabaseService.executeFunction('edit_read_notification', [
        notificationId.toString()
      ]);

      const response = extractSingleDataFromResult<NotificationApiResponse>(results);

      SecurityService.secureLog('log', 'Notification marquée lue', {
        notificationId,
        success: response?.success
      });

      return response || { success: false, message: 'Erreur lors du marquage' };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur marquage notification', {
        notificationId,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      throw error;
    }
  }

  /**
   * Marque toutes les notifications d'un utilisateur comme lues
   * Fonction PostgreSQL: mark_all_notifications_read(pid_utilisateur)
   */
  async markAllAsRead(userId: number): Promise<NotificationApiResponse> {
    try {
      SecurityService.secureLog('log', 'Marquage toutes notifications lues', { userId });

      const results = await DatabaseService.executeFunction('mark_all_notifications_read', [
        userId.toString()
      ]);

      const response = extractSingleDataFromResult<NotificationApiResponse>(results);

      SecurityService.secureLog('log', 'Toutes notifications marquées lues', {
        userId,
        success: response?.success
      });

      return response || { success: false, message: 'Erreur lors du marquage' };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur marquage toutes notifications', {
        userId,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      throw error;
    }
  }

  /**
   * Supprime une ou toutes les notifications d'un utilisateur
   * Fonction PostgreSQL: delete_my_notifications(pid_utilisateur, pid_notification)
   * Si pid_notification = 0, supprime toutes les notifications
   */
  async deleteNotification(
    userId: number,
    notificationId: number = 0
  ): Promise<NotificationApiResponse> {
    try {
      const deleteAll = notificationId === 0;
      SecurityService.secureLog('log', 'Suppression notification(s)', {
        userId,
        notificationId,
        deleteAll
      });

      const results = await DatabaseService.executeFunction('delete_my_notifications', [
        userId.toString(),
        notificationId.toString()
      ]);

      const response = extractSingleDataFromResult<NotificationApiResponse>(results);

      SecurityService.secureLog('log', 'Notification(s) supprimée(s)', {
        userId,
        notificationId,
        success: response?.success
      });

      return response || { success: false, message: 'Erreur lors de la suppression' };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur suppression notification(s)', {
        userId,
        notificationId,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      throw error;
    }
  }

  /**
   * Supprime toutes les notifications d'un utilisateur
   * Raccourci pour deleteNotification(userId, 0)
   */
  async deleteAllNotifications(userId: number): Promise<NotificationApiResponse> {
    return this.deleteNotification(userId, 0);
  }

  /**
   * Récupère uniquement le nombre de notifications non lues
   * Utile pour le badge dans le header
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const response = await this.getNotifications(userId, 1, 0, false);
      return response.stats.non_lues;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération count non lues', {
        userId,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      return 0;
    }
  }
}

// Instance singleton exportée
export const notificationService = NotificationService.getInstance();
export default notificationService;
