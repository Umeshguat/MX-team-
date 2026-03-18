import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

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

export default function AttendanceScreen({ user, onGoBack }) {
  var [records, setRecords] = useState([]);
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
        console.log('Attendance API response:', JSON.stringify(result));
        if (result.status === 200 && Array.isArray(result.data)) {
          if (page === 1 || isRefresh) {
            setRecords(result.data);
          } else {
            setRecords(function(prev) { return prev.concat(result.data); });
          }
          if (result.pagination) {
            setCurrentPage(result.pagination.current_page);
            setTotalPages(result.pagination.total_pages);
            setTotalRecords(result.pagination.total_records);
          }
        } else {
          console.log('Unexpected response format:', result);
          if (page === 1 || isRefresh) {
            setRecords([]);
          }
        }
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      })
      .catch(function(err) {
        console.log('Attendance fetch error:', err);
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

  var checkedInCount = records.filter(function(r) { return (r.status || '').toLowerCase() === 'checked in'; }).length;
  var checkedOutCount = records.filter(function(r) { return (r.status || '').toLowerCase() === 'checked out'; }).length;

  var fullName = user && user.fullName ? user.fullName : (user && user.full_name ? user.full_name : 'Employee');

  var renderRecord = function({ item }) {
    var d = new Date(item.date);
    var dayNum = isNaN(d.getTime()) ? '--' : d.getDate();
    var dayName = isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()];
    var status = (item.status || '').toLowerCase();

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordLeft}>
          <View style={[styles.dateBox, { backgroundColor: getStatusBg(status) }]}>
            <Text style={[styles.dateNum, { color: getStatusColor(status) }]}>{dayNum}</Text>
            <Text style={[styles.dateDay, { color: getStatusColor(status) }]}>{dayName}</Text>
          </View>
        </View>
        <View style={styles.recordMiddle}>
          <Text style={styles.recordName}>{item.full_name || ''}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBg(status) }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusBadgeText, { color: getStatusColor(status) }]}>
              {getStatusLabel(status)}
            </Text>
          </View>
          <Text style={styles.recordTime}>
            {item.check_in_time || '--'} - {item.check_out_time || '--'}
          </Text>
          <Text style={styles.recordMeta}>
            {item.headquarter_name || ''}{item.working_town ? ' | ' + item.working_town : ''}{item.route ? ' | ' + item.route : ''}
          </Text>
        </View>
        <View style={styles.recordRight}>
          <Text style={styles.kmValue}>{item.total_km != null ? item.total_km : 0}</Text>
          <Text style={styles.kmLabel}>KM</Text>
          <View style={styles.hoursBadge}>
            <Text style={styles.hoursValue}>{item.hours || '0h 0m'}</Text>
          </View>
        </View>
      </View>
    );
  };

  var renderFooter = function() {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1565c0" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  var renderHeader = function() {
    return (
      <View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[styles.summaryCount, { color: '#4caf50' }]}>{checkedInCount}</Text>
            <Text style={styles.summaryLabel}>Checked In</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
            <Text style={[styles.summaryCount, { color: '#1565c0' }]}>{checkedOutCount}</Text>
            <Text style={styles.summaryLabel}>Checked Out</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#f3e5f5' }]}>
            <Text style={[styles.summaryCount, { color: '#9c27b0' }]}>{totalRecords}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Attendance Records</Text>
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
        <Text style={styles.headerSubtitle}>{fullName}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565c0" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={function(item, index) { return item._id || String(index); }}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565c0']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeader}
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(229, 57, 53, 0.2)', top: -50, right: -40,
  },
  circle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255, 87, 34, 0.15)', top: 60, left: -50,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  backText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginBottom: 5,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '600' },
  bodyContent: { padding: 16, paddingBottom: 30 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20,
  },
  summaryCard: {
    flex: 1, borderRadius: 14, padding: 12, marginHorizontal: 4, alignItems: 'center',
  },
  summaryCount: { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 15 },
  recordCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  recordLeft: { marginRight: 12 },
  dateBox: {
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  dateNum: { fontSize: 18, fontWeight: '800' },
  dateDay: { fontSize: 10, fontWeight: '600' },
  recordMiddle: { flex: 1 },
  recordName: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 3 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 4,
  },
  statusDotSmall: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  recordTime: { fontSize: 12, color: '#999', fontWeight: '500' },
  recordMeta: { fontSize: 10, color: '#bbb', fontWeight: '500', marginTop: 2 },
  recordRight: { alignItems: 'center', minWidth: 55 },
  kmValue: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  kmLabel: { fontSize: 10, color: '#999', fontWeight: '600' },
  hoursBadge: {
    backgroundColor: '#f0f0f5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  hoursValue: { fontSize: 11, fontWeight: '700', color: '#555' },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 40, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999', fontWeight: '600' },
  footerLoader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16,
  },
  footerText: { fontSize: 12, color: '#999', marginLeft: 8 },
  paginationBar: {
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  paginationText: { fontSize: 12, color: '#888', fontWeight: '600' },
});
