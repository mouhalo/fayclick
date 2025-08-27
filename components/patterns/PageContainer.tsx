'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  background?: 'default' | 'gradient' | 'plain';
}

/**
 * Container de page principal réutilisable inspiré du guide fayclick
 * Gère automatiquement les safe areas et la responsivité
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  background = 'default',
}) => {
  const backgroundClasses = {
    default: 'page-container', // Utilise la classe du guide fayclick
    gradient: 'min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50',
    plain: 'min-h-screen bg-white',
  };

  return (
    <div className={clsx(backgroundClasses[background], className)}>
      {children}
    </div>
  );
};

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
  padding?: 'none' | 'compact' | 'normal' | 'comfortable';
}

/**
 * Container responsive avec largeurs maximales configurables
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = '7xl',
  padding = 'normal',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
  };

  const paddingClasses = {
    none: '',
    compact: 'px-3 sm:px-6 py-3 sm:py-6',
    normal: 'responsive-container', // Utilise la classe du guide fayclick
    comfortable: 'px-4 sm:px-8 lg:px-12 py-6 sm:py-10 lg:py-16',
  };

  const containerClasses = padding === 'normal' 
    ? `responsive-container ${className}`
    : clsx('mx-auto', maxWidthClasses[maxWidth], paddingClasses[padding], className);

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
};