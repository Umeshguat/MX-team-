import React, { useState, useEffect } from 'react';
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

export default function DashboardScreen({ user, onLogout }) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('checkin');
  const [kmImage, setKmImage] = useState(null);
  const [kmReading, setKmReading] = useState('');
  const [hqName, setHqName] = useState('');
  const [workingTown, setWorkingTown] = useState('');
  const [route, setRoute] = useState('');

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorSelfie, setVendorSelfie] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(null);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
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
  };

  const submitModal = () => {
    if (!kmImage) {
      Alert.alert('Error', 'Please upload KM image');
      return;
    }
    if (!kmReading.trim() || !hqName.trim() || !workingTown.trim() || !route.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (modalType === 'checkin') {
      setCheckedIn(true);
      setCheckInTime(new Date());
      setCheckOutTime(null);
    } else {
      setCheckedIn(false);
      setCheckOutTime(new Date());
    }
    setShowModal(false);
    resetModalFields();
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

  const submitVendor = () => {
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
    setVendors([...vendors, {
      name: vendorName.trim(),
      selfie: vendorSelfie,
      onboarded: isOnboarded,
      time: new Date(),
    }]);
    setVendorName('');
    setVendorSelfie(null);
    setIsOnboarded(null);
    setShowVendorModal(false);
    Alert.alert('Success', 'Vendor visit recorded!');
  };

  const getWorkingHours = () => {
    if (!checkInTime) return '0h 0m';
    const end = checkOutTime || new Date();
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

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#fce4ec' }]}>
              <Text style={styles.actionEmoji}>📅</Text>
            </View>
            <Text style={styles.actionText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#e8f5e9' }]}>
              <Text style={styles.actionEmoji}>📍</Text>
            </View>
            <Text style={styles.actionText}>Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#fff3e0' }]}>
              <Text style={styles.actionEmoji}>👤</Text>
            </View>
            <Text style={styles.actionText}>Profile</Text>
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
        onRequestClose={() => { setShowVendorModal(false); setVendorName(''); setVendorSelfie(null); setIsOnboarded(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Visit Vendor</Text>
                <TouchableOpacity onPress={() => { setShowVendorModal(false); setVendorName(''); setVendorSelfie(null); setIsOnboarded(null); }}>
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
