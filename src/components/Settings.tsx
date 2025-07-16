import React, { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Save, Upload, Download, Trash2, Plus, Edit, X, User, Shield, Cloud } from 'lucide-react';
import { DatabaseSettings } from '../database/sqlite';
import SyncStatusIndicator from './SyncStatusIndicator';

interface SettingsProps {
  settings: DatabaseSettings | null;
  onUpdateSettings: (settings: Partial<DatabaseSettings>) => void;
  users: any[];
  roles: any[];
  onAddUser: (user: any) => void;
  onUpdateUser: (user: any) => void;
  onDeleteUser: (userId: string) => void;
  onAddRole: (role: any) => void;
  onUpdateRole: (role: any) => void;
  onDeleteRole: (roleId: string) => void;
  currentUserPermissions: string[];
}

const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  users,
  roles,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
  currentUserPermissions
}) => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'roles'>('general');
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Available permissions
  const availablePermissions = [
    { id: 'pos_access', name: 'POS Access', description: 'Access to POS system' },
    { id: 'pos_create_order', name: 'Create Orders', description: 'Create new orders' },
    { id: 'pos_complete_order', name: 'Complete Orders', description: 'Complete and finalize orders' },
    { id: 'pos_cancel_order', name: 'Cancel Orders', description: 'Cancel existing orders' },
    { id: 'pos_print_order', name: 'Print Orders', description: 'Print order receipts' },
    { id: 'table_manage', name: 'Table Management', description: 'Manage table status and reservations' },
    { id: 'reports_view', name: 'View Reports', description: 'Access to reports and analytics' },
    { id: 'reports_export', name: 'Export Reports', description: 'Export reports to PDF/Excel' },
    { id: 'menu_view', name: 'View Menu', description: 'View menu items and categories' },
    { id: 'menu_manage', name: 'Manage Menu', description: 'Add, edit, delete menu items' },
    { id: 'category_manage', name: 'Manage Categories', description: 'Add, edit, delete categories' },
    { id: 'settings_view', name: 'View Settings', description: 'Access to settings page' },
    { id: 'settings_manage', name: 'Manage Settings', description: 'Modify system settings' },
    { id: 'user_manage', name: 'User Management', description: 'Manage users and their roles' },
    { id: 'role_manage', name: 'Role Management', description: 'Manage roles and permissions' },
    { id: 'database_manage', name: 'Database Management', description: 'Export/import database' }
  ];

  const handleSaveSettings = () => {
    onUpdateSettings(localSettings);
    alert(t('settingsSaved'));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      alert('Please upload only image files.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedImageData = canvas.toDataURL('image/jpeg', 0.8);
          setLocalSettings({ ...localSettings, logo: resizedImageData });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleExportDatabase = () => {
    try {
      // Get all data from localStorage
      const menuItems = JSON.parse(localStorage.getItem('restaurant_pos_menu_items') || '[]');
      const categories = JSON.parse(localStorage.getItem('restaurant_pos_categories') || '[]');
      const orderHistory = JSON.parse(localStorage.getItem('restaurant_pos_order_history') || '[]');
      const tables = JSON.parse(localStorage.getItem('restaurant_pos_tables') || '[]');
      
      const data = {
        settings: localSettings,
        users: users,
        roles: roles,
        menuItems: menuItems,
        categories: categories,
        orderHistory: orderHistory,
        tables: tables,
        exportDate: new Date().toISOString(),
        version: '1.2.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${localSettings.restaurantName || 'MiniPOS'}-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Database exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export database.');
    }
  };

  const handleImportDatabase = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('json')) {
      alert('Please select a valid JSON backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // Validate the imported data structure
        if (!importedData.settings && !importedData.users && !importedData.roles) {
          alert('Invalid backup file format.');
          return;
        }

        const confirmed = confirm(
          'This will replace your current settings, users, and roles. Are you sure you want to continue?'
        );

        if (confirmed) {
          // Import settings
          if (importedData.settings) {
            setLocalSettings(importedData.settings);
            onUpdateSettings(importedData.settings);
          }

          // Import users (you would need to implement these methods in your parent component)
          if (importedData.users && Array.isArray(importedData.users)) {
            // Clear existing users and add imported ones
            // This is a simplified approach - in a real app you'd want more sophisticated merging
            importedData.users.forEach((user: any) => {
              onAddUser(user);
            });
          }

          // Import roles
          if (importedData.roles && Array.isArray(importedData.roles)) {
            importedData.roles.forEach((role: any) => {
              if (!role.isSystem) { // Don't import system roles
                onAddRole(role);
              }
            });
          }

          alert('Database imported successfully! Please refresh the page to see all changes.');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import database. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Clear the input
    event.target.value = '';
  };

  const validateUsername = (username: string): boolean => {
    // Username should not contain spaces and should be alphanumeric with underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(username);
  };

  const validateName = (name: string): boolean => {
    // Name can contain letters and spaces only
    const nameRegex = /^[a-zA-Z\s]+$/;
    return nameRegex.test(name.trim());
  };

  const handleAddUser = () => {
    setEditingUser({
      name: '',
      username: '',
      email: '',
      roleId: roles[0]?.id || '',
      password: '',
      isActive: true
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user: any) => {
    setEditingUser({ ...user });
    setShowUserModal(true);
  };

  const handleSaveUser = () => {
    if (!editingUser.name || !editingUser.username || !editingUser.email || !editingUser.roleId) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!validateName(editingUser.name)) {
      alert('Name can only contain letters and spaces (e.g., "Mg Mg").');
      return;
    }

    if (!validateUsername(editingUser.username)) {
      alert('Username cannot contain spaces and should only contain letters, numbers, and underscores (e.g., "user123").');
      return;
    }

    // Check if username already exists (excluding current user when editing)
    const existingUser = users.find(u => 
      u.username === editingUser.username && u.id !== editingUser.id
    );
    if (existingUser) {
      alert('Username already exists. Please choose a different username.');
      return;
    }

    if (editingUser.id) {
      onUpdateUser(editingUser);
    } else {
      onAddUser(editingUser);
    }
    
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleAddRole = () => {
    setEditingRole({
      name: '',
      permissions: []
    });
    setShowRoleModal(true);
  };

  const handleEditRole = (role: any) => {
    setEditingRole({ ...role });
    setShowRoleModal(true);
  };

  const handleSaveRole = () => {
    if (!editingRole.name) {
      alert('Please enter a role name.');
      return;
    }

    if (editingRole.id) {
      onUpdateRole(editingRole);
    } else {
      onAddRole(editingRole);
    }
    
    setShowRoleModal(false);
    setEditingRole(null);
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (!editingRole) return;
    
    const currentPermissions = editingRole.permissions || [];
    const hasPermission = currentPermissions.includes(permissionId);
    
    let newPermissions;
    if (hasPermission) {
      newPermissions = currentPermissions.filter((p: string) => p !== permissionId);
    } else {
      newPermissions = [...currentPermissions, permissionId];
    }
    
    setEditingRole({
      ...editingRole,
      permissions: newPermissions
    });
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown Role';
  };

  const canManageUsers = currentUserPermissions.includes('user_manage') || currentUserPermissions.length === 0;
  const canManageRoles = currentUserPermissions.includes('role_manage') || currentUserPermissions.length === 0;
  const canManageSettings = currentUserPermissions.includes('settings_manage') || currentUserPermissions.length === 0;

  const tabs = [
    { id: 'general', label: t('generalSettings'), icon: Save },
    ...(canManageUsers ? [{ id: 'users', label: t('userManagement'), icon: User }] : []),
    ...(canManageRoles ? [{ id: 'roles', label: t('rolesPermissions'), icon: Shield }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 lg:p-6 mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{t('settings')}</h2>
              <p className="text-purple-100 text-xs sm:text-sm lg:text-base hidden sm:block">{t('configureYourRestaurantPOS')}</p>
            </div>
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 text-purple-100 hover:text-white transition-colors"
            >
              <Save className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="sm:hidden mb-4">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:block bg-white rounded-lg shadow-md border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 lg:space-x-8 px-4 lg:px-6 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Container with proper mobile handling */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6 max-h-screen overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Sync Status Section */}
                <div>
                  <h4 className="text-base lg:text-lg font-medium text-gray-900 mb-4">Multi-Client Synchronization</h4>
                  <SyncStatusIndicator />
                </div>
                
                <hr className="border-gray-200" />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                      POS Name
                    </label>
                    <input
                      type="text"
                      value={localSettings.restaurantName || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, restaurantName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={!canManageSettings}
                    />
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                      {t('currency')}
                    </label>
                    <div className="relative">
                      <select
                      value={localSettings.currency || 'MMK'}
                      onChange={(e) => setLocalSettings({ ...localSettings, currency: e.target.value })}
                        className="w-full px-3 py-2 pr-10 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 appearance-none cursor-pointer hover:border-purple-400"
                      disabled={!canManageSettings}
                      >
                      <option value="MMK">Myanmar Kyat (MMK)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="THB">Thai Baht (THB)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                      {t('taxRate')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localSettings.taxRate || 0}
                      onChange={(e) => setLocalSettings({ ...localSettings, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={!canManageSettings}
                    />
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                      {t('serviceChargeRate')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localSettings.serviceCharge || 0}
                      onChange={(e) => setLocalSettings({ ...localSettings, serviceCharge: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={!canManageSettings}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={localSettings.sessionTimeout || 60}
                      onChange={(e) => setLocalSettings({ ...localSettings, sessionTimeout: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={!canManageSettings}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically logout users after this period of inactivity (5-480 minutes)
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div 
                    className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-gray-100 rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200 active:bg-gray-200" 
                    onClick={() => {
                      if (canManageSettings) {
                        console.log('Service charge checkbox clicked:', !localSettings.serviceChargeEnabled);
                        setLocalSettings({ ...localSettings, serviceChargeEnabled: !localSettings.serviceChargeEnabled });
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      id="serviceChargeEnabled"
                      checked={localSettings.serviceChargeEnabled || false}
                      onChange={() => {}} // Handled by parent div click
                      disabled={!canManageSettings}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-0.5 cursor-pointer flex-shrink-0 pointer-events-none"
                      readOnly
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="serviceChargeEnabled" className="text-sm font-medium text-gray-900 cursor-pointer block">
                        {t('enableServiceCharge')}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Add service charge to all orders automatically
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                    {t('language')}
                  </label>
                  <div className="relative">
                    <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'my')}
                      className="w-full max-w-xs px-3 py-2 pr-10 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 appearance-none cursor-pointer hover:border-purple-400"
                    >
                    <option value="en">English</option>
                    <option value="my">မြန်မာ</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                    POS Description
                  </label>
                  <textarea
                    value={localSettings.description || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Enter POS description"
                    disabled={!canManageSettings}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This description appears in the header and login page
                  </p>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                    {t('theme')}
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-4 py-2 rounded-md border transition-colors ${
                        theme === 'light'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } text-xs font-medium`}
                    >
                      {t('light')}
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-4 py-2 rounded-md border transition-colors ${
                        theme === 'dark'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } text-xs font-medium`}
                    >
                      {t('dark')}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                    {t('uploadLogo')}
                  </label>
                  <div className="flex items-start space-x-4">
                    {localSettings.logo && (
                      <img
                        src={localSettings.logo}
                        alt="Restaurant Logo"
                        className="h-16 w-16 rounded-full object-cover border border-gray-300"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={!canManageSettings}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canManageSettings}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="h-3 w-3 mr-1.5" />
                        <span className="text-xs">{t('chooseFile')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={!canManageSettings}
                    className="flex items-center px-4 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-3 w-3 mr-1.5" />
                    {t('saveSettings')}
                  </button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <button
                    onClick={handleImportDatabase}
                    disabled={!canManageSettings}
                    className="flex items-center px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-3 w-3 mr-1.5" />
                    {t('importDatabase')}
                  </button>
                  <button
                    onClick={handleExportDatabase}
                    className="flex items-center px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    <Download className="h-3 w-3 mr-1.5" />
                    {t('exportDatabase')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && canManageUsers && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">{t('userManagement')}</h3>
                  <button
                    onClick={handleAddUser}
                    className="flex items-center px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addUser')}
                  </button>
                </div>

                {/* Mobile-friendly table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('userEmail')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('userRole')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.username || user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getRoleName(user.roleId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-purple-600 hover:text-purple-900 mr-3"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'roles' && canManageRoles && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">{t('rolesPermissions')}</h3>
                  <button
                    onClick={handleAddRole}
                    className="flex items-center px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addRole')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{role.name}</h4>
                          <p className="text-sm text-gray-500">
                            {role.permissions?.length || 0} permissions
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditRole(role)}
                            className="text-purple-600 hover:text-purple-900"
                           title="Edit role"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {!role.isSystem && (
                            <button
                              onClick={() => onDeleteRole(role.id)}
                              className="text-red-600 hover:text-red-900"
                             title="Delete role"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {role.permissions?.slice(0, 3).map((permission: string) => (
                          <div key={permission}>
                            • {availablePermissions.find(p => p.id === permission)?.name || permission}
                          </div>
                        ))}
                        {role.permissions?.length > 3 && (
                          <div className="text-gray-500">
                            +{role.permissions.length - 3} more...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser.id ? t('editUser') : t('addUser')}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Admin User"
                />
                <p className="text-xs text-gray-500 mt-1">Full display name (can contain spaces)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., admin"
                />
                <p className="text-xs text-gray-500 mt-1">No spaces allowed. Use letters, numbers, and underscores only</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('userEmail')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('userRole')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingUser.roleId}
                  onChange={(e) => setEditingUser({ ...editingUser, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('setPassword')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={editingUser.isActive}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="userActive" className="ml-2 block text-sm text-gray-900">
                  {t('activeUser')}
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveUser}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingUser.id ? t('updateUser') : t('addUser')}
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRole.id ? t('editRole') : t('addRole')}
              </h3>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('roleName')}
                </label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-4">
                  {t('assignPermissions')}
                </label>
                <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-64 sm:max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3 sm:p-4">
                  {availablePermissions.map(permission => (
                    <div 
                      key={permission.id} 
                      className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200 active:bg-gray-100" 
                      onClick={() => handlePermissionToggle(permission.id)}
                    >
                      <input
                        type="checkbox"
                        id={permission.id}
                        checked={editingRole?.permissions?.includes(permission.id) || false}
                        onChange={() => handlePermissionToggle(permission.id)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-0.5 cursor-pointer flex-shrink-0 pointer-events-none"
                        readOnly
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={permission.id} className="text-sm font-medium text-gray-900 cursor-pointer block">
                          {permission.name}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveRole}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingRole.id ? t('updateRole') : t('addRole')}
                </button>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;