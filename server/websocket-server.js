const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// In-memory storage (fallback when PostgreSQL is not available)
let inMemoryData = {
  restaurants: [],
  tables: [],
  menu_items: [],
  categories: [],
  order_history: [],
  sync_log: [],
  active_sessions: []
};

// WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

const clients = new Set();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    clients: clients.size
  });
});

// Broadcast to all connected clients
function broadcast(data, excludeClient = null) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        clients.delete(client);
      }
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('🔗 New client connected. Total clients:', clients.size + 1);
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    clientId: Date.now().toString(),
    timestamp: new Date().toISOString()
  }));

  // Handle messages from clients
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received:', data.type, 'from client:', data.clientId?.slice(-6) || 'unknown');

      switch (data.type) {
        case 'SYNC_REQUEST':
          await handleSyncRequest(data, ws);
          break;
        case 'UPDATE_ORDER':
        case 'UPDATE_TABLE':
        case 'UPDATE_MENU':
        case 'UPDATE_SETTINGS':
        case 'SESSION_UPDATE':
        case 'USER_LOGIN':
        case 'USER_LOGOUT':
        case 'UPDATE_USERS':
        case 'TERMINATE_SESSION':
        case 'FORCE_LOGOUT':
        case 'REFRESH_SESSIONS':
        case 'SESSION_SYNC':
        case 'USER_SYNC':
          await handleDataUpdate(data, ws);
          break;
        case 'HEARTBEAT':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'CLIENT_CONNECTED':
          console.log('👋 Client registered:', data.data?.clientId?.slice(-6) || 'unknown');
          break;
        default:
          console.log('❓ Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
    console.log('👋 Client disconnected. Total clients:', clients.size);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Handle sync request - send current data to requesting client
async function handleSyncRequest(data, senderWs) {
  try {
    console.log('🔄 Handling sync request from client:', data.clientId?.slice(-6) || 'unknown');
    
    // Parse order history items for client consumption
    const parsedOrderHistory = (inMemoryData.order_history || []).map(order => {
      try {
        return {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        };
      } catch (e) {
        console.error('Error parsing order items:', e);
        return {
          ...order,
          items: []
        };
      }
    });
    
    // Send current data state to requesting client
    senderWs.send(JSON.stringify({
      type: 'SYNC_RESPONSE',
      data: {
        tables: inMemoryData.tables || [],
        menuItems: inMemoryData.menu_items || [],
        categories: inMemoryData.categories || [],
        settings: inMemoryData.restaurants?.[0] || null,
        orderHistory: parsedOrderHistory,
        activeSessions: inMemoryData.active_sessions || [],
        users: inMemoryData.users || []
      },
      timestamp: new Date().toISOString(),
      clientId: 'server'
    }));
    
    console.log('✅ Sync response sent to client:', data.clientId?.slice(-6) || 'unknown');
  } catch (error) {
    console.error('Error handling sync request:', error);
    senderWs.send(JSON.stringify({
      type: 'SYNC_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

// Handle data updates from clients
async function handleDataUpdate(data, senderWs) {
  try {
    console.log('📝 Handling data update:', data.type, 'from client:', data.clientId?.slice(-6) || 'unknown');
    
    // Store the update in memory
    const { type, data: updateData } = data;
    
    if (type === 'UPDATE_ORDER') {
      if (!inMemoryData.order_history) {
        inMemoryData.order_history = [];
      }
      
      if (updateData.action === 'add') {
        try {
          // Process order updates with proper error handling
          const orderForStorage = {
            ...updateData.data,
            items: typeof updateData.data.items === 'string' ? updateData.data.items : JSON.stringify(updateData.data.items),
            createdAt: updateData.data.createdAt || new Date().toISOString()
          };
          
          // Check if order already exists
          const existingIndex = inMemoryData.order_history.findIndex(order => order.id === updateData.data.id);
          if (existingIndex >= 0) {
            // Update existing order
            inMemoryData.order_history[existingIndex] = orderForStorage;
            console.log('📝 Updated order in server memory:', updateData.data?.id);
          } else {
            // Add new order
            inMemoryData.order_history.push(orderForStorage);
            console.log('➕ Added order to server memory:', updateData.data?.id);
          }
          
          // Sort orders by creation date (newest first)
          inMemoryData.order_history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
        } catch (error) {
          console.error('❌ Error processing order update:', error);
        }
      } else if (updateData.action === 'clear') {
        inMemoryData.order_history = [];
        console.log('🗑️ Cleared all orders from memory');
      }
    } else if (type === 'UPDATE_TABLE') {
      if (!inMemoryData.tables) {
        inMemoryData.tables = [];
      }
      
      if (updateData.action === 'add') {
        inMemoryData.tables.push(updateData.data);
      } else if (updateData.action === 'update') {
        const index = inMemoryData.tables.findIndex(item => item.id === updateData.data.id);
        if (index >= 0) {
          inMemoryData.tables[index] = updateData.data;
        } else {
          inMemoryData.tables.push(updateData.data);
        }
      } else if (updateData.action === 'delete') {
        inMemoryData.tables = inMemoryData.tables.filter(item => item.id !== updateData.data.id);
      }
    } else if (type === 'UPDATE_MENU') {
      if (!inMemoryData.menu_items) {
        inMemoryData.menu_items = [];
      }
      
      if (updateData.action === 'add_item') {
        inMemoryData.menu_items.push(updateData.data);
      } else if (updateData.action === 'update_item') {
        const index = inMemoryData.menu_items.findIndex(item => item.id === updateData.data.id);
        if (index >= 0) {
          inMemoryData.menu_items[index] = updateData.data;
        }
      } else if (updateData.action === 'delete_item') {
        inMemoryData.menu_items = inMemoryData.menu_items.filter(item => item.id !== updateData.data.id);
      } else if (updateData.action === 'add_category') {
        if (!inMemoryData.categories) {
          inMemoryData.categories = [];
        }
        if (!inMemoryData.categories.includes(updateData.data.name)) {
          inMemoryData.categories.push(updateData.data.name);
        }
      } else if (updateData.action === 'delete_category') {
        if (inMemoryData.categories) {
          inMemoryData.categories = inMemoryData.categories.filter(cat => cat !== updateData.data.name);
        }
      }
    } else if (type === 'UPDATE_SETTINGS') {
      if (!inMemoryData.restaurants) {
        inMemoryData.restaurants = [];
      }
      
      if (inMemoryData.restaurants.length === 0) {
        inMemoryData.restaurants.push(updateData);
      } else {
        inMemoryData.restaurants[0] = { ...inMemoryData.restaurants[0], ...updateData };
      }
    } else if (type === 'SESSION_UPDATE') {
      // Handle session updates
      if (!inMemoryData.active_sessions) {
        inMemoryData.active_sessions = [];
      }
      
      if (updateData.action === 'session_list_updated') {
        // Merge sessions from different clients instead of replacing
        const newSessions = updateData.sessions || [];
        const existingSessions = inMemoryData.active_sessions || [];
        
        // Remove sessions from the same client first
        const filteredExisting = existingSessions.filter(s => 
          !newSessions.some(ns => ns.clientId === s.clientId)
        );
        
        // Add the new sessions
        inMemoryData.active_sessions = [...filteredExisting, ...newSessions];
        console.log('📋 Updated active sessions in server memory:', inMemoryData.active_sessions.length);
      }
    } else if (type === 'USER_LOGIN') {
      // Handle user login - add to active sessions
      if (!inMemoryData.active_sessions) {
        inMemoryData.active_sessions = [];
      }
      
      const existingSessionIndex = inMemoryData.active_sessions.findIndex(s => s.clientId === updateData.clientId);
      if (existingSessionIndex >= 0) {
        inMemoryData.active_sessions[existingSessionIndex] = updateData;
      } else {
        inMemoryData.active_sessions.push(updateData);
      }
      console.log('👤 User login stored in server memory:', updateData.userName);
    } else if (type === 'USER_LOGOUT') {
      // Handle user logout - remove from active sessions
      if (inMemoryData.active_sessions) {
        inMemoryData.active_sessions = inMemoryData.active_sessions.filter(s => s.clientId !== updateData.clientId);
        console.log('🚪 User logout removed from server memory:', updateData.userName);
      }
    } else if (type === 'REFRESH_SESSIONS') {
      console.log('🔄 Session refresh for client:', updateData.clientId?.slice(-6));
    } else if (type === 'SESSION_SYNC') {
      // Handle session synchronization between clients
      if (updateData.action === 'broadcast_sessions' && updateData.sessions) {
        if (!inMemoryData.active_sessions) {
          inMemoryData.active_sessions = [];
        }
        
        // Merge sessions from the broadcasting client
        const broadcastingSessions = updateData.sessions;
        const existingSessions = inMemoryData.active_sessions || [];
        
        // Remove old sessions from the same client
        const filteredExisting = existingSessions.filter(s => s.clientId !== updateData.fromClient);
        
        // Add the new sessions from the broadcasting client
        inMemoryData.active_sessions = [...filteredExisting, ...broadcastingSessions];
        console.log('🔄 Synced sessions from client:', updateData.fromClient?.slice(-6), 'Total sessions:', inMemoryData.active_sessions.length);
      }
    } else if (type === 'UPDATE_USERS') {
      // Handle user updates
      if (!inMemoryData.users) {
        inMemoryData.users = [];
      }
      
      if (updateData.action === 'add') {
        // Check if user already exists
        const existingIndex = inMemoryData.users.findIndex(u => u.id === updateData.data.id);
        if (existingIndex === -1) {
          inMemoryData.users.push(updateData.data);
          console.log('👤 Added user to server memory:', updateData.data.name);
        }
      } else if (updateData.action === 'update') {
        const existingIndex = inMemoryData.users.findIndex(u => u.id === updateData.data.id);
        if (existingIndex >= 0) {
          inMemoryData.users[existingIndex] = updateData.data;
          console.log('👤 Updated user in server memory:', updateData.data.name);
        }
      } else if (updateData.action === 'delete') {
        inMemoryData.users = inMemoryData.users.filter(u => u.id !== updateData.data.id);
        console.log('👤 Deleted user from server memory:', updateData.data.id);
      }
      
      // Always broadcast user updates to all clients
      console.log('📡 Broadcasting user update to all clients:', updateData.action);
    } else if (type === 'USER_SYNC') {
      // Handle user synchronization requests
      if (updateData.action === 'request_users') {
        // Send current users to requesting client
        const currentUsers = inMemoryData.users || [];
        console.log('📤 Sending users to requesting client:', currentUsers.length, 'users');
        
        // Send users directly to the requesting client
        senderWs.send(JSON.stringify({
          type: 'USER_SYNC',
          data: {
            action: 'users_response',
            users: currentUsers
          },
          timestamp: new Date().toISOString(),
          clientId: 'server'
        }));
        
        console.log('✅ Sent user list to requesting client');
      } else if (updateData.action === 'broadcast_users') {
        // Handle user list broadcast from a client
        const broadcastUsers = updateData.users || [];
        console.log('📡 Received user broadcast from client:', updateData.fromClient?.slice(-6), 'Users:', broadcastUsers.length);
        
        // Update server memory with the broadcasted users
        inMemoryData.users = broadcastUsers;
        
        // Broadcast to all other clients except the sender
        const broadcastMessage = {
          type: 'USER_SYNC',
          data: {
            action: 'users_broadcast',
            users: broadcastUsers,
            fromClient: updateData.fromClient
          },
          timestamp: new Date().toISOString(),
          clientId: 'server'
        };
        
        broadcast(broadcastMessage, senderWs);
        console.log('📡 Broadcasted user list to all other clients');
      }
    }
    
    // Log the sync operation
    const logEntry = {
      id: Date.now().toString(),
      type: data.type,
      action: updateData.action || 'update',
      timestamp: new Date().toISOString(),
      clientId: data.clientId,
      data: updateData
    };
    
    if (!inMemoryData.sync_log) {
      inMemoryData.sync_log = [];
    }
    inMemoryData.sync_log.push(logEntry);
    
    // Prepare data for broadcast - ensure order items are properly formatted
    let broadcastData = { ...data };
    if (data.type === 'UPDATE_ORDER' && data.data && data.data.data && data.data.data.items) {
      // Ensure items are in array format for clients
      try {
        broadcastData = {
          ...data,
          data: {
            ...data.data,
            data: {
              ...data.data.data,
              items: typeof data.data.data.items === 'string' ? JSON.parse(data.data.data.items) : data.data.data.items
            }
          }
        };
      } catch (e) {
        console.error('Error formatting broadcast data:', e);
        broadcastData = data; // Use original data if parsing fails
      }
    }

    broadcast(broadcastData, senderWs);
    console.log('📡 Data update broadcasted to', clients.size - 1, 'other clients');
    
  } catch (error) {
    console.error('Error handling data update:', error);
    senderWs.send(JSON.stringify({
      type: 'UPDATE_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 MiniPOS WebSocket Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});