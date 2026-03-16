import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getStatusColor(status) {
  switch (status) {
    case 'present': return '#4caf50';
    case 'absent': return '#e53935';
    case 'half-day': return '#ff9800';
    case 'leave': return '#1565c0';
    case 'weekend': return '#9e9e9e';
    default: return '#bdbdbd';
  }
}

function getStatusBg(status) {
  switch (status) {
    case 'present': return '#e8f5e9';
    case 'absent': return '#ffebee';
    case 'half-day': return '#fff3e0';
    case 'leave': return '#e3f2fd';
    case 'weekend': return '#f5f5f5';
    default: return '#f5f5f5';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'present': return 'Present';
    case 'absent': return 'Absent';
    case 'half-day': return 'Half Day';
    case 'leave': return 'On Leave';
    case 'weekend': return 'Weekend';
    default: return '--';
  }
}

function parseRecords(data) {
  var items = Array.isArray(data) ? data : (data && typeof data === 'object' ? (function() {
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    return [];
  })() : []);

  return items.map(function(item) {
    var dateStr = item.date || item.check_in_time || item.attendance_date || item.created_at || '';
    var d = new Date(dateStr);
    var dayNum = isNaN(d.getTime()) ? '' : d.getDate();
    var dayName = isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()];

    var rawStatus = (item.status || '').toLowerCase().trim();
    var status = 'present';
    if (rawStatus === 'absent') status = 'absent';
    else if (rawStatus === 'half-day' || rawStatus === 'half day') status = 'half-day';
    else if (rawStatus === 'leave' || rawStatus === 'on leave') status = 'leave';
    else if (rawStatus === 'weekend') status = 'weekend';
    else if (rawStatus === 'checked_in' || rawStatus === 'checked in' || rawStatus === 'present' || rawStatus === 'checked_out' || rawStatus === 'checked out') status = 'present';

    var checkIn = item.start_time || item.check_in_time || item.check_in || item.checkIn || null;
    var checkOut = item.end_time || item.check_out_time || item.check_out || item.checkOut || null;

    var hours = null;
    if (item.hours || item.working_hours || item.total_hours) {
      hours = item.hours || item.working_hours || item.total_hours;
    }

    var totalKm = item.total_km || null;

    return {
      date: dayNum,
      day: dayName,
      status: status,
      checkIn: checkIn,
      checkOut: checkOut,
      hours: hours,
      totalKm: totalKm,
      fullName: item.full_name || '',
      headquarter: item.headquarter_name || '',
      workingTown: item.working_town || '',
      route: item.route || '',
      rawDate: d,
    };
  });
}

export default function AttendanceScreen({ user, onGoBack }) {
  var today = new Date();
  var [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  var [selectedYear, setSelectedYear] = useState(today.getFullYear());
  var [allRecords, setAllRecords] = useState([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);

  var fetchAttendance = function() {
    var token = user && user.token ? user.token : '';
    return fetch('http://192.168.1.2:5000/api/attendance/history', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    })
      .then(function(response) {
        return response.text();
      })
      .then(function(text) {
        console.log('Attendance API Raw Response:', text);
        var data = JSON.parse(text);
        var attendanceList = [];
        if (data && data.attendance && Array.isArray(data.attendance)) {
          attendanceList = data.attendance;
        } else if (data && data.data && Array.isArray(data.data)) {
          attendanceList = data.data;
        } else if (Array.isArray(data)) {
          attendanceList = data;
        }
        var records = parseRecords(attendanceList);
        setAllRecords(records);
      })
      .catch(function(err) {
        console.log('Attendance fetch error:', err);
        Alert.alert('Error', 'Failed to load attendance: ' + err.message);
      });
  };

  useEffect(function() {
    setLoading(true);
    fetchAttendance().finally(function() {
      setLoading(false);
    });
  }, []);

  var onRefresh = function() {
    setRefreshing(true);
    fetchAttendance().finally(function() {
      setRefreshing(false);
    });
  };

  // Filter records by selected month/year
  var records = allRecords.filter(function(r) {
    if (!r.rawDate || isNaN(r.rawDate.getTime())) return false;
    return r.rawDate.getMonth() === selectedMonth && r.rawDate.getFullYear() === selectedYear;
  });

  var presentCount = records.filter(function(r) { return r.status === 'present'; }).length;
  var absentCount = records.filter(function(r) { return r.status === 'absent'; }).length;
  var halfDayCount = records.filter(function(r) { return r.status === 'half-day'; }).length;
  var leaveCount = records.filter(function(r) { return r.status === 'leave'; }).length;

  var goToPrevMonth = function() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  var goToNextMonth = function() {
    var isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();
    if (isCurrentMonth) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  var isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

  var fullName = user && user.fullName ? user.fullName : 'Employee';

  var renderRecord = function(item) {
    return (
      <View style={styles.recordCard}>
        <View style={styles.recordLeft}>
          <View style={[styles.dateBox, { backgroundColor: getStatusBg(item.status) }]}>
            <Text style={[styles.dateNum, { color: getStatusColor(item.status) }]}>{item.date}</Text>
            <Text style={[styles.dateDay, { color: getStatusColor(item.status) }]}>{item.day}</Text>
          </View>
        </View>
        <View style={styles.recordMiddle}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          {item.checkIn ? (
            <Text style={styles.recordTime}>
              {item.checkIn}{item.checkOut ? ' - ' + item.checkOut : ''}
            </Text>
          ) : null}
        </View>
        <View style={styles.recordRight}>
          {item.totalKm ? (
            <View>
              <Text style={styles.hoursValue}>{item.totalKm}</Text>
              <Text style={styles.hoursLabel}>KM</Text>
            </View>
          ) : item.hours ? (
            <View>
              <Text style={styles.hoursValue}>{item.hours}h</Text>
              <Text style={styles.hoursLabel}>Hours</Text>
            </View>
          ) : (
            <Text style={styles.hoursLabel}>--</Text>
          )}
        </View>
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

        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{MONTHS[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
          >
            <Text style={[styles.monthArrowText, isCurrentMonth && styles.monthArrowTextDisabled]}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565c0" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565c0']} />
          }
        >
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.summaryCount, { color: '#4caf50' }]}>{presentCount}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#ffebee' }]}>
              <Text style={[styles.summaryCount, { color: '#e53935' }]}>{absentCount}</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#fff3e0' }]}>
              <Text style={[styles.summaryCount, { color: '#ff9800' }]}>{halfDayCount}</Text>
              <Text style={styles.summaryLabel}>Half Day</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
              <Text style={[styles.summaryCount, { color: '#1565c0' }]}>{leaveCount}</Text>
              <Text style={styles.summaryLabel}>Leave</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Daily Records</Text>

          {records.map(function(item, index) {
            return (
              <View key={index}>
                {renderRecord(item)}
              </View>
            );
          })}

          {records.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No records for this month</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
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
    paddingBottom: 20,
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  monthArrow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  monthArrowDisabled: {
    opacity: 0.3,
  },
  monthArrowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  monthArrowTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  monthText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: 15,
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  recordLeft: {
    marginRight: 12,
  },
  dateBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  dateDay: {
    fontSize: 10,
    fontWeight: '600',
  },
  recordMiddle: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  recordRight: {
    alignItems: 'center',
    minWidth: 45,
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  hoursLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
  },
});
