import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';

export default function VisitsScreen({ user, vendors, onGoBack }) {
  var { theme } = useTheme();
  var [apiVendors, setApiVendors] = useState([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);

  var fetchVisits = function() {
    var token = user && user.token ? user.token : '';
    return fetch(`${BASE_URL}/api/vendor-visits`, {
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
        console.log('Visits API Raw Response:', text);
        var data = JSON.parse(text);
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
        setApiVendors(visits);
      })
      .catch(function(err) {
        console.log('Visits fetch error:', err);
        Alert.alert('Error', 'Failed to load visits: ' + err.message);
      });
  };

  useEffect(function() {
    setLoading(true);
    fetchVisits().finally(function() {
      setLoading(false);
    });
  }, []);

  var onRefresh = function() {
    setRefreshing(true);
    fetchVisits().finally(function() {
      setRefreshing(false);
    });
  };

  var openInMaps = function(lat, lng, name) {
    var url = Platform.OS === 'ios'
      ? 'http://maps.apple.com/?q=' + encodeURIComponent(name) + '&ll=' + lat + ',' + lng
      : 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
    Linking.openURL(url).catch(function() {
      Alert.alert('Error', 'Could not open maps');
    });
  };

  var today = new Date();
  var dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  var fullName = user && user.fullName ? user.fullName : 'User';
  var avatarLetter = fullName.charAt(0).toUpperCase();

  var onboardedCount = apiVendors.filter(function(v) { return v.on_board === true || v.on_board === 'true'; }).length;
  var notOnboardedCount = apiVendors.filter(function(v) { return v.on_board === false || v.on_board === 'false'; }).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* ===== HEADER ===== */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={[styles.decorCircle3, { backgroundColor: theme.secondary + '26' }]} />

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backArrow}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendor Visits</Text>
          <View style={[styles.avatar, { backgroundColor: theme.secondary }]}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>{dateStr}</Text>

        <View style={styles.locationBar}>
          <Text style={styles.locationIcon}>{'\uD83D\uDCCD'}</Text>
          <Text style={styles.locationText}>
            {apiVendors.length} visit{apiVendors.length !== 1 ? 's' : ''} total
          </Text>
        </View>
      </View>

      {/* ===== BODY ===== */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.info} />
          <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading visits...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.info]} />
          }
        >
          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.statsIconCircle, { backgroundColor: theme.successBg }]}>
                <Text style={styles.statsEmoji}>{'\uD83D\uDCCA'}</Text>
              </View>
              <Text style={[styles.statsNumber, { color: theme.success }]}>{apiVendors.length}</Text>
              <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>TOTAL</Text>
            </View>
            <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.statsIconCircle, { backgroundColor: theme.infoBg }]}>
                <Text style={styles.statsEmoji}>{'\u2705'}</Text>
              </View>
              <Text style={[styles.statsNumber, { color: theme.info }]}>{onboardedCount}</Text>
              <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>ONBOARDED</Text>
            </View>
            <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.statsIconCircle, { backgroundColor: theme.warningBg }]}>
                <Text style={styles.statsEmoji}>{'\u23F3'}</Text>
              </View>
              <Text style={[styles.statsNumber, { color: theme.warning }]}>{notOnboardedCount}</Text>
              <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>PENDING</Text>
            </View>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Visit Records</Text>
          </View>

          {/* Empty State */}
          {apiVendors.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
              <View style={[styles.emptyIconBox, { backgroundColor: theme.infoBg }]}>
                <Text style={styles.emptyIcon}>{'\uD83D\uDCCB'}</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Visits Recorded</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>Visit records will appear here</Text>
            </View>
          ) : null}

          {/* Visit Cards */}
          {apiVendors.map(function(vendor, index) {
            var isOnboarded = vendor.on_board === true || vendor.on_board === 'true';
            var vendorLat = vendor.latitude ? parseFloat(vendor.latitude) : 0;
            var vendorLng = vendor.longitude ? parseFloat(vendor.longitude) : 0;
            var statusColor = isOnboarded ? theme.success : theme.warning;
            var statusBg = isOnboarded ? theme.successBg : theme.warningBg;
            var statusLabel = isOnboarded ? 'Onboarded' : 'Pending';

            return (
              <View key={vendor._id || index} style={[styles.recordCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />
                <View style={styles.recordInner}>
                  <View style={styles.recordTop}>
                    <View style={[styles.numBox, { backgroundColor: statusBg }]}>
                      <Text style={[styles.numText, { color: statusColor }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.recordMiddle}>
                      <Text style={[styles.vendorName, { color: theme.text }]} numberOfLines={1}>{vendor.vendor_name || 'Unknown'}</Text>
                      <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.recordRight}>
                      {vendorLat !== 0 && vendorLng !== 0 ? (
                        <TouchableOpacity
                          style={[styles.mapBtn, { backgroundColor: theme.surfaceVariant }]}
                          onPress={function() { openInMaps(vendorLat, vendorLng, vendor.vendor_name || 'Vendor'); }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.mapBtnIcon}>{'\uD83D\uDCCD'}</Text>
                          <Text style={[styles.mapLabel, { color: theme.textTertiary }]}>Map</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.noMapText, { color: theme.textTertiary }]}>--</Text>
                      )}
                    </View>
                  </View>

                  {/* Contact & Notes Info */}
                  {(vendor.vendor_mobile || vendor.note) ? (
                    <View style={styles.recordDetails}>
                      {vendor.vendor_mobile ? (
                        <View style={[styles.infoRow, { backgroundColor: theme.surfaceVariant }]}>
                          <Text style={styles.infoIcon}>{'\uD83D\uDCDE'}</Text>
                          <Text style={[styles.infoText, { color: theme.textSecondary }]}>{vendor.vendor_mobile}</Text>
                        </View>
                      ) : null}
                      {vendor.note ? (
                        <View style={[styles.infoRow, { backgroundColor: theme.surfaceVariant }]}>
                          <Text style={styles.infoIcon}>{'\uD83D\uDCDD'}</Text>
                          <Text style={[styles.infoText, { color: theme.textSecondary }]} numberOfLines={2}>{vendor.note}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
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
  container: {
    flex: 1,
  },

  /* ---- Header ---- */
  header: {
    paddingTop: 50,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
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
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: -120,
    right: -60,
  },

  /* ---- Nav Row ---- */
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },

  /* ---- Loading ---- */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  /* ---- Body ---- */
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },

  /* ---- Stats Cards ---- */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsEmoji: {
    fontSize: 18,
  },
  statsNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.8,
  },

  /* ---- Section Header ---- */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  /* ---- Empty State ---- */
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* ---- Record Card ---- */
  recordCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
  },
  recordInner: {
    flex: 1,
    padding: 14,
  },
  recordTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numText: {
    fontSize: 18,
    fontWeight: '800',
  },
  recordMiddle: {
    flex: 1,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordRight: {
    alignItems: 'center',
    minWidth: 48,
  },
  mapBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  mapBtnIcon: {
    fontSize: 20,
  },
  mapLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  noMapText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ---- Info Rows ---- */
  recordDetails: {
    marginTop: 10,
    paddingTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
