import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import GPSCameraScreen from '../components/GPSCameraScreen';
import { extractKmFromImage } from '../utils/ocrHelper';
import { useTheme } from '../theme/ThemeContext';

var SAMPLE_EMPLOYEES = [
  { id: '1', name: 'Rahul Sharma', designation: 'Sales Executive', hq: 'Delhi', phone: '9876543210', status: 'present', checkIn: '09:15 AM', vendors: 4, allowance: 850 },
  { id: '2', name: 'Priya Patel', designation: 'Senior Sales Executive', hq: 'Mumbai', phone: '9876543211', status: 'present', checkIn: '09:02 AM', vendors: 6, allowance: 1200 },
  { id: '3', name: 'Amit Kumar', designation: 'Sales Executive', hq: 'Pune', phone: '9876543212', status: 'absent', checkIn: null, vendors: 0, allowance: 0 },
  { id: '4', name: 'Sneha Reddy', designation: 'Territory Manager', hq: 'Hyderabad', phone: '9876543213', status: 'present', checkIn: '08:55 AM', vendors: 5, allowance: 1450 },
  { id: '5', name: 'Vikram Singh', designation: 'Business Development Executive', hq: 'Jaipur', phone: '9876543214', status: 'half-day', checkIn: '09:30 AM', vendors: 2, allowance: 400 },
  { id: '6', name: 'Anjali Gupta', designation: 'Sales Executive', hq: 'Lucknow', phone: '9876543215', status: 'present', checkIn: '09:10 AM', vendors: 3, allowance: 720 },
  { id: '7', name: 'Ravi Verma', designation: 'Key Account Manager', hq: 'Chennai', phone: '9876543216', status: 'leave', checkIn: null, vendors: 0, allowance: 0 },
  { id: '8', name: 'Neha Joshi', designation: 'Sales Coordinator', hq: 'Bangalore', phone: '9876543217', status: 'present', checkIn: '09:20 AM', vendors: 7, allowance: 980 },
  { id: '9', name: 'Manoj Tiwari', designation: 'Sales Executive', hq: 'Indore', phone: '9876543218', status: 'present', checkIn: '08:45 AM', vendors: 5, allowance: 1100 },
  { id: '10', name: 'Pooja Nair', designation: 'Team Leader', hq: 'Kochi', phone: '9876543219', status: 'present', checkIn: '09:05 AM', vendors: 8, allowance: 1650 },
];

function generateAttendanceData() {
  var data = [];
  var today = new Date();
  for (var i = 0; i < 7; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var present = Math.floor(Math.random() * 4 + 6);
    data.push({
      date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      present: present,
      absent: 10 - present,
    });
  }
  return data.reverse();
}

function getStatusLabel(status) {
  switch (status) {
    case 'present': return 'Present';
    case 'absent': return 'Absent';
    case 'half-day': return 'Half Day';
    case 'leave': return 'On Leave';
    default: return '--';
  }
}

var getImageFile = function(uri, prefix) {
  return { uri: uri, name: prefix + '_' + Date.now() + '.jpg', type: 'image/jpeg' };
};

