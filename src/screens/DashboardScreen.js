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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export default function DashboardScreen({ user, onLogout, vendors, onVendorsChange, onGoToProfile, onGoToAttendance, onGoToDailyAllowance, onGoToVisits }) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('checkin');
  const [kmImage, setKmImage] = useState(null);
  const [kmReading, setKmReading] = useState('');
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

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorSelfie, setVendorSelfie] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(null);

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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setKmImage(result.assets[0].uri);
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
        setKmImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const resetModalFields = () => {
    setKmImage(null);
    setKmReading('');
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

  const takeSelfie = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelfieImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open camera');
    }
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

  const takeVendorSelfie = async () => {
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
        setVendorSelfie(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const submitVendor = async () => {
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
      setVendorSelfie(null);
      setIsOnboarded(null);
      setShowVendorModal(false);
      Alert.alert('Success', 'Vendor visit recorded!');
    } catch (e) {
      console.log('Vendor submit error:', e);
      Alert.alert('Error', 'Failed to submit vendor visit: ' + e.message);
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.userName}>{user && user.fullName ? user.fullName : 'Employee'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, checkedIn ? styles.dotActive : styles.dotInactive]} />
          <Text style={styles.statusText}>
            {checkedIn ? 'You are Checked In' : 'You are Checked Out'}
          </Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.inlineBtn, checkedIn ? styles.checkOutBtn : styles.checkInBtn]}
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
            <Text style={styles.inlineBtnIcon}>{checkedIn ? '↗' : '↙'}</Text>
            <Text style={styles.inlineBtnText}>{checkedIn ? 'CHECK OUT' : 'CHECK IN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.inlineBtn, styles.vendorBtnStyle]}
            onPress={() => setShowVendorModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.inlineBtnIcon}>🏪</Text>
            <Text style={styles.inlineBtnText}>VENDOR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Check In</Text>
            <Text style={styles.infoValue}>{formatTime(checkInTime)}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Check Out</Text>
            <Text style={styles.infoValue}>{formatTime(checkOutTime)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoCard, styles.infoCardFull]}>
            <Text style={styles.infoLabel}>Working Hours</Text>
            <Text style={styles.infoValueLarge}>{getWorkingHours()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#e3f2fd' }]}>
              <Text style={styles.actionEmoji}>📊</Text>
            </View>
            <Text style={styles.actionText}>My Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={onGoToAttendance}>
            <View style={[styles.actionIcon, { backgroundColor: '#fce4ec' }]}>
              <Text style={styles.actionEmoji}>📅</Text>
            </View>
            <Text style={styles.actionText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={onGoToVisits}>
            <View style={[styles.actionIcon, { backgroundColor: '#e8f5e9' }]}>
              <Text style={styles.actionEmoji}>📍</Text>
            </View>
            <Text style={styles.actionText}>Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={onGoToProfile}>
            <View style={[styles.actionIcon, { backgroundColor: '#fff3e0' }]}>
              <Text style={styles.actionEmoji}>👤</Text>
            </View>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={onGoToDailyAllowance}>
            <View style={[styles.actionIcon, { backgroundColor: '#f3e5f5' }]}>
              <Text style={styles.actionEmoji}>💰</Text>
            </View>
            <Text style={styles.actionText}>Allowance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Check-In / Check-Out Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setShowModal(false); resetModalFields(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalType === 'checkin' ? 'Check In Details' : 'Check Out Details'}
                </Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetModalFields(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.modalLabel}>Selfie</Text>
                {selfieImage ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: selfieImage }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelfieImage(null)}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadRow}>
                    <TouchableOpacity style={styles.uploadBtn} onPress={takeSelfie}>
                      <Text style={styles.uploadIcon}>🤳</Text>
                      <Text style={styles.uploadText}>Take Selfie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadBtn} onPress={pickSelfie}>
                      <Text style={styles.uploadIcon}>🖼</Text>
                      <Text style={styles.uploadText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.modalLabel}>KM Image</Text>
              {kmImage ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: kmImage }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setKmImage(null)}>
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                    <Text style={styles.uploadIcon}>🖼</Text>
                    <Text style={styles.uploadText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.modalLabel}>KM Reading</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter KM reading"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={kmReading}
                onChangeText={setKmReading}
              />

              <Text style={styles.modalLabel}>HQ Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter headquarter name"
                placeholderTextColor="#999"
                value={hqName}
                onChangeText={setHqName}
              />

              <Text style={styles.modalLabel}>Working Town</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter working town"
                placeholderTextColor="#999"
                value={workingTown}
                onChangeText={setWorkingTown}
              />

              <Text style={styles.modalLabel}>Route</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter route"
                placeholderTextColor="#999"
                value={route}
                onChangeText={setRoute}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setOutOfTown(!outOfTown)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, outOfTown && styles.checkboxChecked]}>
                  {outOfTown ? <Text style={styles.checkboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>Out of Town</Text>
              </TouchableOpacity>

              {outOfTown ? (
                <View style={styles.outOfTownSection}>
                  <Text style={styles.outOfTownTitle}>Out of Town Expenses</Text>

                  <Text style={styles.modalLabel}>Stay Bill Amount</Text>
                  <TextInput style={styles.modalInput} placeholder="Enter stay bill amount" placeholderTextColor="#999" keyboardType="numeric" value={stayBillAmount} onChangeText={setStayBillAmount} />
                  <Text style={styles.modalLabel}>Stay Bill Image</Text>
                  {stayBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: stayBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setStayBillImage(null)}><Text style={styles.removeImageText}>✕</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => takeBillPhoto(setStayBillImage)}><Text style={styles.uploadIcon}>📷</Text><Text style={styles.uploadText}>Camera</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => pickBillImage(setStayBillImage)}><Text style={styles.uploadIcon}>🖼</Text><Text style={styles.uploadText}>Gallery</Text></TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.modalLabel}>Food Bill Amount</Text>
                  <TextInput style={styles.modalInput} placeholder="Enter food bill amount" placeholderTextColor="#999" keyboardType="numeric" value={foodBillAmount} onChangeText={setFoodBillAmount} />
                  <Text style={styles.modalLabel}>Food Bill Image</Text>
                  {foodBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: foodBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setFoodBillImage(null)}><Text style={styles.removeImageText}>✕</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => takeBillPhoto(setFoodBillImage)}><Text style={styles.uploadIcon}>📷</Text><Text style={styles.uploadText}>Camera</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => pickBillImage(setFoodBillImage)}><Text style={styles.uploadIcon}>🖼</Text><Text style={styles.uploadText}>Gallery</Text></TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.modalLabel}>Other Expense Description</Text>
                  <TextInput style={styles.modalInput} placeholder="Enter expense description" placeholderTextColor="#999" value={otherBillDescription} onChangeText={setOtherBillDescription} />
                  <Text style={styles.modalLabel}>Other Expense Amount</Text>
                  <TextInput style={styles.modalInput} placeholder="Enter other expense amount" placeholderTextColor="#999" keyboardType="numeric" value={otherBillAmount} onChangeText={setOtherBillAmount} />
                  <Text style={styles.modalLabel}>Other Expense Image</Text>
                  {otherBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: otherBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setOtherBillImage(null)}><Text style={styles.removeImageText}>✕</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => takeBillPhoto(setOtherBillImage)}><Text style={styles.uploadIcon}>📷</Text><Text style={styles.uploadText}>Camera</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => pickBillImage(setOtherBillImage)}><Text style={styles.uploadIcon}>🖼</Text><Text style={styles.uploadText}>Gallery</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.modalSubmitBtn, modalType === 'checkout' && styles.modalSubmitBtnCheckout]}
                onPress={submitModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitText}>
                  {modalType === 'checkin' ? 'CHECK IN' : 'CHECK OUT'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Visit Vendor Modal */}
      <Modal
        visible={showVendorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Visit Vendor</Text>
                <TouchableOpacity onPress={() => { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Vendor Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter vendor name"
                placeholderTextColor="#999"
                value={vendorName}
                onChangeText={setVendorName}
              />

              <Text style={styles.modalLabel}>Vendor Mobile</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter vendor mobile number"
                placeholderTextColor="#999"
                value={vendorMobile}
                onChangeText={setVendorMobile}
                keyboardType="phone-pad"
              />

              <Text style={styles.modalLabel}>Selfie with Vendor</Text>
              {vendorSelfie ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: vendorSelfie }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setVendorSelfie(null)}>
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={takeVendorSelfie}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickVendorSelfie}>
                    <Text style={styles.uploadIcon}>🖼</Text>
                    <Text style={styles.uploadText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.modalLabel}>Is this vendor onboarded?</Text>
              <View style={styles.onboardRow}>
                <TouchableOpacity
                  style={[styles.onboardOption, isOnboarded === 'yes' && styles.onboardOptionYes]}
                  onPress={() => setIsOnboarded('yes')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.onboardText, isOnboarded === 'yes' && styles.onboardTextSelected]}>
                    Yes, Onboarded
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.onboardOption, isOnboarded === 'no' && styles.onboardOptionNo]}
                  onPress={() => setIsOnboarded('no')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.onboardText, isOnboarded === 'no' && styles.onboardTextSelected]}>
                    Not Onboarded
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.vendorSubmitBtn}
                onPress={submitVendor}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitText}>ADD VENDOR VISIT</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

