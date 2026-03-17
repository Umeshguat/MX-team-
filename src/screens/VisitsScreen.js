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

export default function VisitsScreen({ user, vendors, onGoBack }) {
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

  var onboardedCount = apiVendors.filter(function(v) { return v.on_board === true || v.on_board === 'true'; }).length;
  var notOnboardedCount = apiVendors.filter(function(v) { return v.on_board === false || v.on_board === 'false'; }).length;

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
          <Text style={styles.headerTitle}>Vendor Visits</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerSubtitle}>{dateStr}</Text>

        <View style={styles.locationBar}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>
            {apiVendors.length} visit{apiVendors.length !== 1 ? 's' : ''} total
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565c0" />
          <Text style={styles.loadingText}>Loading visits...</Text>
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
              <Text style={[styles.summaryCount, { color: '#4caf50' }]}>{apiVendors.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
              <Text style={[styles.summaryCount, { color: '#1565c0' }]}>{onboardedCount}</Text>
              <Text style={styles.summaryLabel}>Onboarded</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#fff3e0' }]}>
              <Text style={[styles.summaryCount, { color: '#ff9800' }]}>{notOnboardedCount}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Visit Records</Text>

          {apiVendors.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No visits recorded</Text>
            </View>
          ) : null}

          {apiVendors.map(function(vendor, index) {
            var isOnboarded = vendor.on_board === true || vendor.on_board === 'true';
            var vendorLat = vendor.latitude ? parseFloat(vendor.latitude) : 0;
            var vendorLng = vendor.longitude ? parseFloat(vendor.longitude) : 0;
            var statusColor = isOnboarded ? '#4caf50' : '#ff9800';
            var statusBg = isOnboarded ? '#e8f5e9' : '#fff3e0';
            var statusLabel = isOnboarded ? 'Onboarded' : 'Pending';

            return (
              <View key={vendor._id || index} style={styles.recordCard}>
                <View style={styles.recordLeft}>
                  <View style={[styles.numBox, { backgroundColor: statusBg }]}>
                    <Text style={[styles.numText, { color: statusColor }]}>{index + 1}</Text>
                  </View>
                </View>
                <View style={styles.recordMiddle}>
                  <Text style={styles.vendorName} numberOfLines={1}>{vendor.vendor_name || 'Unknown'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  {vendor.vendor_mobile ? (
                    <Text style={styles.mobileText}>📞 {vendor.vendor_mobile}</Text>
                  ) : null}
                </View>
                <View style={styles.recordRight}>
                  {vendorLat !== 0 && vendorLng !== 0 ? (
                    <TouchableOpacity
                      style={styles.mapBtn}
                      onPress={function() { openInMaps(vendorLat, vendorLng, vendor.vendor_name || 'Vendor'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.mapBtnText}>📍</Text>
                      <Text style={styles.mapLabel}>Map</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noMapText}>--</Text>
                  )}
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
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
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
  numBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#1a1a2e',
    marginBottom: 4,
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mobileText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  recordRight: {
    alignItems: 'center',
    minWidth: 45,
  },
  mapBtn: {
    alignItems: 'center',
  },
  mapBtnText: {
    fontSize: 20,
  },
  mapLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  noMapText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
});
