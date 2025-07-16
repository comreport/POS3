export interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved';
  orderId?: string;
  reservationTime?: Date;
  customer?: string;
  orderItems?: OrderItem[];
  orderTotal?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image?: string;
}

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed';
  total: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface Staff {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'waiter' | 'kitchen';
  email: string;