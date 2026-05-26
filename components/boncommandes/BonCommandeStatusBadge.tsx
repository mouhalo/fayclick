/**
 * Badge statut Bon de Commande — calque sur ProformaStatusBadge
 * Couleurs thématiques approvisionnement : slate / blue / emerald / red
 *
 * FR-020 : BROUILLON (slate), CONFIRME (blue), LIVRE (emerald), ANNULE (red)
 */

import { cn } from '@/lib/utils';
import { BonCommandeStatut } from '@/types/bon-commande';

interface BonCommandeStatusBadgeProps {
  statut: BonCommandeStatut;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  BonCommandeStatut,
  { bg: string; borderColor: string; text: string; icon: string; shadowColor: string }
> = {
  BROUILLON: {
    bg: 'bg-slate-500',
    borderColor: 'border-slate-400',
    text: 'BROUILLON',
    icon: '📝',
    shadowColor: 'shadow-slate-500/20',
  },
  CONFIRME: {
    bg: 'bg-blue-500',
    borderColor: 'border-blue-400',
    text: 'CONFIRMÉ',
    icon: '✓',
    shadowColor: 'shadow-blue-500/20',
  },
  LIVRE: {
    bg: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    text: 'LIVRÉ',
    icon: '📦',
    shadowColor: 'shadow-emerald-500/20',
  },
  ANNULE: {
    bg: 'bg-red-500',
    borderColor: 'border-red-400',
    text: 'ANNULÉ',
    icon: '✗',
    shadowColor: 'shadow-red-500/20',
  },
};

const sizeConfig = {
  sm: { padding: 'px-2 py-1', text: 'text-xs', icon: 'text-xs' },
  md: { padding: 'px-3 py-1.5', text: 'text-xs', icon: 'text-sm' },
  lg: { padding: 'px-4 py-2', text: 'text-sm', icon: 'text-base' },
};

export const BonCommandeStatusBadge = ({
  statut,
  className,
  size = 'md',
}: BonCommandeStatusBadgeProps) => {
  const config = statusConfig[statut] || statusConfig.BROUILLON;
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
