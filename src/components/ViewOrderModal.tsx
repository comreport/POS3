import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, ShoppingCart, Clock, User, Receipt, Check, Printer } from 'lucide-react';
import { printOrder } from '../utils/printOrder';
import { getOrderDisplayNumber } from '../utils/orderIdGenerator';
import { Table } from '../types';
import { getTableName } from '../utils/translations';

interface ViewOrderModalProps {
  table: Table;
  onClose: () => void;
  onCompleteOrder?: (tableId: string, orderItems: any[], total: number) => void;
  onCancelOrder?: (tableId: string) => void;
  serviceChargeRate: number;
  serviceChargeEnabled: boolean;
  taxRate: number;
}

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({ 
  table, 
  onClose, 
  onCompleteOrder,
  onCancelOrder,
  serviceChargeRate, 
  serviceChargeEnabled,
  taxRate 
}) => {
  const { t, language } = useLanguage();
  
  const getSubtotal = () => {
    if (!Array.isArray(table.orderItems)) return 0;
    return table.orderItems.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
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

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCompleteOrder = () => {
    if (!Array.isArray(table.orderItems) || table.orderItems.length === 0) {
      alert(t('noOrderItems'));
      return;
    }

    if (onCompleteOrder) {
      const total = getTotalAmount();
      onCompleteOrder(table.id, table.orderItems, total);
      onClose();
    }
  };

  const handlePrintOrder = () => {
    if (!Array.isArray(table.orderItems) || table.orderItems.length === 0) {
      alert(t('noOrderItems'));
      return;
    }

    const printData = {
      orderId: table.orderId || 'N/A',
      tableNumber: table.number,
      customerName: table.customer || 'Walk-in Customer',
      orderDate: new Date().toLocaleDateString(),
      items: table.orderItems,
      subtotal: getSubtotal(),
      serviceCharge: getServiceCharge(),
      tax: getTaxAmount(),
      total: getTotalAmount(),
      restaurantName: 'Restaurant POS',
      serviceChargeRate,
      serviceChargeEnabled,
      taxRate
    };

    printOrder(printData);
  };

  const handleCancelOrder = () => {
    if (confirm(t('confirmCancelOrder'))) {
      if (onCancelOrder) {
        onCancelOrder(table.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-sm sm:max-w-lg lg:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-2 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 sm:p-4 lg:p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-white flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">{t('orderDetails')}</h2>
                <p className="text-blue-100 text-xs sm:text-sm truncate">{getTableName(table.number, language)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-blue-100 hover:text-white transition-colors flex-shrink-0 ml-2"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {/* Table Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">{t('customer')}</span>
              </div>
              <p className="text-gray-900 font-semibold text-sm sm:text-base truncate">
                {table.customer || t('customer')}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Order ID</span>
              </div>
              <p className="text-gray-900 font-semibold text-sm sm:text-base truncate">
                {table.orderId || 'N/A'}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Status</span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                table.status === 'occupied' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : table.status === 'reserved'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {t(table.status).charAt(0).toUpperCase() + t(table.status).slice(1)}
              </span>
            </div>
          </div>

          {/* Order Items */}
          {Array.isArray(table.orderItems) && table.orderItems.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                {t('orderItems')}
              </h3>
              
              <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
                {table.orderItems.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.menuItem.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{item.menuItem.category}</p>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block line-clamp-2">{item.menuItem.description}</p>
                      {item.notes && (
                        <p className="text-xs sm:text-sm text-blue-600 mt-1 truncate">Note: {item.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs sm:text-sm text-gray-600">
                        MMK {item.menuItem.price.toLocaleString()} × {item.quantity}
                      </div>
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">
                        MMK {(item.menuItem.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-4 sm:mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('orderSummary')}</h3>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm sm:text-base">{t('subtotal')}:</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      MMK {getSubtotal().toLocaleString()}
                    </span>
                  </div>
                  
                  {serviceChargeEnabled && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm sm:text-base">{t('serviceCharge')} ({serviceChargeRate}%):</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      MMK {getServiceCharge().toLocaleString()}
                    </span>
                  </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm sm:text-base">{t('tax')} ({taxRate}%):</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      MMK {getTaxAmount().toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-gray-200">
                    <span className="text-base sm:text-lg font-semibold text-gray-900">{t('total')}:</span>
                    <span className="text-lg sm:text-xl font-bold text-green-600">
                      MMK {getTotalAmount().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">{t('noOrderItems')}</h3>
              <p className="text-gray-500 text-sm sm:text-base px-4">This table doesn't have any order items yet.</p>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom with smaller buttons */}
        <div className="border-t border-gray-200 p-3 sm:p-4 lg:p-6 bg-white flex-shrink-0">
          <div className="space-y-2">
            {Array.isArray(table.orderItems) && table.orderItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                <button
                  onClick={handlePrintOrder}
                  className="flex items-center justify-center px-2 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  <span className="truncate">Print</span>
                </button>
                <button
                  onClick={handleCompleteOrder}
                  className="flex items-center justify-center px-2 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  <Check className="h-3 w-3 mr-1" />
                  <span className="truncate">Complete</span>
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="flex items-center justify-center px-2 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  <X className="h-3 w-3 mr-1" />
                  <span className="truncate">Cancel</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <X className="h-3 w-3 mr-1" />
                  <span className="truncate">Close</span>
                </button>
              </div>
            )}
            {(!Array.isArray(table.orderItems) || table.orderItems.length === 0) && (
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                {t('close')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;