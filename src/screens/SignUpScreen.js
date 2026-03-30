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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme} activeOpacity={0.7}>
              <Text style={styles.themeIcon}>{isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
            </TouchableOpacity>
            <View style={styles.topRight}>
              <Text style={styles.noAccountText}>Already have an account?</Text>
              <TouchableOpacity style={styles.getStartedBtn} onPress={onGoToLogin} activeOpacity={0.7}>
                <Text style={styles.getStartedText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.brandName}>MXTEAM</Text>
          <Text style={styles.brandTag}>Distribution Management System</Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={[styles.formCard, {
          backgroundColor: theme.surface,
          shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(74,103,255,0.1)',
        }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>Fill in your details to get started</Text>

          {/* Full Name */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Enter your full name"
              placeholderTextColor={theme.placeholder}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
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

          {/* Designation Dropdown */}
          <TouchableOpacity
            style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, paddingBottom: 12 }]}
            onPress={() => setShowDesignationDropdown(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Designation</Text>
            <View style={styles.dropdownRow}>
              <Text style={designation ? [styles.dropdownText, { color: theme.inputText }] : [styles.dropdownText, { color: theme.placeholder }]}>
                {designation || 'Select your designation'}
              </Text>
              <Text style={[styles.dropdownArrow, { color: theme.textTertiary }]}>{'\u25BC'}</Text>
            </View>
          </TouchableOpacity>

          {/* Headquarter Name */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Headquarter Name</Text>
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Enter your headquarter name"
              placeholderTextColor={theme.placeholder}
              value={headquarter}
              onChangeText={setHeadquarter}
            />
          </View>

          {/* Phone */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.placeholder}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.inputText }]}
                placeholder="Create a password"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setSecureText(!secureText)}>
                <Text style={[styles.eyeIcon, { color: theme.textTertiary }]}>{secureText ? '\uD83D\uDC41' : '\uD83D\uDE48'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Confirm Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.inputText }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={secureConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setSecureConfirm(!secureConfirm)}>
                <Text style={[styles.eyeIcon, { color: theme.textTertiary }]}>{secureConfirm ? '\uD83D\uDC41' : '\uD83D\uDE48'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity onPress={handleSignUp} activeOpacity={0.8} disabled={loading} style={loading ? styles.btnDisabled : undefined}>
            <LinearGradient
              colors={[theme.gradient1, theme.gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.gradientBtnText}>Sign Up</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          {/* Go to Login */}
          <TouchableOpacity
            style={[styles.registerBtn, { borderColor: theme.divider }]}
            onPress={onGoToLogin}
            activeOpacity={0.7}
          >
            <Text style={[styles.registerBtnText, { color: theme.text }]}>Already have an account? Sign In</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
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
    fontWeight: '500',
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
    fontWeight: '700',
  },
  brandName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 4,
  },
  brandTag: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontWeight: '500',
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
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
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
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
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
    fontSize: 20,
  },

  /* ===== DROPDOWN ===== */
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 11,
    marginLeft: 8,
  },

  /* ===== GRADIENT BUTTON ===== */
  gradientBtn: {
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
  btnDisabled: {
    opacity: 0.7,
  },
  gradientBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* ===== DIVIDER ===== */
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
    fontWeight: '500',
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
    fontWeight: '700',
  },

  /* ===== MODAL ===== */
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
