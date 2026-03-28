import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

var screenWidth = Dimensions.get('window').width;

const STATUS_COLORS = {
  assigned: '#FF9800',
  picked_up: '#2196F3',
  in_transit: '#9C27B0',
  delivered: '#4CAF50',
  failed: '#F44336',
  returned: '#795548',
};

const STATUS_LABELS = {
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed',
  returned: 'Returned',
};

const PRIORITY_COLORS = {
  low: '#8BC34A',
  medium: '#FF9800',
  high: '#F44336',
  urgent: '#D50000',
};

// ======================== DELIVERY DETAIL MODAL ========================
function DeliveryDetailModal({ visible, onClose, delivery, user, onStatusUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [receivedBy, setReceivedBy] = useState('');

  const getNextStatuses = (current) => {
    switch (current) {
      case 'assigned': return ['picked_up'];
      case 'picked_up': return ['in_transit'];
      case 'in_transit': return ['delivered', 'failed'];
      case 'failed': return ['in_transit', 'returned'];
      default: return [];
    }
  };

  const pickProofImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofImage(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'delivered' && !proofImage) {
      Alert.alert('Required', 'Please capture delivery proof photo before marking as delivered');
      return;
    }
    setUpdating(true);
    try {
      const token = user && user.token ? user.token : '';
      const body = { delivery_status: newStatus };
      if (newStatus === 'delivered') {
        if (proofImage && proofImage.base64) {
          body.delivery_proof = {
            image_url: 'data:image/jpeg;base64,' + proofImage.base64,
            received_by: receivedBy.trim() || 'N/A',
          };
        }
      }
      const response = await fetch(`${BASE_URL}/api/deliveries/${delivery._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Delivery status updated to ' + STATUS_LABELS[newStatus]);
        setProofImage(null);
        setReceivedBy('');
        onStatusUpdate();
        onClose();
      } else {
        Alert.alert('Error', result.message || 'Failed to update status');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (!delivery) return null;

  const nextStatuses = getNextStatuses(delivery.delivery_status);
  const addr = delivery.delivery_address || {};

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Delivery Details</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={modalStyles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Order Information</Text>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Order #</Text>
                <Text style={modalStyles.value}>{delivery.order_number || 'N/A'}</Text>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Vendor</Text>
                <Text style={modalStyles.value}>{delivery.vendor_name || 'N/A'}</Text>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Mobile</Text>
                <Text style={modalStyles.value}>{delivery.vendor_mobile || 'N/A'}</Text>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Status</Text>
                <View style={[modalStyles.statusBadge, { backgroundColor: STATUS_COLORS[delivery.delivery_status] || '#999' }]}>
                  <Text style={modalStyles.statusText}>{STATUS_LABELS[delivery.delivery_status] || delivery.delivery_status}</Text>
                </View>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Priority</Text>
                <View style={[modalStyles.statusBadge, { backgroundColor: PRIORITY_COLORS[delivery.priority] || '#999' }]}>
                  <Text style={modalStyles.statusText}>{(delivery.priority || 'medium').toUpperCase()}</Text>
                </View>
              </View>
              {delivery.scheduled_date && (
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.label}>Scheduled</Text>
                  <Text style={modalStyles.value}>{new Date(delivery.scheduled_date).toLocaleDateString()}</Text>
                </View>
              )}
            </View>

            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Delivery Address</Text>
              {addr.address ? <Text style={modalStyles.addressText}>{addr.address}</Text> : null}
              <Text style={modalStyles.addressText}>
                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'No address provided'}
              </Text>
            </View>

            {delivery.order_id && delivery.order_id.items && delivery.order_id.items.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Order Items</Text>
                {delivery.order_id.items.map((item, idx) => (
                  <View key={idx} style={modalStyles.itemRow}>
                    <Text style={modalStyles.itemName}>{item.product_name || 'Product'}</Text>
                    <Text style={modalStyles.itemQty}>x{item.quantity}</Text>
                    <Text style={modalStyles.itemPrice}>Rs.{(item.total_price || 0).toFixed(2)}</Text>
                  </View>
                ))}
                {delivery.order_id.grand_total != null && (
                  <View style={[modalStyles.itemRow, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[modalStyles.itemName, { fontWeight: '700' }]}>Total</Text>
                    <Text style={[modalStyles.itemPrice, { fontWeight: '700' }]}>Rs.{delivery.order_id.grand_total.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}

            {nextStatuses.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Update Status</Text>
                {nextStatuses.includes('delivered') && (
                  <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity style={modalStyles.proofBtn} onPress={pickProofImage}>
                      <Text style={modalStyles.proofBtnText}>
                        {proofImage ? 'Retake Proof Photo' : 'Capture Delivery Proof'}
                      </Text>
                    </TouchableOpacity>
                    {proofImage && (
                      <Image source={{ uri: proofImage.uri }} style={modalStyles.proofImage} />
                    )}
                    <TextInput
                      style={modalStyles.input}
                      placeholder="Received by (name)"
                      placeholderTextColor="#999"
                      value={receivedBy}
                      onChangeText={setReceivedBy}
                    />
                  </View>
                )}
                <View style={modalStyles.statusBtnsRow}>
                  {nextStatuses.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[modalStyles.statusUpdateBtn, { backgroundColor: STATUS_COLORS[s] }]}
                      onPress={() => handleStatusUpdate(s)}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={modalStyles.statusUpdateBtnText}>{STATUS_LABELS[s]}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ======================== MAIN DASHBOARD ========================
export default function DeliveryDashboardScreen({ user, onLogout, onGoToProfile, onGoToDeliveryList }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [stats, setStats] = useState({ assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, failed: 0, total: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const fetchDeliveries = useCallback(async (showLoader) => {
    if (showLoader) setLoading(true);
    try {
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/deliveries/my-deliveries`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok) {
        const list = result.deliveries || result.data || [];
        setDeliveries(list);
        const s = { assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, failed: 0, total: list.length };
        list.forEach((d) => {
          if (s[d.delivery_status] !== undefined) s[d.delivery_status]++;
        });
        setStats(s);
      } else {
        setDeliveries([]);
      }
    } catch (e) {
      console.log('Fetch deliveries error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeliveries(true);
  }, [fetchDeliveries]);

  const pendingDeliveries = deliveries.filter((d) => ['assigned', 'picked_up'].includes(d.delivery_status));
  const activeDeliveries = deliveries.filter((d) => d.delivery_status === 'in_transit');
  const pendingCount = stats.assigned + stats.picked_up;
  const activeCount = stats.in_transit;

  const openDetail = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetail(true);
  };

  // Get today's deliveries
  const todayStr = new Date().toDateString();
  const todayDelivered = deliveries.filter((d) => d.delivery_status === 'delivered' && d.delivered_at && new Date(d.delivered_at).toDateString() === todayStr).length;

  // Recent deliveries (latest 5 pending/active)
  const recentDeliveries = deliveries
    .filter((d) => ['assigned', 'picked_up', 'in_transit'].includes(d.delivery_status))
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header - same pattern as DashboardScreen */}
      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.userName}>{user && user.fullName ? user.fullName : 'Delivery Agent'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, activeCount > 0 ? styles.dotActive : styles.dotInactive]} />
          <Text style={styles.statusText}>
            {activeCount > 0
              ? activeCount + ' Deliver' + (activeCount > 1 ? 'ies' : 'y') + ' In Transit'
              : pendingCount > 0
                ? pendingCount + ' Pending Deliver' + (pendingCount > 1 ? 'ies' : 'y')
                : 'No Active Deliveries'}
          </Text>
        </View>

        {/* Info Cards Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Pending</Text>
            <Text style={styles.infoValue}>{pendingCount}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>In Transit</Text>
            <Text style={styles.infoValue}>{activeCount}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Delivered Today</Text>
            <Text style={styles.infoValue}>{todayDelivered}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Total Delivered</Text>
            <Text style={styles.infoValue}>{stats.delivered}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoCard, styles.infoCardFull]}>
            <Text style={styles.infoLabel}>Total Deliveries</Text>
            <Text style={styles.infoValueLarge}>{stats.total}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={onGoToDeliveryList}>
            <View style={[styles.actionIcon, { backgroundColor: '#e3f2fd' }]}>
              <Text style={styles.actionEmoji}>📋</Text>
            </View>
            <Text style={styles.actionText}>All Deliveries</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={onGoToProfile}>
            <View style={[styles.actionIcon, { backgroundColor: '#fff3e0' }]}>
              <Text style={styles.actionEmoji}>👤</Text>
            </View>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Deliveries */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Deliveries</Text>
          {onGoToDeliveryList && (
            <TouchableOpacity onPress={onGoToDeliveryList}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#e53935" />
            <Text style={styles.loadingText}>Loading deliveries...</Text>
          </View>
        ) : recentDeliveries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending deliveries</Text>
          </View>
        ) : (
          recentDeliveries.map((item) => {
            const addr = item.delivery_address || {};
            const addressText = [addr.city, addr.state].filter(Boolean).join(', ');
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.deliveryCard}
                onPress={() => openDetail(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.orderNumber}>{item.order_number || 'N/A'}</Text>
                  <View style={[styles.cardStatusBadge, { backgroundColor: STATUS_COLORS[item.delivery_status] || '#999' }]}>
                    <Text style={styles.cardStatusText}>{STATUS_LABELS[item.delivery_status] || item.delivery_status}</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Vendor</Text>
                    <Text style={styles.cardValue}>{item.vendor_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Mobile</Text>
                    <Text style={styles.cardValue}>{item.vendor_mobile || 'N/A'}</Text>
                  </View>
                  {addressText ? (
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>City</Text>
                      <Text style={styles.cardValue}>{addressText}</Text>
                    </View>
                  ) : null}
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Priority</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] || '#999' }]}>
                      <Text style={styles.priorityText}>{(item.priority || 'medium').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Detail Modal */}
      <DeliveryDetailModal
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelectedDelivery(null); }}
        delivery={selectedDelivery}
        user={user}
        onStatusUpdate={() => fetchDeliveries(false)}
      />
    </View>
  );
}

// ======================== STYLES ========================
var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 25,
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#ff8a80',
    fontSize: 13,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  timeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 2,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  dotActive: {
    backgroundColor: '#4caf50',
  },
  dotInactive: {
    backgroundColor: '#bdbdbd',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoCardFull: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  infoValueLarge: {
    fontSize: 26,
    fontWeight: '900',
    color: '#e53935',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 10,
    marginBottom: 15,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (screenWidth - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e53935',
  },

  // Delivery Card
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  cardStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {},
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 13,
    color: '#888',
    width: 75,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty / Loading
  centered: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
});

// ======================== MODAL STYLES ========================
var modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  closeBtn: {
    fontSize: 20,
    color: '#999',
    fontWeight: '700',
    padding: 5,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#888',
    width: 80,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 13,
    color: '#1a1a2e',
    fontWeight: '600',
  },
  proofBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  proofBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  proofImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  input: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
  },
  statusBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusUpdateBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 6,
  },
  statusUpdateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
