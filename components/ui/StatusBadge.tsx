/**
 * Composant StatusBadge avec design glassmorphism
 * Badges de statut pour les factures avec effet de verre
 */

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'PAYEE' | 'IMPAYEE';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge = ({ status, className, size = 'md' }: StatusBadgeProps) => {
  const statusConfig = {
    PAYEE: {
      bg: 'bg-emerald-500',
      borderColor: 'border-emerald-400',
      text: 'PAYÉE',
      icon: '✓',
      shadowColor: 'shadow-emerald-500/20',
    },
    IMPAYEE: {
      bg: 'bg-orange-500',
      borderColor: 'border-orange-400',
      text: 'IMPAYÉE',
      icon: '⏳',
      shadowColor: 'shadow-orange-500/20',
    },
  };

  const sizeConfig = {
    sm: {
      padding: 'px-2 py-1',
      text: 'text-xs',
      icon: 'text-xs',
    },
    md: {
      padding: 'px-3 py-1.5',
      text: 'text-xs',
      icon: 'text-sm',
    },
    lg: {
      padding: 'px-4 py-2',
      text: 'text-sm',
      icon: 'text-base',
    },
  };

  const config = statusConfig[status];
  const sizing = sizeConfig[size];

  return (
    <div 
      className={cn(
        'inline-flex items-center justify-center',
        'rounded-full font-bold text-white',
        'backdrop-blur-lg border',
        'shadow-lg transition-all duration-200',
        'hover:scale-105 hover:shadow-xl',
        config.bg,
        config.borderColor,
        config.shadowColor,
        sizing.padding,
        sizing.text,
        className
      )}
    >
      <span className={cn('mr-1', sizing.icon)}>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};