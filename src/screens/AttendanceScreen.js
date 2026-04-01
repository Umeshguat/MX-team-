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
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

var { width } = Dimensions.get('window');
var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getStatusConfig(status, theme) {
  switch (status) {
    case 'checked in': return { color: theme.success, bg: theme.successBg, label: 'Checked In', icon: '⬤' };
    case 'checked out': return { color: theme.info, bg: theme.infoBg, label: 'Checked Out', icon: '◯' };
    case 'present': return { color: theme.success, bg: theme.successBg, label: 'Present', icon: '✓' };
    case 'absent': return { color: theme.error, bg: theme.errorBg, label: 'Absent', icon: '✕' };
    case 'half-day': return { color: theme.warning, bg: theme.warningBg, label: 'Half Day', icon: '◐' };
    case 'leave': return { color: theme.info, bg: theme.infoBg, label: 'On Leave', icon: '▬' };
    default: return { color: theme.textTertiary, bg: theme.surfaceVariant, label: '--', icon: '•' };
  }
}

export default function AttendanceScreen({ user, onGoBack }) {
  var { theme, isDark, fonts } = useTheme();
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
  var presentCount = records.filter(function(r) {
    var s = (r.status || '').toLowerCase();
    return s === 'present' || s === 'checked in' || s === 'checked out';
  }).length;

  var fullName = user && user.fullName ? user.fullName : (user && user.full_name ? user.full_name : 'Employee');
  var designation = user && user.designation ? user.designation : '';

  var renderRecord = function({ item, index }) {
    var d = new Date(item.date);
    var dayNum = isNaN(d.getTime()) ? '--' : d.getDate();
    var dayName = isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()];
    var monthName = isNaN(d.getTime()) ? '' : MONTHS[d.getMonth()];
    var status = (item.status || '').toLowerCase();
    var config = getStatusConfig(status, theme);

    return (
      <View style={[styles.recordCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: config.color }]} />

        <View style={styles.recordContent}>
          {/* Top row: Date + Status */}
          <View style={styles.recordTopRow}>
            <View style={styles.dateSection}>
              <View style={[styles.dateCircle, { backgroundColor: config.bg }]}>
                <Text style={[styles.dateNum, { color: config.color }]}>{dayNum}</Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={[styles.dayText, { color: theme.text }]}>{dayName}</Text>
                <Text style={[styles.monthText, { color: theme.textTertiary }]}>{monthName}</Text>
              </View>
            </View>

            <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusIcon, { color: config.color }]}>{config.icon}</Text>
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.recordDivider, { backgroundColor: theme.divider }]} />

          {/* Bottom row: Time + KM + Hours */}
          <View style={styles.recordBottomRow}>
            <View style={styles.timeBlock}>
              <Text style={[styles.blockLabel, { color: theme.textTertiary }]}>Check In</Text>
              <Text style={[styles.blockValue, { color: theme.text }]}>{item.check_in_time || '--:--'}</Text>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.timeBlock}>
              <Text style={[styles.blockLabel, { color: theme.textTertiary }]}>Check Out</Text>
              <Text style={[styles.blockValue, { color: theme.text }]}>{item.check_out_time || '--:--'}</Text>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.timeBlock}>
              <Text style={[styles.blockLabel, { color: theme.textTertiary }]}>Distance</Text>
              <Text style={[styles.blockValue, { color: theme.primary }]}>{item.total_km != null ? item.total_km : 0} km</Text>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.timeBlock}>
              <Text style={[styles.blockLabel, { color: theme.textTertiary }]}>Hours</Text>
              <Text style={[styles.blockValue, { color: theme.secondary }]}>{item.hours || '0h 0m'}</Text>
            </View>
          </View>

          {/* Location info */}
          {(item.headquarter_name || item.working_town || item.route) ? (
            <View style={[styles.locationRow, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="location-sharp" size={11} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.locationText, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.headquarter_name || ''}{item.working_town ? ' > ' + item.working_town : ''}{item.route ? ' > ' + item.route : ''}
              </Text>
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

  var renderHeader = function() {
    return (
      <View style={styles.headerContent}>
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
            <View style={[styles.statIconBg, { backgroundColor: theme.successBg }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            </View>
            <Text style={[styles.statNumber, { color: theme.success }]}>{presentCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Present</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
            <View style={[styles.statIconBg, { backgroundColor: theme.infoBg }]}>
              <Ionicons name="ellipse" size={16} color={theme.info} />
            </View>
            <Text style={[styles.statNumber, { color: theme.info }]}>{checkedOutCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Checked Out</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
            <View style={[styles.statIconBg, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }]}>
              <Ionicons name="bar-chart" size={16} color={theme.secondary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.secondary }]}>{totalRecords}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Total Records</Text>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIndicator, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Attendance History</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[theme.gradient1, theme.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative elements */}
        <View style={[styles.headerDecor1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.headerDecor2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={[styles.headerDecor3, { backgroundColor: theme.secondary, opacity: 0.15 }]} />

        {/* Nav Row */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backButton} onPress={onGoBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Attendance</Text>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* User Info in Header */}
        <View style={styles.userInfoRow}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
            {designation ? <Text style={styles.userRole}>{designation}</Text> : null}
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading attendance...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={function(item, index) { return item._id || String(index); }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="clipboard-outline" size={28} color={theme.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Records Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>Your attendance records will appear here</Text>
            </View>
          }
        />
      )}

      {/* Bottom Pagination */}
      {!loading && totalPages > 0 && (
        <View style={[styles.paginationBar, { backgroundColor: theme.surface, borderTopColor: theme.divider }]}>
          <View style={styles.paginationContent}>
            <View style={[styles.pageIndicator, { backgroundColor: theme.primary }]}>
              <Text style={styles.pageIndicatorText}>{currentPage}</Text>
            </View>
            <Text style={[styles.paginationText, { color: theme.textSecondary }]}>
              of {totalPages} pages
            </Text>
            <View style={[styles.recordsBadge, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.recordsBadgeText, { color: theme.textSecondary }]}>{totalRecords} records</Text>
            </View>
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

  /* ===== HEADER ===== */
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerDecor1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -40,
    right: -30,
  },
  headerDecor2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -20,
    left: -30,
  },
  headerDecor3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -100,
    left: width * 0.3,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Poppins-Regular',
    marginTop: -2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  headerRightPlaceholder: {
    width: 38,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-ExtraBold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  userRole: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },

  /* ===== LOADING ===== */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },

  /* ===== LIST CONTENT ===== */
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  /* ===== STATS ===== */
  headerContent: {
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  statNumber: {
    fontSize: 22,
    fontFamily: 'Poppins-Black',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ===== SECTION HEADER ===== */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.3,
  },

  /* ===== RECORD CARD ===== */
  recordCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  accentBar: {
    width: 4,
  },
  recordContent: {
    flex: 1,
    padding: 14,
  },
  recordTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateNum: {
    fontSize: 17,
    fontFamily: 'Poppins-ExtraBold',
  },
  dateInfo: {
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  monthText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 8,
    marginRight: 5,
    fontFamily: 'Poppins-Regular',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.3,
  },
  recordDivider: {
    height: 1,
    marginBottom: 12,
  },

  /* ===== RECORD BOTTOM ROW ===== */
  recordBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  blockLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  blockValue: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  timeDivider: {
    width: 1,
    height: 28,
  },

  /* ===== LOCATION ===== */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  locationIcon: {
    fontSize: 11,
    marginRight: 6,
    fontFamily: 'Poppins-Regular',
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    flex: 1,
  },

  /* ===== EMPTY STATE ===== */
  emptyContainer: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 28,
    fontFamily: 'Poppins-Regular',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },

  /* ===== FOOTER ===== */
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    marginLeft: 8,
    fontFamily: 'Poppins-Medium',
  },

  /* ===== PAGINATION ===== */
  paginationBar: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  paginationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pageIndicatorText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins-ExtraBold',
  },
  paginationText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    marginRight: 12,
  },
  recordsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recordsBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
});