export default function AdminDashboardScreen({ user, onLogout, onGoToProfile, onGoToAttendance, onGoToDailyAllowance, onGoToVisits, onGoToVendorMap, onGoToEmployeeList, onGoToAttendanceList, onGoToInventory, vendors, onVendorsChange }) {
  var { theme, isDark, toggleTheme } = useTheme();

  function getStatusColor(status) {
    switch (status) {
      case 'present': return theme.success;
      case 'absent': return theme.primary;
      case 'half-day': return theme.warning;
      case 'leave': return theme.info;
      default: return theme.textTertiary;
    }
  }

  function getStatusBg(status) {
    switch (status) {
      case 'present': return theme.successBg;
      case 'absent': return theme.errorBg;
      case 'half-day': return theme.warningBg;
      case 'leave': return theme.infoBg;
      default: return theme.background;
    }
  }

  var [activeTab, setActiveTab] = useState('overview');
  var [selectedEmployee, setSelectedEmployee] = useState(null);
  var [showEmployeeModal, setShowEmployeeModal] = useState(false);
  var [employeeDetailLoading, setEmployeeDetailLoading] = useState(false);
  var [attendanceWeek] = useState(generateAttendanceData);

  // Manager check-in/check-out state
  var [checkedIn, setCheckedIn] = useState(false);
  var [checkInTime, setCheckInTime] = useState(null);
  var [checkOutTime, setCheckOutTime] = useState(null);
  var [currentTime, setCurrentTime] = useState(new Date());
  var [showCheckModal, setShowCheckModal] = useState(false);
  var [checkModalType, setCheckModalType] = useState('checkin');
  var [kmImage, setKmImage] = useState(null);
  var [kmReading, setKmReading] = useState('');
  var [ocrLoading, setOcrLoading] = useState(false);
  var [hqName, setHqName] = useState('');
  var [workingTown, setWorkingTown] = useState('');
  var [route, setRoute] = useState('');
  var [selfieImage, setSelfieImage] = useState(null);

  // Out of town state
  var [outOfTown, setOutOfTown] = useState(false);
  var [stayBillImage, setStayBillImage] = useState(null);
  var [stayBillAmount, setStayBillAmount] = useState('');
  var [foodBillImage, setFoodBillImage] = useState(null);
  var [foodBillAmount, setFoodBillAmount] = useState('');
  var [otherBillImage, setOtherBillImage] = useState(null);
  var [otherBillAmount, setOtherBillAmount] = useState('');
  var [otherBillDescription, setOtherBillDescription] = useState('');

  // GPS Camera state
  var [showGPSCamera, setShowGPSCamera] = useState(false);
  var [gpsCameraTarget, setGpsCameraTarget] = useState(null);

  // Vendor visit state
  var [showVendorModal, setShowVendorModal] = useState(false);
  var [vendorName, setVendorName] = useState('');
  var [vendorMobile, setVendorMobile] = useState('');
  var [vendorNote, setVendorNote] = useState('');
  var [vendorSelfie, setVendorSelfie] = useState(null);
  var [isOnboarded, setIsOnboarded] = useState(null);
  var [submitting, setSubmitting] = useState(false);

  var [showEmpVendorMap, setShowEmpVendorMap] = useState(false);
  var [empVendorVisits, setEmpVendorVisits] = useState([]);
  var [empVendorMapLoading, setEmpVendorMapLoading] = useState(false);
  var [empVendorMapName, setEmpVendorMapName] = useState('');

  var [dashboardData, setDashboardData] = useState(null);
  var [dashboardLoading, setDashboardLoading] = useState(true);

  var fetchDashboard = function() {
    var token = user && user.token ? user.token : '';
    return fetch(`${BASE_URL}/api/users/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    })
      .then(function(response) { return response.text(); })
      .then(function(text) {
        console.log('Admin Dashboard API:', text);
        var result = JSON.parse(text);
        if (result.status === 200 && result.data) {
          setDashboardData(result.data);
          setCheckedIn(result.data.check_in === true);
          if (result.data.my_attendance) {
            var att = result.data.my_attendance;
            if (att.check_in_time) {
              setCheckInTime(att.check_in_time);
            }
            if (att.check_out_time) {
              setCheckOutTime(att.check_out_time);
            }
          }
        } else {
          setDashboardData(result);
        }
      })
      .catch(function(err) {
        console.log('Admin Dashboard error:', err);
      });
  };

  useEffect(function() {
    var timer = setInterval(function() { setCurrentTime(new Date()); }, 1000);
    return function() { clearInterval(timer); };
  }, []);

  useEffect(function() {
    setDashboardLoading(true);
    fetchDashboard().finally(function() { setDashboardLoading(false); });
  }, []);

  var dd = dashboardData || {};
  var employees = dd.employees_check_in || dd.employees || dd.users || dd.team || [];
  var presentToday = dd.present_today || dd.presentToday || employees.length;
  var absentToday = dd.absent_leave || dd.absent_today || dd.absentToday || 0;
  var onLeaveToday = dd.on_leave_today || dd.onLeaveToday || 0;
  var halfDayToday = dd.half_day_today || dd.halfDayToday || 0;
  var totalEmployees = dd.total_employees || dd.totalEmployees || 0;
  var totalVendors = dd.vendor_visits || dd.total_vendor_visits || dd.totalVendorVisits || 0;
  var totalAllowance = dd.total_daily_allowance || dd.total_allowance || dd.totalAllowance || 0;

  var fullName = user && user.fullName ? user.fullName : 'Manager';

  var today = new Date();
  var dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  var formatTime = function(date) {
    if (!date) return '--:--';
    if (typeof date === 'string') return date;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  var getWorkingHours = function() {
    if (!checkInTime) return '0h 0m';
    if (dashboardData && dashboardData.my_attendance && dashboardData.my_attendance.hours) {
      return dashboardData.my_attendance.hours;
    }
    if (typeof checkInTime === 'string') return '0h 0m';
    var end = checkOutTime instanceof Date ? checkOutTime : new Date();
    var diff = Math.floor((end - checkInTime) / 1000);
    var hours = Math.floor(diff / 3600);
    var minutes = Math.floor((diff % 3600) / 60);
    return hours + 'h ' + minutes + 'm';
  };

  var openEmployee = function(emp) {
    setSelectedEmployee(emp);
    setShowEmployeeModal(true);
    setEmployeeDetailLoading(true);
    var token = user && user.token ? user.token : '';
    var userId = (emp.user_id && typeof emp.user_id === 'object' ? emp.user_id._id : emp.user_id) || emp._id || emp.id || '';
    console.log('Employee details fetch - userId:', userId, 'emp:', JSON.stringify(emp));
    fetch(`${BASE_URL}/api/users/details?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.status === 200 && data.data) {
          var empFullName = emp.full_name || emp.name || (emp.user_id && typeof emp.user_id === 'object' ? emp.user_id.full_name : '') || '';
          setSelectedEmployee(Object.assign({}, emp, {
            full_name: empFullName || data.data.full_name || 'Employee',
            email: data.data.email || '',
            headquarter_name: data.data.headquarter_name || emp.headquarter_name || emp.hq,
            phone_number: data.data.phone_number || emp.phone_number || emp.phone,
            check_in_time: data.data.check_in_time || emp.start_time || emp.checkIn,
            vendor_visits: data.data.vendor_visits != null ? data.data.vendor_visits : (emp.vendor_visits || emp.vendors || 0),
            total_allowance: data.data.total_allowance != null ? data.data.total_allowance : (emp.allowance || emp.daily_allowance || 0),
          }));
        }
        setEmployeeDetailLoading(false);
      })
      .catch(function(error) {
        console.error('Error fetching employee details:', error);
        setEmployeeDetailLoading(false);
      });
  };

  var openEmpVendorMap = function() {
    if (!selectedEmployee) return;
    var userId = (selectedEmployee.user_id && typeof selectedEmployee.user_id === 'object' ? selectedEmployee.user_id._id : selectedEmployee.user_id) || selectedEmployee._id || selectedEmployee.id || '';
    var empName = selectedEmployee.full_name || selectedEmployee.name || 'Employee';
    setEmpVendorMapName(empName);
    setEmpVendorMapLoading(true);
    setShowEmpVendorMap(true);
    setEmpVendorVisits([]);
    var token = user && user.token ? user.token : '';
    fetch(`${BASE_URL}/api/vendor-visits/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        var visits = [];
        if (Array.isArray(data)) {
          visits = data;
        } else if (data && typeof data === 'object') {
          var keys = Object.keys(data);
          for (var i = 0; i < keys.length; i++) {
            if (Array.isArray(data[keys[i]])) {
              visits = data[keys[i]];
              break;
            }
          }
        }
        setEmpVendorVisits(visits);
        setEmpVendorMapLoading(false);
      })
      .catch(function(err) {
        console.log('Vendor visits fetch error:', err);
        setEmpVendorMapLoading(false);
        Alert.alert('Error', 'Failed to load vendor visits: ' + err.message);
      });
  };

  var generateEmpVendorMapHTML = function(visits, name) {
    var markers = visits.map(function(v, i) {
      var lat = parseFloat(v.latitude) || 0;
      var lng = parseFloat(v.longitude) || 0;
      if (lat === 0 && lng === 0 && v.address_gps) {
        var parts = v.address_gps.split(',');
        if (parts.length >= 2) {
          lat = parseFloat(parts[0].trim()) || 0;
          lng = parseFloat(parts[1].trim()) || 0;
        }
      }
      var isOnboarded = v.on_board === true || v.on_board === 'true' || v.is_onboarded === true || v.is_onboarded === 'true';
      var color = isOnboarded ? '#4caf50' : '#ff9800';
      var statusText = isOnboarded ? 'Onboarded' : 'Pending';
      var vendorName = (v.vendor_name || 'Vendor ' + (i + 1)).replace(/'/g, '');
      var note = (v.note || '').replace(/'/g, '');
      var time = '';
      try {
        var d = new Date(v.visit_date || v.createdAt);
        time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      } catch(e) { time = '--:--'; }
      return { lat: lat, lng: lng, name: vendorName, color: color, statusText: statusText, time: time, note: note, index: i + 1 };
    }).filter(function(m) { return m.lat !== 0 && m.lng !== 0; });

    if (markers.length === 0) return null;

    var centerLat = markers.reduce(function(s, m) { return s + m.lat; }, 0) / markers.length;
    var centerLng = markers.reduce(function(s, m) { return s + m.lng; }, 0) / markers.length;

    var markersJS = markers.map(function(m) {
      var popup = '<div style="text-align:center;font-family:sans-serif">' +
        '<b style="font-size:14px;color:#1a1a2e">#' + m.index + ' ' + m.name + '</b><br/>' +
        '<span style="color:' + m.color + ';font-weight:bold;font-size:12px">' + m.statusText + '</span><br/>' +
        '<span style="color:#666;font-size:11px">' + m.time + '</span>' +
        (m.note ? '<br/><span style="color:#333;font-size:11px;font-style:italic">' + m.note + '</span>' : '') +
        '<br/><span style="color:#999;font-size:10px">' + m.lat.toFixed(6) + ', ' + m.lng.toFixed(6) + '</span></div>';
      return "L.circleMarker([" + m.lat + ", " + m.lng + "], {radius: 12, fillColor: '" + m.color + "', color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.9}).addTo(map).bindPopup('" + popup.replace(/'/g, "\\'") + "');";
    }).join("\n");

    var routeLine = "";
    if (markers.length > 1) {
      var coords = markers.map(function(m) { return "[" + m.lat + ", " + m.lng + "]"; }).join(", ");
      routeLine = "L.polyline([" + coords + "], {color: '#e53935', weight: 3, opacity: 0.6, dashArray: '8, 8'}).addTo(map);";
    }

    var labelsJS = markers.map(function(m) {
      var iconHtml = "<div style='background:" + m.color + ";color:#fff;width:22px;height:22px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)'>" + m.index + "</div>";
      return "L.marker([" + m.lat + ", " + m.lng + "], {icon: L.divIcon({className: 'num-label', html: '" + iconHtml.replace(/'/g, "\\'") + "', iconSize: [22, 22], iconAnchor: [11, 30]})}).addTo(map);";
    }).join("\n");

    return '<!DOCTYPE html><html><head>' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />' +
      '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />' +
      '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>' +
      '<style>body{margin:0;padding:0}#map{width:100%;height:100vh}.num-label{background:transparent!important;border:none!important}.leaflet-popup-content-wrapper{border-radius:12px}</style>' +
      '</head><body><div id="map"></div><script>' +
      'var map=L.map("map").setView([' + centerLat + ',' + centerLng + '],' + (markers.length > 1 ? '12' : '14') + ');' +
      'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"OpenStreetMap",maxZoom:19}).addTo(map);' +
      markersJS + routeLine + labelsJS +
      (markers.length > 1 ? 'map.fitBounds([' + markers.map(function(m) { return '[' + m.lat + ',' + m.lng + ']'; }).join(',') + '],{padding:[40,40]});' : '') +
      '<\/script></body></html>';
  };

  // OCR helper - extract KM from image
  var runOcrOnImage = function(uri) {
    setKmImage(uri);
    setOcrLoading(true);
    extractKmFromImage(uri)
      .then(function(km) {
        if (km) {
          setKmReading(km);
          Alert.alert('KM Detected', 'Odometer reading: ' + km + ' km\n\nYou can edit if incorrect.');
        } else {
          Alert.alert('OCR', 'Could not detect KM from image. Please enter manually.');
        }
        setOcrLoading(false);
      })
      .catch(function(e) {
        console.log('OCR failed:', e);
        Alert.alert('OCR Error', 'Could not read image. Please enter KM manually.');
        setOcrLoading(false);
      });
  };

  // Image picker functions with OCR
  var pickImage = function() {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    }).then(function(result) {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        runOcrOnImage(result.assets[0].uri);
      }
    }).catch(function() {
      Alert.alert('Error', 'Could not open gallery');
    });
  };

  var takePhoto = function() {
    ImagePicker.requestCameraPermissionsAsync().then(function(permission) {
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }
      ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      }).then(function(result) {
        if (!result.canceled && result.assets && result.assets.length > 0) {
          runOcrOnImage(result.assets[0].uri);
        }
      }).catch(function() {
        Alert.alert('Error', 'Could not open camera');
      });
    });
  };

  // GPS Camera selfie
  var takeSelfie = function() {
    setGpsCameraTarget('selfie');
    setShowGPSCamera(true);
  };

  var onGPSCameraCapture = function(uri) {
    if (gpsCameraTarget === 'selfie') {
      setSelfieImage(uri);
    } else if (gpsCameraTarget === 'vendor') {
      setVendorSelfie(uri);
    }
    setShowGPSCamera(false);
    setGpsCameraTarget(null);
  };

  var pickSelfie = function() {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    }).then(function(result) {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelfieImage(result.assets[0].uri);
      }
    }).catch(function() {
      Alert.alert('Error', 'Could not open gallery');
    });
  };

  var resetCheckFields = function() {
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

  var pickBillImage = function(setter) {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    }).then(function(result) {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setter(result.assets[0].uri);
      }
    }).catch(function() {
      Alert.alert('Error', 'Could not open gallery');
    });
  };

  var takeBillPhoto = function(setter) {
    ImagePicker.requestCameraPermissionsAsync().then(function(permission) {
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }
      ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      }).then(function(result) {
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setter(result.assets[0].uri);
        }
      }).catch(function() {
        Alert.alert('Error', 'Could not open camera');
      });
    });
  };

  var submitCheckModal = async function() {
    if (submitting) return;
    if (checkModalType === 'checkin' && !selfieImage) {
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
    try {
      var permResult = await Location.requestForegroundPermissionsAsync();
      if (permResult.status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required');
        return;
      }
      var location = await Location.getCurrentPositionAsync({});
      var lat = location.coords.latitude.toString();
      var lng = location.coords.longitude.toString();

      var token = user && user.token ? user.token : '';
      var apiUrl = checkModalType === 'checkin'
        ? `${BASE_URL}/api/attendance/check-in`
        : `${BASE_URL}/api/attendance/check-out`;

      var formData = new FormData();
      formData.append('headquarter_name', hqName.trim());
      formData.append('working_town', workingTown.trim());
      formData.append('route', route.trim());
      formData.append('total_km', kmReading.trim());
      formData.append('latitude', lat);
      formData.append('longitude', lng);

      if (checkModalType === 'checkin') {
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
        if (stayBillImage) formData.append('stay_image', getImageFile(stayBillImage, 'stay'));
        if (foodBillAmount.trim()) formData.append('food_bill_amount', foodBillAmount.trim());
        if (foodBillImage) formData.append('food_image', getImageFile(foodBillImage, 'food'));
        if (otherBillDescription.trim()) formData.append('other_bill_description', otherBillDescription.trim());
        if (otherBillAmount.trim()) formData.append('other_bill_amount', otherBillAmount.trim());
        if (otherBillImage) formData.append('other_image', getImageFile(otherBillImage, 'other'));
      } else {
        formData.append('out_of_town', 'false');
      }

      console.log('=== ADMIN ' + checkModalType.toUpperCase() + ' PAYLOAD ===');
      console.log('headquarter_name:', hqName.trim());
      console.log('working_town:', workingTown.trim());
      console.log('route:', route.trim());
      console.log('total_km:', kmReading.trim());
      console.log('latitude:', lat, 'longitude:', lng);
      console.log('image file:', checkModalType === 'checkin' ? JSON.stringify(getImageFile(kmImage, 'km')) : JSON.stringify(getImageFile(kmImage, 'km')));
      console.log('selfie_image file:', selfieImage ? JSON.stringify(getImageFile(selfieImage, 'selfie')) : 'none');
      console.log('out_of_town:', outOfTown ? 'true' : 'false');
      console.log('API URL:', apiUrl);
      console.log('==============================');

      var response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
        },
        body: formData,
      });

      var responseText = await response.text();
      console.log(checkModalType + ' API Status:', response.status);
      console.log(checkModalType + ' API Response:', responseText);

      if (!response.ok) {
        throw new Error('Server error: ' + response.status + ' - ' + responseText);
      }

      if (checkModalType === 'checkin') {
        setCheckedIn(true);
        setCheckInTime(new Date());
        setCheckOutTime(null);
        Alert.alert('Success', 'Checked in successfully!');
      } else {
        setCheckedIn(false);
        setCheckOutTime(new Date());
        Alert.alert('Success', 'Checked out successfully!');
      }
      setShowCheckModal(false);
      resetCheckFields();
      fetchDashboard();
    } catch (e) {
      console.log(checkModalType + ' error:', e);
      Alert.alert('Error', 'Failed to ' + checkModalType + ': ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Vendor functions
  var pickVendorSelfie = function() {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    }).then(function(result) {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVendorSelfie(result.assets[0].uri);
      }
    }).catch(function() {
      Alert.alert('Error', 'Could not open gallery');
    });
  };

  var takeVendorSelfie = function() {
    setGpsCameraTarget('vendor');
    setShowGPSCamera(true);
  };

  var submitVendor = async function() {
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
      var permResult = await Location.requestForegroundPermissionsAsync();
      if (permResult.status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required');
        return;
      }
      var location = await Location.getCurrentPositionAsync({});
      var lat = location.coords.latitude.toString();
      var lng = location.coords.longitude.toString();
      var addressGps = lat + ', ' + lng;
      var today = new Date();
      var visitDate = today.getFullYear() + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0');
      var onBoardValue = isOnboarded === 'yes' ? 'true' : 'false';

      var formData = new FormData();
      formData.append('vendor_name', vendorName.trim());
      formData.append('vendor_mobile', vendorMobile.trim());
      formData.append('address_gps', addressGps);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      formData.append('on_board', onBoardValue);
      formData.append('note', vendorNote.trim());
      formData.append('visit_date', visitDate);

      formData.append('selfie_with_vendor', getImageFile(vendorSelfie, 'vendor_selfie'));

      var response = await fetch(`${BASE_URL}/api/vendor-visits`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (user && user.token ? user.token : ''),
        },
        body: formData,
      });

      var responseText = await response.text();
      console.log('API Status:', response.status);
      console.log('API Response:', responseText);

      if (!response.ok) {
        throw new Error('Server error: ' + response.status + ' - ' + responseText);
      }

      if (onVendorsChange && vendors) {
        onVendorsChange([].concat(vendors, [{
          name: vendorName.trim(),
          mobile: vendorMobile.trim(),
          selfie: vendorSelfie,
          onboarded: isOnboarded,
          time: new Date(),
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        }]));
      }
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

  /* ======================== RENDER ======================== */

  var renderSectionHeader = function(title) {
    return (
      <View style={s.sectionHeaderRow}>
        <View style={[s.sectionBar, { backgroundColor: theme.primary }]} />
        <Text style={[s.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
    );
  };

  var renderStatusBadge = function(status) {
    return (
      <View style={[s.statusBadge, { backgroundColor: getStatusBg(status) }]}>
        <View style={[s.statusDot, { backgroundColor: getStatusColor(status) }]} />
        <Text style={[s.statusText, { color: getStatusColor(status) }]}>{getStatusLabel(status)}</Text>
      </View>
    );
  };

  var renderInput = function(props) {
    var emoji = props.emoji || '';
    return (
      <View style={[s.inputWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]}>
        {emoji ? <Text style={s.inputEmoji}>{emoji}</Text> : null}
        <TextInput
          style={[s.inputField, { color: theme.text }, !emoji && { paddingLeft: 16 }]}
          placeholderTextColor={theme.textTertiary}
          {...props}
        />
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* ===== HEADER ===== */}
      <View style={[s.header, { backgroundColor: theme.primary }]}>
        <View style={[s.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[s.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={[s.decorCircle3, { backgroundColor: theme.secondary ? (theme.secondary + '26') : 'rgba(255,200,0,0.15)' }]} />

        {/* Nav Row */}
        <View style={s.navRow}>
          <TouchableOpacity onPress={toggleTheme} style={s.navBtn}>
            <Text style={s.navBtnText}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navBtn} onPress={onLogout}>
            <Text style={s.logoutLabel}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* User Info */}
        <View style={s.userRow}>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarLetter}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.userTextCol}>
            <Text style={s.userName}>{fullName}</Text>
            <Text style={s.userRole}>Admin / Distributor</Text>
          </View>
        </View>

        <Text style={s.dateText}>{dateStr}</Text>
        <Text style={s.timeText}>{formatTime(currentTime)}</Text>
      </View>

      {/* ===== MANAGER CHECK-IN CARD ===== */}
      <View style={[s.checkCard, { backgroundColor: theme.surface }]}>
        <View style={s.checkCardTop}>
          <View style={[s.checkStatusDot, checkedIn ? { backgroundColor: theme.success } : { backgroundColor: theme.textTertiary }]} />
          <Text style={[s.checkStatusLabel, { color: theme.text }]}>
            {checkedIn ? 'You are Checked In' : 'You are Checked Out'}
          </Text>
        </View>

        <View style={s.checkTimesRow}>
          <View style={[s.checkTimeBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={s.checkTimeBoxEmoji}>{"🕐"}</Text>
            <Text style={[s.checkTimeBoxLabel, { color: theme.textTertiary }]}>CHECK IN</Text>
            <Text style={[s.checkTimeBoxValue, { color: theme.primary }]}>{formatTime(checkInTime)}</Text>
          </View>
          <View style={[s.checkTimeBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={s.checkTimeBoxEmoji}>{"🕕"}</Text>
            <Text style={[s.checkTimeBoxLabel, { color: theme.textTertiary }]}>CHECK OUT</Text>
            <Text style={[s.checkTimeBoxValue, { color: theme.primary }]}>{formatTime(checkOutTime)}</Text>
          </View>
          <View style={[s.checkTimeBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={s.checkTimeBoxEmoji}>{"⏱"}</Text>
            <Text style={[s.checkTimeBoxLabel, { color: theme.textTertiary }]}>HOURS</Text>
            <Text style={[s.checkTimeBoxValue, { color: theme.success }]}>{getWorkingHours()}</Text>
          </View>
        </View>

        <View style={s.checkBtnRow}>
          <TouchableOpacity
            style={[s.checkActionBtn, { backgroundColor: checkedIn ? theme.primary : theme.success, elevation: 4 }]}
            onPress={function() {
              setCheckModalType(checkedIn ? 'checkout' : 'checkin');
              setShowCheckModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={s.checkActionIcon}>{checkedIn ? '↗' : '↙'}</Text>
            <Text style={s.checkActionLabel}>{checkedIn ? 'CHECK OUT' : 'CHECK IN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.checkActionBtn, { backgroundColor: theme.info, elevation: 4 }]}
            onPress={function() { setShowVendorModal(true); }}
            activeOpacity={0.7}
          >
            <Text style={s.checkActionIcon}>{"🏪"}</Text>
            <Text style={s.checkActionLabel}>VENDOR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== QUICK ACTIONS GRID ===== */}
      <View style={s.quickGrid}>
        {[
          { emoji: '📅', label: 'Attendance', bg: theme.errorBg, onPress: onGoToAttendance },
          { emoji: '📍', label: 'Visits', bg: theme.successBg, onPress: onGoToVisits },
          { emoji: '💰', label: 'Allowance', bg: theme.warningBg, onPress: onGoToDailyAllowance },
          { emoji: '👤', label: 'Profile', bg: theme.infoBg, onPress: onGoToProfile },
          { emoji: '📦', label: 'Inventory', bg: theme.surfaceVariant, onPress: onGoToInventory },
          { emoji: '📋', label: 'Employees', bg: theme.successBg, onPress: onGoToEmployeeList },
          { emoji: '📊', label: 'Reports', bg: theme.errorBg, onPress: onGoToAttendanceList },
        ].map(function(item, idx) {
          return (
            <TouchableOpacity key={idx} style={s.quickItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[s.quickIconBox, { backgroundColor: item.bg }]}>
                <Text style={s.quickEmoji}>{item.emoji}</Text>
              </View>
              <Text style={[s.quickLabel, { color: theme.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ===== VENDOR MAP BUTTON ===== */}
      <TouchableOpacity style={[s.vendorMapCard, { backgroundColor: theme.surface }]} onPress={onGoToVendorMap} activeOpacity={0.8}>
        <View style={[s.vendorMapAccent, { backgroundColor: theme.primary }]} />
        <Text style={s.vendorMapEmoji}>{"🗺"}</Text>
        <View style={s.vendorMapTextCol}>
          <Text style={[s.vendorMapTitle, { color: theme.text }]}>Vendor Visit Map</Text>
          <Text style={[s.vendorMapSub, { color: theme.textTertiary }]}>View all vendor locations on map</Text>
        </View>
        <Text style={[s.vendorMapArrow, { color: theme.primary }]}>{">"}</Text>
      </TouchableOpacity>

      {/* ===== TAB / FILTER BAR ===== */}
      <View style={s.tabBar}>
        {['overview', 'employees', 'attendance'].map(function(tab) {
          var isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tabPill, isActive && { backgroundColor: theme.primary }]}
              onPress={function() { setActiveTab(tab); }}
              activeOpacity={0.7}
            >
              <Text style={[s.tabPillText, { color: theme.textTertiary }, isActive && { color: '#fff' }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ===== SCROLLABLE BODY ===== */}
      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' ? (
          <View>
            {/* KPI Stats Cards */}
            <View style={s.kpiGrid}>
              {[
                { emoji: '👥', num: totalEmployees, label: 'TOTAL EMPLOYEES', color: theme.success, bg: theme.successBg },
                { emoji: '✅', num: presentToday, label: 'PRESENT TODAY', color: theme.info, bg: theme.infoBg },
                { emoji: '❌', num: absentToday + onLeaveToday, label: 'ABSENT / LEAVE', color: theme.primary, bg: theme.errorBg },
                { emoji: '🏪', num: totalVendors, label: 'VENDOR VISITS', color: theme.warning, bg: theme.warningBg },
              ].map(function(kpi, idx) {
                return (
                  <View key={idx} style={[s.kpiCard, { backgroundColor: theme.surface }]}>
                    <View style={[s.kpiIconBox, { backgroundColor: kpi.bg }]}>
                      <Text style={s.kpiEmoji}>{kpi.emoji}</Text>
                    </View>
                    <Text style={[s.kpiNumber, { color: kpi.color }]}>{kpi.num}</Text>
                    <Text style={[s.kpiLabel, { color: theme.textTertiary }]}>{kpi.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Total Allowance Card */}
            <View style={[s.allowanceBanner, { backgroundColor: theme.primary }]}>
              <View>
                <Text style={s.allowanceBannerTitle}>Total Daily Allowance</Text>
                <Text style={s.allowanceBannerSub}>All employees today</Text>
              </View>
              <Text style={s.allowanceBannerValue}>{"₹"}{totalAllowance.toLocaleString()}</Text>
            </View>

            {/* Attendance Breakdown */}
            {renderSectionHeader("Today's Attendance")}
            <View style={s.attBarOuter}>
              <View style={[s.attBarSeg, { flex: presentToday, backgroundColor: theme.success, borderTopLeftRadius: 7, borderBottomLeftRadius: 7 }]} />
              <View style={[s.attBarSeg, { flex: halfDayToday || 0.01, backgroundColor: theme.warning }]} />
              <View style={[s.attBarSeg, { flex: absentToday || 0.01, backgroundColor: theme.primary }]} />
              <View style={[s.attBarSeg, { flex: onLeaveToday || 0.01, backgroundColor: theme.info, borderTopRightRadius: 7, borderBottomRightRadius: 7 }]} />
            </View>
            <View style={s.legendRow}>
              {[
                { label: 'Present (' + presentToday + ')', color: theme.success },
                { label: 'Half Day (' + halfDayToday + ')', color: theme.warning },
                { label: 'Absent (' + absentToday + ')', color: theme.primary },
                { label: 'Leave (' + onLeaveToday + ')', color: theme.info },
              ].map(function(l, i) {
                return (
                  <View key={i} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: l.color }]} />
                    <Text style={[s.legendText, { color: theme.textSecondary }]}>{l.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Top Performers */}
            {employees.length > 0 ? (
              <View>
                {renderSectionHeader('Top Performers (Vendor Visits)')}
                {employees
                  .slice()
                  .sort(function(a, b) { return (b.vendors || b.vendor_visits || 0) - (a.vendors || a.vendor_visits || 0); })
                  .slice(0, 5)
                  .map(function(emp, index) {
                    return (
                      <View key={emp._id || emp.id || index} style={[s.performerCard, { backgroundColor: theme.surface }]}>
                        <View style={[s.performerAccent, { backgroundColor: theme.warning }]} />
                        <View style={[s.performerRank, { backgroundColor: theme.warningBg }]}>
                          <Text style={[s.performerRankText, { color: theme.warning }]}>#{index + 1}</Text>
                        </View>
                        <View style={s.performerInfo}>
                          <Text style={[s.performerName, { color: theme.text }]}>{emp.full_name || emp.name || 'Employee'}</Text>
                          <Text style={[s.performerDesig, { color: theme.textTertiary }]}>{emp.designation_name || emp.designation || ''} - {emp.headquarter_name || emp.hq || ''}</Text>
                        </View>
                        <View style={s.performerStats}>
                          <Text style={[s.performerCount, { color: theme.success }]}>{emp.vendors || emp.vendor_visits || 0}</Text>
                          <Text style={[s.performerCountLabel, { color: theme.textTertiary }]}>visits</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ===== EMPLOYEES TAB ===== */}
        {activeTab === 'employees' ? (
          <View>
            <View style={s.listHeaderRow}>
              <Text style={[s.listHeaderCount, { color: theme.textTertiary }]}>{employees.length} employees</Text>
              {employees.length > 5 ? (
                <TouchableOpacity onPress={onGoToEmployeeList} activeOpacity={0.7}>
                  <Text style={[s.viewAllLink, { color: theme.primary }]}>View All  {">"}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {employees.length === 0 ? (
              <View style={s.emptyState}>
                <View style={[s.emptyIconBox, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={s.emptyEmoji}>{"👥"}</Text>
                </View>
                <Text style={[s.emptyTitle, { color: theme.text }]}>No Employees</Text>
                <Text style={[s.emptySub, { color: theme.textTertiary }]}>No employee data available yet</Text>
              </View>
            ) : null}

            {employees.slice(0, 5).map(function(emp, index) {
              var empName = emp.full_name || emp.name || 'Employee';
              var empDesig = emp.designation_name || emp.designation || '';
              var empHq = emp.headquarter_name || emp.hq || '';
              var empStatus = (emp.status || 'present').toLowerCase();
              return (
                <TouchableOpacity
                  key={emp._id || emp.id || index}
                  style={[s.empCard, { backgroundColor: theme.surface }]}
                  onPress={function() { openEmployee(emp); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.empCardAccent, { backgroundColor: getStatusColor(empStatus) }]} />
                  <View style={[s.empAvatar, { backgroundColor: theme.primary }]}>
                    <Text style={s.empAvatarLetter}>
                      {empName.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.empInfoCol}>
                    <Text style={[s.empName, { color: theme.text }]}>{empName}</Text>
                    <Text style={[s.empDesig, { color: theme.textSecondary }]}>{empDesig}</Text>
                    <Text style={[s.empHq, { color: theme.textTertiary }]}>{empHq}</Text>
                  </View>
                  <View style={s.empRightCol}>
                    {renderStatusBadge(empStatus)}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* ===== ATTENDANCE TAB ===== */}
        {activeTab === 'attendance' ? (
          <View>
            {renderSectionHeader('Weekly Overview')}
            <View style={[s.weekChart, { backgroundColor: theme.surface }]}>
              {attendanceWeek.map(function(day, i) {
                var maxHeight = 100;
                var presentH = (day.present / 10) * maxHeight;
                var absentH = (day.absent / 10) * maxHeight;
                return (
                  <View key={i} style={s.weekCol}>
                    <View style={s.weekBarStack}>
                      <View style={[s.weekBar, { height: presentH, backgroundColor: theme.success, borderTopLeftRadius: 4, borderTopRightRadius: 4 }]} />
                      <View style={[s.weekBar, { height: absentH, backgroundColor: theme.error, marginTop: 2, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]} />
                    </View>
                    <Text style={[s.weekLabel, { color: theme.textTertiary }]}>{day.date}</Text>
                  </View>
                );
              })}
            </View>
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: theme.success }]} />
                <Text style={[s.legendText, { color: theme.textSecondary }]}>Present</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: theme.error }]} />
                <Text style={[s.legendText, { color: theme.textSecondary }]}>Absent</Text>
              </View>
            </View>

            <View style={s.listHeaderRow}>
              {renderSectionHeader("Today's Employee Attendance")}
              {employees.length > 5 ? (
                <TouchableOpacity onPress={onGoToAttendanceList} activeOpacity={0.7}>
                  <Text style={[s.viewAllLink, { color: theme.primary }]}>View All  {">"}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {employees.slice(0, 5).map(function(emp, index) {
              var empName = emp.full_name || emp.name || 'Employee';
              var empCheckIn = emp.check_in_time || emp.checkIn || null;
              var empStatus = emp.status ? emp.status.toLowerCase() : (empCheckIn ? 'present' : 'absent');
              return (
                <View key={emp._id || emp.id || index} style={[s.attListCard, { backgroundColor: theme.surface }]}>
                  <View style={[s.attListAccent, { backgroundColor: getStatusColor(empStatus) }]} />
                  <View style={s.attListInfo}>
                    <Text style={[s.attListName, { color: theme.text }]}>{empName}</Text>
                    <Text style={[s.attListTime, { color: theme.textTertiary }]}>
                      {empCheckIn ? 'Check In: ' + empCheckIn : 'Not checked in'}
                    </Text>
                  </View>
                  {renderStatusBadge(empStatus)}
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* ===== EMPLOYEE DETAIL MODAL ===== */}
      <Modal
        visible={showEmployeeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={function() { setShowEmployeeModal(false); }}
      >
        <View style={[s.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[s.modalSheet, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.modalHead}>
                <Text style={[s.modalHeadTitle, { color: theme.text }]}>Employee Details</Text>
                <TouchableOpacity onPress={function() { setShowEmployeeModal(false); }} style={s.modalCloseBtn}>
                  <Text style={[s.modalCloseX, { color: theme.textTertiary }]}>{"✕"}</Text>
                </TouchableOpacity>
              </View>

              {employeeDetailLoading ? (
                <ActivityIndicator size="large" color={theme.secondary || theme.primary} style={{ marginTop: 40, marginBottom: 40 }} />
              ) : selectedEmployee ? (
                <View>
                  <View style={s.modalProfileBlock}>
                    <View style={[s.modalAvatarLg, { backgroundColor: theme.primary }]}>
                      <Text style={s.modalAvatarLgText}>
                        {(selectedEmployee.full_name || selectedEmployee.name || 'E').split(' ').map(function(n) { return n[0]; }).join('').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[s.modalProfileName, { color: theme.text }]}>{selectedEmployee.full_name || selectedEmployee.name || 'Employee'}</Text>
                    <Text style={[s.modalProfileDesig, { color: theme.textSecondary }]}>{selectedEmployee.designation_name || selectedEmployee.designation || ''}</Text>
                    <View style={{ alignSelf: 'center', marginTop: 10 }}>
                      {renderStatusBadge((selectedEmployee.status || 'present').toLowerCase())}
                    </View>
                  </View>

                  {/* Detail Rows */}
                  {[
                    { emoji: '🏢', label: 'Headquarter', value: selectedEmployee.headquarter_name || selectedEmployee.hq || '--' },
                    { emoji: '📱', label: 'Phone', value: selectedEmployee.phone_number || selectedEmployee.phone || '--' },
                    { emoji: '⏰', label: 'Check In Time', value: selectedEmployee.check_in_time || selectedEmployee.start_time || selectedEmployee.checkIn || 'Not checked in' },
                  ].map(function(row, i) {
                    return (
                      <View key={i} style={[s.modalDetailRow, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={s.modalDetailEmoji}>{row.emoji}</Text>
                        <View>
                          <Text style={[s.modalDetailLabel, { color: theme.textTertiary }]}>{row.label}</Text>
                          <Text style={[s.modalDetailValue, { color: theme.text }]}>{row.value}</Text>
                        </View>
                      </View>
                    );
                  })}

                  <View style={s.modalStatsRow}>
                    <TouchableOpacity style={[s.modalStatBox, { backgroundColor: theme.successBg }]} onPress={openEmpVendorMap} activeOpacity={0.7}>
                      <Text style={s.modalStatEmoji}>{"🏪"}</Text>
                      <Text style={[s.modalStatNum, { color: theme.success }]}>{selectedEmployee.vendor_visits != null ? selectedEmployee.vendor_visits : (selectedEmployee.vendors || 0)}</Text>
                      <Text style={[s.modalStatLabel, { color: theme.textSecondary }]}>Vendor Visits</Text>
                      <Text style={{ fontSize: 10, color: theme.success, fontWeight: '600', marginTop: 4 }}>Tap to view map</Text>
                    </TouchableOpacity>
                    <View style={[s.modalStatBox, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={s.modalStatEmoji}>{"💰"}</Text>
                      <Text style={[s.modalStatNum, { color: theme.secondary || theme.primary }]}>{"₹"}{selectedEmployee.total_allowance != null ? selectedEmployee.total_allowance : (selectedEmployee.allowance || selectedEmployee.daily_allowance || 0)}</Text>
                      <Text style={[s.modalStatLabel, { color: theme.textSecondary }]}>Allowance</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== EMPLOYEE VENDOR MAP MODAL ===== */}
      <Modal
        visible={showEmpVendorMap}
        animationType="slide"
        onRequestClose={function() { setShowEmpVendorMap(false); }}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[s.mapHeader, { backgroundColor: theme.primary }]}>
            <View style={[s.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            <View style={[s.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
            <View style={s.mapHeaderTop}>
              <TouchableOpacity style={s.mapBackBtn} onPress={function() { setShowEmpVendorMap(false); }}>
                <Text style={s.mapBackText}>{"<"} Back</Text>
              </TouchableOpacity>
              <Text style={s.mapHeaderTitle}>Vendor Map</Text>
              <View style={{ width: 60 }} />
            </View>
            <Text style={s.mapSubtitle}>{empVendorMapName}'s Visits</Text>
            <View style={s.mapStatsBar}>
              <View style={s.mapStatItem}>
                <Text style={s.mapStatCount}>{empVendorVisits.length}</Text>
                <Text style={s.mapStatLabel}>Total</Text>
              </View>
              <View style={s.mapStatDivider} />
              <View style={s.mapStatItem}>
                <Text style={[s.mapStatCount, { color: theme.success }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === true || v.on_board === 'true' || v.is_onboarded === true || v.is_onboarded === 'true'; }).length}
                </Text>
                <Text style={s.mapStatLabel}>Onboarded</Text>
              </View>
              <View style={s.mapStatDivider} />
              <View style={s.mapStatItem}>
                <Text style={[s.mapStatCount, { color: theme.warning }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === false || v.on_board === 'false' || v.is_onboarded === false || v.is_onboarded === 'false'; }).length}
                </Text>
                <Text style={s.mapStatLabel}>Pending</Text>
              </View>
            </View>
          </View>

          <View style={[s.mapWebViewBox, { backgroundColor: theme.surface }]}>
            {empVendorMapLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.success} />
                <Text style={{ marginTop: 12, fontSize: 14, color: theme.textTertiary, fontWeight: '600' }}>Loading vendor visits...</Text>
              </View>
            ) : generateEmpVendorMapHTML(empVendorVisits, empVendorMapName) ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: generateEmpVendorMapHTML(empVendorVisits, empVendorMapName) }}
                style={{ flex: 1, borderRadius: 20 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={function() {
                  return (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textTertiary }}>Loading Map...</Text>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={s.emptyState}>
                <View style={[s.emptyIconBox, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={s.emptyEmoji}>{"🗺"}</Text>
                </View>
                <Text style={[s.emptyTitle, { color: theme.text }]}>No Location Data</Text>
                <Text style={[s.emptySub, { color: theme.textTertiary }]}>No vendor visits with GPS data found for this employee</Text>
              </View>
            )}
          </View>

          {empVendorVisits.length > 0 && !empVendorMapLoading ? (
            <View style={[s.mapLegendBar, { backgroundColor: theme.surface, borderTopColor: theme.divider }]}>
              <View style={s.mapLegendItem}>
                <View style={[s.legendDot, { backgroundColor: theme.success }]} />
                <Text style={[s.mapLegendText, { color: theme.textSecondary }]}>Onboarded</Text>
              </View>
              <View style={s.mapLegendItem}>
                <View style={[s.legendDot, { backgroundColor: theme.warning }]} />
                <Text style={[s.mapLegendText, { color: theme.textSecondary }]}>Pending</Text>
              </View>
              <View style={s.mapLegendItem}>
                <View style={{ width: 18, height: 2, backgroundColor: theme.primary, marginRight: 6 }} />
                <Text style={[s.mapLegendText, { color: theme.textSecondary }]}>Route</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* ===== CHECK-IN / CHECK-OUT MODAL ===== */}
      <Modal
        visible={showCheckModal}
        transparent={true}
        animationType="slide"
        onRequestClose={function() { setShowCheckModal(false); resetCheckFields(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[s.modalSheet, { backgroundColor: theme.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={s.modalHead}>
                  <Text style={[s.modalHeadTitle, { color: theme.text }]}>
                    {checkModalType === 'checkin' ? 'Check In Details' : 'Check Out Details'}
                  </Text>
                  <TouchableOpacity onPress={function() { setShowCheckModal(false); resetCheckFields(); }} style={s.modalCloseBtn}>
                    <Text style={[s.modalCloseX, { color: theme.textTertiary }]}>{"✕"}</Text>
                  </TouchableOpacity>
                </View>

                {/* Selfie */}
                <View>
                  <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"🤳"}  Selfie</Text>
                  {selfieImage ? (
                    <View style={s.imgPreviewWrap}>
                      <Image source={{ uri: selfieImage }} style={s.imgPreviewSelfie} />
                      <TouchableOpacity style={s.imgRemoveBtn} onPress={function() { setSelfieImage(null); }}>
                        <Text style={s.imgRemoveX}>{"✕"}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[s.uploadArea, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]} onPress={takeSelfie}>
                      <Text style={s.uploadAreaEmoji}>{"🤳"}</Text>
                      <Text style={[s.uploadAreaText, { color: theme.textSecondary }]}>Take Selfie</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* KM Image */}
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"📷"}  KM Image</Text>
                {kmImage ? (
                  <View style={s.imgPreviewWrap}>
                    <Image source={{ uri: kmImage }} style={s.imgPreview} />
                    <TouchableOpacity style={s.imgRemoveBtn} onPress={function() { setKmImage(null); setKmReading(''); }}>
                      <Text style={s.imgRemoveX}>{"✕"}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[s.uploadArea, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]} onPress={takePhoto}>
                    <Text style={s.uploadAreaEmoji}>{"📷"}</Text>
                    <Text style={[s.uploadAreaText, { color: theme.textSecondary }]}>Camera</Text>
                  </TouchableOpacity>
                )}

                {/* KM Reading */}
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"🔢"}  KM Reading</Text>
                {ocrLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <ActivityIndicator size="small" color={theme.info} />
                    <Text style={{ marginLeft: 8, color: theme.info, fontSize: 13 }}>Reading odometer...</Text>
                  </View>
                ) : null}
                {renderInput({ emoji: '🔢', placeholder: 'Enter KM reading', keyboardType: 'numeric', value: kmReading, onChangeText: setKmReading })}

                {/* HQ Name */}
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"🏢"}  HQ Name</Text>
                {renderInput({ emoji: '🏢', placeholder: 'Enter headquarter name', value: hqName, onChangeText: setHqName })}

                {/* Working Town */}
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"🏘"}  Working Town</Text>
                {renderInput({ emoji: '🏘', placeholder: 'Enter working town', value: workingTown, onChangeText: setWorkingTown })}

                {/* Route */}
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"🛣"}  Route</Text>
                {renderInput({ emoji: '🛣', placeholder: 'Enter route', value: route, onChangeText: setRoute })}

                {/* Out of Town */}
                <TouchableOpacity
                  style={s.checkboxRow}
                  onPress={function() { setOutOfTown(!outOfTown); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }, outOfTown && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                    {outOfTown ? <Text style={s.checkboxTick}>{"✓"}</Text> : null}
                  </View>
                  <Text style={[s.checkboxLabel, { color: theme.text }]}>Out of Town</Text>
                </TouchableOpacity>

                {outOfTown ? (
                  <View style={[s.outOfTownBox, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
                    <Text style={[s.outOfTownHeading, { color: theme.warning }]}>Out of Town Expenses</Text>

                    <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Stay Bill Amount</Text>
                    {renderInput({ emoji: '🏨', placeholder: 'Enter stay bill amount', keyboardType: 'numeric', value: stayBillAmount, onChangeText: setStayBillAmount })}

                    <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Stay Bill Image</Text>
                    {stayBillImage ? (
                      <View style={s.imgPreviewWrap}>
                        <Image source={{ uri: stayBillImage }} style={s.imgPreview} />
                        <TouchableOpacity style={s.imgRemoveBtn} onPress={function() { setStayBillImage(null); }}>
                          <Text style={s.imgRemoveX}>{"✕"}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={[s.uploadArea, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]} onPress={function() { takeBillPhoto(setStayBillImage); }}>
                        <Text style={s.uploadAreaEmoji}>{"📷"}</Text>
                        <Text style={[s.uploadAreaText, { color: theme.textSecondary }]}>Camera</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Food Bill Amount</Text>
                    {renderInput({ emoji: '🍽', placeholder: 'Enter food bill amount', keyboardType: 'numeric', value: foodBillAmount, onChangeText: setFoodBillAmount })}

                    <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Food Bill Image</Text>
                    {foodBillImage ? (
                      <View style={s.imgPreviewWrap}>
                        <Image source={{ uri: foodBillImage }} style={s.imgPreview} />
                        <TouchableOpacity style={s.imgRemoveBtn} onPress={function() { setFoodBillImage(null); }}>
                          <Text style={s.imgRemoveX}>{"✕"}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={[s.uploadArea, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]} onPress={function() { takeBillPhoto(setFoodBillImage); }}>
                        <Text style={s.uploadAreaEmoji}>{"📷"}</Text>
                        <Text style={[s.uploadAreaText, { color: theme.textSecondary }]}>Camera</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Other Expense Description</Text>
                    {renderInput({ emoji: '📝', placeholder: 'Enter expense description', value: otherBillDescription, onChangeText: setOtherBillDescription })}

                    <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Other Expense Amount</Text>
                    {renderInput({ emoji: '💵', placeholder: 'Enter other expense amount', keyboardType: 'numeric', value: otherBillAmount, onChangeText: setOtherBillAmount })}

                    <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Other Expense Image</Text>
                    {otherBillImage ? (
                      <View style={s.imgPreviewWrap}>
                        <Image source={{ uri: otherBillImage }} style={s.imgPreview} />
                        <TouchableOpacity style={s.imgRemoveBtn} onPress={function() { setOtherBillImage(null); }}>
                          <Text style={s.imgRemoveX}>{"✕"}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={[s.uploadArea, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]} onPress={function() { takeBillPhoto(setOtherBillImage); }}>
                        <Text style={s.uploadAreaEmoji}>{"📷"}</Text>
                        <Text style={[s.uploadAreaText, { color: theme.textSecondary }]}>Camera</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: checkModalType === 'checkout' ? theme.primary : theme.success, elevation: 4 }, submitting && { opacity: 0.7 }]}
                  onPress={submitCheckModal}
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>
                      {checkModalType === 'checkin' ? 'CHECK IN' : 'CHECK OUT'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== VENDOR VISIT MODAL ===== */}
      <Modal
        visible={showVendorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={function() { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[s.modalSheet, { backgroundColor: theme.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={s.modalHead}>
                  <Text style={[s.modalHeadTitle, { color: theme.text }]}>Visit Vendor</Text>
                  <TouchableOpacity onPress={function() { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }} style={s.modalCloseBtn}>
                    <Text style={[s.modalCloseX, { color: theme.textTertiary }]}>{"✕"}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"🏪"}  Vendor Name</Text>
                {renderInput({ emoji: '🏪', placeholder: 'Enter vendor name', value: vendorName, onChangeText: setVendorName })}

                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"📱"}  Vendor Mobile Number</Text>
                {renderInput({ emoji: '📱', placeholder: 'Enter vendor mobile number', keyboardType: 'phone-pad', maxLength: 10, value: vendorMobile, onChangeText: setVendorMobile })}

                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"📷"}  Selfie with Vendor</Text>
                {vendorSelfie ? (
                  <View style={s.imgPreviewWrap}>
                    <Image source={{ uri: vendorSelfie }} style={s.imgPreview} />
                    <TouchableOpacity style={s.imgRemoveBtn} onPress={function() { setVendorSelfie(null); }}>
                      <Text style={s.imgRemoveX}>{"✕"}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[s.uploadArea, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]} onPress={takeVendorSelfie}>
                    <Text style={s.uploadAreaEmoji}>{"📷"}</Text>
                    <Text style={[s.uploadAreaText, { color: theme.textSecondary }]}>Camera</Text>
                  </TouchableOpacity>
                )}

                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{"📝"}  Note</Text>
                <View style={[s.inputWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider, minHeight: 80 }]}>
                  <TextInput
                    style={[s.inputField, { color: theme.text, paddingLeft: 16, textAlignVertical: 'top', minHeight: 70 }]}
                    placeholder="Enter note (optional)"
                    placeholderTextColor={theme.textTertiary}
                    value={vendorNote}
                    onChangeText={setVendorNote}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Is this vendor onboarded?</Text>
                <View style={s.onboardRow}>
                  <TouchableOpacity
                    style={[s.onboardPill, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }, isOnboarded === 'yes' && { backgroundColor: theme.successBg, borderColor: theme.success }]}
                    onPress={function() { setIsOnboarded('yes'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.onboardPillText, { color: theme.textSecondary }, isOnboarded === 'yes' && { color: theme.success, fontWeight: '700' }]}>
                      Yes, Onboarded
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.onboardPill, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }, isOnboarded === 'no' && { backgroundColor: theme.errorBg, borderColor: theme.primary }]}
                    onPress={function() { setIsOnboarded('no'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.onboardPillText, { color: theme.textSecondary }, isOnboarded === 'no' && { color: theme.primary, fontWeight: '700' }]}>
                      Visit
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: theme.info, elevation: 4 }, submitting && { opacity: 0.7 }]}
                  onPress={submitVendor}
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>ADD VENDOR VISIT</Text>
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
        onRequestClose={function() { setShowGPSCamera(false); setGpsCameraTarget(null); }}
      >
        <GPSCameraScreen
          onCapture={onGPSCameraCapture}
          onClose={function() { setShowGPSCamera(false); setGpsCameraTarget(null); }}
        />
      </Modal>
    </View>
  );
}

/* ======================== STYLES ======================== */

var screenWidth = Dimensions.get('window').width;

var s = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ----- Header ----- */
  header: {
    paddingTop: 48,
    paddingBottom: 22,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -50,
  },
  decorCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: 70,
    left: -60,
  },
  decorCircle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    right: 60,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  navBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  logoutLabel: {
    color: '#ff8a80',
    fontSize: 13,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerAvatarLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  userTextCol: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  timeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 2,
  },

  /* ----- Check-In Card ----- */
  checkCard: {
    marginHorizontal: 16,
    marginTop: -4,
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  checkCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  checkStatusLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  checkTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  checkTimeBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  checkTimeBoxEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  checkTimeBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  checkTimeBoxValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  checkBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkActionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActionIcon: {
    fontSize: 18,
    color: '#fff',
    marginRight: 8,
  },
  checkActionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },

  /* ----- Quick Actions Grid ----- */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  quickItem: {
    width: (screenWidth - 32) / 4,
    alignItems: 'center',
    marginBottom: 14,
  },
  quickIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickEmoji: {
    fontSize: 22,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* ----- Vendor Map Card ----- */
  vendorMapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  vendorMapAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  vendorMapEmoji: {
    fontSize: 28,
    marginRight: 14,
    marginLeft: 6,
  },
  vendorMapTextCol: {
    flex: 1,
  },
  vendorMapTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  vendorMapSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  vendorMapArrow: {
    fontSize: 20,
    fontWeight: '700',
  },

  /* ----- Tab / Filter Bar ----- */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: 'transparent',
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* ----- Body ----- */
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 80,
  },

  /* ----- Section Header ----- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  /* ----- KPI Cards ----- */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: (screenWidth - 48) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiEmoji: {
    fontSize: 18,
  },
  kpiNumber: {
    fontSize: 28,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* ----- Allowance Banner ----- */
  allowanceBanner: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  allowanceBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  allowanceBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  allowanceBannerValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#69f0ae',
  },

  /* ----- Attendance Bar ----- */
  attBarOuter: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 12,
  },
  attBarSeg: {
    height: 14,
  },

  /* ----- Legend ----- */
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* ----- Performer Cards ----- */
  performerCard: {
    borderRadius: 16,
    padding: 14,
    paddingLeft: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  performerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  performerRank: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performerRankText: {
    fontSize: 14,
    fontWeight: '800',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  performerDesig: {
    fontSize: 12,
    marginTop: 2,
  },
  performerStats: {
    alignItems: 'center',
  },
  performerCount: {
    fontSize: 20,
    fontWeight: '900',
  },
  performerCountLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  /* ----- List Header Row ----- */
  listHeaderRow: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* ----- Employee Cards ----- */
  empCard: {
    borderRadius: 16,
    padding: 14,
    paddingLeft: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  empCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  empAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empAvatarLetter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  empInfoCol: {
    flex: 1,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
  },
  empDesig: {
    fontSize: 12,
    marginTop: 2,
  },
  empHq: {
    fontSize: 11,
    marginTop: 1,
  },
  empRightCol: {
    alignItems: 'flex-end',
  },

  /* ----- Status Badge ----- */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* ----- Attendance Tab ----- */
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  weekCol: {
    alignItems: 'center',
    flex: 1,
  },
  weekBarStack: {
    alignItems: 'center',
    marginBottom: 8,
  },
  weekBar: {
    width: 22,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  attListCard: {
    borderRadius: 16,
    padding: 14,
    paddingLeft: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  attListAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  attListInfo: {
    flex: 1,
  },
  attListName: {
    fontSize: 15,
    fontWeight: '700',
  },
  attListTime: {
    fontSize: 12,
    marginTop: 2,
  },

  /* ----- Empty State ----- */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ----- Modal ----- */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeadTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseX: {
    fontSize: 20,
    fontWeight: '700',
  },

  /* ----- Modal Profile ----- */
  modalProfileBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatarLg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarLgText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },
  modalProfileName: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalProfileDesig: {
    fontSize: 14,
    marginTop: 4,
  },

  /* ----- Modal Detail Row ----- */
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  modalDetailEmoji: {
    fontSize: 20,
    marginRight: 14,
  },
  modalDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },

  /* ----- Modal Stats ----- */
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  modalStatBox: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  modalStatEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  modalStatNum: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  /* ----- Form Elements ----- */
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputEmoji: {
    fontSize: 18,
    paddingLeft: 14,
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 13,
    fontSize: 15,
  },
  uploadArea: {
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  uploadAreaEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  uploadAreaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imgPreviewWrap: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  imgPreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  imgPreviewSelfie: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  imgRemoveBtn: {
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
  imgRemoveX: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ----- Buttons ----- */
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* ----- Checkbox ----- */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '700',
  },

  /* ----- Out of Town ----- */
  outOfTownBox: {
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
  },
  outOfTownHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },

  /* ----- Onboard Row ----- */
  onboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 10,
  },
  onboardPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  onboardPillText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ----- Map Modal ----- */
  mapHeader: {
    paddingTop: 48,
    paddingBottom: 18,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 10,
  },
  mapHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mapBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mapBackText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  mapHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  mapSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  mapStatsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  mapStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  mapStatCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  mapStatLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  mapStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  mapWebViewBox: {
    flex: 1,
    margin: 12,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
  },
  mapLegendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  mapLegendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
