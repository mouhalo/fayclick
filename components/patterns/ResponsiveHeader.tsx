'use client';

import React from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';

export interface ResponsiveHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  navigation?: {
    logo?: {
      icon?: React.ReactNode;
      text: string;
      href?: string;
    };
    backButton?: {
      href: string;
      label: string;
    };
  };
  className?: string;
}

/**
 * Header responsive standard avec navigation
 * Basé sur les patterns du guide fayclick
 */
export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  title,
  subtitle,
  actions,
  navigation,
  className = '',
}) => {
  return (
    <div className={clsx('header-responsive', className)}>
      <div className="header-content">
        {/* Navigation */}
        {navigation && (
          <div className="header-navigation">
            {/* Logo ou bouton retour */}
            <div className="header-logo">
              {navigation.backButton ? (
                <Link
                  href={navigation.backButton.href}
                  className="
                    w-12 h-12 glass rounded-full flex items-center justify-center 
                    text-white hover:bg-white/30 transition-all duration-300 z-20
                    min-h-[44px] min-w-[44px] touch-manipulation
                  "
                  aria-label={navigation.backButton.label}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              ) : navigation.logo ? (
                <div className="header-logo">
                  {navigation.logo.icon && (
                    <div className="header-logo-icon">
                      {navigation.logo.icon}
                    </div>
                  )}
                  {navigation.logo.href ? (
                    <Link href={navigation.logo.href} className="header-logo-text">
                      {navigation.logo.text}
                    </Link>
                  ) : (
                    <h1 className="header-logo-text">
                      {navigation.logo.text}
                    </h1>
                  )}
                </div>
              ) : null}
            </div>

            {/* Actions */}
            {actions && (
              <div className="flex items-center gap-2 sm:gap-3">
                {actions}
              </div>
            )}
          </div>
        )}

        {/* Titre principal */}
        <div className="header-title-section">
          <h1 className="header-main-title">
            {title}
          </h1>
          {subtitle && (
            <p className="header-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export interface HeaderActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Bouton d'action pour header responsive
 */
export const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({
  children,
  onClick,
  href,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const buttonClasses = clsx('header-action-button', className);

  if (href) {
    return (
      <Link href={href} className={buttonClasses} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={buttonClasses}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};