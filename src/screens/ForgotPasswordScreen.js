import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL as SERVER_URL } from '../config';

const BASE_URL = SERVER_URL + '/api/users';

export default function ForgotPasswordScreen({ onGoToLogin }) {
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

  const renderStep1 = () => (
    <>
      <Text style={styles.cardTitle}>Forgot Password?</Text>
      <Text style={styles.description}>
        Enter the email address associated with your account and we'll send you an OTP to reset your password.
      </Text>

      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSendOtp}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>SEND OTP</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.cardTitle}>Enter OTP</Text>
      <Text style={styles.description}>
        We've sent a 6-digit OTP to{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (otpRefs.current[index] = ref)}
            style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
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
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleVerifyOtp}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>VERIFY OTP</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn't receive OTP? </Text>
        {resendTimer > 0 ? (
          <Text style={styles.resendTimerText}>Resend in {resendTimer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.changeEmailBtn} onPress={() => setStep(1)}>
        <Text style={styles.changeEmailText}>Change Email</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.cardTitle}>Create New Password</Text>
      <Text style={styles.description}>
        Your new password must be at least 6 characters long.
      </Text>

      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>New Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Enter new password"
            placeholderTextColor="#999"
            secureTextEntry={secureNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setSecureNew(!secureNew)}
          >
            <Text style={styles.eyeText}>{secureNew ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            secureTextEntry={secureConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setSecureConfirm(!secureConfirm)}
          >
            <Text style={styles.eyeText}>{secureConfirm ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleResetPassword}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>RESET PASSWORD</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStep4 = () => (
    <View style={styles.successBox}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>
      <Text style={styles.successTitle}>Password Reset!</Text>
      <Text style={styles.successDescription}>
        Your password has been changed successfully.{'\n'}You can now login with your new password.
      </Text>

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={onGoToLogin}
        activeOpacity={0.8}
      >
        <Text style={styles.submitBtnText}>GO TO LOGIN</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Top Section */}
        <View style={styles.topSection}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <Text style={styles.brand}>MXTEAM</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Step Indicator */}
          {step < 4 && (
            <View style={styles.stepRow}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={styles.stepItem}>
                  <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                    <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                      {step > s ? '✓' : s}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
                    {s === 1 ? 'Email' : s === 2 ? 'OTP' : 'Password'}
                  </Text>
                  {s < 3 && (
                    <View style={[styles.stepLine, step > s && styles.stepLineActive]} />
                  )}
                </View>
              ))}
            </View>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Back to Login */}
          {step < 4 && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity style={styles.backBtn} onPress={onGoToLogin}>
                <Text style={styles.backArrow}>←</Text>
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    height: height * 0.30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(229, 57, 53, 0.3)',
    top: -60,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 87, 34, 0.2)',
    top: 40,
    left: -70,
  },
  brand: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    letterSpacing: 2,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 30,
    paddingTop: 25,
    paddingBottom: 40,
  },
  // Step Indicator
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  stepDotActive: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
    marginRight: 4,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#e53935',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 2,
  },
  stepLineActive: {
    backgroundColor: '#e53935',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#888',
    lineHeight: 21,
    marginBottom: 24,
  },
  emailHighlight: {
    color: '#1a1a2e',
    fontWeight: '700',
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 12,
  },
  eyeText: {
    fontSize: 20,
  },
  // OTP
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#f5f5f7',
    borderWidth: 2,
    borderColor: '#eee',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  otpInputFilled: {
    borderColor: '#e53935',
    backgroundColor: '#fef2f2',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  resendLabel: {
    fontSize: 13,
    color: '#888',
  },
  resendTimerText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 13,
    color: '#e53935',
    fontWeight: '700',
  },
  changeEmailBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  changeEmailText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Buttons
  submitBtn: {
    backgroundColor: '#e53935',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  // Success
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 36,
    color: '#4caf50',
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  backBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#e53935',
    marginRight: 8,
    fontWeight: '700',
  },
  backText: {
    color: '#e53935',
    fontSize: 15,
    fontWeight: '700',
  },
});
