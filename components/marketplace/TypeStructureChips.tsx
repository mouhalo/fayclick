'use client';

import { useTranslations } from '@/hooks/useTranslations';

interface TypeStructureChipsProps {
  selected: string;
  onChange: (type: string) => void;
  counts?: Record<string, number>;
}

export default function TypeStructureChips({ selected, onChange, counts }: TypeStructureChipsProps) {
  const t = useTranslations('marketplace');
  const TYPES = [
    { key: '', label: t('types.all') },
    { key: 'COMMERCIALE', label: t('types.commerce') },
    { key: 'SCOLAIRE', label: t('types.scolaire') },
    { key: 'IMMOBILIER', label: t('types.immobilier') },
    { key: 'PRESTATAIRE', label: t('types.prestataire') },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {TYPES.map(type => {
        const isActive = selected === type.key;
        const count = type.key ? counts?.[type.key] : undefined;
        return (
          <button
            key={type.key}
            onClick={() => onChange(type.key)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200
              ${isActive
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80'
              }
            `}
          >
            {type.label}
            {count !== undefined && (
              <span className={`ml-1 ${isActive ? 'text-white/70' : 'text-white/30'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
