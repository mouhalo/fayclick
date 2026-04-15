'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/hooks/useTranslations';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const t = useTranslations('marketplace');
  return (
    <nav className="hidden lg:flex items-center gap-1.5 text-xs text-white/40 mb-4">
      <Link href="/catalogues" className="flex items-center gap-1 hover:text-white/60 transition-colors">
        <Home className="w-3 h-3" />
        {t('boutiqueHeader.back')}
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-white/20" />
          {item.href ? (
            <Link href={item.href} className="hover:text-white/60 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-white/60">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
