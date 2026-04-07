import React, { useState } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

var { width } = Dimensions.get('window');

export default function LoginScreen({ onGoToSignUp, onGoToForgotPassword, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const { theme, isDark, toggleTheme, fonts } = useTheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok && data.status === 200) {
        const userData = data.data;
        var role = 'employee';
        if (userData.role_name) {
          var rn = userData.role_name.toLowerCase();
          if (rn === 'admin') role = 'admin';
          else if (rn === 'warehouse') role = 'Warehouse';
          else if (rn === 'sales') role = 'Sales';
          else if (rn === 'delivery agent') role = 'DeliveryAgent';
          else if (rn === 'distributor') role = 'Distributor';
          else role = 'employee';
        }
        onLoginSuccess({
          _id: userData._id,
          email: userData.email || email.trim(),
          fullName: userData.full_name || email.trim().split('@')[0],
          role: role,
          role_id: userData.role_id || '',
          role_name: userData.role_name || '',
          designation: userData.designation_name || '',
          designation_id: userData.designation_id || '',
          headquarter: userData.headquarter_name || '',
          phone: userData.phone_number || '',
          profile_image: userData.profile_image || '',
          distributor_id: userData.distributor_id || '',
          distributor_name: userData.distributor_name || '',
          distributor_mobile: userData.distributor_mobile || '',
          token: userData.token,
        });
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid email or password');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'Server took too long to respond. Please try again.');
      } else {
        Alert.alert('Error', 'Unable to connect to server. Check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>

          {/* Top Gradient Header */}
          <LinearGradient
            colors={[theme.gradient1, theme.gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Decorative circles */}
            <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

            {/* Top bar: back + sign up */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme} activeOpacity={0.7}>
                {isDark ? <Ionicons name="sunny" size={18} color="#fff" /> : <Ionicons name="moon" size={18} color="#fff" />}
              </TouchableOpacity>
              <View style={styles.topRight}>
                <Text style={styles.noAccountText}>Don't have an account?</Text>
                <TouchableOpacity style={styles.getStartedBtn} onPress={onGoToSignUp} activeOpacity={0.7}>
                  <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Brand */}
            <Text style={styles.brandName}>MXTEAM</Text>
            <Text style={styles.brandTag}>Distribution Management System</Text>
          </LinearGradient>

          {/* Form Card */}
          <View style={[styles.formCard, {
            backgroundColor: theme.surface,
            shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(74,103,255,0.1)',
          }]}>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.welcomeSub, { color: theme.textTertiary }]}>Enter your details below</Text>

            {/* Email Input */}
            <View style={[styles.inputWrapper, {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
            }]}>
              <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { color: theme.inputText }]}
                placeholder="name@company.com"
                placeholderTextColor={theme.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputWrapper, {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
            }]}>
              <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { color: theme.inputText }]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={secureText}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setSecureText(!secureText)}>
                  {secureText ? <Ionicons name="eye" size={20} color={theme.textTertiary} /> : <Ionicons name="eye-off" size={20} color={theme.textTertiary} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
              style={loading ? styles.loginBtnDisabled : undefined}
            >
              <LinearGradient
                colors={[theme.gradient1, theme.gradient2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signInText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotRow} onPress={onGoToForgotPassword} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: theme.textSecondary }]}>Forgot your password?</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
              <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            </View>

            {/* Register Button */}
            <TouchableOpacity style={[styles.registerBtn, { borderColor: theme.divider }]} onPress={onGoToSignUp} activeOpacity={0.7}>
              <Text style={[styles.registerBtnText, { color: theme.text }]}>Create New Account</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ===== HEADER GRADIENT ===== */
  headerGradient: {
    paddingTop: 55,
    paddingBottom: 60,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -80,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -50,
    left: -40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 18,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noAccountText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginRight: 8,
  },
  getStartedBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  brandName: {
    fontSize: 34,
    fontFamily: 'Poppins-Black',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 4,
  },
  brandTag: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
    letterSpacing: 0.5,
  },

  /* ===== FORM CARD ===== */
  formCard: {
    marginTop: -30,
    marginHorizontal: 20,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    elevation: 8,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-ExtraBold',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginBottom: 30,
  },

  /* ===== INPUTS ===== */
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 16,
  },
  floatingLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 36,
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    padding: 6,
  },
  eyeIcon: {
  },

  /* ===== SIGN IN BUTTON ===== */
  signInBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    elevation: 6,
    shadowColor: 'rgba(74,103,255,0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  signInText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },

  /* ===== FORGOT & DIVIDER ===== */
  forgotRow: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },

  /* ===== REGISTER BUTTON ===== */
  registerBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  registerBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
});
