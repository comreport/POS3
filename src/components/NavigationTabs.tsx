import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, BarChart3, Settings, ShoppingCart } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userPermissions: string[];
}

const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, onTabChange, userPermissions }) => {
  const { t } = useLanguage();
  
  const allTabs = [
    { id: 'pos', label: t('posSystem'), icon: ShoppingCart, shortLabel: 'POS' },
    { id: 'reports', label: t('reports'), icon: BarChart3, shortLabel: t('reports') },
    { id: 'manage', label: t('manage'), icon: Settings, shortLabel: t('manage') },
    { id: 'settings', label: t('settings'), icon: Settings, shortLabel: t('settings') },
  ];

  // Filter tabs based on user permissions
  const getVisibleTabs = () => {
    return allTabs.filter(tab => {
      switch (tab.id) {
        case 'pos':
          return userPermissions.includes('pos_access') || userPermissions.length === 0; // Always show for admin
        case 'reports':
          return userPermissions.includes('reports_view') || userPermissions.length === 0;
        case 'manage':
          return userPermissions.includes('menu_view') || userPermissions.includes('menu_manage') || userPermissions.length === 0;
        case 'settings':
          return userPermissions.includes('settings_view') || userPermissions.length === 0;
        default:
          return userPermissions.length === 0; // Show all tabs for admin
      }
    });
  };

  const tabs = getVisibleTabs();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex space-x-1 sm:space-x-4 lg:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center px-2 sm:px-3 lg:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-0 flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-500 bg-blue-50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{tab.label}</span>
                <span className="sm:hidden text-xs truncate">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default NavigationTabs;