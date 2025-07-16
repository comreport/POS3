// Browser-compatible database using LocalStorage
export interface DatabaseSettings {
  id: number;
  restaurantName: string;
  description?: string;
  logo?: string;
  currency: string;
  taxRate: number;
  serviceCharge: number;
  serviceChargeEnabled: boolean;
  theme: 'light' | 'dark';
  language: string;
  sessionTimeout: number;
}

export interface DatabaseOrderHistory {
  id: string;
  tableNumber: number;
  customerName: string;
  orderDate: string;
  status: string;
  total: number;
  items: any[];
  createdAt: string;
}

class LocalStorageDatabase {
  private storageKeys = {
    settings: 'restaurant_pos_settings',
    tables: 'restaurant_pos_tables',
    menuItems: 'restaurant_pos_menu_items',
    categories: 'restaurant_pos_categories',
    orderHistory: 'restaurant_pos_order_history'
  };

  constructor() {
    this.initializeDatabase();
    console.log('LocalStorage database initialized');
  }

  private initializeDatabase() {
    // Initialize with default data if not exists
    if (!this.getSettings()) {
      this.insertDefaultSettings();
    }
    if (this.getCategories().length === 0) {
      this.insertDefaultCategories();
    }
    if (this.getTables().length === 0) {
      this.insertDefaultTables();
    }
    if (this.getMenuItems().length === 0) {
      this.insertDefaultMenuItems();
    }
  }

  private insertDefaultSettings() {
    const defaultSettings: DatabaseSettings = {
      id: 1,
      restaurantName: 'MiniPOS',
      description: 'Professional Point of Sale System',
      currency: 'MMK',
      taxRate: 5.0,
      serviceCharge: 0.0,
      serviceChargeEnabled: false,
      theme: 'light',
      language: 'en',
      sessionTimeout: 60
    };
    localStorage.setItem(this.storageKeys.settings, JSON.stringify(defaultSettings));
  }

  private insertDefaultCategories() {
    const categories = ['Appetizers', 'Main Menu', 'Pasta', 'Pizza', 'Dessert', 'Beverage'];
    localStorage.setItem(this.storageKeys.categories, JSON.stringify(categories));
  }

  private insertDefaultTables() {
    const tables = [];
    for (let i = 1; i <= 8; i++) {
      const seats = i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2;
      tables.push({
        id: i.toString(),
        number: i,
        seats,
        status: 'available'
      });
    }
    localStorage.setItem(this.storageKeys.tables, JSON.stringify(tables));
  }

  private insertDefaultMenuItems() {
    const defaultMenuItems = [
      { id: '1', name: 'မုန့်ဟင်းခါး / Mohinga', price: 2500, category: 'Appetizers', description: 'Traditional fish noodle soup / ရိုးရာငါးမုန့်ဟင်းခါး' },
      { id: '2', name: 'ဆမူဆာသုပ် / Samosa Thoke', price: 2000, category: 'Appetizers', description: 'Samosa salad with chickpeas / ကုလားပဲနှင့်ဆမူဆာသုပ်' },
      { id: '3', name: 'ရှမ်းခေါက်ဆွဲ / Shan Noodles', price: 3500, category: 'Main Menu', description: 'Traditional Shan style noodles / ရိုးရာရှမ်းခေါက်ဆွဲ' },
      { id: '4', name: 'လပက်သုပ် / Tea Leaf Salad', price: 2800, category: 'Appetizers', description: 'Traditional Myanmar tea leaf salad / ရိုးရာမြန်မာလပက်သုပ်' },
      { id: '5', name: 'အုန်းထမင်း / Coconut Rice', price: 1500, category: 'Main Menu', description: 'Fragrant coconut rice with curry / ဟင်းနှင့်အုန်းထမင်း' },
      { id: '6', name: 'မြန်မာဘီယာ / Myanmar Beer', price: 1200, category: 'Beverage', description: 'Local Myanmar beer / ပြည်တွင်းဘီယာ' },
    ];
    localStorage.setItem(this.storageKeys.menuItems, JSON.stringify(defaultMenuItems));
  }

