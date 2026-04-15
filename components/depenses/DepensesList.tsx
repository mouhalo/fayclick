'use client';

import DepenseCard from './DepenseCard';
import type { Depense } from '@/types/depense.types';
import { useTranslations } from '@/hooks/useTranslations';

interface DepensesListProps {
  depenses: Depense[];
  onEdit: (depense: Depense) => void;
  onDelete: (depense: Depense) => void;
}

export default function DepensesList({ depenses, onEdit, onDelete }: DepensesListProps) {
  const t = useTranslations('expenses');
  if (depenses.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {depenses.map((depense) => (
        <DepenseCard
          key={depense.id_depense}
          depense={depense}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
