import React, { useState } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const getImageFile = (uri, prefix) => {
  return { uri: uri, name: prefix + '_' + Date.now() + '.jpg', type: 'image/jpeg' };
};

export default function VendorVisitModal({ visible, onClose, user, onSubmitSuccess }) {
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorSelfie, setVendorSelfie] = useState(null);
  const [addressGps, setAddressGps] = useState('');
  const [gpsLink, setGpsLink] = useState('');
  const [isOnboarded, setIsOnboarded] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetFields = () => {
    setVendorName('');
    setVendorMobile('');
    setVendorSelfie(null);
    setAddressGps('');
    setGpsLink('');
    setIsOnboarded(null);
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const pickSelfie = async () => {
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

  const takeSelfie = async () => {
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

  const fetchLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        setFetchingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setAddressGps(lat + ', ' + lng);
      setGpsLink('https://maps.google.com/?q=' + lat + ',' + lng);

      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          const parts = [addr.name, addr.street, addr.city, addr.region, addr.postalCode].filter(Boolean);
          if (parts.length > 0) {
            setAddressGps(parts.join(', '));
          }
        }
      } catch (e) {
        // Keep lat/lng as fallback
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get location: ' + error.message);
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSubmit = async () => {
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
      const formData = new FormData();

      formData.append('selfie_image', getImageFile(vendorSelfie, 'vendor_selfie'));

      formData.append('vendor_name', vendorName.trim());
      formData.append('vendor_mobile', vendorMobile.trim());
      formData.append('address_gps', addressGps);
      formData.append('gps_link', gpsLink);
      formData.append('is_onboarded', isOnboarded === 'yes' ? 'true' : 'false');
      formData.append('user_id', user && user.id ? String(user.id) : '');
      formData.append('visit_date', new Date().toISOString());

      console.log('=== VENDOR VISIT SUBMIT ===');
      console.log('vendor_name:', vendorName.trim());
      console.log('vendor_mobile:', vendorMobile.trim());
      console.log('address_gps:', addressGps);
      console.log('gps_link:', gpsLink);
      console.log('is_onboarded:', isOnboarded);
      console.log('user_id:', user && user.id ? user.id : 'NO ID');

      const response = await fetch(`${BASE_URL}/api/vendor/visit`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (user && user.token ? user.token : ''),
        },
        body: formData,
      });

      console.log('Vendor Status:', response.status);
      const responseText = await response.text();
      console.log('Vendor Response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { message: responseText };
      }

      if (response.ok) {
        const vendorData = {
          name: vendorName.trim(),
          mobile: vendorMobile.trim(),
          selfie: vendorSelfie,
          onboarded: isOnboarded,
          address_gps: addressGps,
          gps_link: gpsLink,
          time: new Date(),
        };
        resetFields();
        onSubmitSuccess(vendorData, data.message || 'Vendor visit recorded!');
      } else {
        Alert.alert('Error', data.message || 'Failed. Status: ' + response.status);
      }
    } catch (error) {
      console.log('Vendor Error:', error.message);
      Alert.alert('Error', 'Unable to connect to server: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Visit Vendor</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Vendor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vendor name"
              placeholderTextColor="#999"
              value={vendorName}
              onChangeText={setVendorName}
            />

            <Text style={styles.label}>Vendor Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vendor mobile number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={10}
              value={vendorMobile}
              onChangeText={setVendorMobile}
            />

            <Text style={styles.label}>Selfie with Vendor</Text>
            {vendorSelfie ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: vendorSelfie }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setVendorSelfie(null)}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadRow}>
                <TouchableOpacity style={styles.uploadBtn} onPress={takeSelfie}>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickSelfie}>
                  <Text style={styles.uploadIcon}>🖼</Text>
                  <Text style={styles.uploadText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>GPS Location</Text>
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={fetchLocation}
              disabled={fetchingLocation}
              activeOpacity={0.7}
            >
              {fetchingLocation ? (
                <ActivityIndicator color="#1a1a2e" size="small" />
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📍</Text>
                  <Text style={styles.uploadText}>{addressGps ? 'Update Location' : 'Get Current Location'}</Text>
                </>
              )}
            </TouchableOpacity>
            {addressGps ? (
              <View style={styles.gpsInfo}>
                <Text style={styles.gpsAddress}>{addressGps}</Text>
                <Text style={styles.gpsLinkText}>{gpsLink}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Is this vendor onboarded?</Text>
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
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>ADD VENDOR VISIT</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

var styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  modalClose: {
    fontSize: 22,
    color: '#999',
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  imagePreviewWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
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
  uploadRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  gpsBtn: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  gpsInfo: {
    backgroundColor: '#f0f8f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  gpsAddress: {
    fontSize: 12,
    color: '#333',
  },
  gpsLinkText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  onboardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  onboardOption: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  onboardOptionYes: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  onboardOptionNo: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  onboardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },
  onboardTextSelected: {
    color: '#333',
  },
  submitBtn: {
    backgroundColor: '#4caf50',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
