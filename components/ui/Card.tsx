'use client';

import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  hover = false,
  padding = 'md',
  onClick,
}) => {
  const baseClasses = 'rounded-2xl overflow-hidden transition-all duration-300';

  const variantClasses = {
    default: 'bg-white shadow-lg',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-glass',
    gradient: 'bg-gradient-to-br from-white to-gray-50 shadow-lg',
  };

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
    : '';

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const cardClasses = `${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${paddingClasses[padding]} ${className}`;

  return (
    <div className={cardClasses} onClick={onClick}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className = '', 
  as: Component = 'h3' 
}) => {
  return (
    <Component className={`text-xl font-semibold text-gray-900 ${className}`}>
      {children}
    </Component>
  );
};

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </div>
  );
};

export default Card;