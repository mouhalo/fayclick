'use client';

import { useEffect, useState } from 'react';

interface VersionLabelProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export function VersionLabel({ variant = 'desktop', className = '' }: VersionLabelProps) {
  const [version, setVersion] = useState<string>('');
  const [buildDate, setBuildDate] = useState<string>('');

  useEffect(() => {
    // Récupérer la version depuis package.json ou variable d'environnement
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0';
    const buildTimestamp = process.env.NEXT_PUBLIC_BUILD_DATE || '';

    setVersion(appVersion);

    // Formater la date de build si disponible
    if (buildTimestamp) {
      const date = new Date(buildTimestamp);
      const formattedDate = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      setBuildDate(formattedDate);
    }
  }, []);

  if (variant === 'mobile') {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[10px] text-emerald-200/70 ${className}`}>
        <span className="font-mono">v{version}</span>
        {buildDate && (
          <>
            <span className="opacity-50">•</span>
            <span className="opacity-60">{buildDate}</span>
          </>
        )}
      </div>
    );
  }

  // Desktop variant
  return (
    <div className={`inline-flex items-center gap-2 text-xs text-white/60 ${className}`}>
      <span className="font-mono font-medium">v{version}</span>
      {buildDate && (
        <>
          <span className="opacity-50">•</span>
          <span className="opacity-70">{buildDate}</span>
        </>
      )}
    </div>
  );
}
