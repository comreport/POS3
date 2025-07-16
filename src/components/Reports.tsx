import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Calendar, Trash2, Download, BarChart3, FileText, Mail, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getOrderDisplayNumber } from '../utils/orderIdGenerator';
import { Table } from '../types';
import * as XLSX from 'xlsx';
import { printOrderHistory } from '../utils/printOrder';

interface ReportsProps {
  tables?: Table[];
  orderHistory?: any[];
  onClearOrderHistory?: () => void;
  settings?: any;
}

const Reports: React.FC<ReportsProps> = ({ tables = [], orderHistory = [], onClearOrderHistory, settings }) => {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBySearch, setFilteredBySearch] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Helper function to determine which orders to display based on search and date filters
  const getDisplayOrders = () => {
    if (searchTerm.trim()) {
      return filteredBySearch;
    }
    return filteredOrders.length > 0 ? filteredOrders : orderHistory;
  };

  // Calculate table status counts
  const availableTables = tables.filter(table => table.status === 'available').length;
  const occupiedTables = tables.filter(table => table.status === 'occupied').length;
  const reservedTables = tables.filter(table => table.status === 'reserved').length;

  // Calculate totals
  const displayOrdersForStats = getDisplayOrders();
  const totalOrders = displayOrdersForStats.length;
  const totalRevenue = displayOrdersForStats.reduce((sum, order) => sum + order.total, 0);

  // Handle search functionality
  React.useEffect(() => {
    const ordersToSearch = filteredOrders.length > 0 ? filteredOrders : orderHistory;
    
    if (!searchTerm.trim()) {
      setFilteredBySearch([]);
      return;
    }

    const searchResults = ordersToSearch.filter(order => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (order.id || '').toLowerCase().includes(searchLower) ||
        (order.customerName || '').toLowerCase().includes(searchLower) ||
        order.tableNumber.toString().includes(searchLower) ||
        (order.orderDate || '').includes(searchTerm) ||
        (order.items && order.items.some((item: any) => 
          (item.name || item.menuItem?.name || '').toLowerCase().includes(searchLower) ||
          (item.menuItem?.description || '').toLowerCase().includes(searchLower) ||
          (item.menuItem?.category || '').toLowerCase().includes(searchLower)
        ))
      );
    });
    
    setFilteredBySearch(searchResults);
  }, [searchTerm, filteredOrders, orderHistory]);

  const handleFilterDate = () => {
    setShowDatePicker(!showDatePicker);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSearchTerm(''); // Clear search when filtering by date
    if (date) {
      const filtered = orderHistory.filter(order => order.orderDate === date);
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders([]);
    }
    setShowDatePicker(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Don't clear date filter automatically - let users search within filtered results
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredBySearch([]);
  };

  const handleClear = () => {
    const confirmed = window.confirm('Are you sure you want to clear all order history? This action cannot be undone.');
    
    if (confirmed) {
      // Clear filtered orders first
      setFilteredOrders([]);
      setSelectedDate('');
      setSearchTerm('');
      setFilteredBySearch([]);
      setShowDatePicker(false);
      setSelectedOrderId(null);
      
      // Then clear from database and sync
      if (onClearOrderHistory) {
        onClearOrderHistory();
      }
      
      // Show success message and refresh browser
      alert('Order history cleared successfully! The page will refresh automatically.');
      
      // Refresh the browser after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(selectedOrderId === orderId ? null : orderId);
  };

  const handlePrintOrder = () => {
    if (!selectedOrderId) {
      alert('Please select an order to print.');
      return;
    }

    const orderToPrint = getDisplayOrders().find(order => order.id === selectedOrderId);
    
    if (!orderToPrint) {
      alert('Selected order not found.');
      return;
    }

    printOrderHistory(orderToPrint, settings);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrderToDelete(orderId);
    setShowDeleteModal(true);
  };

  const confirmDeleteOrder = () => {
    if (!orderToDelete) return;

    try {
      // Get current order history from localStorage
      const currentHistory = JSON.parse(localStorage.getItem('restaurant_pos_order_history') || '[]');
      
      // Filter out the order to delete
      const updatedHistory = currentHistory.filter((order: any) => order.id !== orderToDelete);
      
      // Save back to localStorage
      localStorage.setItem('restaurant_pos_order_history', JSON.stringify(updatedHistory));
      
      // Update filtered orders if they exist
      if (filteredOrders.length > 0) {
        setFilteredOrders(filteredOrders.filter(order => order.id !== orderToDelete));
      }
      
      // Update search filtered orders if they exist
      if (filteredBySearch.length > 0) {
        setFilteredBySearch(filteredBySearch.filter(order => order.id !== orderToDelete));
      }
      
      // Clear selection if deleted order was selected
      if (selectedOrderId === orderToDelete) {
        setSelectedOrderId(null);
      }
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setOrderToDelete(null);
      
      // Show success message and refresh
      alert('Order deleted successfully!');
      window.location.reload();
      
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    }
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = getDisplayOrders();
      
      // Prepare detailed data for Excel with order items
      const excelData: any[] = [];
      
      dataToExport.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any, index: number) => {
            excelData.push({
              'Order ID': index === 0 ? order.id : '', // Only show order ID on first item
              'Table Number': index === 0 ? order.tableNumber : '',
              'Customer Name': index === 0 ? order.customerName : '',
              'Order Date': index === 0 ? order.orderDate : '',
              'Order Status': index === 0 ? (order.status === 'completed' ? 'Completed' : order.status) : '',
              'Item Name': item.name || item.menuItem?.name || 'Unknown Item',
              'Unit Price (MMK)': item.price || item.menuItem?.price || 0,
              'Quantity': item.quantity || 1,
              'Item Total (MMK)': (item.price || item.menuItem?.price || 0) * (item.quantity || 1),
              'Order Total (MMK)': index === 0 ? order.total : ''
            });
          });
        } else {
          // Fallback for orders without detailed items
          excelData.push({
            'Order ID': order.id,
            'Table Number': order.tableNumber,
            'Customer Name': order.customerName,
            'Order Date': order.orderDate,
            'Order Status': order.status === 'completed' ? 'Completed' : order.status,
            'Item Name': 'No items available',
            'Unit Price (MMK)': 0,
            'Quantity': 0,
            'Item Total (MMK)': 0,
            'Order Total (MMK)': order.total
          });
        }
      });

      // Add summary rows
      excelData.push({
        'Order ID': '',
        'Table Number': '',
        'Customer Name': '',
        'Order Date': '',
        'Order Status': '',
        'Item Name': '',
        'Unit Price (MMK)': '',
        'Quantity': '',
        'Item Total (MMK)': '',
        'Order Total (MMK)': ''
      });

      excelData.push({
        'Order ID': 'Summary',
        'Table Number': `${dataToExport.length} Orders`,
        'Customer Name': '',
        'Order Date': selectedDate || 'All Dates',
        'Order Status': '',
        'Item Name': '',
        'Unit Price (MMK)': '',
        'Quantity': '',
        'Item Total (MMK)': '',
        'Order Total (MMK)': dataToExport.reduce((sum, order) => sum + order.total, 0)
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Order ID
        { wch: 12 }, // Table Number
        { wch: 20 }, // Customer Name
        { wch: 12 }, // Order Date
        { wch: 12 }, // Order Status
        { wch: 25 }, // Item Name
        { wch: 15 }, // Unit Price
        { wch: 10 }, // Quantity
        { wch: 15 }, // Item Total
        { wch: 15 }  // Order Total
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Detailed Order History');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = selectedDate 
        ? `MiniPOS-order-history-${selectedDate}.xlsx`
        : `MiniPOS-order-history-${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      // Show success message and email option
      alert(`Excel file "${filename}" has been downloaded successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleExportPDF = () => {
    // PDF export removed due to Myanmar font limitations
    // Users should use Excel export for proper Unicode support
    alert('PDF export has been removed due to Myanmar font limitations. Please use Excel export for proper Unicode support.');
  };

  // Helper function to sanitize text for PDF export

  const handleSendEmail = () => {
    // This would integrate with your email service
    // For now, we'll show a success message
    alert(`Email would be sent to: ${emailRecipient}\nSubject: ${emailSubject}\n\nNote: Email integration requires backend setup with Office365.`);
    setIsEmailModalOpen(false);
    setEmailRecipient('');
    setEmailSubject('');
    setEmailMessage('');
  };

  // Determine which orders to display based on search and date filters
  const displayOrders = getDisplayOrders();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{t('reportsAnalytics')}</h2>
              <p className="text-blue-100 text-xs sm:text-sm lg:text-base hidden sm:block">{t('trackPerformanceDetailed')}</p>
              {selectedDate && (
                <div className="mt-1 sm:mt-2 text-blue-100 text-xs sm:text-sm">
                  {t('filterDate')}: {selectedDate}
                </div>
              )}
              {searchTerm && (
                <div className="mt-1 sm:mt-2 text-blue-100 text-xs sm:text-sm">
                  Search: "{searchTerm}" ({getDisplayOrders().length} results)
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1 sm:gap-2 lg:gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <input
                  type="text"
                  placeholder="Search Orders..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900 placeholder-gray-500"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="relative">
                <button
                  onClick={handleFilterDate}
                  className="flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-100 bg-blue-500 rounded-md hover:bg-blue-400 transition-colors min-w-[80px] sm:min-w-[100px] lg:min-w-[120px] h-8 sm:h-9 lg:h-10"
                >
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{t('filterDate')}</span>
                  <span className="sm:hidden text-xs">Date</span>
                </button>
                {showDatePicker && (
                  <div className="absolute top-full mt-1 sm:mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 sm:p-4 z-10">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              
              <button
                onClick={handlePrintOrder}
                disabled={!selectedOrderId}
                className={`flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors min-w-[60px] sm:min-w-[80px] lg:min-w-[100px] h-8 sm:h-9 lg:h-10 ${
                  selectedOrderId
                    ? 'text-white bg-green-500 hover:bg-green-400'
                    : 'text-gray-400 bg-gray-300 cursor-not-allowed'
                }`}
              >
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Print</span>
                <span className="sm:hidden text-xs">Print</span>
              </button>
              
              <button
                onClick={() => selectedOrderId && handleDeleteOrder(selectedOrderId)}
                disabled={!selectedOrderId}
                className={`flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors min-w-[60px] sm:min-w-[80px] lg:min-w-[100px] h-8 sm:h-9 lg:h-10 ${
                  selectedOrderId
                    ? 'text-white bg-red-500 hover:bg-red-400'
                    : 'text-gray-400 bg-gray-300 cursor-not-allowed'
                }`}
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Delete</span>
                <span className="sm:hidden text-xs">Del</span>
              </button>
              
              <button
                onClick={handleClear}
                className="flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-100 bg-red-500 rounded-md hover:bg-red-400 transition-colors min-w-[60px] sm:min-w-[70px] lg:min-w-[80px] h-8 sm:h-9 lg:h-10"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('clear')}</span>
                <span className="sm:hidden text-xs">Clear</span>
              </button>
              
              <button
                onClick={handleExportExcel}
                className="flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-green-100 bg-green-500 rounded-md hover:bg-green-400 transition-colors min-w-[70px] sm:min-w-[110px] lg:min-w-[130px] h-8 sm:h-9 lg:h-10"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('exportToExcel')}</span>
                <span className="sm:hidden text-xs">Excel</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Order History Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-t-lg p-3 sm:p-4 lg:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-white">{t('orderHistory')}</h3>
              <p className="text-green-100 text-xs sm:text-sm hidden sm:block">{t('viewDetailedOrder')}</p>
              {selectedOrderId && (
                <p className="text-green-100 text-xs sm:text-sm mt-1">
                  Selected: {selectedOrderId} - Click "Print" to print
                </p>
              )}
            </div>
            
            <div className="p-3 sm:p-4 lg:p-6">
              {getDisplayOrders().length > 0 ? (
                <div className="space-y-2 sm:space-y-3 lg:space-y-4 max-h-64 sm:max-h-80 lg:max-h-[500px] overflow-y-auto">
                  {getDisplayOrders().map((order) => (
                    <div 
                      key={order.id} 
                      onClick={() => handleOrderClick(order.id)}
                      className={`rounded-lg border p-2 sm:p-3 lg:p-4 cursor-pointer transition-all duration-200 ${
                        selectedOrderId === order.id
                          ? 'bg-red-50 border-red-500 border-2 shadow-md'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-xs sm:text-sm lg:text-base truncate ${
                            selectedOrderId === order.id ? 'text-red-900' : 'text-gray-900'
                          }`}>
                            {order.id}
                          </p>
                          <p className={`text-xs truncate ${
                            selectedOrderId === order.id ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            Table {order.tableNumber} - {order.customerName}
                          </p>
                          <p className={`text-xs ${
                            selectedOrderId === order.id ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {order.orderDate}
                          </p>
                        </div>
                        <div className="text-right ml-2 sm:ml-3 flex-shrink-0">
                          <p className={`font-medium text-xs sm:text-sm lg:text-base ${
                            selectedOrderId === order.id ? 'text-red-900' : 'text-gray-900'
                          }`}>
                            MMK {order.total.toLocaleString()}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            selectedOrderId === order.id
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Order Items */}
                      {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                          <p className={`text-xs font-medium mb-2 ${
                            selectedOrderId === order.id ? 'text-red-700' : 'text-gray-700'
                          }`}>
                            {t('orderItems')}:
                          </p>
                          <div className="space-y-1">
                            {order.items.slice(0, 3).map((item: any, index: number) => (
                              <div key={index} className={`flex justify-between text-xs ${
                                selectedOrderId === order.id ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                <span className="truncate flex-1">
                                  {item.name || item.menuItem?.name || 'Unknown Item'} x{item.quantity || 1}
                                </span>
                                <span className="ml-2 flex-shrink-0">
                                  MMK {((item.price || item.menuItem?.price || 0) * (item.quantity || 1)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <p className={`text-xs ${
                                selectedOrderId === order.id ? 'text-red-500' : 'text-gray-500'
                              }`}>
                                +{order.items.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {selectedOrderId === order.id && (
                        <div className="mt-3 pt-2 border-t border-red-200">
                          <p className="text-xs text-red-600 font-medium">
                            ✓ Selected for printing - Click "Print" button above
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[150px] sm:min-h-[200px] lg:min-h-[300px] bg-gray-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-gray-400 mb-2 sm:mb-4" />
                  <h4 className="text-sm sm:text-base lg:text-lg font-medium text-gray-600 mb-1 sm:mb-2">
                    {searchTerm ? `No orders found for "${searchTerm}"` : selectedDate ? `No orders found for ${selectedDate}` : t('noCompletedOrdersYet')}
                  </h4>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-500 text-center px-4">
                    {searchTerm ? 'Try a different search term' : selectedDate ? 'Try a different date' : t('ordersWillAppear')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Section */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Revenue Summary */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">{t('revenueAnalytics')}</h3>
                <p className="text-purple-100 text-xs sm:text-sm hidden sm:block">{t('financialOverview')}</p>
              </div>
              
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                  <div className="bg-blue-500 rounded-lg p-3 sm:p-4 lg:p-6 text-center">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">{totalOrders}</div>
                    <div className="text-blue-100 font-medium text-xs sm:text-sm lg:text-base">{t('totalOrders')}</div>
                  </div>
                  <div className="bg-green-500 rounded-lg p-3 sm:p-4 lg:p-6 text-center">
                    <div className="text-sm sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
                      MMK {totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-green-100 font-medium text-xs sm:text-sm lg:text-base">{t('totalRevenue')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Status */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">{t('tableStatus')}</h3>
                <p className="text-indigo-100 text-xs sm:text-sm hidden sm:block">{t('currentTableAvailability')}</p>
              </div>
              
              <div className="p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mr-2 sm:mr-3"></div>
                    <span className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">{t('available')}</span>
                  </div>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{availableTables}</span>
                </div>

                <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-500 rounded-full mr-2 sm:mr-3"></div>
                    <span className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">{t('occupied')}</span>
                  </div>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{occupiedTables}</span>
                </div>

                <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full mr-2 sm:mr-3"></div>
                    <span className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">{t('reserved')}</span>
                  </div>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{reservedTables}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg w-full max-w-sm sm:max-w-md mx-2">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                    Email Report
                  </h3>
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter recipient email"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email subject"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Message
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={3}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Email message"
                  />
                </div>
              </div>
              
              <div className="p-4 sm:p-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleSendEmail}
                    disabled={!emailRecipient || !emailSubject}
                    className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Send Email
                  </button>
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        {/* Delete Order Confirmation Modal */}
        {showDeleteModal && orderToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg w-full max-w-sm sm:max-w-md mx-2">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Delete Order</h3>
              </div>
              
              <div className="p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Are you sure you want to delete order <strong>{orderToDelete}</strong>? This action cannot be undone.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    <strong>Warning:</strong> This will permanently remove the order from your records and cannot be recovered.
                  </p>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={confirmDeleteOrder}
                    className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Delete Order
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setOrderToDelete(null);
                    }}
                    className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Reports;