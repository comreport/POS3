import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { realSyncService } from '../services/realSyncService';

interface LoginProps {
  onLogin: (username: string, role: string) => void;
  users: Array<{ id: string; name: string; email: string; roleId: string; password: string; isActive: boolean }>;
  roles: Array<{ id: string; name: string; permissions: string[] }>;
  settings: any;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, roles, settings }) => {
  const { t } = useLanguage();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log users prop to see what we're receiving
  React.useEffect(() => {
    console.log('🔍 Login component received users:', users.length, 'users');
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        name: user.name,
        username: user.username,
        email: user.email,
        isActive: user.isActive
      });
    });
  }, [users]);

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown Role';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('🔐 Login attempt:', { usernameOrEmail, password: '***' });
    console.log('👥 Available users for login:', users.length);

    // Function to attempt login with current user data
    const attemptLogin = (userList: any[]) => {
      console.log('🔍 Attempting login with user list:', userList.length, 'users');
      
      // Check default admin credentials
      if ((usernameOrEmail === 'admin' || usernameOrEmail === 'admin@restaurant.com') && password === 'admin') {
        console.log('🔐 Admin login successful');
        onLogin('Admin User', 'Admin');
        
        // Broadcast login event
        setTimeout(() => {
          realSyncService.sendUpdate('USER_LOGIN', {
            userId: '1',
            userName: 'Admin User',
            userRole: 'Admin',
            deviceType: getDeviceType(),
            browser: getBrowserInfo(),
            os: getOSInfo(),
            ipAddress: '192.168.1.100',
            location: 'Local Network',
            clientId: realSyncService.getClientId(),
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          });
        }, 500);
        
        setIsLoading(false);
        return true;
      }

      // Check against user management users (by username OR email)
      console.log('🔍 Searching for user in database...');
      const user = userList.find((u: any) => 
        (u.username?.toLowerCase() === usernameOrEmail.toLowerCase() || 
         u.name.toLowerCase() === usernameOrEmail.toLowerCase() || 
         u.email.toLowerCase() === usernameOrEmail.toLowerCase()) && 
        u.password === password &&
        u.isActive
      );

      console.log('🔍 User search result:', user ? `Found: ${user.name}` : 'Not found');

      if (user) {
        console.log('🔐 User login successful:', user.name);
        const roleName = getRoleName(user.roleId);
        onLogin(user.name, roleName);
        
        // Broadcast login event
        setTimeout(() => {
          realSyncService.sendUpdate('USER_LOGIN', {
            userId: user.id,
            userName: user.name,
            userRole: roleName,
            deviceType: getDeviceType(),
            browser: getBrowserInfo(),
            os: getOSInfo(),
            ipAddress: '192.168.1.100',
            location: 'Local Network',
            clientId: realSyncService.getClientId(),
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          });
        }, 500);
        
        setIsLoading(false);
        return true;
      } else {
        console.log('❌ Login failed - checking inactive users...');
        // Check if user exists but is inactive
        const inactiveUser = userList.find((u: any) => 
          (u.username?.toLowerCase() === usernameOrEmail.toLowerCase() || 
           u.name.toLowerCase() === usernameOrEmail.toLowerCase() || 
           u.email.toLowerCase() === usernameOrEmail.toLowerCase()) && 
          u.password === password &&
          !u.isActive
        );
        
        if (inactiveUser) {
          console.log('❌ User found but inactive:', inactiveUser.name);
          setError(t('accountInactive'));
        } else {
          console.log('❌ No matching user found');
          setError(t('invalidUsernameOrPassword'));
        }
        
        setIsLoading(false);
        return false;
      }
    };
    
    // First try with current users
    const currentUsers = JSON.parse(localStorage.getItem('pos_users') || '[]');
    console.log('👥 Current users in localStorage:', currentUsers.length);
    
    // Try login with current users first
    if (attemptLogin(currentUsers)) {
      return; // Login successful
    }
    
    // If login failed, request fresh data from server and try again
    console.log('🔄 Login failed, requesting fresh user data from server...');
    
    // Set up a one-time listener for user sync response
    const handleUserSyncResponse = (data: any) => {
      console.log('📥 Received user sync response for login:', data);
      if (data.action === 'users_response' && data.users) {
        const serverUsers = data.users;
        console.log('👥 Server users received:', serverUsers.length);
        
        // Update localStorage with fresh data
        localStorage.setItem('pos_users', JSON.stringify(serverUsers));
        
        // Try login again with fresh data
        attemptLogin(serverUsers);
        
        // Remove the listener
        realSyncService.off('USER_SYNC', handleUserSyncResponse);
      }
    };
    
    // Set up listener for server response
    realSyncService.on('USER_SYNC', handleUserSyncResponse);
    
    // Request fresh user data from server
    realSyncService.sendUpdate('USER_SYNC', {
      action: 'request_users',
      clientId: realSyncService.getClientId()
    });
    
    // Set a timeout to remove listener and finish loading if no response
    setTimeout(() => {
      realSyncService.off('USER_SYNC', handleUserSyncResponse);
      setIsLoading(false);
    }, 3000);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 200));
  };

  const getDeviceType = () => {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  };

  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const getOSInfo = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown OS';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md mx-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 overflow-hidden">
            {settings?.logo ? (
              <img 
                src={settings.logo} 
                alt="Logo" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <LogIn className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {settings?.restaurantName || t('restaurantPOS')}
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm">
            {settings?.description || t('professionalPOS')}
          </p>
        </div>

        {/* Login Form */}
        <div className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Username/Email Field */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                {t('usernameOrEmail')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={t('enterUsernameOrEmail')}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={t('enterPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                <p className="text-red-600 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                  {t('signingIn')}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {t('signIn')}
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs text-gray-500">
              {t('poweredBy')} Restaurant POS System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;