import React from 'react';
import { Wifi, WifiOff, RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { realSyncService } from '../services/realSyncService';

const SyncStatusIndicator: React.FC = () => {
  const { isOnline, clientId } = useDatabase();
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const handleSync = () => {
      setLastSyncTime(new Date());
    };

    realSyncService.on('SYNC_RESPONSE', handleSync);
    realSyncService.on('UPDATE_TABLE', handleSync);
    realSyncService.on('UPDATE_ORDER', handleSync);
    realSyncService.on('UPDATE_MENU', handleSync);
    realSyncService.on('connected', handleSync);

    return () => {
      realSyncService.off('SYNC_RESPONSE', handleSync);
      realSyncService.off('UPDATE_TABLE', handleSync);
      realSyncService.off('UPDATE_ORDER', handleSync);
      realSyncService.off('UPDATE_MENU', handleSync);
      realSyncService.off('connected', handleSync);
    };
  }, []);

  const handleManualSync = () => {
    console.log('Manual sync requested');
    realSyncService.requestSync();
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString();
  };

  const getConnectionStatusText = () => {
    if (isOnline) {
      return 'Connected to Server';
    }
    return 'Standalone Mode';
  };

  const getConnectionIcon = () => {
    if (isOnline) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-orange-500" />;
  };

  const getStatusColor = () => {
    if (isOnline) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Multi-Client Sync Status</h3>
        <button
          onClick={handleManualSync}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Manual sync"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getConnectionIcon()}
            <span className="text-sm text-gray-600">
              {getConnectionStatusText()}
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span title={`Full Client ID: ${clientId}`}>Client: {clientId.slice(-8)}</span>
          <span>Last sync: {formatLastSync(lastSyncTime)}</span>
        </div>
        
        <div className={`mt-3 p-2 rounded text-xs border ${
          isOnline 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-orange-50 border-orange-200 text-orange-700'
        }`}>
          {isOnline ? (
            <div className="flex items-start space-x-2">
              <Activity className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <div>Real-time sync active. Changes sync instantly across all connected devices.</div>
                <div className="mt-1 text-xs opacity-75">Client ID: {clientId.slice(-8)}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <div>WebSocket server not available. Running in standalone mode with local storage only.</div>
                <div className="mt-1 text-xs opacity-75">Client ID: {clientId.slice(-8)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncStatusIndicator;