/**
 * Composant GlassCard avec effet glassmorphism
 * Design moderne avec effet de verre et animations
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'hover' | 'interactive';
  animation?: 'float' | 'shine' | 'pulse' | 'none';
  onClick?: () => void;
}

export const GlassCard = ({ 
  children, 
  className, 
  variant = 'default',
  animation = 'none',
  onClick 
}: GlassCardProps) => {
  const baseClasses = [
    'backdrop-blur-lg',
    'bg-white/20',
    'border border-white/30',
    'rounded-xl',
    'transition-all duration-300 ease-out',
    'relative overflow-hidden',
    'shadow-lg shadow-black/5',
  ];

  const variantClasses = {
    default: '',
    hover: 'hover:bg-white/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10',
    interactive: 'hover:bg-white/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 cursor-pointer active:scale-[0.98]',
  };

  const animationClasses = {
    float: 'animate-bounce',
    shine: 'before:animate-shimmer',
    pulse: 'animate-pulse',
    none: '',
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      onClick={onClick}
    >
      {children}
      
      {/* Effet shine overlay */}
      {animation === 'shine' && (
        <div className="absolute inset-0 -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45 animate-shimmer pointer-events-none" />
      )}
      
      {/* Bordure intérieure pour effet glassmorphism */}
      <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />
    </div>
  );
};