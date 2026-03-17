import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { captureRef } from 'react-native-view-shot';

export default function GPSCameraScreen({ onCapture, onClose }) {
  var [locationData, setLocationData] = useState(null);
  var [address, setAddress] = useState('');
  var [loadingLocation, setLoadingLocation] = useState(true);
  var [capturedPhoto, setCapturedPhoto] = useState(null);
  var [saving, setSaving] = useState(false);

  var previewRef = useRef(null);

  useEffect(function () {
    fetchLocationAndOpenCamera();
  }, []);

  var fetchLocationAndOpenCamera = function () {
    setLoadingLocation(true);

    // Get location first, then open camera
    Location.requestForegroundPermissionsAsync()
      .then(function (result) {
        if (result.status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for GPS Camera');
          setLoadingLocation(false);
          return null;
        }
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      })
      .then(function (location) {
        if (!location) return;
        var coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setLocationData(coords);

        return Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
          .then(function (addresses) {
            if (addresses && addresses.length > 0) {
              var addr = addresses[0];
              var line1Parts = [addr.name, addr.street].filter(Boolean);
              var line2Parts = [addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean);
              var fullAddress = '';
              if (line1Parts.length > 0) fullAddress = line1Parts.join(', ');
              if (line2Parts.length > 0) {
                if (fullAddress) fullAddress += '\n';
                fullAddress += line2Parts.join(', ');
              }
              setAddress(fullAddress || coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6));
            }
          })
          .catch(function () {
            setAddress(coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6));
          });
      })
      .catch(function (err) {
        console.log('Location error:', err);
      })
      .finally(function () {
        setLoadingLocation(false);
        // Now open camera
        openCamera();
      });
  };

  var openCamera = function () {
    ImagePicker.requestCameraPermissionsAsync()
      .then(function (permResult) {
        if (!permResult.granted) {
          Alert.alert('Permission Denied', 'Camera permission is required');
          onClose();
          return;
        }
        return ImagePicker.launchCameraAsync({
          quality: 0.85,
          allowsEditing: false,
        });
      })
      .then(function (result) {
        if (!result) return;
        if (result.canceled || !result.assets || result.assets.length === 0) {
          // User cancelled camera
          onClose();
          return;
        }
        setCapturedPhoto(result.assets[0].uri);
      })
      .catch(function (err) {
        console.log('Camera error:', err);
        Alert.alert('Error', 'Could not open camera');
        onClose();
      });
  };

  var getCurrentDateTime = function () {
    var now = new Date();
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var dayName = days[now.getDay()];

    var dd = now.getDate().toString().padStart(2, '0');
    var mm = (now.getMonth() + 1).toString().padStart(2, '0');
    var yyyy = now.getFullYear();

    var hh = now.getHours();
    var min = now.getMinutes().toString().padStart(2, '0');
    var sec = now.getSeconds().toString().padStart(2, '0');
    var ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    var hhStr = hh.toString().padStart(2, '0');

    var tzOffset = -now.getTimezoneOffset();
    var tzSign = tzOffset >= 0 ? '+' : '-';
    var tzHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, '0');
    var tzMins = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');

    return {
      dayName: dayName,
      date: dd + '/' + mm + '/' + yyyy,
      time: hhStr + ':' + min + ':' + sec + ' ' + ampm,
      timezone: 'GMT ' + tzSign + tzHours + ':' + tzMins,
    };
  };

  var getStaticMapUrl = function () {
    if (!locationData) return null;
    var lat = locationData.latitude;
    var lng = locationData.longitude;
    return 'https://staticmap.openstreetmap.de/staticmap.php?center=' +
      lat + ',' + lng +
      '&zoom=15&size=150x100&markers=' +
      lat + ',' + lng + ',red-pushpin';
  };

  var confirmPhoto = function () {
    if (!previewRef.current) {
      Alert.alert('Error', 'Preview not ready, please try again');
      return;
    }
    setSaving(true);

    captureRef(previewRef, {
      format: 'jpg',
      quality: 0.85,
      result: 'tmpfile',
    })
      .then(function (uri) {
        setSaving(false);
        onCapture(uri);
      })
      .catch(function (err) {
        console.log('Capture error:', err);
        setSaving(false);
        // If view-shot fails, return original photo
        Alert.alert('Note', 'GPS overlay could not be saved. Using original photo.');
        onCapture(capturedPhoto);
      });
  };

  var retakePhoto = function () {
    setCapturedPhoto(null);
    openCamera();
  };

  // Loading state - getting location & opening camera
  if (!capturedPhoto) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            {loadingLocation ? 'Getting GPS location...' : 'Opening camera...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.topCloseBtn} onPress={onClose}>
          <Text style={styles.topCloseBtnText}>X</Text>
        </TouchableOpacity>
      </View>
    );
  }

  var dateTime = getCurrentDateTime();
  var staticMapUrl = getStaticMapUrl();

  // ===== PREVIEW MODE - Photo taken, show with GPS overlay =====
  return (
    <View style={styles.container}>
      {/* Capturable area: photo + GPS overlay */}
      <View
        ref={previewRef}
        collapsable={false}
        style={styles.previewContainer}
      >
        <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />

        {/* GPS Overlay at bottom */}
        <View style={styles.overlayBottom}>
          <View style={styles.overlayContent}>
            {/* Map thumbnail */}
            {staticMapUrl ? (
              <View style={styles.mapThumbnailWrapper}>
                <Image
                  source={{ uri: staticMapUrl }}
                  style={styles.mapThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.mapPinOverlay}>
                  <Text style={styles.mapPinIcon}>📍</Text>
                </View>
              </View>
            ) : null}

            {/* Location info */}
            <View style={styles.locationInfo}>
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsBadgeText}>GPS Map Camera</Text>
              </View>

              {address ? (
                <Text style={styles.addressText} numberOfLines={3}>{address}</Text>
              ) : null}

              {locationData ? (
                <Text style={styles.coordsText}>
                  Lat {locationData.latitude.toFixed(6)} Long {locationData.longitude.toFixed(6)}
                </Text>
              ) : null}

              <Text style={styles.dateTimeText}>
                {dateTime.dayName}, {dateTime.date} {dateTime.time} {dateTime.timezone}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Top close button */}
      <TouchableOpacity style={styles.topCloseBtn} onPress={onClose}>
        <Text style={styles.topCloseBtnText}>X</Text>
      </TouchableOpacity>

      {/* Bottom action buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.retakeBtn} onPress={retakePhoto}>
          <Text style={styles.actionBtnText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, saving && { opacity: 0.6 }]}
          onPress={confirmPhoto}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionBtnText}>Use Photo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Loading
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
    marginTop: 14,
    fontWeight: '600',
  },

  // Top close button
  topCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  topCloseBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  // GPS Overlay
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  overlayContent: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  mapThumbnailWrapper: {
    width: 85,
    height: 65,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#444',
  },
  mapThumbnail: {
    width: 85,
    height: 65,
  },
  mapPinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPinIcon: {
    fontSize: 16,
  },
  locationInfo: {
    flex: 1,
  },
  gpsBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  gpsBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginBottom: 2,
  },
  coordsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateTimeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '500',
  },

  // Bottom actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    paddingTop: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  retakeBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  confirmBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#4caf50',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