  // Settings methods
  getSettings(): DatabaseSettings | null {
    try {
      const settings = localStorage.getItem(this.storageKeys.settings);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }

  updateSettings(settings: Partial<DatabaseSettings>): void {
    try {
      const currentSettings = this.getSettings();
      if (currentSettings) {
        const updatedSettings = { ...currentSettings, ...settings };
        localStorage.setItem(this.storageKeys.settings, JSON.stringify(updatedSettings));
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }

  // Tables methods
  getTables(): any[] {
    try {
      const tables = localStorage.getItem(this.storageKeys.tables);
      return tables ? JSON.parse(tables) : [];
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  }

  addTable(table: any): any {
    try {
      const tables = this.getTables();
      const id = `table_${Date.now()}`;
      const newTable = { ...table, id };
      tables.push(newTable);
      localStorage.setItem(this.storageKeys.tables, JSON.stringify(tables));
      return newTable;
    } catch (error) {
      console.error('Error adding table:', error);
      throw error;
    }
  }

  updateTable(updatedTable: any): void {
    try {
      const tables = this.getTables();
      const index = tables.findIndex(table => table.id === updatedTable.id);
      if (index !== -1) {
        tables[index] = updatedTable;
        localStorage.setItem(this.storageKeys.tables, JSON.stringify(tables));
      }
    } catch (error) {
      console.error('Error updating table:', error);
    }
  }

  deleteTable(id: string): void {
    try {
      const tables = this.getTables();
      const filteredTables = tables.filter(table => table.id !== id);
      localStorage.setItem(this.storageKeys.tables, JSON.stringify(filteredTables));
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  }

  // Categories methods
  getCategories(): string[] {
    try {
      const categories = localStorage.getItem(this.storageKeys.categories);
      return categories ? JSON.parse(categories) : [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  addCategory(name: string): void {
    try {
      const categories = this.getCategories();
      if (!categories.includes(name)) {
        categories.push(name);
        localStorage.setItem(this.storageKeys.categories, JSON.stringify(categories));
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }

  deleteCategory(name: string): void {
    try {
      const categories = this.getCategories();
      const filteredCategories = categories.filter(cat => cat !== name);
      localStorage.setItem(this.storageKeys.categories, JSON.stringify(filteredCategories));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }

  // Menu items methods
  getMenuItems(): any[] {
    try {
      const menuItems = localStorage.getItem(this.storageKeys.menuItems);
      return menuItems ? JSON.parse(menuItems) : [];
    } catch (error) {
      console.error('Error getting menu items:', error);
      return [];
    }
  }

  addMenuItem(item: any): any {
    try {
      const menuItems = this.getMenuItems();
      const id = `item_${Date.now()}`;
      const newItem = { ...item, id };
      menuItems.push(newItem);
      localStorage.setItem(this.storageKeys.menuItems, JSON.stringify(menuItems));
      return newItem;
    } catch (error) {
      console.error('Error adding menu item:', error);
      throw error;
    }
  }

  updateMenuItem(updatedItem: any): void {
    try {
      const menuItems = this.getMenuItems();
      const index = menuItems.findIndex(item => item.id === updatedItem.id);
      if (index !== -1) {
        menuItems[index] = updatedItem;
        localStorage.setItem(this.storageKeys.menuItems, JSON.stringify(menuItems));
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
    }
  }

  deleteMenuItem(id: string): void {
    try {
      const menuItems = this.getMenuItems();
      const filteredItems = menuItems.filter(item => item.id !== id);
      localStorage.setItem(this.storageKeys.menuItems, JSON.stringify(filteredItems));
    } catch (error) {
      console.error('Error deleting menu item:', error);
    }
  }

  // Order history methods
  getOrderHistory(): DatabaseOrderHistory[] {
    try {
      console.log('🔍 Getting order history from localStorage...');
      const orderHistory = localStorage.getItem(this.storageKeys.orderHistory);
      console.log('📦 Raw localStorage data:', orderHistory ? 'Found data' : 'No data');
      
      if (!orderHistory) {
        console.log('📋 No order history found in localStorage');
        return [];
      }
      
      const parsed = JSON.parse(orderHistory);
      console.log('✅ Successfully parsed order history:', parsed.length, 'orders');
      return parsed || [];
    } catch (error) {
      console.error('Error getting order history:', error);
      console.log('❌ Returning empty array due to error');
      return [];
    }
  }

  addOrderHistory(order: Omit<DatabaseOrderHistory, 'createdAt'>): void {
    try {
      console.log('💾 Adding order to localStorage:', order.id);
      const orderHistory = this.getOrderHistory();
      
      const newOrder = {
        ...order,
        createdAt: order.createdAt || new Date().toISOString()
      };
      
      // Check if order already exists
      const existingIndex = orderHistory.findIndex(o => o.id === order.id);
      if (existingIndex >= 0) {
        // Update existing order
        orderHistory[existingIndex] = newOrder;
        console.log('📝 Updated existing order in localStorage:', order.id);
      } else {
        // Add new order
        orderHistory.push(newOrder);
        console.log('➕ Added new order to localStorage:', order.id);
      }
      
      // Sort orders by creation date (newest first)
      orderHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      localStorage.setItem(this.storageKeys.orderHistory, JSON.stringify(orderHistory));
      console.log('✅ Order history saved to localStorage. Total orders:', orderHistory.length);
    } catch (error) {
      console.error('Error adding order history:', error);
      throw error;
    }
  }

  clearOrderHistory(): void {
    try {
      console.log('🗑️ Clearing order history from localStorage...');
      localStorage.setItem(this.storageKeys.orderHistory, JSON.stringify([]));
      console.log('✅ Order history cleared from localStorage');
    } catch (error) {
      console.error('Error clearing order history:', error);
      throw error;
    }
  }

  // Database management
  exportDatabase(): any {
    try {
      return {
        settings: this.getSettings(),
        tables: this.getTables(),
        menuItems: this.getMenuItems(),
        categories: this.getCategories(),
        orderHistory: this.getOrderHistory(),
        exportDate: new Date().toISOString(),
        version: '1.2.0'
      };
    } catch (error) {
      console.error('Error exporting database:', error);
      throw error;
    }
  }

  close(): void {
    // No-op for localStorage
  }
}

export const database = new LocalStorageDatabase();