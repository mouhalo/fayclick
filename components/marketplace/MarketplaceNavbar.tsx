'use client';

import { Search, ShoppingCart, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface MarketplaceNavbarProps {
  cartCount?: number;
  onCartClick?: () => void;
  onSearch?: (query: string) => void;
}

export default function MarketplaceNavbar({ cartCount = 0, onCartClick, onSearch }: MarketplaceNavbarProps) {
  return (
    <nav className="hidden lg:flex items-center gap-4 px-6 py-3 mb-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
      {/* Logo */}
      <Link href="/catalogues" className="flex items-center gap-2 flex-shrink-0">
        <Image src="/images/logofayclick.png" alt="FayClick" width={32} height={32} />
        <span className="text-white font-bold text-sm">FayClick</span>
      </Link>

      {/* Barre de recherche */}
      <div className="flex-1 flex items-center gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher des produits, marques et categories..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 outline-none transition-all"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
        <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0">
          Rechercher
        </button>
      </div>

      {/* Liens droite */}
      <div className="flex items-center gap-3">
        <Link
          href="/catalogues"
          className="text-white/50 hover:text-white/80 text-sm font-medium transition-colors"
        >
          Categories
        </Link>

        {/* Badge Lives */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-red-300 text-[10px] font-bold">3 Lives</span>
        </div>

        {/* Panier */}
        <button
          onClick={onCartClick}
          className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <ShoppingCart className="w-5 h-5 text-white/60" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        {/* User */}
        <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <User className="w-5 h-5 text-white/60" />
        </button>
      </div>
    </nav>
  );
}
