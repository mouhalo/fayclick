'use client';

import { useState, useCallback } from 'react';

export interface TouchState {
  touchStart: number | null;
  touchEnd: number | null;
  touchDelta: number;
  isSwiping: boolean;
}

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  preventDefaultTouchMove?: boolean;
}

/**
 * Hook pour gestion avancée du tactile et des gestes swipe
 * Basé sur les patterns du guide eTicket PWA
 */
export const useSwipe = (options: UseSwipeOptions = {}): SwipeHandlers & TouchState => {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    preventDefaultTouchMove = false,
  } = options;

  const [touchState, setTouchState] = useState<TouchState>({
    touchStart: null,
    touchEnd: null,
    touchDelta: 0,
    isSwiping: false,
  });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchState(prev => ({
      ...prev,
      touchStart: touch.clientX,
      touchEnd: null,
      isSwiping: false,
    }));
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (preventDefaultTouchMove) {
      e.preventDefault();
    }

    const touch = e.targetTouches[0];
    const delta = touchState.touchStart ? touch.clientX - touchState.touchStart : 0;
    
    setTouchState(prev => ({
      ...prev,
      touchEnd: touch.clientX,
      touchDelta: delta,
      isSwiping: Math.abs(delta) > 10,
    }));
  }, [touchState.touchStart, preventDefaultTouchMove]);

  const onTouchEnd = useCallback(() => {
    const { touchStart, touchEnd } = touchState;
    
    if (!touchStart || !touchEnd) {
      setTouchState(prev => ({ ...prev, isSwiping: false }));
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    setTouchState(prev => ({
      ...prev,
      isSwiping: false,
      touchStart: null,
      touchEnd: null,
      touchDelta: 0,
    }));
  }, [touchState, threshold, onSwipeLeft, onSwipeRight]);

  return {
    ...touchState,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

/**
 * Hook pour détecter les capacités tactiles de l'appareil
 */
export const useTouchCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    hasTouch: false,
    maxTouchPoints: 0,
    isTouchPrimary: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const maxTouchPoints = navigator.maxTouchPoints || 0;
      const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;

      setCapabilities({
        hasTouch,
        maxTouchPoints,
        isTouchPrimary,
      });
    }
  }, []);

  return capabilities;
};

/**
 * Hook pour détecter la direction de scroll
 */
export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      if (direction !== scrollDirection && Math.abs(scrollY - lastScrollY) > 10) {
        setScrollDirection(direction);
      }
      
      setLastScrollY(scrollY > 0 ? scrollY : 0);
    };

    const throttledUpdateScrollDirection = throttle(updateScrollDirection, 100);

    window.addEventListener('scroll', throttledUpdateScrollDirection);
    return () => window.removeEventListener('scroll', throttledUpdateScrollDirection);
  }, [lastScrollY, scrollDirection]);

  return scrollDirection;
};

// Utility function for throttling
function throttle<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();

    if (!previous) previous = now;

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(null, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(null, args);
      }, remaining);
    }
  };
}