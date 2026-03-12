import { useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);

  if (screen === 'dashboard') {
    return (
      <DashboardScreen
        user={user}
        onLogout={() => {
          setUser(null);
          setScreen('login');
        }}
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
      onLoginSuccess={(userData) => {
        setUser(userData);
        setScreen('dashboard');
      }}
    />
  );
}
