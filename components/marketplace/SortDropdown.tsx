'use client';

import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'pertinence' | 'prix_asc' | 'prix_desc' | 'nom_az';

interface SortDropdownProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const options: { value: SortOption; label: string }[] = [
  { value: 'pertinence', label: 'Pertinence' },
  { value: 'prix_asc', label: 'Prix croissant' },
  { value: 'prix_desc', label: 'Prix decroissant' },
  { value: 'nom_az', label: 'Nom A-Z' },
];

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="relative inline-flex items-center">
      <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-300 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="pl-8 pr-3 py-1.5 text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white appearance-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/40 transition-all"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-slate-800">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
