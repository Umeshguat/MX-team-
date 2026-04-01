import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'app_theme_mode';

// Jobsly-inspired blue/purple color palette
const lightTheme = {
  mode: 'light',
  // Primary gradient colors
  primary: '#4A67FF',
  primaryDark: '#3B4FD4',
  primaryLight: '#6B85FF',
  secondary: '#8B5CF6',
  accent: '#A78BFA',
  gradient1: '#4A67FF',
  gradient2: '#8B5CF6',

  // Backgrounds
  background: '#F5F7FF',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F2FF',
  headerBg: '#4A67FF',

  // Text
  text: '#1E1E2D',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnSurface: '#1E1E2D',

  // Input
  inputBg: '#F0F2FF',
  inputBorder: '#E0E4FF',
  inputText: '#1E1E2D',
  placeholder: '#9CA3AF',

  // Cards
  cardBg: '#FFFFFF',
  cardBorder: '#E8EBFF',
  cardShadow: 'rgba(74, 103, 255, 0.08)',

  // Status colors
  success: '#10B981',
  successBg: '#ECFDF5',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  info: '#3B82F6',
  infoBg: '#EFF6FF',

  // Buttons
  buttonPrimary: '#4A67FF',
  buttonSecondary: '#8B5CF6',
  buttonDisabled: '#C4C9E8',
  buttonText: '#FFFFFF',

  // Misc
  divider: '#E8EBFF',
  overlay: 'rgba(30, 30, 45, 0.5)',
  statusBarStyle: 'light',
  ripple: 'rgba(74, 103, 255, 0.1)',

  // Header decorative circles
  circle1Color: 'rgba(139, 92, 246, 0.3)',
  circle2Color: 'rgba(167, 139, 250, 0.2)',

  // Tab/Nav
  tabActive: '#4A67FF',
  tabInactive: '#9CA3AF',
  navBg: '#FFFFFF',
};

const darkTheme = {
  mode: 'dark',
  // Primary gradient colors
  primary: '#6B85FF',
  primaryDark: '#4A67FF',
  primaryLight: '#8BA3FF',
  secondary: '#A78BFA',
  accent: '#C4B5FD',
  gradient1: '#4A67FF',
  gradient2: '#8B5CF6',

  // Backgrounds
  background: '#0F1120',
  surface: '#1A1D35',
  surfaceVariant: '#232847',
  headerBg: '#1A1D35',

  // Text
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textOnPrimary: '#FFFFFF',
  textOnSurface: '#F1F5F9',

  // Input
  inputBg: '#232847',
  inputBorder: '#2E3461',
  inputText: '#F1F5F9',
  placeholder: '#64748B',

  // Cards
  cardBg: '#1A1D35',
  cardBorder: '#2E3461',
  cardShadow: 'rgba(0, 0, 0, 0.3)',

  // Status colors
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.15)',
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.15)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  info: '#60A5FA',
  infoBg: 'rgba(96, 165, 250, 0.15)',

  // Buttons
  buttonPrimary: '#6B85FF',
  buttonSecondary: '#A78BFA',
  buttonDisabled: '#3B4060',
  buttonText: '#FFFFFF',

  // Misc
  divider: '#2E3461',
  overlay: 'rgba(0, 0, 0, 0.7)',
  statusBarStyle: 'light',
  ripple: 'rgba(107, 133, 255, 0.15)',

  // Header decorative circles
  circle1Color: 'rgba(139, 92, 246, 0.2)',
  circle2Color: 'rgba(167, 139, 250, 0.15)',

  // Tab/Nav
  tabActive: '#6B85FF',
  tabInactive: '#64748B',
  navBg: '#1A1D35',
};

// Font weight to Poppins font family mapping
const fontFamily = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  extraBold: 'Poppins-ExtraBold',
  black: 'Poppins-Black',
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(function () {
    AsyncStorage.getItem(THEME_KEY)
      .then(function (val) {
        if (val === 'dark') setIsDark(true);
        setLoaded(true);
      })
      .catch(function () {
        setLoaded(true);
      });
  }, []);

  var toggleTheme = function () {
    var newVal = !isDark;
    setIsDark(newVal);
    AsyncStorage.setItem(THEME_KEY, newVal ? 'dark' : 'light').catch(function () {});
  };

  var theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme: theme, isDark: isDark, toggleTheme: toggleTheme, loaded: loaded, fonts: fontFamily }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  var ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export { lightTheme, darkTheme, fontFamily };
