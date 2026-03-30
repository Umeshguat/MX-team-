import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';

export default function SignUpScreen({ onGoToLogin }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);
  const [headquarter, setHeadquarter] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);

  const designations = [
    'Sales Executive',
    'Senior Sales Executive',
    'Area Sales Manager',
    'Regional Sales Manager',
    'Zonal Manager',
    'Territory Manager',
    'Business Development Executive',
    'Key Account Manager',
    'Sales Coordinator',
    'Team Leader',
  ];

  const handleSignUp = () => {
    if (loading) return;
    if (!fullName.trim() || !email.trim() || !designation || !headquarter.trim() || !phone.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    Alert.alert('Success', 'Account created successfully!', [
      { text: 'OK', onPress: () => { setLoading(false); onGoToLogin(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBarStyle} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Section */}
        <View style={[styles.brandSection, { backgroundColor: theme.primary }]}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={[styles.circle3, { backgroundColor: `rgba(${isDark ? '167,139,250' : '139,92,246'},0.15)` }]} />

          {/* Theme Toggle */}
          <TouchableOpacity
            style={styles.themeToggle}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={styles.themeToggleIcon}>{isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>MX</Text>
          </View>
          <Text style={styles.brandName}>MXTEAM</Text>
          <Text style={styles.tagline}>Distribution Management System</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>Fill in your details to get started</Text>

          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>FULL NAME</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={styles.inputIcon}>{'\uD83D\uDC64'}</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textTertiary}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>EMAIL</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={styles.inputIcon}>{'\u2709\uFE0F'}</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your email"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Designation Dropdown */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DESIGNATION</Text>
            <TouchableOpacity
              style={[styles.dropdownContainer, { backgroundColor: theme.surfaceVariant, borderColor: theme.inputBorder }]}
              onPress={() => setShowDesignationDropdown(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.inputIcon}>{'\uD83D\uDCBC'}</Text>
              <Text style={designation ? [styles.dropdownText, { color: theme.text }] : [styles.dropdownPlaceholder, { color: theme.textTertiary }]}>
                {designation || 'Select your designation'}
              </Text>
              <Text style={[styles.dropdownArrow, { color: theme.textTertiary }]}>{'\u25BC'}</Text>
            </TouchableOpacity>
          </View>

          {/* Headquarter Name */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>HEADQUARTER NAME</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={styles.inputIcon}>{'\uD83C\uDFE2'}</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your headquarter name"
                placeholderTextColor={theme.textTertiary}
                value={headquarter}
                onChangeText={setHeadquarter}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PHONE NUMBER</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={styles.inputIcon}>{'\uD83D\uDCF1'}</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PASSWORD</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={styles.inputIcon}>{'\uD83D\uDD12'}</Text>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.text }]}
                placeholder="Create a password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setSecureText(!secureText)}
              >
                <Text style={styles.eyeText}>{secureText ? '\uD83D\uDC41' : '\uD83D\uDE48'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CONFIRM PASSWORD</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={styles.inputIcon}>{'\uD83D\uDD10'}</Text>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={secureConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setSecureConfirm(!secureConfirm)}
              >
                <Text style={styles.eyeText}>{secureConfirm ? '\uD83D\uDC41' : '\uD83D\uDE48'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.signupBtn,
              { backgroundColor: theme.buttonPrimary, shadowColor: theme.buttonPrimary },
              loading && styles.signupBtnDisabled,
            ]}
            onPress={handleSignUp}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <Text style={[styles.signupBtnText, { color: theme.buttonText }]}>SIGN UP</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerText, { color: theme.textTertiary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          {/* Go to Login */}
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: theme.divider }]}
            onPress={onGoToLogin}
            activeOpacity={0.7}
          >
            <Text style={[styles.outlineBtnText, { color: theme.text }]}>Already have an account? </Text>
            <Text style={[styles.outlineBtnLink, { color: theme.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Designation Dropdown Modal */}
      <Modal
        visible={showDesignationDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDesignationDropdown(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setShowDesignationDropdown(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Designation</Text>
            <View style={[styles.modalDivider, { backgroundColor: theme.divider }]} />
            <FlatList
              data={designations}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: theme.divider },
                    designation === item && { backgroundColor: isDark ? 'rgba(107, 133, 255, 0.15)' : 'rgba(74, 103, 255, 0.08)' },
                  ]}
                  onPress={() => {
                    setDesignation(item);
                    setShowDesignationDropdown(false);
                  }}
                >
                  <Text style={styles.modalItemIcon}>{'\uD83D\uDCBC'}</Text>
                  <Text
                    style={[
                      styles.modalItemText,
                      { color: theme.text },
                      designation === item && { color: theme.primary, fontWeight: '700' },
                    ]}
                  >
                    {item}
                  </Text>
                  {designation === item && (
                    <Text style={[styles.modalCheckmark, { color: theme.primary }]}>{'\u2713'}</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Brand Section
  brandSection: {
    paddingTop: 54,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -40,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 60,
    left: -50,
  },
  circle3: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -30,
    right: 40,
  },
  themeToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  themeToggleIcon: {
    fontSize: 18,
  },
  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4A67FF',
    letterSpacing: 2,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 5,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 1.5,
  },

  // Form Card
  card: {
    marginTop: -24,
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 22,
  },

  // Inputs
  inputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  eyeText: {
    fontSize: 20,
  },

  // Dropdown
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
  },
  dropdownPlaceholder: {
    flex: 1,
    fontSize: 15,
  },
  dropdownArrow: {
    fontSize: 11,
    marginLeft: 8,
  },

  // Buttons
  signupBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signupBtnDisabled: {
    opacity: 0.7,
  },
  signupBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  outlineBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  outlineBtnText: {
    fontSize: 14,
  },
  outlineBtnLink: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 24,
    width: '85%',
    maxHeight: '60%',
    paddingTop: 20,
    paddingBottom: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    marginBottom: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalItemIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
  },
  modalCheckmark: {
    fontSize: 16,
    fontWeight: '700',
  },
});
