import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { User, LogOut, Calendar, Menu, X, Wifi, WifiOff } from 'lucide-react';
import { DatabaseSettings } from '../database/localStorage';
import { useDatabase } from '../hooks/useDatabase';

interface HeaderProps {
  currentUser: string;
  currentUserRole: string;
  onLogout: () => void;
  settings: DatabaseSettings | null;
}

const Header: React.FC<HeaderProps> = ({ currentUser, currentUserRole, onLogout, settings }) => {
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { isOnline, clientId } = useDatabase();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and Title */}
          <div className="flex items-center min-w-0 flex-1">
            {settings?.logo && (
              <img 
                src={settings.logo} 
                alt="Restaurant Logo" 
                className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 mr-1 sm:mr-2 lg:mr-3 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 truncate">
                {settings?.restaurantName || 'MiniPOS'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block truncate">
                {settings?.description || 'Professional Point of Sale System'}
              </p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Sync Status */}
            <div className="flex items-center space-x-1 lg:space-x-2">
              <div className={`flex items-center ${isOnline ? 'text-green-600' : 'text-orange-600'}`} 
                   title={isOnline ? `Connected to sync server - Client: ${clientId.slice(-8)}` : 'Standalone mode - Local storage only'}>
                {isOnline ? <Wifi className="h-4 w-4 mr-1" /> : <WifiOff className="h-4 w-4 mr-1" />}
                <span className="text-xs hidden lg:inline">{isOnline ? 'Synced' : 'Local'}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="text-right hidden lg:block">
                <div className="text-sm font-medium text-gray-900 truncate max-w-32">{currentUser}</div>
                <div className="text-xs text-gray-500">{t(currentUserRole.toLowerCase())}</div>
                <div className="text-xs text-gray-400" title={`Full Client ID: ${clientId}`}>
                  Client: {clientId.slice(-8)}
                </div>
              </div>
              <User className="h-5 w-5 lg:h-6 lg:w-6 text-gray-400 flex-shrink-0" />
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">{t('logout')}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex-shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-3">
            <div className="space-y-3">
              {/* Mobile Sync Status */}
              <div className="flex items-center justify-between px-2">
                <span className="text-sm text-gray-600">Connection Status:</span>
                <div className={`flex items-center ${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
                  {isOnline ? <Wifi className="h-4 w-4 mr-1" /> : <WifiOff className="h-4 w-4 mr-1" />}
                  <span className="text-sm">{isOnline ? 'Synced' : 'Local'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{currentUser}</div>
                    <div className="text-xs text-gray-500">{t(currentUserRole.toLowerCase())}</div>
                    <div className="text-xs text-gray-400">Client: {clientId.slice(-6)}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-2 px-2">
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 transition-colors rounded-md bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;