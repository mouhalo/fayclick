'use client';

const TYPES = [
  { key: '', label: 'Tous' },
  { key: 'COMMERCIALE', label: 'Commerce' },
  { key: 'SCOLAIRE', label: 'Scolaire' },
  { key: 'IMMOBILIER', label: 'Immobilier' },
  { key: 'PRESTATAIRE', label: 'Prestataire' },
];

interface TypeStructureChipsProps {
  selected: string;
  onChange: (type: string) => void;
  counts?: Record<string, number>;
}

export default function TypeStructureChips({ selected, onChange, counts }: TypeStructureChipsProps) {
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
