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

function getStatusColor(status) {
  switch (status) {
    case 'checked in': return '#4caf50';
    case 'checked out': return '#1565c0';
    case 'present': return '#4caf50';
    case 'absent': return '#e53935';
    case 'half-day': return '#ff9800';
    case 'leave': return '#1565c0';
    default: return '#bdbdbd';
  }
}

function getStatusBg(status) {
  switch (status) {
    case 'checked in': return '#e8f5e9';
    case 'checked out': return '#e3f2fd';
    case 'present': return '#e8f5e9';
    case 'absent': return '#ffebee';
    case 'half-day': return '#fff3e0';
    case 'leave': return '#e3f2fd';
    default: return '#f5f5f5';
  }
}

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
    return (
      <TouchableOpacity
        key={emp._id || index}
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
          <Text style={styles.empDesig}>{emp.email || ''}</Text>
          <Text style={styles.empHq}>{emp.headquarter_name || ''} {emp.working_town ? '| ' + emp.working_town : ''}</Text>
          <View style={styles.empMetaRow}>
            <Text style={styles.empMetaText}>{emp.check_in_time || '--'}</Text>
            <Text style={styles.empMetaDot}> - </Text>
            <Text style={styles.empMetaText}>{emp.check_out_time || '--'}</Text>
            <Text style={styles.empMetaSep}>  |  </Text>
            <Text style={styles.empMetaText}>{emp.total_km || 0} km</Text>
            <Text style={styles.empMetaSep}>  |  </Text>
            <Text style={styles.empMetaText}>{emp.hours || '0h 0m'}</Text>
          </View>
        </View>
        <View style={styles.empRight}>
          <View style={[styles.empStatusBadge, { backgroundColor: getStatusBg(empStatus) }]}>
            <View style={[styles.empStatusDot, { backgroundColor: getStatusColor(empStatus) }]} />
            <Text style={[styles.empStatusText, { color: getStatusColor(empStatus) }]}>
              {getStatusLabel(empStatus)}
            </Text>
          </View>
          <Text style={styles.empDateText}>{formatDate(emp.date)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  var renderFooter = function() {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#e53935" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Employees</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{totalRecords}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: '#4caf50' }]}>{checkedInCount}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: '#1565c0' }]}>{checkedOutCount}</Text>
            <Text style={styles.statLabel}>Checked Out</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={function(item, index) { return item._id || String(index); }}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e53935']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          }
        />
      )}

      {/* Pagination Info */}
      {!loading && totalPages > 0 && (
        <View style={styles.paginationBar}>
          <Text style={styles.paginationText}>
            Page {currentPage} of {totalPages} ({totalRecords} records)
          </Text>
        </View>
      )}

      {/* Employee Detail Modal */}
      <Modal visible={showEmployeeModal} transparent={true} animationType="slide" onRequestClose={function() { setShowEmployeeModal(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Employee Details</Text>
                <TouchableOpacity onPress={function() { setShowEmployeeModal(false); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedEmployee ? (
                <View>
                  <View style={styles.modalProfile}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>
                        {(selectedEmployee.full_name || 'E').split(' ').map(function(n) { return n[0]; }).join('').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalProfileName}>{selectedEmployee.full_name || 'Employee'}</Text>
                    <Text style={styles.modalProfileDesig}>{selectedEmployee.email || ''}</Text>
                    <View style={[styles.empStatusBadge, { backgroundColor: getStatusBg((selectedEmployee.status || '').toLowerCase()), alignSelf: 'center', marginTop: 8 }]}>
                      <View style={[styles.empStatusDot, { backgroundColor: getStatusColor((selectedEmployee.status || '').toLowerCase()) }]} />
                      <Text style={[styles.empStatusText, { color: getStatusColor((selectedEmployee.status || '').toLowerCase()) }]}>
                        {getStatusLabel((selectedEmployee.status || '').toLowerCase())}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>🏢</Text>
                    <View>
                      <Text style={styles.modalDetailLabel}>Headquarter</Text>
                      <Text style={styles.modalDetailValue}>{selectedEmployee.headquarter_name || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>🏙</Text>
                    <View>
                      <Text style={styles.modalDetailLabel}>Working Town</Text>
                      <Text style={styles.modalDetailValue}>{selectedEmployee.working_town || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>🛣</Text>
                    <View>
                      <Text style={styles.modalDetailLabel}>Route</Text>
                      <Text style={styles.modalDetailValue}>{selectedEmployee.route || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailIcon}>📅</Text>
                    <View>
                      <Text style={styles.modalDetailLabel}>Date</Text>
                      <Text style={styles.modalDetailValue}>{formatDate(selectedEmployee.date)}</Text>
                    </View>
                  </View>

                  <View style={styles.modalStatsRow}>
                    <View style={[styles.modalStatCard, { backgroundColor: '#e8f5e9' }]}>
                      <Text style={styles.modalStatIcon}>⏰</Text>
                      <Text style={[styles.modalStatValue, { color: '#4caf50', fontSize: 14 }]}>{selectedEmployee.check_in_time || '--'}</Text>
                      <Text style={styles.modalStatLabel}>Check In</Text>
                    </View>
                    <View style={[styles.modalStatCard, { backgroundColor: '#e3f2fd' }]}>
                      <Text style={styles.modalStatIcon}>⏱</Text>
                      <Text style={[styles.modalStatValue, { color: '#1565c0', fontSize: 14 }]}>{selectedEmployee.check_out_time || '--'}</Text>
                      <Text style={styles.modalStatLabel}>Check Out</Text>
                    </View>
                  </View>

                  <View style={styles.modalStatsRow}>
                    <View style={[styles.modalStatCard, { backgroundColor: '#fff3e0' }]}>
                      <Text style={styles.modalStatIcon}>🚗</Text>
                      <Text style={[styles.modalStatValue, { color: '#ff9800' }]}>{selectedEmployee.check_in_km || 0}</Text>
                      <Text style={styles.modalStatLabel}>Start KM</Text>
                    </View>
                    <View style={[styles.modalStatCard, { backgroundColor: '#fce4ec' }]}>
                      <Text style={styles.modalStatIcon}>🏁</Text>
                      <Text style={[styles.modalStatValue, { color: '#e53935' }]}>{selectedEmployee.check_out_km || '--'}</Text>
                      <Text style={styles.modalStatLabel}>End KM</Text>
                    </View>
                  </View>

                  <View style={styles.modalStatsRow}>
                    <View style={[styles.modalStatCard, { backgroundColor: '#f3e5f5' }]}>
                      <Text style={styles.modalStatIcon}>📏</Text>
                      <Text style={[styles.modalStatValue, { color: '#9c27b0' }]}>{selectedEmployee.total_km || 0} km</Text>
                      <Text style={styles.modalStatLabel}>Total KM</Text>
                    </View>
                    <View style={[styles.modalStatCard, { backgroundColor: '#e0f2f1' }]}>
                      <Text style={styles.modalStatIcon}>⏳</Text>
                      <Text style={[styles.modalStatValue, { color: '#00897b' }]}>{selectedEmployee.hours || '0h 0m'}</Text>
                      <Text style={styles.modalStatLabel}>Working Hours</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.viewMapBtn} onPress={openEmpVendorMap} activeOpacity={0.7}>
                    <Text style={styles.viewMapBtnText}>🗺  View Vendor Visits Map</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Employee Vendor Visits Map Modal */}
      <Modal visible={showEmpVendorMap} animationType="slide" onRequestClose={function() { setShowEmpVendorMap(false); }}>
        <View style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
          <View style={styles.empMapHeader}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backBtn} onPress={function() { setShowEmpVendorMap(false); }}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Vendor Map</Text>
              <View style={{ width: 60 }} />
            </View>
            <Text style={styles.empMapSubtitle}>{empVendorMapName}'s Visits</Text>
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statCount}>{empVendorVisits.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statCount, { color: '#4caf50' }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === true || v.on_board === 'true' || v.is_onboarded === true || v.is_onboarded === 'true'; }).length}
                </Text>
                <Text style={styles.statLabel}>Onboarded</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statCount, { color: '#ff9800' }]}>
                  {empVendorVisits.filter(function(v) { return v.on_board === false || v.on_board === 'false' || v.is_onboarded === false || v.is_onboarded === 'false'; }).length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, margin: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' }}>
            {empVendorMapLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#e53935" />
                <Text style={styles.loadingText}>Loading vendor visits...</Text>
              </View>
            ) : generateEmpVendorMapHTML(empVendorVisits, empVendorMapName) ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: generateEmpVendorMapHTML(empVendorVisits, empVendorMapName) }}
                style={{ flex: 1, borderRadius: 20 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺</Text>
                <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 }}>No vendor visits with GPS data found for this employee</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

var styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    zIndex: 10,
  },
  circle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(229, 57, 53, 0.2)', top: -50, right: -40 },
  circle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255, 87, 34, 0.15)', top: 60, left: -50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  backText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statsBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 20, marginTop: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statCount: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12 },
  bodyContent: { padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '700', color: '#999', marginTop: 12 },
  empCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  empAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  empAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '700', color: '#333' },
  empDesig: { fontSize: 12, color: '#777', marginTop: 2 },
  empHq: { fontSize: 11, color: '#999', marginTop: 1 },
  empMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  empMetaText: { fontSize: 10, color: '#888', fontWeight: '600' },
  empMetaDot: { fontSize: 10, color: '#ccc' },
  empMetaSep: { fontSize: 10, color: '#ddd' },
  empRight: { alignItems: 'flex-end' },
  empStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  empStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  empStatusText: { fontSize: 11, fontWeight: '700' },
  empDateText: { fontSize: 10, color: '#999', marginTop: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#999', fontWeight: '600' },
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  footerText: { fontSize: 12, color: '#999', marginLeft: 8 },
  paginationBar: {
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  paginationText: { fontSize: 12, color: '#888', fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 22, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  modalClose: { fontSize: 22, color: '#999', fontWeight: '700', padding: 4 },
  modalProfile: { alignItems: 'center', marginBottom: 20 },
  modalAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalAvatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  modalProfileName: { fontSize: 20, fontWeight: '800', color: '#333' },
  modalProfileDesig: { fontSize: 14, color: '#777', marginTop: 4 },
  modalDetailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalDetailIcon: { fontSize: 22, marginRight: 14 },
  modalDetailLabel: { fontSize: 12, color: '#999', fontWeight: '600' },
  modalDetailValue: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 2 },
  modalStatsRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  modalStatCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  modalStatIcon: { fontSize: 22, marginBottom: 4 },
  modalStatValue: { fontSize: 18, fontWeight: '900' },
  modalStatLabel: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 4 },
  viewMapBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 10,
  },
  viewMapBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Emp Map Modal
  empMapHeader: {
    backgroundColor: '#1a1a2e', paddingTop: 50, paddingBottom: 18, paddingHorizontal: 25,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden',
  },
  empMapSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 4 },
});
