import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL } from '../config';

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

export default function AdminAttendanceListScreen({ user, onGoBack }) {
  var [employees, setEmployees] = useState([]);
  var [loading, setLoading] = useState(true);
  var [attendanceWeek] = useState(generateAttendanceData);

  useEffect(function() {
    var token = user && user.token ? user.token : '';
    fetch(BASE_URL + '/api/users/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    })
      .then(function(response) { return response.json(); })
      .then(function(result) {
        if (result.status === 200 && result.data) {
          var emps = result.data.employees_check_in || result.data.employees || result.data.users || result.data.team || [];
          setEmployees(emps);
        }
        setLoading(false);
      })
      .catch(function(err) {
        console.log('Attendance list fetch error:', err);
        setLoading(false);
      });
  }, []);

  var presentCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'present'; }).length;
  var absentCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'absent'; }).length;
  var halfDayCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'half-day'; }).length;
  var leaveCount = employees.filter(function(e) { return (e.status || '').toLowerCase() === 'leave'; }).length;

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
            <Text style={[styles.statCount, { color: '#4caf50' }]}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: '#ff9800' }]}>{halfDayCount}</Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: '#e53935' }]}>{absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: '#1565c0' }]}>{leaveCount}</Text>
            <Text style={styles.statLabel}>Leave</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          {/* Weekly Chart */}
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

          {/* Attendance Bar */}
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.attendanceBar}>
            <View style={[styles.attendanceSegment, { flex: presentCount || 0.01, backgroundColor: '#4caf50' }]} />
            <View style={[styles.attendanceSegment, { flex: halfDayCount || 0.01, backgroundColor: '#ff9800' }]} />
            <View style={[styles.attendanceSegment, { flex: absentCount || 0.01, backgroundColor: '#e53935' }]} />
            <View style={[styles.attendanceSegment, { flex: leaveCount || 0.01, backgroundColor: '#1565c0' }]} />
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
              <Text style={styles.legendText}>Present ({presentCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.legendText}>Half Day ({halfDayCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e53935' }]} />
              <Text style={styles.legendText}>Absent ({absentCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1565c0' }]} />
              <Text style={styles.legendText}>Leave ({leaveCount})</Text>
            </View>
          </View>

          {/* Employee Attendance List */}
          <Text style={styles.sectionTitle}>Employee Attendance</Text>
          {employees.map(function(emp, index) {
            var empName = emp.full_name || emp.name || 'Employee';
            var empCheckIn = emp.check_in_time || emp.checkIn || null;
            var empStatus = emp.status ? emp.status.toLowerCase() : (empCheckIn ? 'present' : 'absent');
            return (
              <View key={emp._id || emp.id || index} style={styles.attendanceRow}>
                <View style={styles.attendanceLeft}>
                  <Text style={styles.attendanceName}>{empName}</Text>
                  <Text style={styles.attendanceDesig}>{emp.designation_name || emp.designation || ''}</Text>
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
        </ScrollView>
      )}
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
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '700', color: '#999', marginTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginTop: 6, marginBottom: 15 },
  // Weekly chart
  weekChart: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  weekDay: { alignItems: 'center', flex: 1 },
  barWrapper: { alignItems: 'center', marginBottom: 8 },
  bar: { width: 22, borderRadius: 4 },
  weekDayLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  // Legend
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#666', fontWeight: '600' },
  // Attendance bar
  attendanceBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 12 },
  attendanceSegment: { height: 14 },
  // Attendance rows
  attendanceRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  attendanceLeft: { flex: 1 },
  attendanceName: { fontSize: 15, fontWeight: '700', color: '#333' },
  attendanceDesig: { fontSize: 12, color: '#777', marginTop: 2 },
  attendanceCheckIn: { fontSize: 12, color: '#999', marginTop: 2 },
  attendanceStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  attendanceStatusText: { fontSize: 12, fontWeight: '700' },
});
