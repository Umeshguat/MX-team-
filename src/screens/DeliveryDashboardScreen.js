import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const screenWidth = Dimensions.get('window').width;

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
  const [showStatusOptions, setShowStatusOptions] = useState(false);

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
        setShowStatusOptions(false);
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
            {/* Header */}
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Delivery Details</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={modalStyles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>

            {/* Order Info */}
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

            {/* Delivery Address */}
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Delivery Address</Text>
              {addr.address ? <Text style={modalStyles.addressText}>{addr.address}</Text> : null}
              <Text style={modalStyles.addressText}>
                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'No address provided'}
              </Text>
            </View>

            {/* Order Items */}
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

            {/* Update Status */}
            {nextStatuses.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Update Status</Text>

                {/* Delivery Proof for delivered status */}
                {(nextStatuses.includes('delivered') || showStatusOptions) && (
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
  const [activeTab, setActiveTab] = useState('pending');
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [stats, setStats] = useState({ assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, failed: 0 });

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'all', label: 'All' },
  ];

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
        // Calculate stats
        const s = { assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, failed: 0 };
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
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeliveries(true);
  }, [fetchDeliveries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries(false);
  };

  const getFilteredDeliveries = () => {
    if (activeTab === 'all') return deliveries;
    if (activeTab === 'pending') return deliveries.filter((d) => ['assigned', 'picked_up'].includes(d.delivery_status));
    if (activeTab === 'in_transit') return deliveries.filter((d) => d.delivery_status === 'in_transit');
    if (activeTab === 'delivered') return deliveries.filter((d) => ['delivered', 'failed', 'returned'].includes(d.delivery_status));
    return deliveries;
  };

  const filteredDeliveries = getFilteredDeliveries();

  const openDetail = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetail(true);
  };

  const renderDeliveryCard = ({ item }) => {
    const addr = item.delivery_address || {};
    const addressText = [addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');

    return (
      <TouchableOpacity style={styles.deliveryCard} onPress={() => openDetail(item)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>{item.order_number || 'N/A'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.delivery_status] || '#999' }]}>
            <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.delivery_status] || item.delivery_status}</Text>
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
              <Text style={styles.cardLabel}>Address</Text>
              <Text style={[styles.cardValue, { flex: 1 }]} numberOfLines={2}>{addressText}</Text>
            </View>
          ) : null}
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Priority</Text>
            <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] || '#999' }]}>
              <Text style={styles.priorityText}>{(item.priority || 'medium').toUpperCase()}</Text>
            </View>
          </View>
          {item.scheduled_date && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Scheduled</Text>
              <Text style={styles.cardValue}>{new Date(item.scheduled_date).toLocaleDateString()}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Delivery Dashboard</Text>
          <Text style={styles.userName}>{user ? user.fullName : 'Agent'}</Text>
        </View>
        <View style={styles.headerRight}>
          {onGoToProfile && (
            <TouchableOpacity style={styles.profileBtn} onPress={onGoToProfile}>
              <Text style={styles.profileBtnText}>Profile</Text>
            </TouchableOpacity>
          )}
          {onLogout && (
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
        <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.statNumber}>{stats.assigned}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
          <Text style={styles.statNumber}>{stats.picked_up}</Text>
          <Text style={styles.statLabel}>Picked Up</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
          <Text style={styles.statNumber}>{stats.in_transit}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.statNumber}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F44336' }]}>
          <Text style={styles.statNumber}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </ScrollView>

      {/* View All Button */}
      {onGoToDeliveryList && (
        <TouchableOpacity style={styles.viewAllBtn} onPress={onGoToDeliveryList}>
          <Text style={styles.viewAllText}>View All Deliveries →</Text>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Delivery List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      ) : filteredDeliveries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No deliveries found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item._id}
          renderItem={renderDeliveryCard}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" />}
        />
      )}

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
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
    paddingTop: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#e53935',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    marginTop: 16,
    marginBottom: 8,
    maxHeight: 90,
  },
  statCard: {
    width: 100,
    borderRadius: 14,
    padding: 14,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },

  // View All
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e53935',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#1a1a2e',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },

  // Delivery Card
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
});

// ======================== MODAL STYLES ========================
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#999',
    padding: 8,
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
    borderRadius: 10,
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
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  statusBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusUpdateBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statusUpdateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
