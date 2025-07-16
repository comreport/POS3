import { useState, useEffect } from 'react';
import { database, DatabaseSettings } from '../database/localStorage';
import { Table, MenuItem } from '../types';
import { realSyncService } from '../services/realSyncService';
import { generateOrderId } from '../utils/orderIdGenerator';

export const useDatabase = () => {
  const [settings, setSettings] = useState<DatabaseSettings | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [clientId, setClientId] = useState('');

  // Load initial data
  useEffect(() => {
    loadSettings();
    loadTables();
    loadMenuItems();
    loadCategories();
    loadOrderHistory();
    
    // Initialize sync service
    setClientId(realSyncService.getClientId());
    
    // Set up sync listeners
    realSyncService.on('connected', (data: any) => {
      setIsOnline(true);
      console.log('Connected to sync service:', data);
      
      // Request fresh data from server
      setTimeout(() => {
        realSyncService.requestSync();
      }, 500);
    });
    
    realSyncService.on('offline', () => {
      setIsOnline(false);
      console.log('Working in offline mode');
    });
    
    // Handle incoming updates from other clients
    realSyncService.on('UPDATE_TABLE', (data: any) => {
      console.log('Received table update from another client:', data);
      handleRemoteTableUpdate(data);
    });
    
    realSyncService.on('UPDATE_ORDER', (data: any) => {
      console.log('Received order update from another client:', data);
      handleRemoteOrderUpdate(data);
    });
    
    realSyncService.on('UPDATE_MENU', (data: any) => {
      console.log('Received menu update from another client:', data);
      handleRemoteMenuUpdate(data);
    });
    
    realSyncService.on('UPDATE_SETTINGS', (data: any) => {
      console.log('Received settings update from another client:', data);
      handleRemoteSettingsUpdate(data);
    });
    
    realSyncService.on('SYNC_RESPONSE', (data: any) => {
      console.log('Received sync response from server:', data);
      handleSyncResponse(data);
    });
    
    realSyncService.on('UPDATE_USERS', (data: any) => {
      console.log('Received user update from another client:', data);
      // User updates are now handled in App.tsx
    });
    
    realSyncService.on('TERMINATE_SESSION', (data: any) => {
      console.log('Received session termination:', data);
      // Handle session termination if needed
    });
    
    realSyncService.on('FORCE_LOGOUT', (data: any) => {
      console.log('Received forced logout:', data);
      // The realSyncService already handles the logout, this is just for logging
    });
    
    return () => {
      realSyncService.disconnect();
    };
  }, []);

  // Handle remote updates
  const handleRemoteTableUpdate = (data: any) => {
    if (data.action === 'add') {
      // Add new table to local storage and state
      database.addTable(data.data);
      loadTables();
    } else if (data.action === 'update') {
      // Update existing table
      database.updateTable(data.data);
      loadTables();
    } else if (data.action === 'delete') {
      // Delete table
      database.deleteTable(data.data.id);
      loadTables();
    }
  };

  const handleRemoteOrderUpdate = (data: any) => {
    console.log('🔄 Processing remote order update:', data);
    
    if (data.action === 'add') {
      // Process remote order updates and ensure proper sync
      try {
        const orderForDb = {
          ...data.data,
          items: typeof data.data.items === 'string' ? data.data.items : JSON.stringify(data.data.items),
          createdAt: data.data.createdAt || new Date().toISOString()
        };
        
        // Get current history from localStorage
        const currentHistory = database.getOrderHistory();
        const existingIndex = currentHistory.findIndex(order => order.id === data.data.id);
        
        let updatedHistory;
        if (existingIndex >= 0) {
          // Update existing order
          updatedHistory = [...currentHistory];
          updatedHistory[existingIndex] = orderForDb;
          console.log('📝 Updated existing remote order:', data.data.id);
        } else {
          // Add new order
          updatedHistory = [...currentHistory, orderForDb];
          console.log('➕ Added new remote order:', data.data.id);
        }
        
        // Save to localStorage
        localStorage.setItem('restaurant_pos_order_history', JSON.stringify(updatedHistory));
        
        // Update state with parsed items for display
        const orderForState = {
          ...data.data,
          items: typeof data.data.items === 'string' ? JSON.parse(data.data.items) : data.data.items
        };
        
        setOrderHistory(prev => {
          const existingStateIndex = prev.findIndex(order => order.id === data.data.id);
          if (existingStateIndex >= 0) {
            // Update existing order in state
            const updated = [...prev];
            updated[existingStateIndex] = orderForState;
            return updated;
          } else {
            // Add new order to state
            return [...prev, orderForState];
          }
        });
        
        console.log('✅ Remote order processed successfully:', data.data.id);
      } catch (error) {
        console.error('❌ Error processing remote order update:', error);
      }
      
    } else if (data.action === 'clear') {
      // Clear all orders
      database.clearOrderHistory();
      setOrderHistory([]);
      console.log('Cleared order history from remote update');
    }
  };

  const handleRemoteMenuUpdate = (data: any) => {
    if (data.action === 'add_item') {
      database.addMenuItem(data.data);
      loadMenuItems();
    } else if (data.action === 'update_item') {
      database.updateMenuItem(data.data);
      loadMenuItems();
    } else if (data.action === 'delete_item') {
      database.deleteMenuItem(data.data.id);
      loadMenuItems();
    } else if (data.action === 'add_category') {
      database.addCategory(data.data.name);
      loadCategories();
    } else if (data.action === 'delete_category') {
      database.deleteCategory(data.data.name);
      loadCategories();
    }
  };

  const handleRemoteSettingsUpdate = (data: any) => {
    // Update settings in local storage
    database.updateSettings(data);
    loadSettings();
  };

  const handleRemoteUserUpdate = (data: any) => {
    // This is handled in App.tsx, but we can add logging here
    console.log('User update received in useDatabase:', data);
  };

  const handleSyncResponse = (data: any) => {
    // Update local state with server data
    if (data.data) {
      if (data.data.tables) {
        // Update localStorage with server data
        localStorage.setItem('restaurant_pos_tables', JSON.stringify(data.data.tables));
        setTables(data.data.tables);
      }
      if (data.data.menuItems) {
        localStorage.setItem('restaurant_pos_menu_items', JSON.stringify(data.data.menuItems));
        setMenuItems(data.data.menuItems);
      }
      if (data.data.categories) {
        localStorage.setItem('restaurant_pos_categories', JSON.stringify(data.data.categories));
        setCategories(data.data.categories);
      }
      if (data.data.settings) {
        localStorage.setItem('restaurant_pos_settings', JSON.stringify(data.data.settings));
        setSettings(data.data.settings);
      }
      if (data.data.orderHistory) {
        try {
          // Handle server order history sync
          const serverOrderHistory = data.data.orderHistory || [];
          const localOrderHistory = database.getOrderHistory();
          
          console.log('📋 Syncing order history - Server:', serverOrderHistory.length, 'Local:', localOrderHistory.length);
          
          // Parse local orders for comparison
          const parsedLocalHistory = localOrderHistory.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
          }));
          
          // Create a map for efficient lookup
          const orderMap = new Map();
          
          // Add all local orders first
          parsedLocalHistory.forEach(order => {
            orderMap.set(order.id, order);
          });
          
          // Add or update with server orders
          serverOrderHistory.forEach((serverOrder: any) => {
            const parsedServerOrder = {
              ...serverOrder,
              items: typeof serverOrder.items === 'string' ? JSON.parse(serverOrder.items) : serverOrder.items
            };
            orderMap.set(serverOrder.id, parsedServerOrder);
          });
          
          // Convert map back to array
          const mergedHistory = Array.from(orderMap.values());
          
          // Sort by creation date (newest first)
          mergedHistory.sort((a, b) => new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime());
          
          // Save merged history back to localStorage
          const orderHistoryForStorage = mergedHistory.map((order: any) => ({
            ...order,
            items: typeof order.items === 'string' ? order.items : JSON.stringify(order.items)
          }));
          localStorage.setItem('restaurant_pos_order_history', JSON.stringify(orderHistoryForStorage));
          
          // Update state with merged history
          setOrderHistory(mergedHistory);
          console.log('✅ Order history synced successfully - Final count:', mergedHistory.length);
        } catch (error) {
          console.error('❌ Error syncing order history:', error);
          // Fallback to server data if merge fails
          const serverOrderHistory = data.data.orderHistory || [];
          setOrderHistory(serverOrderHistory);
          
          const orderHistoryForStorage = serverOrderHistory.map((order: any) => ({
            ...order,
            items: typeof order.items === 'string' ? order.items : JSON.stringify(order.items)
          }));
          localStorage.setItem('restaurant_pos_order_history', JSON.stringify(orderHistoryForStorage));
        }
      }
      if (data.data.users) {
        // Sync users from server
        localStorage.setItem('pos_users', JSON.stringify(data.data.users));
        console.log('👥 Synced users from server:', data.data.users.length, 'users');
        
        // Don't trigger custom event here as it's handled in App.tsx now
      }
      if (data.data.activeSessions) {
        // Update active sessions from server
        const sessionsForStorage = data.data.activeSessions.map((session: any) => ({
          ...session,
          loginTime: typeof session.loginTime === 'string' ? session.loginTime : session.loginTime.toISOString(),
          lastActivity: typeof session.lastActivity === 'string' ? session.lastActivity : session.lastActivity.toISOString()
        }));
        localStorage.setItem('pos_active_sessions', JSON.stringify(sessionsForStorage));
        console.log('👥 Synced active sessions from server:', data.data.activeSessions.length, 'sessions');
      }
    }
  };

  const loadSettings = () => {
    try {
      const dbSettings = database.getSettings();
      setSettings(dbSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTables = () => {
    try {
      const dbTables = database.getTables();
      setTables(dbTables);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const loadMenuItems = () => {
    try {
      const dbMenuItems = database.getMenuItems();
      setMenuItems(dbMenuItems);
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const loadCategories = () => {
    try {
      const dbCategories = database.getCategories();
      setCategories(dbCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadOrderHistory = () => {
    try {
      console.log('🔄 Loading order history from localStorage...');
      const dbOrderHistory = database.getOrderHistory();
      console.log('📋 Raw order history from database:', dbOrderHistory.length, 'orders');
      
      const parsedHistory = dbOrderHistory.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      }));
      
      console.log('✅ Parsed order history:', parsedHistory.length, 'orders');
      setOrderHistory(parsedHistory);
    } catch (error) {
      console.error('Error loading order history:', error);
      // Set empty array as fallback
      setOrderHistory([]);
    }
  };

  // Settings methods
  const updateSettings = (newSettings: Partial<DatabaseSettings>) => {
    try {
      database.updateSettings(newSettings);
      loadSettings();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_SETTINGS', newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Tables methods
  const addTable = (tableData: Omit<Table, 'id'>) => {
    try {
      const newTable = database.addTable(tableData);
      loadTables();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_TABLE', { action: 'add', data: newTable });
    } catch (error) {
      console.error('Error adding table:', error);
    }
  };

  const updateTable = (table: Table) => {
    try {
      database.updateTable(table);
      loadTables();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_TABLE', { action: 'update', data: table });
    } catch (error) {
      console.error('Error updating table:', error);
    }
  };

  const deleteTable = (id: string) => {
    try {
      database.deleteTable(id);
      loadTables();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_TABLE', { action: 'delete', data: { id } });
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  // Menu items methods
  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    try {
      const newItem = database.addMenuItem(item);
      loadMenuItems();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_MENU', { action: 'add_item', data: newItem });
    } catch (error) {
      console.error('Error adding menu item:', error);
    }
  };

  const updateMenuItem = (item: MenuItem) => {
    try {
      database.updateMenuItem(item);
      loadMenuItems();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_MENU', { action: 'update_item', data: item });
    } catch (error) {
      console.error('Error updating menu item:', error);
    }
  };

  const deleteMenuItem = (id: string) => {
    try {
      database.deleteMenuItem(id);
      loadMenuItems();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_MENU', { action: 'delete_item', data: { id } });
    } catch (error) {
      console.error('Error deleting menu item:', error);
    }
  };

  // Categories methods
  const addCategory = (name: string) => {
    try {
      database.addCategory(name);
      loadCategories();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_MENU', { action: 'add_category', data: { name } });
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const deleteCategory = (name: string) => {
    try {
      database.deleteCategory(name);
      loadCategories();
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_MENU', { action: 'delete_category', data: { name } });
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Order history methods
  const addOrderHistory = (order: any) => {
    try {
      console.log('📋 Adding order to history:', order.id);
      
      // Prepare order data for database storage
      const orderForDb = {
        ...order,
        items: typeof order.items === 'string' ? order.items : JSON.stringify(order.items),
        createdAt: order.createdAt || new Date().toISOString()
      };
      
      // Use database method to add order
      database.addOrderHistory(orderForDb);
      
      // Reload order history to ensure consistency
      loadOrderHistory();
      
      // Prepare order for sync (with parsed items)
      const orderForSync = {
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        createdAt: orderForDb.createdAt
      };
      
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_ORDER', { 
        action: 'add', 
        data: orderForSync
      });
      
      console.log('✅ Order processed and synced:', order.id);
    } catch (error) {
      console.error('Error adding order history:', error);
      // Reload order history as fallback
      loadOrderHistory();
    }
  };

  const clearOrderHistory = () => {
    try {
      console.log('Clearing order history...');
      
      // Clear from database first
      database.clearOrderHistory();
      
      // Reload to ensure state is consistent
      loadOrderHistory();
      
      // Sync with other clients
      realSyncService.sendUpdate('UPDATE_ORDER', { action: 'clear', data: {} });
      
      console.log('Order history cleared successfully');
    } catch (error) {
      console.error('Error clearing order history:', error);
      // Reload as fallback
      loadOrderHistory();
      throw error;
    }
  };

  return {
    // Data
    settings,
    tables,
    menuItems,
    categories,
    orderHistory,
    
    // Sync status
    isOnline,
    clientId,
    
    // Settings methods
    updateSettings,
    
    // Tables methods
    addTable,
    updateTable,
    deleteTable,
    
    // Menu items methods
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    
    // Categories methods
    addCategory,
    deleteCategory,
    
    // Order history methods
    addOrderHistory,
    clearOrderHistory,
    
    // Reload methods
    loadSettings,
    loadTables,
    loadMenuItems,
    loadCategories,
    loadOrderHistory
  };
};