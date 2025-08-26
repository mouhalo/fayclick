import React from 'react';
import SecurityService from '@/services/security.service';

interface PerformanceMetrics {
  action: string;
  duration: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];
  private isEnabled = true;

  track(actionName: string) {
    const startTime = performance.now();
    
    return {
      end: () => {
        if (!this.isEnabled) return;
        
        const duration = performance.now() - startTime;
        const metric: PerformanceMetrics = {
          action: actionName,
          duration,
          timestamp: Date.now(),
          url: window.location.pathname,
          userAgent: navigator.userAgent
        };

        this.metrics.push(metric);
        
        // Log sécurisé avec SecurityService
        if (process.env.NODE_ENV === 'development') {
          SecurityService.secureLog('log', `[Performance] ${actionName}: ${duration.toFixed(2)}ms`);
        }

        // Alerter si l'action prend plus de 200ms
        if (duration > 200) {
          SecurityService.secureLog('warn', `[Performance Warning] ${actionName} took ${duration.toFixed(2)}ms (> 200ms threshold)`);
        }

        // En production, envoyer les métriques à votre service d'analytics
        if (process.env.NODE_ENV === 'production' && this.metrics.length >= 10) {
          this.sendMetrics();
        }
      }
    };
  }

  // Mesurer le temps de rendu d'un composant
  trackComponentRender(componentName: string) {
    return this.track(`component_render_${componentName}`);
  }

  // Mesurer le temps d'une requête API
  trackApiCall(endpoint: string) {
    return this.track(`api_call_${endpoint}`);
  }

  // Mesurer une interaction utilisateur
  trackInteraction(interactionType: string, target?: string) {
    const actionName = target 
      ? `${interactionType}_${target}` 
      : interactionType;
    return this.track(actionName);
  }

  // Obtenir les métriques actuelles
  getMetrics() {
    return [...this.metrics];
  }

  // Obtenir les statistiques
  getStats() {
    if (this.metrics.length === 0) return null;

    const durations = this.metrics.map(m => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    
    return {
      count: this.metrics.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...durations),
      max: Math.max(...durations),
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // Envoyer les métriques au serveur avec logging sécurisé
  private async sendMetrics() {
    try {
      const metricsToSend = [...this.metrics];
      this.metrics = []; // Vider le buffer

      // Masquer les données sensibles avant envoi
      const sanitizedMetrics = metricsToSend.map(metric => ({
        ...metric,
        url: SecurityService.maskSensitiveData({ url: metric.url }).url,
        userAgent: process.env.NODE_ENV === 'production' ? 'masked' : metric.userAgent
      }));

      // Endpoint d'analytics FayClick (futur développement)
      if (process.env.NODE_ENV === 'production') {
        SecurityService.secureLog('log', 'Envoi métriques performance FayClick', {
          metricsCount: sanitizedMetrics.length
        });
        
        // TODO: Intégrer avec l'API FayClick pour analytics
        // await DatabaseService.executeFunction('store_performance_metrics', [
        //   JSON.stringify(sanitizedMetrics)
        // ]);
      }
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur envoi métriques performance', { 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      // Remettre les métriques dans le buffer en cas d'échec
      this.metrics.unshift(...this.metrics);
    }
  }

  // Activer/désactiver le tracking
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Réinitialiser les métriques
  reset() {
    this.metrics = [];
  }
}

// Instance singleton
export const performanceTracker = new PerformanceTracker();

// Hooks React pour faciliter l'utilisation
export function usePerformanceTracking() {
  return {
    trackInteraction: (action: string, target?: string) => 
      performanceTracker.trackInteraction(action, target),
    trackApiCall: (endpoint: string) => 
      performanceTracker.trackApiCall(endpoint),
    trackComponentRender: (componentName: string) => 
      performanceTracker.trackComponentRender(componentName)
  };
}

// Fonction utilitaire pour mesurer automatiquement les clics
export function trackClick(elementId: string) {
  return () => {
    const tracker = performanceTracker.trackInteraction('click', elementId);
    return tracker;
  };
}

// HOC pour mesurer automatiquement le rendu des composants FayClick
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const WrappedComponent = (props: P) => {
    React.useEffect(() => {
      const tracker = performanceTracker.trackComponentRender(componentName);
      // Mesurer le temps jusqu'au premier rendu
      const timeoutId = setTimeout(() => {
        tracker.end();
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }, []);
    
    return React.createElement(Component, props);
  };
  
  // Nommer le composant pour les DevTools
  WrappedComponent.displayName = `withPerformanceTracking(${componentName})`;
  
  return WrappedComponent;
}