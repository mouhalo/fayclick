'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { useSwipe } from '@/hooks';

export interface TouchCarouselProps {
  children: React.ReactNode[];
  className?: string;
  showNavigation?: boolean;
  showDots?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onSlideChange?: (index: number) => void;
}

/**
 * Carrousel tactile responsive avec gestes swipe
 * Basé sur les patterns du guide eTicket
 */
export const TouchCarousel: React.FC<TouchCarouselProps> = ({
  children,
  className = '',
  showNavigation = true,
  showDots = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemCount = children.length;

  const goToSlide = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, itemCount - 1));
    setCurrentIndex(newIndex);
    onSlideChange?.(newIndex);
  }, [itemCount, onSlideChange]);

  const goToPrevious = useCallback(() => {
    goToSlide(currentIndex > 0 ? currentIndex - 1 : itemCount - 1);
  }, [currentIndex, itemCount, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex < itemCount - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, itemCount, goToSlide]);

  // Gestion des gestes tactiles
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
    threshold: 50,
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    preventDefaultTouchMove: true,
  });

  // Auto-play
  useEffect(() => {
    if (!autoPlay || itemCount <= 1) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, goToNext, itemCount]);

  if (itemCount === 0) {
    return null;
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Container carrousel */}
      <div
        className="carousel-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {children.map((child, index) => (
            <div key={index} className="carousel-slide">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {showNavigation && itemCount > 1 && (
        <>
          <button
            className="nav-button-left hidden xs:block"
            onClick={goToPrevious}
            aria-label="Slide précédent"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#6495ed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            className="nav-button-right hidden xs:block"
            onClick={goToNext}
            aria-label="Slide suivant"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#6495ed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Indicateurs de pagination */}
      {showDots && itemCount > 1 && (
        <div className="pagination-dots">
          {children.map((_, index) => (
            <button
              key={index}
              className={clsx(
                'pagination-dot',
                index === currentIndex ? 'pagination-dot-active' : 'pagination-dot-inactive'
              )}
              onClick={() => goToSlide(index)}
              aria-label={`Aller au slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export interface CarouselSlideProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Slide individual pour le carrousel
 */
export const CarouselSlide: React.FC<CarouselSlideProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={clsx('w-full h-full', className)}>
      {children}
    </div>
  );
};