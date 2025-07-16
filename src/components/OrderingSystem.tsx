import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, X, Check, ArrowLeft, Save } from 'lucide-react';
import { Table, MenuItem, OrderItem } from '../types';
import { generateOrderId, generateTableOrderId } from '../utils/orderIdGenerator';
import { generateOrderId, generateTableOrderId, markOrderIdAsUsed } from '../utils/orderIdGenerator';
import { useLanguage } from '../contexts/LanguageContext';
import { getTableName, getSeatCount } from '../utils/translations';

interface OrderingSystemProps {
  table: Table;
  menuItems: MenuItem[];
  onCompleteOrder: (tableId: string, orderItems: OrderItem[], total: number) => void;
  onSaveOrder: (tableId: string, orderItems: OrderItem[], total: number) => void;
  onBack: () => void;
  serviceChargeRate: number;
  serviceChargeEnabled: boolean;
  taxRate: number;
}

const OrderingSystem: React.FC<OrderingSystemProps> = ({
  table,
  menuItems,
  onCompleteOrder,
  onSaveOrder,
  onBack,
  serviceChargeRate,
  serviceChargeEnabled,
  taxRate
}) => {
  const { t, language } = useLanguage();
  const [orderItems, setOrderItems] = useState<OrderItem[]>(table.orderItems || []);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(menuItems.map(item => item.category)))];

  const filteredMenuItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToOrder = (menuItem: MenuItem) => {
    const existingItem = orderItems.find(item => item.menuItem.id === menuItem.id);
    
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.menuItem.id === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newOrderItem: OrderItem = {
        id: `item_${Date.now()}`,
        menuItem,
        quantity: 1
      };
      setOrderItems([...orderItems, newOrderItem]);
    }
  };

  const removeFromOrder = (menuItemId: string) => {
    const existingItem = orderItems.find(item => item.menuItem.id === menuItemId);
    
    if (existingItem && existingItem.quantity > 1) {
      setOrderItems(orderItems.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setOrderItems(orderItems.filter(item => item.menuItem.id !== menuItemId));
    }
  };

  const getItemQuantity = (menuItemId: string) => {
    const item = orderItems.find(item => item.menuItem.id === menuItemId);
    return item ? item.quantity : 0;
  };

  const getSubtotal = () => {
    return orderItems.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  };

  const getServiceCharge = () => {
    if (!serviceChargeEnabled) return 0;
    return (getSubtotal() * serviceChargeRate) / 100;
  };

  const getTaxAmount = () => {
    return (getSubtotal() * taxRate) / 100;
  };

  const getTotalAmount = () => {
    return getSubtotal() + getServiceCharge() + getTaxAmount();
  };

  const handleCompleteOrder = () => {
    if (orderItems.length === 0) {
      alert('Please add items to the order before completing.');
      return;
    }

    const total = getTotalAmount();
    onCompleteOrder(table.id, orderItems, total);
  };

  const handleSaveOrder = () => {
    if (orderItems.length === 0) {
      alert('Please add items to the order before saving.');
      return;
    }

    const total = getTotalAmount();
    // Use existing order ID or generate new one if not present
    let orderId = table.orderId;
    if (!orderId || !orderId.startsWith('POS-')) {
      orderId = generateOrderId();
      console.log('Generated new order ID for save:', orderId);
      markOrderIdAsUsed(orderId);
    }
    
    onSaveOrder(table.id, orderItems, total);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-6">
        {/* Header - Same design as Reports */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="p-1.5 sm:p-2 text-blue-100 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">{getTableName(table.number, language)} - Order</h2>
                <p className="text-blue-100 text-xs sm:text-sm lg:text-base hidden sm:block truncate">{getSeatCount(table.seats, language)} • {table.customer || 'No customer assigned'}</p>
                <p className="text-blue-100 text-xs sm:hidden">{getSeatCount(table.seats, language)}</p>
              </div>
            </div>
            
            <div className="text-right flex-shrink-0 ml-2 sm:ml-3">
              <div className="text-base sm:text-xl lg:text-3xl font-bold text-white">MMK {getTotalAmount().toLocaleString()}</div>
              <div className="text-blue-100 text-xs sm:text-sm lg:text-base">{orderItems.length} items in cart</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6">
          {/* Menu Items Section */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Category Filter */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 sm:p-3 lg:p-4">
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base rounded-lg font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category === 'all' ? 'All Items' : category}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {filteredMenuItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-20 sm:h-24 lg:h-32 object-cover"
                    />
                  )}
                  <div className="p-2 sm:p-3 lg:p-4">
                    <div className="flex items-start justify-between mb-1 sm:mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm lg:text-base truncate">{item.name}</h3>
                        <p className="text-xs text-blue-600 font-medium">{item.category}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 hidden sm:block">{item.description}</p>
                      </div>
                      <div className="text-right ml-1 sm:ml-2 flex-shrink-0">
                        <div className="text-xs sm:text-sm lg:text-base font-bold text-green-600">MMK {item.price.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {/* Mobile-optimized quantity controls */}
                    <div className="mt-3">
                      {/* Quantity display and controls - Mobile first design */}
                      <div className="flex items-center justify-center mb-2">
                        <div className="flex items-center space-x-3">
                        <button
                          onClick={() => removeFromOrder(item.id)}
                          disabled={getItemQuantity(item.id) === 0}
                          className="w-8 h-8 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center border border-blue-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-base font-semibold text-gray-900 min-w-[2.5rem] text-center bg-gray-50 px-2 py-1 rounded-md border">
                          {getItemQuantity(item.id)}
                        </span>
                        <button
                          onClick={() => addToOrder(item)}
                          className="w-8 h-8 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center border border-blue-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        </div>
                      </div>
                      
                      {/* Add to cart button - Full width on mobile */}
                      <button
                        onClick={() => addToOrder(item)}
                        className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredMenuItems.length === 0 && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 lg:p-8 text-center">
                <div className="text-gray-500">No menu items found in this category.</div>
              </div>
            )}
          </div>

          {/* Order Summary Section */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 sticky top-4">
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-t-lg p-2 sm:p-3 lg:p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white">Order Summary</h3>
                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-white" />
                </div>
              </div>
              
              <div className="p-2 sm:p-3 lg:p-4">
                {orderItems.length === 0 ? (
                  <div className="text-center py-4 sm:py-6 lg:py-8 text-gray-500">
                    <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 lg:h-12 lg:w-12 mx-auto mb-2 sm:mb-3 lg:mb-4 text-gray-300" />
                    <p className="text-xs sm:text-sm lg:text-base">No items in cart</p>
                    <p className="text-xs text-gray-400">Add items from the menu</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2 lg:space-y-3 max-h-48 sm:max-h-64 lg:max-h-96 overflow-y-auto">
                    {orderItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-1.5 sm:p-2 lg:p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm leading-tight">{item.menuItem.name}</h4>
                          <p className="text-sm text-gray-600">MMK {item.menuItem.price.toLocaleString()} each</p>
                        </div>
                        <div className="flex items-center space-x-2 mx-2">
                          <button
                            onClick={() => removeFromOrder(item.menuItem.id)}
                            className="w-7 h-7 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors flex items-center justify-center border border-blue-200"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-semibold text-gray-900 min-w-[2rem] text-center bg-gray-100 px-2 py-1 rounded-md">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToOrder(item.menuItem)}
                            className="w-7 h-7 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center border border-blue-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-gray-900 text-sm">
                            MMK {(item.menuItem.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {orderItems.length > 0 && (
                  <div className="mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-gray-200">
                    {/* Subtotal */}
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className="text-sm text-gray-700">{t('subtotal')}:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        MMK {getSubtotal().toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Service Charge */}
                    {serviceChargeEnabled && (
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className="text-sm text-gray-700">{t('serviceCharge')} ({serviceChargeRate}%):</span>
                      <span className="text-sm font-semibold text-gray-900">
                        MMK {getServiceCharge().toLocaleString()}
                      </span>
                    </div>
                    )}
                    
                    {/* Tax */}
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <span className="text-sm text-gray-700">{t('tax')} ({taxRate}%):</span>
                      <span className="text-sm font-semibold text-gray-900">
                        MMK {getTaxAmount().toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Total */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4 pt-2 border-t border-gray-200">
                      <span className="text-base font-semibold text-gray-900">{t('total')}:</span>
                      <span className="text-lg font-bold text-green-600">
                        MMK {getTotalAmount().toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <button
                        onClick={handleSaveOrder}
                        className="w-full flex items-center justify-center px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {t('saveOrder')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderingSystem;