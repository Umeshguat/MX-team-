import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import GPSCameraScreen from '../components/GPSCameraScreen';
import { extractKmFromImage } from '../utils/ocrHelper';
import { useTheme } from '../theme/ThemeContext';

export default function DashboardScreen({ user, onLogout, vendors, onVendorsChange, onGoToProfile, onGoToAttendance, onGoToDailyAllowance, onGoToVisits, onGoToInventory }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('checkin');
  const [kmImage, setKmImage] = useState(null);
  const [kmReading, setKmReading] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [hqName, setHqName] = useState('');
  const [workingTown, setWorkingTown] = useState('');
  const [route, setRoute] = useState('');

  const [selfieImage, setSelfieImage] = useState(null);
  const [outOfTown, setOutOfTown] = useState(false);
  const [stayBillImage, setStayBillImage] = useState(null);
  const [stayBillAmount, setStayBillAmount] = useState('');
  const [foodBillImage, setFoodBillImage] = useState(null);
  const [foodBillAmount, setFoodBillAmount] = useState('');
  const [otherBillImage, setOtherBillImage] = useState(null);
  const [otherBillAmount, setOtherBillAmount] = useState('');
  const [otherBillDescription, setOtherBillDescription] = useState('');

  const [showGPSCamera, setShowGPSCamera] = useState(false);
  const [gpsCameraTarget, setGpsCameraTarget] = useState(null);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorNote, setVendorNote] = useState('');
  const [vendorSelfie, setVendorSelfie] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/users/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      const text = await response.text();
      console.log('Dashboard API:', text);
      const result = JSON.parse(text);
      if (result.status === 200 && result.data) {
        setDashboardData(result.data);
        setCheckedIn(result.data.check_in === true);
        if (result.data.my_attendance) {
          const att = result.data.my_attendance;
          if (att.check_in_time) {
            setCheckInTime(att.check_in_time);
          }
          if (att.check_out_time) {
            setCheckOutTime(att.check_out_time);
          }
        }
      }
    } catch (e) {
      console.log('Dashboard fetch error:', e);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatTime = (date) => {
    if (!date) return '--:--';
    if (typeof date === 'string') return date;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getImageFile = (uri, prefix) => {
    return { uri: uri, name: prefix + '_' + Date.now() + '.jpg', type: 'image/jpeg' };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const runOcrOnImage = async (uri) => {
    setKmImage(uri);
    setOcrLoading(true);
    try {
      const km = await extractKmFromImage(uri);
      if (km) {
        setKmReading(km);
        Alert.alert('KM Detected', 'Odometer reading: ' + km + ' km\n\nYou can edit if incorrect.');
      } else {
        Alert.alert('OCR', 'Could not detect KM from image. Please enter manually.');
      }
    } catch (e) {
      console.log('OCR failed:', e);
      Alert.alert('OCR Error', 'Could not read image. Please enter KM manually.');
    }
    setOcrLoading(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        runOcrOnImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        runOcrOnImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const resetModalFields = () => {
    setKmImage(null);
    setKmReading('');
    setOcrLoading(false);
    setHqName('');
    setWorkingTown('');
    setRoute('');
    setSelfieImage(null);
    setOutOfTown(false);
    setStayBillImage(null);
    setStayBillAmount('');
    setFoodBillImage(null);
    setFoodBillAmount('');
    setOtherBillImage(null);
    setOtherBillAmount('');
    setOtherBillDescription('');
  };

  const takeSelfie = () => {
    setGpsCameraTarget('selfie');
    setShowGPSCamera(true);
  };

  const pickSelfie = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelfieImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const takeBillPhoto = async (setter) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { Alert.alert('Permission needed', 'Camera permission is required'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets && result.assets.length > 0) { setter(result.assets[0].uri); }
    } catch (e) { Alert.alert('Error', 'Could not open camera'); }
  };

  const pickBillImage = async (setter) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets && result.assets.length > 0) { setter(result.assets[0].uri); }
    } catch (e) { Alert.alert('Error', 'Could not open gallery'); }
  };

  const submitModal = async () => {
    if (submitting) return;
    if (modalType === 'checkin' && !selfieImage) {
      Alert.alert('Error', 'Please take a selfie for check-in');
      return;
    }
    if (!kmImage) {
      Alert.alert('Error', 'Please upload KM image');
      return;
    }
    if (!kmReading.trim() || !hqName.trim() || !workingTown.trim() || !route.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    console.log('=== CHECK-IN/OUT IMAGE FILES ===');
    console.log('selfie_image URI:', selfieImage);
    console.log('selfie_image file:', selfieImage ? JSON.stringify(getImageFile(selfieImage, 'selfie')) : 'none');
    console.log('check_in/out_image URI:', kmImage);
    console.log('check_in/out_image file:', kmImage ? JSON.stringify(getImageFile(kmImage, 'km')) : 'none');
    if (outOfTown) {
      console.log('stay_image URI:', stayBillImage);
      console.log('stay_image file:', stayBillImage ? JSON.stringify(getImageFile(stayBillImage, 'stay')) : 'none');
      console.log('food_image URI:', foodBillImage);
      console.log('food_image file:', foodBillImage ? JSON.stringify(getImageFile(foodBillImage, 'food')) : 'none');
      console.log('other_image URI:', otherBillImage);
      console.log('other_image file:', otherBillImage ? JSON.stringify(getImageFile(otherBillImage, 'other')) : 'none');
    }
    console.log('================================');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude.toString();
      const lng = location.coords.longitude.toString();

      const token = user && user.token ? user.token : '';
      const apiUrl = modalType === 'checkin'
        ? `${BASE_URL}/api/attendance/check-in`
        : `${BASE_URL}/api/attendance/check-out`;

      const formData = new FormData();
      formData.append('headquarter_name', hqName.trim());
      formData.append('working_town', workingTown.trim());
      formData.append('route', route.trim());
      formData.append('total_km', kmReading.trim());
      formData.append('latitude', lat);
      formData.append('longitude', lng);

      if (modalType === 'checkin') {
        formData.append('check_in_image', getImageFile(kmImage, 'km'));
      } else {
        formData.append('check_out_image', getImageFile(kmImage, 'km'));
      }

      if (selfieImage) {
        formData.append('selfie_image', getImageFile(selfieImage, 'selfie'));
      }

      if (outOfTown) {
        formData.append('out_of_town', 'true');
        if (stayBillAmount.trim()) formData.append('stay_bill_amount', stayBillAmount.trim());
        if (stayBillImage) {
          formData.append('stay_image', getImageFile(stayBillImage, 'stay'));
        }
        if (foodBillAmount.trim()) formData.append('food_bill_amount', foodBillAmount.trim());
        if (foodBillImage) {
          formData.append('food_image', getImageFile(foodBillImage, 'food'));
        }
        if (otherBillDescription.trim()) formData.append('other_bill_description', otherBillDescription.trim());
        if (otherBillAmount.trim()) formData.append('other_bill_amount', otherBillAmount.trim());
        if (otherBillImage) {
          formData.append('other_image', getImageFile(otherBillImage, 'other'));
        }
      } else {
        formData.append('out_of_town', 'false');
      }

      console.log('=== ' + modalType.toUpperCase() + ' PAYLOAD ===');
      console.log('headquarter_name:', hqName.trim());
      console.log('working_town:', workingTown.trim());
      console.log('route:', route.trim());
      console.log('total_km:', kmReading.trim());
      console.log('latitude:', lat, 'longitude:', lng);
      console.log('image file:', modalType === 'checkin' ? JSON.stringify(getImageFile(kmImage, 'km')) : JSON.stringify(getImageFile(kmImage, 'km')));
      console.log('selfie_image file:', selfieImage ? JSON.stringify(getImageFile(selfieImage, 'selfie')) : 'none');
      console.log('out_of_town:', outOfTown ? 'true' : 'false');
      console.log('API URL:', apiUrl);
      console.log('========================');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log(modalType + ' API Status:', response.status);
      console.log(modalType + ' API Response:', responseText);

      if (!response.ok) {
        throw new Error('Server error: ' + response.status + ' - ' + responseText);
      }

      if (modalType === 'checkin') {
        setCheckedIn(true);
        setCheckInTime(new Date());
        setCheckOutTime(null);
        Alert.alert('Success', 'Checked in successfully!');
      } else {
        setCheckedIn(false);
        setCheckOutTime(new Date());
        Alert.alert('Success', 'Checked out successfully!');
      }
      setShowModal(false);
      resetModalFields();
      fetchDashboard();
    } catch (e) {
      console.log(modalType + ' error:', e);
      Alert.alert('Error', 'Failed to ' + modalType + ': ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pickVendorSelfie = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVendorSelfie(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const takeVendorSelfie = () => {
    setGpsCameraTarget('vendor');
    setShowGPSCamera(true);
  };

  const onGPSCameraCapture = (uri) => {
    if (gpsCameraTarget === 'selfie') {
      setSelfieImage(uri);
    } else if (gpsCameraTarget === 'vendor') {
      setVendorSelfie(uri);
    }
    setShowGPSCamera(false);
    setGpsCameraTarget(null);
  };

  const submitVendor = async () => {
    if (submitting) return;
    if (!vendorName.trim()) {
      Alert.alert('Error', 'Please enter vendor name');
      return;
    }
    if (!vendorSelfie) {
      Alert.alert('Error', 'Please take a selfie with vendor');
      return;
    }
    if (!isOnboarded) {
      Alert.alert('Error', 'Please select onboard status');
      return;
    }

    setSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude.toString();
      const lng = location.coords.longitude.toString();
      const addressGps = lat + ', ' + lng;
      const today = new Date();
      const visitDate = today.getFullYear() + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0');
      const onBoardValue = isOnboarded === 'yes' ? 'true' : 'false';

      const formData = new FormData();
      formData.append('vendor_name', vendorName.trim());
      formData.append('vendor_mobile', vendorMobile.trim());
      formData.append('address_gps', addressGps);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      formData.append('on_board', onBoardValue);
      formData.append('note', vendorNote.trim());
      formData.append('visit_date', visitDate);

      formData.append('selfie_with_vendor', getImageFile(vendorSelfie, 'vendor_selfie'));

      console.log('=== VENDOR VISIT PAYLOAD ===');
      console.log('vendor_name:', vendorName.trim());
      console.log('vendor_mobile:', vendorMobile.trim());
      console.log('address_gps:', addressGps);
      console.log('latitude:', lat);
      console.log('longitude:', lng);
      console.log('on_board:', onBoardValue);
      console.log('visit_date:', visitDate);
      console.log('selfie_with_vendor:', JSON.stringify(getImageFile(vendorSelfie, 'vendor_selfie')));
      console.log('============================');

      const response = await fetch(`${BASE_URL}/api/vendor-visits`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (user && user.token ? user.token : ''),
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log('API Status:', response.status);
      console.log('API Response:', responseText);

      if (!response.ok) {
        throw new Error('Server error: ' + response.status + ' - ' + responseText);
      }

      onVendorsChange([...(vendors || []), {
        name: vendorName.trim(),
        mobile: vendorMobile.trim(),
        selfie: vendorSelfie,
        onboarded: isOnboarded,
        time: new Date(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      }]);
      setVendorName('');
      setVendorMobile('');
      setVendorNote('');
      setVendorSelfie(null);
      setIsOnboarded(null);
      setShowVendorModal(false);
      Alert.alert('Success', 'Vendor visit recorded!');
    } catch (e) {
      console.log('Vendor submit error:', e);
      Alert.alert('Error', 'Failed to submit vendor visit: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getWorkingHours = () => {
    if (!checkInTime) return '0h 0m';
    if (dashboardData && dashboardData.my_attendance && dashboardData.my_attendance.hours) {
      return dashboardData.my_attendance.hours;
    }
    if (typeof checkInTime === 'string') return '0h 0m';
    const end = checkOutTime instanceof Date ? checkOutTime : new Date();
    const diff = Math.floor((end - checkInTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return hours + 'h ' + minutes + 'm';
  };

  const userName = user && user.fullName ? user.fullName : 'Employee';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* ===== HEADER ===== */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={[styles.circle3, { backgroundColor: theme.secondary }]} />

        <View style={styles.headerTopRow}>
          {/* Avatar */}
          <View style={styles.headerLeftGroup}>
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.headerGreetingBlock}>
              <Text style={styles.greeting}>Welcome Back,</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </View>

          <View style={styles.headerRightGroup}>
            {/* Theme toggle */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Text style={styles.headerIconText}>{isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
            </TouchableOpacity>
            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== STATUS CHIP ===== */}
        <View style={[styles.statusChip, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusDot, checkedIn ? { backgroundColor: theme.success } : { backgroundColor: theme.textTertiary }]} />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {checkedIn ? 'You are Checked In' : 'You are Checked Out'}
          </Text>
        </View>

        {/* ===== ACTION BUTTONS ROW ===== */}
        <View style={styles.actionBtnRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, checkedIn ? { backgroundColor: theme.error, shadowColor: theme.error } : { backgroundColor: theme.success, shadowColor: theme.success }]}
            onPress={() => {
              if (checkedIn) {
                setModalType('checkout');
              } else {
                setModalType('checkin');
              }
              setShowModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnIcon}>{checkedIn ? '\u2197' : '\u2199'}</Text>
            <Text style={styles.actionBtnLabel}>{checkedIn ? 'CHECK OUT' : 'CHECK IN'}</Text>
          </TouchableOpacity>

          <View style={{ width: 12 }} />

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: theme.info, shadowColor: theme.info }]}
            onPress={() => setShowVendorModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnIcon}>{'\uD83C\uDFEA'}</Text>
            <Text style={styles.actionBtnLabel}>VENDOR</Text>
          </TouchableOpacity>
        </View>

        {/* ===== STATS CARDS ===== */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statIconCircle, { backgroundColor: theme.successBg || 'rgba(34,197,94,0.12)' }]}>
              <Text style={styles.statIconEmoji}>{'\u2199'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>CHECK IN</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatTime(checkInTime)}</Text>
          </View>

          <View style={{ width: 12 }} />

          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statIconCircle, { backgroundColor: theme.errorBg || 'rgba(239,68,68,0.12)' }]}>
              <Text style={styles.statIconEmoji}>{'\u2197'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>CHECK OUT</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatTime(checkOutTime)}</Text>
          </View>
        </View>

        {/* Working Hours Card */}
        <View style={[styles.workingHoursCard, { backgroundColor: theme.surface }]}>
          <View style={styles.workingHoursLeft}>
            <View style={[styles.statIconCircle, { backgroundColor: theme.infoBg || 'rgba(59,130,246,0.12)' }]}>
              <Text style={styles.statIconEmoji}>{'\u23F1'}</Text>
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>WORKING HOURS</Text>
              <Text style={[styles.workingHoursValue, { color: theme.primary }]}>{getWorkingHours()}</Text>
            </View>
          </View>
        </View>

        {/* ===== QUICK ACTIONS SECTION ===== */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionIndicator, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.surface }]} activeOpacity={0.7}>
            <View style={[styles.quickActionIconBg, { backgroundColor: theme.infoBg || 'rgba(59,130,246,0.12)' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDCCA'}</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>My Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.surface }]} onPress={onGoToAttendance} activeOpacity={0.7}>
            <View style={[styles.quickActionIconBg, { backgroundColor: theme.errorBg || 'rgba(239,68,68,0.12)' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDCC5'}</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.surface }]} onPress={onGoToVisits} activeOpacity={0.7}>
            <View style={[styles.quickActionIconBg, { backgroundColor: theme.successBg || 'rgba(34,197,94,0.12)' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDCCD'}</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.surface }]} onPress={onGoToProfile} activeOpacity={0.7}>
            <View style={[styles.quickActionIconBg, { backgroundColor: theme.warningBg || 'rgba(245,158,11,0.12)' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDC64'}</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.surface }]} onPress={onGoToInventory} activeOpacity={0.7}>
            <View style={[styles.quickActionIconBg, { backgroundColor: theme.surfaceVariant || 'rgba(107,114,128,0.12)' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDCE6'}</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.surface }]} onPress={onGoToDailyAllowance} activeOpacity={0.7}>
            <View style={[styles.quickActionIconBg, { backgroundColor: theme.infoBg || 'rgba(59,130,246,0.12)' }]}>
              <Text style={styles.quickActionEmoji}>{'\uD83D\uDCB0'}</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Allowance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===== CHECK-IN / CHECK-OUT MODAL ===== */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setShowModal(false); resetModalFields(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={[styles.sectionIndicator, { backgroundColor: modalType === 'checkout' ? theme.error : theme.success }]} />
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {modalType === 'checkin' ? 'Check In Details' : 'Check Out Details'}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.background }]} onPress={() => { setShowModal(false); resetModalFields(); }}>
                  <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              {/* Selfie */}
              <View>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>SELFIE</Text>
                {selfieImage ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: selfieImage }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelfieImage(null)}>
                      <Text style={styles.removeImageText}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.uploadArea, { backgroundColor: theme.background, borderColor: theme.divider }]} onPress={takeSelfie} activeOpacity={0.7}>
                    <Text style={styles.uploadEmoji}>{'\uD83E\uDD33'}</Text>
                    <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>Take Selfie</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* KM Image */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>KM IMAGE</Text>
              {kmImage ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: kmImage }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setKmImage(null)}>
                    <Text style={styles.removeImageText}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.uploadArea, { backgroundColor: theme.background, borderColor: theme.divider }]} onPress={takePhoto} activeOpacity={0.7}>
                  <Text style={styles.uploadEmoji}>{'\uD83D\uDCF7'}</Text>
                  <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>Capture KM Photo</Text>
                </TouchableOpacity>
              )}

              {/* KM Reading */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>KM READING {ocrLoading ? '(Reading...)' : ''}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                <Text style={styles.inputIcon}>{'\uD83D\uDEE3'}</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder={ocrLoading ? 'Detecting KM...' : 'Enter KM reading'}
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                  value={kmReading}
                  onChangeText={setKmReading}
                />
                {ocrLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : null}
              </View>

              {/* HQ Name */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>HQ NAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                <Text style={styles.inputIcon}>{'\uD83C\uDFE2'}</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="Enter headquarter name"
                  placeholderTextColor={theme.textTertiary}
                  value={hqName}
                  onChangeText={setHqName}
                />
              </View>

              {/* Working Town */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>WORKING TOWN</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                <Text style={styles.inputIcon}>{'\uD83C\uDFD8'}</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="Enter working town"
                  placeholderTextColor={theme.textTertiary}
                  value={workingTown}
                  onChangeText={setWorkingTown}
                />
              </View>

              {/* Route */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>ROUTE</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                <Text style={styles.inputIcon}>{'\uD83D\uDEA3'}</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="Enter route"
                  placeholderTextColor={theme.textTertiary}
                  value={route}
                  onChangeText={setRoute}
                />
              </View>

              {/* Out of Town Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setOutOfTown(!outOfTown)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, { borderColor: theme.divider }, outOfTown && { backgroundColor: theme.info, borderColor: theme.info }]}>
                  {outOfTown ? <Text style={styles.checkboxTick}>{'\u2713'}</Text> : null}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.text }]}>Out of Town</Text>
              </TouchableOpacity>

              {/* Out of Town Expenses */}
              {outOfTown ? (
                <View style={[styles.outOfTownSection, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={[styles.sectionIndicator, { backgroundColor: theme.info }]} />
                    <Text style={[styles.outOfTownTitle, { color: theme.text }]}>Out of Town Expenses</Text>
                  </View>

                  {/* Stay Bill */}
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>STAY BILL AMOUNT</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.inputIcon}>{'\uD83C\uDFE8'}</Text>
                    <TextInput style={[styles.inputField, { color: theme.text }]} placeholder="Enter stay bill amount" placeholderTextColor={theme.textTertiary} keyboardType="numeric" value={stayBillAmount} onChangeText={setStayBillAmount} />
                  </View>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>STAY BILL IMAGE</Text>
                  {stayBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: stayBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setStayBillImage(null)}><Text style={styles.removeImageText}>{'\u2715'}</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.uploadArea, { backgroundColor: theme.background, borderColor: theme.divider }]} onPress={() => takeBillPhoto(setStayBillImage)} activeOpacity={0.7}>
                      <Text style={styles.uploadEmoji}>{'\uD83D\uDCF7'}</Text>
                      <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>Capture Photo</Text>
                    </TouchableOpacity>
                  )}

                  {/* Food Bill */}
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>FOOD BILL AMOUNT</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.inputIcon}>{'\uD83C\uDF7D'}</Text>
                    <TextInput style={[styles.inputField, { color: theme.text }]} placeholder="Enter food bill amount" placeholderTextColor={theme.textTertiary} keyboardType="numeric" value={foodBillAmount} onChangeText={setFoodBillAmount} />
                  </View>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>FOOD BILL IMAGE</Text>
                  {foodBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: foodBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setFoodBillImage(null)}><Text style={styles.removeImageText}>{'\u2715'}</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.uploadArea, { backgroundColor: theme.background, borderColor: theme.divider }]} onPress={() => takeBillPhoto(setFoodBillImage)} activeOpacity={0.7}>
                      <Text style={styles.uploadEmoji}>{'\uD83D\uDCF7'}</Text>
                      <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>Capture Photo</Text>
                    </TouchableOpacity>
                  )}

                  {/* Other Expense */}
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>OTHER EXPENSE DESCRIPTION</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.inputIcon}>{'\uD83D\uDCDD'}</Text>
                    <TextInput style={[styles.inputField, { color: theme.text }]} placeholder="Enter expense description" placeholderTextColor={theme.textTertiary} value={otherBillDescription} onChangeText={setOtherBillDescription} />
                  </View>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>OTHER EXPENSE AMOUNT</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.inputIcon}>{'\uD83D\uDCB5'}</Text>
                    <TextInput style={[styles.inputField, { color: theme.text }]} placeholder="Enter other expense amount" placeholderTextColor={theme.textTertiary} keyboardType="numeric" value={otherBillAmount} onChangeText={setOtherBillAmount} />
                  </View>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>OTHER EXPENSE IMAGE</Text>
                  {otherBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: otherBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setOtherBillImage(null)}><Text style={styles.removeImageText}>{'\u2715'}</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.uploadArea, { backgroundColor: theme.background, borderColor: theme.divider }]} onPress={() => takeBillPhoto(setOtherBillImage)} activeOpacity={0.7}>
                      <Text style={styles.uploadEmoji}>{'\uD83D\uDCF7'}</Text>
                      <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>Capture Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: modalType === 'checkout' ? theme.error : theme.success }, submitting && { opacity: 0.7 }]}
                onPress={submitModal}
                activeOpacity={0.8}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {modalType === 'checkin' ? 'CHECK IN' : 'CHECK OUT'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== VENDOR MODAL ===== */}
      <Modal
        visible={showVendorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={[styles.sectionIndicator, { backgroundColor: theme.info }]} />
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Visit Vendor</Text>
                </View>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.background }]} onPress={() => { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }}>
                  <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              {/* Vendor Name */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>VENDOR NAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                <Text style={styles.inputIcon}>{'\uD83C\uDFEA'}</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="Enter vendor name"
                  placeholderTextColor={theme.textTertiary}
                  value={vendorName}
                  onChangeText={setVendorName}
                />
              </View>

              {/* Vendor Mobile */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>VENDOR MOBILE</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                <Text style={styles.inputIcon}>{'\uD83D\uDCDE'}</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="Enter vendor mobile number"
                  placeholderTextColor={theme.textTertiary}
                  value={vendorMobile}
                  onChangeText={setVendorMobile}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Selfie with Vendor */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>SELFIE WITH VENDOR</Text>
              {vendorSelfie ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: vendorSelfie }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setVendorSelfie(null)}>
                    <Text style={styles.removeImageText}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.uploadArea, { backgroundColor: theme.background, borderColor: theme.divider }]} onPress={takeVendorSelfie} activeOpacity={0.7}>
                  <Text style={styles.uploadEmoji}>{'\uD83D\uDCF7'}</Text>
                  <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>Take Photo with Vendor</Text>
                </TouchableOpacity>
              )}

              {/* Note */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>NOTE</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.divider, alignItems: 'flex-start', minHeight: 80 }]}>
                <Text style={[styles.inputIcon, { marginTop: 4 }]}>{'\uD83D\uDCDD'}</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text, height: 70, textAlignVertical: 'top' }]}
                  placeholder="Enter note (optional)"
                  placeholderTextColor={theme.textTertiary}
                  value={vendorNote}
                  onChangeText={setVendorNote}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Onboard Status */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>IS THIS VENDOR ONBOARDED?</Text>
              <View style={styles.onboardRow}>
                <TouchableOpacity
                  style={[styles.onboardOption, { backgroundColor: theme.background, borderColor: theme.divider }, isOnboarded === 'yes' && { backgroundColor: theme.successBg, borderColor: theme.success }]}
                  onPress={() => setIsOnboarded('yes')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.onboardDot, { backgroundColor: theme.textTertiary }, isOnboarded === 'yes' && { backgroundColor: theme.success }]} />
                  <Text style={[styles.onboardText, { color: theme.textSecondary }, isOnboarded === 'yes' && { color: theme.text, fontWeight: '700' }]}>
                    Yes, Onboarded
                  </Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity
                  style={[styles.onboardOption, { backgroundColor: theme.background, borderColor: theme.divider }, isOnboarded === 'no' && { backgroundColor: theme.errorBg, borderColor: theme.error }]}
                  onPress={() => setIsOnboarded('no')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.onboardDot, { backgroundColor: theme.textTertiary }, isOnboarded === 'no' && { backgroundColor: theme.error }]} />
                  <Text style={[styles.onboardText, { color: theme.textSecondary }, isOnboarded === 'no' && { color: theme.text, fontWeight: '700' }]}>
                    Not Onboarded
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.info }, submitting && { opacity: 0.7 }]}
                onPress={submitVendor}
                activeOpacity={0.8}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>ADD VENDOR VISIT</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== GPS CAMERA MODAL ===== */}
      <Modal
        visible={showGPSCamera}
        animationType="slide"
        onRequestClose={() => setShowGPSCamera(false)}
      >
        <GPSCameraScreen
          onCapture={onGPSCameraCapture}
          onClose={() => { setShowGPSCamera(false); setGpsCameraTarget(null); }}
        />
      </Modal>
    </View>
  );
}

var screenWidth = Dimensions.get('window').width;

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ===== HEADER ===== */
  header: {
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    right: -40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 70,
    left: -50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    right: 60,
    opacity: 0.15,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  headerGreetingBlock: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerIconText: {
    fontSize: 18,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 2,
  },

  /* ===== BODY ===== */
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },

  /* ===== STATUS CHIP ===== */
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ===== ACTION BUTTONS ===== */
  actionBtnRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  actionBtnIcon: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 4,
  },
  actionBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  /* ===== STATS CARDS ===== */
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconEmoji: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  /* Working Hours */
  workingHoursCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  workingHoursLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workingHoursValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },

  /* ===== SECTION HEADER ===== */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  /* ===== QUICK ACTIONS GRID ===== */
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (screenWidth - 52) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  quickActionIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ===== MODALS ===== */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* ===== INPUTS (wrapped with emoji icon) ===== */
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },

  /* ===== UPLOAD AREA ===== */
  uploadArea: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ===== IMAGE PREVIEW ===== */
  imagePreviewWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ===== CHECKBOX ===== */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ===== OUT OF TOWN ===== */
  outOfTownSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  outOfTownTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  /* ===== ONBOARD OPTIONS ===== */
  onboardRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  onboardOption: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
  },
  onboardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onboardText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ===== SUBMIT BUTTON ===== */
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
