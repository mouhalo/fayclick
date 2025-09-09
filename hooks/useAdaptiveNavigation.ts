'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAdaptiveNavigationReturn {
  navStyle: React.CSSProperties;
  isVisible: boolean;
  spacerHeight: number;
  currentZone: 'top' | 'middle' | 'bottom';
  scrollProgress: number;
}

/**
 * Hook avancé pour la navigation adaptative mobile
 * Gère intelligemment 3 zones de positionnement pour éviter le masquage du contenu
 */
export function useAdaptiveNavigation(): UseAdaptiveNavigationReturn {
  const [navStyle, setNavStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(true);
  const [spacerHeight, setSpacerHeight] = useState(80);
  const [currentZone, setCurrentZone] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const lastScrollY = useRef(0);
  const headerHeight = useRef(0);
  const navHeight = useRef(80); // Hauteur approximative de la navigation
  
  const updateNavigation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Calculer la progression du scroll
    const scrollableHeight = documentHeight - viewportHeight;
    const progress = scrollableHeight > 0 ? Math.min(scrollY / scrollableHeight, 1) : 0;
    setScrollProgress(progress);
    
    // Détecter la hauteur du header mobile
    // On cherche le panel gauche qui contient le header sur mobile
    const mobileHeader = document.querySelector('.lg\\:flex .lg\\:w-\\[380px\\]') as HTMLElement;
    if (mobileHeader) {
      const headerRect = mobileHeader.getBoundingClientRect();
      headerHeight.current = Math.max(headerRect.height, 120); // Minimum 120px
    }

    // Direction du scroll
    const isScrollingDown = scrollY > lastScrollY.current;
    const scrollVelocity = scrollY - lastScrollY.current;
    lastScrollY.current = scrollY;

    // Définir les zones critiques
    const topZone = 150; // Zone où le header est visible
    const bottomZoneStart = documentHeight - viewportHeight - 100;
    
    // Calculer la position optimale selon la zone
    let newNavStyle: React.CSSProperties = {};
    let newZone: 'top' | 'middle' | 'bottom' = 'middle';
    
    if (scrollY < topZone) {
      // ==================== ZONE HAUTE ====================
      // Navigation positionnée sous le header pour éviter le masquage
      newZone = 'top';
      const topPosition = Math.max(headerHeight.current + 20, 140);
      
      newNavStyle = {
        position: 'fixed',
        top: `${topPosition}px`,
        bottom: 'auto',
        left: 0,
        right: 0,
        transform: 'translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 40 // Légèrement en dessous du header
      };
      
    } else if (scrollY > bottomZoneStart) {
      // ==================== ZONE BASSE ====================
      // Navigation tout en bas de l'écran
      newZone = 'bottom';
      
      newNavStyle = {
        position: 'fixed',
        top: 'auto',
        bottom: '0px',
        left: 0,
        right: 0,
        transform: 'translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50
      };
      
    } else {
      // ==================== ZONE MILIEU ====================
      // Navigation flottante avec offset adaptatif
      newZone = 'middle';
      
      // Ajuster l'offset selon la direction du scroll
      let bottomOffset = 20;
      if (Math.abs(scrollVelocity) > 5) {
        bottomOffset = isScrollingDown ? 15 : 30; // Plus bas si scroll vers le bas
      }
      
      newNavStyle = {
        position: 'fixed',
        top: 'auto',
        bottom: `${bottomOffset}px`,
        left: 0,
        right: 0,
        transform: 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50
      };
    }

    // Appliquer les styles
    setNavStyle(newNavStyle);
    setCurrentZone(newZone);
    
    // Navigation toujours visible (peut être masquée si besoin avec une logique de velocity)
    setIsVisible(true);
    
    // Ajuster la hauteur du spacer selon la zone
    const newSpacerHeight = newZone === 'top' ? navHeight.current + 40 : navHeight.current + 20;
    setSpacerHeight(newSpacerHeight);
    
  }, []);

  useEffect(() => {
    // Calcul initial
    updateNavigation();

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateNavigation);
    };

    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateNavigation);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [updateNavigation]);

  return { 
    navStyle, 
    isVisible, 
    spacerHeight, 
    currentZone, 
    scrollProgress 
  };
}

/**
 * Version avec masquage automatique lors du scroll rapide
 * Utile si vous préférez une navigation qui se masque/apparaît
 */
export function useAdaptiveNavigationWithHide(): UseAdaptiveNavigationReturn {
  const [navStyle, setNavStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(true);
  const [spacerHeight, setSpacerHeight] = useState(80);
  const [currentZone, setCurrentZone] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);
  
  const updateNavigation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Calculer la vélocité et progression du scroll
    const currentVelocity = scrollY - lastScrollY.current;
    scrollVelocity.current = currentVelocity;
    lastScrollY.current = scrollY;
    
    const scrollableHeight = documentHeight - viewportHeight;
    const progress = scrollableHeight > 0 ? Math.min(scrollY / scrollableHeight, 1) : 0;
    setScrollProgress(progress);
    
    // Logique de visibilité basée sur la vélocité
    if (Math.abs(currentVelocity) > 8) {
      // Scroll rapide
      if (currentVelocity > 0) {
        // Scroll vers le bas → masquer
        setIsVisible(false);
      } else {
        // Scroll vers le haut → afficher
        setIsVisible(true);
      }
    } else if (scrollY < 100) {
      // Toujours visible près du top
      setIsVisible(true);
    }
    
    // Position de base flottante
    setNavStyle({
      position: 'fixed',
      bottom: '20px',
      left: '0',
      right: '0',
      transform: isVisible ? 'translateY(0)' : 'translateY(120%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 50
    });
    
    setCurrentZone('middle');
    setSpacerHeight(100);
    
  }, [isVisible]);

  useEffect(() => {
    updateNavigation();

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateNavigation);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateNavigation);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateNavigation);
      cancelAnimationFrame(rafId);
    };
  }, [updateNavigation]);

  return { 
    navStyle, 
    isVisible, 
    spacerHeight, 
    currentZone, 
    scrollProgress 
  };
}