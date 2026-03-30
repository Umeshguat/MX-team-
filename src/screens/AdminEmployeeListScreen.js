import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { BASE_URL } from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

function getStatusLabel(status) {
  switch (status) {
    case 'checked in': return 'Checked In';
    case 'checked out': return 'Checked Out';
    case 'present': return 'Present';
    case 'absent': return 'Absent';
    case 'half-day': return 'Half Day';
    case 'leave': return 'On Leave';
    default: return '--';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return '--';
  }
}

function generateEmpVendorMapHTML(visits, name) {
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
}

export default function AdminEmployeeListScreen({ user, onGoBack }) {
  const { theme } = useTheme();

  var [employees, setEmployees] = useState([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [totalRecords, setTotalRecords] = useState(0);
  var [loadingMore, setLoadingMore] = useState(false);

  var [selectedEmployee, setSelectedEmployee] = useState(null);
  var [showEmployeeModal, setShowEmployeeModal] = useState(false);
  var [employeeDetailLoading, setEmployeeDetailLoading] = useState(false);

  var [showEmpVendorMap, setShowEmpVendorMap] = useState(false);
  var [empVendorVisits, setEmpVendorVisits] = useState([]);
  var [empVendorMapLoading, setEmpVendorMapLoading] = useState(false);
  var [empVendorMapName, setEmpVendorMapName] = useState('');

  function getStatusColor(status) {
    switch (status) {
      case 'checked in': return theme.success;
      case 'checked out': return theme.info;
      case 'present': return theme.success;
      case 'absent': return theme.error;
      case 'half-day': return theme.warning;
      case 'leave': return theme.info;
      default: return theme.textTertiary;
    }
  }

  function getStatusBg(status) {
    switch (status) {
      case 'checked in': return theme.successBg;
      case 'checked out': return theme.infoBg;
      case 'present': return theme.successBg;
      case 'absent': return theme.errorBg;
      case 'half-day': return theme.warningBg;
      case 'leave': return theme.infoBg;
      default: return theme.surfaceVariant;
    }
  }

  function getAccentColor(status) {
    switch (status) {
      case 'checked in': return theme.success;
      case 'checked out': return theme.info;
      case 'present': return theme.success;
      case 'absent': return theme.error;
      case 'half-day': return theme.warning;
      case 'leave': return theme.info;
      default: return theme.primary;
    }
  }

  var fetchEmployees = useCallback(function(page, isRefresh) {
    var token = user && user.token ? user.token : '';
    if (isRefresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    fetch(BASE_URL + '/api/users/employee-list?page=' + page + '&limit=5', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    })
      .then(function(response) { return response.json(); })
      .then(function(result) {
        if (result.status === 200 && result.data) {
          if (page === 1) {
            setEmployees(result.data);
          } else {
            setEmployees(function(prev) { return prev.concat(result.data); });
          }
          if (result.pagination) {
            setCurrentPage(result.pagination.current_page);
            setTotalPages(result.pagination.total_pages);
            setTotalRecords(result.pagination.total_records);
          }
        }
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      })
      .catch(function(err) {
        console.log('Employee list fetch error:', err);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      });
  }, [user]);

  useEffect(function() {
    fetchEmployees(1, false);
  }, [fetchEmployees]);

  var onRefresh = function() {
    fetchEmployees(1, true);
  };

  var loadMore = function() {
    if (loadingMore || currentPage >= totalPages) return;
    fetchEmployees(currentPage + 1, false);
  };

  var openEmployee = function(emp) {
    setSelectedEmployee(emp);
    setShowEmployeeModal(true);
    setEmployeeDetailLoading(true);
    var token = user && user.token ? user.token : '';
    var userId = (emp.user_id && typeof emp.user_id === 'object' ? emp.user_id._id : emp.user_id) || emp._id || emp.id || '';
    fetch(BASE_URL + '/api/users/details?user_id=' + userId, {
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
            designation_name: data.data.designation_name || emp.designation_name || emp.designation || '',
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
    var userId = selectedEmployee.user_id || selectedEmployee._id || '';
    var empName = selectedEmployee.full_name || 'Employee';
    setEmpVendorMapName(empName);
    setEmpVendorMapLoading(true);
    setShowEmpVendorMap(true);
    setEmpVendorVisits([]);
    var token = user && user.token ? user.token : '';
    fetch(BASE_URL + '/api/vendor-visits/user/' + userId, {
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

  var checkedInCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'checked in'; }).length;
  var checkedOutCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'checked out'; }).length;

  var renderEmployee = function({ item: emp, index }) {
    var empName = emp.full_name || 'Employee';
    var empStatus = (emp.status || '').toLowerCase();
    var accentColor = getAccentColor(empStatus);
    return (
      <TouchableOpacity
        key={emp._id || index}
        style={[styles.empCard, { backgroundColor: theme.surface }]}
        onPress={function() { openEmployee(emp); }}
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View style={[styles.empAccentBar, { backgroundColor: accentColor }]} />

        <View style={styles.empCardInner}>
          {/* Avatar */}
          <View style={[styles.empAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.empAvatarText}>
              {empName.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.empInfo}>
            <Text style={[styles.empName, { color: theme.text }]} numberOfLines={1}>{empName}</Text>
            <Text style={[styles.empDesig, { color: theme.textSecondary }]} numberOfLines={1}>{emp.email || ''}</Text>
            <Text style={[styles.empHq, { color: theme.textTertiary }]} numberOfLines={1}>
              {emp.headquarter_name || ''}{emp.working_town ? ' | ' + emp.working_town : ''}
            </Text>
            <View style={styles.empMetaRow}>
              <Text style={[styles.empMetaText, { color: theme.textTertiary }]}>{emp.check_in_time || '--'}</Text>
              <Text style={[styles.empMetaDot, { color: theme.divider }]}> - </Text>
              <Text style={[styles.empMetaText, { color: theme.textTertiary }]}>{emp.check_out_time || '--'}</Text>
              <Text style={[styles.empMetaSep, { color: theme.divider }]}>  |  </Text>
              <Text style={[styles.empMetaText, { color: theme.textTertiary }]}>{emp.total_km || 0} km</Text>
              <Text style={[styles.empMetaSep, { color: theme.divider }]}>  |  </Text>
              <Text style={[styles.empMetaText, { color: theme.textTertiary }]}>{emp.hours || '0h 0m'}</Text>
            </View>
          </View>

          {/* Right: Status chip + date */}
          <View style={styles.empRight}>
            <View style={[styles.empStatusChip, { backgroundColor: getStatusBg(empStatus) }]}>
              <View style={[styles.empStatusDot, { backgroundColor: getStatusColor(empStatus) }]} />
              <Text style={[styles.empStatusText, { color: getStatusColor(empStatus) }]}>
                {getStatusLabel(empStatus)}
              </Text>
            </View>
            <Text style={[styles.empDateText, { color: theme.textTertiary }]}>{formatDate(emp.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  var renderFooter = function() {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.footerText, { color: theme.textTertiary }]}>Loading more...</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={[styles.decorCircle3, { backgroundColor: theme.secondary + '26' }]} />

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backArrow}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Employees</Text>
          <View style={styles.navSpacer} />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statEmojiWrap, { backgroundColor: theme.primary + '1A' }]}>
              <Text style={styles.statEmoji}>{'👥'}</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{totalRecords}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>TOTAL</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statEmojiWrap, { backgroundColor: theme.success + '1A' }]}>
              <Text style={styles.statEmoji}>{'✅'}</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.success }]}>{checkedInCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>CHECKED IN</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statEmojiWrap, { backgroundColor: theme.info + '1A' }]}>
              <Text style={styles.statEmoji}>{'🚪'}</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.info }]}>{checkedOutCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>CHECKED OUT</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Employee List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading employees...</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={function(item, index) { return item._id || String(index); }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.primary + '1A' }]}>
                <Text style={styles.emptyIcon}>{'👤'}</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Employees Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>There are no employee records to display</Text>
            </View>
          }
        />
      )}

      {/* Pagination Info */}
      {!loading && totalPages > 0 && (
        <View style={[styles.paginationBar, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={[styles.paginationText, { color: theme.textTertiary }]}>
            Page {currentPage} of {totalPages} ({totalRecords} records)
          </Text>
        </View>
      )}

      {/* Employee Detail Modal */}
      <Modal visible={showEmployeeModal} transparent={true} animationType="slide" onRequestClose={function() { setShowEmployeeModal(false); }}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>Employee Details</Text>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]} onPress={function() { setShowEmployeeModal(false); }}>
                  <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              {employeeDetailLoading ? (
                <ActivityIndicator size="large" color={theme.secondary} style={{ marginTop: 40, marginBottom: 40 }} />
              ) : selectedEmployee ? (
                <View>
                  {/* Profile Section */}
                  <View style={styles.modalProfile}>
                    <View style={[styles.modalAvatar, { backgroundColor: theme.primary }]}>
                      <Text style={styles.modalAvatarText}>
                        {(selectedEmployee.full_name || selectedEmployee.name || 'E').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.modalProfileName, { color: theme.text }]}>{selectedEmployee.full_name || selectedEmployee.name || 'Employee'}</Text>
                    <Text style={[styles.modalProfileDesig, { color: theme.textSecondary }]}>{selectedEmployee.designation_name || selectedEmployee.designation || ''}</Text>
                    <View style={[styles.empStatusChip, { backgroundColor: getStatusBg((selectedEmployee.status || 'present').toLowerCase()), alignSelf: 'center', marginTop: 10 }]}>
                      <View style={[styles.empStatusDot, { backgroundColor: getStatusColor((selectedEmployee.status || 'present').toLowerCase()) }]} />
                      <Text style={[styles.empStatusText, { color: getStatusColor((selectedEmployee.status || 'present').toLowerCase()) }]}>
                        {getStatusLabel((selectedEmployee.status || 'present').toLowerCase())}
                      </Text>
                    </View>
                  </View>

                  {/* Detail Rows */}
                  <View style={[styles.modalDetailRow, { borderBottomColor: theme.divider }]}>
                    <View style={[styles.modalDetailIconWrap, { backgroundColor: theme.primary + '1A' }]}>
                      <Text style={styles.modalDetailIcon}>{'🏢'}</Text>
                    </View>
                    <View style={styles.modalDetailTextWrap}>
                      <Text style={[styles.modalDetailLabel, { color: theme.textTertiary }]}>Headquarter</Text>
                      <Text style={[styles.modalDetailValue, { color: theme.text }]}>{selectedEmployee.headquarter_name || selectedEmployee.hq || '--'}</Text>
                    </View>
                  </View>

                  <View style={[styles.modalDetailRow, { borderBottomColor: theme.divider }]}>
                    <View style={[styles.modalDetailIconWrap, { backgroundColor: theme.info + '1A' }]}>
                      <Text style={styles.modalDetailIcon}>{'📱'}</Text>
                    </View>
                    <View style={styles.modalDetailTextWrap}>
                      <Text style={[styles.modalDetailLabel, { color: theme.textTertiary }]}>Phone</Text>
                      <Text style={[styles.modalDetailValue, { color: theme.text }]}>{selectedEmployee.phone_number || selectedEmployee.phone || '--'}</Text>
                    </View>
                  </View>

                  <View style={[styles.modalDetailRow, { borderBottomColor: theme.divider }]}>
                    <View style={[styles.modalDetailIconWrap, { backgroundColor: theme.warning + '1A' }]}>
                      <Text style={styles.modalDetailIcon}>{'⏰'}</Text>
                    </View>
                    <View style={styles.modalDetailTextWrap}>
                      <Text style={[styles.modalDetailLabel, { color: theme.textTertiary }]}>Check In Time</Text>
                      <Text style={[styles.modalDetailValue, { color: theme.text }]}>{selectedEmployee.check_in_time || selectedEmployee.start_time || selectedEmployee.checkIn || 'Not checked in'}</Text>
                    </View>
                  </View>

                  {/* Stats Cards in Modal */}
                  <View style={styles.modalStatsRow}>
                    <TouchableOpacity style={[styles.modalStatCard, { backgroundColor: theme.successBg }]} onPress={openEmpVendorMap} activeOpacity={0.7}>
                      <View style={[styles.modalStatEmojiWrap, { backgroundColor: theme.success + '1A' }]}>
                        <Text style={styles.modalStatEmoji}>{'🏪'}</Text>
                      </View>
                      <Text style={[styles.modalStatValue, { color: theme.success }]}>{selectedEmployee.vendor_visits != null ? selectedEmployee.vendor_visits : (selectedEmployee.vendors || 0)}</Text>
                      <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>VENDOR VISITS</Text>
                      <Text style={[styles.modalStatTap, { color: theme.success }]}>Tap to view map</Text>
                    </TouchableOpacity>
                    <View style={[styles.modalStatCard, { backgroundColor: theme.surfaceVariant }]}>
                      <View style={[styles.modalStatEmojiWrap, { backgroundColor: theme.secondary + '1A' }]}>
                        <Text style={styles.modalStatEmoji}>{'💰'}</Text>
                      </View>
                      <Text style={[styles.modalStatValue, { color: theme.secondary }]}>
                        {'\u20B9'}{selectedEmployee.total_allowance != null ? selectedEmployee.total_allowance : (selectedEmployee.allowance || selectedEmployee.daily_allowance || 0)}
                      </Text>
                      <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>ALLOWANCE</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Employee Vendor Visits Map Modal */}
      <Modal visible={showEmpVendorMap} animationType="slide" onRequestClose={function() { setShowEmpVendorMap(false); }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Map Modal Header */}
          <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={[styles.decorCircle3, { backgroundColor: theme.secondary + '26' }]} />

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={function() { setShowEmpVendorMap(false); }}>
                <Text style={styles.backArrow}>{'\u2039'}</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Vendor Map</Text>
              <View style={styles.navSpacer} />
            </View>
            <Text style={styles.mapSubtitle}>{empVendorMapName}'s Visits</Text>

            {/* Map Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.statEmojiWrap, { backgroundColor: theme.primary + '1A' }]}>
                  <Text style={styles.statEmoji}>{'📍'}</Text>
                </View>
                <Text style={[styles.statNumber, { color: theme.text }]}>{empVendorVisits.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>TOTAL</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.statEmojiWrap, { backgroundColor: theme.success + '1A' }]}>
                  <Text style={styles.statEmoji}>{'✅'}</Text>
                </View>
                <Text style={[styles.statNumber, { color: theme.success }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === true || v.on_board === 'true' || v.is_onboarded === true || v.is_onboarded === 'true'; }).length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>ONBOARDED</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.statEmojiWrap, { backgroundColor: theme.warning + '1A' }]}>
                  <Text style={styles.statEmoji}>{'⏳'}</Text>
                </View>
                <Text style={[styles.statNumber, { color: theme.warning }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === false || v.on_board === 'false' || v.is_onboarded === false || v.is_onboarded === 'false'; }).length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>PENDING</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Map Container */}
          <View style={[styles.mapContainer, { backgroundColor: theme.surface }]}>
            {empVendorMapLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading vendor visits...</Text>
              </View>
            ) : generateEmpVendorMapHTML(empVendorVisits, empVendorMapName) ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: generateEmpVendorMapHTML(empVendorVisits, empVendorMapName) }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            ) : (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.warning + '1A' }]}>
                  <Text style={styles.emptyIcon}>{'🗺'}</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Visits Found</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>No vendor visits with GPS data found for this employee</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Header ── */
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 10,
  },
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 70,
    left: -40,
  },
  decorCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -20,
    right: 60,
  },

  /* ── Nav Row ── */
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  navSpacer: {
    width: 38,
  },
  mapSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },

  /* ── Stats Cards ── */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statEmoji: {
    fontSize: 18,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  /* ── List ── */
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  /* ── Employee Card ── */
  empCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  empAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  empCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 16,
  },
  empAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  empInfo: {
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
  empMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  empMetaText: {
    fontSize: 10,
    fontWeight: '600',
  },
  empMetaDot: {
    fontSize: 10,
  },
  empMetaSep: {
    fontSize: 10,
  },
  empRight: {
    alignItems: 'flex-end',
  },
  empStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
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
  empDateText: {
    fontSize: 10,
    marginTop: 4,
  },

  /* ── Loading ── */
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },

  /* ── Empty State ── */
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },

  /* ── Footer / Pagination ── */
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    marginLeft: 8,
  },
  paginationBar: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '85%',
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
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalProfile: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  modalProfileName: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalProfileDesig: {
    fontSize: 14,
    marginTop: 4,
  },

  /* ── Modal Detail Rows ── */
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalDetailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalDetailIcon: {
    fontSize: 20,
  },
  modalDetailTextWrap: {
    flex: 1,
  },
  modalDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },

  /* ── Modal Stats ── */
  modalStatsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalStatCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  modalStatEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalStatEmoji: {
    fontSize: 18,
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  modalStatTap: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  /* ── Map Container (reused in vendor map modal) ── */
  mapContainer: {
    flex: 1,
    margin: 14,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
});
