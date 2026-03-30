import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { BASE_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';

function generateMapHTML(visits) {
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
    var vendorName = (v.vendor_name || v.name || 'Vendor ' + (i + 1)).replace(/'/g, '');
    var note = (v.note || '').replace(/'/g, '');
    var empName = '';
    if (v.user_id && typeof v.user_id === 'object' && v.user_id.full_name) {
      empName = v.user_id.full_name.replace(/'/g, '');
    } else if (v.employee_name) {
      empName = v.employee_name.replace(/'/g, '');
    }
    var time = '';
    try {
      var d = new Date(v.visit_date || v.createdAt);
      time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch(e) { time = '--:--'; }
    return { lat: lat, lng: lng, name: vendorName, color: color, statusText: statusText, time: time, note: note, empName: empName, index: i + 1 };
  }).filter(function(m) { return m.lat !== 0 && m.lng !== 0; });

  if (markers.length === 0) return null;

  var centerLat = markers.reduce(function(s, m) { return s + m.lat; }, 0) / markers.length;
  var centerLng = markers.reduce(function(s, m) { return s + m.lng; }, 0) / markers.length;

  var markersJS = markers.map(function(m) {
    var popup = '<div style="text-align:center;font-family:sans-serif">' +
      '<b style="font-size:14px;color:#1a1a2e">#' + m.index + ' ' + m.name + '</b><br/>' +
      '<span style="color:' + m.color + ';font-weight:bold;font-size:12px">' + m.statusText + '</span><br/>' +
      '<span style="color:#666;font-size:11px">' + m.time + '</span>' +
      (m.empName ? '<br/><span style="color:#1565c0;font-size:11px;font-weight:600">By: ' + m.empName + '</span>' : '') +
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

export default function VendorMapScreen({ user, onGoBack }) {
  var { theme } = useTheme();
  var [visits, setVisits] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var token = user && user.token ? user.token : '';
    fetch(BASE_URL + '/api/vendor-visits', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        var list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && typeof data === 'object') {
          var keys = Object.keys(data);
          for (var i = 0; i < keys.length; i++) {
            if (Array.isArray(data[keys[i]])) {
              list = data[keys[i]];
              break;
            }
          }
        }
        setVisits(list);
        setLoading(false);
      })
      .catch(function(err) {
        console.log('Vendor visits fetch error:', err);
        setLoading(false);
        Alert.alert('Error', 'Failed to load vendor visits: ' + err.message);
      });
  }, []);

  var onboardedCount = visits.filter(function(v) {
    return v.on_board === true || v.on_board === 'true' || v.is_onboarded === true || v.is_onboarded === 'true';
  }).length;
  var pendingCount = visits.filter(function(v) {
    return v.on_board === false || v.on_board === 'false' || v.is_onboarded === false || v.is_onboarded === 'false';
  }).length;

  var mapHTML = generateMapHTML(visits);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={[styles.decorCircle3, { backgroundColor: theme.secondary + '26' }]} />

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backArrow}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendor Visit Map</Text>
          <View style={styles.navSpacer} />
        </View>

        <Text style={styles.headerSubtitle}>All Vendor Visits</Text>

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statEmojiWrap, { backgroundColor: theme.primary + '1A' }]}>
              <Text style={styles.statEmoji}>{'📍'}</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{visits.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>TOTAL</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statEmojiWrap, { backgroundColor: theme.success + '1A' }]}>
              <Text style={styles.statEmoji}>{'✅'}</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.success }]}>{onboardedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>ONBOARDED</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statEmojiWrap, { backgroundColor: theme.warning + '1A' }]}>
              <Text style={styles.statEmoji}>{'⏳'}</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.warning }]}>{pendingCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>PENDING</Text>
          </View>
        </View>
      </View>

      {/* Map Container */}
      <View style={[styles.mapContainer, { backgroundColor: theme.surface }]}>
        {loading ? (
          <View style={[styles.loadingWrap, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading vendor visits...</Text>
          </View>
        ) : !mapHTML ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.warning + '1A' }]}>
              <Text style={styles.emptyIcon}>{'🗺'}</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Visits Found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>No vendor visits with GPS data available</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHTML }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={function() {
              return (
                <View style={[styles.loadingWrap, { backgroundColor: theme.background }]}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading Map...</Text>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Legend Bar */}
      {!loading && mapHTML ? (
        <View style={[styles.legendBar, { backgroundColor: theme.surfaceVariant }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Onboarded</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: theme.error }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Route</Text>
          </View>
        </View>
      ) : null}
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
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },

  /* ── Stats Cards ── */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
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

  /* ── Map Container ── */
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
  webview: {
    flex: 1,
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
    padding: 40,
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
  },

  /* ── Legend Bar ── */
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendLine: {
    width: 18,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
