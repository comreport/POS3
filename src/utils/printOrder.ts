import { OrderItem } from '../types';

export interface PrintOrderData {
  orderId: string;
  tableNumber: number;
  customerName: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
  restaurantName: string;
  serviceChargeRate: number;
  serviceChargeEnabled: boolean;
  taxRate: number;
}

export const printOrder = (orderData: PrintOrderData) => {
  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert('Please allow popups to print the order.');
      return;
    }

    // Check if content contains Myanmar text
    const containsMyanmarText = (text: string) => {
      return /[\u1000-\u109F\uAA60-\uAA7F]/.test(text);
    };

    const hasMyanmarContent = 
      containsMyanmarText(orderData.restaurantName) ||
      containsMyanmarText(orderData.customerName) ||
      orderData.items.some(item => 
        containsMyanmarText(item.menuItem?.name || '') ||
        containsMyanmarText(item.name || '')
      );

    // Generate the print content with proper Myanmar font support
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Receipt - ${orderData.orderId}</title>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Pyidaungsu:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Pyidaungsu:wght@400;500;600;700&display=swap');
          
          body {
            font-family: ${hasMyanmarContent ? "'Pyidaungsu', 'Myanmar Text', sans-serif" : "'Courier New', monospace"};
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            background: white;
            color: #000;
          }
          .receipt {
            max-width: 300px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            font-family: ${hasMyanmarContent ? "'Pyidaungsu', 'Myanmar Text', sans-serif" : "'Courier New', monospace"};
          }
          .order-info {
            margin-bottom: 15px;
          }
          .order-info div {
            margin-bottom: 3px;
          }
          .items {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 10px 0;
            margin-bottom: 10px;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            align-items: flex-start;
          }
          .item-name {
            flex: 1;
            font-family: ${hasMyanmarContent ? "'Pyidaungsu', 'Myanmar Text', sans-serif" : "'Courier New', monospace"};
            word-wrap: break-word;
            margin-right: 10px;
          }
          .item-qty {
            margin: 0 10px;
            white-space: nowrap;
          }
          .item-price {
            text-align: right;
            min-width: 60px;
            white-space: nowrap;
          }
          .totals {
            margin-top: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .final-total {
            border-top: 1px solid #000;
            padding-top: 5px;
            font-weight: bold;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            font-size: 10px;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 10px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .no-print { display: none; }
          }
          
          /* Ensure Myanmar text renders properly */
          .myanmar-text {
            font-family: 'Pyidaungsu', 'Myanmar Text', sans-serif !important;
            font-feature-settings: normal;
            text-rendering: optimizeLegibility;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="restaurant-name ${hasMyanmarContent ? 'myanmar-text' : ''}">${orderData.restaurantName}</div>
            <div>Restaurant POS System</div>
          </div>
          
          <div class="order-info">
            <div><strong>Order ID:</strong> ${orderData.orderId}</div>
            <div><strong>Table:</strong> ${orderData.tableNumber}</div>
            <div><strong>Customer:</strong> <span class="${containsMyanmarText(orderData.customerName) ? 'myanmar-text' : ''}">${orderData.customerName}</span></div>
            <div><strong>Date:</strong> ${orderData.orderDate}</div>
            <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
          </div>
          
          <div class="items">
            ${orderData.items.map(item => {
              const itemName = item.menuItem?.name || item.name || 'Unknown Item';
              const itemPrice = item.menuItem?.price || item.price || 0;
              const quantity = item.quantity || 1;
              return `
                <div class="item">
                  <div class="item-name ${containsMyanmarText(itemName) ? 'myanmar-text' : ''}">${itemName}</div>
                  <div class="item-qty">x${quantity}</div>
                  <div class="item-price">MMK ${(itemPrice * quantity).toLocaleString()}</div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="totals">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>MMK ${orderData.subtotal.toLocaleString()}</span>
            </div>
            ${orderData.serviceChargeEnabled ? `
            <div class="total-line">
              <span>Service Charge (${orderData.serviceChargeRate}%):</span>
              <span>MMK ${orderData.serviceCharge.toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="total-line">
              <span>Tax (${orderData.taxRate}%):</span>
              <span>MMK ${orderData.tax.toLocaleString()}</span>
            </div>
            <div class="total-line final-total">
              <span>TOTAL:</span>
              <span>MMK ${orderData.total.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="footer">
            <div>ဝယ်ယူအားပေးမှုအတွက်အထူးကျေးဇူးတင်ရှိပါသည်</div>
          </div>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px;">Print Receipt</button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;

    // Write content to the new window
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Auto-print after a short delay to ensure fonts are loaded
    setTimeout(() => {
      printWindow.print();
    }, 1000);

  } catch (error) {
    console.error('Print error:', error);
    alert('Failed to print order. Please try again.');
  }
};

// New function to print order history
export const printOrderHistory = (orderData: any, settings: any) => {
  try {
    const printData: PrintOrderData = {
      orderId: orderData.id,
      tableNumber: orderData.tableNumber,
      customerName: orderData.customerName,
      orderDate: orderData.orderDate,
      items: orderData.items || [],
      subtotal: orderData.items ? orderData.items.reduce((sum: number, item: any) => {
        const price = item.menuItem?.price || item.price || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
      }, 0) : orderData.total || 0,
      serviceCharge: 0, // Calculate if needed
      tax: 0, // Calculate if needed
      total: orderData.total,
      restaurantName: settings?.restaurantName || 'MiniPOS',
      serviceChargeRate: settings?.serviceCharge || 0,
      serviceChargeEnabled: settings?.serviceChargeEnabled || false,
      taxRate: settings?.taxRate || 0
    };

    // Calculate service charge and tax if enabled
    if (printData.serviceChargeEnabled) {
      printData.serviceCharge = (printData.subtotal * printData.serviceChargeRate) / 100;
    }
    printData.tax = (printData.subtotal * printData.taxRate) / 100;

    printOrder(printData);
  } catch (error) {
    console.error('Print order history error:', error);
    alert('Failed to print order. Please try again.');
  }
};