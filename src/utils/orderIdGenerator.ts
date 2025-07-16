// Generate order ID in format POS-MMDDYYYY-XXX
let orderCounter = 0; // Simple counter to handle parallel requests
let lastResetDate = ''; // Track when counter was last reset

export const generateOrderId = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear());
  
  // Get today's date string for comparison
  const todayDateString = `${month}${day}${year}`;
  
  // Reset counter if it's a new day
  if (lastResetDate !== todayDateString) {
    orderCounter = 0;
    lastResetDate = todayDateString;
  }
  
  // Get existing orders from localStorage to determine next sequence number
  const existingOrders = JSON.parse(localStorage.getItem('restaurant_pos_order_history') || '[]');
  
  // Filter orders from today and extract sequence numbers
  const todayOrders = existingOrders.filter((order: any) => {
    if (order.id && order.id.startsWith('POS-')) {
      const orderDatePart = order.id.split('-')[1]; // Extract MMDDYYYY part
      return orderDatePart === todayDateString;
    }
    return false;
  });
  
  // Find the highest sequence number for today
  let maxSequence = 0;
  todayOrders.forEach((order: any) => {
    const parts = order.id.split('-');
    if (parts.length === 3) {
      const sequenceNum = parseInt(parts[2]);
      if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
        maxSequence = sequenceNum;
      }
    }
  });
  
  // Use the next available sequence number
  const nextSequence = Math.max(maxSequence + 1, orderCounter + 1);
  
  // Update counter to this sequence number to prevent conflicts
  orderCounter = nextSequence;
  
  const sequenceStr = String(nextSequence).padStart(3, '0');
  
  // Format: POS-MMDDYYYY-XXX (e.g., POS-07132024-001 for July 13, 2024, first order)
  return `POS-${month}${day}${year}-${sequenceStr}`;
};

// Generate table-specific order ID for consistency
export const generateTableOrderId = (tableNumber: number): string => {
  const baseId = generateOrderId();
  // Always use the POS-MMDDYYYY-XXX format regardless of table
  return baseId;
};

// Extract order number from order ID for display
export const getOrderDisplayNumber = (orderId: string): string => {
  if (orderId.startsWith('POS-')) {
    return orderId; // Return full POS ID for display
  }
  // Fallback for old format - convert to POS format if possible
  if (orderId.startsWith('order-') || orderId.startsWith('ORD-')) {
    // Generate a new POS ID for old format orders
    return generateOrderId();
  }
  return orderId;
};

// Helper function to get order sequence number from POS ID
export const getOrderSequenceNumber = (orderId: string): number => {
  if (orderId.startsWith('POS-')) {
    const parts = orderId.split('-');
    if (parts.length === 3) {
      return parseInt(parts[2]) || 0;
    }
  }
  return 0;
};

// Helper function to get order date from POS ID
export const getOrderDateFromId = (orderId: string): string => {
  if (orderId.startsWith('POS-')) {
    const parts = orderId.split('-');
    if (parts.length >= 2) {
      const datePart = parts[1]; // MMDDYYYY
      if (datePart.length === 8) {
        const month = datePart.substring(0, 2);
        const day = datePart.substring(2, 4);
        const year = datePart.substring(4, 8);
        return `${month}/${day}/${year}`;
      }
    }
  }
  return '';
};