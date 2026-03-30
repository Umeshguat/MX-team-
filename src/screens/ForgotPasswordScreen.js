import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL as SERVER_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';

const BASE_URL = SERVER_URL + '/api/users';

export default function ForgotPasswordScreen({ onGoToLogin }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password, 4: success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  const startResendTimer = () => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert('OTP Sent', data.message || 'OTP has been sent to your email');
        setStep(2);
        startResendTimer();
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to connect to server. Check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpString }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(3);
      } else {
        Alert.alert('Error', data.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to connect to server. Check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const otpString = otp.join('');
      const response = await fetch(`${BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otpString,
          new_password: newPassword,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(4);
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to connect to server. Check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert('OTP Resent', data.message || 'A new OTP has been sent to your email');
        setOtp(['', '', '', '', '', '']);
        startResendTimer();
      } else {
        Alert.alert('Error', data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // OTP input handler
  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 1: return 'Reset Password';
      case 2: return 'Verify OTP';
      case 3: return 'New Password';
      case 4: return 'Success';
      default: return 'Reset Password';
    }
  };

  const renderStepIndicator = () => {
    if (step >= 4) return null;
    return (
      <View style={styles.stepRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                { backgroundColor: theme.inputBg, borderColor: theme.divider },
                step >= s && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
            >
              <Text
                style={[
                  styles.stepDotText,
                  { color: theme.textTertiary },
                  step >= s && { color: '#FFFFFF' },
                ]}
              >
                {step > s ? '\u2713' : s}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                { color: theme.textTertiary },
                step >= s && { color: theme.primary },
              ]}
            >
              {s === 1 ? 'Email' : s === 2 ? 'OTP' : 'Password'}
            </Text>
            {s < 3 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: theme.divider },
                  step > s && { backgroundColor: theme.primary },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStep1 = () => (
    <>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Forgot Password?</Text>
      <Text style={[styles.description, { color: theme.textTertiary }]}>
        Enter the email address associated with your account and we'll send you an OTP to reset your password.
      </Text>

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

      <TouchableOpacity
        onPress={handleSendOtp}
        activeOpacity={0.8}
        disabled={loading}
        style={loading ? styles.btnDisabled : undefined}
      >
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.gradientBtnText}>SEND OTP</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Enter OTP</Text>
      <Text style={[styles.description, { color: theme.textTertiary }]}>
        We've sent a 6-digit OTP to{'\n'}
        <Text style={[styles.emailHighlight, { color: theme.primary }]}>{email}</Text>
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (otpRefs.current[index] = ref)}
            style={[
              styles.otpInput,
              { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
              digit ? { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(107,133,255,0.12)' : 'rgba(74,103,255,0.06)' } : null,
            ]}
            value={digit}
            onChangeText={(text) => handleOtpChange(text, index)}
            onKeyPress={(e) => handleOtpKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={handleVerifyOtp}
        activeOpacity={0.8}
        disabled={loading}
        style={loading ? styles.btnDisabled : undefined}
      >
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.gradientBtnText}>VERIFY OTP</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={[styles.resendLabel, { color: theme.textTertiary }]}>Didn't receive OTP? </Text>
        {resendTimer > 0 ? (
          <Text style={[styles.resendTimerText, { color: theme.textTertiary }]}>Resend in {resendTimer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
            <Text style={[styles.resendLink, { color: theme.primary }]}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.changeEmailBtn} onPress={() => setStep(1)}>
        <Text style={[styles.changeEmailText, { color: theme.textSecondary }]}>Change Email</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Create New Password</Text>
      <Text style={[styles.description, { color: theme.textTertiary }]}>
        Your new password must be at least 6 characters long.
      </Text>

      <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
        <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>New Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput, { color: theme.inputText }]}
            placeholder="Enter new password"
            placeholderTextColor={theme.placeholder}
            secureTextEntry={secureNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setSecureNew(!secureNew)}>
            <Text style={[styles.eyeIcon, { color: theme.textTertiary }]}>{secureNew ? '\uD83D\uDC41' : '\uD83D\uDE48'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
        <Text style={[styles.floatingLabel, { color: theme.textTertiary }]}>Confirm Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput, { color: theme.inputText }]}
            placeholder="Confirm new password"
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

      <TouchableOpacity
        onPress={handleResetPassword}
        activeOpacity={0.8}
        disabled={loading}
        style={loading ? styles.btnDisabled : undefined}
      >
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.gradientBtnText}>RESET PASSWORD</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderStep4 = () => (
    <View style={styles.successBox}>
      <View style={[styles.successIcon, { backgroundColor: theme.successBg }]}>
        <Text style={[styles.successIconText, { color: theme.success }]}>{'\u2713'}</Text>
      </View>
      <Text style={[styles.successTitle, { color: theme.text }]}>Password Reset!</Text>
      <Text style={[styles.successDescription, { color: theme.textTertiary }]}>
        Your password has been changed successfully.{'\n'}You can now login with your new password.
      </Text>

      <TouchableOpacity
        onPress={onGoToLogin}
        activeOpacity={0.8}
        style={{ width: '100%' }}
      >
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBtn}
        >
          <Text style={styles.gradientBtnText}>GO TO LOGIN</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Gradient */}
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
          <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={onGoToLogin} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>{'\u2039'}</Text>
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>{getSubtitle()}</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.brandName}>MXTEAM</Text>
          <Text style={styles.brandTag}>Distribution Management System</Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={[styles.formCard, {
          backgroundColor: theme.surface,
          shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(74,103,255,0.1)',
        }]}>
          {renderStepIndicator()}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Back to Login */}
          {step < 4 && (
            <>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
              </View>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: theme.divider }]}
                onPress={onGoToLogin}
                activeOpacity={0.7}
              >
                <Text style={[styles.backArrow, { color: theme.primary }]}>{'\u2190'}</Text>
                <Text style={[styles.backText, { color: theme.primary }]}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  topBarTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
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

  /* ===== STEP INDICATOR ===== */
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    marginLeft: 4,
    marginRight: 4,
    fontWeight: '600',
  },
  stepLine: {
    width: 22,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 2,
  },

  /* ===== CARD CONTENT ===== */
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  emailHighlight: {
    fontWeight: '700',
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

  /* ===== OTP ===== */
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  resendLabel: {
    fontSize: 13,
  },
  resendTimerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  changeEmailBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  changeEmailText: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  /* ===== GRADIENT BUTTON ===== */
  gradientBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    elevation: 6,
    shadowColor: 'rgba(74,103,255,0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  gradientBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.7,
  },

  /* ===== OUTLINE BUTTON ===== */
  outlineBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  backArrow: {
    fontSize: 18,
    marginRight: 8,
    fontWeight: '700',
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
  },

  /* ===== SUCCESS ===== */
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 36,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },

  /* ===== DIVIDER ===== */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
});
