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

var COUNTRY_FLAGS = {
  IN: '\u{1F1EE}\u{1F1F3}',
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  AE: '\u{1F1E6}\u{1F1EA}',
  SA: '\u{1F1F8}\u{1F1E6}',
  NP: '\u{1F1F3}\u{1F1F5}',
  BD: '\u{1F1E7}\u{1F1E9}',
  PK: '\u{1F1F5}\u{1F1F0}',
  LK: '\u{1F1F1}\u{1F1F0}',
};

export default function GPSCameraScreen({ onCapture, onClose }) {
  var [locationData, setLocationData] = useState(null);
  var [addressInfo, setAddressInfo] = useState(null);
  var [loadingLocation, setLoadingLocation] = useState(true);
  var [capturedPhoto, setCapturedPhoto] = useState(null);
  var [saving, setSaving] = useState(false);
  var [imageLoaded, setImageLoaded] = useState(false);
  var [mapLoaded, setMapLoaded] = useState(false);

  var previewRef = useRef(null);

  useEffect(function () {
    fetchLocationThenOpenCamera();
  }, []);

  var fetchLocationThenOpenCamera = function () {
    setLoadingLocation(true);

    var locationTimeout = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('Location timeout')); }, 10000);
    });

    Location.requestForegroundPermissionsAsync()
      .then(function (result) {
        if (result.status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for GPS Camera');
          setLoadingLocation(false);
          return null;
        }
        return Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          locationTimeout,
        ]);
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

              // Build city line: "City, Region, Country"
              var cityParts = [addr.city, addr.region, addr.country].filter(Boolean);
              var cityLine = cityParts.length > 0 ? cityParts.join(', ') : '';

              // Build full street address: "name, street, district, subregion, city, region postalCode, country"
              var streetParts = [addr.name, addr.street].filter(Boolean);
              var areaParts = [addr.district, addr.subregion].filter(Boolean);
              var regionPart = addr.region || '';
              if (addr.postalCode) regionPart = regionPart ? regionPart + ' ' + addr.postalCode : addr.postalCode;
              var fullParts = streetParts.concat(areaParts);
              if (addr.city) fullParts.push(addr.city);
              if (regionPart) fullParts.push(regionPart);
              if (addr.country) fullParts.push(addr.country);
              var fullAddress = fullParts.join(', ');

              // Get country flag
              var flag = '';
              if (addr.isoCountryCode && COUNTRY_FLAGS[addr.isoCountryCode]) {
                flag = ' ' + COUNTRY_FLAGS[addr.isoCountryCode];
              }

              setAddressInfo({
                cityLine: cityLine,
                fullAddress: fullAddress,
                flag: flag,
              });
            } else {
              setAddressInfo({
                cityLine: '',
                fullAddress: coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6),
                flag: '',
              });
            }
          })
          .catch(function () {
            setAddressInfo({
              cityLine: '',
              fullAddress: coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6),
              flag: '',
            });
          });
      })
      .catch(function (err) {
        console.log('Location error:', err);
      })
      .finally(function () {
        setLoadingLocation(false);
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
          onClose();
          return;
        }
        setImageLoaded(false);
        setMapLoaded(false);
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
      time: hhStr + ':' + min + ' ' + ampm,
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

  var doCapture = function () {
    if (!previewRef.current) {
      Alert.alert('Error', 'Preview not ready, please try again');
      setSaving(false);
      return;
    }

    setTimeout(function () {
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
          console.log('Capture error (attempt 1):', err);
          setTimeout(function () {
            captureRef(previewRef, {
              format: 'jpg',
              quality: 0.8,
              result: 'tmpfile',
            })
              .then(function (uri) {
                setSaving(false);
                onCapture(uri);
              })
              .catch(function (err2) {
                console.log('Capture error (attempt 2):', err2);
                setSaving(false);
                Alert.alert('Note', 'GPS overlay could not be saved. Using original photo.');
                onCapture(capturedPhoto);
              });
          }, 500);
        });
    }, 300);
  };

  var confirmPhoto = function () {
    setSaving(true);
    doCapture();
  };

  var retakePhoto = function () {
    setCapturedPhoto(null);
    setImageLoaded(false);
    setMapLoaded(false);
    openCamera();
  };

  // Loading state
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

  // ===== PREVIEW MODE =====
  return (
    <View style={styles.container}>
      {/* Capturable area */}
      <View
        ref={previewRef}
        collapsable={false}
        style={styles.previewContainer}
      >
        <Image
          source={{ uri: capturedPhoto }}
          style={styles.previewImage}
          onLoad={function () { setImageLoaded(true); }}
        />

        {/* GPS Overlay - same style as reference image */}
        <View style={styles.overlayBottom}>
          <View style={styles.overlayContent}>
            {/* Map thumbnail on left */}
            {staticMapUrl ? (
              <View style={styles.mapThumbnailWrapper}>
                <Image
                  source={{ uri: staticMapUrl }}
                  style={styles.mapThumbnail}
                  resizeMode="cover"
                  onLoad={function () { setMapLoaded(true); }}
                  onError={function () { setMapLoaded(true); }}
                />
                <View style={styles.mapPinOverlay}>
                  <Text style={styles.mapPinIcon}>📍</Text>
                </View>
              </View>
            ) : null}

            {/* Location info on right */}
            <View style={styles.locationInfo}>
              {/* GPS Map Camera badge */}
              <View style={styles.gpsBadgeRow}>
                <View style={styles.gpsBadge}>
                  <Text style={styles.gpsBadgeText}>GPS Map Camera</Text>
                </View>
              </View>

              {/* City, State, Country + Flag (title line) */}
              {addressInfo && addressInfo.cityLine ? (
                <Text style={styles.cityLineText}>
                  {addressInfo.cityLine}{addressInfo.flag}
                </Text>
              ) : null}

              {/* Full detailed address */}
              {addressInfo && addressInfo.fullAddress ? (
                <Text style={styles.addressText} numberOfLines={3}>
                  {addressInfo.fullAddress}
                </Text>
              ) : null}

              {/* Coordinates */}
              {locationData ? (
                <Text style={styles.coordsText}>
                  Lat {locationData.latitude.toFixed(6)}° Long {locationData.longitude.toFixed(6)}°
                </Text>
              ) : null}

              {/* Date & Time */}
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
          style={[styles.confirmBtn, (saving || !imageLoaded) && { opacity: 0.6 }]}
          onPress={confirmPhoto}
          disabled={saving || !imageLoaded}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : !imageLoaded ? (
            <Text style={styles.actionBtnText}>Loading...</Text>
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
    padding: 8,
  },
  overlayContent: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },

  // Map thumbnail
  mapThumbnailWrapper: {
    width: 90,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mapThumbnail: {
    width: 90,
    height: 70,
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
    fontSize: 18,
  },

  // Location info
  locationInfo: {
    flex: 1,
  },
  gpsBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  gpsBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gpsBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cityLineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  addressText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
    marginBottom: 3,
  },
  coordsText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateTimeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
  },

  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    paddingTop: 15,
    backgroundColor: '#000',
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
