import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL } from '../config';

var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export default function AdminAttendanceListScreen({ user, onGoBack }) {
  var [employees, setEmployees] = useState([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [currentPage, setCurrentPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [totalRecords, setTotalRecords] = useState(0);
  var [loadingMore, setLoadingMore] = useState(false);

  var token = user && user.token ? user.token : '';

  var fetchAttendance = function(page, isRefresh) {
    if (isRefresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    fetch(BASE_URL + '/api/users/attendance-list?page=' + page + '&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    })
      .then(function(response) { return response.json(); })
      .then(function(result) {
        console.log('Admin Attendance API response:', JSON.stringify(result));
        if (result.status === 200 && Array.isArray(result.data)) {
          if (page === 1 || isRefresh) {
            setEmployees(result.data);
          } else {
            setEmployees(function(prev) { return prev.concat(result.data); });
          }
          if (result.pagination) {
            setCurrentPage(result.pagination.current_page);
            setTotalPages(result.pagination.total_pages);
            setTotalRecords(result.pagination.total_records);
          }
        } else {
          console.log('Unexpected response:', result);
          if (page === 1 || isRefresh) {
            setEmployees([]);
          }
        }
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      })
      .catch(function(err) {
        console.log('Attendance list fetch error:', err);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      });
  };

  useEffect(function() {
    fetchAttendance(1, false);
  }, []);

  var onRefresh = function() {
    setCurrentPage(1);
    fetchAttendance(1, true);
  };

  var loadMore = function() {
    if (loadingMore || currentPage >= totalPages) return;
    fetchAttendance(currentPage + 1, false);
  };

  var checkedInCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'checked in'; }).length;
  var checkedOutCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'checked out'; }).length;

  var renderEmployee = function({ item: emp, index }) {
    var empName = emp.full_name || 'Employee';
    var empStatus = (emp.status || '').toLowerCase();
    var d = new Date(emp.date);
    var dayNum = isNaN(d.getTime()) ? '--' : d.getDate();
    var dayName = isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()];

    return (
      <View style={styles.attendanceRow}>
        <View style={styles.dateBox}>
          <Text style={[styles.dateNum, { color: getStatusColor(empStatus) }]}>{dayNum}</Text>
          <Text style={[styles.dateDay, { color: getStatusColor(empStatus) }]}>{dayName}</Text>
        </View>
        <View style={styles.attendanceLeft}>
          <Text style={styles.attendanceName}>{empName}</Text>
          <Text style={styles.attendanceEmail}>{emp.email || ''}</Text>
          <Text style={styles.attendanceCheckIn}>
            {emp.check_in_time || '--'} - {emp.check_out_time || '--'}
          </Text>
          <Text style={styles.attendanceMeta}>
            {emp.headquarter_name || ''}{emp.working_town ? ' | ' + emp.working_town : ''}{emp.route ? ' | ' + emp.route : ''}
          </Text>
        </View>
        <View style={styles.attendanceRight}>
          <View style={[styles.attendanceStatusBadge, { backgroundColor: getStatusBg(empStatus) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(empStatus) }]} />
            <Text style={[styles.attendanceStatusText, { color: getStatusColor(empStatus) }]}>
              {getStatusLabel(empStatus)}
            </Text>
          </View>
          <Text style={styles.kmText}>{emp.total_km != null ? emp.total_km : 0} km</Text>
          <Text style={styles.hoursText}>{emp.hours || '0h 0m'}</Text>
        </View>
      </View>
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
          <Text style={styles.headerTitle}>Attendance</Text>
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
          <Text style={styles.loadingText}>Loading attendance...</Text>
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
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No attendance records found</Text>
            </View>
          }
        />
      )}

      {!loading && totalPages > 0 && (
        <View style={styles.paginationBar}>
          <Text style={styles.paginationText}>
            Page {currentPage} of {totalPages}  ({totalRecords} records)
          </Text>
        </View>
      )}
    </View>
  );
}

var styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  header: {
    backgroundColor: '#1a1a2e', paddingTop: 50, paddingBottom: 18, paddingHorizontal: 25,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', zIndex: 10,
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
  attendanceRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  dateBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#f5f5f7',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  dateNum: { fontSize: 18, fontWeight: '800' },
  dateDay: { fontSize: 10, fontWeight: '600' },
  attendanceLeft: { flex: 1 },
  attendanceName: { fontSize: 15, fontWeight: '700', color: '#333' },
  attendanceEmail: { fontSize: 11, color: '#999', marginTop: 1 },
  attendanceCheckIn: { fontSize: 12, color: '#777', marginTop: 3 },
  attendanceMeta: { fontSize: 10, color: '#bbb', marginTop: 2 },
  attendanceRight: { alignItems: 'flex-end', marginLeft: 8 },
  attendanceStatusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  attendanceStatusText: { fontSize: 11, fontWeight: '700' },
  kmText: { fontSize: 12, fontWeight: '700', color: '#1a1a2e', marginTop: 4 },
  hoursText: { fontSize: 10, color: '#999', fontWeight: '600', marginTop: 2 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 40, alignItems: 'center', elevation: 2 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999', fontWeight: '600' },
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  footerText: { fontSize: 12, color: '#999', marginLeft: 8 },
  paginationBar: {
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  paginationText: { fontSize: 12, color: '#888', fontWeight: '600' },
});
