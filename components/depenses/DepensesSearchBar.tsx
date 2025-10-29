'use client';

import { Search, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface DepensesSearchBarProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function DepensesSearchBar({
  onSearch,
  onRefresh,
  isLoading = false
}: DepensesSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <div className="p-4 bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
        {/* Champ de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher une dépense..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Bouton Actualiser */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          title="Actualiser"
        >
          <RefreshCw
            size={20}
            className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
