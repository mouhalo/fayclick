/**
 * Badge de statut pour les proformas
 * Design glassmorphism coherent avec StatusBadge
 */

import { cn } from '@/lib/utils';
import { ProformaStatut } from '@/types/proforma';

interface ProformaStatusBadgeProps {
  status: ProformaStatut;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<ProformaStatut, { bg: string; borderColor: string; text: string; icon: string; shadowColor: string }> = {
  BROUILLON: {
    bg: 'bg-slate-500',
    borderColor: 'border-slate-400',
    text: 'BROUILLON',
    icon: '📝',
    shadowColor: 'shadow-slate-500/20',
  },
  ACCEPTEE: {
    bg: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    text: 'ACCEPTEE',
    icon: '✓',
    shadowColor: 'shadow-emerald-500/20',
  },
  CONVERTIE: {
    bg: 'bg-violet-500',
    borderColor: 'border-violet-400',
    text: 'CONVERTIE',
    icon: '🔄',
    shadowColor: 'shadow-violet-500/20',
  },
};

const sizeConfig = {
  sm: { padding: 'px-2 py-1', text: 'text-xs', icon: 'text-xs' },
  md: { padding: 'px-3 py-1.5', text: 'text-xs', icon: 'text-sm' },
  lg: { padding: 'px-4 py-2', text: 'text-sm', icon: 'text-base' },
};

export const ProformaStatusBadge = ({ status, className, size = 'md' }: ProformaStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.BROUILLON;
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
