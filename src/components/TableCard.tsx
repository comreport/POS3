import React from 'react';
import { Users, Clock, CheckCircle2, Coffee, Eye } from 'lucide-react';
import { Table } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getTableName, getSeatCount } from '../utils/translations';

interface TableCardProps {
  table: Table;
  onFree: (tableId: string) => void;
  onReserve: (tableId: string) => void;
  onManage: (tableId: string) => void;
  onOccupy: (tableId: string) => void;
  onViewOrder: (tableId: string) => void;
  isSelected?: boolean;
}

const TableCard: React.FC<TableCardProps> = ({ 
  table, 
  onFree, 
  onReserve, 
  onManage, 
  onOccupy, 
  onViewOrder,
  isSelected = false 
}) => {
  const { t, language } = useLanguage();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800';
      case 'occupied':
        return 'bg-gray-100 text-gray-800';
      case 'reserved':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'occupied':
        return <Coffee className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'reserved':
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <Users className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'occupied':
        return 'Occupied';
      case 'reserved':
        return 'Reserved';
      default:
        return 'Unknown';
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Check if table has order items to determine if View Order should be enabled
  const hasOrderItems = table.orderItems && table.orderItems.length > 0;
  const canFreeTable = !hasOrderItems; // Can't free table if it has order items

  return (
    <div className={`bg-white rounded-lg shadow-md border p-2 sm:p-3 lg:p-4 hover:shadow-lg transition-all ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center space-x-1 min-w-0 flex-1">
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-gray-600 truncate">{getSeatCount(table.seats, language)}</span>
        </div>
        <div className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(table.status)} flex-shrink-0`}>
          {getStatusIcon(table.status)}
          <span className="ml-1 hidden sm:inline">{getStatusText(table.status)}</span>
        </div>
      </div>
      
      <div className="text-center mb-2 sm:mb-3">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">{getTableName(table.number, language)}</h3>
        {table.customer && (
          <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">Customer: {table.customer}</p>
        )}
        {table.orderId && (
          <p className="text-xs text-blue-600 mt-1 truncate">Order: {table.orderId}</p>
        )}
        {table.orderTotal && (
          <p className="text-xs sm:text-sm text-green-600 mt-1 font-medium">
            Total: MMK {table.orderTotal.toLocaleString()}
          </p>
        )}
      </div>
      
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1 sm:gap-2">
          <button
            onClick={(e) => handleActionClick(e, () => onFree(table.id))}
            disabled={!canFreeTable}
            className={`px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              canFreeTable 
                ? 'text-white bg-emerald-600 hover:bg-emerald-700' 
                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
            }`}
          >
            <span className="truncate">{t('free')}</span>
          </button>
          <button
            onClick={(e) => handleActionClick(e, () => onReserve(table.id))}
            className="px-2 py-1.5 text-xs sm:text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
          >
            <span className="truncate">{t('reserve')}</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-1 sm:gap-2">
          <button
            onClick={(e) => handleActionClick(e, () => onOccupy(table.id))}
            className="px-2 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <span className="truncate">{t('occupy')}</span>
          </button>
          <button
            onClick={(e) => handleActionClick(e, () => onManage(table.id))}
            className="px-2 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <span className="truncate">{t('manage')}</span>
          </button>
        </div>

        {/* View Order Button - Full width, always enabled when there are order items */}
        <button
          onClick={(e) => handleActionClick(e, () => onViewOrder(table.id))}
          disabled={!hasOrderItems}
          className={`w-full flex items-center justify-center px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            hasOrderItems
              ? 'text-white bg-emerald-600 hover:bg-emerald-700'
              : 'text-gray-400 bg-gray-200 cursor-not-allowed'
          }`}
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
          <span className="truncate">View</span>
        </button>
      </div>
    </div>
  );
};

export default TableCard;