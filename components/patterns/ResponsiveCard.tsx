'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface ResponsiveCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'featured' | 'urgent' | 'eticket';
  className?: string;
  onClick?: () => void;
  tabIndex?: number;
  'aria-label'?: string;
}

/**
 * Composant carte responsive universel inspiré du guide eTicket
 * Supporte différents variants et est optimisé pour le tactile
 */
export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
  tabIndex,
  'aria-label': ariaLabel,
}) => {
  const baseClasses = `
    bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl
    overflow-hidden transform transition-all duration-300
    hover:scale-[1.02] hover:-translate-y-1
    touch-manipulation cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const variants = {
    default: 'border border-gray-100 focus:ring-primary-500',
    featured: 'border-2 border-primary-200 shadow-primary-100/50 focus:ring-primary-500',
    urgent: 'border-2 border-error-200 shadow-error-100/50 focus:ring-error-500',
    eticket: 'card-eticket', // Utilise la classe CSS du guide eTicket
  };

  const cardClasses = variant === 'eticket' 
    ? `card-eticket ${className}`
    : clsx(baseClasses, variants[variant], className);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

/**
 * Header de carte avec gradient optionnel
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  gradient = false,
}) => {
  const headerClasses = gradient
    ? `card-header-gradient ${className}`
    : `padding-normal ${className}`;

  return (
    <div className={headerClasses}>
      {children}
    </div>
  );
};

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'compact' | 'normal' | 'comfortable' | 'spacious';
}

/**
 * Contenu de carte avec espacement adaptatif
 */
export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
  padding = 'normal',
}) => {
  const paddingClasses = {
    compact: 'padding-compact',
    normal: 'padding-normal',
    comfortable: 'padding-comfortable',
    spacious: 'padding-spacious',
  };

  return (
    <div className={clsx(paddingClasses[padding], className)}>
      {children}
    </div>
  );
};

export interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  secondary?: string;
  className?: string;
}

/**
 * Composant InfoRow responsive pour afficher des informations
 */
export const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  label,
  value,
  secondary,
  className = '',
}) => {
  return (
    <div className={clsx('info-row', className)}>
      <div className="info-row-icon">
        {icon}
      </div>
      <div className="info-row-content">
        <p className="info-row-label">
          {label}
        </p>
        <p className="info-row-value">
          {value}
        </p>
        {secondary && (
          <p className="info-row-secondary">
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
};