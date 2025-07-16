import React, { useState } from 'react';
import { useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { useDatabase } from './hooks/useDatabase';
import { generateOrderId, generateTableOrderId } from './utils/orderIdGenerator';
import Login from './components/Login';
import Header from './components/Header';
import NavigationTabs from './components/NavigationTabs';
import TableManagement from './components/TableManagement';
import Reports from './components/Reports';
import ManageSection from './components/ManageSection';
import Settings from './components/Settings';
import { Table, MenuItem, OrderItem } from './types';
import { realSyncService } from './services/realSyncService';

function App() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Load session from localStorage
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('pos_active_tab') || 'pos';
  });
  
  // Load users from localStorage on component mount
  React.useEffect(() => {
    console.log('🔄 Loading users from localStorage...');
    
    // Function to load and set users
    const loadUsers = () => {
      const savedUsers = localStorage.getItem('pos_users');
      if (savedUsers) {
        try {
          const parsedUsers = JSON.parse(savedUsers);
          console.log('👥 Loaded users from localStorage:', parsedUsers.length, 'users');
          setUsers(parsedUsers);
          return parsedUsers;
        } catch (error) {
          console.error('Error loading users from localStorage:', error);
          return null;
        }
      }
      return null;
    };
    
    // Try to load existing users first
    const existingUsers = loadUsers();
    
    // If no users found, create default users
    if (!existingUsers) {
      console.log('📝 No saved users found, creating default users...');
      const defaultUsers = [
        {
          id: '1',
          name: 'Admin User',
          username: 'admin',
          email: 'admin@restaurant.com',
          roleId: 'admin',
          password: 'admin',
          isActive: true
        },
        {
          id: '2',
          name: 'Cashier User',
          username: 'cashier',
          email: 'cashier@restaurant.com',
          roleId: 'cashier',
          password: 'cashier',
          isActive: true
        },
        {
          id: '3',
          name: 'Waiter User',
          username: 'waiter',
          email: 'waiter@restaurant.com',
          roleId: 'waiter',
          password: 'waiter',
          isActive: true
        }
      ];
      setUsers(defaultUsers);
      localStorage.setItem('pos_users', JSON.stringify(defaultUsers));
      console.log('✅ Default users created and saved');
      
      // Broadcast default users to server
      setTimeout(() => {
        defaultUsers.forEach(user => {
          realSyncService.sendUpdate('UPDATE_USERS', { 
            action: 'add', 
            data: user 
          });
        });
      }, 1000);
    }
    
    // Request fresh user data from server after initial load
    setTimeout(() => {
      console.log('🔄 Requesting fresh user data from server...');
      realSyncService.sendUpdate('USER_SYNC', {
        action: 'request_users',
        clientId: realSyncService.getClientId()
      });
    }, 2000);
  }, []);

  // Set up sync service listeners for user updates
  React.useEffect(() => {
    // Listen for user updates from broadcasts
    const handleUsersUpdated = (event: any) => {
      const updatedUsers = event.detail;
      console.log('🔄 Users updated from broadcast event:', updatedUsers.length);
      setUsers(updatedUsers);
    };
    
    window.addEventListener('usersUpdated', handleUsersUpdated);
    
    const handleRemoteUserUpdate = (data: any) => {
      console.log('👥 Received remote user update:', data);
      
      if (data.action === 'add') {
        // Add new user to local storage and state
        const currentUsers = JSON.parse(localStorage.getItem('pos_users') || '[]');
        const userExists = currentUsers.find((u: any) => u.id === data.data.id);
        
        if (!userExists) {
          const updatedUsers = [...currentUsers, data.data];
          localStorage.setItem('pos_users', JSON.stringify(updatedUsers));
          setUsers(updatedUsers);
          console.log('➕ Added new user from remote:', data.data.name);
        }
      } else if (data.action === 'update') {
        // Update existing user
        const currentUsers = JSON.parse(localStorage.getItem('pos_users') || '[]');
        const updatedUsers = currentUsers.map((user: any) => 
          user.id === data.data.id ? data.data : user
        );
        localStorage.setItem('pos_users', JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
        console.log('📝 Updated user from remote:', data.data.name);
      } else if (data.action === 'delete') {
        // Delete user
        const currentUsers = JSON.parse(localStorage.getItem('pos_users') || '[]');
        const updatedUsers = currentUsers.filter((user: any) => user.id !== data.data.id);
        localStorage.setItem('pos_users', JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
        console.log('🗑️ Deleted user from remote:', data.data.id);
      }
    };

    const handleSyncResponse = (data: any) => {
      console.log('🔄 Received sync response with user data:', data);
      if (data && data.users) {
        // Merge users from server with local users
        const serverUsers = data.users || [];
        const localUsers = JSON.parse(localStorage.getItem('pos_users') || '[]');
        
        console.log('👥 Syncing users - Server:', serverUsers.length, 'Local:', localUsers.length);
        
        // Use server users as the source of truth if they exist
        const finalUsers = serverUsers.length > 0 ? serverUsers : localUsers;
        
        // Update localStorage and state
        localStorage.setItem('pos_users', JSON.stringify(finalUsers));
        setUsers(finalUsers);
        
        console.log('✅ Users synced successfully - Final count:', finalUsers.length);
      }
    };
    
    const handleUserSyncResponse = (data: any) => {
      console.log('👥 Received user sync response:', data);
      if (data.action === 'users_response' && data.users) {
        const serverUsers = data.users;
        console.log('📥 Updating users from server response:', serverUsers.length, 'users');
        
        // Update localStorage and state with server users
        localStorage.setItem('pos_users', JSON.stringify(serverUsers));
        setUsers(serverUsers);
        
        console.log('✅ Users updated from server response');
      }
    };
    
    // Set up listener for user updates from sync service
    realSyncService.on('UPDATE_USERS', handleRemoteUserUpdate);
    realSyncService.on('SYNC_RESPONSE', handleSyncResponse);
    realSyncService.on('USER_SYNC', handleUserSyncResponse);

    return () => {
      window.removeEventListener('usersUpdated', handleUsersUpdated);
      realSyncService.off('UPDATE_USERS', handleRemoteUserUpdate);
      realSyncService.off('SYNC_RESPONSE', handleSyncResponse);
      realSyncService.off('USER_SYNC', handleUserSyncResponse);
    };
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Check if session was terminated
    const wasTerminated = localStorage.getItem('pos_session_terminated') === 'true';
    if (wasTerminated) {
      localStorage.removeItem('pos_session_terminated');
      localStorage.removeItem('pos_is_logged_in');
      localStorage.removeItem('pos_current_user');
      localStorage.removeItem('pos_current_user_role');
      localStorage.removeItem('pos_current_user_permissions');
      return false;
    }
    return localStorage.getItem('pos_is_logged_in') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('pos_current_user') || '';
  });
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    return localStorage.getItem('pos_current_user_role') || '';
  });
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>(() => {
    const saved = localStorage.getItem('pos_current_user_permissions');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [sessionWarningTimeout, setSessionWarningTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(0);

  // Default roles with permissions - moved to state so they can be managed
  const [roles, setRoles] = useState([
    {
      id: 'admin',
      name: 'Administrator',
      isSystem: true,
      permissions: [
        'pos_access', 'pos_create_order', 'pos_complete_order', 'pos_cancel_order', 'pos_print_order',
        'table_manage', 'reports_view', 'reports_export', 'menu_view', 'menu_manage', 'category_manage',
        'settings_view', 'settings_manage', 'user_manage', 'role_manage', 'database_manage'
      ]
    },
    {
      id: 'manager',
      name: 'Manager',
      isSystem: true,
      permissions: [
        'pos_access', 'pos_create_order', 'pos_complete_order', 'pos_cancel_order', 'pos_print_order',
        'table_manage', 'reports_view', 'reports_export', 'menu_view', 'menu_manage', 'category_manage',
        'settings_view', 'user_manage'
      ]
    },
    {
      id: 'cashier',
      name: 'Cashier',
      isSystem: true,
      permissions: [
        'pos_access', 'pos_create_order', 'pos_complete_order', 'pos_print_order',
        'reports_view', 'menu_view'
      ]
    },
    {
      id: 'waiter',
      name: 'Waiter',
      isSystem: true,
      permissions: [
        'pos_access', 'pos_create_order', 'menu_view'
      ]
    }
  ]);

  // Users state - will be loaded from localStorage
  const [users, setUsers] = useState<any[]>([]);

  const {
    settings,
    tables,
    menuItems,
    categories,
    orderHistory,
    updateSettings,
    addTable,
    updateTable,
    deleteTable,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addCategory,
    deleteCategory,
    addOrderHistory,
    clearOrderHistory
  } = useDatabase();

  // Save session data to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('pos_active_tab', activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    localStorage.setItem('pos_is_logged_in', isLoggedIn.toString());
    localStorage.setItem('pos_current_user', currentUser);
    localStorage.setItem('pos_current_user_role', currentUserRole);
    localStorage.setItem('pos_current_user_permissions', JSON.stringify(currentUserPermissions));
  }, [isLoggedIn, currentUser, currentUserRole, currentUserPermissions]);

  // Session timeout management
  React.useEffect(() => {
    if (isLoggedIn) {
      const timeoutMinutes = settings?.sessionTimeout || 60; // Default 60 minutes
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const warningMs = timeoutMs - (2 * 60 * 1000); // Show warning 2 minutes before timeout
      
      // Clear existing timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
      if (sessionWarningTimeout) {
        clearTimeout(sessionWarningTimeout);
      }
      
      // Set warning timeout (2 minutes before actual timeout)
      const newWarningTimeout = setTimeout(() => {
        setShowSessionWarning(true);
        setWarningCountdown(120); // 2 minutes countdown
      }, warningMs > 0 ? warningMs : timeoutMs - 1000);
      
      // Set actual logout timeout
      const newTimeout = setTimeout(() => {
        setShowSessionWarning(false);
        handleLogout();
      }, timeoutMs);
      
      setSessionTimeout(newTimeout);
      setSessionWarningTimeout(newWarningTimeout);
      
      return () => {
        if (newTimeout) {
          clearTimeout(newTimeout);
        }
        if (newWarningTimeout) {
          clearTimeout(newWarningTimeout);
        }
      };
    }
  }, [isLoggedIn, settings?.sessionTimeout]);

  // Reset session timeout on user activity
  React.useEffect(() => {
    const resetTimeout = () => {
      if (isLoggedIn && settings?.sessionTimeout) {
        const timeoutMinutes = settings.sessionTimeout;
        const timeoutMs = timeoutMinutes * 60 * 1000;
        const warningMs = timeoutMs - (2 * 60 * 1000);
        
        // Clear existing timeouts
        if (sessionTimeout) {
          clearTimeout(sessionTimeout);
        }
        if (sessionWarningTimeout) {
          clearTimeout(sessionWarningTimeout);
        }
        
        // Hide warning if showing
        if (showSessionWarning) {
          setShowSessionWarning(false);
        }
        
        // Set new warning timeout
        const newWarningTimeout = setTimeout(() => {
          setShowSessionWarning(true);
          setWarningCountdown(120);
        }, warningMs > 0 ? warningMs : timeoutMs - 1000);
        
        // Set new logout timeout
        const newTimeout = setTimeout(() => {
          setShowSessionWarning(false);
          handleLogout();
        }, timeoutMs);
        
        setSessionTimeout(newTimeout);
        setSessionWarningTimeout(newWarningTimeout);
      }
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  }, [isLoggedIn, sessionTimeout, sessionWarningTimeout, showSessionWarning, settings?.sessionTimeout]);

  // Warning countdown effect
  React.useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    
    if (showSessionWarning && warningCountdown > 0) {
      countdownInterval = setInterval(() => {
        setWarningCountdown(prev => {
          if (prev <= 1) {
            setShowSessionWarning(false);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [showSessionWarning, warningCountdown]);

  // Get user permissions based on role
  const getUserPermissions = (roleName: string) => {
    // Handle default admin login
    if (roleName === 'Admin') {
      const adminRole = roles.find(r => r.id === 'admin');
      return adminRole ? adminRole.permissions : [];
    }
    
    const role = roles.find(r => r.name === roleName || r.id === roleName.toLowerCase());
    return role ? role.permissions : [];
  };

  // Check if user has specific permission
  const hasPermission = (permission: string) => {
    return currentUserPermissions.includes(permission);
  };

  const handleUpdateTable = (updatedTable: Table) => {
    updateTable(updatedTable);
  };

  const handleDeleteTable = (tableId: string) => {
    deleteTable(tableId);
  };

  const handleAddTable = () => {
    const existingNumbers = tables.map(t => t.number);
    const newNumber = Math.max(...existingNumbers, 0) + 1;
    
    const newTableData = {
      number: newNumber,
      seats: 4,
      status: 'available' as const,
    };
    addTable(newTableData);
  };

  const handleUpdateMenuItem = (updatedItem: MenuItem) => {
    updateMenuItem(updatedItem);
  };

  const handleDeleteMenuItem = (itemId: string) => {
    deleteMenuItem(itemId);
  };

  const handleAddMenuItem = (newItem: Omit<MenuItem, 'id'>) => {
    addMenuItem(newItem);
  };

  const handleCompleteOrder = (tableId: string, orderItems: OrderItem[], total: number) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
      console.log('Processing order completion for table:', table.number, 'Order ID:', table.orderId);
      
      // Add to order history
      const orderData = {
        id: table.orderId && table.orderId.startsWith('POS-') ? table.orderId : generateOrderId(), // Ensure POS format
        tableNumber: table.number,
        customerName: table.customer || 'Walk-in Customer',
        orderDate: new Date().toISOString().split('T')[0],
        status: 'completed',
        total: total,
        items: orderItems.map(item => ({
          id: item.id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity
        }))
      };
      
      console.log('Adding order to history:', orderData.id);
      addOrderHistory(orderData);
      
      // Free the table
      handleUpdateTable({ 
        ...table, 
        status: 'available', 
        customer: undefined, 
        orderId: undefined,
        orderItems: undefined,
        orderTotal: undefined
      });
      
      console.log('Order completed and table freed:', table.number);
    }
  };

  const handleLogout = () => {
    // Clear session timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
    if (sessionWarningTimeout) {
      clearTimeout(sessionWarningTimeout);
      setSessionWarningTimeout(null);
    }
    
    // Hide warning if showing
    setShowSessionWarning(false);
    
    // Broadcast logout event before clearing session data
    realSyncService.sendUpdate('USER_LOGOUT', {
      clientId: realSyncService.getClientId(),
      userName: currentUser,
      userRole: currentUserRole
    });
    
    // Remove current session from active sessions
    const activeSessions = JSON.parse(localStorage.getItem('pos_active_sessions') || '[]');
    const filteredSessions = activeSessions.filter((s: any) => s.clientId !== realSyncService.getClientId());
    localStorage.setItem('pos_active_sessions', JSON.stringify(filteredSessions));
    
    // Clear session data
    setIsLoggedIn(false);
    setCurrentUser('');
    setCurrentUserRole('');
    setCurrentUserPermissions([]);
    setActiveTab('pos');
    
    // Clear localStorage session data (but keep order history and other data)
    localStorage.removeItem('pos_is_logged_in');
    localStorage.removeItem('pos_current_user');
    localStorage.removeItem('pos_current_user_role');
    localStorage.removeItem('pos_current_user_permissions');
    localStorage.setItem('pos_active_tab', 'pos');
    
    // DO NOT clear order history, tables, menu items, etc.
    // These should persist across login sessions
  };

  const handleExtendSession = () => {
    // Reset session timeout when user chooses to extend
    if (isLoggedIn && settings?.sessionTimeout) {
      const timeoutMinutes = settings.sessionTimeout;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const warningMs = timeoutMs - (2 * 60 * 1000);
      
      // Clear existing timeouts
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
      if (sessionWarningTimeout) {
        clearTimeout(sessionWarningTimeout);
      }
      
      // Hide warning
      setShowSessionWarning(false);
      
      // Set new timeouts
      const newWarningTimeout = setTimeout(() => {
        setShowSessionWarning(true);
        setWarningCountdown(120);
      }, warningMs > 0 ? warningMs : timeoutMs - 1000);
      
      const newTimeout = setTimeout(() => {
        setShowSessionWarning(false);
        handleLogout();
      }, timeoutMs);
      
      setSessionTimeout(newTimeout);
      setSessionWarningTimeout(newWarningTimeout);
    }
  };

  const handleLogin = (username: string, role: string) => {
    setCurrentUser(username);
    setCurrentUserRole(role);
    setCurrentUserPermissions(getUserPermissions(role));
    setIsLoggedIn(true);
  };

  // User management functions
  const handleAddUser = (newUser: any) => {
    const user = {
      ...newUser,
      id: Date.now().toString()
    };
    
    console.log('➕ Adding new user:', user.name, 'ID:', user.id);
    
    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    
    // Save to localStorage to persist changes
    localStorage.setItem('pos_users', JSON.stringify(updatedUsers));
    console.log('💾 Saved users to localStorage:', updatedUsers.length, 'users');
    
    // Sync with other clients
    realSyncService.sendUpdate('UPDATE_USERS', { 
      action: 'add', 
      data: user 
    });
    
    // Broadcast the complete user list to ensure all clients are in sync
    setTimeout(() => {
      realSyncService.sendUpdate('USER_SYNC', {
        action: 'broadcast_users',
        users: updatedUsers,
        fromClient: realSyncService.getClientId()
      });
    }, 500);
    
    console.log('📡 Broadcasted user addition to other clients');
  };

  const handleUpdateUser = (updatedUser: any) => {
    console.log('📝 Updating user:', updatedUser.name, 'ID:', updatedUser.id);
    
    const updatedUsers = users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    );
    setUsers(updatedUsers);
    
    // Save to localStorage to persist changes
    localStorage.setItem('pos_users', JSON.stringify(updatedUsers));
    console.log('💾 Updated users in localStorage');
    
    // Sync with other clients
    realSyncService.sendUpdate('UPDATE_USERS', { 
      action: 'update', 
      data: updatedUser 
    });
    
    // Broadcast the complete user list to ensure all clients are in sync
    setTimeout(() => {
      realSyncService.sendUpdate('USER_SYNC', {
        action: 'broadcast_users',
        users: updatedUsers,
        fromClient: realSyncService.getClientId()
      });
    }, 500);
    
    console.log('📡 Broadcasted user update to other clients');
  };

  const handleDeleteUser = (userId: string) => {
    console.log('🗑️ Deleting user ID:', userId);
    
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    
    // Save to localStorage to persist changes
    localStorage.setItem('pos_users', JSON.stringify(updatedUsers));
    console.log('💾 Removed user from localStorage');
    
    // Sync with other clients
    realSyncService.sendUpdate('UPDATE_USERS', { 
      action: 'delete', 
      data: { id: userId } 
    });
    
    // Broadcast the complete user list to ensure all clients are in sync
    setTimeout(() => {
      realSyncService.sendUpdate('USER_SYNC', {
        action: 'broadcast_users',
        users: updatedUsers,
        fromClient: realSyncService.getClientId()
      });
    }, 500);
    
    console.log('📡 Broadcasted user deletion to other clients');
  };

  // Role management functions
  const handleAddRole = (newRole: any) => {
    const role = {
      ...newRole,
      id: Date.now().toString(),
      isSystem: false
    };
    setRoles([...roles, role]);
  };

  const handleUpdateRole = (updatedRole: any) => {
    setRoles(roles.map(role => 
      role.id === updatedRole.id ? updatedRole : role
    ));
  };

  const handleDeleteRole = (roleId: string) => {
    setRoles(roles.filter(role => role.id !== roleId));
  };

  // Check if user has access to the current tab
  const hasAccessToTab = (tabId: string) => {
    // Admin has access to everything
    if (currentUserRole === 'Admin' || currentUserPermissions.length === 0) {
      return true;
    }
    
    switch (tabId) {
      case 'pos':
        return hasPermission('pos_access');
      case 'reports':
        return hasPermission('reports_view');
      case 'manage':
        return hasPermission('menu_view') || hasPermission('menu_manage');
      case 'settings':
        return hasPermission('settings_view') || hasPermission('settings_manage');
      default:
        return false;
    }
  };

  // Redirect if user doesn't have access to current tab
  React.useEffect(() => {
    if (isLoggedIn && !hasAccessToTab(activeTab)) {
      setActiveTab('pos');
    }
  }, [activeTab, currentUserRole]);

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} users={users} roles={roles} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'pos':
        return (
          <TableManagement
            tables={tables}
            menuItems={menuItems}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
            onAddTable={handleAddTable}
            serviceChargeRate={settings?.serviceCharge || 10}
            serviceChargeEnabled={settings?.serviceChargeEnabled ?? true}
            taxRate={settings?.taxRate || 8.5}
            onCompleteOrder={handleCompleteOrder}
            settings={settings}
          />
        );
      case 'reports':
        return <Reports tables={tables} orderHistory={orderHistory} onClearOrderHistory={clearOrderHistory} settings={settings} />;
      case 'manage':
        return (
          <ManageSection
            menuItems={menuItems}
            categories={categories}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onAddMenuItem={handleAddMenuItem}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
          />
        );
      case 'settings':
        return (
          <Settings 
            settings={settings} 
            onUpdateSettings={updateSettings}
            users={users}
            roles={roles}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onAddRole={handleAddRole}
            onUpdateRole={handleUpdateRole}
            onDeleteRole={handleDeleteRole}
            currentUserPermissions={currentUserPermissions}
          />
        );
      default:
        return (
          <TableManagement
            tables={tables}
            menuItems={menuItems}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
            serviceChargeRate={settings?.serviceCharge || 10}
            serviceChargeEnabled={settings?.serviceChargeEnabled ?? true}
            taxRate={settings?.taxRate || 8.5}
            onCompleteOrder={handleCompleteOrder}
            settings={settings}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${theme}`}>
      <Header
        currentUser={currentUser}
        currentUserRole={currentUserRole}
        onLogout={handleLogout}
        settings={settings}
      />
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} userPermissions={currentUserPermissions} />
      <main className="pb-6">
        {renderContent()}
      </main>
      
      {/* Session Warning Modal */}
      {showSessionWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-2 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Session Timeout Warning
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Your session will expire in <span className="font-bold text-red-600">{Math.floor(warningCountdown / 60)}:{(warningCountdown % 60).toString().padStart(2, '0')}</span> due to inactivity.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Click "Stay Logged In" to extend your session, or you will be automatically logged out.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleExtendSession}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Stay Logged In
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;