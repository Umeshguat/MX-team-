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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

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

function getStatusColor(status) {
  switch (status) {
    case 'present': return '#4caf50';
    case 'absent': return '#e53935';
    case 'half-day': return '#ff9800';
    case 'leave': return '#1565c0';
    default: return '#bdbdbd';
  }
}

function getStatusBg(status) {
  switch (status) {
    case 'present': return '#e8f5e9';
    case 'absent': return '#ffebee';
    case 'half-day': return '#fff3e0';
    case 'leave': return '#e3f2fd';
    default: return '#f5f5f5';
  }
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

export default function AdminDashboardScreen({ user, onLogout, onGoToProfile, onGoToAttendance, onGoToDailyAllowance, onGoToVisits, onGoToVendorMap, vendors, onVendorsChange }) {
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

  // Vendor visit state
  var [showVendorModal, setShowVendorModal] = useState(false);
  var [vendorName, setVendorName] = useState('');
  var [vendorMobile, setVendorMobile] = useState('');
  var [vendorNote, setVendorNote] = useState('');
  var [vendorSelfie, setVendorSelfie] = useState(null);
  var [isOnboarded, setIsOnboarded] = useState(null);

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

  // Image picker functions
  var pickImage = function() {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    }).then(function(result) {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setKmImage(result.assets[0].uri);
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
          setKmImage(result.assets[0].uri);
        }
      }).catch(function() {
        Alert.alert('Error', 'Could not open camera');
      });
    });
  };

  var takeSelfie = function() {
    ImagePicker.requestCameraPermissionsAsync().then(function(permission) {
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }
      ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front,
      }).then(function(result) {
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setSelfieImage(result.assets[0].uri);
        }
      }).catch(function() {
        Alert.alert('Error', 'Could not open camera');
      });
    });
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
    setHqName('');
    setWorkingTown('');
    setRoute('');
    setSelfieImage(null);
    setOutOfTown(false);
    setStayBillImage(null);
    setFoodBillImage(null);
    setOtherBillImage(null);
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
          setVendorSelfie(result.assets[0].uri);
        }
      }).catch(function() {
        Alert.alert('Error', 'Could not open camera');
      });
    });
  };

  var submitVendor = async function() {
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
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.userName}>{fullName}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </View>

      {/* Manager Check-In/Out Card */}
      <View style={styles.managerCheckCard}>
        <View style={styles.managerCheckTop}>
          <View style={[styles.managerStatusDot, checkedIn ? styles.dotActive : styles.dotInactive]} />
          <Text style={styles.managerStatusText}>
            {checkedIn ? 'You are Checked In' : 'You are Checked Out'}
          </Text>
        </View>
        <View style={styles.managerCheckRow}>
          <View style={styles.managerTimeBox}>
            <Text style={styles.managerTimeLabel}>Check In</Text>
            <Text style={styles.managerTimeValue}>{formatTime(checkInTime)}</Text>
          </View>
          <View style={styles.managerTimeBox}>
            <Text style={styles.managerTimeLabel}>Check Out</Text>
            <Text style={styles.managerTimeValue}>{formatTime(checkOutTime)}</Text>
          </View>
          <View style={styles.managerTimeBox}>
            <Text style={styles.managerTimeLabel}>Hours</Text>
            <Text style={styles.managerTimeValueHours}>{getWorkingHours()}</Text>
          </View>
        </View>
        <View style={styles.managerBtnRow}>
          <TouchableOpacity
            style={[styles.managerCheckBtn, checkedIn ? styles.managerCheckOutBtn : styles.managerCheckInBtn]}
            onPress={function() {
              setCheckModalType(checkedIn ? 'checkout' : 'checkin');
              setShowCheckModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.managerCheckBtnIcon}>{checkedIn ? '↗' : '↙'}</Text>
            <Text style={styles.managerCheckBtnText}>{checkedIn ? 'CHECK OUT' : 'CHECK IN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.managerCheckBtn, styles.managerVendorBtn]}
            onPress={function() { setShowVendorModal(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.managerCheckBtnIcon}>🏪</Text>
            <Text style={styles.managerCheckBtnText}>VENDOR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions for Manager */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={styles.quickActionItem} onPress={onGoToAttendance}>
          <View style={[styles.quickActionIconBox, { backgroundColor: '#fce4ec' }]}>
            <Text style={styles.quickActionEmoji}>📅</Text>
          </View>
          <Text style={styles.quickActionLabel}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionItem} onPress={onGoToVisits}>
          <View style={[styles.quickActionIconBox, { backgroundColor: '#e8f5e9' }]}>
            <Text style={styles.quickActionEmoji}>📍</Text>
          </View>
          <Text style={styles.quickActionLabel}>Visits</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionItem} onPress={onGoToDailyAllowance}>
          <View style={[styles.quickActionIconBox, { backgroundColor: '#f3e5f5' }]}>
            <Text style={styles.quickActionEmoji}>💰</Text>
          </View>
          <Text style={styles.quickActionLabel}>Allowance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionItem} onPress={onGoToProfile}>
          <View style={[styles.quickActionIconBox, { backgroundColor: '#fff3e0' }]}>
            <Text style={styles.quickActionEmoji}>👤</Text>
          </View>
          <Text style={styles.quickActionLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Vendor Map Button */}
      <TouchableOpacity style={styles.vendorMapBtn} onPress={onGoToVendorMap} activeOpacity={0.8}>
        <Text style={styles.vendorMapIcon}>🗺</Text>
        <View style={styles.vendorMapTextBox}>
          <Text style={styles.vendorMapTitle}>Vendor Visit Map</Text>
          <Text style={styles.vendorMapSubtitle}>View all vendor locations on map</Text>
        </View>
        <Text style={styles.vendorMapArrow}>→</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={function() { setActiveTab('overview'); }}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.tabActive]}
          onPress={function() { setActiveTab('employees'); }}
        >
          <Text style={[styles.tabText, activeTab === 'employees' && styles.tabTextActive]}>Employees</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.tabActive]}
          onPress={function() { setActiveTab('attendance'); }}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>Attendance</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' ? (
          <View>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={[styles.statCount, { color: '#4caf50' }]}>{totalEmployees}</Text>
                <Text style={styles.statLabel}>Total Employees</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={[styles.statCount, { color: '#1565c0' }]}>{presentToday}</Text>
                <Text style={styles.statLabel}>Present Today</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#ffebee' }]}>
                <Text style={styles.statIcon}>❌</Text>
                <Text style={[styles.statCount, { color: '#e53935' }]}>{absentToday + onLeaveToday}</Text>
                <Text style={styles.statLabel}>Absent / Leave</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
                <Text style={styles.statIcon}>🏪</Text>
                <Text style={[styles.statCount, { color: '#ff9800' }]}>{totalVendors}</Text>
                <Text style={styles.statLabel}>Vendor Visits</Text>
              </View>
            </View>

            <View style={styles.totalAllowanceCard}>
              <View>
                <Text style={styles.totalAllowanceLabel}>Total Daily Allowance</Text>
                <Text style={styles.totalAllowanceSub}>All employees today</Text>
              </View>
              <Text style={styles.totalAllowanceValue}>₹{totalAllowance.toLocaleString()}</Text>
            </View>

            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            <View style={styles.attendanceBar}>
              <View style={[styles.attendanceSegment, { flex: presentToday, backgroundColor: '#4caf50' }]} />
              <View style={[styles.attendanceSegment, { flex: halfDayToday || 0.01, backgroundColor: '#ff9800' }]} />
              <View style={[styles.attendanceSegment, { flex: absentToday || 0.01, backgroundColor: '#e53935' }]} />
              <View style={[styles.attendanceSegment, { flex: onLeaveToday || 0.01, backgroundColor: '#1565c0' }]} />
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
                <Text style={styles.legendText}>Present ({presentToday})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ff9800' }]} />
                <Text style={styles.legendText}>Half Day ({halfDayToday})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#e53935' }]} />
                <Text style={styles.legendText}>Absent ({absentToday})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#1565c0' }]} />
                <Text style={styles.legendText}>Leave ({onLeaveToday})</Text>
              </View>
            </View>

            {employees.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Top Performers (Vendor Visits)</Text>
                {employees
                  .slice()
                  .sort(function(a, b) { return (b.vendors || b.vendor_visits || 0) - (a.vendors || a.vendor_visits || 0); })
                  .slice(0, 5)
                  .map(function(emp, index) {
                    return (
                      <View key={emp._id || emp.id || index} style={styles.performerCard}>
                        <View style={styles.performerRank}>
                          <Text style={styles.performerRankText}>#{index + 1}</Text>
                        </View>
                        <View style={styles.performerInfo}>
                          <Text style={styles.performerName}>{emp.full_name || emp.name || 'Employee'}</Text>
                          <Text style={styles.performerDesig}>{emp.designation_name || emp.designation || ''} - {emp.headquarter_name || emp.hq || ''}</Text>
                        </View>
                        <View style={styles.performerStats}>
                          <Text style={styles.performerVendors}>{emp.vendors || emp.vendor_visits || 0}</Text>
                          <Text style={styles.performerVendorsLabel}>visits</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* EMPLOYEES TAB */}
        {activeTab === 'employees' ? (
          <View>
            <View style={styles.empSummaryRow}>
              <Text style={styles.empSummaryText}>{employees.length} employees</Text>
            </View>

            {employees.map(function(emp, index) {
              var empName = emp.full_name || emp.name || 'Employee';
              var empDesig = emp.designation_name || emp.designation || '';
              var empHq = emp.headquarter_name || emp.hq || '';
              var empStatus = (emp.status || 'present').toLowerCase();
              return (
                <TouchableOpacity
                  key={emp._id || emp.id || index}
                  style={styles.empCard}
                  onPress={function() { openEmployee(emp); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.empAvatar}>
                    <Text style={styles.empAvatarText}>
                      {empName.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{empName}</Text>
                    <Text style={styles.empDesig}>{empDesig}</Text>
                    <Text style={styles.empHq}>{empHq}</Text>
                  </View>
                  <View style={styles.empRight}>
                    <View style={[styles.empStatusBadge, { backgroundColor: getStatusBg(empStatus) }]}>
                      <View style={[styles.empStatusDot, { backgroundColor: getStatusColor(empStatus) }]} />
                      <Text style={[styles.empStatusText, { color: getStatusColor(empStatus) }]}>
                        {getStatusLabel(empStatus)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' ? (
          <View>
            <Text style={styles.sectionTitle}>Weekly Overview</Text>
            <View style={styles.weekChart}>
              {attendanceWeek.map(function(day, i) {
                var maxHeight = 100;
                var presentH = (day.present / 10) * maxHeight;
                var absentH = (day.absent / 10) * maxHeight;
                return (
                  <View key={i} style={styles.weekDay}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, { height: presentH, backgroundColor: '#4caf50' }]} />
                      <View style={[styles.bar, { height: absentH, backgroundColor: '#ef5350', marginTop: 2 }]} />
                    </View>
                    <Text style={styles.weekDayLabel}>{day.date}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef5350' }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Today's Employee Attendance</Text>
            {employees.map(function(emp, index) {
              var empName = emp.full_name || emp.name || 'Employee';
              var empCheckIn = emp.check_in_time || emp.checkIn || null;
              var empStatus = emp.status ? emp.status.toLowerCase() : (empCheckIn ? 'present' : 'absent');
              return (
                <View key={emp._id || emp.id || index} style={styles.attendanceRow}>
                  <View style={styles.attendanceLeft}>
                    <Text style={styles.attendanceName}>{empName}</Text>
                    <Text style={styles.attendanceCheckIn}>
                      {empCheckIn ? 'Check In: ' + empCheckIn : 'Not checked in'}
                    </Text>
                  </View>
                  <View style={[styles.attendanceStatusBadge, { backgroundColor: getStatusBg(empStatus) }]}>
                    <Text style={[styles.attendanceStatusText, { color: getStatusColor(empStatus) }]}>
                      {getStatusLabel(empStatus)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* Employee Detail Modal */}
      <Modal
        visible={showEmployeeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={function() { setShowEmployeeModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Employee Details</Text>
                <TouchableOpacity onPress={function() { setShowEmployeeModal(false); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {employeeDetailLoading ? (
                <ActivityIndicator size="large" color="#9c27b0" style={{ marginTop: 40, marginBottom: 40 }} />
              ) : selectedEmployee ? (
                <View>
                  <View style={styles.modalProfile}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>
                        {(selectedEmployee.full_name || selectedEmployee.name || 'E').split(' ').map(function(n) { return n[0]; }).join('').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalProfileName}>{selectedEmployee.full_name || selectedEmployee.name || 'Employee'}</Text>
                    <Text style={styles.modalProfileDesig}>{selectedEmployee.designation_name || selectedEmployee.designation || ''}</Text>
                    <View style={[styles.empStatusBadge, { backgroundColor: getStatusBg((selectedEmployee.status || 'present').toLowerCase()), alignSelf: 'center', marginTop: 8 }]}>
                      <View style={[styles.empStatusDot, { backgroundColor: getStatusColor((selectedEmployee.status || 'present').toLowerCase()) }]} />
                      <Text style={[styles.empStatusText, { color: getStatusColor((selectedEmployee.status || 'present').toLowerCase()) }]}>
                        {getStatusLabel((selectedEmployee.status || 'present').toLowerCase())}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>🏢</Text>
                    <View>
                      <Text style={styles.modalDetailLabel}>Headquarter</Text>
                      <Text style={styles.modalDetailValue}>{selectedEmployee.headquarter_name || selectedEmployee.hq || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>📱</Text>
                    <View>
                      <Text style={styles.modalDetailLabel}>Phone</Text>
                      <Text style={styles.modalDetailValue}>{selectedEmployee.phone_number || selectedEmployee.phone || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>⏰</Text>
                    <View>
                      <Text style={styles.modalDetailLabel}>Check In Time</Text>
                      <Text style={styles.modalDetailValue}>{selectedEmployee.check_in_time || selectedEmployee.start_time || selectedEmployee.checkIn || 'Not checked in'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalStatsRow}>
                    <TouchableOpacity style={[styles.modalStatCard, { backgroundColor: '#e8f5e9' }]} onPress={openEmpVendorMap} activeOpacity={0.7}>
                      <Text style={styles.modalStatIcon}>🏪</Text>
                      <Text style={[styles.modalStatValue, { color: '#4caf50' }]}>{selectedEmployee.vendor_visits != null ? selectedEmployee.vendor_visits : (selectedEmployee.vendors || 0)}</Text>
                      <Text style={styles.modalStatLabel}>Vendor Visits</Text>
                      <Text style={{ fontSize: 10, color: '#4caf50', fontWeight: '600', marginTop: 4 }}>Tap to view map</Text>
                    </TouchableOpacity>
                    <View style={[styles.modalStatCard, { backgroundColor: '#f3e5f5' }]}>
                      <Text style={styles.modalStatIcon}>💰</Text>
                      <Text style={[styles.modalStatValue, { color: '#9c27b0' }]}>₹{selectedEmployee.total_allowance != null ? selectedEmployee.total_allowance : (selectedEmployee.allowance || selectedEmployee.daily_allowance || 0)}</Text>
                      <Text style={styles.modalStatLabel}>Allowance</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Employee Vendor Visits Map Modal */}
      <Modal
        visible={showEmpVendorMap}
        animationType="slide"
        onRequestClose={function() { setShowEmpVendorMap(false); }}
      >
        <View style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
          <View style={styles.empMapHeader}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.empMapHeaderTop}>
              <TouchableOpacity style={styles.empMapBackBtn} onPress={function() { setShowEmpVendorMap(false); }}>
                <Text style={styles.empMapBackText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.empMapTitle}>Vendor Map</Text>
              <View style={{ width: 60 }} />
            </View>
            <Text style={styles.empMapSubtitle}>{empVendorMapName}'s Visits</Text>
            <View style={styles.empMapStatsBar}>
              <View style={styles.empMapStatItem}>
                <Text style={styles.empMapStatCount}>{empVendorVisits.length}</Text>
                <Text style={styles.empMapStatLabel}>Total</Text>
              </View>
              <View style={styles.empMapStatDivider} />
              <View style={styles.empMapStatItem}>
                <Text style={[styles.empMapStatCount, { color: '#4caf50' }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === true || v.on_board === 'true' || v.is_onboarded === true || v.is_onboarded === 'true'; }).length}
                </Text>
                <Text style={styles.empMapStatLabel}>Onboarded</Text>
              </View>
              <View style={styles.empMapStatDivider} />
              <View style={styles.empMapStatItem}>
                <Text style={[styles.empMapStatCount, { color: '#ff9800' }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === false || v.on_board === 'false' || v.is_onboarded === false || v.is_onboarded === 'false'; }).length}
                </Text>
                <Text style={styles.empMapStatLabel}>Pending</Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1, margin: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', elevation: 4 }}>
            {empVendorMapLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4caf50" />
                <Text style={{ marginTop: 12, fontSize: 14, color: '#999', fontWeight: '600' }}>Loading vendor visits...</Text>
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
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f7' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#999' }}>Loading Map...</Text>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <Text style={{ fontSize: 50, marginBottom: 14 }}>🗺</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 8 }}>No Location Data</Text>
                <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 }}>No vendor visits with GPS data found for this employee</Text>
              </View>
            )}
          </View>

          {empVendorVisits.length > 0 && !empVendorMapLoading ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4caf50', marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#666' }}>Onboarded</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff9800', marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#666' }}>Pending</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 }}>
                <View style={{ width: 18, height: 2, backgroundColor: '#e53935', marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#666' }}>Route</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Manager Check-In / Check-Out Modal */}
      <Modal
        visible={showCheckModal}
        transparent={true}
        animationType="slide"
        onRequestClose={function() { setShowCheckModal(false); resetCheckFields(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {checkModalType === 'checkin' ? 'Check In Details' : 'Check Out Details'}
                </Text>
                <TouchableOpacity onPress={function() { setShowCheckModal(false); resetCheckFields(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.checkModalLabel}>Selfie</Text>
                {selfieImage ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: selfieImage }} style={styles.selfiePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={function() { setSelfieImage(null); }}>
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

              <Text style={styles.checkModalLabel}>KM Image</Text>
              {kmImage ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: kmImage }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={function() { setKmImage(null); }}>
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

              <Text style={styles.checkModalLabel}>KM Reading</Text>
              <TextInput
                style={styles.checkModalInput}
                placeholder="Enter KM reading"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={kmReading}
                onChangeText={setKmReading}
              />

              <Text style={styles.checkModalLabel}>HQ Name</Text>
              <TextInput
                style={styles.checkModalInput}
                placeholder="Enter headquarter name"
                placeholderTextColor="#999"
                value={hqName}
                onChangeText={setHqName}
              />

              <Text style={styles.checkModalLabel}>Working Town</Text>
              <TextInput
                style={styles.checkModalInput}
                placeholder="Enter working town"
                placeholderTextColor="#999"
                value={workingTown}
                onChangeText={setWorkingTown}
              />

              <Text style={styles.checkModalLabel}>Route</Text>
              <TextInput
                style={styles.checkModalInput}
                placeholder="Enter route"
                placeholderTextColor="#999"
                value={route}
                onChangeText={setRoute}
              />

              {/* Out of Town Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={function() { setOutOfTown(!outOfTown); }}
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

                  <Text style={styles.checkModalLabel}>Stay Bill Amount</Text>
                  <TextInput
                    style={styles.checkModalInput}
                    placeholder="Enter stay bill amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={stayBillAmount}
                    onChangeText={setStayBillAmount}
                  />
                  <Text style={styles.checkModalLabel}>Stay Bill Image</Text>
                  {stayBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: stayBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={function() { setStayBillImage(null); }}>
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={function() { takeBillPhoto(setStayBillImage); }}>
                        <Text style={styles.uploadIcon}>📷</Text>
                        <Text style={styles.uploadText}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={function() { pickBillImage(setStayBillImage); }}>
                        <Text style={styles.uploadIcon}>🖼</Text>
                        <Text style={styles.uploadText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.checkModalLabel}>Food Bill Amount</Text>
                  <TextInput
                    style={styles.checkModalInput}
                    placeholder="Enter food bill amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={foodBillAmount}
                    onChangeText={setFoodBillAmount}
                  />
                  <Text style={styles.checkModalLabel}>Food Bill Image</Text>
                  {foodBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: foodBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={function() { setFoodBillImage(null); }}>
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={function() { takeBillPhoto(setFoodBillImage); }}>
                        <Text style={styles.uploadIcon}>📷</Text>
                        <Text style={styles.uploadText}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={function() { pickBillImage(setFoodBillImage); }}>
                        <Text style={styles.uploadIcon}>🖼</Text>
                        <Text style={styles.uploadText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.checkModalLabel}>Other Expense Description</Text>
                  <TextInput
                    style={styles.checkModalInput}
                    placeholder="Enter expense description"
                    placeholderTextColor="#999"
                    value={otherBillDescription}
                    onChangeText={setOtherBillDescription}
                  />
                  <Text style={styles.checkModalLabel}>Other Expense Amount</Text>
                  <TextInput
                    style={styles.checkModalInput}
                    placeholder="Enter other expense amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={otherBillAmount}
                    onChangeText={setOtherBillAmount}
                  />
                  <Text style={styles.checkModalLabel}>Other Expense Image</Text>
                  {otherBillImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: otherBillImage }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={function() { setOtherBillImage(null); }}>
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBtn} onPress={function() { takeBillPhoto(setOtherBillImage); }}>
                        <Text style={styles.uploadIcon}>📷</Text>
                        <Text style={styles.uploadText}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={function() { pickBillImage(setOtherBillImage); }}>
                        <Text style={styles.uploadIcon}>🖼</Text>
                        <Text style={styles.uploadText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.checkSubmitBtn, checkModalType === 'checkout' && styles.checkSubmitBtnCheckout]}
                onPress={submitCheckModal}
                activeOpacity={0.8}
              >
                <Text style={styles.checkSubmitText}>
                  {checkModalType === 'checkin' ? 'CHECK IN' : 'CHECK OUT'}
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
        onRequestClose={function() { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Visit Vendor</Text>
                <TouchableOpacity onPress={function() { setShowVendorModal(false); setVendorName(''); setVendorMobile(''); setVendorSelfie(null); setIsOnboarded(null); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.checkModalLabel}>Vendor Name</Text>
              <TextInput
                style={styles.checkModalInput}
                placeholder="Enter vendor name"
                placeholderTextColor="#999"
                value={vendorName}
                onChangeText={setVendorName}
              />

              <Text style={styles.checkModalLabel}>Vendor Mobile Number</Text>
              <TextInput
                style={styles.checkModalInput}
                placeholder="Enter vendor mobile number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={10}
                value={vendorMobile}
                onChangeText={setVendorMobile}
              />

              <Text style={styles.checkModalLabel}>Selfie with Vendor</Text>
              {vendorSelfie ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: vendorSelfie }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={function() { setVendorSelfie(null); }}>
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

              <Text style={styles.checkModalLabel}>Note</Text>
              <TextInput
                style={[styles.checkModalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter note (optional)"
                placeholderTextColor="#999"
                value={vendorNote}
                onChangeText={setVendorNote}
                multiline={true}
                numberOfLines={3}
              />

              <Text style={styles.checkModalLabel}>Is this vendor onboarded?</Text>
              <View style={styles.onboardRow}>
                <TouchableOpacity
                  style={[styles.onboardOption, isOnboarded === 'yes' && styles.onboardOptionYes]}
                  onPress={function() { setIsOnboarded('yes'); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.onboardText, isOnboarded === 'yes' && styles.onboardTextSelected]}>
                    Yes, Onboarded
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.onboardOption, isOnboarded === 'no' && styles.onboardOptionNo]}
                  onPress={function() { setIsOnboarded('no'); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.onboardText, isOnboarded === 'no' && styles.onboardTextSelected]}>
                    Visit
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.vendorSubmitBtn}
                onPress={submitVendor}
                activeOpacity={0.8}
              >
                <Text style={styles.checkSubmitText}>ADD VENDOR VISIT</Text>
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
  empMapHeader: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    zIndex: 10,
  },
  empMapHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  empMapBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  empMapBackText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  empMapTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  empMapSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  empMapStatsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  empMapStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  empMapStatCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  empMapStatLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  empMapStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 25,
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
    marginBottom: 8,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
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
    color: 'rgba(255,255,255,0.5)',
  },
  timeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 2,
  },
  // Manager Check-In Card
  managerCheckCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -1,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  managerCheckTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  managerStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  dotActive: {
    backgroundColor: '#4caf50',
  },
  dotInactive: {
    backgroundColor: '#bdbdbd',
  },
  managerStatusText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  managerCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  managerTimeBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  managerTimeLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  managerTimeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  managerTimeValueHours: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e53935',
  },
  managerBtnRow: {
    flexDirection: 'row',
  },
  managerCheckBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  managerCheckInBtn: {
    backgroundColor: '#4caf50',
    shadowColor: '#4caf50',
    marginRight: 6,
  },
  managerCheckOutBtn: {
    backgroundColor: '#e53935',
    shadowColor: '#e53935',
    marginRight: 6,
  },
  managerVendorBtn: {
    backgroundColor: '#1565c0',
    shadowColor: '#1565c0',
    marginLeft: 6,
  },
  managerCheckBtnIcon: {
    fontSize: 18,
    color: '#fff',
    marginRight: 8,
  },
  managerCheckBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingTop: 6,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#e53935',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#e53935',
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (screenWidth - 52) / 2,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statCount: {
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  totalAllowanceCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalAllowanceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  totalAllowanceSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  totalAllowanceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#69f0ae',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 6,
    marginBottom: 15,
  },
  // Attendance bar
  attendanceBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 12,
  },
  attendanceSegment: {
    height: 14,
  },
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
    color: '#666',
    fontWeight: '600',
  },
  // Performers
  performerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  performerRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff3e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performerRankText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ff9800',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  performerDesig: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  performerStats: {
    alignItems: 'center',
  },
  performerVendors: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4caf50',
  },
  performerVendorsLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  // Employee list
  empSummaryRow: {
    marginBottom: 14,
  },
  empSummaryText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  empCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  empAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  empDesig: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  empHq: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  empRight: {
    alignItems: 'flex-end',
  },
  empStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  empStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  empStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Attendance tab
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  weekDay: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: 22,
    borderRadius: 4,
  },
  weekDayLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  attendanceRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  attendanceLeft: {
    flex: 1,
  },
  attendanceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  attendanceCheckIn: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  attendanceStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal
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
  modalProfile: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  modalProfileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  modalProfileDesig: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  modalDetailIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  modalDetailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  modalDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalStatCard: {
    flex: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalStatIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  // Check-in modal styles
  checkModalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  checkModalInput: {
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
  selfiePreview: {
    width: '100%',
    height: 200,
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
  checkSubmitBtn: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    elevation: 6,
  },
  checkSubmitBtnCheckout: {
    backgroundColor: '#e53935',
  },
  checkSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionEmoji: {
    fontSize: 22,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  vendorMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#e53935',
  },
  vendorMapIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  vendorMapTextBox: {
    flex: 1,
  },
  vendorMapTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  vendorMapSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginTop: 2,
  },
  vendorMapArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e53935',
  },
  // Vendor modal styles
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
  vendorSubmitBtn: {
    backgroundColor: '#1565c0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    elevation: 6,
  },
  // Checkbox & Out of Town
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  outOfTownSection: {
    backgroundColor: '#fff8e1',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  outOfTownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f57f17',
    marginBottom: 6,
  },
});
