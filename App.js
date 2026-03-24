import { useState, useEffect } from 'react';
import { ActivityIndicator, View, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs(['ExpoKeepAwake']);
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import DailyAllowanceScreen from './src/screens/DailyAllowanceScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import VisitsScreen from './src/screens/VisitsScreen';
import VendorMapScreen from './src/screens/VendorMapScreen';
import AdminEmployeeListScreen from './src/screens/AdminEmployeeListScreen';
import AdminAttendanceListScreen from './src/screens/AdminAttendanceListScreen';
import InventoryDashboardScreen from './src/screens/InventoryDashboardScreen';
import OrderDashboardScreen from './src/screens/OrderDashboardScreen';

const SESSION_KEY = 'user_session';

function getHomeDashboard(role) {
  if (role === 'admin') return 'adminDashboard';
  if (role === 'Warehouse') return 'inventory';
  if (role === 'Sales') return 'orderDashboard';
  return 'dashboard';
}

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [vendors, setVendors] = useState([]);

  // Load session on app start
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((data) => {
        if (data) {
          const userData = JSON.parse(data);
          setUser(userData);
          setScreen(getHomeDashboard(userData.role));
        } else {
          setScreen('login');
        }
      })
      .catch(() => {
        setScreen('login');
      });
  }, []);

  // Save session on login
  const handleLogin = (userData) => {
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData)).catch(() => {});
    setUser(userData);
    setScreen(getHomeDashboard(userData.role));
  };

  // Clear session on logout
  const handleLogout = () => {
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    setUser(null);
    setScreen('login');
  };

  // Determine which dashboard to go back to
  const homeDashboard = user ? getHomeDashboard(user.role) : 'dashboard';

  if (screen === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="large" color="#e53935" />
      </View>
    );
  }

  if (screen === 'adminDashboard') {
    return (
      <AdminDashboardScreen
        user={user}
        vendors={vendors}
        onVendorsChange={setVendors}
        onLogout={handleLogout}
        onGoToProfile={() => setScreen('profile')}
        onGoToAttendance={() => setScreen('attendance')}
        onGoToDailyAllowance={() => setScreen('dailyAllowance')}
        onGoToVisits={() => setScreen('visits')}
        onGoToVendorMap={() => setScreen('vendorMap')}
        onGoToEmployeeList={() => setScreen('adminEmployeeList')}
        onGoToAttendanceList={() => setScreen('adminAttendanceList')}
        onGoToInventory={() => setScreen('inventory')}
      />
    );
  }

  if (screen === 'adminEmployeeList') {
    return (
      <AdminEmployeeListScreen
        user={user}
        onGoBack={() => setScreen(homeDashboard)}
      />
    );
  }

  if (screen === 'adminAttendanceList') {
    return (
      <AdminAttendanceListScreen
        user={user}
        onGoBack={() => setScreen(homeDashboard)}
      />
    );
  }

  if (screen === 'vendorMap') {
    return (
      <VendorMapScreen
        user={user}
        onGoBack={() => setScreen(homeDashboard)}
      />
    );
  }

  if (screen === 'visits') {
    return (
      <VisitsScreen
        user={user}
        vendors={vendors}
        onGoBack={() => setScreen(homeDashboard)}
      />
    );
  }

  if (screen === 'dailyAllowance') {
    return (
      <DailyAllowanceScreen
        user={user}
        onGoBack={() => setScreen(homeDashboard)}
      />
    );
  }

  if (screen === 'attendance') {
    return (
      <AttendanceScreen
        user={user}
        onGoBack={() => setScreen(homeDashboard)}
      />
    );
  }

  if (screen === 'profile') {
    return (
      <ProfileScreen
        user={user}
        onGoBack={() => setScreen(homeDashboard)}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'dashboard') {
    return (
      <DashboardScreen
        user={user}
        onLogout={handleLogout}
        vendors={vendors}
        onVendorsChange={setVendors}
        onGoToProfile={() => setScreen('profile')}
        onGoToAttendance={() => setScreen('attendance')}
        onGoToDailyAllowance={() => setScreen('dailyAllowance')}
        onGoToVisits={() => setScreen('visits')}
        onGoToInventory={() => setScreen('inventory')}
      />
    );
  }

  if (screen === 'orderDashboard') {
    return (
      <OrderDashboardScreen
        user={user}
        onLogout={handleLogout}
        onGoBack={null}
        onGoToProfile={() => setScreen('profile')}
        onGoToInventory={() => setScreen('inventory')}
      />
    );
  }

  if (screen === 'inventory') {
    const isWarehouse = user && user.role === 'Warehouse';
    return (
      <InventoryDashboardScreen
        user={user}
        onGoBack={isWarehouse ? null : () => setScreen(homeDashboard)}
        onLogout={isWarehouse ? handleLogout : null}
      />
    );
  }

  if (screen === 'signup') {
    return <SignUpScreen onGoToLogin={() => setScreen('login')} />;
  }

  if (screen === 'forgotPassword') {
    return <ForgotPasswordScreen onGoToLogin={() => setScreen('login')} />;
  }

  return (
    <LoginScreen
      onGoToSignUp={() => setScreen('signup')}
      onGoToForgotPassword={() => setScreen('forgotPassword')}
      onLoginSuccess={handleLogin}
    />
  );
}
