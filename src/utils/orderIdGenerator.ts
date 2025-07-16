// Generate order ID in format POS-MMDDYYYY-XXX with proper parallel handling
let orderCounter = 0;
let lastResetDate = '';
let pendingOrders = new Set(); // Track pending order IDs to prevent duplicates

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
    pendingOrders.clear(); // Clear pending orders for new day
  }
  
  // Get existing orders from localStorage to determine next sequence number
  const existingOrders = JSON.parse(localStorage.getItem('restaurant_pos_order_history') || '[]');
  
  // Also check tables for any active orders with today's date
  const existingTables = JSON.parse(localStorage.getItem('restaurant_pos_tables') || '[]');
  const activeTableOrders = existingTables
    .filter((table: any) => table.orderId && table.orderId.startsWith('POS-'))
    .map((table: any) => ({ id: table.orderId }));
  
  // Combine all existing orders
  const allExistingOrders = [...existingOrders, ...activeTableOrders];
  
  // Filter orders from today and extract sequence numbers
  const todayOrders = allExistingOrders.filter((order: any) => {
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
  
  // Also check pending orders to avoid conflicts
  let nextSequence = Math.max(maxSequence + 1, orderCounter + 1);
  
  // Ensure we don't generate a duplicate ID that's currently pending
  let candidateId;
  do {
    const sequenceStr = String(nextSequence).padStart(3, '0');
    candidateId = `POS-${month}${day}${year}-${sequenceStr}`;
    
    // Check if this ID is already pending or exists
    if (!pendingOrders.has(candidateId) && !todayOrders.some((order: any) => order.id === candidateId)) {
      break;
    }
    nextSequence++;
  } while (true);
  
  // Mark this ID as pending to prevent duplicates
  pendingOrders.add(candidateId);
  
  // Update counter to this sequence number to prevent conflicts
  orderCounter = nextSequence;
  
  // Clean up pending orders after a delay (in case order creation fails)
  setTimeout(() => {
    pendingOrders.delete(candidateId);
  }, 10000); // Remove from pending after 10 seconds
  
  console.log('Generated order ID:', candidateId, 'Sequence:', nextSequence);
  return candidateId;
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

// Function to mark an order ID as used (call this when order is actually created)
export const markOrderIdAsUsed = (orderId: string): void => {
  pendingOrders.delete(orderId);
  console.log('Marked order ID as used:', orderId);
};

// Function to release a pending order ID (call this if order creation fails)
export const releasePendingOrderId = (orderId: string): void => {
  pendingOrders.delete(orderId);
  console.log('Released pending order ID:', orderId);
};