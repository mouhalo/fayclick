'use client';

import React, { useRef } from 'react';
import { TabNavigationProps, TabId } from '../types/structure-page';

const TabNavigation: React.FC<TabNavigationProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  isMobile = false 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Faire défiler vers l'onglet actif sur mobile
  const scrollToActiveTab = (tabId: TabId) => {
    if (!isMobile || !scrollContainerRef.current) return;
    
    const activeTabElement = scrollContainerRef.current.querySelector(`[data-tab="${tabId}"]`);
    if (activeTabElement) {
      activeTabElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  };

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    setTimeout(() => scrollToActiveTab(tabId), 100);
  };

  if (isMobile) {
    // Navigation mobile avec scroll horizontal
    return (
      <div className="w-full">
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-1 px-2 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center
                px-4 py-3 rounded-lg transition-all duration-200 min-w-[80px]
                ${activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }
              `}
            >
              <span className="text-lg mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Navigation desktop/tablet
  return (
    <nav className="flex space-x-8" aria-label="Tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            relative flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${activeTab === tab.id 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          <span className="text-lg">{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.badge && (
            <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {tab.badge}
            </span>
          )}
          
          {/* Indicateur actif */}
          {activeTab === tab.id && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500" />
          )}
        </button>
      ))}
    </nav>
  );
};

export default TabNavigation;