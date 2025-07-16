// Real-time synchronization service for multi-client POS
export interface SyncMessage {
  type: 'UPDATE_TABLE' | 'UPDATE_ORDER' | 'UPDATE_MENU' | 'UPDATE_SETTINGS' | 'UPDATE_USERS' | 'SYNC_REQUEST' | 'SYNC_RESPONSE' | 'CLIENT_CONNECTED' | 'CLIENT_DISCONNECTED' | 'HEARTBEAT';
  data: any;
  timestamp: number;
  clientId: string;
}

export interface SyncState {
  tables: any[];
  menuItems: any[];
  categories: string[];
  settings: any;
  orderHistory: any[];
}

class RealSyncService {
  private ws: WebSocket | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: SyncMessage[] = [];

  constructor() {
    this.clientId = this.generateClientId();
    this.initializeWebSocket();
  }

  private generateClientId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `client_${timestamp}_${random}`;
  }

  private initializeWebSocket() {
    try {
      // Try to connect to WebSocket server
      const wsUrl = this.getWebSocketUrl();
      console.log('Attempting to connect to WebSocket server:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send client connected message
        this.sendMessage({
          type: 'CLIENT_CONNECTED',
          data: { clientId: this.clientId },
          timestamp: Date.now(),
          clientId: this.clientId
        });
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Process queued messages
        this.processMessageQueue();
        
        // Emit connected event
        this.emit('connected', { clientId: this.clientId });
        
        // Request initial sync
        this.requestSync();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.handleDisconnection();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleConnectionError();
      };
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.handleConnectionError();
    }
  }

  private getWebSocketUrl(): string {
    // Try different WebSocket URLs
    const protocol = 'ws:'; // Use ws:// protocol to match server configuration
    const host = window.location.hostname;
    
    // For development
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'ws://localhost:8080/ws';
    }
    
    // For production - try the same host with different ports
    return `ws://${host}:8080/ws`;
  }

  private handleMessage(message: SyncMessage) {
    // Don't process messages from this client
    if (message.clientId === this.clientId) return;

    console.log('🔄 Received sync message from client:', message.clientId.slice(-6), 'Type:', message.type);
    
    // Handle different message types
    switch (message.type) {
      case 'SYNC_RESPONSE':
        console.log('📥 Processing sync response:', message.data);
        this.emit('SYNC_RESPONSE', message.data);
        break;
      case 'UPDATE_TABLE':
        console.log('🏓 Processing table update:', message.data);
        this.emit('UPDATE_TABLE', message.data);
        break;
      case 'UPDATE_ORDER':
        console.log('📋 Processing order update:', message.data);
        // Ensure order data is properly formatted for sync
        if (message.data && message.data.data) {
          // Make sure items are properly parsed for display
          if (typeof message.data.data.items === 'string') {
            try {
              message.data.data.items = JSON.parse(message.data.data.items);
            } catch (e) {
              console.error('Error parsing order items:', e);
            }
          }
        }
        this.emit('UPDATE_ORDER', message.data);
        break;
      case 'UPDATE_MENU':
        console.log('🍽️ Processing menu update:', message.data);
        this.emit('UPDATE_MENU', message.data);
        break;
      case 'UPDATE_SETTINGS':
        console.log('⚙️ Processing settings update:', message.data);
        this.emit('UPDATE_SETTINGS', message.data);
        break;
      case 'UPDATE_USERS':
        console.log('👤 Processing user update:', message.data);
        this.emit('UPDATE_USERS', message.data);
        break;
      case 'USER_SYNC':
        console.log('👥 Processing user sync:', message.data);
        this.emit('USER_SYNC', message.data);
        break;
      case 'SESSION_UPDATE':
        console.log('👥 Processing session update:', message.data);
        this.emit('SESSION_UPDATE', message.data);
        break;
      case 'USER_LOGIN':
        console.log('🔐 Processing user login:', message.data);
        this.emit('USER_LOGIN', message.data);
        break;
      case 'USER_LOGOUT':
        console.log('🚪 Processing user logout:', message.data);
        this.emit('USER_LOGOUT', message.data);
        break;
      case 'TERMINATE_SESSION':
        console.log('⛔ Processing session termination:', message.data);
        if (message.data.clientId === this.clientId) {
          // Clear session data before showing alert
          localStorage.removeItem('pos_is_logged_in');
          localStorage.removeItem('pos_current_user');
          localStorage.removeItem('pos_current_user_role');
          localStorage.removeItem('pos_current_user_permissions');
          localStorage.setItem('pos_session_terminated', 'true');
          
          alert(`Your session has been terminated by an administrator.`);
          window.location.reload();
        }
        this.emit('TERMINATE_SESSION', message.data);
        break;
      case 'FORCE_LOGOUT':
        console.log('🚪 Processing forced logout:', message.data);
        if (message.data.targetClientId === this.clientId) {
          // Clear all session data immediately
          localStorage.removeItem('pos_is_logged_in');
          localStorage.removeItem('pos_current_user');
          localStorage.removeItem('pos_current_user_role');
          localStorage.removeItem('pos_current_user_permissions');
          localStorage.removeItem('pos_active_tab');
          localStorage.setItem('pos_session_terminated', 'true');
          
          // Remove this client's session from active sessions
          const activeSessions = JSON.parse(localStorage.getItem('pos_active_sessions') || '[]');
          const filteredSessions = activeSessions.filter((s: any) => s.clientId !== this.clientId);
          localStorage.setItem('pos_active_sessions', JSON.stringify(filteredSessions));
          
          // Show alert and force reload
          alert(`Your session has been terminated by an administrator.\nReason: ${message.data.reason || 'Session terminated'}`);
          
          // Force immediate logout by reloading the page
          window.location.href = window.location.origin;
        }
        this.emit('FORCE_LOGOUT', message.data);
        break;
      case 'REFRESH_SESSIONS':
        console.log('🔄 Processing session refresh:', message.data);
        this.emit('REFRESH_SESSIONS', message.data);
        // When we receive a refresh request, broadcast our current session list
        if (message.data.requestedBy !== this.clientId) {
          setTimeout(() => {
            const currentSessions = JSON.parse(localStorage.getItem('pos_active_sessions') || '[]');
            this.sendUpdate('SESSION_UPDATE', {
              action: 'session_list_updated',
              sessions: currentSessions
            });
          }, 200);
        }
        break;
      case 'SESSION_SYNC':
        console.log('🔄 Processing session sync:', message.data);
        this.emit('SESSION_UPDATE', message.data);
        break;
      case 'USER_SYNC':
        console.log('👥 Processing user sync response:', message.data);
        if (message.data.action === 'users_response') {
          // Update local storage with fresh user data
          const users = message.data.users || [];
          localStorage.setItem('pos_users', JSON.stringify(users));
          console.log('✅ Updated local users from server:', users.length, 'users');
        } else if (message.data.action === 'users_broadcast') {
          // Handle user list broadcast from another client
          const users = message.data.users || [];
          localStorage.setItem('pos_users', JSON.stringify(users));
          console.log('📡 Updated local users from broadcast:', users.length, 'users');
          
          // Trigger a custom event to notify components
          window.dispatchEvent(new CustomEvent('usersUpdated', { detail: users }));
        }
        this.emit('USER_SYNC', message.data);
        break;
      case 'HEARTBEAT':
        // Respond to heartbeat
        this.sendMessage({
          type: 'HEARTBEAT',
          data: { response: true },
          timestamp: Date.now(),
          clientId: this.clientId
        });
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleDisconnection() {
    this.isConnected = false;
    this.stopHeartbeat();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
      
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.initializeWebSocket();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached. Working in offline mode.');
      this.emit('offline', {});
    }
  }

  private handleConnectionError() {
    this.isConnected = false;
    this.stopHeartbeat();
    
    // Fallback to localStorage-only mode
    console.log('⚠️ WebSocket server not available. Running in standalone mode with localStorage.');
    
    // Simulate connection for UI consistency
    setTimeout(() => {
      console.log('📱 Running in standalone mode - Client ID:', this.clientId.slice(-6));
      this.emit('connected', { clientId: this.clientId, standalone: true });
    }, 1000);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'HEARTBEAT',
          data: { ping: true },
          timestamp: Date.now(),
          clientId: this.clientId
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendMessage(message: SyncMessage) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.log('Message queued (WebSocket not connected):', message.type);
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private handleRemoteOrderUpdate = (data: any) => {
    if (data.action === 'add') {
      // This method is not used anymore - handled in useDatabase hook
      console.log('Remote order update handled by useDatabase hook');
    } else if (data.action === 'clear') {
      // This method is not used anymore - handled in useDatabase hook
      console.log('Remote order clear handled by useDatabase hook');
    }
  };

  // Public methods
  public sendUpdate(type: SyncMessage['type'], data: any) {
    // Ensure order data is properly formatted for transmission
    if (type === 'UPDATE_ORDER' && data && data.data && data.data.items) {
      // Make sure items are serialized for transmission but keep original structure
      const syncData = {
        ...data,
        data: {
          ...data.data,
          items: Array.isArray(data.data.items) ? data.data.items : data.data.items
        }
      };
      data = syncData;
    }
    
    const message: SyncMessage = {
      type,
      data,
      timestamp: Date.now(),
      clientId: this.clientId
    };

    console.log('📤 Sending sync update:', type, 'from client:', this.clientId.slice(-6));
    this.sendMessage(message);
  }

  public requestSync() {
    console.log('🔄 Requesting sync from server... Client:', this.clientId.slice(-6));
    this.sendUpdate('SYNC_REQUEST', { clientId: this.clientId });
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getClientId(): string {
    return this.clientId;
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    console.log('WebSocket disconnected');
  }

  // Get connection statistics
  public getConnectionStats() {
    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      reconnectAttempts: this.reconnectAttempts,
      wsUrl: this.getWebSocketUrl(),
      readyState: this.ws?.readyState || 'disconnected',
      lastHeartbeat: Date.now(),
      queuedMessages: this.messageQueue.length
    };
  }
}

export const realSyncService = new RealSyncService();