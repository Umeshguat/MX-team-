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
import { useTheme } from '../theme/ThemeContext';

var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getStatusColor(status, theme) {
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

function getStatusBg(status, theme) {
  switch (status) {
    case 'checked in': return theme.successBg;
    case 'checked out': return theme.infoBg;
    case 'present': return theme.successBg;
    case 'absent': return theme.errorBg;
    case 'half-day': return theme.warningBg;
    case 'leave': return theme.infoBg;
    default: return theme.background;
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

function getStatusEmoji(status) {
  switch (status) {
    case 'checked in': return '✅';
    case 'checked out': return '🔵';
    case 'present': return '✅';
    case 'absent': return '❌';
    case 'half-day': return '🟡';
    case 'leave': return '🏖️';
    default: return '⏳';
  }
}

export default function AdminAttendanceListScreen({ user, onGoBack }) {
  const { theme } = useTheme();

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
    var statusColor = getStatusColor(empStatus, theme);
    var initial = empName.charAt(0).toUpperCase();
    var locationParts = [emp.headquarter_name, emp.working_town, emp.route].filter(Boolean);
    var locationStr = locationParts.join(' | ');

    return (
      <View style={[styles.attendanceCard, { backgroundColor: theme.surface }]}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

        <View style={styles.cardInner}>
          {/* Top row: avatar + name + status chip */}
          <View style={styles.cardTopRow}>
            <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.avatarText, { color: statusColor }]}>{initial}</Text>
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.empName, { color: theme.text }]} numberOfLines={1}>{empName}</Text>
              {emp.email ? (
                <Text style={[styles.empEmail, { color: theme.textTertiary }]} numberOfLines={1}>{emp.email}</Text>
              ) : null}
            </View>
            <View style={[styles.statusChip, { backgroundColor: getStatusBg(empStatus, theme) }]}>
              <Text style={[styles.statusChipText, { color: statusColor }]}>
                {getStatusEmoji(empStatus)} {getStatusLabel(empStatus)}
              </Text>
            </View>
          </View>

          {/* Time info row with dividers */}
          <View style={[styles.timeRow, { borderTopColor: theme.divider }]}>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>DATE</Text>
              <Text style={[styles.timeValue, { color: theme.text }]}>{dayNum} {dayName}</Text>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>CHECK IN</Text>
              <Text style={[styles.timeValue, { color: theme.success }]}>{emp.check_in_time || '--'}</Text>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>CHECK OUT</Text>
              <Text style={[styles.timeValue, { color: theme.info }]}>{emp.check_out_time || '--'}</Text>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>DISTANCE</Text>
              <Text style={[styles.timeValue, { color: theme.primary }]}>{emp.total_km != null ? emp.total_km : 0} km</Text>
            </View>
          </View>

          {/* Location row */}
          {locationStr ? (
            <View style={styles.locationRow}>
              <Text style={[styles.locationText, { color: theme.textTertiary }]}>
                📍 {locationStr}
              </Text>
              {emp.hours ? (
                <Text style={[styles.hoursText, { color: theme.textSecondary }]}>⏱ {emp.hours}</Text>
              ) : null}
            </View>
          ) : emp.hours ? (
            <View style={styles.locationRow}>
              <Text style={[styles.hoursText, { color: theme.textSecondary }]}>⏱ {emp.hours}</Text>
            </View>
          ) : null}
        </View>
      </View>
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

  var renderSectionHeader = function() {
    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Attendance Records</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={[styles.circle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.circle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={[styles.circle3, { backgroundColor: theme.secondary + '26' }]} />

        {/* Nav Row */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack} activeOpacity={0.7}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statIconBox, { backgroundColor: theme.primary + '1A' }]}>
            <Text style={styles.statEmoji}>👥</Text>
          </View>
          <Text style={[styles.statNumber, { color: theme.text }]}>{totalRecords}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>TOTAL</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statIconBox, { backgroundColor: theme.successBg }]}>
            <Text style={styles.statEmoji}>✅</Text>
          </View>
          <Text style={[styles.statNumber, { color: theme.success }]}>{checkedInCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>CHECKED IN</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statIconBox, { backgroundColor: theme.infoBg }]}>
            <Text style={styles.statEmoji}>🔵</Text>
          </View>
          <Text style={[styles.statNumber, { color: theme.info }]}>{checkedOutCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>CHECKED OUT</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading attendance...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={function(item, index) { return item._id || String(index); }}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={employees.length > 0 ? renderSectionHeader : null}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.emptyIconBox, { backgroundColor: theme.primary + '1A' }]}>
                <Text style={styles.emptyIcon}>📋</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Records Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
                Attendance records will appear here once employees check in
              </Text>
            </View>
          }
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 0 && (
        <View style={[styles.paginationBar, { backgroundColor: theme.surface, borderTopColor: theme.divider }]}>
          <View style={styles.paginationInner}>
            <View style={[styles.pageNumberBox, { backgroundColor: theme.primary }]}>
              <Text style={styles.pageNumberText}>{currentPage}</Text>
            </View>
            <Text style={[styles.paginationLabel, { color: theme.textSecondary }]}>
              of {totalPages} pages
            </Text>
          </View>
          <View style={[styles.recordsBadge, { backgroundColor: theme.primary + '1A' }]}>
            <Text style={[styles.recordsBadgeText, { color: theme.primary }]}>{totalRecords} records</Text>
          </View>
        </View>
      )}
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
  circle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -40,
    right: -30,
  },
  circle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 70,
    left: -50,
  },
  circle3: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* ── Stats Cards ── */
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -1,
    paddingTop: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
    letterSpacing: 0.8,
    marginTop: 3,
  },

  /* ── Section Header ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* ── List Content ── */
  bodyContent: {
    padding: 16,
    paddingBottom: 30,
  },

  /* ── Attendance Card ── */
  attendanceCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },

  /* Card top row */
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  nameBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
  },
  empEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* Time info row */
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 2,
  },

  /* Location row */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  hoursText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },

  /* ── Loading ── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingCard: {
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    width: '100%',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
  },

  /* ── Empty State ── */
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginTop: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },

  /* ── Footer Loader ── */
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },

  /* ── Pagination ── */
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  paginationInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumberBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pageNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  paginationLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  recordsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  recordsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
