'use client';

import Image from 'next/image';
import Link from 'next/link';

interface MarketplaceNavbarProps {
  livesCount?: number;
}

export default function MarketplaceNavbar({ livesCount = 0 }: MarketplaceNavbarProps) {
  return (
    <nav className="hidden lg:flex items-center justify-between px-6 py-3 mb-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
      {/* Logo */}
      <Link href="/catalogues" className="flex items-center gap-2 flex-shrink-0">
        <Image src="/images/logofayclick.png" alt="FayClick" width={32} height={32} />
        <span className="text-white font-bold text-sm">FayClick</span>
      </Link>

      {/* Badge Lives actifs (dynamique) */}
      {livesCount > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-red-300 text-[10px] font-bold">{livesCount} Live{livesCount > 1 ? 's' : ''}</span>
        </div>
      )}
    </nav>
  );
}
