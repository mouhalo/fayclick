'use client';

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  Package,
  FileText,
  Users,
  Wallet,
  Vault,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { User as UserType } from '@/types/auth';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  onClick?: () => void;
}

interface DashboardSidebarProps {
  user: UserType;
  collapsed: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onCoffreClick: () => void;
  onProfilClick: () => void;
  onToggleCollapse?: () => void;
}

export default function DashboardSidebar({
  user,
  collapsed,
  onNavigate,
  onLogout,
  onCoffreClick,
  onProfilClick,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Tableau de Bord', path: '/dashboard/commerce' },
    { icon: <User className="w-5 h-5" />, label: 'Mon Profil', path: '#profil', onClick: onProfilClick },
    { icon: <Package className="w-5 h-5" />, label: 'Mes Produits', path: '/dashboard/commerce/produits' },
    { icon: <FileText className="w-5 h-5" />, label: 'Mes Factures', path: '/dashboard/commerce/factures' },
    { icon: <Users className="w-5 h-5" />, label: 'Mes Clients', path: '/dashboard/commerce/clients' },
    { icon: <Wallet className="w-5 h-5" />, label: 'Mes Depenses', path: '/dashboard/commerce/depenses' },
    { icon: <Vault className="w-5 h-5" />, label: 'Mon Coffre', path: '#coffre', onClick: onCoffreClick },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Insights', path: '/dashboard/commerce/inventaire' },
    { icon: <Settings className="w-5 h-5" />, label: 'Parametres', path: '/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard/commerce') return pathname === path;
    if (path.startsWith('#')) return false;
    return pathname.startsWith(path);
  };

  return (
    <aside
      className="h-screen sticky top-0 flex flex-col transition-all duration-300 ease-in-out z-40"
      style={{
        width: collapsed ? 72 : 260,
        minWidth: collapsed ? 72 : 260,
        background: 'linear-gradient(180deg, #18542e 0%, #16a34d 100%)',
      }}
    >
      {/* Logo + Toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 pt-6 pb-4`}>
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNavigate('/dashboard/commerce')}
        >
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-lg font-black text-orange-500">FC</span>
          </div>
          {!collapsed && (
            <span className="text-white font-bold text-lg tracking-wide">FayClick</span>
          )}
        </div>
        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapsed toggle button */}
      {onToggleCollapse && collapsed && (
        <button
          onClick={onToggleCollapse}
          className="mx-auto mb-2 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  onNavigate(item.path);
                }
              }}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 rounded-xl transition-all duration-200
                ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5'}
                ${active
                  ? 'bg-white/20 text-white border-l-3 border-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <span className={`flex-shrink-0 ${active ? 'drop-shadow-sm' : ''}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'} truncate`}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profil utilisateur en bas */}
      <div className={`border-t border-white/15 px-3 py-4 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col' : ''} gap-3 mb-3`}>
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {user.username || user.login}
              </p>
              <p className="text-white/60 text-xs truncate">
                {user.nom_structure}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          title={collapsed ? 'Deconnexion' : undefined}
          className={`
            w-full flex items-center gap-2 rounded-lg px-3 py-2
            bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white
            transition-all duration-200
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Deconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
