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
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendor Visit Map</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerSubtitle}>All Vendor Visits</Text>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{visits.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: '#4caf50' }]}>
              {onboardedCount}
            </Text>
            <Text style={styles.statLabel}>Onboarded</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: '#ff9800' }]}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e53935" />
            <Text style={styles.loadingText}>Loading vendor visits...</Text>
          </View>
        ) : !mapHTML ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗺</Text>
            <Text style={styles.emptyTitle}>No Visits Found</Text>
            <Text style={styles.emptyText}>No vendor visits with GPS data available</Text>
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
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading Map...</Text>
                </View>
              );
            }}
          />
        )}
      </View>

      {!loading && mapHTML ? (
        <View style={styles.legendBar}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
            <Text style={styles.legendText}>Onboarded</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ff9800' }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine]} />
            <Text style={styles.legendText}>Route</Text>
          </View>
        </View>
      ) : null}
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
    paddingBottom: 18,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    zIndex: 10,
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
    marginBottom: 6,
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
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  mapContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  webview: {
    flex: 1,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    marginTop: 12,
  },
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    height: 2,
    backgroundColor: '#e53935',
    marginRight: 6,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});
