'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { User } from '@/types/auth';

interface ProduitsDesktopViewProps {
  user: User;
  children: ReactNode;
  // Sidebar
  onShowCoffreModal: () => void;
  onShowLogoutModal: () => void;
  onShowProfilModal: () => void;
  isTablet: boolean;
}

export default function ProduitsDesktopView({
  user,
  children,
  onShowCoffreModal,
  onShowLogoutModal,
  onShowProfilModal,
  isTablet,
}: ProduitsDesktopViewProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isTablet);

  useEffect(() => {
    setSidebarCollapsed(isTablet);
  }, [isTablet]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen flex bg-[#f0fdf4]">
      {/* Sidebar */}
      <DashboardSidebar
        user={user}
        collapsed={sidebarCollapsed}
        onNavigate={handleNavigate}
        onLogout={onShowLogoutModal}
        onCoffreClick={onShowCoffreModal}
        onProfilClick={onShowProfilModal}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Zone principale */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Top Bar sticky */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/commerce')}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Gestion des Produits</h1>
              <p className="text-xs text-gray-500">{user.nom_structure}</p>
            </div>
          </div>
        </header>

        {/* Contenu (injecte depuis page.tsx) */}
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