var screenWidth = Dimensions.get('window').width;

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
    top: -50,
    right: -40,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    top: 60,
    left: -50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#ff8a80',
    fontSize: 13,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  timeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 2,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  dotActive: {
    backgroundColor: '#4caf50',
  },
  dotInactive: {
    backgroundColor: '#bdbdbd',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  btnRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  inlineBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  checkInBtn: {
    backgroundColor: '#4caf50',
    shadowColor: '#4caf50',
    marginRight: 8,
  },
  checkOutBtn: {
    backgroundColor: '#e53935',
    shadowColor: '#e53935',
    marginRight: 8,
  },
  vendorBtnStyle: {
    backgroundColor: '#1565c0',
    shadowColor: '#1565c0',
    marginLeft: 8,
  },
  inlineBtnIcon: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 4,
  },
  inlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoCardFull: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  infoValueLarge: {
    fontSize: 26,
    fontWeight: '900',
    color: '#e53935',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 10,
    marginBottom: 15,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (screenWidth - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  modalClose: {
    fontSize: 20,
    color: '#999',
    fontWeight: '700',
    padding: 5,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
  imagePreviewWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    elevation: 6,
  },
  modalSubmitBtnCheckout: {
    backgroundColor: '#e53935',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#1565c0',
    borderColor: '#1565c0',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  outOfTownSection: {
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  outOfTownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  vendorSubmitBtn: {
    backgroundColor: '#1565c0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    elevation: 6,
  },
  onboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  onboardOption: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: '#eee',
  },
  onboardOptionYes: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  onboardOptionNo: {
    backgroundColor: '#fce4ec',
    borderColor: '#e53935',
  },
  onboardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#777',
  },
  onboardTextSelected: {
    color: '#333',
    fontWeight: '700',
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
